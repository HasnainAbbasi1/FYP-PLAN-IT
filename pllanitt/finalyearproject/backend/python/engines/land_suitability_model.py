"""
Land Suitability ML Model Training and Prediction
This module creates and trains a machine learning model for land suitability analysis
based on DEM data, slope, aspect, and other terrain features.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.pipeline import Pipeline
import joblib
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class LandSuitabilityModel:
    """
    Land Suitability ML Model for analyzing terrain data and predicting
    land suitability for different types of development.
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [
            'elevation', 'slope', 'aspect', 'curvature', 'tpi', 'twi',
            'distance_to_water', 'distance_to_roads', 'soil_quality'
        ]
        self.suitability_classes = {
            0: 'Low Suitability',
            1: 'Medium Suitability', 
            2: 'High Suitability'
        }
        
    def generate_synthetic_training_data(self, n_samples=10000):
        """
        Generate synthetic training data for land suitability analysis.
        In a real scenario, this would be replaced with actual training data.
        """
        np.random.seed(42)
        
        # Generate realistic terrain features
        data = {
            'elevation': np.random.normal(500, 200, n_samples),  # meters
            'slope': np.random.exponential(15, n_samples),       # degrees
            'aspect': np.random.uniform(0, 360, n_samples),      # degrees
            'curvature': np.random.normal(0, 0.1, n_samples),    # curvature index
            'tpi': np.random.normal(0, 50, n_samples),           # topographic position index
            'twi': np.random.exponential(5, n_samples),          # topographic wetness index
            'distance_to_water': np.random.exponential(1000, n_samples),  # meters
            'distance_to_roads': np.random.exponential(500, n_samples),   # meters
            'soil_quality': np.random.uniform(0, 1, n_samples)   # soil quality index
        }
        
        df = pd.DataFrame(data)
        
        # Create realistic suitability labels based on terrain characteristics
        suitability_scores = np.zeros(n_samples)
        
        # High suitability: moderate elevation, low slope, good soil, near roads
        high_suitability_mask = (
            (df['elevation'] > 200) & (df['elevation'] < 800) &
            (df['slope'] < 15) &
            (df['distance_to_roads'] < 1000) &
            (df['soil_quality'] > 0.6) &
            (df['distance_to_water'] < 2000)
        )
        
        # Medium suitability: moderate conditions
        medium_suitability_mask = (
            (df['elevation'] > 100) & (df['elevation'] < 1000) &
            (df['slope'] < 25) &
            (df['distance_to_roads'] < 2000) &
            (df['soil_quality'] > 0.4)
        ) & ~high_suitability_mask
        
        # Low suitability: steep slopes, high elevation, poor access
        low_suitability_mask = ~(high_suitability_mask | medium_suitability_mask)
        
        # Assign labels
        df['suitability'] = 0  # Low
        df.loc[medium_suitability_mask, 'suitability'] = 1  # Medium
        df.loc[high_suitability_mask, 'suitability'] = 2    # High
        
        # Add some noise to make it more realistic
        noise_mask = np.random.random(n_samples) < 0.1
        df.loc[noise_mask, 'suitability'] = np.random.choice([0, 1, 2], size=noise_mask.sum())
        
        return df
    
    def train_model(self, training_data=None):
        """
        Train the land suitability model.
        """
        if training_data is None:
            logger.info("Generating synthetic training data...")
            training_data = self.generate_synthetic_training_data()
        
        # Prepare features and target
        X = training_data[self.feature_names]
        y = training_data['suitability']
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Create a pipeline with scaling and classification
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                class_weight='balanced'
            ))
        ])
        
        # Train the model
        logger.info("Training land suitability model...")
        self.model.fit(X_train, y_train)
        
        # Evaluate the model
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        logger.info(f"Training accuracy: {train_score:.3f}")
        logger.info(f"Test accuracy: {test_score:.3f}")
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X, y, cv=5)
        logger.info(f"Cross-validation scores: {cv_scores}")
        logger.info(f"Mean CV score: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
        
        # Feature importance
        feature_importance = self.model.named_steps['classifier'].feature_importances_
        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': feature_importance
        }).sort_values('importance', ascending=False)
        
        logger.info("Feature importance:")
        for _, row in importance_df.iterrows():
            logger.info(f"  {row['feature']}: {row['importance']:.3f}")
        
        return {
            'train_score': train_score,
            'test_score': test_score,
            'cv_scores': cv_scores.tolist(),
            'feature_importance': importance_df.to_dict('records')
        }
    
    def predict_suitability(self, terrain_features):
        """
        Predict land suitability for given terrain features.
        
        Args:
            terrain_features: dict or array-like with terrain features
            
        Returns:
            dict with predictions and probabilities
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train_model() first.")
        
        # Convert to DataFrame if needed
        if isinstance(terrain_features, dict):
            # Ensure all required features are present
            for feature in self.feature_names:
                if feature not in terrain_features:
                    terrain_features[feature] = 0.0  # Default value
            
            df = pd.DataFrame([terrain_features])
        else:
            df = pd.DataFrame(terrain_features, columns=self.feature_names)
        
        # Make predictions
        predictions = self.model.predict(df)
        probabilities = self.model.predict_proba(df)
        
        # Convert to more readable format
        results = []
        for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
            result = {
                'suitability_class': int(pred),
                'suitability_label': self.suitability_classes[pred],
                'confidence': float(np.max(prob)),
                'probabilities': {
                    'low': float(prob[0]),
                    'medium': float(prob[1]),
                    'high': float(prob[2])
                }
            }
            results.append(result)
        
        return results[0] if len(results) == 1 else results
    
    def save_model(self, filepath):
        """Save the trained model to disk."""
        if self.model is None:
            raise ValueError("No model to save. Train the model first.")
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self.model, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load a trained model from disk."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        self.model = joblib.load(filepath)
        logger.info(f"Model loaded from {filepath}")
    
    def extract_features_from_dem(self, dem_array, slope_array, aspect_array=None):
        """
        Extract terrain features from DEM data for suitability analysis.
        
        Args:
            dem_array: 2D numpy array of elevation data
            slope_array: 2D numpy array of slope data
            aspect_array: 2D numpy array of aspect data (optional)
            
        Returns:
            dict with extracted features
        """
        # Calculate additional terrain features
        from scipy import ndimage
        
        # Curvature (second derivative)
        curvature = ndimage.laplace(dem_array)
        
        # Topographic Position Index (TPI)
        kernel_size = 3
        kernel = np.ones((kernel_size, kernel_size)) / (kernel_size * kernel_size)
        mean_elevation = ndimage.convolve(dem_array, kernel, mode='constant')
        tpi = dem_array - mean_elevation
        
        # Topographic Wetness Index (TWI) - simplified
        # TWI = ln(upslope_area / tan(slope))
        upslope_area = ndimage.gaussian_filter(dem_array, sigma=2)
        slope_rad = np.deg2rad(slope_array)
        slope_rad[slope_rad == 0] = 0.001  # Avoid division by zero
        twi = np.log(upslope_area / np.tan(slope_rad))
        
        # Calculate statistics for each feature
        features = {
            'elevation': np.nanmean(dem_array),
            'slope': np.nanmean(slope_array),
            'aspect': np.nanmean(aspect_array) if aspect_array is not None else 180,
            'curvature': np.nanmean(curvature),
            'tpi': np.nanmean(tpi),
            'twi': np.nanmean(twi),
            'distance_to_water': 1000,  # Default - would need water data
            'distance_to_roads': 500,   # Default - would need road data
            'soil_quality': 0.7         # Default - would need soil data
        }
        
        return features

def create_and_train_model():
    """Create and train a new land suitability model."""
    model = LandSuitabilityModel()
    
    # Train the model
    training_results = model.train_model()
    
    # Save the model - try multiple locations
    model_paths = [
        Path(__file__).parent / "ml_models" / "land_suitability.pkl",  # engines/ml_models
        Path(__file__).parent.parent / "app" / "ml_models" / "land_suitability.pkl",  # app/ml_models
    ]
    
    # Use the first path that we can create
    model_path = None
    for path in model_paths:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            model_path = path
            break
        except Exception:
            continue
    
    if model_path:
        model.save_model(str(model_path))
        logger.info(f"Model saved to {model_path}")
    else:
        logger.warning("Could not save model to any location")
    
    return model, training_results

if __name__ == "__main__":
    # Train a new model when run directly
    logging.basicConfig(level=logging.INFO)
    model, results = create_and_train_model()
    print("Model training completed!")
    print(f"Training accuracy: {results['train_score']:.3f}")
    print(f"Test accuracy: {results['test_score']:.3f}")

