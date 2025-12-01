import numpy as np


class AdvancedTerrainAnalyzer:
    """
    Advanced terrain analysis utilities used by `main.py`.

    This implementation is intentionally lightweight and only relies on NumPy,
    but exposes the interface that `main.py` expects:

    - analyze_terrain(dem_arr, transform, bounds) -> dict with:
        * slope_analysis
        * flood_risk_analysis
        * erosion_analysis
        * water_availability
    - _calculate_flow_accumulation(dem_arr) -> (flow_accum, drainage_dir)
    - _calculate_slope_aspect(dem_arr, transform) -> (slope_deg, aspect_deg)

    The algorithms here are simplified but more expressive than the basic
    fallback in `main.py`, and can be evolved later without changing the API.
    """

    def __init__(self, pixel_size: float | None = None) -> None:
        # Optional override; `main.py` may also set this after initialization.
        self.pixel_size = pixel_size or 30.0  # meters (typical SRTM resolution)

    # ------------------------------------------------------------------
    # Public API used from `main.py`
    # ------------------------------------------------------------------
    def analyze_terrain(self, dem_arr: np.ndarray, transform, bounds) -> dict:
        """
        Perform a richer terrain analysis than the basic in-place logic.

        Returns a dictionary with the keys expected in `main.py`:
        - slope_analysis
        - flood_risk_analysis
        - erosion_analysis
        - water_availability
        """
        # Ensure we work on a float array and have a valid mask
        dem = dem_arr.astype(float)
        valid_mask = ~np.isnan(dem)

        if not np.any(valid_mask):
            # Completely invalid DEM – return empty but well‑formed structure
            return {
                "slope_analysis": {
                    "mean_slope": 0.0,
                    "max_slope": 0.0,
                    "min_slope": 0.0,
                    "std_slope": 0.0,
                    "category_stats": {},
                },
                "flood_risk_analysis": {"flood_stats": {}},
                "erosion_analysis": {"erosion_stats": {}},
                "water_availability": {},
            }

        # Basic derivatives
        dzdy, dzdx = np.gradient(dem)
        slope = np.sqrt(dzdx**2 + dzdy**2)
        slope_deg = np.degrees(np.arctan(slope))

        # ------------------------ Slope analysis ------------------------ #
        mean_slope = float(np.nanmean(slope_deg))
        max_slope = float(np.nanmax(slope_deg))
        min_slope = float(np.nanmin(slope_deg))
        std_slope = float(np.nanstd(slope_deg))

        # Categorize slope into terrain classes
        cat1_mask = (slope_deg >= 0) & (slope_deg < 15) & valid_mask
        cat2_mask = (slope_deg >= 15) & (slope_deg < 30) & valid_mask
        cat3_mask = (slope_deg >= 30) & valid_mask
        total_pixels = int(np.sum(valid_mask))

        def _pct(mask: np.ndarray) -> float:
            return float(100.0 * np.sum(mask) / total_pixels) if total_pixels > 0 else 0.0

        slope_analysis = {
            "mean_slope": mean_slope,
            "max_slope": max_slope,
            "min_slope": min_slope,
            "std_slope": std_slope,
            "category_stats": {
                1: {
                    "name": "Flat (0-15°)",
                    "area_percentage": _pct(cat1_mask),
                    "pixel_count": int(np.sum(cat1_mask)),
                },
                2: {
                    "name": "Moderate (15-30°)",
                    "area_percentage": _pct(cat2_mask),
                    "pixel_count": int(np.sum(cat2_mask)),
                },
                3: {
                    "name": "Steep (30-50°+)",
                    "area_percentage": _pct(cat3_mask),
                    "pixel_count": int(np.sum(cat3_mask)),
                },
            },
        }

        # ------------------------ Flood analysis ------------------------ #
        # Very simple elevation‑based flood risk estimation
        elev = dem
        high_risk = (elev <= 2.0) & valid_mask
        med_risk = (elev > 2.0) & (elev <= 5.0) & valid_mask
        low_risk = (elev > 5.0) & valid_mask

        flood_risk_analysis = {
            "flood_stats": {
                "high_risk_area": int(np.sum(high_risk)),
                "medium_risk_area": int(np.sum(med_risk)),
                "low_risk_area": int(np.sum(low_risk)),
            }
        }

        # ------------------------ Erosion analysis ---------------------- #
        # Heuristic: steeper slopes imply more soil loss.
        mean_soil_loss = float(np.nanmean(slope_deg[valid_mask]) * 0.5)
        high_erosion = (slope_deg > 30.0) & valid_mask

        erosion_analysis = {
            "erosion_stats": {
                "mean_soil_loss": mean_soil_loss,
                "high_erosion_area": int(np.sum(high_erosion)),
            }
        }

        # ------------------- Water availability summary ----------------- #
        # Very simple proxy using low elevation & low slope.
        low_slope = (slope_deg < 5.0) & valid_mask
        low_elev = elev <= np.nanpercentile(elev[valid_mask], 25)
        potential_water = low_slope & low_elev & valid_mask

        water_availability = {
            "summary": {
                "potential_water_pixels": int(np.sum(potential_water)),
                "total_pixels": total_pixels,
                "potential_water_ratio": float(
                    np.sum(potential_water) / total_pixels
                )
                if total_pixels > 0
                else 0.0,
            }
        }

        return {
            "slope_analysis": slope_analysis,
            "flood_risk_analysis": flood_risk_analysis,
            "erosion_analysis": erosion_analysis,
            "water_availability": water_availability,
        }

    # ------------------------------------------------------------------
    # Helper methods used directly from `main.py`
    # ------------------------------------------------------------------
    def _calculate_slope_aspect(self, dem_arr: np.ndarray, transform):
        """
        Approximate slope (degrees) and aspect (degrees 0–360) using the DEM
        and the raster transform.
        """
        dem = dem_arr.astype(float)
        # Derive pixel size from transform if possible
        try:
            xres = float(transform[0])
            yres = float(abs(transform[4])) if transform[4] != 0 else float(transform[0])
        except Exception:
            xres = yres = self.pixel_size

        dzdy, dzdx = np.gradient(dem, yres, xres)
        slope_rad = np.arctan(np.sqrt(dzdx**2 + dzdy**2))
        slope_deg = np.degrees(slope_rad)

        # Aspect in radians then degrees, 0–360
        aspect_rad = np.arctan2(dzdy, -dzdx)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = np.where(aspect_deg < 0, 90.0 - aspect_deg, 360.0 - aspect_deg + 90.0)

        return slope_deg, aspect_deg

    def _calculate_flow_accumulation(self, dem_arr: np.ndarray):
        """
        Very simple, CPU‑lightweight proxy for flow accumulation.

        This is NOT a full hydrological D8 model, but it produces a raster
        with higher values in locally lower areas and can be used by the
        calling code for relative river/stream detection.
        """
        dem = dem_arr.astype(float)

        # Invert elevation so that "lower" areas become "higher" values.
        inv = np.nanmax(dem) - dem
        inv[~np.isfinite(inv)] = 0.0

        # Smooth a bit to mimic accumulation from neighborhood
        # 3x3 box filter using convolution implemented with rolling sums
        kernel_size = 3
        pad = kernel_size // 2
        padded = np.pad(inv, pad_width=pad, mode="edge")

        # Box filter via cumulative sums (fast and dependency‑free)
        cumsum0 = np.cumsum(padded, axis=0)
        cumsum1 = np.cumsum(cumsum0, axis=1)
        h, w = dem.shape
        flow = (
            cumsum1[kernel_size:, kernel_size:]
            - cumsum1[:-kernel_size, kernel_size:]
            - cumsum1[kernel_size:, :-kernel_size]
            + cumsum1[:-kernel_size, :-kernel_size]
        )

        # Normalize to a reasonable dynamic range
        flow_min = np.nanmin(flow)
        flow_max = np.nanmax(flow)
        if flow_max > flow_min:
            flow_norm = (flow - flow_min) / (flow_max - flow_min + 1e-6)
        else:
            flow_norm = np.zeros_like(flow)

        # Dummy drainage direction: flat array for now (could be improved later)
        drainage_dir = np.zeros_like(flow_norm, dtype=np.uint8)

        return flow_norm, drainage_dir


