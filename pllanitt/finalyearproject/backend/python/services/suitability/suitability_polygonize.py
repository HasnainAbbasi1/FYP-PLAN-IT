import sys
import os
import json
import numpy as np
import rasterio
from rasterio.features import shapes
from shapely.geometry import shape, mapping
import logging

logger = logging.getLogger(__name__)

def polygonize_suitability(suitability_path, output_geojson_path, class_field='suitability_class'):
    """
    Convert suitability raster to GeoJSON polygons.
    
    Args:
        suitability_path: Path to suitability raster (classified)
        output_geojson_path: Path to output GeoJSON file
        class_field: Field name for suitability class in GeoJSON properties
    
    Returns:
        dict: GeoJSON FeatureCollection
    """
    if not os.path.exists(suitability_path):
        return {'error': f'Suitability raster not found: {suitability_path}'}
    
    features = []
    
    with rasterio.open(suitability_path) as src:
        # Read classified suitability raster
        data = src.read(1)
        transform = src.transform
        
        # Get unique classes
        unique_classes = np.unique(data[data > 0])  # Exclude nodata (0)
        
        # Create polygons for each class
        for class_value in unique_classes:
            # Create binary mask for this class
            mask = (data == class_value)
            
            # Generate shapes from mask
            for geom, value in shapes(mask.astype(np.uint8), mask=None, transform=transform):
                if value == 1:  # Only process the class pixels
                    # Convert to Shapely geometry
                    geom_shape = shape(geom)
                    
                    # Skip very small polygons
                    if geom_shape.area < 1e-6:
                        continue
                    
                    # Create feature
                    feature = {
                        "type": "Feature",
                        "geometry": mapping(geom_shape),
                        "properties": {
                            class_field: int(class_value),
                            "suitability_label": get_suitability_label(int(class_value)),
                            "area_sqm": geom_shape.area  # Approximate area
                        }
                    }
                    features.append(feature)
    
    # Create FeatureCollection
    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "total_zones": len(features),
            "classes": [int(c) for c in unique_classes],
            "source_raster": suitability_path
        }
    }
    
    # Write GeoJSON
    os.makedirs(os.path.dirname(output_geojson_path), exist_ok=True)
    with open(output_geojson_path, 'w') as f:
        json.dump(geojson, f, indent=2)
    
    logger.info(f"Polygonized suitability: {len(features)} zones created")
    return {
        'output': output_geojson_path,
        'zones_count': len(features),
        'classes': [int(c) for c in unique_classes],
        'status': 'success'
    }

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
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: suitability_polygonize.py <suitability_raster_path> <output_geojson_path> [class_field]'}))
        sys.exit(1)
    
    suitability_path = sys.argv[1]
    output_geojson_path = sys.argv[2]
    class_field = sys.argv[3] if len(sys.argv) > 3 else 'suitability_class'
    
    result = polygonize_suitability(suitability_path, output_geojson_path, class_field)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

