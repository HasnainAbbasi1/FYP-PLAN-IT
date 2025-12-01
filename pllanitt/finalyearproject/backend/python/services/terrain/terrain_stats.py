import sys
import os
import json
import numpy as np
import rasterio
import logging
import math

logger = logging.getLogger(__name__)

def safe_float(value):
    """
    Convert value to JSON-safe float (replace NaN, inf, -inf with None or 0).
    
    Args:
        value: Numeric value to convert
    
    Returns:
        float or None: JSON-safe float value
    """
    if value is None:
        return None
    try:
        fval = float(value)
        if math.isnan(fval) or math.isinf(fval):
            return None
        return fval
    except (ValueError, TypeError):
        return None

def compute_terrain_stats(dem_path, slope_path=None, aspect_path=None, flow_acc_path=None):
    """
    Compute comprehensive terrain statistics from DEM and derived rasters.
    
    Args:
        dem_path: Path to DEM raster
        slope_path: Path to slope raster (optional)
        aspect_path: Path to aspect raster (optional)
        flow_acc_path: Path to flow accumulation raster (optional)
    
    Returns:
        dict: Terrain statistics including elevation, slope, aspect, and flow data
    """
    stats = {}
    
    # Load DEM
    if not os.path.exists(dem_path):
        return {'error': f'DEM file not found: {dem_path}'}
    
    with rasterio.open(dem_path) as src:
        dem_data = src.read(1, masked=True)
        dem_profile = src.profile
    
    # Convert MaskedArray to regular array with NaN for masked values to avoid warnings
    if hasattr(dem_data, 'mask'):
        dem_array = np.where(dem_data.mask, np.nan, dem_data.data)
    else:
        dem_array = dem_data
    
    # Calculate elevation statistics
    valid_elevation = dem_array[~np.isnan(dem_array)]
    
    if len(valid_elevation) > 0:
        stats['elevation'] = {
            'mean': safe_float(np.mean(valid_elevation)),
            'std': safe_float(np.std(valid_elevation)),
            'min': safe_float(np.min(valid_elevation)),
            'max': safe_float(np.max(valid_elevation)),
            'range': safe_float(np.max(valid_elevation) - np.min(valid_elevation)),
            'median': safe_float(np.median(valid_elevation)),
            'percentiles': {
                'p25': safe_float(np.percentile(valid_elevation, 25)),
                'p50': safe_float(np.percentile(valid_elevation, 50)),
                'p75': safe_float(np.percentile(valid_elevation, 75))
            }
        }
    else:
        stats['elevation'] = {'error': 'No valid elevation data'}
    
    # Load and calculate slope statistics
    if slope_path and os.path.exists(slope_path):
        with rasterio.open(slope_path) as src:
            slope_data = src.read(1, masked=True)
        
        # Convert MaskedArray to regular array with NaN for masked values
        if hasattr(slope_data, 'mask'):
            slope_array = np.where(slope_data.mask, np.nan, slope_data.data)
        else:
            slope_array = slope_data
        
        valid_slope = slope_array[~np.isnan(slope_array)]
        
        if len(valid_slope) > 0:
            stats['slope'] = {
                'mean': safe_float(np.mean(valid_slope)),
                'std': safe_float(np.std(valid_slope)),
                'min': safe_float(np.min(valid_slope)),
                'max': safe_float(np.max(valid_slope)),
                'median': safe_float(np.median(valid_slope)),
                'percentiles': {
                    'p25': safe_float(np.percentile(valid_slope, 25)),
                    'p50': safe_float(np.percentile(valid_slope, 50)),
                    'p75': safe_float(np.percentile(valid_slope, 75))
                }
            }
            
            # Slope categories (USGS classification)
            flat = np.sum((valid_slope >= 0) & (valid_slope < 3))
            gentle = np.sum((valid_slope >= 3) & (valid_slope < 8))
            moderate = np.sum((valid_slope >= 8) & (valid_slope < 15))
            steep = np.sum((valid_slope >= 15) & (valid_slope < 25))
            very_steep = np.sum(valid_slope >= 25)
            
            total = len(valid_slope)
            stats['slope']['categories'] = {
                'nearly_level_0_3': {
                    'count': int(flat),
                    'percentage': round((flat / total) * 100, 2) if total > 0 else 0
                },
                'gently_sloping_3_8': {
                    'count': int(gentle),
                    'percentage': round((gentle / total) * 100, 2) if total > 0 else 0
                },
                'moderately_sloping_8_15': {
                    'count': int(moderate),
                    'percentage': round((moderate / total) * 100, 2) if total > 0 else 0
                },
                'strongly_sloping_15_25': {
                    'count': int(steep),
                    'percentage': round((steep / total) * 100, 2) if total > 0 else 0
                },
                'steep_25_plus': {
                    'count': int(very_steep),
                    'percentage': round((very_steep / total) * 100, 2) if total > 0 else 0
                }
            }
    else:
        stats['slope'] = {'error': 'Slope file not provided or not found'}
    
    # Load and calculate aspect statistics
    if aspect_path and os.path.exists(aspect_path):
        with rasterio.open(aspect_path) as src:
            aspect_data = src.read(1, masked=True)
        
        # Convert MaskedArray to regular array with NaN for masked values
        if hasattr(aspect_data, 'mask'):
            aspect_array = np.where(aspect_data.mask, np.nan, aspect_data.data)
        else:
            aspect_array = aspect_data
        
        valid_aspect = aspect_array[~np.isnan(aspect_array)]
        
        if len(valid_aspect) > 0:
            stats['aspect'] = {
                'mean': safe_float(np.mean(valid_aspect)),
                'std': safe_float(np.std(valid_aspect)),
                'min': safe_float(np.min(valid_aspect)),
                'max': safe_float(np.max(valid_aspect)),
                'median': safe_float(np.median(valid_aspect))
            }
            
            # Aspect directions
            north = np.sum((valid_aspect >= 0) & (valid_aspect < 45)) + np.sum((valid_aspect >= 315) & (valid_aspect < 360))
            east = np.sum((valid_aspect >= 45) & (valid_aspect < 135))
            south = np.sum((valid_aspect >= 135) & (valid_aspect < 225))
            west = np.sum((valid_aspect >= 225) & (valid_aspect < 315))
            
            total = len(valid_aspect)
            stats['aspect']['directions'] = {
                'north': {
                    'count': int(north),
                    'percentage': round((north / total) * 100, 2) if total > 0 else 0
                },
                'east': {
                    'count': int(east),
                    'percentage': round((east / total) * 100, 2) if total > 0 else 0
                },
                'south': {
                    'count': int(south),
                    'percentage': round((south / total) * 100, 2) if total > 0 else 0
                },
                'west': {
                    'count': int(west),
                    'percentage': round((west / total) * 100, 2) if total > 0 else 0
                }
            }
    else:
        stats['aspect'] = {'error': 'Aspect file not provided or not found'}
    
    # Load and calculate flow accumulation statistics
    if flow_acc_path and os.path.exists(flow_acc_path):
        with rasterio.open(flow_acc_path) as src:
            flow_data = src.read(1, masked=True)
        
        # Convert MaskedArray to regular array with NaN for masked values
        if hasattr(flow_data, 'mask'):
            flow_array = np.where(flow_data.mask, np.nan, flow_data.data)
        else:
            flow_array = flow_data
        
        valid_flow = flow_array[~np.isnan(flow_array)]
        
        if len(valid_flow) > 0:
            stats['flow_accumulation'] = {
                'mean': safe_float(np.mean(valid_flow)),
                'std': safe_float(np.std(valid_flow)),
                'min': safe_float(np.min(valid_flow)),
                'max': safe_float(np.max(valid_flow)),
                'median': safe_float(np.median(valid_flow)),
                'percentiles': {
                    'p25': safe_float(np.percentile(valid_flow, 25)),
                    'p50': safe_float(np.percentile(valid_flow, 50)),
                    'p75': safe_float(np.percentile(valid_flow, 75))
                }
            }
            
            # Flood risk from flow accumulation
            high_flow = np.sum(valid_flow > 5000)
            moderate_flow = np.sum((valid_flow > 2000) & (valid_flow <= 5000))
            low_flow = np.sum(valid_flow <= 2000)
            
            total = len(valid_flow)
            stats['flow_accumulation']['flood_risk'] = {
                'high_risk': {
                    'count': int(high_flow),
                    'percentage': round((high_flow / total) * 100, 2) if total > 0 else 0
                },
                'moderate_risk': {
                    'count': int(moderate_flow),
                    'percentage': round((moderate_flow / total) * 100, 2) if total > 0 else 0
                },
                'low_risk': {
                    'count': int(low_flow),
                    'percentage': round((low_flow / total) * 100, 2) if total > 0 else 0
                }
            }
    else:
        stats['flow_accumulation'] = {'error': 'Flow accumulation file not provided or not found'}
    
    # Add metadata
    stats['metadata'] = {
        'dem_path': dem_path,
        'slope_path': slope_path if slope_path and os.path.exists(slope_path) else None,
        'aspect_path': aspect_path if aspect_path and os.path.exists(aspect_path) else None,
        'flow_acc_path': flow_acc_path if flow_acc_path and os.path.exists(flow_acc_path) else None,
        'raster_dimensions': {
            'width': dem_profile['width'],
            'height': dem_profile['height']
        },
        'crs': str(dem_profile['crs']) if dem_profile.get('crs') else None
    }
    
    return stats

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: terrain_stats.py <dem_path> [slope_path] [aspect_path] [flow_acc_path]'}))
        sys.exit(1)
    
    dem_path = sys.argv[1]
    slope_path = sys.argv[2] if len(sys.argv) > 2 else None
    aspect_path = sys.argv[3] if len(sys.argv) > 3 else None
    flow_acc_path = sys.argv[4] if len(sys.argv) > 4 else None
    
    result = compute_terrain_stats(dem_path, slope_path, aspect_path, flow_acc_path)
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()

