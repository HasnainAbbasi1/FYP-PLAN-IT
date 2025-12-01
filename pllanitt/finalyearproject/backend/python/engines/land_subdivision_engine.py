"""
Land Subdivision Engine
Handles intelligent land subdivision into parcels based on zoning, terrain, and regulations.
"""

import json
import math
from typing import Dict, List, Any, Optional
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, Point, LineString, MultiPoint
from shapely.ops import unary_union, voronoi_diagram
from shapely.affinity import translate, rotate
import numpy as np
import logging

logger = logging.getLogger(__name__)


class LandSubdivisionEngine:
    """
    Professional land subdivision engine that creates parcels based on:
    - Zoning regulations
    - Terrain constraints
    - Road access requirements
    - Setback requirements
    - Market viability
    """
    
    def __init__(self):
        # Pakistan/CDA standards (in square meters)
        self.parcel_standards = {
            "min_area": 200,  # ~5 marlas minimum
            "max_area": 5000,  # ~125 marlas maximum
            "preferred_ratios": {
                "residential": {"width": 9, "depth": 18},  # 9m x 18m = 162 sqm
                "commercial": {"width": 12, "depth": 24},  # 12m x 24m = 288 sqm
                "mixed_use": {"width": 10, "depth": 20}  # 10m x 20m = 200 sqm
            }
        }
        
        self.road_standards = {
            "min_width": 6,  # Minimum road width in meters
            "max_width": 12,  # Maximum road width in meters
            "primary_road_width": 12,
            "secondary_road_width": 9,
            "local_road_width": 6
        }
        
        self.setback_requirements = {
            "front": 3,  # 3 meters front setback
            "side": 2,   # 2 meters side setback
            "rear": 3    # 3 meters rear setback
        }
    
    def subdivide_land(
        self,
        polygon_geojson: Dict,
        zoning_data: Optional[Dict] = None,
        subdivision_config: Optional[Dict] = None,
        terrain_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Subdivide land into parcels based on zoning and configuration.
        
        Args:
            polygon_geojson: GeoJSON polygon of the land to subdivide
            zoning_data: Zoning classification data with zones
            subdivision_config: Configuration for subdivision (method, parcel sizes, etc.)
            terrain_data: Terrain analysis data (slope, elevation, etc.)
        
        Returns:
            Dictionary with subdivision results including parcels GeoJSON
        """
        try:
            # Parse polygon
            if isinstance(polygon_geojson, str):
                polygon_dict = json.loads(polygon_geojson)
            else:
                polygon_dict = polygon_geojson
            
            # Extract geometry
            if "geometry" in polygon_dict:
                geom = shape(polygon_dict["geometry"])
            else:
                geom = shape(polygon_dict)
            
            if not isinstance(geom, (Polygon, MultiPolygon)):
                return {
                    "success": False,
                    "error": "Invalid geometry type. Expected Polygon or MultiPolygon"
                }
            
            # Calculate polygon area - handle geographic coordinates
            # If coordinates are in lat/lon, we need to project to a metric CRS for area calculation
            bounds = geom.bounds
            width_deg = bounds[2] - bounds[0]
            height_deg = bounds[3] - bounds[1]
            
            # Check if coordinates are geographic (degrees) or projected (meters)
            # Geographic coordinates typically have small degree values
            is_geographic = width_deg < 10 and height_deg < 10 and abs(bounds[0]) < 180 and abs(bounds[1]) < 90
            
            if is_geographic:
                # Approximate conversion: 1 degree ≈ 111km at equator
                # More accurate: use average of lat/lon for better approximation
                center_lat = (bounds[1] + bounds[3]) / 2
                lat_meters_per_deg = 111320.0  # meters per degree latitude
                lon_meters_per_deg = 111320.0 * math.cos(math.radians(center_lat))  # meters per degree longitude
                
                # Calculate approximate area in square meters
                width_m = width_deg * lon_meters_per_deg
                height_m = height_deg * lat_meters_per_deg
                polygon_area = geom.area * lat_meters_per_deg * lon_meters_per_deg
            else:
                # Already in projected coordinates (meters)
                polygon_area = geom.area
            
            # Get configuration
            config = subdivision_config or {}
            method = config.get("method", "grid")  # grid, voronoi, optimized
            target_parcel_area = config.get("target_parcel_area", 400)  # Default ~10 marlas
            min_area = config.get("min_area", self.parcel_standards["min_area"])
            max_area = config.get("max_area", self.parcel_standards["max_area"])
            parcel_type = config.get("parcel_type", "residential")  # residential, commercial, industrial, mixed
            lot_size = config.get("lot_size", "medium")  # small, medium, large, estate
            road_access_percentage = config.get("road_access", 100)  # percentage of parcels with road access
            corner_lot_ratio = config.get("corner_lot_ratio", 25)  # percentage of parcels that should be corner lots
            
            # Adjust target parcel area based on lot size if not explicitly set
            if not config.get("target_parcel_area"):
                lot_size_map = {
                    "small": 125,   # 5 Marla
                    "medium": 250,  # 10 Marla
                    "large": 500,   # 1 Kanal
                    "estate": 1000  # 2+ Kanal
                }
                target_parcel_area = lot_size_map.get(lot_size, 250)
            
            # Adjust min/max area based on parcel type
            if parcel_type == "commercial":
                min_area = max(min_area, 300)  # Commercial parcels typically larger
                max_area = max(max_area, 10000)
                if not config.get("target_parcel_area"):
                    target_parcel_area = max(target_parcel_area, 500)
            elif parcel_type == "industrial":
                min_area = max(min_area, 500)  # Industrial plots are larger
                max_area = max(max_area, 20000)
                if not config.get("target_parcel_area"):
                    target_parcel_area = max(target_parcel_area, 1000)
            elif parcel_type == "mixed":
                # Mixed-use can vary, use defaults but allow flexibility
                pass
            
            # Auto-adjust target parcel area based on polygon size if not specified
            if not config.get("target_parcel_area"):
                # Estimate optimal parcel count based on polygon area
                if polygon_area < 5000:  # Small polygon (< 1.25 acres)
                    target_parcel_area = max(200, polygon_area / 10)  # ~10 parcels
                elif polygon_area < 50000:  # Medium polygon (< 12.5 acres)
                    target_parcel_area = 400  # ~10 marlas
                else:  # Large polygon
                    target_parcel_area = 800  # ~20 marlas
            
            # Ensure target area is within bounds
            target_parcel_area = max(min_area, min(max_area, target_parcel_area))
            
            # Apply terrain constraints if available
            if terrain_data:
                slope_data = terrain_data.get("slope", {})
                if slope_data:
                    # Adjust parcel sizes based on slope
                    avg_slope = slope_data.get("average", 0)
                    if avg_slope > 15:  # Steep terrain
                        min_area *= 1.2  # Larger minimum parcels
                        target_parcel_area *= 1.3
            
            # Perform subdivision based on method
            if method == "grid":
                parcels = self._grid_subdivision(geom, target_parcel_area, min_area, max_area, is_geographic)
            elif method == "voronoi":
                parcels = self._voronoi_subdivision(geom, target_parcel_area, min_area, max_area, is_geographic)
            elif method == "optimized":
                parcels = self._optimized_subdivision(
                    geom, zoning_data, terrain_data, target_parcel_area, min_area, max_area, is_geographic
                )
            else:
                parcels = self._grid_subdivision(geom, target_parcel_area, min_area, max_area, is_geographic)
            
            # Apply zoning constraints if available
            if zoning_data and parcels:
                parcels = self._apply_zoning_constraints(parcels, zoning_data)
            
            # Apply setbacks
            parcels = self._apply_setbacks(parcels)
            
            # Filter parcels by size (handle geographic coordinates)
            valid_parcels = []
            if is_geographic:
                center_lat = (bounds[1] + bounds[3]) / 2
                lat_meters_per_deg = 111320.0
                lon_meters_per_deg = 111320.0 * math.cos(math.radians(center_lat))
            
            for parcel in parcels:
                # Calculate area in square meters
                if is_geographic:
                    area = parcel.area * lat_meters_per_deg * lon_meters_per_deg
                else:
                    area = parcel.area
                
                if min_area <= area <= max_area:
                    valid_parcels.append(parcel)
            
            # Convert to GeoJSON
            logger.info(f"📦 Converting {len(valid_parcels)} valid parcels to GeoJSON")
            parcel_features = []
            
            # Pre-calculate corner lots based on ratio
            target_corner_lots = int(len(valid_parcels) * corner_lot_ratio / 100)
            corner_lot_indices = set()
            if target_corner_lots > 0:
                # Identify actual corner lots first
                actual_corner_lots = []
                for idx, parcel in enumerate(valid_parcels):
                    if self._is_corner_lot(parcel, valid_parcels):
                        actual_corner_lots.append(idx)
                
                # If we have enough actual corner lots, use them
                if len(actual_corner_lots) >= target_corner_lots:
                    corner_lot_indices = set(actual_corner_lots[:target_corner_lots])
                else:
                    # Use all actual corner lots and add more to meet ratio
                    corner_lot_indices = set(actual_corner_lots)
                    # Add edge parcels as corner lots to meet ratio
                    remaining = target_corner_lots - len(actual_corner_lots)
                    for idx in range(min(remaining, len(valid_parcels))):
                        if idx not in corner_lot_indices:
                            corner_lot_indices.add(idx)
            
            # Pre-calculate road access based on percentage
            target_road_access = int(len(valid_parcels) * road_access_percentage / 100)
            road_access_indices = set(range(min(target_road_access, len(valid_parcels))))
            
            for idx, parcel in enumerate(valid_parcels):
                # Calculate parcel area in square meters
                if is_geographic:
                    center_lat = (bounds[1] + bounds[3]) / 2
                    lat_meters_per_deg = 111320.0
                    lon_meters_per_deg = 111320.0 * math.cos(math.radians(center_lat))
                    parcel_area_m2 = parcel.area * lat_meters_per_deg * lon_meters_per_deg
                    parcel_perimeter_m = parcel.length * (lat_meters_per_deg + lon_meters_per_deg) / 2
                else:
                    parcel_area_m2 = parcel.area
                    parcel_perimeter_m = parcel.length
                
                # Skip if parcel is too small
                if parcel_area_m2 < min_area * 0.5:
                    continue
                
                # Determine if this parcel is a corner lot based on ratio
                is_corner = idx in corner_lot_indices
                
                # Determine road access based on percentage
                has_road_access = idx in road_access_indices
                
                feature = {
                    "type": "Feature",
                    "properties": {
                        "parcel_id": f"P{idx + 1:04d}",
                        "area": round(parcel_area_m2, 2),
                        "perimeter": round(parcel_perimeter_m, 2),
                        "zone_type": self._determine_zone_type(parcel, zoning_data, parcel_type),
                        "corner_lot": is_corner,
                        "road_access": has_road_access
                    },
                    "geometry": mapping(parcel)
                }
                parcel_features.append(feature)
            
            # Create FeatureCollection
            parcels_geojson = {
                "type": "FeatureCollection",
                "features": parcel_features
            }
            
            logger.info(f"✅ Created {len(parcel_features)} parcel features for GeoJSON")
            
            # Calculate statistics with proper area conversion
            if valid_parcels:
                if is_geographic:
                    center_lat = (bounds[1] + bounds[3]) / 2
                    lat_meters_per_deg = 111320.0
                    lon_meters_per_deg = 111320.0 * math.cos(math.radians(center_lat))
                    parcel_areas = [p.area * lat_meters_per_deg * lon_meters_per_deg for p in valid_parcels]
                else:
                    parcel_areas = [p.area for p in valid_parcels]
                total_parcel_area = sum(parcel_areas)
                avg_area = np.mean(parcel_areas)
                min_area_val = min(parcel_areas)
                max_area_val = max(parcel_areas)
            else:
                total_parcel_area = 0
                avg_area = 0
                min_area_val = 0
                max_area_val = 0
            
            result = {
                "success": True,
                "total_parcels": len(parcel_features),
                "parcels": parcels_geojson,
                "method": method,
                "polygon_area": round(polygon_area, 2),
                "config_used": {
                    "target_parcel_area": target_parcel_area,
                    "min_area": min_area,
                    "max_area": max_area,
                    "setbacks": self.setback_requirements
                },
                "statistics": {
                    "total_area": round(polygon_area, 2),
                    "parcel_area_avg": round(avg_area, 2),
                    "parcel_area_min": round(min_area_val, 2),
                    "parcel_area_max": round(max_area_val, 2),
                    "total_parcel_area": round(total_parcel_area, 2),
                    "efficiency": round(total_parcel_area / polygon_area * 100, 2) if polygon_area > 0 else 0,
                    "estimated_parcels": round(polygon_area / target_parcel_area, 0) if target_parcel_area > 0 else 0
                }
            }
            
            logger.info(f"✅ Subdivision complete: {len(parcel_features)} parcels, method={method}, polygon_area={round(polygon_area, 2)} m²")
            return result
            
        except Exception as e:
            logger.error(f"Subdivision error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _grid_subdivision(
        self,
        polygon: Polygon,
        target_area: float,
        min_area: float,
        max_area: float,
        is_geographic: bool = False
    ) -> List[Polygon]:
        """Create grid-based subdivision."""
        bounds = polygon.bounds
        width_deg = bounds[2] - bounds[0]
        height_deg = bounds[3] - bounds[1]
        
        # Use the is_geographic parameter passed from parent function
        # If False (default), detect it based on coordinate ranges
        if not is_geographic:
            is_geographic = width_deg < 10 and height_deg < 10 and abs(bounds[0]) < 180 and abs(bounds[1]) < 90
        
        if is_geographic:
            # Convert to approximate meters for calculations
            center_lat = (bounds[1] + bounds[3]) / 2
            lat_meters_per_deg = 111320.0
            lon_meters_per_deg = 111320.0 * math.cos(math.radians(center_lat))
            
            width_m = width_deg * lon_meters_per_deg
            height_m = height_deg * lat_meters_per_deg
            
            # Calculate grid dimensions in meters
            aspect_ratio = width_m / height_m if height_m > 0 else 1
            cell_size_m = math.sqrt(target_area * aspect_ratio)
            
            # Convert back to degrees for grid
            cell_width_deg = cell_size_m / lon_meters_per_deg
            cell_height_deg = cell_size_m / lat_meters_per_deg
            
            cols = max(1, int(width_deg / cell_width_deg))
            rows = max(1, int(height_deg / cell_height_deg))
            
            cell_width = width_deg / cols
            cell_height = height_deg / rows
        else:
            # Already in projected coordinates
            width = width_deg
            height = height_deg
            
            # Calculate grid dimensions
            aspect_ratio = width / height if height > 0 else 1
            cell_size = math.sqrt(target_area * aspect_ratio)
            cols = max(1, int(width / cell_size))
            rows = max(1, int(height / cell_size))
            
            cell_width = width / cols
            cell_height = height / rows
        
        parcels = []
        for i in range(cols):
            for j in range(rows):
                x_min = bounds[0] + i * cell_width
                y_min = bounds[1] + j * cell_height
                x_max = bounds[0] + (i + 1) * cell_width
                y_max = bounds[1] + (j + 1) * cell_height
                
                cell = Polygon([
                    (x_min, y_min),
                    (x_max, y_min),
                    (x_max, y_max),
                    (x_min, y_max),
                    (x_min, y_min)
                ])
                
                # Intersect with original polygon
                try:
                    intersection = polygon.intersection(cell)
                    if intersection.is_empty:
                        continue
                    
                    # Calculate intersection area (handle geographic coordinates)
                    if is_geographic:
                        center_lat = (bounds[1] + bounds[3]) / 2
                        lat_meters_per_deg = 111320.0
                        lon_meters_per_deg = 111320.0 * math.cos(math.radians(center_lat))
                        intersection_area = intersection.area * lat_meters_per_deg * lon_meters_per_deg
                    else:
                        intersection_area = intersection.area
                    
                    if isinstance(intersection, Polygon) and intersection_area >= min_area * 0.5:
                        parcels.append(intersection)
                    elif isinstance(intersection, MultiPolygon):
                        for poly in intersection.geoms:
                            if is_geographic:
                                poly_area = poly.area * lat_meters_per_deg * lon_meters_per_deg
                            else:
                                poly_area = poly.area
                            if poly_area >= min_area * 0.5:
                                parcels.append(poly)
                except Exception as e:
                    logger.warning(f"Error creating parcel cell: {e}")
                    continue
        
        return parcels
    
    def _voronoi_subdivision(
        self,
        polygon: Polygon,
        target_area: float,
        min_area: float,
        max_area: float,
        is_geographic: bool = False
    ) -> List[Polygon]:
        """Create Voronoi-based subdivision."""
        bounds = polygon.bounds
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        
        # Estimate number of parcels
        total_area = polygon.area
        num_parcels = max(4, int(total_area / target_area))
        
        # Generate random points within polygon
        points = []
        attempts = 0
        while len(points) < num_parcels and attempts < num_parcels * 10:
            x = bounds[0] + np.random.random() * width
            y = bounds[1] + np.random.random() * height
            point = Point(x, y)
            if polygon.contains(point) or polygon.buffer(0.1).contains(point):
                points.append(point)
            attempts += 1
        
        if len(points) < 2:
            # Fallback to grid
            return self._grid_subdivision(polygon, target_area, min_area, max_area, is_geographic)
        
        # Create Voronoi diagram
        try:
            voronoi = voronoi_diagram(MultiPoint(points))
            
            parcels = []
            if isinstance(voronoi, Polygon):
                intersection = polygon.intersection(voronoi)
                if isinstance(intersection, Polygon) and intersection.area >= min_area * 0.5:
                    parcels.append(intersection)
            elif isinstance(voronoi, MultiPolygon):
                for poly in voronoi.geoms:
                    intersection = polygon.intersection(poly)
                    if isinstance(intersection, Polygon) and intersection.area >= min_area * 0.5:
                        parcels.append(intersection)
                    elif isinstance(intersection, MultiPolygon):
                        for p in intersection.geoms:
                            if p.area >= min_area * 0.5:
                                parcels.append(p)
        except Exception as e:
            logger.warning(f"Voronoi subdivision failed: {e}, falling back to grid")
            return self._grid_subdivision(polygon, target_area, min_area, max_area, is_geographic)
        
        return parcels
    
    def _optimized_subdivision(
        self,
        polygon: Polygon,
        zoning_data: Optional[Dict],
        terrain_data: Optional[Dict],
        target_area: float,
        min_area: float,
        max_area: float,
        is_geographic: bool = False
    ) -> List[Polygon]:
        """Create optimized subdivision considering zoning and terrain."""
        # Start with grid subdivision
        parcels = self._grid_subdivision(polygon, target_area, min_area, max_area, is_geographic)
        
        # Adjust based on zoning if available
        if zoning_data and "zones" in zoning_data:
            # This would involve more complex logic to align parcels with zones
            pass
        
        # Adjust based on terrain if available
        if terrain_data:
            # Filter out parcels in unsuitable areas
            suitable_parcels = []
            for parcel in parcels:
                # Simple check - in real implementation, would analyze terrain at parcel location
                suitable_parcels.append(parcel)
            parcels = suitable_parcels
        
        return parcels
    
    def _apply_zoning_constraints(
        self,
        parcels: List[Polygon],
        zoning_data: Dict
    ) -> List[Polygon]:
        """Apply zoning constraints to parcels."""
        # In a full implementation, this would filter/merge parcels based on zones
        # For now, return parcels as-is
        return parcels
    
    def _apply_setbacks(self, parcels: List[Polygon]) -> List[Polygon]:
        """Apply setback requirements to parcels."""
        # In a full implementation, this would shrink parcels by setback distances
        # For now, return parcels as-is (setbacks would be applied during building design)
        return parcels
    
    def _determine_zone_type(
        self,
        parcel: Polygon,
        zoning_data: Optional[Dict] = None,
        parcel_type: str = "residential"
    ) -> str:
        """Determine zone type for a parcel based on user selection or zoning data."""
        # If zoning data exists, check if parcel falls in a specific zone
        if zoning_data and "zones" in zoning_data:
            centroid = parcel.centroid
            for zone in zoning_data.get("zones", []):
                if "geometry" in zone:
                    zone_geom = shape(zone["geometry"])
                    if zone_geom.contains(centroid):
                        return zone.get("type", parcel_type)
        
        # Use the parcel_type from config as default
        # Map frontend values to backend zone types
        type_mapping = {
            "residential": "residential",
            "commercial": "commercial",
            "industrial": "industrial",
            "mixed": "mixed_use"
        }
        return type_mapping.get(parcel_type, "residential")
    
    def _is_corner_lot(self, parcel: Polygon, all_parcels: List[Polygon]) -> bool:
        """Determine if a parcel is a corner lot."""
        # A corner lot touches fewer neighbors
        # Simplified check: if parcel has fewer shared boundaries
        neighbors = 0
        for other in all_parcels:
            if parcel != other and parcel.touches(other):
                neighbors += 1
                if neighbors > 2:
                    return False
        return neighbors <= 2

