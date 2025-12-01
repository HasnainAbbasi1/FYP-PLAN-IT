import sys
import os
import json
import numpy as np
import rasterio
import logging

logger = logging.getLogger(__name__)

def generate_constraints(project_dir, output_path, slope_threshold=30, flood_elevation=2.0, flow_threshold=5000):
    """
    Generate binary constraint mask for land suitability analysis.
    
    Constraints exclude:
    - Flood-prone areas (elevation <= flood_elevation)
    - Steep slopes (slope > slope_threshold)
    - High flow accumulation areas (flow > flow_threshold)
    
    Returns:
    - Binary mask: 1 = suitable, 0 = constrained (excluded)
    """
    # File paths
    dem_path = os.path.join(project_dir, 'dem.tif')
    slope_path = os.path.join(project_dir, 'slope.tif')
    flow_path = os.path.join(project_dir, 'flow_accumulation.tif')
    
    # Check which files exist
    available_files = []
    if os.path.exists(dem_path):
        available_files.append('dem')
    if os.path.exists(slope_path):
        available_files.append('slope')
    if os.path.exists(flow_path):
        available_files.append('flow')
    
    if not available_files:
        return {'error': 'No constraint data files found in project directory'}
    
    # Start with all areas suitable (1)
    constraint_mask = None
    profile = None
    
    # Load DEM for flood risk constraint
    if 'dem' in available_files:
        with rasterio.open(dem_path) as src:
            dem_data = src.read(1, masked=True)
            profile = src.profile.copy()
            # Flood risk: exclude areas with elevation <= flood_elevation
            flood_constraint = (dem_data > flood_elevation).astype(np.uint8)
            constraint_mask = flood_constraint
    
    # Load slope for steep slope constraint
    if 'slope' in available_files:
        with rasterio.open(slope_path) as src:
            slope_data = src.read(1, masked=True)
            if profile is None:
                profile = src.profile.copy()
            # Steep slope constraint: exclude areas with slope > threshold
            slope_constraint = (slope_data <= slope_threshold).astype(np.uint8)
            
            if constraint_mask is None:
                constraint_mask = slope_constraint
            else:
                # Combine constraints (both must be satisfied)
                constraint_mask = constraint_mask * slope_constraint
    
    # Load flow accumulation for high flow constraint
    if 'flow' in available_files:
        with rasterio.open(flow_path) as src:
            flow_data = src.read(1, masked=True)
            if profile is None:
                profile = src.profile.copy()
            # High flow constraint: exclude areas with flow > threshold
            flow_constraint = (flow_data <= flow_threshold).astype(np.uint8)
            
            if constraint_mask is None:
                constraint_mask = flow_constraint
            else:
                # Combine constraints (all must be satisfied)
                constraint_mask = constraint_mask * flow_constraint
    
    # If no constraints were loaded, create a mask of all 1s (all areas suitable)
    if constraint_mask is None:
        # Try to get dimensions from any available file
        for file_path in [dem_path, slope_path, flow_path]:
            if os.path.exists(file_path):
                with rasterio.open(file_path) as src:
                    profile = src.profile.copy()
                    constraint_mask = np.ones((src.height, src.width), dtype=np.uint8)
                    break
    
    if constraint_mask is None:
        return {'error': 'Could not determine raster dimensions for constraint mask'}
    
    # Handle nodata
    if hasattr(constraint_mask, 'mask'):
        constraint_mask = constraint_mask.filled(0)
    
    # Write output
    profile.update(dtype=rasterio.uint8, count=1, nodata=255)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with rasterio.open(output_path, 'w', **profile) as dst:
        dst.write(constraint_mask, 1)
    
    # Calculate statistics
    suitable_pixels = np.sum(constraint_mask == 1)
    constrained_pixels = np.sum(constraint_mask == 0)
    total_pixels = constraint_mask.size
    
    stats = {
        'suitable_pixels': int(suitable_pixels),
        'constrained_pixels': int(constrained_pixels),
        'total_pixels': int(total_pixels),
        'suitable_percentage': round((suitable_pixels / total_pixels) * 100, 2) if total_pixels > 0 else 0,
        'constrained_percentage': round((constrained_pixels / total_pixels) * 100, 2) if total_pixels > 0 else 0,
        'constraints_applied': available_files
    }
    
    logger.info(f"Constraint mask generated: {output_path}")
    logger.info(f"Constraints applied: {available_files}")
    logger.info(f"Suitable area: {stats['suitable_percentage']:.2f}%")
    
    return {
        'output': output_path,
        'status': 'success',
        'stats': stats
    }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: generate_constraints.py <project_dir> <output_path> [slope_threshold] [flood_elevation] [flow_threshold]'}))
        sys.exit(1)
    
    project_dir = sys.argv[1]
    output_path = sys.argv[2]
    slope_threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 30
    flood_elevation = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
    flow_threshold = float(sys.argv[5]) if len(sys.argv) > 5 else 5000
    
    result = generate_constraints(project_dir, output_path, slope_threshold, flood_elevation, flow_threshold)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

