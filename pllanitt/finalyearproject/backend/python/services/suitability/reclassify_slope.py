import sys
import os
import json
import numpy as np
import rasterio
import logging

logger = logging.getLogger(__name__)

def reclassify_slope(slope_path, output_path):
    """
    Reclassify slope (degrees) to suitability scores (1-5).
    
    Scoring:
    - 0-5°: Score 5 (Very High)
    - 5-10°: Score 4 (High)
    - 10-20°: Score 3 (Moderate)
    - 20-30°: Score 2 (Low)
    - >30°: Score 1 (Very Low)
    """
    if not os.path.exists(slope_path):
        return {'error': f'Slope file not found: {slope_path}'}
    
    with rasterio.open(slope_path) as src:
        slope_data = src.read(1, masked=True)
        profile = src.profile.copy()
    
    # Reclassify slope to suitability scores (1-5)
    score = np.zeros_like(slope_data, dtype=np.uint8)
    
    # Very High suitability (0-5°)
    score[(slope_data >= 0) & (slope_data < 5)] = 5
    
    # High suitability (5-10°)
    score[(slope_data >= 5) & (slope_data < 10)] = 4
    
    # Moderate suitability (10-20°)
    score[(slope_data >= 10) & (slope_data < 20)] = 3
    
    # Low suitability (20-30°)
    score[(slope_data >= 20) & (slope_data < 30)] = 2
    
    # Very Low suitability (>30°)
    score[slope_data >= 30] = 1
    
    # Handle nodata
    if hasattr(slope_data, 'mask'):
        score = np.ma.masked_array(score, mask=slope_data.mask)
    
    # Write output
    profile.update(dtype=rasterio.uint8, count=1, nodata=0)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with rasterio.open(output_path, 'w', **profile) as dst:
        dst.write(score.filled(0), 1)
    
    logger.info(f"Slope reclassified: {output_path}")
    return {'output': output_path, 'status': 'success'}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: reclassify_slope.py <slope_path> <output_path>'}))
        sys.exit(1)
    
    slope_path = sys.argv[1]
    output_path = sys.argv[2]
    
    result = reclassify_slope(slope_path, output_path)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

