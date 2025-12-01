import sys
import os
import json
import numpy as np
import rasterio
from rasterio.transform import from_bounds
import logging

logger = logging.getLogger(__name__)

def weighted_overlay(project_dir, output_path, weights=None, config=None):
    """
    Perform weighted overlay analysis for land suitability.
    
    Formula:
    Score = (slope_score * w_slope) + (aspect_score * w_aspect) + 
            (elevation_score * w_elev) + (flow_score * w_flow)
    Score = Score * constraint_mask
    Score = normalized to 0-100
    """
    if weights is None:
        weights = {
            'slope': 0.40,
            'aspect': 0.15,
            'elevation': 0.25,
            'flow': 0.15,
            'constraints': 1.0
        }
    
    if config is None:
        config = {
            'normalize': True,
            'apply_constraints': True
        }
    
    # Load reclassified layers
    slope_score_path = os.path.join(project_dir, 'slope_score.tif')
    aspect_score_path = os.path.join(project_dir, 'aspect_score.tif')
    elevation_score_path = os.path.join(project_dir, 'elevation_score.tif')
    flow_score_path = os.path.join(project_dir, 'flow_score.tif')
    constraint_path = os.path.join(project_dir, 'constraints.tif')
    
    # Check required files
    required_files = [slope_score_path, aspect_score_path, elevation_score_path, flow_score_path]
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        return {'error': f'Missing required files: {missing_files}'}
    
    # Load all layers
    with rasterio.open(slope_score_path) as src:
        slope_score = src.read(1, masked=True).astype(np.float32)
        profile = src.profile
    
    with rasterio.open(aspect_score_path) as src:
        aspect_score = src.read(1, masked=True).astype(np.float32)
    
    with rasterio.open(elevation_score_path) as src:
        elevation_score = src.read(1, masked=True).astype(np.float32)
    
    with rasterio.open(flow_score_path) as src:
        flow_score = src.read(1, masked=True).astype(np.float32)
    
    # Load constraints if exists
    constraint_mask = None
    if os.path.exists(constraint_path) and config.get('apply_constraints', True):
        with rasterio.open(constraint_path) as src:
            constraint_mask = src.read(1).astype(np.float32)
            constraint_mask[constraint_mask == 255] = 1  # Handle nodata
    
    # Perform weighted overlay
    suitability = (
        slope_score * weights['slope'] +
        aspect_score * weights['aspect'] +
        elevation_score * weights['elevation'] +
        flow_score * weights['flow']
    )
    
    # Apply constraints
    if constraint_mask is not None:
        suitability = suitability * constraint_mask
    
    # Normalize to 0-100 if requested
    if config.get('normalize', True):
        # Current scores are 1-5, weighted sum max = 5
        # Normalize to 0-100
        suitability = (suitability / 5.0) * 100
        suitability = np.clip(suitability, 0, 100)
    
    # Handle masked values
    if hasattr(slope_score, 'mask'):
        suitability = np.ma.masked_array(suitability, mask=slope_score.mask)
    
    # Write suitability raster
    profile.update(dtype=rasterio.float32, count=1, nodata=-9999)
    with rasterio.open(output_path, 'w', **profile) as dst:
        dst.write(suitability.filled(-9999), 1)
    
    # Generate classified suitability (5 classes)
    class_output_path = output_path.replace('.tif', '_class.tif')
    classified = np.zeros_like(suitability, dtype=np.uint8)
    
    classified[suitability >= 80] = 5  # Very high suitability
    classified[(suitability >= 60) & (suitability < 80)] = 4  # High
    classified[(suitability >= 40) & (suitability < 60)] = 3  # Moderate
    classified[(suitability >= 20) & (suitability < 40)] = 2  # Low
    classified[(suitability >= 0) & (suitability < 20)] = 1   # Very low
    
    if hasattr(suitability, 'mask'):
        classified = np.ma.masked_array(classified, mask=suitability.mask)
    
    profile.update(dtype=rasterio.uint8, count=1, nodata=0)
    with rasterio.open(class_output_path, 'w', **profile) as dst:
        dst.write(classified.filled(0), 1)
    
    # Calculate statistics
    valid_data = suitability[~suitability.mask] if hasattr(suitability, 'mask') else suitability
    valid_data = valid_data[valid_data >= 0]
    
    class_counts = {}
    for i in range(1, 6):
        count = np.sum(classified == i)
        class_counts[f'class_{i}'] = int(count)
        class_counts[f'class_{i}_percent'] = round((count / classified.size) * 100, 2) if classified.size > 0 else 0
    
    stats = {
        'min': float(np.min(valid_data)) if valid_data.size > 0 else 0,
        'max': float(np.max(valid_data)) if valid_data.size > 0 else 0,
        'mean': float(np.mean(valid_data)) if valid_data.size > 0 else 0,
        'std': float(np.std(valid_data)) if valid_data.size > 0 else 0,
        'class_distribution': class_counts,
        'weights_used': weights
    }
    
    return {
        'output': output_path,
        'class_output': class_output_path,
        'stats': stats
    }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: weighted_overlay.py <project_dir> <output_path> [weights_json] [config_json]'}))
        sys.exit(1)
    
    project_dir = sys.argv[1]
    output_path = sys.argv[2]
    weights = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    config = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
    
    result = weighted_overlay(project_dir, output_path, weights, config)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

