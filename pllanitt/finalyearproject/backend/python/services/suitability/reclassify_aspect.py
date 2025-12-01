import sys
import os
import json
import numpy as np
import rasterio
import logging

logger = logging.getLogger(__name__)

def reclassify_aspect(aspect_path, output_path):
    """
    Reclassify aspect (0-360°) to suitability scores (1-5).
    
    Scoring: Prefers south-facing slopes (180°) for better sun exposure.
    - 135-225° (South): Score 5 (Very High)
    - 90-135°, 225-270° (Southeast/Southwest): Score 4 (High)
    - 45-90°, 270-315° (East/West): Score 3 (Moderate)
    - 0-45°, 315-360° (Northeast/Northwest): Score 2 (Low)
    - Flat areas (aspect = -1 or undefined): Score 3 (Moderate)
    """
    if not os.path.exists(aspect_path):
        return {'error': f'Aspect file not found: {aspect_path}'}
    
    with rasterio.open(aspect_path) as src:
        aspect_data = src.read(1, masked=True)
        profile = src.profile.copy()
    
    # Reclassify aspect to suitability scores (1-5)
    score = np.zeros_like(aspect_data, dtype=np.uint8)
    
    # Handle flat areas (aspect = -1 or undefined)
    flat_mask = (aspect_data < 0) | np.isnan(aspect_data)
    score[flat_mask] = 3  # Moderate for flat areas
    
    # South-facing (135-225°) - Very High
    south_mask = (aspect_data >= 135) & (aspect_data < 225)
    score[south_mask] = 5
    
    # Southeast/Southwest (90-135°, 225-270°) - High
    se_sw_mask = ((aspect_data >= 90) & (aspect_data < 135)) | ((aspect_data >= 225) & (aspect_data < 270))
    score[se_sw_mask] = 4
    
    # East/West (45-90°, 270-315°) - Moderate
    ew_mask = ((aspect_data >= 45) & (aspect_data < 90)) | ((aspect_data >= 270) & (aspect_data < 315))
    score[ew_mask] = 3
    
    # Northeast/Northwest (0-45°, 315-360°) - Low
    ne_nw_mask = ((aspect_data >= 0) & (aspect_data < 45)) | ((aspect_data >= 315) & (aspect_data < 360))
    score[ne_nw_mask] = 2
    
    # Handle nodata
    if hasattr(aspect_data, 'mask'):
        score = np.ma.masked_array(score, mask=aspect_data.mask)
    
    # Write output
    profile.update(dtype=rasterio.uint8, count=1, nodata=0)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with rasterio.open(output_path, 'w', **profile) as dst:
        dst.write(score.filled(0), 1)
    
    logger.info(f"Aspect reclassified: {output_path}")
    return {'output': output_path, 'status': 'success'}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: reclassify_aspect.py <aspect_path> <output_path>'}))
        sys.exit(1)
    
    aspect_path = sys.argv[1]
    output_path = sys.argv[2]
    
    result = reclassify_aspect(aspect_path, output_path)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

