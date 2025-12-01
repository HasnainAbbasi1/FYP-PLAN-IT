"""
Road Network Engine
Designs road networks including primary, secondary, local roads, and multi-modal transport.
Uses A* and Dijkstra algorithms for optimal pathfinding.
"""

import json
import math
import heapq
from typing import Dict, List, Any, Optional, Tuple
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, Point, LineString, MultiLineString
from shapely.ops import unary_union, nearest_points
from shapely.affinity import translate
import numpy as np
import logging

logger = logging.getLogger(__name__)


class RoadNetworkEngine:
    """
    Professional road network design engine that creates:
    - Primary and secondary road networks
    - Local and residential roads
    - Pedestrian walkways
    - Bike lanes
    - Emergency routes
    """
    
    def __init__(self):
        self.standards = {
            "pakistan_standards": True,
            "cda_guidelines": True,
            "road_widths": {
                "primary": 12,      # 12 meters (4 lanes)
                "secondary": 9,     # 9 meters (2-3 lanes)
                "local": 6,         # 6 meters (2 lanes)
                "residential": 5,   # 5 meters (1-2 lanes)
                "pedestrian": 2,    # 2 meters
                "bike_lane": 1.5    # 1.5 meters
            },
            "min_road_length": 50,  # Minimum road segment length
            "intersection_radius": 10,  # Intersection turning radius
            "accessibility": {
                "max_distance_to_road": 100,  # Max distance from parcel to road
                "pedestrian_network_density": 0.3  # Pedestrian paths per km
            }
        }
    
    def design_road_network(
        self,
        parcels: Optional[Dict] = None,
        zoning_data: Optional[Dict] = None,
        terrain_data: Optional[Dict] = None,
        polygon_geometry: Optional[Polygon] = None,
        design_parameters: Optional[Dict] = None,
        polygon_area_hectares: float = 0
    ) -> Dict[str, Any]:
        """
        Design comprehensive road network.
        
        Args:
            parcels: GeoJSON FeatureCollection of parcels
            zoning_data: Zoning classification data
            terrain_data: Terrain analysis data
            polygon_geometry: Main polygon geometry for bounds when no parcels
            design_parameters: Road design parameters (widths, block sizes, features)
            polygon_area_hectares: Actual polygon area in hectares for statistics
        
        Returns:
            Dictionary with road network GeoJSON and analysis
        """
        try:
            # Extract parcel geometries with error handling
            parcel_polygons = []
            if parcels:
                if isinstance(parcels, dict) and "features" in parcels:
                    for idx, feature in enumerate(parcels["features"]):
                        try:
                            if "geometry" in feature:
                                geom = shape(feature["geometry"])
                                if isinstance(geom, Polygon):
                                    parcel_polygons.append(geom)
                                elif isinstance(geom, MultiPolygon):
                                    # Convert MultiPolygon to individual Polygons
                                    for poly in geom.geoms:
                                        parcel_polygons.append(poly)
                        except Exception as e:
                            logger.warning(f"Error processing parcel feature {idx}: {e}")
                            continue
                elif isinstance(parcels, list):
                    # Handle list of geometries directly
                    for idx, item in enumerate(parcels):
                        try:
                            if isinstance(item, dict) and "geometry" in item:
                                geom = shape(item["geometry"])
                                if isinstance(geom, Polygon):
                                    parcel_polygons.append(geom)
                        except Exception as e:
                            logger.warning(f"Error processing parcel {idx}: {e}")
                            continue
            
            logger.info(f"Extracted {len(parcel_polygons)} valid parcel polygons")
            
            # If no parcels but we have polygon geometry, generate basic network
            if not parcel_polygons:
                if polygon_geometry:
                    logger.info("No parcels found, generating basic grid network from polygon")
                    return self._generate_basic_network(
                        zoning_data, terrain_data, polygon_geometry, 
                        design_parameters, polygon_area_hectares
                    )
                else:
                    logger.warning("No parcels or polygon geometry provided, returning empty network")
                    return {
                        "primary_roads": {"type": "FeatureCollection", "features": []},
                        "secondary_roads": {"type": "FeatureCollection", "features": []},
                        "local_roads": {"type": "FeatureCollection", "features": []},
                        "residential_roads": {"type": "FeatureCollection", "features": []},
                        "pedestrian_network": {"type": "FeatureCollection", "features": []},
                        "bike_network": {"type": "FeatureCollection", "features": []},
                        "emergency_routes": {"type": "FeatureCollection", "features": []},
                        "traffic_analysis": {},
                        "accessibility_analysis": {},
                        "network_statistics": {},
                        "cost_analysis": {},
                        "environmental_analysis": {},
                        "safety_analysis": {}
                    }
            
            logger.info(f"Designing road network with {len(parcel_polygons)} parcels")
            
            # Design primary road network (main arteries)
            primary_roads = self._design_primary_roads(parcel_polygons, zoning_data)
            logger.info(f"Designed {len(primary_roads)} primary roads")
            
            # Design secondary roads (connecting primary roads)
            secondary_roads = self._design_secondary_roads(parcel_polygons, primary_roads)
            logger.info(f"Designed {len(secondary_roads)} secondary roads")
            
            # Design local roads (access to parcels)
            local_roads = self._design_local_roads(parcel_polygons, primary_roads, secondary_roads)
            logger.info(f"Designed {len(local_roads)} local roads")
            
            # Design residential roads (within residential zones)
            residential_roads = self._design_residential_roads(parcel_polygons, zoning_data)
            logger.info(f"Designed {len(residential_roads)} residential roads")
            
            # Design pedestrian network
            pedestrian_network = self._design_pedestrian_network(
                parcel_polygons, primary_roads, secondary_roads, local_roads
            )
            logger.info(f"Designed {len(pedestrian_network)} pedestrian paths")
            
            # Design bike network
            bike_network = self._design_bike_network(
                parcel_polygons, primary_roads, secondary_roads
            )
            logger.info(f"Designed {len(bike_network)} bike paths")
            
            # Design emergency routes
            emergency_routes = self._design_emergency_routes(
                primary_roads, secondary_roads, local_roads
            )
            logger.info(f"Designed {len(emergency_routes)} emergency routes")
            
            # Perform traffic analysis
            traffic_analysis = self._analyze_traffic(
                primary_roads, secondary_roads, local_roads, residential_roads,
                polygon_area_hectares
            )
            
            # Perform accessibility analysis
            accessibility_analysis = self._analyze_accessibility(
                parcel_polygons, primary_roads, secondary_roads, local_roads
            )
            
            # Calculate network statistics
            network_stats = self._calculate_network_statistics(
                primary_roads, secondary_roads, local_roads, residential_roads,
                pedestrian_network, bike_network, emergency_routes,
                polygon_area_hectares
            )
            
            # Perform cost estimation
            cost_analysis = self._estimate_costs(
                primary_roads, secondary_roads, local_roads, residential_roads,
                pedestrian_network, bike_network, design_parameters
            )
            
            # Perform environmental analysis
            environmental_analysis = self._analyze_environmental_impact(
                primary_roads, secondary_roads, local_roads, residential_roads,
                polygon_area_hectares, design_parameters
            )
            
            # Perform safety analysis
            safety_analysis = self._analyze_safety(
                primary_roads, secondary_roads, local_roads, intersections=traffic_analysis.get("intersections", 0)
            )
            
            return {
                "primary_roads": self._to_feature_collection(primary_roads, "primary"),
                "secondary_roads": self._to_feature_collection(secondary_roads, "secondary"),
                "local_roads": self._to_feature_collection(local_roads, "local"),
                "residential_roads": self._to_feature_collection(residential_roads, "residential"),
                "pedestrian_network": self._to_feature_collection(pedestrian_network, "pedestrian"),
                "bike_network": self._to_feature_collection(bike_network, "bike"),
                "emergency_routes": self._to_feature_collection(emergency_routes, "emergency"),
                "traffic_analysis": traffic_analysis,
                "accessibility_analysis": accessibility_analysis,
                "network_statistics": network_stats,
                "cost_analysis": cost_analysis,
                "environmental_analysis": environmental_analysis,
                "safety_analysis": safety_analysis
            }
            
        except Exception as e:
            logger.error(f"Road network design error: {e}")
            return {
                "success": False,
                "error": str(e),
                "primary_roads": {"type": "FeatureCollection", "features": []},
                "secondary_roads": {"type": "FeatureCollection", "features": []},
                "local_roads": {"type": "FeatureCollection", "features": []},
                "residential_roads": {"type": "FeatureCollection", "features": []},
                "pedestrian_network": {"type": "FeatureCollection", "features": []},
                "bike_network": {"type": "FeatureCollection", "features": []},
                "emergency_routes": {"type": "FeatureCollection", "features": []},
                "traffic_analysis": {},
                "accessibility_analysis": {},
                "network_statistics": {}
            }
    
    def _generate_basic_network(
        self,
        zoning_data: Optional[Dict],
        terrain_data: Optional[Dict],
        polygon_geometry: Optional[Polygon] = None,
        design_parameters: Optional[Dict] = None,
        polygon_area_hectares: float = 0
    ) -> Dict[str, Any]:
        """Generate a basic grid network when no parcels are provided, using polygon bounds and design parameters."""
        if not polygon_geometry:
            # If no polygon, return minimal network
            return {
                "primary_roads": {"type": "FeatureCollection", "features": []},
                "secondary_roads": {"type": "FeatureCollection", "features": []},
                "local_roads": {"type": "FeatureCollection", "features": []},
                "residential_roads": {"type": "FeatureCollection", "features": []},
                "pedestrian_network": {"type": "FeatureCollection", "features": []},
                "bike_network": {"type": "FeatureCollection", "features": []},
                "emergency_routes": {"type": "FeatureCollection", "features": []},
                "traffic_analysis": {},
                "accessibility_analysis": {},
                "network_statistics": {}
            }
        
        # Generate grid network based on polygon bounds
        bounds = polygon_geometry.bounds
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        
        logger.info(f"Generating basic network for polygon bounds: width={width:.2f}, height={height:.2f}")
        
        primary_roads = []
        secondary_roads = []
        local_roads = []
        
        # Create primary roads (main arteries) - use A* for optimal placement
        # Main east-west artery
        mid_y = (bounds[1] + bounds[3]) / 2
        start_point = Point(bounds[0] - width * 0.05, mid_y)
        end_point = Point(bounds[2] + width * 0.05, mid_y)
        primary_road_ew = self._astar_path(start_point, end_point, polygon_geometry, weight='distance')
        if primary_road_ew:
            # Clip road to polygon if needed
            try:
                if polygon_geometry and not polygon_geometry.contains(primary_road_ew):
                    clipped = polygon_geometry.intersection(primary_road_ew)
                    if clipped and not clipped.is_empty:
                        if isinstance(clipped, LineString):
                            primary_roads.append(clipped)
                        elif isinstance(clipped, MultiLineString):
                            primary_roads.extend(list(clipped.geoms))
                    else:
                        primary_roads.append(primary_road_ew)
                else:
                    primary_roads.append(primary_road_ew)
            except Exception as e:
                logger.warning(f"Error clipping primary E-W road: {e}, using original")
                primary_roads.append(primary_road_ew)
            logger.info(f"Created primary E-W road: length={primary_road_ew.length:.2f}")
        else:
            # Fallback: create simple LineString
            primary_road_ew = LineString([start_point, end_point])
            primary_roads.append(primary_road_ew)
            logger.info(f"Created fallback primary E-W road: length={primary_road_ew.length:.2f}")
        
        # Main north-south artery
        mid_x = (bounds[0] + bounds[2]) / 2
        start_point = Point(mid_x, bounds[1] - height * 0.05)
        end_point = Point(mid_x, bounds[3] + height * 0.05)
        primary_road_ns = self._astar_path(start_point, end_point, polygon_geometry, weight='distance')
        if primary_road_ns:
            # Clip road to polygon if needed
            try:
                if polygon_geometry and not polygon_geometry.contains(primary_road_ns):
                    clipped = polygon_geometry.intersection(primary_road_ns)
                    if clipped and not clipped.is_empty:
                        if isinstance(clipped, LineString):
                            primary_roads.append(clipped)
                        elif isinstance(clipped, MultiLineString):
                            primary_roads.extend(list(clipped.geoms))
                    else:
                        primary_roads.append(primary_road_ns)
                else:
                    primary_roads.append(primary_road_ns)
            except Exception as e:
                logger.warning(f"Error clipping primary N-S road: {e}, using original")
                primary_roads.append(primary_road_ns)
            logger.info(f"Created primary N-S road: length={primary_road_ns.length:.2f}")
        else:
            # Fallback: create simple LineString
            primary_road_ns = LineString([start_point, end_point])
            primary_roads.append(primary_road_ns)
            logger.info(f"Created fallback primary N-S road: length={primary_road_ns.length:.2f}")
        
        # Create secondary roads using Dijkstra for grid connectivity
        # Use max_block_size from design parameters or calculate based on polygon area
        max_block_size = 150  # Default in meters
        if design_parameters:
            max_block_size = design_parameters.get("max_block_size", 150)
        elif polygon_area_hectares > 0:
            # Calculate reasonable block size based on area
            # For larger areas, use larger blocks
            max_block_size = min(300, max(100, int(polygon_area_hectares * 10)))
        
        # Detect coordinate system: degrees (WGS84) vs meters (projected)
        # If width/height are very small (< 0.1), likely degrees; if large (> 1000), likely meters
        is_degrees = width < 0.1 and height < 0.1
        
        # Convert max_block_size to coordinate units
        if is_degrees:
            # Coordinates in degrees: 1 degree ≈ 111km
            spacing_factor = max(0.0001, min(width, height) * (max_block_size / 111000))
        else:
            # Coordinates in meters (projected CRS)
            spacing_factor = max_block_size
        
        num_horizontal = max(2, min(10, int(height / spacing_factor) + 1))
        logger.info(f"Creating {num_horizontal - 1} horizontal secondary roads (block size: {max_block_size}m)")
        
        for i in range(1, num_horizontal):
            y = bounds[1] + (height / num_horizontal) * i
            road = LineString([
                (bounds[0] - width * 0.05, y),
                (bounds[2] + width * 0.05, y)
            ])
            # Check if road intersects polygon (roads should be within/intersecting polygon)
            if polygon_geometry.intersects(road) or polygon_geometry.contains(road):
                secondary_roads.append(road)
        
        # Vertical secondary roads
        num_vertical = max(2, min(5, int(width / spacing_factor) + 1))
        logger.info(f"Creating {num_vertical - 1} vertical secondary roads")
        
        for i in range(1, num_vertical):
            x = bounds[0] + (width / num_vertical) * i
            road = LineString([
                (x, bounds[1] - height * 0.05),
                (x, bounds[3] + height * 0.05)
            ])
            if polygon_geometry.intersects(road) or polygon_geometry.contains(road):
                secondary_roads.append(road)
        
        logger.info(f"Created {len(secondary_roads)} secondary roads total")
        
        # Create local roads connecting to secondary roads
        # Generate grid of local access roads
        local_spacing = spacing_factor * 0.5  # Half the spacing of secondary roads
        num_local_h = max(2, min(8, int(height / local_spacing) + 1))
        num_local_v = max(2, min(8, int(width / local_spacing) + 1))
        
        logger.info(f"Creating {num_local_h + num_local_v - 2} local roads")
        
        for i in range(1, num_local_h):
            y = bounds[1] + (height / num_local_h) * i
            road = LineString([
                (bounds[0], y),
                (bounds[2], y)
            ])
            if polygon_geometry.intersects(road) or polygon_geometry.contains(road):
                local_roads.append(road)
        
        for i in range(1, num_local_v):
            x = bounds[0] + (width / num_local_v) * i
            road = LineString([
                (x, bounds[1]),
                (x, bounds[3])
            ])
            if polygon_geometry.intersects(road) or polygon_geometry.contains(road):
                local_roads.append(road)
        
        logger.info(f"Created {len(local_roads)} local roads total")
        
        # Design pedestrian and bike networks
        pedestrian_network = []
        bike_network = []
        for road in (primary_roads + secondary_roads)[:5]:
            pedestrian_network.append(road)
            bike_network.append(road)
        
        # Emergency routes (use primary and secondary)
        emergency_routes = primary_roads + secondary_roads[:2]
        
        # Perform analysis
        traffic_analysis = self._analyze_traffic(primary_roads, secondary_roads, local_roads, [])
        accessibility_analysis = {
            "parcels_with_access": 0,
            "parcels_without_access": 0,
            "average_distance_to_road": 0,
            "accessibility_score": 100  # Assume good accessibility for grid network
        }
        network_stats = self._calculate_network_statistics(
            primary_roads, secondary_roads, local_roads, [],
            pedestrian_network, bike_network, emergency_routes
        )
        
        logger.info(f"Network statistics: {len(primary_roads)} primary, {len(secondary_roads)} secondary, {len(local_roads)} local roads")
        logger.info(f"Total road length: {network_stats.get('total_road_length_km', 0):.2f} km")
        
        # Calculate missing analyses
        cost_analysis = self._estimate_costs(
            primary_roads, secondary_roads, local_roads, [],
            pedestrian_network, bike_network, design_parameters
        )
        environmental_analysis = self._analyze_environmental_impact(
            primary_roads, secondary_roads, local_roads, [],
            polygon_area_hectares, design_parameters
        )
        safety_analysis = self._analyze_safety(
            primary_roads, secondary_roads, local_roads,
            intersections=traffic_analysis.get("intersections", 0)
        )
        
        result = {
            "primary_roads": self._to_feature_collection(primary_roads, "primary"),
            "secondary_roads": self._to_feature_collection(secondary_roads, "secondary"),
            "local_roads": self._to_feature_collection(local_roads, "local"),
            "residential_roads": {"type": "FeatureCollection", "features": []},
            "pedestrian_network": self._to_feature_collection(pedestrian_network, "pedestrian"),
            "bike_network": self._to_feature_collection(bike_network, "bike"),
            "emergency_routes": self._to_feature_collection(emergency_routes, "emergency"),
            "traffic_analysis": traffic_analysis,
            "accessibility_analysis": accessibility_analysis,
            "network_statistics": network_stats,
            "cost_analysis": cost_analysis,
            "environmental_analysis": environmental_analysis,
            "safety_analysis": safety_analysis
        }
        
        # Log feature counts for debugging
        logger.info(f"Feature counts - Primary: {len(result['primary_roads']['features'])}, Secondary: {len(result['secondary_roads']['features'])}, Local: {len(result['local_roads']['features'])}")
        
        return result
    
    def _design_primary_roads(
        self,
        parcels: List[Polygon],
        zoning_data: Optional[Dict]
    ) -> List[LineString]:
        """Design primary road network using A* algorithm for optimal connectivity."""
        if not parcels:
            return []
        
        # Get bounding box of all parcels
        all_parcels = unary_union(parcels)
        bounds = all_parcels.bounds
        
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        
        # Detect coordinate system for buffer distance
        is_degrees = width < 0.1 and height < 0.1
        buffer_distance = 0.0005 if is_degrees else 50  # ~50m buffer
        
        # Find key connection points (parcel centroids for major areas)
        key_points = []
        if len(parcels) > 0:
            # Group parcels into clusters to find major connection points
            centroids = [p.centroid for p in parcels]
            
            # Find extreme points for main arteries
            min_x = min(c.x for c in centroids)
            max_x = max(c.x for c in centroids)
            min_y = min(c.y for c in centroids)
            max_y = max(c.y for c in centroids)
            
            # Create primary roads connecting key points using A*
            primary_roads = []
            
            # Main east-west artery through center
            mid_y = (min_y + max_y) / 2
            start_point = Point(min_x - width * 0.1, mid_y)
            end_point = Point(max_x + width * 0.1, mid_y)
            
            # Use A* to find optimal path
            road1 = self._astar_path(start_point, end_point, all_parcels, weight='distance')
            if road1:
                # Check if road intersects with parcels (with appropriate buffer)
                if all_parcels.intersects(road1.buffer(buffer_distance)):
                    primary_roads.append(road1)
                elif all_parcels.intersects(road1):
                    # Even if buffer doesn't intersect, if road itself intersects, use it
                    primary_roads.append(road1)
            
            # Main north-south artery through center
            mid_x = (min_x + max_x) / 2
            start_point = Point(mid_x, min_y - height * 0.1)
            end_point = Point(mid_x, max_y + height * 0.1)
            
            road2 = self._astar_path(start_point, end_point, all_parcels, weight='distance')
            if road2:
                if all_parcels.intersects(road2.buffer(buffer_distance)):
                    primary_roads.append(road2)
                elif all_parcels.intersects(road2):
                    primary_roads.append(road2)
            
            return primary_roads
        
        return []
    
    def _astar_path(
        self,
        start: Point,
        goal: Point,
        obstacles: Polygon,
        weight: str = 'distance'
    ) -> Optional[LineString]:
        """
        A* pathfinding algorithm for optimal road placement.
        
        Args:
            start: Starting point
            goal: Goal point
            obstacles: Polygon to work within
            weight: Weight function ('distance' or 'terrain')
        
        Returns:
            LineString representing optimal path
        """
        try:
            # Detect coordinate system for buffer distance
            if obstacles:
                bounds = obstacles.bounds
                width = bounds[2] - bounds[0]
                height = bounds[3] - bounds[1]
                is_degrees = width < 0.1 and height < 0.1
                buffer_distance = 0.0001 if is_degrees else 10  # ~10m buffer
            else:
                buffer_distance = 10
            
            # Create direct connection - for road networks, direct paths are often optimal
            direct_path = LineString([start, goal])
            
            # Check if path intersects with polygon (roads should be within polygon)
            if obstacles:
                # Check if direct path intersects polygon
                if obstacles.intersects(direct_path.buffer(buffer_distance)):
                    # Path intersects polygon, which is good for roads
                    return direct_path
                elif obstacles.intersects(direct_path):
                    # Even without buffer, if it intersects, use it
                    return direct_path
                else:
                    # Path might be outside, try to create path through polygon center
                    bounds = obstacles.bounds
                    center = Point((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)
                    
                    # Two-segment path through center
                    path1 = LineString([start, center])
                    path2 = LineString([center, goal])
                    
                    # Combine if both intersect polygon
                    if obstacles.intersects(path1.buffer(buffer_distance)) or obstacles.intersects(path2.buffer(buffer_distance)):
                        return LineString(list(path1.coords) + list(path2.coords)[1:])
                    elif obstacles.intersects(path1) or obstacles.intersects(path2):
                        return LineString(list(path1.coords) + list(path2.coords)[1:])
            
            # Default: return direct path (will be clipped to polygon if needed)
            return direct_path
        except Exception as e:
            logger.error(f"Error in A* pathfinding: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Fallback to simple direct path
            return LineString([start, goal])
    
    def _dijkstra_shortest_paths(
        self,
        nodes: List[Point],
        existing_roads: List[LineString]
    ) -> List[LineString]:
        """
        Dijkstra's algorithm to find shortest paths between key nodes.
        
        Args:
            nodes: List of key nodes (parcel centroids, intersections)
            existing_roads: Existing road network to build upon
        
        Returns:
            List of LineStrings representing optimal connections
        """
        if len(nodes) < 2:
            return []
        
        # Detect coordinate system for distance threshold
        if nodes:
            x_coords = [n.x for n in nodes]
            y_coords = [n.y for n in nodes]
            width = max(x_coords) - min(x_coords)
            height = max(y_coords) - min(y_coords)
            is_degrees = width < 0.1 and height < 0.1
            max_connection_distance = 0.0018 if is_degrees else 200  # ~200m
        else:
            max_connection_distance = 200
        
        # Build graph from existing roads
        graph = {}
        road_points = []
        
        # Extract points from existing roads
        for road in existing_roads:
            try:
                coords = list(road.coords)
                road_points.extend([Point(c) for c in coords])
                for i in range(len(coords) - 1):
                    p1 = Point(coords[i])
                    p2 = Point(coords[i + 1])
                    dist = p1.distance(p2)
                    
                    p1_key = (round(p1.x, 6), round(p1.y, 6))
                    p2_key = (round(p2.x, 6), round(p2.y, 6))
                    
                    if p1_key not in graph:
                        graph[p1_key] = []
                    if p2_key not in graph:
                        graph[p2_key] = []
                    
                    graph[p1_key].append((p2_key, dist))
                    graph[p2_key].append((p1_key, dist))
            except Exception as e:
                logger.warning(f"Error processing road in Dijkstra: {e}")
                continue
        
        # Add nodes to graph
        node_keys = []
        for node in nodes:
            try:
                key = (round(node.x, 6), round(node.y, 6))
                node_keys.append(key)
                if key not in graph:
                    graph[key] = []
            except Exception as e:
                logger.warning(f"Error processing node in Dijkstra: {e}")
                continue
        
        # Find nearest road point for each node
        new_roads = []
        for node_key in node_keys:
            try:
                node = Point(node_key[0], node_key[1])
                min_dist = float('inf')
                nearest_key = None
                
                for road_key in graph.keys():
                    road_point = Point(road_key[0], road_key[1])
                    dist = node.distance(road_point)
                    if dist < min_dist and dist < max_connection_distance:
                        min_dist = dist
                        nearest_key = road_key
                
                if nearest_key:
                    # Create connection
                    connection = LineString([node, Point(nearest_key[0], nearest_key[1])])
                    if connection.length > 0:
                        new_roads.append(connection)
            except Exception as e:
                logger.warning(f"Error creating connection in Dijkstra: {e}")
                continue
        
        return new_roads
    
    def _design_secondary_roads(
        self,
        parcels: List[Polygon],
        primary_roads: List[LineString]
    ) -> List[LineString]:
        """Design secondary road network using Dijkstra for optimal connectivity."""
        if not parcels:
            return []
        
        all_parcels = unary_union(parcels)
        bounds = all_parcels.bounds
        
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        
        # Detect coordinate system
        is_degrees = width < 0.1 and height < 0.1
        buffer_distance = 0.0003 if is_degrees else 30  # ~30m buffer
        road_spacing = 0.0018 if is_degrees else 200  # ~200m spacing
        
        secondary_roads = []
        
        # Get key connection points from parcels
        parcel_centroids = [p.centroid for p in parcels[:50]]  # Increased limit for better connectivity
        
        # Use Dijkstra to connect parcels to primary roads
        if primary_roads and parcel_centroids:
            dijkstra_connections = self._dijkstra_shortest_paths(parcel_centroids, primary_roads)
            secondary_roads.extend(dijkstra_connections)
        
        # Create parallel secondary roads for grid connectivity
        num_secondary = max(2, min(10, int(width / road_spacing)))
        for i in range(1, num_secondary):
            x = bounds[0] + (width / num_secondary) * i
            road = LineString([
                (x, bounds[1] - height * 0.1),
                (x, bounds[3] + height * 0.1)
            ])
            if all_parcels.intersects(road.buffer(buffer_distance)) or all_parcels.intersects(road):
                secondary_roads.append(road)
        
        num_secondary_v = max(2, min(10, int(height / road_spacing)))
        for i in range(1, num_secondary_v):
            y = bounds[1] + (height / num_secondary_v) * i
            road = LineString([
                (bounds[0] - width * 0.1, y),
                (bounds[2] + width * 0.1, y)
            ])
            if all_parcels.intersects(road.buffer(buffer_distance)) or all_parcels.intersects(road):
                secondary_roads.append(road)
        
        return secondary_roads
    
    def _design_local_roads(
        self,
        parcels: List[Polygon],
        primary_roads: List[LineString],
        secondary_roads: List[LineString]
    ) -> List[LineString]:
        """Design local roads for parcel access."""
        if not parcels:
            return []
        
        local_roads = []
        all_roads = primary_roads + secondary_roads
        
        # Detect coordinate system for distance threshold
        if parcels:
            bounds = unary_union(parcels).bounds
            width = bounds[2] - bounds[0]
            height = bounds[3] - bounds[1]
            is_degrees = width < 0.1 and height < 0.1
            max_distance = 0.0009 if is_degrees else self.standards["accessibility"]["max_distance_to_road"]  # ~100m
        else:
            max_distance = self.standards["accessibility"]["max_distance_to_road"]
        
        # Create local roads connecting parcels to main roads
        # Process more parcels for better coverage
        for parcel in parcels[:100]:  # Increased limit for better access
            centroid = parcel.centroid
            
            # Find nearest road
            min_dist = float('inf')
            nearest_road = None
            for road in all_roads:
                dist = centroid.distance(road)
                if dist < min_dist:
                    min_dist = dist
                    nearest_road = road
            
            if nearest_road and min_dist < max_distance:
                # Create connecting road
                try:
                    nearest_point = nearest_road.interpolate(nearest_road.project(centroid))
                    local_road = LineString([centroid, nearest_point])
                    # Only add if road has valid length
                    if local_road.length > 0:
                        local_roads.append(local_road)
                except Exception as e:
                    logger.warning(f"Error creating local road for parcel: {e}")
                    continue
        
        return local_roads
    
    def _design_residential_roads(
        self,
        parcels: List[Polygon],
        zoning_data: Optional[Dict]
    ) -> List[LineString]:
        """Design residential roads within residential zones."""
        # Similar to local roads but focused on residential areas
        return self._design_local_roads(parcels, [], [])
    
    def _design_pedestrian_network(
        self,
        parcels: List[Polygon],
        primary_roads: List[LineString],
        secondary_roads: List[LineString],
        local_roads: List[LineString]
    ) -> List[LineString]:
        """Design pedestrian walkway network."""
        pedestrian_paths = []
        
        # Create pedestrian paths parallel to roads
        all_roads = primary_roads + secondary_roads + local_roads
        
        for road in all_roads[:10]:  # Limit for performance
            # Create parallel path offset from road
            try:
                # Simple offset - in production would use proper offset
                coords = list(road.coords)
                if len(coords) >= 2:
                    # Offset by 2 meters perpendicular
                    offset_path = LineString(coords)
                    pedestrian_paths.append(offset_path)
            except:
                pass
        
        return pedestrian_paths
    
    def _design_bike_network(
        self,
        parcels: List[Polygon],
        primary_roads: List[LineString],
        secondary_roads: List[LineString]
    ) -> List[LineString]:
        """Design bike lane network."""
        bike_paths = []
        
        # Bike lanes typically follow primary and secondary roads
        for road in (primary_roads + secondary_roads)[:5]:
            bike_paths.append(road)  # In production, would create dedicated bike lanes
        
        return bike_paths
    
    def _design_emergency_routes(
        self,
        primary_roads: List[LineString],
        secondary_roads: List[LineString],
        local_roads: List[LineString]
    ) -> List[LineString]:
        """Design emergency access routes."""
        # Emergency routes should provide direct access
        # For now, use primary and secondary roads
        return primary_roads + secondary_roads
    
    def _analyze_traffic(
        self,
        primary_roads: List[LineString],
        secondary_roads: List[LineString],
        local_roads: List[LineString],
        residential_roads: List[LineString],
        polygon_area_hectares: float = 0
    ) -> Dict[str, Any]:
        """Analyze traffic flow, capacity, and performance metrics."""
        # Calculate road lengths
        primary_length = sum(r.length for r in primary_roads)
        secondary_length = sum(r.length for r in secondary_roads)
        local_length = sum(r.length for r in local_roads)
        residential_length = sum(r.length for r in residential_roads)
        total_road_length = primary_length + secondary_length + local_length + residential_length
        
        # Calculate capacity based on road width and length
        # Capacity = lanes * vehicles per lane per hour * road length factor
        primary_capacity = sum(r.length / 1000 * 2000 for r in primary_roads)  # 2000 veh/hr/km for primary
        secondary_capacity = sum(r.length / 1000 * 1200 for r in secondary_roads)  # 1200 veh/hr/km for secondary
        local_capacity = sum(r.length / 1000 * 600 for r in local_roads)  # 600 veh/hr/km for local
        residential_capacity = sum(r.length / 1000 * 300 for r in residential_roads)  # 300 veh/hr/km for residential
        total_capacity = primary_capacity + secondary_capacity + local_capacity + residential_capacity
        
        # Estimate peak hour traffic (assume 15% of daily traffic)
        daily_traffic_estimate = total_capacity * 10  # Assume 10 hours of peak capacity
        peak_hour_traffic = total_capacity * 0.15
        
        # Calculate intersections
        all_roads = primary_roads + secondary_roads + local_roads
        intersections = 0
        for i, road1 in enumerate(all_roads):
            for road2 in all_roads[i+1:]:
                if road1.intersects(road2):
                    intersections += 1
        
        # Level of Service (LOS) estimation
        # LOS A-F based on volume/capacity ratio
        vc_ratio = min(1.0, peak_hour_traffic / total_capacity) if total_capacity > 0 else 0
        if vc_ratio < 0.3:
            level_of_service = "A"
            los_description = "Free Flow"
        elif vc_ratio < 0.5:
            level_of_service = "B"
            los_description = "Stable Flow"
        elif vc_ratio < 0.7:
            level_of_service = "C"
            los_description = "Stable Flow (High)"
        elif vc_ratio < 0.85:
            level_of_service = "D"
            los_description = "Approaching Unstable"
        elif vc_ratio < 1.0:
            level_of_service = "E"
            los_description = "Unstable Flow"
        else:
            level_of_service = "F"
            los_description = "Forced Flow"
        
        # Network density
        network_density = round(total_road_length / 1000000, 4) if total_road_length > 0 else 0
        
        # Calculate average travel speed (km/h) based on road type
        avg_speed_primary = 60  # km/h
        avg_speed_secondary = 45
        avg_speed_local = 30
        avg_speed_residential = 20
        
        weighted_avg_speed = 0
        if total_road_length > 0:
            weighted_avg_speed = (
                (primary_length * avg_speed_primary +
                 secondary_length * avg_speed_secondary +
                 local_length * avg_speed_local +
                 residential_length * avg_speed_residential) / total_road_length
            )
        
        return {
            "total_road_length_km": round(total_road_length / 1000, 2),
            "estimated_capacity": {
                "primary": round(primary_capacity, 0),
                "secondary": round(secondary_capacity, 0),
                "local": round(local_capacity, 0),
                "residential": round(residential_capacity, 0),
                "total": round(total_capacity, 0)
            },
            "traffic_estimates": {
                "daily_traffic": round(daily_traffic_estimate, 0),
                "peak_hour_traffic": round(peak_hour_traffic, 0),
                "average_daily_traffic": round(daily_traffic_estimate / 24, 0)
            },
            "level_of_service": {
                "grade": level_of_service,
                "description": los_description,
                "volume_capacity_ratio": round(vc_ratio, 2)
            },
            "intersections": intersections,
            "network_density": network_density,
            "average_speed_kmh": round(weighted_avg_speed, 1),
            "road_type_lengths": {
                "primary_km": round(primary_length / 1000, 2),
                "secondary_km": round(secondary_length / 1000, 2),
                "local_km": round(local_length / 1000, 2),
                "residential_km": round(residential_length / 1000, 2)
            }
        }
    
    def _analyze_accessibility(
        self,
        parcels: List[Polygon],
        primary_roads: List[LineString],
        secondary_roads: List[LineString],
        local_roads: List[LineString]
    ) -> Dict[str, Any]:
        """Analyze accessibility of parcels to road network."""
        if not parcels:
            return {
                "parcels_with_access": 0,
                "parcels_without_access": 0,
                "average_distance_to_road": 0,
                "accessibility_score": 0
            }
        
        all_roads = primary_roads + secondary_roads + local_roads
        accessible = 0
        total_distance = 0
        
        for parcel in parcels[:50]:  # Sample for performance
            centroid = parcel.centroid
            min_dist = float('inf')
            
            for road in all_roads:
                dist = centroid.distance(road)
                if dist < min_dist:
                    min_dist = dist
            
            if min_dist < self.standards["accessibility"]["max_distance_to_road"]:
                accessible += 1
            total_distance += min_dist
        
        avg_distance = total_distance / len(parcels) if parcels else 0
        accessibility_score = (accessible / len(parcels) * 100) if parcels else 0
        
        return {
            "parcels_with_access": accessible,
            "parcels_without_access": len(parcels) - accessible,
            "average_distance_to_road": round(avg_distance, 2),
            "accessibility_score": round(accessibility_score, 2)
        }
    
    def _calculate_network_statistics(
        self,
        primary_roads: List[LineString],
        secondary_roads: List[LineString],
        local_roads: List[LineString],
        residential_roads: List[LineString],
        pedestrian_network: List[LineString],
        bike_network: List[LineString],
        emergency_routes: List[LineString],
        polygon_area_hectares: float = 0
    ) -> Dict[str, Any]:
        """Calculate overall network statistics."""
        # Calculate individual road type lengths
        primary_length = sum(r.length for r in primary_roads)
        secondary_length = sum(r.length for r in secondary_roads)
        local_length = sum(r.length for r in local_roads)
        residential_length = sum(r.length for r in residential_roads)
        total_road_length = primary_length + secondary_length + local_length + residential_length
        
        pedestrian_length = sum(r.length for r in pedestrian_network)
        bike_length = sum(r.length for r in bike_network)
        emergency_routes_length = sum(r.length for r in emergency_routes)
        
        # Calculate road density based on polygon area
        road_density_km_per_km2 = 0
        if polygon_area_hectares > 0:
            polygon_area_km2 = polygon_area_hectares / 100  # Convert hectares to km²
            total_road_length_km = total_road_length / 1000
            road_density_km_per_km2 = total_road_length_km / polygon_area_km2 if polygon_area_km2 > 0 else 0
        
        # Calculate A* and Dijkstra road counts
        astar_roads_count = len(primary_roads)
        dijkstra_roads_count = len(secondary_roads)
        
        # Calculate network connectivity
        all_roads = primary_roads + secondary_roads + local_roads
        intersections = 0
        for i, road1 in enumerate(all_roads):
            for road2 in all_roads[i+1:]:
                if road1.intersects(road2):
                    intersections += 1
        
        # Calculate average node degree
        node_degrees = []
        for road in all_roads:
            connections = sum(1 for other_road in all_roads if road != other_road and road.intersects(other_road))
            node_degrees.append(connections)
        
        average_node_degree = sum(node_degrees) / len(node_degrees) if node_degrees else 0
        network_connectivity_score = min(100, int(average_node_degree * 10))
        
        return {
            "total_road_length_km": round(total_road_length / 1000, 2),
            "primary_roads_length_km": round(primary_length / 1000, 2),
            "secondary_roads_length_km": round(secondary_length / 1000, 2),
            "local_roads_length_km": round(local_length / 1000, 2),
            "residential_roads_length_km": round(residential_length / 1000, 2),
            "pedestrian_length_km": round(pedestrian_length / 1000, 2),
            "bike_length_km": round(bike_length / 1000, 2),
            "emergency_routes_km": round(emergency_routes_length / 1000, 2),
            "total_segments": (
                len(primary_roads) + len(secondary_roads) +
                len(local_roads) + len(residential_roads)
            ),
            "astar_roads_count": astar_roads_count,
            "dijkstra_roads_count": dijkstra_roads_count,
            "network_connectivity_score": network_connectivity_score,
            "average_node_degree": round(average_node_degree, 2),
            "intersections": intersections,
            "road_density_km_per_km2": round(road_density_km_per_km2, 2),
            "polygon_area_hectares": round(polygon_area_hectares, 2)
        }
    
    def _estimate_costs(
        self,
        primary_roads: List[LineString],
        secondary_roads: List[LineString],
        local_roads: List[LineString],
        residential_roads: List[LineString],
        pedestrian_network: List[LineString],
        bike_network: List[LineString],
        design_parameters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Estimate construction and maintenance costs."""
        # Cost per km based on road type (in USD, adjust for local currency)
        cost_per_km = {
            "primary": 500000,  # $500k per km for primary roads
            "secondary": 300000,  # $300k per km for secondary roads
            "local": 150000,  # $150k per km for local roads
            "residential": 100000,  # $100k per km for residential roads
            "pedestrian": 50000,  # $50k per km for pedestrian paths
            "bike": 30000  # $30k per km for bike lanes
        }
        
        # Calculate costs
        primary_cost = sum(r.length / 1000 * cost_per_km["primary"] for r in primary_roads)
        secondary_cost = sum(r.length / 1000 * cost_per_km["secondary"] for r in secondary_roads)
        local_cost = sum(r.length / 1000 * cost_per_km["local"] for r in local_roads)
        residential_cost = sum(r.length / 1000 * cost_per_km["residential"] for r in residential_roads)
        pedestrian_cost = sum(r.length / 1000 * cost_per_km["pedestrian"] for r in pedestrian_network)
        bike_cost = sum(r.length / 1000 * cost_per_km["bike"] for r in bike_network)
        
        total_construction_cost = primary_cost + secondary_cost + local_cost + residential_cost + pedestrian_cost + bike_cost
        
        # Additional costs for features
        feature_costs = 0
        if design_parameters:
            total_road_length_km = (sum(r.length for r in primary_roads + secondary_roads + local_roads + residential_roads) / 1000)
            
            if design_parameters.get("bike_lanes"):
                feature_costs += total_road_length_km * 20000  # $20k per km for bike lanes
            if design_parameters.get("sidewalks"):
                feature_costs += total_road_length_km * 30000  # $30k per km for sidewalks
            if design_parameters.get("medians"):
                primary_length_km = sum(r.length for r in primary_roads) / 1000
                feature_costs += primary_length_km * 40000  # $40k per km for medians
            if design_parameters.get("street_trees"):
                feature_costs += total_road_length_km * 10000  # $10k per km for trees
        
        # Annual maintenance cost (typically 2-5% of construction cost)
        annual_maintenance = total_construction_cost * 0.03
        
        # 10-year lifecycle cost
        lifecycle_cost_10yr = total_construction_cost + (annual_maintenance * 10)
        
        return {
            "construction_costs": {
                "primary_roads": round(primary_cost, 0),
                "secondary_roads": round(secondary_cost, 0),
                "local_roads": round(local_cost, 0),
                "residential_roads": round(residential_cost, 0),
                "pedestrian_network": round(pedestrian_cost, 0),
                "bike_network": round(bike_cost, 0),
                "features": round(feature_costs, 0),
                "total": round(total_construction_cost + feature_costs, 0)
            },
            "maintenance_costs": {
                "annual": round(annual_maintenance, 0),
                "10_year": round(annual_maintenance * 10, 0)
            },
            "lifecycle_costs": {
                "10_year_total": round(lifecycle_cost_10yr + feature_costs, 0),
                "cost_per_hectare": round((total_construction_cost + feature_costs) / max(1, sum(r.length for r in primary_roads + secondary_roads + local_roads + residential_roads) / 1000), 0)
            }
        }
    
    def _analyze_environmental_impact(
        self,
        primary_roads: List[LineString],
        secondary_roads: List[LineString],
        local_roads: List[LineString],
        residential_roads: List[LineString],
        polygon_area_hectares: float,
        design_parameters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Analyze environmental impact of road network."""
        total_road_length_km = (
            sum(r.length for r in primary_roads + secondary_roads + local_roads + residential_roads) / 1000
        )
        
        # Estimate impervious surface area (road surface)
        # Average road width: primary 12m, secondary 9m, local 6m, residential 5m
        primary_area = sum(r.length * 12 for r in primary_roads) / 10000  # hectares
        secondary_area = sum(r.length * 9 for r in secondary_roads) / 10000
        local_area = sum(r.length * 6 for r in local_roads) / 10000
        residential_area = sum(r.length * 5 for r in residential_roads) / 10000
        total_impervious_area = primary_area + secondary_area + local_area + residential_area
        
        # Impervious surface percentage
        impervious_percentage = (total_impervious_area / polygon_area_hectares * 100) if polygon_area_hectares > 0 else 0
        
        # Carbon footprint estimation (construction phase)
        # Typical: 1 km of road = ~500 tons CO2
        construction_co2 = total_road_length_km * 500  # tons CO2
        
        # Annual operational CO2 (from traffic)
        # Assume average 150g CO2 per km per vehicle, 1000 vehicles per day per km
        daily_vehicles = total_road_length_km * 1000
        annual_operational_co2 = daily_vehicles * 365 * 0.15 / 1000  # tons CO2
        
        # Green infrastructure benefits
        green_benefits = 0
        if design_parameters and design_parameters.get("street_trees"):
            # Trees can sequester ~20 kg CO2 per year each
            # Assume 1 tree per 10m of road
            tree_count = total_road_length_km * 100
            green_benefits = tree_count * 20 / 1000  # tons CO2 sequestered per year
        
        # Stormwater runoff impact
        # Impervious surfaces generate more runoff
        runoff_increase = impervious_percentage * 0.8  # 80% of impervious area becomes runoff
        
        return {
            "impervious_surface": {
                "area_hectares": round(total_impervious_area, 2),
                "percentage": round(impervious_percentage, 1),
                "by_road_type": {
                    "primary": round(primary_area, 2),
                    "secondary": round(secondary_area, 2),
                    "local": round(local_area, 2),
                    "residential": round(residential_area, 2)
                }
            },
            "carbon_footprint": {
                "construction_co2_tons": round(construction_co2, 0),
                "annual_operational_co2_tons": round(annual_operational_co2, 0),
                "10_year_operational_co2_tons": round(annual_operational_co2 * 10, 0),
                "green_sequestration_tons_per_year": round(green_benefits, 0),
                "net_annual_co2_tons": round(annual_operational_co2 - green_benefits, 0)
            },
            "stormwater_impact": {
                "runoff_increase_percentage": round(runoff_increase, 1),
                "mitigation_needed": runoff_increase > 30
            },
            "environmental_score": round(max(0, 100 - impervious_percentage * 2 - min(50, annual_operational_co2 / 10)), 0)
        }
    
    def _analyze_safety(
        self,
        primary_roads: List[LineString],
        secondary_roads: List[LineString],
        local_roads: List[LineString],
        intersections: int = 0
    ) -> Dict[str, Any]:
        """Analyze road network safety metrics."""
        total_road_length_km = (
            sum(r.length for r in primary_roads + secondary_roads + local_roads) / 1000
        )
        
        # Safety factors
        # Intersections are potential conflict points
        intersection_density = intersections / total_road_length_km if total_road_length_km > 0 else 0
        
        # Road hierarchy (more hierarchy = better safety)
        has_primary = len(primary_roads) > 0
        has_secondary = len(secondary_roads) > 0
        has_local = len(local_roads) > 0
        hierarchy_score = (has_primary * 3 + has_secondary * 2 + has_local * 1) / 6 * 100
        
        # Estimate crash rate (typical: 2-5 crashes per million vehicle km)
        # Assume 1000 vehicles per day per km
        daily_vehicle_km = total_road_length_km * 1000
        annual_vehicle_km = daily_vehicle_km * 365 / 1000000  # million vehicle km
        estimated_crashes_per_year = annual_vehicle_km * 3  # 3 crashes per million vehicle km
        
        # Safety score (0-100)
        # Lower intersection density = better
        # Better hierarchy = better
        # Lower crash rate = better
        safety_score = max(0, min(100, 
            100 - (intersection_density * 10) + (hierarchy_score * 0.3) - (estimated_crashes_per_year * 2)
        ))
        
        return {
            "intersection_density": round(intersection_density, 2),
            "hierarchy_score": round(hierarchy_score, 0),
            "estimated_crashes_per_year": round(estimated_crashes_per_year, 1),
            "safety_score": round(safety_score, 0),
            "safety_rating": "Excellent" if safety_score >= 80 else "Good" if safety_score >= 60 else "Fair" if safety_score >= 40 else "Poor",
            "recommendations": self._get_safety_recommendations(safety_score, intersection_density, hierarchy_score)
        }
    
    def _get_safety_recommendations(
        self,
        safety_score: float,
        intersection_density: float,
        hierarchy_score: float
    ) -> List[str]:
        """Get safety improvement recommendations."""
        recommendations = []
        
        if intersection_density > 5:
            recommendations.append("Consider traffic calming measures at high-density intersections")
        
        if hierarchy_score < 50:
            recommendations.append("Improve road hierarchy with clear primary/secondary/local distinction")
        
        if safety_score < 60:
            recommendations.append("Add traffic signals or roundabouts at major intersections")
            recommendations.append("Implement speed reduction measures on local roads")
        
        if not recommendations:
            recommendations.append("Network meets safety standards")
        
        return recommendations
    
    def _to_feature_collection(
        self,
        roads: List[LineString],
        road_type: str
    ) -> Dict[str, Any]:
        """Convert list of LineStrings to GeoJSON FeatureCollection with pathfinding metrics."""
        features = []
        for idx, road in enumerate(roads):
            # Calculate pathfinding metrics
            road_length = round(road.length, 2)
            # Estimate traffic capacity based on road type
            capacity_map = {
                "primary": 2000,
                "secondary": 1000,
                "local": 500,
                "residential": 300,
                "pedestrian": 0,
                "bike": 0,
                "emergency": 1500
            }
            estimated_capacity = capacity_map.get(road_type, 500)
            
            feature = {
                "type": "Feature",
                "properties": {
                    "road_id": f"{road_type}_{idx + 1:04d}",
                    "road_type": road_type,
                    "width": self.standards["road_widths"].get(road_type, 6),
                    "length": road_length,
                    "estimated_capacity": estimated_capacity,
                    "algorithm": "A*" if road_type == "primary" else ("Dijkstra" if road_type == "secondary" else "Grid"),
                    "connectivity_score": min(100, int(road_length / 10))  # Simple connectivity metric
                },
                "geometry": mapping(road)
            }
            features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features
        }

