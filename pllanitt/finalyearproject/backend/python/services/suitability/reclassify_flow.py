import sys
import os
import json
import numpy as np
import rasterio
import logging

logger = logging.getLogger(__name__)

def reclassify_flow(flow_path, output_path):
    """
    Reclassify flow accumulation to suitability scores (1-5).
    
    Scoring: Lower flow accumulation = higher suitability (less flood risk).
    - Very Low flow (<100): Score 5 (Very High)
    - Low flow (100-500): Score 4 (High)
    - Moderate flow (500-2000): Score 3 (Moderate)
    - High flow (2000-5000): Score 2 (Low)
    - Very High flow (>5000): Score 1 (Very Low)
    """
    if not os.path.exists(flow_path):
        return {'error': f'Flow accumulation file not found: {flow_path}'}
    
    with rasterio.open(flow_path) as src:
        flow_data = src.read(1, masked=True)
        profile = src.profile.copy()
    
    # Reclassify flow accumulation to suitability scores (1-5)
    score = np.zeros_like(flow_data, dtype=np.uint8)
    
    # Very High suitability (Very Low flow <100)
    score[flow_data < 100] = 5
    
    # High suitability (Low flow 100-500)
    score[(flow_data >= 100) & (flow_data < 500)] = 4
    
    # Moderate suitability (Moderate flow 500-2000)
    score[(flow_data >= 500) & (flow_data < 2000)] = 3
    
    # Low suitability (High flow 2000-5000)
    score[(flow_data >= 2000) & (flow_data < 5000)] = 2
    
    # Very Low suitability (Very High flow >=5000)
    score[flow_data >= 5000] = 1
    
    # Handle nodata
    if hasattr(flow_data, 'mask'):
        score = np.ma.masked_array(score, mask=flow_data.mask)
    
    # Write output
    profile.update(dtype=rasterio.uint8, count=1, nodata=0)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with rasterio.open(output_path, 'w', **profile) as dst:
        dst.write(score.filled(0), 1)
    
    logger.info(f"Flow accumulation reclassified: {output_path}")
    return {'output': output_path, 'status': 'success'}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: reclassify_flow.py <flow_path> <output_path>'}))
        sys.exit(1)
    
    flow_path = sys.argv[1]
    output_path = sys.argv[2]
    
    result = reclassify_flow(flow_path, output_path)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

