import sys
import os
import json
import numpy as np
import rasterio
import logging

logger = logging.getLogger(__name__)

def calculate_suitability_stats(suitability_path, class_path=None):
    """
    Calculate comprehensive statistics for suitability analysis.
    
    Args:
        suitability_path: Path to suitability score raster (0-100)
        class_path: Path to classified suitability raster (1-5) - optional
    
    Returns:
        dict: Suitability statistics
    """
    if not os.path.exists(suitability_path):
        return {'error': f'Suitability raster not found: {suitability_path}'}
    
    stats = {}
    
    # Read suitability score raster
    with rasterio.open(suitability_path) as src:
        suitability_data = src.read(1, masked=True)
        profile = src.profile
    
    # Calculate basic statistics
    valid_data = suitability_data[~suitability_data.mask] if hasattr(suitability_data, 'mask') else suitability_data[~np.isnan(suitability_data)]
    valid_data = valid_data[valid_data >= 0]
    
    if len(valid_data) > 0:
        stats['suitability_score'] = {
            'mean': float(np.mean(valid_data)),
            'std': float(np.std(valid_data)),
            'min': float(np.min(valid_data)),
            'max': float(np.max(valid_data)),
            'median': float(np.median(valid_data)),
            'percentiles': {
                'p25': float(np.percentile(valid_data, 25)),
                'p50': float(np.percentile(valid_data, 50)),
                'p75': float(np.percentile(valid_data, 75))
            }
        }
        
        # Calculate area percentages by suitability ranges
        total_pixels = len(valid_data)
        
        very_high = np.sum((valid_data >= 80) & (valid_data <= 100))
        high = np.sum((valid_data >= 60) & (valid_data < 80))
        moderate = np.sum((valid_data >= 40) & (valid_data < 60))
        low = np.sum((valid_data >= 20) & (valid_data < 40))
        very_low = np.sum((valid_data >= 0) & (valid_data < 20))
        
        stats['suitability_distribution'] = {
            'very_high_80_100': {
                'pixels': int(very_high),
                'percentage': round((very_high / total_pixels) * 100, 2) if total_pixels > 0 else 0
            },
            'high_60_80': {
                'pixels': int(high),
                'percentage': round((high / total_pixels) * 100, 2) if total_pixels > 0 else 0
            },
            'moderate_40_60': {
                'pixels': int(moderate),
                'percentage': round((moderate / total_pixels) * 100, 2) if total_pixels > 0 else 0
            },
            'low_20_40': {
                'pixels': int(low),
                'percentage': round((low / total_pixels) * 100, 2) if total_pixels > 0 else 0
            },
            'very_low_0_20': {
                'pixels': int(very_low),
                'percentage': round((very_low / total_pixels) * 100, 2) if total_pixels > 0 else 0
            }
        }
    else:
        stats['suitability_score'] = {'error': 'No valid suitability data'}
    
    # If classified raster is provided, calculate class statistics
    if class_path and os.path.exists(class_path):
        with rasterio.open(class_path) as src:
            class_data = src.read(1, masked=True)
        
        valid_classes = class_data[~class_data.mask] if hasattr(class_data, 'mask') else class_data[class_data > 0]
        
        if len(valid_classes) > 0:
            unique_classes, class_counts = np.unique(valid_classes, return_counts=True)
            total_class_pixels = len(valid_classes)
            
            class_distribution = {}
            for class_val, count in zip(unique_classes, class_counts):
                class_distribution[f'class_{int(class_val)}'] = {
                    'pixels': int(count),
                    'percentage': round((count / total_class_pixels) * 100, 2) if total_class_pixels > 0 else 0,
                    'label': get_suitability_label(int(class_val))
                }
            
            stats['class_distribution'] = class_distribution
            stats['total_zones'] = len(unique_classes)
    
    # Add metadata
    stats['metadata'] = {
        'suitability_raster': suitability_path,
        'class_raster': class_path if class_path and os.path.exists(class_path) else None,
        'raster_dimensions': {
            'width': profile['width'],
            'height': profile['height']
        },
        'crs': str(profile['crs']) if profile.get('crs') else None
    }
    
    return stats

def get_suitability_label(class_value):
    """Get human-readable suitability label for class value."""
    labels = {
        1: "Very Low Suitability",
        2: "Low Suitability",
        3: "Moderate Suitability",
        4: "High Suitability",
        5: "Very High Suitability"
    }
    return labels.get(class_value, f"Class {class_value}")

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: suitability_stats.py <suitability_raster_path> [class_raster_path]'}))
        sys.exit(1)
    
    suitability_path = sys.argv[1]
    class_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = calculate_suitability_stats(suitability_path, class_path)
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()

