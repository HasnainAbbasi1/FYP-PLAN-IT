import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import joblib
from pathlib import Path
import json
from typing import Dict, List, Tuple, Any
import logging

logger = logging.getLogger(__name__)

class IntelligentZoningModel:
    """
    Intelligent Zoning Model that uses real DEM data and terrain analysis
    to divide polygons into residential, commercial, and green zones.
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.zone_colors = {
            'residential': '#FFE4B5',  # Light orange
            'commercial': '#FFD700',   # Gold
            'green': '#32CD32',        # Lime green
            'industrial': '#FFA500',   # Orange
            'mixed_use': '#DDA0DD',    # Plum
            'conservation': '#228B22'  # Forest green
        }
        
    def extract_terrain_features(self, terrain_data: Dict) -> Dict[str, float]:
        """Extract terrain features from DEM analysis data"""
        features = {}
        
        # Elevation features
        stats = terrain_data.get('stats', {})
        features['mean_elevation'] = stats.get('mean_elevation', 0)
        features['max_elevation'] = stats.get('max_elevation', 0)
        features['min_elevation'] = stats.get('min_elevation', 0)
        features['elevation_range'] = features['max_elevation'] - features['min_elevation']
        
        # Slope features
        slope_analysis = terrain_data.get('slope_analysis', {})
        features['mean_slope'] = slope_analysis.get('mean_slope', 0)
        features['max_slope'] = slope_analysis.get('max_slope', 0)
        features['slope_std'] = slope_analysis.get('std_slope', 0)
        
        # Slope categories
        category_stats = slope_analysis.get('category_stats', {})
        features['flat_percentage'] = category_stats.get('1', {}).get('area_percentage', 0)
        features['moderate_percentage'] = category_stats.get('2', {}).get('area_percentage', 0)
        features['steep_percentage'] = category_stats.get('3', {}).get('area_percentage', 0)
        features['very_steep_percentage'] = category_stats.get('4', {}).get('area_percentage', 0)
        
        # Flood and erosion risk
        flood_analysis = terrain_data.get('flood_analysis', {})
        features['flood_risk_high'] = flood_analysis.get('high_risk_percentage', 0)
        features['flood_risk_medium'] = flood_analysis.get('medium_risk_percentage', 0)
        features['flood_risk_low'] = flood_analysis.get('low_risk_percentage', 0)
        
        erosion_analysis = terrain_data.get('erosion_analysis', {})
        features['erosion_risk'] = erosion_analysis.get('mean_soil_loss', 0)
        
        # Zoning analysis
        zoning_analysis = terrain_data.get('zoning_analysis', {})
        features['suitable_for_development'] = zoning_analysis.get('suitable_for_development_percentage', 0)
        features['limited_development'] = zoning_analysis.get('limited_development_percentage', 0)
        features['conservation_area'] = zoning_analysis.get('conservation_area_percentage', 0)
        
        return features
    
    def create_training_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Create synthetic training data based on realistic zoning patterns"""
        np.random.seed(42)
        n_samples = 1000
        
        # Generate realistic terrain scenarios
        data = []
        labels = []
        
        for _ in range(n_samples):
            # Generate terrain features
            mean_elevation = np.random.uniform(50, 2000)
            elevation_range = np.random.uniform(10, 500)
            mean_slope = np.random.uniform(0, 45)
            flat_percentage = np.random.uniform(0, 100)
            flood_risk = np.random.uniform(0, 50)
            erosion_risk = np.random.uniform(0, 100)
            
            # Create feature vector
            features = [
                mean_elevation,
                elevation_range,
                mean_slope,
                flat_percentage,
                flood_risk,
                erosion_risk,
                np.random.uniform(0, 100),  # suitable_for_development
                np.random.uniform(0, 100),  # limited_development
                np.random.uniform(0, 100)   # conservation_area
            ]
            
            # Determine zone based on terrain characteristics
            if mean_slope < 10 and flat_percentage > 60 and flood_risk < 20:
                # Good for commercial/residential
                if mean_elevation < 500:
                    zone = 0  # Commercial (low elevation, flat)
                else:
                    zone = 1  # Residential (higher elevation, flat)
            elif mean_slope < 20 and erosion_risk < 30:
                # Mixed use
                zone = 2  # Mixed use
            elif mean_slope > 30 or flood_risk > 40 or erosion_risk > 50:
                # Conservation
                zone = 3  # Conservation
            else:
                # Green space
                zone = 4  # Green space
            
            data.append(features)
            labels.append(zone)
        
        return np.array(data), np.array(labels)
    
    def train_model(self):
        """Train the zoning classification model"""
        logger.info("Training intelligent zoning model...")
        
        # Create training data
        X, y = self.create_training_data()
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Random Forest model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )
        
        self.model.fit(X_scaled, y)
        
        # Save model
        model_path = Path(__file__).parent / "intelligent_zoning_model.pkl"
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler
        }, model_path)
        
        logger.info(f"Model trained and saved to {model_path}")
        return True
    
    def load_model(self, model_path: str = None):
        """Load pre-trained model"""
        if model_path is None:
            model_path = Path(__file__).parent / "intelligent_zoning_model.pkl"
        
        if Path(model_path).exists():
            data = joblib.load(model_path)
            self.model = data['model']
            self.scaler = data['scaler']
            logger.info("Intelligent zoning model loaded successfully")
            return True
        else:
            logger.warning("No pre-trained model found, training new model...")
            return self.train_model()
    
    def predict_zoning(self, terrain_data: Dict, polygon_coords: List) -> Dict:
        """Predict optimal zoning for a polygon based on terrain data"""
        try:
            # Load model if not already loaded
            if self.model is None:
                self.load_model()
            
            # Extract features
            features = self.extract_terrain_features(terrain_data)
            
            # Convert to array and scale
            feature_array = np.array([
                features['mean_elevation'],
                features['elevation_range'],
                features['mean_slope'],
                features['flat_percentage'],
                features['flood_risk_high'],
                features['erosion_risk'],
                features['suitable_for_development'],
                features['limited_development'],
                features['conservation_area']
            ]).reshape(1, -1)
            
            feature_array_scaled = self.scaler.transform(feature_array)
            
            # Predict
            prediction = self.model.predict(feature_array_scaled)[0]
            probabilities = self.model.predict_proba(feature_array_scaled)[0]
            
            # Map prediction to zone type
            zone_mapping = {
                0: 'commercial',
                1: 'residential', 
                2: 'mixed_use',
                3: 'conservation',
                4: 'green'
            }
            
            primary_zone = zone_mapping.get(prediction, 'mixed_use')
            
            # Get confidence
            confidence = probabilities[prediction]
            
            # Get all probabilities
            zone_probabilities = {}
            for i, zone in zone_mapping.items():
                zone_probabilities[zone] = float(probabilities[i])
            
            return {
                'primary_zone': primary_zone,
                'confidence': float(confidence),
                'zone_probabilities': zone_probabilities,
                'terrain_features': features,
                'recommendation': self._generate_recommendation(primary_zone, features)
            }
            
        except Exception as e:
            logger.error(f"Error in zoning prediction: {e}")
            return {
                'primary_zone': 'mixed_use',
                'confidence': 0.5,
                'zone_probabilities': {'mixed_use': 1.0},
                'terrain_features': {},
                'recommendation': 'Unable to analyze terrain data'
            }
    
    def _generate_recommendation(self, zone: str, features: Dict) -> str:
        """Generate zoning recommendation based on terrain analysis"""
        recommendations = {
            'commercial': [
                f"Flat terrain ({features.get('mean_slope', 0):.1f}° slope) ideal for commercial development",
                f"Low flood risk ({features.get('flood_risk_high', 0):.1f}%) suitable for business activities",
                "Consider mixed-use development with ground-floor retail"
            ],
            'residential': [
                f"Moderate slopes ({features.get('mean_slope', 0):.1f}°) good for residential development",
                f"Elevation range {features.get('elevation_range', 0):.0f}m provides good views",
                "Plan for community amenities and green spaces"
            ],
            'green': [
                f"Steep terrain ({features.get('mean_slope', 0):.1f}°) best preserved as green space",
                f"High conservation value ({features.get('conservation_area', 0):.1f}%)",
                "Implement nature trails and recreational facilities"
            ],
            'conservation': [
                f"High erosion risk ({features.get('erosion_risk', 0):.1f}) requires protection",
                f"Steep slopes ({features.get('mean_slope', 0):.1f}°) unsuitable for development",
                "Focus on environmental restoration and protection"
            ],
            'mixed_use': [
                f"Balanced terrain characteristics allow flexible development",
                f"Moderate slopes ({features.get('mean_slope', 0):.1f}°) support various uses",
                "Plan for phased development with different zone types"
            ]
        }
        
        return recommendations.get(zone, ["Terrain analysis complete"])[0]
    
    def create_2d_zoning_visualization(self, polygon_coords: List, zoning_result: Dict, 
                                     width: int = 800, height: int = 600) -> str:
        """Create 2D visualization of zoning for the polygon"""
        try:
            # Extract coordinates
            if len(polygon_coords) < 3:
                raise ValueError("Invalid polygon coordinates")
            
            # Convert to numpy array
            coords = np.array(polygon_coords)
            
            # Calculate bounding box
            min_x, min_y = coords.min(axis=0)
            max_x, max_y = coords.max(axis=0)
            
            # Normalize coordinates to fit in visualization
            coords_normalized = coords.copy()
            coords_normalized[:, 0] = (coords[:, 0] - min_x) / (max_x - min_x) * width
            coords_normalized[:, 1] = (coords[:, 1] - min_y) / (max_y - min_y) * height
            
            # Create figure
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
            
            # Plot 1: Original polygon
            ax1.set_xlim(0, width)
            ax1.set_ylim(0, height)
            ax1.set_aspect('equal')
            
            # Draw polygon
            polygon_patch = patches.Polygon(coords_normalized, 
                                          facecolor='lightblue', 
                                          edgecolor='blue', 
                                          linewidth=2)
            ax1.add_patch(polygon_patch)
            ax1.set_title('Original Polygon', fontsize=14, fontweight='bold')
            ax1.grid(True, alpha=0.3)
            
            # Plot 2: Zoning visualization
            ax2.set_xlim(0, width)
            ax2.set_ylim(0, height)
            ax2.set_aspect('equal')
            
            # Create zoning zones within the polygon
            primary_zone = zoning_result['primary_zone']
            zone_probabilities = zoning_result['zone_probabilities']
            
            # Create sub-zones based on probabilities
            self._create_zoning_zones(ax2, coords_normalized, zone_probabilities, width, height)
            
            ax2.set_title('Intelligent Zoning Analysis', fontsize=14, fontweight='bold')
            ax2.grid(True, alpha=0.3)
            
            # Add legend
            legend_elements = []
            for zone, prob in zone_probabilities.items():
                if prob > 0.1:  # Only show zones with >10% probability
                    color = self.zone_colors.get(zone, '#CCCCCC')
                    legend_elements.append(patches.Patch(color=color, 
                                                       label=f'{zone.title()} ({prob:.1%})'))
            
            ax2.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1, 1))
            
            # Add analysis text
            analysis_text = f"""
Primary Zone: {primary_zone.title()}
Confidence: {zoning_result['confidence']:.1%}
Recommendation: {zoning_result['recommendation']}
            """.strip()
            
            ax2.text(0.02, 0.98, analysis_text, transform=ax2.transAxes, 
                    fontsize=10, verticalalignment='top',
                    bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
            
            plt.tight_layout()
            
            # Save visualization
            output_path = Path(__file__).parent.parent / "output" / "zoning_visualization.png"
            output_path.parent.mkdir(exist_ok=True)
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Error creating zoning visualization: {e}")
            return None
    
    def _create_zoning_zones(self, ax, polygon_coords, zone_probabilities, width, height):
        """Create sub-zones within the polygon for visualization"""
        try:
            # Create a grid within the polygon
            grid_size = 20
            x_grid = np.linspace(0, width, grid_size)
            y_grid = np.linspace(0, height, grid_size)
            
            # Create zones based on probabilities
            zones = list(zone_probabilities.keys())
            probs = list(zone_probabilities.values())
            
            # Normalize probabilities
            probs = np.array(probs)
            probs = probs / probs.sum()
            
            # Create cumulative probabilities for zone assignment
            cum_probs = np.cumsum(probs)
            
            # Assign each grid cell to a zone
            for i, x in enumerate(x_grid[:-1]):
                for j, y in enumerate(y_grid[:-1]):
                    # Check if point is inside polygon
                    if self._point_in_polygon(x, y, polygon_coords):
                        # Assign zone based on probability
                        rand_val = np.random.random()
                        zone_idx = np.searchsorted(cum_probs, rand_val)
                        zone = zones[zone_idx]
                        
                        # Draw zone cell
                        color = self.zone_colors.get(zone, '#CCCCCC')
                        rect = patches.Rectangle((x, y), 
                                               x_grid[i+1] - x, 
                                               y_grid[j+1] - y,
                                               facecolor=color, 
                                               alpha=0.7,
                                               edgecolor='white',
                                               linewidth=0.5)
                        ax.add_patch(rect)
            
            # Draw polygon outline
            polygon_patch = patches.Polygon(polygon_coords, 
                                          facecolor='none', 
                                          edgecolor='black', 
                                          linewidth=3)
            ax.add_patch(polygon_patch)
            
        except Exception as e:
            logger.error(f"Error creating zoning zones: {e}")
    
    def _point_in_polygon(self, x, y, polygon_coords):
        """Check if a point is inside a polygon using ray casting algorithm"""
        n = len(polygon_coords)
        inside = False
        
        p1x, p1y = polygon_coords[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon_coords[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside

# Global instance
zoning_model = IntelligentZoningModel()
