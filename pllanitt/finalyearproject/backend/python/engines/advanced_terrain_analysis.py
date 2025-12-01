"""
Advanced Terrain Analysis Module
Implements real-world terrain analysis algorithms using DEM data:
- Flood risk assessment using hydrological modeling
- Soil erosion using USLE/RUSLE equations
- Water availability assessment
- Professional terrain metrics
"""

import numpy as np
from scipy import ndimage
from scipy.ndimage import distance_transform_edt, gaussian_filter
import rasterio
from rasterio.transform import from_bounds
import logging
import math

logger = logging.getLogger(__name__)

def safe_float(value):
    """
    Convert value to JSON-safe float (replace NaN, inf, -inf with None).
    
    Args:
        value: Numeric value to convert
    
    Returns:
        float or None: JSON-safe float value
    """
    if value is None:
        return None
    try:
        fval = float(value)
        if math.isnan(fval) or math.isinf(fval):
            return None
        return fval
    except (ValueError, TypeError):
        return None


class AdvancedTerrainAnalyzer:
    """
    Advanced terrain analysis using real DEM data.
    Implements professional-grade algorithms for flood risk, erosion, and water assessment.
    """
    
    def __init__(self):
        self.pixel_size = None  # Will be set from transform
        
    def analyze_terrain(self, dem_array, transform, bounds):
        """
        Comprehensive terrain analysis from DEM data.
        
        Args:
            dem_array: DEM elevation array (numpy array)
            transform: Rasterio transform object
            bounds: Bounding box (minx, miny, maxx, maxy)
            
        Returns:
            dict: Complete terrain analysis results
        """
        logger.info("Starting advanced terrain analysis...")
        
        # Get pixel size from transform
        self.pixel_size = abs(transform[0])  # meters per pixel
        
        # Fill NaN values for processing
        dem_filled = np.where(np.isnan(dem_array), np.nanmean(dem_array), dem_array)
        
        # 1. Calculate slope and aspect (using proper gradient calculation)
        slope_deg, aspect_deg = self._calculate_slope_aspect(dem_filled, transform)
        
        # 2. Calculate flow accumulation and drainage network
        flow_accumulation, drainage_network = self._calculate_flow_accumulation(dem_filled)
        
        # 3. Real flood risk assessment
        flood_risk = self._assess_flood_risk_advanced(
            dem_filled, flow_accumulation, drainage_network, bounds
        )
        
        # 4. Soil erosion analysis using USLE
        erosion_analysis = self._calculate_soil_erosion_usle(
            dem_filled, slope_deg, aspect_deg, flow_accumulation
        )
        
        # 5. Water availability assessment
        water_availability = self._assess_water_availability(
            dem_filled, flow_accumulation, drainage_network, bounds
        )
        
        # 6. Terrain ruggedness and complexity
        terrain_ruggedness = self._calculate_terrain_ruggedness(dem_filled, slope_deg)
        
        # 7. Aspect analysis (solar exposure, wind patterns)
        aspect_analysis = self._analyze_aspect(aspect_deg)
        
        # Compile results - use safe_float to ensure JSON compatibility
        results = {
            "elevation_stats": {
                "mean": safe_float(np.nanmean(dem_array)),
                "min": safe_float(np.nanmin(dem_array)),
                "max": safe_float(np.nanmax(dem_array)),
                "std": safe_float(np.nanstd(dem_array)),
                "median": safe_float(np.nanmedian(dem_array)),
                "range": safe_float(np.nanmax(dem_array) - np.nanmin(dem_array))
            },
            "slope_analysis": {
                "mean_slope": safe_float(np.nanmean(slope_deg)),
                "max_slope": safe_float(np.nanmax(slope_deg)),
                "min_slope": safe_float(np.nanmin(slope_deg)),
                "std_slope": safe_float(np.nanstd(slope_deg)),
                "slope_distribution": self._categorize_slope(slope_deg),
                "category_stats": self._format_category_stats(slope_deg)  # Format for compatibility
                # Note: slope_array not included to avoid large data transfer - calculate from DEM when needed
            },
            "aspect_analysis": aspect_analysis,
            "flood_risk_analysis": flood_risk,
            "erosion_analysis": erosion_analysis,
            "water_availability": water_availability,
            "terrain_ruggedness": terrain_ruggedness,
            "flow_accumulation_stats": {
                "mean": safe_float(np.nanmean(flow_accumulation)),
                "max": safe_float(np.nanmax(flow_accumulation)),
                "drainage_density": safe_float(np.sum(drainage_network > 0) / np.sum(~np.isnan(dem_array))) if np.sum(~np.isnan(dem_array)) > 0 else 0.0
            }
        }
        
        logger.info("Advanced terrain analysis completed")
        return results
    
    def _calculate_slope_aspect(self, dem_array, transform):
        """
        Calculate slope and aspect using proper gradient calculation.
        Uses Horn's method for better accuracy.
        """
        # Get pixel size in meters
        pixel_size_x = abs(transform[0])
        pixel_size_y = abs(transform[4]) if len(transform) > 4 else pixel_size_x
        
        # Calculate gradients using Horn's method (3x3 kernel)
        # This is more accurate than simple gradient
        kernel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]) / (8 * pixel_size_x)
        kernel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]) / (8 * pixel_size_y)
        
        dzdx = ndimage.convolve(dem_array, kernel_x, mode='constant', cval=np.nan)
        dzdy = ndimage.convolve(dem_array, kernel_y, mode='constant', cval=np.nan)
        
        # Calculate slope in degrees
        slope_rad = np.arctan(np.sqrt(dzdx**2 + dzdy**2))
        slope_deg = np.degrees(slope_rad)
        
        # Calculate aspect in degrees (0-360, 0 = North)
        aspect_rad = np.arctan2(-dzdx, dzdy)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = np.where(aspect_deg < 0, aspect_deg + 360, aspect_deg)
        
        # Handle NaN values
        slope_deg = np.where(np.isnan(dem_array), np.nan, slope_deg)
        aspect_deg = np.where(np.isnan(dem_array), np.nan, aspect_deg)
        
        return slope_deg, aspect_deg
    
    def _calculate_flow_accumulation(self, dem_array):
        """
        Calculate flow accumulation using simplified D8 flow direction algorithm.
        This is used for flood risk and water availability assessment.
        """
        rows, cols = dem_array.shape
        
        # Initialize flow accumulation (each cell contributes 1 unit)
        flow_accum = np.ones_like(dem_array, dtype=np.float32)
        
        # Simplified flow accumulation using gradient-based approach
        # Calculate which cells flow into each cell
        for iteration in range(5):  # Limit iterations for performance
            new_accum = np.ones_like(flow_accum)
            
            for i in range(1, rows - 1):
                for j in range(1, cols - 1):
                    if np.isnan(dem_array[i, j]):
                        continue
                    
                    current_elev = dem_array[i, j]
                    contrib = 0
                    
                    # Check 8 neighbors for flow contribution
                    for di, dj in [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]:
                        ni, nj = i + di, j + dj
                        if 0 <= ni < rows and 0 <= nj < cols:
                            if not np.isnan(dem_array[ni, nj]) and dem_array[ni, nj] > current_elev:
                                # Neighbor is higher, so it contributes flow
                                if not np.isnan(flow_accum[ni, nj]):
                                    contrib += flow_accum[ni, nj] * 0.125  # Equal contribution from each neighbor
            
            new_accum = flow_accum + contrib
            flow_accum = new_accum
        
        # Identify drainage network (cells with high flow accumulation)
        if np.any(~np.isnan(flow_accum)):
            threshold = np.nanpercentile(flow_accum, 90)  # Top 10% are drainage channels
            drainage_network = flow_accum > threshold
        else:
            drainage_network = np.zeros_like(flow_accum, dtype=bool)
        
        return flow_accum, drainage_network.astype(float)
    
    def _assess_flood_risk_advanced(self, dem_array, flow_accumulation, drainage_network, bounds):
        """
        Advanced flood risk assessment using:
        - Elevation relative to drainage network
        - Flow accumulation (water accumulation potential)
        - Proximity to water bodies
        - Topographic position index
        """
        # 1. Elevation-based flood risk (areas below mean elevation + 2m are at risk)
        mean_elevation = np.nanmean(dem_array)
        elevation_risk = np.where(
            dem_array < mean_elevation - 5, 3,  # High risk: >5m below mean
            np.where(dem_array < mean_elevation - 2, 2,  # Medium risk: 2-5m below mean
            np.where(dem_array < mean_elevation + 2, 1, 0)))  # Low risk: near or above mean
        
        # 2. Flow accumulation risk (areas with high water accumulation)
        flow_percentile_90 = np.nanpercentile(flow_accumulation, 90)
        flow_percentile_75 = np.nanpercentile(flow_accumulation, 75)
        
        flow_risk = np.where(
            flow_accumulation > flow_percentile_90, 3,  # High risk
            np.where(flow_accumulation > flow_percentile_75, 2, 1))  # Medium/Low risk
        
        # 3. Proximity to drainage network
        distance_to_drainage = distance_transform_edt(~drainage_network.astype(bool))
        distance_risk = np.where(
            distance_to_drainage < 50, 3,  # High risk: within 50m of drainage
            np.where(distance_to_drainage < 200, 2, 1))  # Medium/Low risk
        
        # 4. Combined flood risk score (0-3 scale)
        combined_risk = (elevation_risk * 0.4 + flow_risk * 0.4 + distance_risk * 0.2)
        combined_risk = np.clip(combined_risk, 0, 3)
        
        # Calculate risk statistics
        high_risk_pixels = np.sum(combined_risk >= 2.5)
        medium_risk_pixels = np.sum((combined_risk >= 1.5) & (combined_risk < 2.5))
        low_risk_pixels = np.sum(combined_risk < 1.5)
        total_pixels = np.sum(~np.isnan(dem_array))
        
        return {
            "flood_risk_map": combined_risk.tolist() if combined_risk.size < 10000 else None,
            "risk_statistics": {
                "high_risk_area_percent": float(high_risk_pixels / total_pixels * 100) if total_pixels > 0 else 0,
                "medium_risk_area_percent": float(medium_risk_pixels / total_pixels * 100) if total_pixels > 0 else 0,
                "low_risk_area_percent": float(low_risk_pixels / total_pixels * 100) if total_pixels > 0 else 0,
                "high_risk_area_pixels": int(high_risk_pixels),
                "medium_risk_area_pixels": int(medium_risk_pixels),
                "low_risk_area_pixels": int(low_risk_pixels),
                "mean_risk_score": float(np.nanmean(combined_risk)),
                "max_risk_score": float(np.nanmax(combined_risk))
            },
            "risk_factors": {
                "elevation_risk": {
                    "mean": float(np.nanmean(elevation_risk)),
                    "high_risk_pixels": int(np.sum(elevation_risk >= 2))
                },
                "flow_accumulation_risk": {
                    "mean": float(np.nanmean(flow_risk)),
                    "high_risk_pixels": int(np.sum(flow_risk >= 2))
                },
                "drainage_proximity_risk": {
                    "mean": float(np.nanmean(distance_risk)),
                    "high_risk_pixels": int(np.sum(distance_risk >= 2))
                }
            },
            "recommendations": self._generate_flood_recommendations(combined_risk, total_pixels)
        }
    
    def _calculate_soil_erosion_usle(self, dem_array, slope_deg, aspect_deg, flow_accumulation):
        """
        Calculate soil erosion using Universal Soil Loss Equation (USLE).
        A = R * K * LS * C * P
        
        Where:
        - A = Annual soil loss (tons/hectare/year)
        - R = Rainfall erosivity factor (estimated)
        - K = Soil erodibility factor (estimated)
        - LS = Slope length and steepness factor
        - C = Cover management factor (estimated)
        - P = Support practice factor (estimated)
        """
        # Convert slope to radians for calculations
        slope_rad = np.radians(slope_deg)
        
        # LS Factor (Slope Length and Steepness)
        # LS = (λ/22.13)^m * (sin(β)/0.0896)^n
        # Where λ = slope length (estimated from flow accumulation), m=0.5, n=1.0
        slope_length = np.sqrt(flow_accumulation) * self.pixel_size  # Approximate slope length
        m = 0.5
        n = 1.0
        
        # Calculate LS factor
        ls_factor = np.power(slope_length / 22.13, m) * np.power(np.sin(slope_rad) / 0.0896, n)
        ls_factor = np.clip(ls_factor, 0.1, 10.0)  # Reasonable bounds
        
        # Estimated factors (in real application, these would come from soil/rainfall data)
        R_factor = 200  # Rainfall erosivity (MJ·mm/(ha·h·year)) - typical for moderate climate
        K_factor = 0.3  # Soil erodibility (t·h/(MJ·mm)) - typical for loam soil
        C_factor = 0.3  # Cover management (0-1, lower = more protection) - moderate vegetation
        P_factor = 1.0  # Support practices (0-1, lower = more protection) - no conservation practices
        
        # Calculate annual soil loss (tons/hectare/year)
        annual_soil_loss = R_factor * K_factor * ls_factor * C_factor * P_factor
        
        # Categorize erosion risk
        erosion_categories = np.where(
            annual_soil_loss > 50, 3,  # High erosion: >50 t/ha/year
            np.where(annual_soil_loss > 20, 2,  # Medium erosion: 20-50 t/ha/year
            np.where(annual_soil_loss > 5, 1, 0)))  # Low/Minimal erosion
        
        # Calculate statistics
        total_pixels = np.sum(~np.isnan(dem_array))
        high_erosion_pixels = np.sum(erosion_categories >= 2)
        medium_erosion_pixels = np.sum(erosion_categories == 1)
        
        return {
            "annual_soil_loss": {
                "mean": float(np.nanmean(annual_soil_loss)),
                "max": float(np.nanmax(annual_soil_loss)),
                "min": float(np.nanmin(annual_soil_loss)),
                "std": float(np.nanstd(annual_soil_loss)),
                "median": float(np.nanmedian(annual_soil_loss))
            },
            "erosion_risk_categories": {
                "high_erosion_percent": float(high_erosion_pixels / total_pixels * 100) if total_pixels > 0 else 0,
                "medium_erosion_percent": float(medium_erosion_pixels / total_pixels * 100) if total_pixels > 0 else 0,
                "low_erosion_percent": float((total_pixels - high_erosion_pixels - medium_erosion_pixels) / total_pixels * 100) if total_pixels > 0 else 0
            },
            "usle_factors": {
                "R_factor": R_factor,  # Rainfall erosivity
                "K_factor": K_factor,  # Soil erodibility
                "LS_factor_mean": float(np.nanmean(ls_factor)),
                "C_factor": C_factor,  # Cover management
                "P_factor": P_factor   # Support practices
            },
            "recommendations": self._generate_erosion_recommendations(annual_soil_loss, slope_deg)
        }
    
    def _assess_water_availability(self, dem_array, flow_accumulation, drainage_network, bounds):
        """
        Assess water availability using:
        - Topographic Wetness Index (TWI)
        - Distance to water bodies
        - Flow accumulation (water collection potential)
        - Elevation relative to drainage
        """
        # Calculate TWI (Topographic Wetness Index)
        # TWI = ln(contributing_area / tan(slope))
        slope_rad = np.arctan(np.gradient(dem_array)[0])  # Simplified
        contributing_area = flow_accumulation * (self.pixel_size ** 2)
        
        # Avoid division by zero
        slope_safe = np.where(slope_rad < 0.001, 0.001, slope_rad)
        twi = np.log(contributing_area / np.tan(slope_safe))
        twi = np.clip(twi, 0, 20)  # Reasonable bounds for TWI
        
        # Distance to drainage network (water sources)
        distance_to_water = distance_transform_edt(~drainage_network.astype(bool)) * self.pixel_size
        
        # Water availability score (0-1, higher = better)
        # Based on TWI, flow accumulation, and proximity to water
        twi_normalized = (twi - np.nanmin(twi)) / (np.nanmax(twi) - np.nanmin(twi) + 1e-6)
        flow_normalized = (flow_accumulation - np.nanmin(flow_accumulation)) / (np.nanmax(flow_accumulation) - np.nanmin(flow_accumulation) + 1e-6)
        distance_normalized = 1.0 - np.clip(distance_to_water / 1000.0, 0, 1)  # Normalize to 1km
        
        water_availability_score = (
            twi_normalized * 0.4 +
            flow_normalized * 0.3 +
            distance_normalized * 0.3
        )
        
        return {
            "topographic_wetness_index": {
                "mean": float(np.nanmean(twi)),
                "max": float(np.nanmax(twi)),
                "min": float(np.nanmin(twi)),
                "std": float(np.nanstd(twi))
            },
            "distance_to_water": {
                "mean_meters": float(np.nanmean(distance_to_water)),
                "min_meters": float(np.nanmin(distance_to_water)),
                "max_meters": float(np.nanmax(distance_to_water))
            },
            "water_availability_score": {
                "mean": float(np.nanmean(water_availability_score)),
                "max": float(np.nanmax(water_availability_score)),
                "min": float(np.nanmin(water_availability_score)),
                "classification": self._classify_water_availability(water_availability_score)
            },
            "flow_accumulation_stats": {
                "mean": float(np.nanmean(flow_accumulation)),
                "max": float(np.nanmax(flow_accumulation))
            }
        }
    
    def _calculate_terrain_ruggedness(self, dem_array, slope_deg):
        """
        Calculate Terrain Ruggedness Index (TRI).
        Measures the amount of elevation difference between adjacent cells.
        """
        # Calculate TRI using 3x3 window
        tri = np.zeros_like(dem_array)
        
        for i in range(1, dem_array.shape[0] - 1):
            for j in range(1, dem_array.shape[1] - 1):
                if np.isnan(dem_array[i, j]):
                    tri[i, j] = np.nan
                    continue
                
                # 3x3 window
                window = dem_array[i-1:i+2, j-1:j+2]
                center = dem_array[i, j]
                
                # Sum of squared differences
                diff_squared = np.nansum((window - center) ** 2)
                tri[i, j] = np.sqrt(diff_squared)
        
        return {
            "mean_ruggedness": float(np.nanmean(tri)),
            "max_ruggedness": float(np.nanmax(tri)),
            "min_ruggedness": float(np.nanmin(tri)),
            "std_ruggedness": float(np.nanstd(tri)),
            "classification": self._classify_ruggedness(tri)
        }
    
    def _analyze_aspect(self, aspect_deg):
        """
        Analyze aspect (direction of slope) for solar exposure and wind patterns.
        """
        # Categorize aspects
        aspect_categories = np.where(
            (aspect_deg >= 315) | (aspect_deg < 45), "North",
            np.where(aspect_deg < 135, "East",
            np.where(aspect_deg < 225, "South", "West"))
        )
        
        # Count pixels in each category
        unique, counts = np.unique(aspect_categories[~np.isnan(aspect_deg)], return_counts=True)
        aspect_distribution = dict(zip(unique, counts))
        
        total = sum(aspect_distribution.values())
        aspect_percentages = {k: (v / total * 100) if total > 0 else 0 
                             for k, v in aspect_distribution.items()}
        
        return {
            "mean_aspect_degrees": float(np.nanmean(aspect_deg)),
            "aspect_distribution": aspect_percentages,
            "dominant_aspect": max(aspect_percentages, key=aspect_percentages.get) if aspect_percentages else "Unknown"
        }
    
    def _categorize_slope(self, slope_deg):
        """
        Categorize slope according to USGS standards.
        """
        categories = {
            "nearly_level": (0, 3),
            "gently_sloping": (3, 8),
            "moderately_sloping": (8, 15),
            "strongly_sloping": (15, 25),
            "moderately_steep": (25, 35),
            "steep": (35, 50),
            "very_steep": (50, 90)
        }
        
        total_pixels = np.sum(~np.isnan(slope_deg))
        category_stats = {}
        
        for cat_name, (min_slope, max_slope) in categories.items():
            mask = (slope_deg >= min_slope) & (slope_deg < max_slope)
            pixel_count = int(np.sum(mask))
            percentage = (pixel_count / total_pixels * 100) if total_pixels > 0 else 0
            
            category_stats[cat_name] = {
                "pixel_count": pixel_count,
                "area_percentage": float(percentage),
                "min_slope": min_slope,
                "max_slope": max_slope
            }
        
        return category_stats
    
    def _format_category_stats(self, slope_deg):
        """
        Format category stats in the format expected by the main processing code.
        Returns dict with numeric keys (1-5) matching the original format.
        """
        total_pixels = np.sum(~np.isnan(slope_deg))
        
        # Define categories matching the original format
        categories = {
            1: {"name": "Flat (0-15°)", "min": 0, "max": 15},
            2: {"name": "Moderate (15-30°)", "min": 15, "max": 30},
            3: {"name": "Steep (30-50°)", "min": 30, "max": 50},
            4: {"name": "Very Steep (50-70°)", "min": 50, "max": 70},
            5: {"name": "Extremely Steep (>70°)", "min": 70, "max": 90}
        }
        
        category_stats = {}
        for cat_id, cat_info in categories.items():
            if cat_id == 5:
                # Extremely steep: >70°
                mask = (slope_deg > cat_info["min"]) & (~np.isnan(slope_deg))
            else:
                mask = (slope_deg >= cat_info["min"]) & (slope_deg < cat_info["max"]) & (~np.isnan(slope_deg))
            
            pixel_count = int(np.sum(mask))
            area_percentage = (pixel_count / total_pixels * 100) if total_pixels > 0 else 0
            
            category_stats[cat_id] = {
                "name": cat_info["name"],
                "area_percentage": round(area_percentage, 2),
                "pixel_count": pixel_count
            }
        
        return category_stats
    
    def _classify_water_availability(self, water_score):
        """
        Classify water availability based on score.
        """
        mean_score = np.nanmean(water_score)
        
        if mean_score >= 0.7:
            return "High - Excellent water availability"
        elif mean_score >= 0.5:
            return "Medium - Good water availability"
        elif mean_score >= 0.3:
            return "Low - Limited water availability"
        else:
            return "Very Low - Poor water availability"
    
    def _classify_ruggedness(self, tri):
        """
        Classify terrain ruggedness.
        """
        mean_tri = np.nanmean(tri)
        
        if mean_tri < 50:
            return "Smooth - Gentle terrain"
        elif mean_tri < 100:
            return "Moderate - Rolling terrain"
        elif mean_tri < 200:
            return "Rugged - Hilly terrain"
        else:
            return "Very Rugged - Mountainous terrain"
    
    def _generate_flood_recommendations(self, risk_map, total_pixels):
        """
        Generate flood risk mitigation recommendations.
        """
        high_risk_percent = np.sum(risk_map >= 2.5) / total_pixels * 100 if total_pixels > 0 else 0
        
        recommendations = []
        
        if high_risk_percent > 30:
            recommendations.append("⚠️ HIGH FLOOD RISK: Over 30% of area at high risk. Implement flood control measures.")
            recommendations.append("Consider building flood barriers or retention ponds in high-risk zones.")
            recommendations.append("Avoid critical infrastructure in high-risk areas.")
        elif high_risk_percent > 15:
            recommendations.append("⚠️ MODERATE FLOOD RISK: 15-30% of area at risk. Implement drainage improvements.")
            recommendations.append("Ensure proper stormwater management systems.")
        else:
            recommendations.append("✅ LOW FLOOD RISK: Most areas are safe from flooding.")
        
        recommendations.append("Monitor drainage channels and maintain clear water flow paths.")
        recommendations.append("Consider elevation requirements for new construction.")
        
        return recommendations
    
    def _generate_erosion_recommendations(self, soil_loss, slope_deg):
        """
        Generate soil erosion control recommendations.
        """
        mean_loss = np.nanmean(soil_loss)
        high_slope_percent = np.sum(slope_deg > 30) / np.sum(~np.isnan(slope_deg)) * 100
        
        recommendations = []
        
        if mean_loss > 50:
            recommendations.append("⚠️ HIGH EROSION RISK: Annual soil loss exceeds 50 t/ha/year.")
            recommendations.append("Implement terracing on slopes >30°.")
            recommendations.append("Use erosion control blankets and vegetation cover.")
        elif mean_loss > 20:
            recommendations.append("⚠️ MODERATE EROSION: Implement conservation practices.")
            recommendations.append("Consider contour farming or strip cropping.")
        else:
            recommendations.append("✅ LOW EROSION RISK: Soil loss is within acceptable limits.")
        
        if high_slope_percent > 20:
            recommendations.append(f"⚠️ {high_slope_percent:.1f}% of area has slopes >30° - requires special attention.")
            recommendations.append("Consider slope stabilization measures.")
        
        recommendations.append("Maintain vegetative cover to reduce erosion.")
        recommendations.append("Implement proper drainage to prevent water-induced erosion.")
        
        return recommendations

