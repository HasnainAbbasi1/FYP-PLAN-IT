import numpy as np
import rasterio
from rasterio.transform import from_bounds
from scipy import ndimage
from scipy.ndimage import distance_transform_edt
import logging

logger = logging.getLogger(__name__)

class TerrainFeatureExtractor:
    """
    Extract comprehensive terrain features for ML zoning classification.
    """
    
    def __init__(self):
        self.feature_names = [
            'elevation', 'slope', 'aspect', 'curvature', 'tpi', 'twi',
            'distance_to_water', 'distance_to_roads', 'soil_quality',
            'flood_risk', 'erosion_risk', 'accessibility_score'
        ]
    
    def extract_features_from_dem(self, dem_array, transform, bounds):
        """
        Extract terrain features from DEM array.
        
        Args:
            dem_array (np.array): DEM elevation data
            transform: Rasterio transform object
            bounds: Bounding box (minx, miny, maxx, maxy)
            
        Returns:
            dict: Extracted terrain features
        """
        logger.info("Extracting terrain features from DEM...")
        
        # Basic terrain features
        elevation_stats = self._calculate_elevation_stats(dem_array)
        slope_data = self._calculate_slope(dem_array, transform)
        aspect_data = self._calculate_aspect(dem_array, transform)
        curvature_data = self._calculate_curvature(dem_array, transform)
        tpi_data = self._calculate_tpi(dem_array)
        twi_data = self._calculate_twi(dem_array, transform)
        
        # Risk assessments
        flood_risk = self._assess_flood_risk(dem_array, elevation_stats)
        erosion_risk = self._assess_erosion_risk(slope_data, dem_array)
        
        # Accessibility and infrastructure
        accessibility_score = self._calculate_accessibility_score(
            dem_array, slope_data, bounds
        )
        
        # Water and road distances (simplified for now)
        distance_to_water = self._estimate_distance_to_water(dem_array, bounds)
        distance_to_roads = self._estimate_distance_to_roads(dem_array, bounds)
        
        # Soil quality (simplified estimation)
        soil_quality = self._estimate_soil_quality(dem_array, slope_data)
        
        features = {
            'elevation': elevation_stats['mean'],
            'slope': slope_data['mean'],
            'aspect': aspect_data['mean'],
            'curvature': curvature_data['mean'],
            'tpi': tpi_data['mean'],
            'twi': twi_data['mean'],
            'distance_to_water': distance_to_water,
            'distance_to_roads': distance_to_roads,
            'soil_quality': soil_quality,
            'flood_risk': flood_risk,
            'erosion_risk': erosion_risk,
            'accessibility_score': accessibility_score
        }
        
        logger.info("Terrain features extracted successfully")
        return features
    
    def _calculate_elevation_stats(self, dem_array):
        """Calculate elevation statistics."""
        valid_data = dem_array[~np.isnan(dem_array)]
        if len(valid_data) == 0:
            return {'mean': 500, 'std': 100, 'min': 400, 'max': 600}
        
        return {
            'mean': float(np.mean(valid_data)),
            'std': float(np.std(valid_data)),
            'min': float(np.min(valid_data)),
            'max': float(np.max(valid_data))
        }
    
    def _calculate_slope(self, dem_array, transform):
        """Calculate slope in degrees."""
        # Get pixel size
        pixel_size_x = abs(transform[0])
        pixel_size_y = abs(transform[4])
        
        # Calculate gradients
        grad_x = np.gradient(dem_array, pixel_size_x, axis=1)
        grad_y = np.gradient(dem_array, pixel_size_y, axis=0)
        
        # Calculate slope in degrees
        slope_rad = np.arctan(np.sqrt(grad_x**2 + grad_y**2))
        slope_deg = np.degrees(slope_rad)
        
        valid_slope = slope_deg[~np.isnan(slope_deg)]
        if len(valid_slope) == 0:
            return {'mean': 10, 'std': 5, 'max': 20}
        
        return {
            'mean': float(np.mean(valid_slope)),
            'std': float(np.std(valid_slope)),
            'max': float(np.max(valid_slope))
        }
    
    def _calculate_aspect(self, dem_array, transform):
        """Calculate aspect in degrees."""
        # Get pixel size
        pixel_size_x = abs(transform[0])
        pixel_size_y = abs(transform[4])
        
        # Calculate gradients
        grad_x = np.gradient(dem_array, pixel_size_x, axis=1)
        grad_y = np.gradient(dem_array, pixel_size_y, axis=0)
        
        # Calculate aspect
        aspect_rad = np.arctan2(-grad_y, grad_x)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = (aspect_deg + 360) % 360  # Convert to 0-360
        
        valid_aspect = aspect_deg[~np.isnan(aspect_deg)]
        if len(valid_aspect) == 0:
            return {'mean': 180, 'std': 90}
        
        return {
            'mean': float(np.mean(valid_aspect)),
            'std': float(np.std(valid_aspect))
        }
    
    def _calculate_curvature(self, dem_array, transform):
        """Calculate terrain curvature."""
        # Get pixel size
        pixel_size = abs(transform[0])
        
        # Calculate second derivatives
        grad_x = np.gradient(dem_array, pixel_size, axis=1)
        grad_y = np.gradient(dem_array, pixel_size, axis=0)
        
        grad_xx = np.gradient(grad_x, pixel_size, axis=1)
        grad_yy = np.gradient(grad_y, pixel_size, axis=0)
        grad_xy = np.gradient(grad_x, pixel_size, axis=0)
        
        # Calculate curvature
        curvature = grad_xx + grad_yy
        
        valid_curvature = curvature[~np.isnan(curvature)]
        if len(valid_curvature) == 0:
            return {'mean': 0, 'std': 0.1}
        
        return {
            'mean': float(np.mean(valid_curvature)),
            'std': float(np.std(valid_curvature))
        }
    
    def _calculate_tpi(self, dem_array, radius=3):
        """Calculate Topographic Position Index."""
        # Create circular kernel
        y, x = np.ogrid[-radius:radius+1, -radius:radius+1]
        kernel = x*x + y*y <= radius*radius
        
        # Calculate mean elevation in neighborhood
        mean_elevation = ndimage.generic_filter(
            dem_array, np.mean, footprint=kernel, mode='constant', cval=np.nan
        )
        
        # Calculate TPI
        tpi = dem_array - mean_elevation
        
        valid_tpi = tpi[~np.isnan(tpi)]
        if len(valid_tpi) == 0:
            return {'mean': 0, 'std': 50}
        
        return {
            'mean': float(np.mean(valid_tpi)),
            'std': float(np.std(valid_tpi))
        }
    
    def _calculate_twi(self, dem_array, transform):
        """Calculate Topographic Wetness Index."""
        # Get pixel size
        pixel_size = abs(transform[0])
        
        # Calculate slope
        grad_x = np.gradient(dem_array, pixel_size, axis=1)
        grad_y = np.gradient(dem_array, pixel_size, axis=0)
        slope = np.sqrt(grad_x**2 + grad_y**2)
        
        # Calculate upslope contributing area (simplified)
        # This is a simplified version - in practice, you'd use flow accumulation
        contributing_area = np.ones_like(dem_array) * (pixel_size ** 2)
        
        # Calculate TWI
        twi = np.log(contributing_area / (slope + 0.001))  # Add small value to avoid division by zero
        
        valid_twi = twi[~np.isnan(twi)]
        if len(valid_twi) == 0:
            return {'mean': 5, 'std': 2}
        
        return {
            'mean': float(np.mean(valid_twi)),
            'std': float(np.std(valid_twi))
        }
    
    def _assess_flood_risk(self, dem_array, elevation_stats):
        """Assess flood risk based on elevation and terrain."""
        # Simple flood risk assessment
        mean_elevation = elevation_stats['mean']
        min_elevation = elevation_stats['min']
        elevation_range = elevation_stats['max'] - min_elevation
        
        # Areas with low elevation and small elevation range are at higher flood risk
        if mean_elevation < 100:
            base_risk = 0.8
        elif mean_elevation < 200:
            base_risk = 0.6
        elif mean_elevation < 500:
            base_risk = 0.3
        else:
            base_risk = 0.1
        
        # Adjust based on elevation range
        if elevation_range < 50:
            base_risk += 0.2  # Flat areas are more prone to flooding
        
        return min(1.0, max(0.0, base_risk))
    
    def _assess_erosion_risk(self, slope_data, dem_array):
        """Assess erosion risk based on slope and terrain."""
        mean_slope = slope_data['mean']
        max_slope = slope_data['max']
        
        # Higher slopes have higher erosion risk
        if max_slope > 45:
            base_risk = 0.9
        elif max_slope > 30:
            base_risk = 0.7
        elif mean_slope > 20:
            base_risk = 0.5
        elif mean_slope > 10:
            base_risk = 0.3
        else:
            base_risk = 0.1
        
        return base_risk
    
    def _calculate_accessibility_score(self, dem_array, slope_data, bounds):
        """Calculate accessibility score based on terrain and location."""
        mean_slope = slope_data['mean']
        elevation_stats = self._calculate_elevation_stats(dem_array)
        mean_elevation = elevation_stats['mean']
        
        # Accessibility decreases with slope and elevation
        slope_score = max(0, 1 - (mean_slope / 45))  # 0-1 scale
        elevation_score = max(0, 1 - (mean_elevation / 2000))  # 0-1 scale
        
        # Combine scores
        accessibility = (slope_score * 0.7 + elevation_score * 0.3)
        
        return min(1.0, max(0.0, accessibility))
    
    def _estimate_distance_to_water(self, dem_array, bounds):
        """Estimate distance to water bodies (simplified)."""
        # This is a simplified estimation
        # In practice, you'd use actual water body data
        twi_data = self._calculate_twi(dem_array, None)
        mean_twi = twi_data['mean']
        
        # Higher TWI suggests closer to water
        if mean_twi > 8:
            return 100  # Very close to water
        elif mean_twi > 6:
            return 500  # Close to water
        elif mean_twi > 4:
            return 1000  # Moderate distance
        else:
            return 2000  # Far from water
    
    def _estimate_distance_to_roads(self, dem_array, bounds):
        """Estimate distance to roads (simplified)."""
        # This is a simplified estimation
        # In practice, you'd use actual road network data
        elevation_stats = self._calculate_elevation_stats(dem_array)
        mean_elevation = elevation_stats['mean']
        
        # Roads are typically in valleys and lower elevations
        if mean_elevation < 200:
            return 200  # Close to roads
        elif mean_elevation < 500:
            return 500  # Moderate distance
        elif mean_elevation < 1000:
            return 1000  # Far from roads
        else:
            return 2000  # Very far from roads
    
    def _estimate_soil_quality(self, dem_array, slope_data):
        """Estimate soil quality based on terrain characteristics."""
        mean_slope = slope_data['mean']
        elevation_stats = self._calculate_elevation_stats(dem_array)
        mean_elevation = elevation_stats['mean']
        
        # Soil quality decreases with slope and extreme elevations
        slope_factor = max(0, 1 - (mean_slope / 30))
        elevation_factor = 1 - abs(mean_elevation - 500) / 1000  # Optimal around 500m
        elevation_factor = max(0, min(1, elevation_factor))
        
        soil_quality = (slope_factor * 0.6 + elevation_factor * 0.4)
        
        return min(1.0, max(0.0, soil_quality))
