import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import joblib
import json
from pathlib import Path
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ZoningMLModel:
    """
    Machine Learning model for automatic zoning classification based on terrain features.
    
    Zoning Classes:
    0: Residential (Low density)
    1: Residential (Medium density) 
    2: Residential (High density)
    3: Commercial
    4: Industrial
    5: Green Space/Parks
    6: Water Bodies
    7: Agricultural
    8: Mixed Use
    9: Conservation/Protected
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [
            'elevation', 'slope', 'aspect', 'curvature', 'tpi', 'twi',
            'distance_to_water', 'distance_to_roads', 'soil_quality',
            'flood_risk', 'erosion_risk', 'accessibility_score'
        ]
        self.zoning_labels = {
            0: "Residential (Low Density)",
            1: "Residential (Medium Density)", 
            2: "Residential (High Density)",
            3: "Commercial",
            4: "Industrial",
            5: "Green Space/Parks",
            6: "Water Bodies",
            7: "Agricultural",
            8: "Mixed Use",
            9: "Conservation/Protected"
        }
        self.zoning_colors = {
            0: "#FFE4B5",  # Light residential
            1: "#FFD700",  # Medium residential  
            2: "#FFA500",  # High density residential
            3: "#FF6347",  # Commercial
            4: "#8B4513",  # Industrial
            5: "#32CD32",  # Green space
            6: "#4169E1",  # Water
            7: "#90EE90",  # Agricultural
            8: "#DDA0DD",  # Mixed use
            9: "#228B22"   # Conservation
        }
        
    def generate_synthetic_training_data(self, n_samples=10000):
        """
        Generate synthetic training data based on realistic zoning patterns.
        This simulates how different terrain characteristics influence zoning decisions.
        """
        logger.info("Generating synthetic training data for zoning model...")
        
        np.random.seed(42)
        data = []
        
        for _ in range(n_samples):
            # Generate terrain features
            elevation = np.random.normal(500, 200)  # Mean 500m, std 200m
            slope = np.random.exponential(10)  # Most areas have low slope
            aspect = np.random.uniform(0, 360)  # Random aspect
            curvature = np.random.normal(0, 0.1)  # Most areas are flat
            tpi = np.random.normal(0, 50)  # Topographic Position Index
            twi = np.random.exponential(5)  # Topographic Wetness Index
            distance_to_water = np.random.exponential(1000)  # Distance to water
            distance_to_roads = np.random.exponential(500)  # Distance to roads
            soil_quality = np.random.beta(2, 2)  # Soil quality 0-1
            flood_risk = np.random.beta(1, 4)  # Most areas have low flood risk
            erosion_risk = np.random.beta(1, 3)  # Most areas have low erosion risk
            accessibility_score = np.random.beta(3, 2)  # Accessibility score 0-1
            
            # Determine zoning based on terrain characteristics
            zoning_class = self._determine_zoning_class(
                elevation, slope, aspect, curvature, tpi, twi,
                distance_to_water, distance_to_roads, soil_quality,
                flood_risk, erosion_risk, accessibility_score
            )
            
            data.append([
                elevation, slope, aspect, curvature, tpi, twi,
                distance_to_water, distance_to_roads, soil_quality,
                flood_risk, erosion_risk, accessibility_score, zoning_class
            ])
        
        # Create DataFrame
        columns = self.feature_names + ['zoning_class']
        df = pd.DataFrame(data, columns=columns)
        
        logger.info(f"Generated {len(df)} training samples")
        logger.info("Zoning class distribution:")
        logger.info(df['zoning_class'].value_counts().sort_index())
        
        return df
    
    def _determine_zoning_class(self, elevation, slope, aspect, curvature, tpi, twi,
                               distance_to_water, distance_to_roads, soil_quality,
                               flood_risk, erosion_risk, accessibility_score):
        """
        Determine zoning class based on terrain characteristics using realistic rules.
        """
        # Water bodies (class 6)
        if twi > 8 or distance_to_water < 100:
            return 6
            
        # Conservation/Protected (class 9)
        if slope > 45 or elevation > 2000 or erosion_risk > 0.7:
            return 9
            
        # Green Space/Parks (class 5)
        if (slope > 25 and slope <= 45) or (elevation > 1500 and elevation <= 2000):
            return 5
            
        # Agricultural (class 7)
        if (soil_quality > 0.7 and slope < 15 and 
            distance_to_roads > 1000 and flood_risk < 0.3):
            return 7
            
        # Industrial (class 4)
        if (accessibility_score > 0.6 and distance_to_water > 500 and 
            flood_risk < 0.4 and soil_quality < 0.5):
            return 4
            
        # Commercial (class 3)
        if (accessibility_score > 0.8 and slope < 10 and 
            distance_to_roads < 300 and flood_risk < 0.3):
            return 3
            
        # Mixed Use (class 8)
        if (accessibility_score > 0.6 and accessibility_score <= 0.8 and 
            slope < 15 and flood_risk < 0.4):
            return 8
            
        # Residential zones based on accessibility and terrain
        if accessibility_score > 0.7 and slope < 20 and flood_risk < 0.3:
            if distance_to_roads < 200:  # High density
                return 2
            elif distance_to_roads < 500:  # Medium density
                return 1
            else:  # Low density
                return 0
        else:
            # Default to low density residential
            return 0
    
    def train_model(self, training_data=None):
        """
        Train the zoning classification model.
        """
        logger.info("Training zoning classification model...")
        
        if training_data is None:
            training_data = self.generate_synthetic_training_data()
        
        # Prepare features and target
        X = training_data[self.feature_names]
        y = training_data['zoning_class']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train Random Forest model
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            class_weight='balanced'
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"Model accuracy: {accuracy:.3f}")
        logger.info("Classification Report:")
        logger.info(classification_report(y_test, y_pred, 
                                        target_names=list(self.zoning_labels.values())))
        
        return {
            'accuracy': accuracy,
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'feature_importance': dict(zip(self.feature_names, 
                                         self.model.feature_importances_))
        }
    
    def predict_zoning(self, terrain_features):
        """
        Predict zoning classification for given terrain features.
        
        Args:
            terrain_features (dict): Dictionary containing terrain features
            
        Returns:
            dict: Prediction results with class, confidence, and probabilities
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train_model() first.")
        
        # Prepare feature vector
        feature_vector = np.array([
            terrain_features.get('elevation', 500),
            terrain_features.get('slope', 10),
            terrain_features.get('aspect', 180),
            terrain_features.get('curvature', 0),
            terrain_features.get('tpi', 0),
            terrain_features.get('twi', 5),
            terrain_features.get('distance_to_water', 1000),
            terrain_features.get('distance_to_roads', 500),
            terrain_features.get('soil_quality', 0.7),
            terrain_features.get('flood_risk', 0.2),
            terrain_features.get('erosion_risk', 0.2),
            terrain_features.get('accessibility_score', 0.6)
        ]).reshape(1, -1)
        
        # Scale features
        feature_vector_scaled = self.scaler.transform(feature_vector)
        
        # Make prediction
        prediction = self.model.predict(feature_vector_scaled)[0]
        probabilities = self.model.predict_proba(feature_vector_scaled)[0]
        confidence = np.max(probabilities)
        
        # Get top 3 predictions
        top_3_indices = np.argsort(probabilities)[-3:][::-1]
        top_3_predictions = []
        
        for idx in top_3_indices:
            top_3_predictions.append({
                'class': int(idx),
                'label': self.zoning_labels[idx],
                'probability': float(probabilities[idx]),
                'color': self.zoning_colors[idx]
            })
        
        return {
            'predicted_class': int(prediction),
            'predicted_label': self.zoning_labels[prediction],
            'confidence': float(confidence),
            'color': self.zoning_colors[prediction],
            'top_3_predictions': top_3_predictions,
            'all_probabilities': {
                self.zoning_labels[i]: float(prob) 
                for i, prob in enumerate(probabilities)
            }
        }
    
    def predict_grid_zoning(self, terrain_data, grid_size=50):
        """
        Predict zoning for a grid of points within the terrain area.
        
        Args:
            terrain_data (dict): Terrain analysis results
            grid_size (int): Number of grid points per dimension
            
        Returns:
            dict: Grid predictions with coordinates and zoning classes
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train_model() first.")
        
        logger.info(f"Predicting zoning for {grid_size}x{grid_size} grid...")
        
        # Extract terrain statistics
        stats = terrain_data.get('stats', {})
        slope_analysis = terrain_data.get('slope_analysis', {})
        
        # Create grid of points
        grid_predictions = []
        
        for i in range(grid_size):
            for j in range(grid_size):
                # Generate features for this grid point
                # Add some variation based on grid position
                elevation_variation = np.random.normal(0, stats.get('std_elevation', 50))
                slope_variation = np.random.normal(0, slope_analysis.get('std_slope', 5))
                
                features = {
                    'elevation': stats.get('mean_elevation', 500) + elevation_variation,
                    'slope': slope_analysis.get('mean_slope', 10) + slope_variation,
                    'aspect': np.random.uniform(0, 360),
                    'curvature': np.random.normal(0, 0.1),
                    'tpi': np.random.normal(0, 50),
                    'twi': np.random.exponential(5),
                    'distance_to_water': np.random.exponential(1000),
                    'distance_to_roads': np.random.exponential(500),
                    'soil_quality': np.random.beta(2, 2),
                    'flood_risk': np.random.beta(1, 4),
                    'erosion_risk': np.random.beta(1, 3),
                    'accessibility_score': np.random.beta(3, 2)
                }
                
                # Predict zoning for this point
                prediction = self.predict_zoning(features)
                
                grid_predictions.append({
                    'x': i,
                    'y': j,
                    'zoning_class': prediction['predicted_class'],
                    'zoning_label': prediction['predicted_label'],
                    'confidence': prediction['confidence'],
                    'color': prediction['color']
                })
        
        # Calculate zoning statistics
        zoning_counts = {}
        for pred in grid_predictions:
            label = pred['zoning_label']
            zoning_counts[label] = zoning_counts.get(label, 0) + 1
        
        total_points = len(grid_predictions)
        zoning_percentages = {
            label: (count / total_points) * 100 
            for label, count in zoning_counts.items()
        }
        
        return {
            'grid_predictions': grid_predictions,
            'zoning_statistics': zoning_counts,
            'zoning_percentages': zoning_percentages,
            'grid_size': grid_size,
            'total_points': total_points
        }
    
    def save_model(self, filepath):
        """Save the trained model and scaler."""
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'zoning_labels': self.zoning_labels,
            'zoning_colors': self.zoning_colors
        }
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load a trained model and scaler."""
        model_data = joblib.load(filepath)
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.zoning_labels = model_data['zoning_labels']
        self.zoning_colors = model_data['zoning_colors']
        logger.info(f"Model loaded from {filepath}")

def create_and_train_zoning_model():
    """Create and train a new zoning model."""
    model = ZoningMLModel()
    training_results = model.train_model()
    
    # Save the model
    model_dir = Path(__file__).parent
    model_dir.mkdir(exist_ok=True)
    model_path = model_dir / "zoning_classification.pkl"
    model.save_model(str(model_path))
    
    return model, training_results

if __name__ == "__main__":
    # Create and train the model
    model, results = create_and_train_zoning_model()
    print("Zoning model training completed!")
    print(f"Accuracy: {results['accuracy']:.3f}")
    print("Feature importance:")
    for feature, importance in results['feature_importance'].items():
        print(f"  {feature}: {importance:.3f}")
