import sys
import os
import json
import numpy as np
import rasterio
import logging

logger = logging.getLogger(__name__)

def reclassify_elevation(elevation_path, output_path, optimal_min=200, optimal_max=800):
    """
    Reclassify elevation (meters) to suitability scores (1-5).
    
    Scoring: Optimal elevation range gets highest score.
    - Optimal range (200-800m): Score 5 (Very High)
    - Near optimal (100-200m, 800-1200m): Score 4 (High)
    - Moderate (50-100m, 1200-2000m): Score 3 (Moderate)
    - Low (0-50m, 2000-3000m): Score 2 (Low)
    - Very Low (<0m, >3000m): Score 1 (Very Low)
    """
    if not os.path.exists(elevation_path):
        return {'error': f'Elevation file not found: {elevation_path}'}
    
    with rasterio.open(elevation_path) as src:
        elevation_data = src.read(1, masked=True)
        profile = src.profile.copy()
    
    # Reclassify elevation to suitability scores (1-5)
    score = np.zeros_like(elevation_data, dtype=np.uint8)
    
    # Very Low suitability (<0m or >3000m)
    score[(elevation_data < 0) | (elevation_data > 3000)] = 1
    
    # Low suitability (0-50m, 2000-3000m)
    score[((elevation_data >= 0) & (elevation_data < 50)) | 
          ((elevation_data > 2000) & (elevation_data <= 3000))] = 2
    
    # Moderate suitability (50-100m, 1200-2000m)
    score[((elevation_data >= 50) & (elevation_data < 100)) | 
          ((elevation_data > 1200) & (elevation_data <= 2000))] = 3
    
    # High suitability (100-200m, 800-1200m)
    score[((elevation_data >= 100) & (elevation_data < 200)) | 
          ((elevation_data > 800) & (elevation_data <= 1200))] = 4
    
    # Very High suitability (200-800m) - Optimal range
    score[(elevation_data >= optimal_min) & (elevation_data <= optimal_max)] = 5
    
    # Handle nodata
    if hasattr(elevation_data, 'mask'):
        score = np.ma.masked_array(score, mask=elevation_data.mask)
    
    # Write output
    profile.update(dtype=rasterio.uint8, count=1, nodata=0)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with rasterio.open(output_path, 'w', **profile) as dst:
        dst.write(score.filled(0), 1)
    
    logger.info(f"Elevation reclassified: {output_path}")
    return {'output': output_path, 'status': 'success'}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: reclassify_elevation.py <elevation_path> <output_path> [optimal_min] [optimal_max]'}))
        sys.exit(1)
    
    elevation_path = sys.argv[1]
    output_path = sys.argv[2]
    optimal_min = float(sys.argv[3]) if len(sys.argv) > 3 else 200
    optimal_max = float(sys.argv[4]) if len(sys.argv) > 4 else 800
    
    result = reclassify_elevation(elevation_path, output_path, optimal_min, optimal_max)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

