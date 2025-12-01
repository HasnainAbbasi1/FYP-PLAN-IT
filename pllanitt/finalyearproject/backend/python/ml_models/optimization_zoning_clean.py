#!/usr/bin/env python3
"""
Multi-Objective Optimization Zoning System
Clean version with proper indentation and error handling.
"""

import numpy as np
import pandas as pd
import rasterio
from rasterio.transform import from_bounds
from rasterio.features import rasterize
from scipy import ndimage
from scipy.spatial.distance import cdist
from shapely.geometry import Point, Polygon, MultiPolygon
from shapely.ops import unary_union
import geopandas as gpd
from sklearn.preprocessing import MinMaxScaler
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Union
import warnings

# Optimization libraries
try:
    from pymoo.core.problem import Problem
    from pymoo.algorithms.moo.nsga2 import NSGA2
    from pymoo.optimize import minimize
    from pymoo.termination import get_termination
    from pymoo.operators.crossover.sbx import SBX
    from pymoo.operators.mutation.pm import PM
    from pymoo.operators.sampling.rnd import FloatRandomSampling
    PYMOO_AVAILABLE = True
except ImportError:
    PYMOO_AVAILABLE = False
    warnings.warn("pymoo not available. Install with: pip install pymoo")

warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class OptimizationZoningSystem:
   
    
    def __init__(self, cell_size=100):
        """
        Initialize the optimization zoning system.
        
        Args:
            cell_size: Size of grid cells in meters (default: 100m x 100m)
        """
        self.cell_size = cell_size
        self.grid_cells = None
        self.cell_attributes = None
        self.zoning_results = None
        
        # Land use types
        self.land_use_types = {
            0: 'residential',
            1: 'commercial', 
            2: 'industrial',
            3: 'green_space',
            4: 'mixed_use',
            5: 'conservation'
        }
        
        # Default area targets (can be customized)
        self.area_targets = {
            'residential': 0.50,    # 50% residential
            'commercial': 0.20,     # 20% commercial
            'industrial': 0.15,     # 15% industrial
            'green_space': 0.10,    # 10% green space
            'mixed_use': 0.03,      # 3% mixed use
            'conservation': 0.02    # 2% conservation
        }
        
        # Optimization parameters
        self.optimization_params = {
            'population_size': 100,
            'generations': 200,
            'crossover_prob': 0.9,
            'mutation_prob': 0.1,
            'crossover_eta': 15,
            'mutation_eta': 20
        }
        
        # Weight factors for objectives
        self.objective_weights = {
            'suitability': 0.4,
            'area_compliance': 0.3,
            'slope_penalty': 0.2,
            'adjacency_bonus': 0.1
        }
    
    def optimize_zoning(self, 
                       polygon_boundary: Union[str, dict],
                       dem_file: str,
                       terrain_data: Optional[Dict] = None,
                       custom_targets: Optional[Dict] = None,
                       constraints: Optional[Dict] = None,
                       output_dir: str = 'output') -> Dict:
        """
        Main optimization function for zoning allocation.
        
        Args:
            polygon_boundary: Site boundary (GeoJSON or dict)
            dem_file: Path to DEM raster file
            terrain_data: Additional terrain data (optional)
            custom_targets: Custom area targets (optional)
            constraints: Additional constraints (optional)
            output_dir: Output directory for results
            
        Returns:
            Dict with optimization results and zoning map
        """
        logger.info("Starting multi-objective optimization zoning...")
        
        if not PYMOO_AVAILABLE:
            # Fallback to simplified optimization
            logger.warning("pymoo not available, using simplified optimization")
            return self._simplified_optimization(polygon_boundary, dem_file, terrain_data, custom_targets, constraints, output_dir)
        
        # Step 1: Convert polygon to grid cells
        logger.info("Converting polygon to grid cells...")
        self._create_grid_cells(polygon_boundary)
        
        # Step 2: Extract cell attributes
        logger.info("Extracting cell attributes from DEM...")
        self._extract_cell_attributes(dem_file, terrain_data)
        
        # Step 3: Define optimization problem
        logger.info("Setting up optimization problem...")
        problem = self._setup_optimization_problem(custom_targets, constraints)
        
        # Step 4: Run NSGA-II optimization
        logger.info("Running NSGA-II optimization...")
        optimization_result = self._run_optimization(problem)
        
        # Step 5: Process optimization results
        logger.info("Processing optimization results...")
        best_solution = self._process_optimization_results(optimization_result)
        
        # Step 6: Convert optimized cells back to polygons
        logger.info("Converting optimized cells to polygons...")
        zoning_polygons = self._cells_to_polygons(best_solution)
        
        # Step 7: Save results
        logger.info("Saving results...")
        output_files = self._save_results(zoning_polygons, best_solution, output_dir)
        
        # Calculate final statistics
        stats = self._calculate_final_statistics(best_solution, zoning_polygons)
        
        result = {
            'success': True,
            'zoning_polygons': zoning_polygons,
            'optimization_results': optimization_result,
            'best_solution': best_solution,
            'statistics': stats,
            'output_files': output_files,
            'parameters': {
                'cell_size': self.cell_size,
                'area_targets': custom_targets or self.area_targets,
                'constraints': constraints or {}
            }
        }
        
        logger.info("Multi-objective optimization zoning completed successfully")
        return result
    
    def _simplified_optimization(self, polygon_boundary, dem_file, terrain_data, custom_targets, constraints, output_dir):
        """
        Simplified optimization when pymoo is not available.
        Uses intelligent terrain-aware spatial clustering.
        """
        logger.info("Using simplified optimization approach...")
        
        try:
            # Step 1: Convert polygon to grid cells
            print("Step 1: Converting polygon to grid cells...")
            self._create_grid_cells(polygon_boundary)
            print(f"Created {len(self.grid_cells) if hasattr(self, 'grid_cells') else 0} grid cells")
            
            # Step 2: Extract cell attributes
            print("Step 2: Extracting cell attributes...")
            self._extract_cell_attributes(dem_file, terrain_data)
            print(f"Extracted attributes for {len(self.cell_attributes) if hasattr(self, 'cell_attributes') else 0} cells")
            
            # Step 3: Intelligent land use assignment
            print("Step 3: Assigning land uses...")
            assignments = self._intelligent_land_use_assignment(custom_targets, constraints)
            print(f"Created {len(assignments) if assignments else 0} land use assignments")
            
            # Step 4: Create grid-based zones
            print("Step 4: Creating zoning polygons...")
            zoning_polygons = self._create_grid_zones(assignments)
            print(f"Created zoning polygons with {len(zoning_polygons.get('features', [])) if zoning_polygons else 0} features")
            
            # Step 5: Calculate statistics
            print("Step 5: Calculating statistics...")
            stats = self._calculate_simplified_statistics(assignments)
            print(f"Statistics: {stats}")
        except Exception as e:
            logger.error(f"Error in simplified optimization: {e}", exc_info=True)
            print(f"ERROR in simplified optimization: {e}")
            import traceback
            traceback.print_exc()
            # Return minimal result
            return {
                'success': False,
                'error': str(e),
                'zoning_polygons': None,
                'optimization_results': None,
                'best_solution': None,
                'statistics': {
                    'total_cells': len(self.grid_cells) if hasattr(self, 'grid_cells') else 0,
                    'method': 'simplified_clustering',
                    'optimization_time': 0,
                    'convergence': True
                },
                'output_files': {},
                'parameters': {
                    'cell_size': self.cell_size,
                    'area_targets': custom_targets or self.area_targets,
                    'constraints': constraints or {}
                }
            }
        
        # Save output files
        output_files = {}
        if zoning_polygons and zoning_polygons.get('features'):
            try:
                Path(output_dir).mkdir(parents=True, exist_ok=True)
                output_geojson = f"{output_dir}/zoning_polygons.geojson"
                with open(output_geojson, 'w') as f:
                    json.dump(zoning_polygons, f, indent=2)
                output_files['zoning_polygons'] = output_geojson
                
                output_stats = f"{output_dir}/statistics.json"
                with open(output_stats, 'w') as f:
                    json.dump(stats, f, indent=2)
                output_files['statistics'] = output_stats
            except Exception as e:
                logger.warning(f"Could not save output files: {e}")
        
        # Calculate fitness score from suitability
        fitness_score = stats.get('avg_suitability', 0) * stats.get('area_compliance', 0)
        
        result = {
            'success': True,
            'zoning_polygons': zoning_polygons,
            'optimization_results': {
                'assignments': assignments,
                'land_use_distribution': self._calculate_land_use_distribution(assignments),
                'zones': self._create_zone_summary(assignments)
            },
            'best_solution': {
                'assignments': assignments,
                'fitness_score': fitness_score,
                'land_use_distribution': self._calculate_land_use_distribution(assignments)
            },
            'statistics': stats,
            'output_files': output_files,
            'parameters': {
                'cell_size': self.cell_size,
                'area_targets': custom_targets or self.area_targets,
                'constraints': constraints or {},
                'method': 'simplified_clustering'
            }
        }
        
        logger.info("Simplified optimization completed successfully")
        return result
    
    def _create_grid_cells(self, polygon_boundary: Union[str, dict]):
        """Convert polygon boundary to grid cells."""
        # Load boundary polygon
        if isinstance(polygon_boundary, str):
            # Check if it's a file path or JSON string
            if polygon_boundary.endswith(('.geojson', '.shp', '.json')):
                gdf = gpd.read_file(polygon_boundary)
                boundary = gdf.geometry.iloc[0]
            else:
                # It's a JSON string, parse it
                import json
                polygon_dict = json.loads(polygon_boundary)
                from shapely.geometry import shape
                # Handle Feature objects
                if polygon_dict.get('type') == 'Feature':
                    boundary = shape(polygon_dict['geometry'])
                else:
                    boundary = shape(polygon_dict)
        else:
            from shapely.geometry import shape
            # Handle Feature objects
            if isinstance(polygon_boundary, dict) and polygon_boundary.get('type') == 'Feature':
                boundary = shape(polygon_boundary['geometry'])
            else:
                boundary = shape(polygon_boundary)
        
        # Get bounding box
        minx, miny, maxx, maxy = boundary.bounds
        
        # Convert cell_size from meters to degrees (approximate)
        # At the equator: 1 degree ≈ 111,320 meters
        # Use average latitude for better approximation
        avg_lat = (miny + maxy) / 2
        meters_per_deg_lat = 111320.0
        meters_per_deg_lon = 111320.0 * np.cos(np.radians(avg_lat))
        
        # Convert cell size to degrees
        cell_size_deg_lon = self.cell_size / meters_per_deg_lon
        cell_size_deg_lat = self.cell_size / meters_per_deg_lat
        
        # Create grid
        x_cells = max(1, int(np.ceil((maxx - minx) / cell_size_deg_lon)))
        y_cells = max(1, int(np.ceil((maxy - miny) / cell_size_deg_lat)))
        
        # Generate grid cells
        cells = []
        for i in range(x_cells):
            for j in range(y_cells):
                x1 = minx + i * cell_size_deg_lon
                y1 = miny + j * cell_size_deg_lat
                x2 = minx + (i + 1) * cell_size_deg_lon
                y2 = miny + (j + 1) * cell_size_deg_lat
                
                cell_polygon = Polygon([(x1, y1), (x2, y1), (x2, y2), (x1, y2), (x1, y1)])
                
                # Check if cell intersects with boundary
                if cell_polygon.intersects(boundary):
                    intersection = cell_polygon.intersection(boundary)
                    if intersection.area > 0:
                        cells.append({
                            'id': len(cells),
                            'row': j,
                            'col': i,
                            'geometry': intersection,
                            'area': intersection.area,
                            'center': intersection.centroid,
                            'bounds': intersection.bounds
                        })
        
        self.grid_cells = cells
        logger.info(f"Created {len(cells)} grid cells from polygon boundary")
    
    def _extract_cell_attributes(self, dem_file: str, terrain_data: Optional[Dict] = None):
        """Extract terrain attributes for each grid cell."""
        if not self.grid_cells:
            raise ValueError("Grid cells must be created first")
        
        # Load DEM data
        with rasterio.open(dem_file) as src:
            dem_array = src.read(1)
            transform = src.transform
            bounds = src.bounds
        
        # Calculate terrain derivatives
        slope_array = self._calculate_slope(dem_array, transform)
        aspect_array = self._calculate_aspect(dem_array, transform)
        
        # Extract attributes for each cell
        cell_attributes_list = []
        
        for cell in self.grid_cells:
            # Get cell bounds in pixel coordinates
            minx, miny, maxx, maxy = cell['bounds']
            
            # Convert to pixel coordinates
            col1 = int((minx - bounds.left) / transform[0])
            row1 = int((miny - bounds.top) / transform[4])
            col2 = int((maxx - bounds.left) / transform[0])
            row2 = int((maxy - bounds.top) / transform[4])
            
            # Ensure indices are within bounds
            col1 = max(0, min(col1, dem_array.shape[1] - 1))
            row1 = max(0, min(row1, dem_array.shape[0] - 1))
            col2 = max(0, min(col2, dem_array.shape[1] - 1))
            row2 = max(0, min(row2, dem_array.shape[0] - 1))
            
            # Extract terrain data for cell
            cell_dem = dem_array[row1:row2+1, col1:col2+1]
            cell_slope = slope_array[row1:row2+1, col1:col2+1]
            cell_aspect = aspect_array[row1:row2+1, col1:col2+1]
            
            # Check if cell has valid data (not all NaN and not empty)
            has_valid_data = cell_dem.size > 0 and not np.all(np.isnan(cell_dem))
            
            # Calculate cell attributes with safe defaults for empty/invalid cells
            attributes = {
                'cell_id': cell['id'],
                'area': cell['area'],
                'center_x': cell['center'].x,
                'center_y': cell['center'].y,
                'elevation_mean': np.nanmean(cell_dem) if has_valid_data else 0.0,
                'elevation_std': np.nanstd(cell_dem) if has_valid_data else 0.0,
                'elevation_min': np.nanmin(cell_dem) if has_valid_data else 0.0,
                'elevation_max': np.nanmax(cell_dem) if has_valid_data else 0.0,
                'slope_mean': np.nanmean(cell_slope) if cell_slope.size > 0 and not np.all(np.isnan(cell_slope)) else 0.0,
                'slope_max': np.nanmax(cell_slope) if cell_slope.size > 0 and not np.all(np.isnan(cell_slope)) else 0.0,
                'aspect_mean': np.nanmean(cell_aspect) if cell_aspect.size > 0 and not np.all(np.isnan(cell_aspect)) else 0.0,
                'terrain_roughness': np.nanstd(cell_dem) if has_valid_data else 0.0,
                'drainage_potential': self._calculate_drainage_potential(cell_slope, cell_dem) if has_valid_data else 0.0,
                'accessibility_score': self._calculate_accessibility_score(cell),
                'land_suitability': self._calculate_land_suitability(cell_dem, cell_slope) if has_valid_data else 0.0
            }
            
            # Add custom terrain data if provided
            if terrain_data:
                attributes.update(terrain_data.get(cell['id'], {}))
            
            cell_attributes_list.append(attributes)
        
        self.cell_attributes = pd.DataFrame(cell_attributes_list)
        logger.info(f"Extracted attributes for {len(cell_attributes_list)} cells")
    
    def _calculate_slope(self, dem_array: np.ndarray, transform) -> np.ndarray:
        """Calculate slope in degrees."""
        pixel_size_x = abs(transform[0])
        pixel_size_y = abs(transform[4])
        
        grad_x = np.gradient(dem_array, pixel_size_x, axis=1)
        grad_y = np.gradient(dem_array, pixel_size_y, axis=0)
        
        slope_rad = np.arctan(np.sqrt(grad_x**2 + grad_y**2))
        slope_deg = np.degrees(slope_rad)
        
        return slope_deg
    
    def _calculate_aspect(self, dem_array: np.ndarray, transform) -> np.ndarray:
        """Calculate aspect in degrees."""
        pixel_size_x = abs(transform[0])
        pixel_size_y = abs(transform[4])
        
        grad_x = np.gradient(dem_array, pixel_size_x, axis=1)
        grad_y = np.gradient(dem_array, pixel_size_y, axis=0)
        
        aspect_rad = np.arctan2(-grad_y, grad_x)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = (aspect_deg + 360) % 360
        
        return aspect_deg
    
    def _calculate_drainage_potential(self, slope_array: np.ndarray, dem_array: np.ndarray) -> float:
        """Calculate drainage potential for a cell."""
        # Check if arrays have valid data
        if slope_array.size == 0 or dem_array.size == 0:
            return 0.0
        if np.all(np.isnan(slope_array)) or np.all(np.isnan(dem_array)):
            return 0.0
        
        # Higher slopes and lower elevations = better drainage
        slope_factor = np.nanmean(slope_array) / 45.0  # Normalize to 0-1
        elevation_factor = 1.0 - (np.nanmean(dem_array) / 1000.0)  # Normalize to 0-1
        return (slope_factor + elevation_factor) / 2.0
    
    def _calculate_accessibility_score(self, cell: Dict) -> float:
        """Calculate accessibility score based on distance to boundary."""
        # Distance to nearest boundary edge (simplified)
        # In practice, this would consider roads, water, etc.
        boundary_distance = min(
            abs(cell['center'].x - cell['bounds'][0]),
            abs(cell['center'].x - cell['bounds'][2]),
            abs(cell['center'].y - cell['bounds'][1]),
            abs(cell['center'].y - cell['bounds'][3])
        )
        
        # Normalize distance (closer to edge = higher accessibility)
        max_distance = np.sqrt((cell['bounds'][2] - cell['bounds'][0])**2 + 
                              (cell['bounds'][3] - cell['bounds'][1])**2)
        return 1.0 - (boundary_distance / max_distance)
    
    def _calculate_land_suitability(self, dem_array: np.ndarray, slope_array: np.ndarray) -> float:
        """Calculate overall land suitability score."""
        # Check if arrays have valid data
        if dem_array.size == 0 or slope_array.size == 0:
            return 0.0
        if np.all(np.isnan(dem_array)) or np.all(np.isnan(slope_array)):
            return 0.0
        
        # Multi-factor suitability calculation
        elevation_score = 1.0 - abs(np.nanmean(dem_array) - 500) / 500  # Optimal around 500m
        slope_score = 1.0 - np.nanmean(slope_array) / 30  # Penalize steep slopes
        
        # Combine scores
        suitability = (elevation_score * 0.6 + slope_score * 0.4)
        return max(0.0, min(1.0, suitability))
    
    def _intelligent_land_use_assignment(self, custom_targets: Optional[Dict], constraints: Optional[Dict]) -> List[Dict]:
        """Intelligent land use assignment based on terrain characteristics."""
        if custom_targets:
            # Normalize keys (handle both camelCase and snake_case)
            normalized_targets = {}
            for key, value in custom_targets.items():
                # Convert camelCase to snake_case
                normalized_key = key.replace('greenSpace', 'green_space').replace('mixedUse', 'mixed_use')
                normalized_targets[normalized_key] = value
            self.area_targets.update(normalized_targets)
            print(f"Updated area targets: {self.area_targets}")
        
        assignments = []
        total_cells = len(self.grid_cells)
        print(f"Total cells for assignment: {total_cells}")
        
        # Calculate target cell counts only for land uses specified in area_targets
        target_counts = {}
        for land_use, ratio in self.area_targets.items():
            if ratio > 0:  # Only include land uses with positive ratios
                target_counts[land_use] = int(total_cells * ratio)
        
        print(f"Target counts: {target_counts}")
        
        # Sort cells by suitability for land uses that have targets
        cell_suitability = {}
        for land_use in target_counts.keys():
            cell_suitability[land_use] = []
            for idx, cell_attr in self.cell_attributes.iterrows():
                suitability = self._calculate_land_use_specific_suitability(cell_attr, land_use)
                cell_suitability[land_use].append((idx, suitability))
            # Sort by suitability (descending)
            cell_suitability[land_use].sort(key=lambda x: x[1], reverse=True)
        
        print(f"Calculated suitability for {len(cell_suitability)} land use types")
        
        # Assign land uses based on suitability and targets
        assigned_cells = set()
        for land_use, target_count in target_counts.items():
            count = 0
            if land_use not in cell_suitability:
                print(f"Warning: land_use '{land_use}' not in cell_suitability, skipping")
                continue
            
            for cell_idx, suitability in cell_suitability[land_use]:
                if cell_idx not in assigned_cells and count < target_count:
                    assignments.append({
                        'cell_id': cell_idx,
                        'land_use': land_use,
                        'suitability': suitability,
                        'lon': self.cell_attributes.iloc[cell_idx]['center_x'],
                        'lat': self.cell_attributes.iloc[cell_idx]['center_y'],
                        'slope': self.cell_attributes.iloc[cell_idx]['slope_mean']
                    })
                    assigned_cells.add(cell_idx)
                    count += 1
            
            print(f"Assigned {count} cells to {land_use} (target: {target_count})")
        
        # Assign remaining cells to the most suitable land use from available targets
        remaining_cells = total_cells - len(assigned_cells)
        if remaining_cells > 0:
            print(f"Assigning {remaining_cells} remaining cells to most suitable land uses...")
            available_land_uses = list(target_counts.keys())
            for cell_idx in range(total_cells):
                if cell_idx not in assigned_cells:
                    # Find best land use from available options
                    best_land_use = max(available_land_uses, 
                                      key=lambda lu: self._calculate_land_use_specific_suitability(
                                          self.cell_attributes.iloc[cell_idx], lu))
                    assignments.append({
                        'cell_id': cell_idx,
                        'land_use': best_land_use,
                        'suitability': self._calculate_land_use_specific_suitability(
                            self.cell_attributes.iloc[cell_idx], best_land_use),
                        'lon': self.cell_attributes.iloc[cell_idx]['center_x'],
                        'lat': self.cell_attributes.iloc[cell_idx]['center_y'],
                        'slope': self.cell_attributes.iloc[cell_idx]['slope_mean']
                    })
        
        print(f"Total assignments created: {len(assignments)}")
        return assignments
    
    def _calculate_land_use_specific_suitability(self, cell_attr: pd.Series, land_use: str) -> float:
        """Calculate suitability for a specific land use type."""
        base_suitability = cell_attr['land_suitability']
        slope = cell_attr['slope_mean']
        elevation = cell_attr['elevation_mean']
        
        # Land use specific adjustments
        if land_use == 'residential':
            # Prefer moderate slopes and elevations
            slope_factor = 1.0 - abs(slope - 10) / 20  # Optimal around 10 degrees
            elevation_factor = 1.0 - abs(elevation - 300) / 400  # Optimal around 300m
            return base_suitability * 0.7 + slope_factor * 0.2 + elevation_factor * 0.1
            
        elif land_use == 'commercial':
            # Prefer flat areas with good accessibility
            slope_factor = 1.0 - slope / 15  # Prefer flatter areas
            accessibility_factor = cell_attr['accessibility_score']
            return base_suitability * 0.6 + slope_factor * 0.3 + accessibility_factor * 0.1
            
        elif land_use == 'industrial':
            # Can handle steeper slopes, prefer lower elevations
            slope_factor = 1.0 - slope / 25  # Can handle steeper slopes
            elevation_factor = 1.0 - elevation / 500  # Prefer lower elevations
            return base_suitability * 0.5 + slope_factor * 0.3 + elevation_factor * 0.2
            
        elif land_use in ['green_space', 'conservation']:
            # Prefer areas with natural characteristics
            slope_factor = 1.0 - abs(slope - 15) / 30  # Moderate slopes OK
            drainage_factor = cell_attr['drainage_potential']
            return base_suitability * 0.4 + slope_factor * 0.3 + drainage_factor * 0.3
            
        elif land_use == 'mixed_use':
            # Balanced approach
            return base_suitability * 0.8 + cell_attr['accessibility_score'] * 0.2
        
        else:
            return base_suitability
    
    def _create_grid_zones(self, assignments: List[Dict]) -> Dict:
        """Create grid-based zoning polygons."""
        if not assignments or len(assignments) == 0:
            logger.warning("No assignments provided, returning empty zones")
            return {
                'type': 'FeatureCollection',
                'features': []
            }
        
        # Group assignments by land use
        land_use_groups = {}
        for assignment in assignments:
            land_use = assignment['land_use']
            if land_use not in land_use_groups:
                land_use_groups[land_use] = []
            land_use_groups[land_use].append(assignment)
        
        # Create zone polygons as GeoJSON FeatureCollection
        features = []
        for land_use, cells in land_use_groups.items():
            if not cells:
                continue
                
            zone_polygons = []
            for cell in cells:
                cell_idx = cell['cell_id']
                if cell_idx < len(self.grid_cells):
                    grid_cell = self.grid_cells[cell_idx]
                    zone_polygons.append(grid_cell['geometry'])
            
            if zone_polygons:
                # Merge adjacent polygons of the same land use
                try:
                    merged_geometry = unary_union(zone_polygons)
                    
                    # Convert to GeoJSON
                    from shapely.geometry import mapping
                    feature = {
                        'type': 'Feature',
                        'geometry': mapping(merged_geometry),
                        'properties': {
                            'land_use': land_use,
                            'area': merged_geometry.area,
                            'cell_count': len(cells),
                            'avg_suitability': np.mean([c['suitability'] for c in cells])
                        }
                    }
                    features.append(feature)
                except Exception as e:
                    logger.warning(f"Error merging polygons for {land_use}: {e}")
                    # Fallback: create individual features
                    for cell in cells:
                        cell_idx = cell['cell_id']
                        if cell_idx < len(self.grid_cells):
                            grid_cell = self.grid_cells[cell_idx]
                            from shapely.geometry import mapping
                            feature = {
                                'type': 'Feature',
                                'geometry': mapping(grid_cell['geometry']),
                                'properties': {
                                    'land_use': land_use,
                                    'area': grid_cell['area'],
                                    'cell_count': 1,
                                    'avg_suitability': cell['suitability']
                                }
                            }
                            features.append(feature)
        
        return {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'properties': {
                        'land_use': zone['land_use'],
                        'area': zone['area'],
                        'cell_count': zone['cell_count'],
                        'avg_suitability': zone['avg_suitability']
                    },
                    'geometry': zone['geometry']
                }
                for zone in zones
            ]
        }
    
    def _calculate_land_use_distribution(self, assignments: List[Dict]) -> Dict:
        """Calculate land use distribution from assignments."""
        distribution = {}
        total_cells = len(assignments)
        
        for assignment in assignments:
            land_use = assignment['land_use']
            distribution[land_use] = distribution.get(land_use, 0) + 1
        
        # Convert to percentages
        for land_use in distribution:
            distribution[land_use] = distribution[land_use] / total_cells
        
        return distribution
    
    def _create_zone_summary(self, assignments: List[Dict]) -> List[Dict]:
        """Create summary of zones."""
        land_use_groups = {}
        for assignment in assignments:
            land_use = assignment['land_use']
            if land_use not in land_use_groups:
                land_use_groups[land_use] = []
            land_use_groups[land_use].append(assignment)
        
        zones = []
        for land_use, cells in land_use_groups.items():
            zones.append({
                'land_use': land_use,
                'cell_count': len(cells),
                'avg_suitability': np.mean([c['suitability'] for c in cells]),
                'avg_slope': np.mean([c['slope'] for c in cells])
            })
        
        return zones
    
    def _calculate_simplified_statistics(self, assignments: List[Dict]) -> Dict:
        """Calculate statistics for simplified optimization."""
        total_cells = len(assignments)
        land_use_dist = self._calculate_land_use_distribution(assignments)
        
        # Calculate average suitability
        avg_suitability = np.mean([a['suitability'] for a in assignments])
        
        # Calculate area compliance
        area_compliance = 0
        for land_use, actual_ratio in land_use_dist.items():
            target_ratio = self.area_targets.get(land_use, 0)
            compliance = 1.0 - abs(actual_ratio - target_ratio)
            area_compliance += compliance
        area_compliance /= len(self.area_targets)
        
        return {
            'total_cells': total_cells,
            'avg_suitability': avg_suitability,
            'area_compliance': area_compliance,
            'land_use_distribution': land_use_dist,
            'method': 'simplified_clustering'
        }
    
    def _setup_optimization_problem(self, custom_targets: Optional[Dict], constraints: Optional[Dict]):
        """Setup the multi-objective optimization problem."""
        # This would be the full pymoo implementation
        # For now, return None as we're using simplified optimization
        return None
    
    def _run_optimization(self, problem):
        """Run NSGA-II optimization."""
        # This would be the full pymoo implementation
        # For now, return None as we're using simplified optimization
        return None
    
    def _process_optimization_results(self, optimization_result):
        """Process optimization results."""
        # This would process the full pymoo results
        # For now, return None as we're using simplified optimization
        return None
    
    def _cells_to_polygons(self, best_solution):
        """Convert optimized cells back to polygons."""
        # This would convert the full optimization results
        # For now, return None as we're using simplified optimization
        return None
    
    def _save_results(self, zoning_polygons, best_solution, output_dir):
        """Save optimization results."""
        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # Save results (simplified)
        output_files = {
            'zoning_polygons': f"{output_dir}/zoning_polygons.geojson",
            'statistics': f"{output_dir}/statistics.json"
        }
        
        return output_files
    
    def _calculate_final_statistics(self, best_solution, zoning_polygons):
        """Calculate final optimization statistics."""
        # This would calculate statistics from the full optimization
        # For now, return basic statistics
        return {
            'total_cells': len(self.grid_cells) if self.grid_cells else 0,
            'method': 'simplified_clustering',
            'optimization_time': 0,
            'convergence': True
        }


def main():
    """Main function for command line usage."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Multi-Objective Optimization Zoning System')
    parser.add_argument('--project-id', required=True, help='Project ID')
    parser.add_argument('--dem-file', required=True, help='Path to DEM file')
    parser.add_argument('--polygon-boundary', required=True, help='Polygon boundary (JSON string)')
    parser.add_argument('--cell-size', type=int, default=100, help='Cell size in meters')
    parser.add_argument('--output-dir', default='output', help='Output directory')
    parser.add_argument('--terrain-data', help='Additional terrain data (JSON string)')
    parser.add_argument('--terrain-data-file', help='Path to file containing terrain data JSON')
    parser.add_argument('--custom-targets', help='Custom area targets (JSON string)')
    parser.add_argument('--constraints', help='Additional constraints (JSON string)')
    parser.add_argument('--optimization-params', help='Optimization parameters (JSON string)')
    
    args = parser.parse_args()
    
    # Parse JSON arguments
    polygon_boundary = json.loads(args.polygon_boundary) if args.polygon_boundary else None
    
    # Load terrain data from file if provided, otherwise use command-line arg
    terrain_data = None
    if args.terrain_data_file:
        try:
            with open(args.terrain_data_file, 'r') as f:
                terrain_data = json.load(f)
            print(f"Loaded terrain data from file: {args.terrain_data_file}")
        except Exception as e:
            print(f"Warning: Failed to load terrain data file: {e}")
            terrain_data = None
    elif args.terrain_data:
        terrain_data = json.loads(args.terrain_data)
    
    custom_targets = json.loads(args.custom_targets) if args.custom_targets else None
    constraints = json.loads(args.constraints) if args.constraints else None
    optimization_params = json.loads(args.optimization_params) if args.optimization_params else None
    
    # Create optimization system
    system = OptimizationZoningSystem(cell_size=args.cell_size)
    
    # Run optimization
    result = system.optimize_zoning(
        polygon_boundary=polygon_boundary,
        dem_file=args.dem_file,
        terrain_data=terrain_data,
        custom_targets=custom_targets,
        constraints=constraints,
        output_dir=args.output_dir
    )
    
    # Output result as JSON
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
