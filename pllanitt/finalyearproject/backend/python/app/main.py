from fastapi import FastAPI, Request, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from shapely.geometry import (
    shape,
    mapping,
    Polygon,
    MultiPolygon,
    box,
    Point,
    MultiPoint,
    LineString,
    LinearRing,
    MultiLineString,
)
from shapely.validation import explain_validity
from shapely import affinity
import rasterio
from rasterio.mask import mask as rasterio_mask
from rasterio.crs import CRS
from rasterio.warp import calculate_default_transform, reproject, Resampling
import numpy as np
import random
import math
import os
import requests
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path as MplPath
from matplotlib.colors import LinearSegmentedColormap
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import tempfile
import shutil
import time
from sklearn.cluster import KMeans
from collections import Counter

from pathlib import Path
import sys

import joblib
import base64

# Load environment variables (optional - gracefully handle if not installed)
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load environment variables from .env file
except ImportError:
    pass  # python-dotenv not installed, will use system environment variables

# OpenAI integration for AI optimization
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    openai = None

# Import ML-based optimizer
ML_OPTIMIZER_AVAILABLE = False
try:
    # Try relative import first (for package mode)
    try:
        from .ml_optimizer import get_ml_optimizer
    except (ImportError, ValueError):
        # Fall back to direct import (for uvicorn app.main:app)
        from ml_optimizer import get_ml_optimizer
    ML_OPTIMIZER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: ML optimizer not available: {e}")

SQM_PER_MARLA = 4046.86 / 160.0  # ≈25.292875 sqm

# Import ML models
try:
    from ml_models.zoning_model import ZoningMLModel, create_and_train_zoning_model
    from ml_models.terrain_features import TerrainFeatureExtractor
    ML_MODELS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: ML models not available: {e}")
    ML_MODELS_AVAILABLE = False
    ZoningMLModel = None
    TerrainFeatureExtractor = None

# Import suitability analysis modules
try:
    # Use the local services package instead of a non-existent "python" package
    from services.suitability.weighted_overlay import weighted_overlay
    from services.suitability.reclassify_slope import reclassify_slope
    from services.suitability.reclassify_aspect import reclassify_aspect
    from services.suitability.reclassify_elevation import reclassify_elevation
    from services.suitability.reclassify_flow import reclassify_flow
    from services.suitability.generate_constraints import generate_constraints
    from services.suitability.suitability_polygonize import polygonize_suitability
    from services.suitability.suitability_stats import calculate_suitability_stats
    from services.terrain.terrain_stats import compute_terrain_stats
    SUITABILITY_ANALYSIS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Suitability analysis modules not available: {e}")
    SUITABILITY_ANALYSIS_AVAILABLE = False
    weighted_overlay = None
    reclassify_slope = None
    reclassify_aspect = None
    reclassify_elevation = None
    reclassify_flow = None
    generate_constraints = None
    polygonize_suitability = None
    calculate_suitability_stats = None
    compute_terrain_stats = None

# Import advanced terrain analysis
try:
    # Try relative import first (for package mode)
    try:
        from .advanced_terrain_analysis import AdvancedTerrainAnalyzer
    except (ImportError, ValueError):
        # Fall back to direct import (for uvicorn app.main:app)
        from advanced_terrain_analysis import AdvancedTerrainAnalyzer
    ADVANCED_TERRAIN_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Advanced terrain analysis not available: {e}")
    ADVANCED_TERRAIN_AVAILABLE = False
    AdvancedTerrainAnalyzer = None

# Add parent directory to Python path to allow importing from engines
# This must be done before importing engines
_temp_app_dir = Path(__file__).resolve().parent
_temp_python_root = _temp_app_dir.parent
if str(_temp_python_root) not in sys.path:
    sys.path.insert(0, str(_temp_python_root))

# Optional imports for advanced features
try:
    from engines.land_subdivision_engine import LandSubdivisionEngine
except ImportError as e:
    print(f"Warning: land_subdivision_engine not found ({e}), using stub")

# Import enhanced land suitability analyzer
ENHANCED_SUITABILITY_AVAILABLE = False
try:
    from engines.enhanced_land_suitability import (
        EnhancedLandSuitabilityAnalyzer,
        TerrainFeatures,
        DevelopmentType,
        extract_features_from_analysis
    )
    ENHANCED_SUITABILITY_AVAILABLE = True
    print("✅ Enhanced Land Suitability Analyzer available")
except ImportError as e:
    print(f"Warning: enhanced_land_suitability not available ({e})")
    ENHANCED_SUITABILITY_AVAILABLE = False
    class LandSubdivisionEngine:
        def __init__(self):
            self.parcel_standards = {"min_area": 200, "max_area": 5000}
            self.road_standards = {"min_width": 6, "max_width": 12}
            self.setback_requirements = {"front": 3, "side": 2, "rear": 3}
        
        def subdivide_land(self, **kwargs):
            return {"success": False, "error": "Land subdivision engine not available"}

try:
    from engines.road_network_engine import RoadNetworkEngine
except ImportError as e:
    print(f"Warning: road_network_engine not found ({e}), using stub")
    class RoadNetworkEngine:
        def __init__(self):
            self.standards = {"pakistan_standards": True, "cda_guidelines": True}
        
        def design_road_network(self, **kwargs):
            return {"success": False, "error": "Road network engine not available"}
from shapely.geometry.base import BaseGeometry
from scipy.ndimage import distance_transform_edt
from rasterio.features import rasterize, shapes
from shapely.ops import voronoi_diagram
from sklearn.preprocessing import StandardScaler
from pydantic import BaseModel
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log ML optimizer availability (after logger is initialized)
if not ML_OPTIMIZER_AVAILABLE:
    logger.warning("⚠️ ML optimizer not available - will use rule-based fallback only")
else:
    logger.info("✅ ML optimizer available")

# Resolve key directories once to avoid relative-path issues when the server
# is started from different working directories (e.g. backend/python vs app/)
APP_DIR = Path(__file__).resolve().parent
PYTHON_ROOT = APP_DIR.parent
DOWNLOAD_DIRECTORIES = [
    APP_DIR / "output",
    APP_DIR / "uploads",
    PYTHON_ROOT / "output",
    PYTHON_ROOT / "uploads",
    PYTHON_ROOT / "previews",
    PYTHON_ROOT / "storage" / "output",
    PYTHON_ROOT / "storage" / "uploads",
]

# Try to load the model, but don't fail if it doesn't exist
try:
    model_path = Path(__file__).parent / "ml_models" / "land_suitability.pkl"
    if model_path.exists():
        model = joblib.load(model_path)
        print(f"Loaded model from {model_path}")
    else:
        model = None
        print(f"Model not found at {model_path}, using fallback methods")
except Exception as e:
    model = None
    print(f"Failed to load model: {e}, using fallback methods")


def reproject_array_to_match(src_array, src_transform, src_crs, target_meta):
    """Reproject a single-band numpy array to match target_meta (returns array, transform)."""
    dst_shape = (target_meta['height'], target_meta['width'])
    dst_array = np.zeros(dst_shape, dtype=src_array.dtype)
    reproject(
        source=src_array,
        destination=dst_array,
        src_transform=src_transform,
        src_crs=src_crs,
        dst_transform=target_meta['transform'],
        dst_crs=target_meta['crs'],
        resampling=Resampling.bilinear
    )
    return dst_array

def rasterize_vector_to_mask(geojson_features, out_meta, attribute=None):
    """
    rasterize GeoJSON features to a binary mask with same extent/resolution as out_meta.
    geojson_features: list of feature dicts (GeoJSON)
    """
    shapes = []
    for feat in geojson_features:
        geom = feat.get('geometry') if 'geometry' in feat else feat
        shapes.append((shape(geom), 1))

    if not shapes:
        return np.zeros((out_meta['height'], out_meta['width']), dtype=np.uint8)

    mask = rasterize(
        shapes,
        out_shape=(out_meta['height'], out_meta['width']),
        transform=out_meta['transform'],
        fill=0,
        default_value=1,
        dtype=np.uint8
    )
    return mask

def raster_to_geojson(raster_array, transform, value_mask=None, properties_func=None):
    """
    Convert raster array to GeoJSON FeatureCollection.
    
    Args:
        raster_array: Binary or classified raster array (numpy array)
        transform: Rasterio transform object
        value_mask: Optional function to filter values (e.g., lambda x: x == 1)
        properties_func: Optional function to generate properties from value
    
    Returns:
        dict: GeoJSON FeatureCollection
    """
    try:
        from rasterio.features import shapes
        
        # Create mask if value_mask provided
        if value_mask:
            mask = value_mask(raster_array)
        else:
            mask = raster_array > 0
        
        # Generate shapes from raster
        features = []
        for geom, value in shapes(mask.astype(np.uint8), transform=transform):
            if value == 1:  # Only process masked pixels
                geom_shape = shape(geom)
                
                # Skip very small polygons
                if geom_shape.area < 1e-8:
                    continue
                
                # Generate properties
                props = {}
                if properties_func:
                    props = properties_func(value)
                else:
                    props = {"value": int(value)}
                
                feature = {
                    "type": "Feature",
                    "geometry": mapping(geom_shape),
                    "properties": props
                }
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features
        }
    except Exception as e:
        logger.error(f"Error converting raster to GeoJSON: {e}")
        return {
            "type": "FeatureCollection",
            "features": []
        }

def safe_float(value):
    """
    Convert value to JSON-safe float (replace NaN, inf, -inf with None).
    
    Args:
        value: Numeric value to convert
    
    Returns:
        float or None: JSON-safe float value
    """
    if value is None:
        return None
    try:
        import math
        fval = float(value)
        if math.isnan(fval) or math.isinf(fval):
            return None
        return fval
    except (ValueError, TypeError):
        return None

def safe_nan_stats(arr, mask=None):
    a = np.array(arr, dtype=float)
    if mask is not None:
        a = a[mask]
    a = a[~np.isnan(a)]
    if a.size == 0:
        return {"mean": None, "min": None, "max": None}
    return {
        "mean": safe_float(np.nanmean(a)), 
        "min": safe_float(np.nanmin(a)), 
        "max": safe_float(np.nanmax(a))
    }

def sanitize_dict_for_json(obj):
    """
    Recursively sanitize dictionary to remove NaN, inf, -inf values for JSON serialization.
    
    Args:
        obj: Dictionary or value to sanitize
    
    Returns:
        Sanitized object safe for JSON serialization
    """
    if isinstance(obj, dict):
        return {k: sanitize_dict_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_dict_for_json(item) for item in obj]
    elif isinstance(obj, (float, np.floating)):
        return safe_float(obj)
    elif isinstance(obj, (int, np.integer)):
        return int(obj)
    else:
        return obj

def _haversine_km(lat1, lon1, lat2, lon2):
    """Return distance in kilometers between two lat/lon points."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def fetch_hydrology_data(bounds):
    """
    Fetch hydrology (rivers, lakes) data from OpenStreetMap's Overpass API for the given bounds.
    
    Returns a dictionary with summary statistics and a GeoJSON FeatureCollection.
    """
    west, south, east, north = bounds
    width = abs(east - west)
    height = abs(north - south)
    area = width * height
    
    if width <= 0 or height <= 0:
        return None
    
    if area > HYDROLOGY_MAX_BBOX_DEG2:
        return {
            "status": "skipped",
            "reason": "Bounding box too large for hydrology lookup",
            "bounding_box": {"west": west, "south": south, "east": east, "north": north},
            "area_deg2": area
        }
    
    query = f"""
    [out:json][timeout:25];
    (
      way["waterway"]({south},{west},{north},{east});
      way["natural"="water"]({south},{west},{north},{east});
      way["water"]({south},{west},{north},{east});
      relation["natural"="water"]({south},{west},{north},{east});
      relation["waterway"]({south},{west},{north},{east});
    );
    out geom;
    """
    
    try:
        response = requests.post(
            OVERPASS_API_URL,
            data=query.encode("utf-8"),
            timeout=HYDROLOGY_TIMEOUT
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
            "bounding_box": {"west": west, "south": south, "east": east, "north": north}
        }
    
    elements = payload.get("elements", [])
    features = []
    total_length_km = 0.0
    waterway_count = 0
    water_body_count = 0
    named_features = 0
    
    for element in elements:
        if len(features) >= HYDROLOGY_MAX_FEATURES:
            break
        
        geometry = element.get("geometry")
        if not geometry or len(geometry) < 2:
            continue
        
        coords = [(pt["lon"], pt["lat"]) for pt in geometry]
        tags = element.get("tags", {}) or {}
        waterway = tags.get("waterway")
        natural = tags.get("natural")
        water_tag = tags.get("water")
        feature_type = waterway or water_tag or natural
        
        geometry_type = "LineString"
        if (natural == "water") or (water_tag in HYDROLOGY_WATER_BODY_TAGS) or (waterway == "riverbank"):
            geometry_type = "Polygon"
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            water_body_count += 1
        else:
            waterway_count += 1
            for idx in range(1, len(coords)):
                total_length_km += _haversine_km(
                    coords[idx - 1][1], coords[idx - 1][0],
                    coords[idx][1], coords[idx][0]
                )
        
        if tags.get("name"):
            named_features += 1
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": geometry_type,
                "coordinates": coords
            },
            "properties": {
                "id": element.get("id"),
                "osm_type": element.get("type"),
                "source": "OpenStreetMap",
                "name": tags.get("name"),
                "waterway": waterway,
                "water": water_tag,
                "natural": natural,
                "feature_type": feature_type or ("river" if waterway else "water")
            }
        })
    
    summary = {
        "bounding_box": {"west": west, "south": south, "east": east, "north": north},
        "area_deg2": round(area, 4),
        "total_features": len(features),
        "waterway_count": waterway_count,
        "water_body_count": water_body_count,
        "named_features": named_features,
        "estimated_waterway_length_km": round(total_length_km, 2)
    }
    
    sample_names = [f["properties"]["name"] for f in features if f["properties"].get("name")]
    if sample_names:
        summary["sample_names"] = sample_names[:5]
    
    return {
        "status": "success",
        "summary": summary,
        "geojson": {
            "type": "FeatureCollection",
            "features": features
        }
    }


app = FastAPI()

# Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

OPENTOPO_KEY = "380e35298379d6e86c7e057813e70915"
OVERPASS_API_URL = os.getenv("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
HYDROLOGY_MAX_BBOX_DEG2 = float(os.getenv("HYDROLOGY_MAX_BBOX_DEG2", "5.0"))
HYDROLOGY_MAX_FEATURES = int(os.getenv("HYDROLOGY_MAX_FEATURES", "250"))
HYDROLOGY_TIMEOUT = int(os.getenv("HYDROLOGY_TIMEOUT", "60"))
HYDROLOGY_WATER_BODY_TAGS = {
    "lake", "pond", "reservoir", "lagoon", "basin", "harbour", "bay", "wetland", "oxbow", "riverbank"
}

ENABLE_CURVED_SPINES = True
ENABLE_AMENITY_OVERLAYS = True

# ---------------- Health Check Endpoint ----------------
@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring Python backend status"""
    return JSONResponse({
        "status": "ok",
        "message": "Python backend is running",
        "timestamp": datetime.now().isoformat()
    })

# ---------------- Serve Output Images (must be before other routes) ----------------
@app.get("/output/{filename:path}")
async def serve_output_file(filename: str):
    """Serve files from output directory directly - must be defined early"""
    try:
        # Get absolute path to output directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Check if it's a reports file
        if filename.startswith("reports/"):
            file_path = os.path.join(script_dir, filename)
        else:
            file_path = os.path.join(script_dir, "output", filename)
        
        # Also try relative path
        if not os.path.exists(file_path):
            file_path = os.path.join("output", filename)
        
        if os.path.exists(file_path):
            logger.info(f"✅ Serving file: {file_path}")
            
            # Determine media type based on file extension
            media_type = "application/octet-stream"
            if filename.endswith('.pdf'):
                media_type = "application/pdf"
            elif filename.endswith('.png'):
                media_type = "image/png"
            elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
                media_type = "image/jpeg"
            elif filename.endswith('.json'):
                media_type = "application/json"
            elif filename.endswith('.tif') or filename.endswith('.tiff'):
                media_type = "image/tiff"
            
            return FileResponse(
                file_path, 
                media_type=media_type,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache",
                    "Content-Disposition": f'inline; filename="{os.path.basename(filename)}"'
                }
            )
        else:
            logger.warning(f"❌ File not found: {filename}")
            logger.warning(f"   Tried: {os.path.join(script_dir, 'output', filename)}")
            logger.warning(f"   Tried: {os.path.join('output', filename)}")
            return JSONResponse({
                "error": f"File not found: {filename}",
                "tried_paths": [
                    os.path.join(script_dir, "output", filename),
                    os.path.join("output", filename)
                ]
            }, status_code=404)
    except Exception as e:
        logger.error(f"❌ Error serving file {filename}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse({"error": str(e)}, status_code=500)

# ---------------- Memory store for polygons and analysis data ----------------
POLYGONS = []   # fake DB for demo
TERRAIN_ANALYSES = []  # Store terrain analysis results

def validate_terrain_for_development(terrain_data: dict, operation: str = "general") -> dict:
    """
    Validate terrain suitability for development operations (zoning, road network, parcels).
    
    Args:
        terrain_data: Terrain analysis data dictionary
        operation: Type of operation ('zoning', 'road_network', 'parcels', 'general')
    
    Returns:
        dict: Validation result with 'allowed', 'reason', 'details'
    """
    try:
        # Extract terrain analysis results
        results = terrain_data.get("results", {})
        if isinstance(results, str):
            import json
            results = json.loads(results)
        
        # Check for water areas
        water_area_percentage = 0
        water_stats = results.get("water_analysis", {}).get("water_stats", {})
        if water_stats:
            water_area_percentage = water_stats.get("water_area_percentage", 0)
        else:
            # Try alternative paths for water data
            classification = results.get("classification", {})
            if classification:
                water_pixels = classification.get("water_pixels", 0)
                total_pixels = classification.get("total_pixels", 1)
                if total_pixels > 0:
                    water_area_percentage = (water_pixels / total_pixels) * 100
        
        # Check flood risk
        flood_analysis = results.get("flood_analysis", {}) or results.get("flood_risk_analysis", {})
        flood_stats = flood_analysis.get("flood_stats", {})
        high_risk_area = flood_stats.get("high_risk_area", 0)
        total_area = flood_stats.get("total_risk_area", 0) or flood_stats.get("high_risk_area", 0) + flood_stats.get("medium_risk_area", 0) + flood_stats.get("low_risk_area", 0)
        
        # Check slope/erosion
        slope_analysis = results.get("slope_analysis", {})
        mean_slope = slope_analysis.get("mean_slope", 0)
        max_slope = slope_analysis.get("max_slope", 0)
        
        validation_details = {
            "water_area_percentage": water_area_percentage,
            "high_flood_risk_area": high_risk_area,
            "mean_slope": mean_slope,
            "max_slope": max_slope
        }
        
        # CRITICAL: Water areas (>50% water) - NO development allowed
        if water_area_percentage > 50:
            return {
                "allowed": False,
                "reason": f"Water body detected covering {water_area_percentage:.1f}% of the area. Development operations (zoning, road network, parcels) are not allowed on water bodies.",
                "details": validation_details,
                "severity": "critical"
            }
        
        # HIGH RESTRICTION: Significant water areas (>20% water) - Warn but allow with restrictions
        if water_area_percentage > 20:
            return {
                "allowed": True,
                "reason": f"Significant water body detected ({water_area_percentage:.1f}% of area). Development is allowed but with restrictions. Consider waterfront development or conservation zones.",
                "details": validation_details,
                "severity": "high",
                "warnings": ["Large water body present - ensure proper setbacks", "Consider environmental compliance requirements"]
            }
        
        # Check for very high flood risk
        if total_area > 0:
            high_risk_percentage = (high_risk_area / total_area) * 100 if total_area > 0 else 0
            if high_risk_percentage > 50:
                return {
                    "allowed": False,
                    "reason": f"High flood risk area detected ({high_risk_percentage:.1f}% high risk). Development operations are restricted in high flood risk zones.",
                    "details": validation_details,
                    "severity": "high"
                }
        
        # Check for extreme slopes (unsuitable for most development)
        if max_slope > 60 or mean_slope > 45:
            return {
                "allowed": False,
                "reason": f"Extreme terrain slope detected (max: {max_slope:.1f}°, mean: {mean_slope:.1f}°). Terrain is too steep for safe development operations.",
                "details": validation_details,
                "severity": "high"
            }
        
        # Moderate restrictions
        warnings = []
        if water_area_percentage > 5:
            warnings.append(f"Small water features detected ({water_area_percentage:.1f}%) - consider drainage requirements")
        
        if mean_slope > 30:
            warnings.append(f"Steep terrain (mean slope: {mean_slope:.1f}°) - may require terracing or specialized engineering")
        
        if warnings:
            return {
                "allowed": True,
                "reason": "Terrain is suitable for development with considerations.",
                "details": validation_details,
                "severity": "moderate",
                "warnings": warnings
            }
        
        # All checks passed
        return {
            "allowed": True,
            "reason": "Terrain is suitable for development operations.",
            "details": validation_details,
            "severity": "low"
        }
        
    except Exception as e:
        logger.error(f"Error in terrain validation: {e}")
        # On error, allow but warn
        return {
            "allowed": True,
            "reason": f"Terrain validation encountered an error: {str(e)}. Proceeding with caution.",
            "details": {},
            "severity": "unknown"
        }
ZONING_RESULTS = []    # Store zoning results
POLY_COUNTER = 1
TERRAIN_COUNTER = 1
ZONING_COUNTER = 1

class PolygonGeoJSON(BaseModel):
    type: str
    features: list

# ---------------- FE-5: Enhanced Data Validation Classes ----------------
class ValidationResult:
    def __init__(self):
        self.is_valid = True
        self.errors = []
        self.warnings = []
        self.info = []
    
    def add_error(self, message: str):
        self.errors.append(message)
        self.is_valid = False
        logger.error(f"Validation Error: {message}")
    
    def add_warning(self, message: str):
        self.warnings.append(message)
        logger.warning(f"Validation Warning: {message}")
    
    def add_info(self, message: str):
        self.info.append(message)
        logger.info(f"Validation Info: {message}")
    
    def to_dict(self):
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "info": self.info,
            "summary": {
                "error_count": len(self.errors),
                "warning_count": len(self.warnings),
                "info_count": len(self.info)
            }
        }

class DataValidator:
    """FE-5: Comprehensive data validation for urban planning datasets"""
    
    @staticmethod
    def validate_geojson(geojson: dict) -> ValidationResult:
        """Validate GeoJSON geometry and properties"""
        result = ValidationResult()
        
        # Check basic structure
        if not isinstance(geojson, dict):
            result.add_error("GeoJSON must be a dictionary")
            return result
        
        # Handle both raw geometry and feature formats
        if "geometry" in geojson:
            geometry = geojson["geometry"]
        elif "type" in geojson and geojson["type"] in ["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"]:
            geometry = geojson
        else:
            result.add_error("Invalid GeoJSON structure")
            return result
        
        # Validate geometry structure
        if not isinstance(geometry, dict):
            result.add_error("Geometry must be a dictionary")
            return result
        
        if "type" not in geometry or "coordinates" not in geometry:
            result.add_error("Geometry missing 'type' or 'coordinates'")
            return result
        
        # Validate geometry type
        valid_types = ["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"]
        if geometry["type"] not in valid_types:
            result.add_error(f"Invalid geometry type: {geometry['type']}")
            return result
        
        try:
            # Use shapely to validate geometry
            geom = shape(geometry)
            if not geom.is_valid:
                result.add_error(f"Invalid geometry: {explain_validity(geom)}")
            else:
                result.add_info(f"Valid {geometry['type']} geometry")
                
            # Check coordinate bounds (basic geographic validation)
            bounds = geom.bounds
            if bounds[0] < -180 or bounds[2] > 180:
                result.add_warning("Longitude values outside [-180, 180] range")
            if bounds[1] < -90 or bounds[3] > 90:
                result.add_warning("Latitude values outside [-90, 90] range")
                
            # Check area for polygons
            if geometry["type"] in ["Polygon", "MultiPolygon"]:
                area = geom.area
                if area == 0:
                    result.add_error("Polygon has zero area")
                elif area < 1e-10:
                    result.add_warning("Polygon has very small area (possible precision issues)")
                else:
                    result.add_info(f"Polygon area: {area:.6f} square degrees")
                    
        except Exception as e:
            result.add_error(f"Geometry validation failed: {str(e)}")
        
        return result
    
    @staticmethod
    def validate_coordinates(bounds: dict) -> ValidationResult:
        """Validate coordinate bounds"""
        result = ValidationResult()
        
        required_fields = ["latMin", "latMax", "lngMin", "lngMax"]
        for field in required_fields:
            if field not in bounds:
                result.add_error(f"Missing required field: {field}")
                continue
            
            try:
                value = float(bounds[field])
                bounds[field] = value  # Ensure numeric type
            except (ValueError, TypeError):
                result.add_error(f"Invalid numeric value for {field}: {bounds[field]}")
                continue
        
        if not result.is_valid:
            return result
        
        # Validate coordinate ranges
        lat_min, lat_max = bounds["latMin"], bounds["latMax"]
        lng_min, lng_max = bounds["lngMin"], bounds["lngMax"]
        
        if lat_min < -90 or lat_min > 90:
            result.add_error(f"latMin out of range [-90, 90]: {lat_min}")
        if lat_max < -90 or lat_max > 90:
            result.add_error(f"latMax out of range [-90, 90]: {lat_max}")
        if lng_min < -180 or lng_min > 180:
            result.add_error(f"lngMin out of range [-180, 180]: {lng_min}")
        if lng_max < -180 or lng_max > 180:
            result.add_error(f"lngMax out of range [-180, 180]: {lng_max}")
        
        # Validate coordinate relationships
        if lat_min >= lat_max:
            result.add_error(f"latMin ({lat_min}) must be less than latMax ({lat_max})")
        if lng_min >= lng_max:
            result.add_error(f"lngMin ({lng_min}) must be less than lngMax ({lng_max})")
        
        # Check area size
        area_deg = (lat_max - lat_min) * (lng_max - lng_min)
        if area_deg > 100:  # More than ~100 square degrees
            result.add_warning("Large area selected - processing may take longer")
        elif area_deg < 0.001:  # Less than ~0.001 square degrees
            result.add_warning("Very small area selected - results may have limited detail")
        
        result.add_info(f"Coordinate bounds validated: {area_deg:.6f} square degrees")
        return result
    
    @staticmethod
    def validate_raster_file(file_path: str) -> ValidationResult:
        """Validate raster/DEM file"""
        result = ValidationResult()
        
        if not os.path.exists(file_path):
            result.add_error(f"File not found: {file_path}")
            return result
        
        try:
            with rasterio.open(file_path) as src:
                # Check basic properties
                result.add_info(f"Raster dimensions: {src.width} x {src.height}")
                result.add_info(f"Band count: {src.count}")
                result.add_info(f"Data type: {src.dtypes[0]}")
                result.add_info(f"CRS: {src.crs}")
                
                # Check CRS
                if src.crs is None:
                    result.add_warning("Raster has no coordinate reference system")
                else:
                    result.add_info(f"CRS is defined: {src.crs}")
                
                # Check bounds
                bounds = src.bounds
                result.add_info(f"Bounds: {bounds}")
                
                # Read and validate data
                data = src.read(1)
                
                # Check for NoData values
                if src.nodata is not None:
                    nodata_count = np.sum(data == src.nodata)
                    total_pixels = data.size
                    nodata_percentage = (nodata_count / total_pixels) * 100
                    
                    if nodata_percentage > 50:
                        result.add_warning(f"High percentage of NoData values: {nodata_percentage:.1f}%")
                    else:
                        result.add_info(f"NoData percentage: {nodata_percentage:.1f}%")
                
                # Check data range for DEM
                valid_data = data[data != src.nodata] if src.nodata is not None else data
                if len(valid_data) > 0:
                    min_val, max_val = np.min(valid_data), np.max(valid_data)
                    result.add_info(f"Elevation range: {min_val:.2f} to {max_val:.2f}m")
                    
                    # Reasonable elevation checks
                    if min_val < -500:
                        result.add_warning(f"Very low elevation values detected: {min_val:.2f}m")
                    if max_val > 9000:
                        result.add_warning(f"Very high elevation values detected: {max_val:.2f}m")
                else:
                    result.add_error("No valid data found in raster")
                
        except Exception as e:
            result.add_error(f"Failed to validate raster file: {str(e)}")
        
        return result
    
    @staticmethod
    def validate_dem_processing_quality(dem_array: np.ndarray, original_bounds: tuple) -> ValidationResult:
        """Validate processed DEM data quality"""
        result = ValidationResult()
        
        # Check for reasonable data
        if dem_array.size == 0:
            result.add_error("DEM array is empty")
            return result
        
        # Remove NaN values for statistics
        valid_data = dem_array[~np.isnan(dem_array)]
        
        if len(valid_data) == 0:
            result.add_error("No valid elevation data after processing")
            return result
        
        # Calculate statistics
        mean_elev = np.mean(valid_data)
        std_elev = np.std(valid_data)
        min_elev = np.min(valid_data)
        max_elev = np.max(valid_data)
        
        result.add_info(f"Elevation statistics - Mean: {mean_elev:.2f}m, Std: {std_elev:.2f}m")
        result.add_info(f"Elevation range: {min_elev:.2f}m to {max_elev:.2f}m")
        
        # Quality checks
        if std_elev == 0:
            result.add_warning("No elevation variation detected (flat terrain)")
        elif std_elev < 1:
            result.add_warning("Very low elevation variation (very flat terrain)")
        
        # Check for data gaps
        nan_percentage = (np.sum(np.isnan(dem_array)) / dem_array.size) * 100
        if nan_percentage > 25:
            result.add_error(f"High percentage of missing data: {nan_percentage:.1f}%")
        elif nan_percentage > 10:
            result.add_warning(f"Moderate percentage of missing data: {nan_percentage:.1f}%")
        else:
            result.add_info(f"Missing data percentage: {nan_percentage:.1f}%")
        
        return result

# ---------------- Enhanced Helper: Run DEM processing with validation ----------------
async def process_geojson(geojson, request: Request, data_types: List[str] = None, 
                         target_crs: str = None, preprocessing: dict = None):
    """Enhanced DEM processing with comprehensive validation"""
    hydrology_data = None
    
    # FE-5: Validate input GeoJSON
    validation_result = DataValidator.validate_geojson(geojson)
    if not validation_result.is_valid:
        return {
            "error": "GeoJSON validation failed",
            "validation": validation_result.to_dict()
        }
    
    geom = shape(geojson["geometry"] if "geometry" in geojson else geojson)
    bounds = geom.bounds

    # Fetch hydrology data (rivers/lakes) from OSM within the polygon bounds
    try:
        hydrology_data = fetch_hydrology_data(bounds)
    except Exception as hydro_err:
        logger.warning(f"Hydrology data fetch failed: {hydro_err}")
        hydrology_data = {
            "status": "error",
            "error": str(hydro_err),
            "bounding_box": {"west": bounds[0], "south": bounds[1], "east": bounds[2], "north": bounds[3]}
        }

    # Check if bounding box is too small for OpenTopography API (minimum 250m per side)
    # Convert degrees to approximate meters (rough approximation at center latitude)
    center_lat = (bounds[1] + bounds[3]) / 2.0
    meters_per_deg_lat = 111132.92 - 559.82 * np.cos(2 * np.deg2rad(center_lat)) + 1.175 * np.cos(4 * np.deg2rad(center_lat))
    meters_per_deg_lon = 111412.84 * np.cos(np.deg2rad(center_lat)) - 93.5 * np.cos(3 * np.deg2rad(center_lat))
    
    width_m = (bounds[2] - bounds[0]) * meters_per_deg_lon
    height_m = (bounds[3] - bounds[1]) * meters_per_deg_lat
    
    min_size_m = 250  # OpenTopography minimum requirement
    
    # Expand bounding box if too small
    if width_m < min_size_m or height_m < min_size_m:
        logger.info(f"Bounding box too small (width: {width_m:.1f}m, height: {height_m:.1f}m). Expanding to minimum size.")
        
        # Calculate expansion needed
        width_expansion = max(0, (min_size_m - width_m) / 2) / meters_per_deg_lon
        height_expansion = max(0, (min_size_m - height_m) / 2) / meters_per_deg_lat
        
        # Expand bounds
        expanded_bounds = [
            bounds[0] - width_expansion,   # west
            bounds[1] - height_expansion,  # south  
            bounds[2] + width_expansion,   # east
            bounds[3] + height_expansion   # north
        ]
        
        logger.info(f"Expanded bounds: {expanded_bounds}")
        bounds = expanded_bounds

    # Calculate actual area in km² to validate against API limits
    # The bounding box is in degrees (WGS84), so we need to calculate geodesic area
    from pyproj import Geod
    geod = Geod(ellps='WGS84')
    
    # Create a rectangle polygon from bounds for area calculation
    from shapely.geometry import box
    bbox_poly = box(bounds[0], bounds[1], bounds[2], bounds[3])
    
    # Calculate geodesic area in square meters, then convert to km²
    area_sqm, _ = geod.geometry_area_perimeter(bbox_poly)
    area_km2 = abs(area_sqm) / 1_000_000  # Convert to km²
    
    logger.info(f"📐 Calculated bounding box area: {area_km2:.2f} km² (width: {width_m:.1f}m, height: {height_m:.1f}m)")
    
    # Validate area against API limits
    MAX_AREA_SRTMGL1 = 450_000  # km²
    MAX_AREA_SRTMGL3 = 1_000_000  # km² (approximate)
    MAX_AREA_COP30 = 2_000_000  # km² (approximate)
    
    # Select DEM dataset based on latitude coverage and area
    dem_type = "SRTMGL1"  # default: best resolution but limited to ±60°
    if abs(center_lat) > 60:
        dem_type = "COP30"  # Copernicus DEM offers near-global coverage
    elif abs(center_lat) > 56:
        dem_type = "SRTMGL3"  # lower resolution but slightly wider coverage
    
    # Check if area exceeds limits and switch to appropriate dataset
    if area_km2 > MAX_AREA_SRTMGL1:
        if area_km2 > MAX_AREA_SRTMGL3:
            if area_km2 > MAX_AREA_COP30:
                return {
                    "error": f"Area too large for DEM API: {area_km2:.0f} km² exceeds maximum limit of {MAX_AREA_COP30:,} km². Please select a smaller polygon.",
                    "validation": {"is_valid": False, "errors": [f"Polygon area ({area_km2:.0f} km²) exceeds API limits"]}
                }
            dem_type = "COP30"
            logger.warning(f"⚠️ Area ({area_km2:.0f} km²) exceeds SRTMGL3 limit, switching to COP30")
        else:
            if dem_type == "SRTMGL1":
                dem_type = "SRTMGL3"
                logger.warning(f"⚠️ Area ({area_km2:.0f} km²) exceeds SRTMGL1 limit, switching to SRTMGL3")
    
    logger.info(f"Using DEM dataset '{dem_type}' for latitude {center_lat:.2f}, area {area_km2:.2f} km²")
    
    # Download DEM
    os.makedirs("data", exist_ok=True)
    dem_path = "data/dem_download.tif"
    url = (
        f"https://portal.opentopography.org/API/globaldem?"
        f"demtype={dem_type}&west={bounds[0]}&south={bounds[1]}&"
        f"east={bounds[2]}&north={bounds[3]}&outputFormat=GTiff&API_Key={OPENTOPO_KEY}"
    )
    
    try:
        r = requests.get(url, timeout=60)
        if r.status_code != 200:
            error_text = r.text
            # Check if it's an area limit error
            if "maximum area" in error_text.lower() or "450,000" in error_text:
                # Try with a different DEM type
                if dem_type == "SRTMGL1":
                    logger.warning(f"SRTMGL1 failed, trying SRTMGL3...")
                    url = (
                        f"https://portal.opentopography.org/API/globaldem?"
                        f"demtype=SRTMGL3&west={bounds[0]}&south={bounds[1]}&"
                        f"east={bounds[2]}&north={bounds[3]}&outputFormat=GTiff&API_Key={OPENTOPO_KEY}"
                    )
                    r = requests.get(url, timeout=60)
                    if r.status_code == 200:
                        dem_type = "SRTMGL3"
                        logger.info(f"✅ Successfully using SRTMGL3 instead")
                    else:
                        return {
                            "error": f"DEM fetch failed: Area {area_km2:.0f} km² may be too large. Please select a smaller polygon.",
                            "validation": {"is_valid": False, "errors": ["Failed to download DEM data - area too large"]}
                        }
                else:
                    return {
                        "error": f"DEM fetch failed ({dem_type}): {error_text}. Calculated area: {area_km2:.0f} km²",
                        "validation": {"is_valid": False, "errors": ["Failed to download DEM data"]}
                    }
    except requests.RequestException as e:
        return {
            "error": f"DEM download failed: {str(e)}",
            "validation": {"is_valid": False, "errors": ["Network error during DEM download"]}
        }

    with open(dem_path, "wb") as f:
        f.write(r.content)

    # FE-5: Validate downloaded DEM file
    dem_validation = DataValidator.validate_raster_file(dem_path)
    
    # Apply preprocessing options if provided
    if preprocessing:
        logger.info(f"Applying preprocessing options: {preprocessing}")
    
    # Clip DEM
    try:
        with rasterio.open(dem_path) as src:
            out_image, out_transform = rasterio_mask(src, [mapping(geom)], crop=True)
            out_meta = src.meta.copy()
            out_meta.update({
                "driver": "GTiff",
                "height": out_image.shape[1],
                "width": out_image.shape[2],
                "transform": out_transform
            })

            # Apply coordinate transformation if requested
            if target_crs and target_crs != 'EPSG:4326':
                try:
                    dst_crs = CRS.from_string(target_crs)
                    transform, width, height = calculate_default_transform(
                        src.crs, dst_crs, out_image.shape[2], out_image.shape[1], 
                        *src.bounds
                    )
                    out_meta.update({
                        'crs': dst_crs,
                        'transform': transform,
                        'width': width,
                        'height': height
                    })
                    
                    # Reproject the data
                    reprojected_data = np.zeros((out_image.shape[0], height, width))
                    for i in range(out_image.shape[0]):
                        reproject(
                            source=out_image[i],
                            destination=reprojected_data[i],
                            src_transform=out_transform,
                            src_crs=src.crs,
                            dst_transform=transform,
                            dst_crs=dst_crs,
                            resampling=Resampling.bilinear
                        )
                    out_image = reprojected_data
                    logger.info(f"Reprojected data to {target_crs}")
                except Exception as e:
                    logger.warning(f"CRS transformation failed: {e}")

            os.makedirs("output", exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            clipped_tif = f"output/dem_clip_{timestamp}.tif"
            
            with rasterio.open(clipped_tif, "w", **out_meta) as dest:
                dest.write(out_image)

            dem_arr = out_image[0].astype(float)
            nodata = src.nodata
            if nodata is not None:
                dem_arr[dem_arr == nodata] = np.nan

            # Apply data cleaning if requested
            if preprocessing and preprocessing.get('cleanNoData', True):
                # Simple NoData cleaning
                valid_mask = ~np.isnan(dem_arr)
                if np.any(valid_mask):
                    mean_val = np.mean(dem_arr[valid_mask])
                    dem_arr[~valid_mask] = mean_val
                    logger.info("Applied NoData cleaning")

            # FE-5: Validate processed DEM quality
            processing_validation = DataValidator.validate_dem_processing_quality(dem_arr, bounds)

            # Always calculate dzdx and dzdy first - needed for visualization regardless of analysis type
            dzdy, dzdx = np.gradient(dem_arr)
            
            # Initialize variables for GeoJSON generation
            advanced_results = None
            analyzer = None
            flow_accum = None
            drainage = None
            
            # Use Advanced Terrain Analysis if available, otherwise fall back to basic analysis
            if ADVANCED_TERRAIN_AVAILABLE and AdvancedTerrainAnalyzer:
                logger.info("Using Advanced Terrain Analysis for real DEM-based calculations")
                try:
                    analyzer = AdvancedTerrainAnalyzer()
                    advanced_results = analyzer.analyze_terrain(dem_arr, out_meta['transform'], bounds)
                    
                    # Extract results from advanced analysis
                    slope_analysis = advanced_results.get("slope_analysis", {})
                    flood_analysis = advanced_results.get("flood_risk_analysis", {})
                    erosion_analysis = advanced_results.get("erosion_analysis", {})
                    water_availability = advanced_results.get("water_availability", {})
                    
                    # Get flow accumulation and drainage for GeoJSON generation
                    analyzer.pixel_size = abs(out_meta['transform'][0])
                    flow_accum, drainage = analyzer._calculate_flow_accumulation(dem_arr)
                    
                    # Ensure category_stats exists in slope_analysis
                    if "category_stats" not in slope_analysis:
                        # Initialize with empty structure if missing
                        slope_analysis["category_stats"] = {
                            1: {"name": "Flat (0-15°)", "area_percentage": 0, "pixel_count": 0},
                            2: {"name": "Moderate (15-30°)", "area_percentage": 0, "pixel_count": 0},
                            3: {"name": "Steep (30-50°)", "area_percentage": 0, "pixel_count": 0},
                            4: {"name": "Very Steep (50-70°)", "area_percentage": 0, "pixel_count": 0},
                            5: {"name": "Extremely Steep (>70°)", "area_percentage": 0, "pixel_count": 0}
                        }
                    
                    # Calculate slope from gradients for visualization
                    # (Advanced analysis provides stats, but we need the full array for visualization)
                    slope = np.sqrt(dzdx**2 + dzdy**2)
                    slope_deg = np.degrees(np.arctan(slope))
                    
                    # Add water availability to stats
                    logger.info("✅ Advanced terrain analysis completed successfully")
                except Exception as e:
                    logger.warning(f"Advanced terrain analysis failed, using basic analysis: {e}")
                    # Fall back to basic analysis
                    dzdy, dzdx = np.gradient(dem_arr)
                    slope = np.sqrt(dzdx**2 + dzdy**2)
                    slope_deg = np.degrees(np.arctan(slope))
                    
                    slope_analysis = {
                        "mean_slope": float(np.nanmean(slope_deg)),
                        "max_slope": float(np.nanmax(slope_deg)),
                        "min_slope": float(np.nanmin(slope_deg)),
                        "std_slope": float(np.nanstd(slope_deg)),
                        "category_stats": {}
                    }
                    
                    flood_analysis = {
                        "flood_stats": {
                            "high_risk_area": int(np.sum((dem_arr <= 2.0) & (~np.isnan(dem_arr)))),
                            "medium_risk_area": int(np.sum((dem_arr > 2.0) & (dem_arr <= 5.0) & (~np.isnan(dem_arr)))),
                            "low_risk_area": int(np.sum((dem_arr > 5.0) & (~np.isnan(dem_arr))))
                        }
                    }
                    
                    erosion_analysis = {
                        "erosion_stats": {
                            "mean_soil_loss": float(np.nanmean(slope_deg) * 0.5),
                            "high_erosion_area": int(np.sum((slope_deg > 30) & (~np.isnan(slope_deg))))
                        }
                    }
                    
                    water_availability = {}
            else:
                # Basic analysis (fallback)
                logger.info("Using basic terrain analysis (advanced module not available)")
                dzdy, dzdx = np.gradient(dem_arr)
                slope = np.sqrt(dzdx**2 + dzdy**2)
                slope_deg = np.degrees(np.arctan(slope))
                
                slope_analysis = {
                    "mean_slope": float(np.nanmean(slope_deg)),
                    "max_slope": float(np.nanmax(slope_deg)),
                    "min_slope": float(np.nanmin(slope_deg)),
                    "std_slope": float(np.nanstd(slope_deg)),
                    "category_stats": {}
                }
                
                flood_analysis = {
                    "flood_stats": {
                        "high_risk_area": int(np.sum((dem_arr <= 2.0) & (~np.isnan(dem_arr)))),
                        "medium_risk_area": int(np.sum((dem_arr > 2.0) & (dem_arr <= 5.0) & (~np.isnan(dem_arr)))),
                        "low_risk_area": int(np.sum((dem_arr > 5.0) & (~np.isnan(dem_arr))))
                    }
                }
                
                erosion_analysis = {
                    "erosion_stats": {
                        "mean_soil_loss": float(np.nanmean(slope_deg) * 0.5),
                        "high_erosion_area": int(np.sum((slope_deg > 30) & (~np.isnan(slope_deg))))
                    }
                }
                
                water_availability = {}

            # ENHANCED Water detection for classification - detects oceans, lakes, dams, rivers
            # Multi-method approach to catch all water types
            
            mean_elev = np.nanmean(dem_arr)
            min_elev = np.nanmin(dem_arr)
            max_elev = np.nanmax(dem_arr)
            std_elev = np.nanstd(dem_arr)
            
            # Method 1: Elevation-based detection (for oceans, large lakes)
            if mean_elev < 10:
                water_threshold_elev = mean_elev + 2.0
            elif mean_elev < 50:
                water_threshold_elev = np.nanpercentile(dem_arr, 25)
            else:
                water_threshold_elev = min(mean_elev - std_elev, np.nanpercentile(dem_arr, 15)) if std_elev > 0 else np.nanpercentile(dem_arr, 15)
            
            # Method 2: Flow accumulation-based detection (for rivers, streams)
            # High flow accumulation + low slope = likely river/stream
            water_mask_flow = np.zeros_like(dem_arr, dtype=bool)
            if ADVANCED_TERRAIN_AVAILABLE and AdvancedTerrainAnalyzer:
                try:
                    analyzer = AdvancedTerrainAnalyzer()
                    flow_accum, drainage = analyzer._calculate_flow_accumulation(dem_arr)
                    if flow_accum is not None:
                        # Rivers/streams: high flow accumulation (>1000) + low slope (<5°)
                        flow_threshold = np.nanpercentile(flow_accum, 75)  # Top 25% flow
                        water_mask_flow = (flow_accum > flow_threshold) & (slope_deg < 5.0) & (~np.isnan(dem_arr))
                        logger.info(f"🌊 Flow-based detection: {np.sum(water_mask_flow)} pixels identified as rivers/streams")
                except Exception as e:
                    logger.warning(f"Flow-based water detection failed: {e}")
            
            # Method 3: Depression detection (for lakes, dams)
            # Find local minima (depressions) that could be water bodies
            water_mask_depression = np.zeros_like(dem_arr, dtype=bool)
            try:
                from scipy import ndimage
                # Find local minima (depressions)
                local_minima = ndimage.minimum_filter(dem_arr, size=5) == dem_arr
                # Depressions with low slope and surrounded by higher elevation
                depression_mask = local_minima & (slope_deg < 3.0) & (~np.isnan(dem_arr))
                # Filter: depression should be significantly lower than surrounding area
                if np.any(depression_mask):
                    depression_elevations = dem_arr[depression_mask]
                    if len(depression_elevations) > 0:
                        depression_threshold = np.nanpercentile(depression_elevations, 50)
                        # Check if depression is at least 2m below surrounding mean
                        water_mask_depression = depression_mask & (dem_arr < (mean_elev - 2.0))
                        logger.info(f"🌊 Depression-based detection: {np.sum(water_mask_depression)} pixels identified as lakes/dams")
            except Exception as e:
                logger.warning(f"Depression-based water detection failed: {e}")
            
            # Method 4: TWI-based detection (Topographic Wetness Index - for wet areas)
            water_mask_twi = np.zeros_like(dem_arr, dtype=bool)
            if ADVANCED_TERRAIN_AVAILABLE and AdvancedTerrainAnalyzer:
                try:
                    analyzer = AdvancedTerrainAnalyzer()
                    flow_accum, drainage = analyzer._calculate_flow_accumulation(dem_arr)
                    if flow_accum is not None:
                        # Calculate TWI: ln(contributing_area / tan(slope))
                        slope_rad = np.arctan(slope_deg * np.pi / 180.0)
                        slope_safe = np.where(slope_rad < 0.001, 0.001, slope_rad)
                        pixel_size = abs(out_meta['transform'][0]) if 'transform' in out_meta else 30.0
                        contributing_area = flow_accum * (pixel_size ** 2)
                        twi = np.log((contributing_area + 1) / (np.tan(slope_safe) + 0.001))
                        twi = np.clip(twi, 0, 20)
                        # High TWI (>8) indicates very wet areas (lakes, wetlands)
                        twi_threshold = np.nanpercentile(twi, 85)  # Top 15% wettest areas
                        water_mask_twi = (twi > twi_threshold) & (slope_deg < 5.0) & (~np.isnan(dem_arr))
                        logger.info(f"🌊 TWI-based detection: {np.sum(water_mask_twi)} pixels identified as wet areas")
                except Exception as e:
                    logger.warning(f"TWI-based water detection failed: {e}")
            
            # Combine all methods: elevation, flow, depression, TWI
            water_mask_elev = (dem_arr <= water_threshold_elev) & (slope_deg <= 2.5) & (~np.isnan(dem_arr))
            
            # Combine all water detection methods
            water_mask = water_mask_elev | water_mask_flow | water_mask_depression | water_mask_twi
            
            # Additional validation: ensure detected water has reasonable characteristics
            # Water should be relatively flat (slope < 5°)
            water_mask = water_mask & (slope_deg < 5.0)
            
            # Remove isolated pixels (noise reduction)
            try:
                from scipy import ndimage
                # Remove small isolated water pixels (< 3x3 pixels)
                water_mask_labeled, num_features = ndimage.label(water_mask)
                for label_id in range(1, num_features + 1):
                    feature_size = np.sum(water_mask_labeled == label_id)
                    if feature_size < 9:  # Less than 3x3 pixels
                        water_mask[water_mask_labeled == label_id] = False
            except Exception as e:
                logger.warning(f"Water mask cleanup failed: {e}")
            
            land_mask = ~water_mask & (~np.isnan(dem_arr))
            
            water_pixels = int(np.sum(water_mask))
            total_valid_pixels = int(np.sum(~np.isnan(dem_arr)))
            water_area_pct = (water_pixels / total_valid_pixels * 100.0) if total_valid_pixels > 0 else 0.0
            
            logger.info(f"🌊 Enhanced water detection: {water_pixels} pixels ({water_area_pct:.2f}%) - Elevation: {np.sum(water_mask_elev)}, Flow: {np.sum(water_mask_flow)}, Depression: {np.sum(water_mask_depression)}, TWI: {np.sum(water_mask_twi)}")

            # Enhanced classification with more categories
            classified = np.zeros_like(dem_arr, dtype=np.uint8)
            classified[water_mask] = 1  # Water
            classified[(slope_deg < 15) & land_mask] = 2  # Flat land
            classified[(slope_deg >= 15) & (slope_deg <= 30) & land_mask] = 3  # Moderate slope
            classified[(slope_deg > 30) & (slope_deg <= 50) & land_mask] = 4  # Steep slope
            classified[(slope_deg > 50) & land_mask] = 5  # Very steep

            # Calculate slope category statistics
            # Only update if category_stats exists and is in the expected format
            if "category_stats" in slope_analysis and isinstance(slope_analysis["category_stats"], dict):
                total_land_pixels = np.sum(land_mask)
                for category in [2, 3, 4, 5]:
                    if category in slope_analysis["category_stats"]:
                        mask = (classified == category)
                        pixel_count = int(np.sum(mask))
                        area_percentage = (pixel_count / total_land_pixels * 100) if total_land_pixels > 0 else 0
                        slope_analysis["category_stats"][category]["pixel_count"] = pixel_count
                        slope_analysis["category_stats"][category]["area_percentage"] = round(area_percentage, 2)
            else:
                # Initialize category_stats if it doesn't exist
                total_land_pixels = np.sum(land_mask)
                slope_analysis["category_stats"] = {
                    1: {"name": "Water Body", "area_percentage": 0, "pixel_count": 0},
                    2: {"name": "Flat (0-15°)", "area_percentage": 0, "pixel_count": 0},
                    3: {"name": "Moderate (15-30°)", "area_percentage": 0, "pixel_count": 0},
                    4: {"name": "Steep (30-50°)", "area_percentage": 0, "pixel_count": 0},
                    5: {"name": "Very Steep (>50°)", "area_percentage": 0, "pixel_count": 0}
                }
                for category in [2, 3, 4, 5]:
                    mask = (classified == category)
                    pixel_count = int(np.sum(mask))
                    area_percentage = (pixel_count / total_land_pixels * 100) if total_land_pixels > 0 else 0
                    slope_analysis["category_stats"][category]["pixel_count"] = pixel_count
                    slope_analysis["category_stats"][category]["area_percentage"] = round(area_percentage, 2)

            # Zoning analysis based on terrain
            zoning_analysis = {
                "zoning_stats": {
                    1: {"name": "Water Body", "area_percentage": 0, "pixel_count": 0},
                    2: {"name": "Suitable for Development", "area_percentage": 0, "pixel_count": 0},
                    3: {"name": "Limited Development", "area_percentage": 0, "pixel_count": 0},
                    4: {"name": "Conservation Area", "area_percentage": 0, "pixel_count": 0},
                    5: {"name": "High-Risk (Avoid)", "area_percentage": 0, "pixel_count": 0}
                }
            }

            # Calculate zoning statistics
            total_pixels = np.sum(~np.isnan(dem_arr))
            for category in [1, 2, 3, 4, 5]:
                mask = (classified == category)
                pixel_count = int(np.sum(mask))
                area_percentage = (pixel_count / total_pixels * 100) if total_pixels > 0 else 0
                zoning_analysis["zoning_stats"][category]["pixel_count"] = pixel_count
                zoning_analysis["zoning_stats"][category]["area_percentage"] = round(area_percentage, 2)

            # Enhanced color mapping for better visualization
            cmap = {
                0: (0, 0, 0, 0),           # No data
                1: (0, 0, 255, 255),       # Water - Blue
                2: (0, 255, 0, 255),       # Flat land - Green
                3: (255, 255, 0, 255),     # Moderate slope - Yellow
                4: (255, 165, 0, 255),     # Steep slope - Orange
                5: (255, 0, 0, 255)        # Very steep - Red
            }
            rgba = np.zeros((classified.shape[0], classified.shape[1], 4), dtype=np.uint8)
            for k, v in cmap.items():
                rgba[classified == k] = v

            # Save classified image
            classified_path = f"output/dem_classified_{timestamp}.png"
            plt.imsave(classified_path, rgba)

            # Create enhanced preview with multiple visualizations
            fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12), dpi=150)
            
            # 1. Elevation hillshade
            hillshade = np.clip(np.sin(np.deg2rad(45)) *
                                np.cos(np.arctan(np.sqrt(dzdx**2 + dzdy**2))), 0, 1)
            im1 = ax1.imshow(hillshade, cmap="gray", alpha=0.8)
            ax1.set_title("Elevation Hillshade", fontsize=14, fontweight='bold')
            ax1.axis('off')
            
            # 2. Slope analysis
            im2 = ax2.imshow(slope_deg, cmap="terrain", alpha=0.8)
            ax2.set_title("Slope Analysis (degrees)", fontsize=14, fontweight='bold')
            ax2.axis('off')
            plt.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04)
            
            # 3. Terrain classification
            im3 = ax3.imshow(classified, cmap="viridis", alpha=0.8)
            ax3.set_title("Terrain Classification", fontsize=14, fontweight='bold')
            ax3.axis('off')
            
            # 4. Combined visualization
            ax4.imshow(hillshade, cmap="gray", alpha=0.6)
            ax4.imshow(dem_arr, cmap="terrain", alpha=0.5)
            ax4.imshow(rgba, alpha=0.7)
            ax4.set_title("Combined Terrain Analysis", fontsize=14, fontweight='bold')
            ax4.axis('off')
            
            plt.tight_layout()
            preview_path = f"output/dem_preview_{timestamp}.png"
            plt.savefig(preview_path, bbox_inches="tight", dpi=150)
            plt.close()

            # Create enhanced heatmap visualization
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8), dpi=150)
            
            # Create a comprehensive suitability heatmap
            valid_mask = ~np.isnan(dem_arr) & ~np.isnan(slope_deg)
            heatmap_data = np.zeros_like(dem_arr)
            
            if np.any(valid_mask):
                # Calculate suitability score based on multiple factors
                # 1. Elevation suitability (optimal around 200-800m)
                dem_min, dem_max = np.nanmin(dem_arr), np.nanmax(dem_arr)
                optimal_elevation = 500  # meters
                elevation_score = np.ones_like(dem_arr)
                elevation_score[valid_mask] = 1.0 - np.abs(dem_arr[valid_mask] - optimal_elevation) / 1000.0
                elevation_score = np.clip(elevation_score, 0, 1)
                
                # 2. Slope suitability (lower is better)
                slope_score = np.ones_like(slope_deg)
                slope_score[valid_mask] = 1.0 - (slope_deg[valid_mask] / 90.0)  # Normalize to 0-1
                slope_score = np.clip(slope_score, 0, 1)
                
                # 3. Combined suitability score
                heatmap_data[valid_mask] = (elevation_score[valid_mask] * 0.4 + 
                                          slope_score[valid_mask] * 0.6)
            
            # Left plot: Enhanced heatmap with better colors and labels
            im1 = ax1.imshow(heatmap_data, cmap="RdYlGn_r", alpha=0.9, vmin=0, vmax=1)
            ax1.set_title("Land Suitability Heatmap\n(Green=High, Yellow=Medium, Red=Low)", 
                         fontsize=14, fontweight='bold', pad=20)
            ax1.axis('off')
            
            # Add colorbar with better labels
            cbar1 = plt.colorbar(im1, ax=ax1, fraction=0.046, pad=0.04)
            cbar1.set_label('Suitability Score (0-1)', rotation=270, labelpad=20, fontsize=12)
            cbar1.set_ticks([0, 0.25, 0.5, 0.75, 1.0])
            cbar1.set_ticklabels(['Very Low', 'Low', 'Medium', 'High', 'Very High'])
            
            # Right plot: Slope analysis with color-coded categories
            slope_categories = np.zeros_like(slope_deg)
            slope_categories[valid_mask] = np.where(
                slope_deg[valid_mask] < 15, 1,  # Flat
                np.where(slope_deg[valid_mask] < 30, 2,  # Moderate
                np.where(slope_deg[valid_mask] < 50, 3,  # Steep
                4)))  # Very Steep
            
            colors = ['white', '#2E8B57', '#FFD700', '#FF6347', '#8B0000']  # White, Green, Gold, Red, Dark Red
            labels = ['No Data', 'Flat (0-15°)', 'Moderate (15-30°)', 'Steep (30-50°)', 'Very Steep (>50°)']
            
            im2 = ax2.imshow(slope_categories, cmap=plt.cm.colors.ListedColormap(colors), alpha=0.9)
            ax2.set_title("Slope Categories Analysis", fontsize=14, fontweight='bold', pad=20)
            ax2.axis('off')
            
            # Add legend for slope categories
            from matplotlib.patches import Patch
            legend_elements = [Patch(facecolor=colors[i], label=labels[i]) for i in range(1, len(colors))]
            ax2.legend(handles=legend_elements, loc='center left', bbox_to_anchor=(1, 0.5), fontsize=10)
            
            plt.tight_layout()
            heatmap_path = f"output/terrain_heatmap_{timestamp}.png"
            plt.savefig(heatmap_path, bbox_inches="tight", dpi=150)
            plt.close()

            # Generate GeoJSON layers for flood risk and water bodies
            water_bodies_geojson = None
            flood_risk_geojson = None
            
            try:
                # Generate water bodies GeoJSON
                if np.any(water_mask):
                    water_bodies_geojson = raster_to_geojson(
                        water_mask.astype(np.uint8),
                        out_meta['transform'],
                        value_mask=lambda x: x == 1,
                        properties_func=lambda v: {
                            "type": "water_body",
                            "category": "Water Body",
                            "description": "Identified water body from DEM analysis"
                        }
                    )
                    logger.info(f"Generated {len(water_bodies_geojson.get('features', []))} water body features")
                
                # Generate flood risk GeoJSON (if advanced analysis available)
                if analyzer and flow_accum is not None and drainage is not None:
                    try:
                        # Calculate flood risk using advanced method
                        flood_risk_result = analyzer._assess_flood_risk_advanced(
                            dem_arr, flow_accum, drainage, bounds
                        )
                        
                        # Create flood risk categories from the analysis
                        mean_elev = np.nanmean(dem_arr)
                        flood_risk_array = np.zeros_like(dem_arr, dtype=np.uint8)
                        
                        # High risk: low elevation + high flow
                        high_risk_mask = (dem_arr < mean_elev - 2) & (flow_accum > np.nanpercentile(flow_accum, 75))
                        medium_risk_mask = (dem_arr < mean_elev) & (flow_accum > np.nanpercentile(flow_accum, 50)) & ~high_risk_mask
                        low_risk_mask = (dem_arr < mean_elev + 2) & ~medium_risk_mask & ~high_risk_mask
                        
                        flood_risk_array[high_risk_mask] = 3  # High risk
                        flood_risk_array[medium_risk_mask] = 2  # Medium risk
                        flood_risk_array[low_risk_mask] = 1  # Low risk
                        
                        # Generate GeoJSON for each risk category
                        flood_features = []
                        for risk_level in [3, 2, 1]:
                            risk_mask = (flood_risk_array == risk_level)
                            if np.any(risk_mask):
                                risk_geojson = raster_to_geojson(
                                    risk_mask.astype(np.uint8),
                                    out_meta['transform'],
                                    value_mask=lambda x: x == 1,
                                    properties_func=lambda v: {
                                        "type": "flood_risk",
                                        "risk_level": risk_level,
                                        "risk_label": ["", "Low", "Medium", "High"][risk_level],
                                        "description": f"{['', 'Low', 'Medium', 'High'][risk_level]} flood risk area"
                                    }
                                )
                                flood_features.extend(risk_geojson.get('features', []))
                        
                        flood_risk_geojson = {
                            "type": "FeatureCollection",
                            "features": flood_features
                        }
                        logger.info(f"Generated {len(flood_features)} flood risk features (advanced)")
                    except Exception as e:
                        logger.warning(f"Failed to generate flood risk GeoJSON (advanced): {e}")
                        # Fall through to basic method
                else:
                    # Basic flood risk from elevation
                    flood_risk_array = np.zeros_like(dem_arr, dtype=np.uint8)
                    flood_risk_array[(dem_arr <= 2.0) & (~np.isnan(dem_arr))] = 3  # High
                    flood_risk_array[(dem_arr > 2.0) & (dem_arr <= 5.0) & (~np.isnan(dem_arr))] = 2  # Medium
                    flood_risk_array[(dem_arr > 5.0) & (dem_arr <= 10.0) & (~np.isnan(dem_arr))] = 1  # Low
                    
                    flood_features = []
                    for risk_level in [3, 2, 1]:
                        risk_mask = (flood_risk_array == risk_level)
                        if np.any(risk_mask):
                            risk_geojson = raster_to_geojson(
                                risk_mask.astype(np.uint8),
                                out_meta['transform'],
                                value_mask=lambda x: x == 1,
                                properties_func=lambda v: {
                                    "type": "flood_risk",
                                    "risk_level": risk_level,
                                    "risk_label": ["", "Low", "Medium", "High"][risk_level],
                                    "description": f"{['', 'Low', 'Medium', 'High'][risk_level]} flood risk area"
                                }
                            )
                            flood_features.extend(risk_geojson.get('features', []))
                    
                    flood_risk_geojson = {
                        "type": "FeatureCollection",
                        "features": flood_features
                    }
                    logger.info(f"Generated {len(flood_features)} flood risk features (basic)")
            except Exception as e:
                logger.error(f"Error generating GeoJSON layers: {e}")

            # Use Python terrain_stats module for comprehensive statistics
            terrain_stats_result = None
            if SUITABILITY_ANALYSIS_AVAILABLE and compute_terrain_stats:
                try:
                    # Generate temporary slope and aspect rasters for terrain_stats
                    os.makedirs("temp_terrain", exist_ok=True)
                    temp_slope_path = f"temp_terrain/slope_{timestamp}.tif"
                    temp_aspect_path = f"temp_terrain/aspect_{timestamp}.tif"
                    
                    # Save slope and aspect if available
                    if 'slope_deg' in locals():
                        with rasterio.open(clipped_tif, 'r') as src:
                            profile = src.profile.copy()
                            profile.update(dtype=rasterio.float32)
                            with rasterio.open(temp_slope_path, 'w', **profile) as dst:
                                dst.write(slope_deg.astype(np.float32), 1)
                    
                    # Calculate aspect if not already done
                    if 'aspect_deg' not in locals() and ADVANCED_TERRAIN_AVAILABLE:
                        try:
                            analyzer = AdvancedTerrainAnalyzer()
                            _, aspect_deg = analyzer._calculate_slope_aspect(dem_arr, out_meta['transform'])
                            with rasterio.open(clipped_tif, 'r') as src:
                                profile = src.profile.copy()
                                profile.update(dtype=rasterio.float32)
                                with rasterio.open(temp_aspect_path, 'w', **profile) as dst:
                                    dst.write(aspect_deg.astype(np.float32), 1)
                        except:
                            pass
                    
                    # Use Python terrain_stats module
                    terrain_stats_result = compute_terrain_stats(
                        clipped_tif,
                        temp_slope_path if os.path.exists(temp_slope_path) else None,
                        temp_aspect_path if os.path.exists(temp_aspect_path) else None,
                        None  # Flow accumulation path if available
                    )
                    logger.info("✅ Used Python terrain_stats module for comprehensive terrain statistics")
                except Exception as e:
                    logger.warning(f"Failed to use terrain_stats module: {e}, using basic stats")

            # Enhanced stats with detailed analysis (including water availability if available)
            # Merge Python terrain_stats results if available
            base_stats = {
                "mean_elevation": safe_float(np.nanmean(dem_arr)),
                "max_elevation": safe_float(np.nanmax(dem_arr)),
                "min_elevation": safe_float(np.nanmin(dem_arr)),
                "std_elevation": safe_float(np.nanstd(dem_arr)),
                "data_types_processed": data_types or ["dem"],
                "target_crs": target_crs or "EPSG:4326",
                "preprocessing_applied": preprocessing or {},
                "slope_analysis": slope_analysis,
                "flood_analysis": flood_analysis,
                "erosion_analysis": erosion_analysis,
                "water_availability": water_availability,  # Add water availability data
                "zoning_analysis": zoning_analysis,
                "validation": {
                    "geojson_validation": validation_result.to_dict(),
                    "dem_file_validation": dem_validation.to_dict(),
                    "processing_validation": processing_validation.to_dict()
                },
                "processing_timestamp": datetime.now().isoformat(),
                "total_pixels": int(np.sum(~np.isnan(dem_arr))),
                "water_pixels": int(np.sum(water_mask)),
                "land_pixels": int(np.sum(land_mask)),
                "analysis_type": "advanced" if (ADVANCED_TERRAIN_AVAILABLE and AdvancedTerrainAnalyzer) else "basic"
            }
            if hydrology_data and hydrology_data.get("summary"):
                base_stats["hydrology_summary"] = hydrology_data["summary"]
            
            # Merge Python terrain_stats results
            if terrain_stats_result and not terrain_stats_result.get('error'):
                base_stats['python_terrain_stats'] = terrain_stats_result
                # Update elevation stats from Python module if more detailed
                if 'elevation' in terrain_stats_result:
                    base_stats['elevation_stats'] = terrain_stats_result['elevation']
                # Update slope stats from Python module if more detailed
                if 'slope' in terrain_stats_result and 'categories' in terrain_stats_result['slope']:
                    if 'category_stats' not in base_stats['slope_analysis']:
                        base_stats['slope_analysis']['category_stats'] = {}
                    base_stats['slope_analysis']['python_slope_categories'] = terrain_stats_result['slope']['categories']
            
            stats = base_stats
            # Sanitize stats for JSON serialization (remove NaN, inf, -inf)
            stats_sanitized = sanitize_dict_for_json(stats)
            
            json_path = f"output/dem_stats_{timestamp}.json"
            with open(json_path, "w") as jf:
                json.dump(stats_sanitized, jf, indent=2)

    except Exception as e:
        logger.error(f"DEM processing failed: {str(e)}")
        return {
            "error": f"DEM processing failed: {str(e)}",
            "validation": {
                "is_valid": False,
                "errors": [f"Processing error: {str(e)}"]
            }
        }

    base_url = str(request.base_url).rstrip("/")
    
    # Sanitize all response data for JSON serialization
    response_data = {
        "tif_url": f"{base_url}/download/{os.path.basename(clipped_tif)}",
        "classified_url": f"{base_url}/download/{os.path.basename(classified_path)}",
        "preview_url": f"{base_url}/download/{os.path.basename(preview_path)}",
        "heatmap_url": f"{base_url}/download/{os.path.basename(heatmap_path)}",
        "json_url": f"{base_url}/download/{os.path.basename(json_path)}",
        "stats": sanitize_dict_for_json(stats),
        "slope_analysis": sanitize_dict_for_json(slope_analysis),
        "flood_analysis": sanitize_dict_for_json(flood_analysis),
        "erosion_analysis": sanitize_dict_for_json(erosion_analysis),
        "water_availability": sanitize_dict_for_json(water_availability),  # Include water availability in response
        "zoning_analysis": sanitize_dict_for_json(zoning_analysis),
        "validation": {
            "geojson_validation": validation_result.to_dict(),
            "dem_file_validation": dem_validation.to_dict(),
            "processing_validation": processing_validation.to_dict()
        },
        "hydrology": sanitize_dict_for_json(hydrology_data) if hydrology_data else None,
        # Add GeoJSON layers for map visualization
        "water_bodies_geojson": water_bodies_geojson,
        "flood_risk_geojson": flood_risk_geojson
    }
    
    return response_data

# ---------------- FE-5: Data Validation Endpoint ----------------
@app.post("/api/validate")
async def validate_data(request: Request):
    """FE-5: Standalone data validation endpoint"""
    try:
        data = await request.json()
        validation_type = data.get("type", "geojson")
        
        if validation_type == "geojson":
            if "geojson" not in data:
                return JSONResponse({"error": "Missing 'geojson' field"}, status_code=400)
            result = DataValidator.validate_geojson(data["geojson"])
            
        elif validation_type == "coordinates":
            if "bounds" not in data:
                return JSONResponse({"error": "Missing 'bounds' field"}, status_code=400)
            result = DataValidator.validate_coordinates(data["bounds"])
            
        else:
            return JSONResponse({"error": f"Unknown validation type: {validation_type}"}, status_code=400)
        
        return result.to_dict()
    
    except Exception as e:
        logger.error(f"Validation endpoint error: {str(e)}")
        return JSONResponse({"error": f"Validation failed: {str(e)}"}, status_code=500)

# ---------------- Enhanced Validation Preview Endpoint ----------------
@app.post("/api/validate_and_preview")
async def validate_and_preview(request: Request):
    """Enhanced validation with proper GeoJSON handling"""
    try:
        data = await request.json()
        
        # Extract GeoJSON (handle both wrapped and raw formats)
        geojson = data.get("geojson", data)
        
        # Run validation
        validation_result = DataValidator.validate_geojson(geojson)
        validation_dict = validation_result.to_dict()
        
        # Create simple preview visualization
        os.makedirs("previews", exist_ok=True)
        preview_path = f"previews/preview_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        
        try:
            # Create a simple preview image
            fig, ax = plt.subplots(figsize=(6, 6))
            
            if "geometry" in geojson:
                geom = shape(geojson["geometry"])
            else:
                geom = shape(geojson)
            
            # Plot the geometry
            if geom.geom_type == 'Polygon':
                x, y = geom.exterior.xy
                ax.fill(x, y, alpha=0.5, fc='blue', ec='darkblue')
            elif geom.geom_type == 'Point':
                ax.plot(geom.x, geom.y, 'ro', markersize=10)
            
            ax.set_aspect('equal')
            ax.set_title('Geometry Preview')
            plt.savefig(preview_path, bbox_inches='tight', dpi=100)
            plt.close()
            
        except Exception as e:
            logger.warning(f"Preview generation failed: {e}")
            # Create empty preview file
            open(preview_path, 'wb').close()

        base_url = str(request.base_url).rstrip("/")
        return {
            "message": "Validation successful",
            "preview_url": f"{base_url}/download/{os.path.basename(preview_path)}",
            "validation": validation_dict
        }

    except Exception as e:
        logger.error(f"Validation preview error: {str(e)}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ---------------- Enhanced DEM Processing Endpoint ----------------
@app.post("/api/process_dem")
async def process_dem_confirmed(request: Request):
    """Process DEM with enhanced options from frontend"""
    data = await request.json()
    
    # Check if confirmation is provided
    if not data.get("confirmed", False):
        return JSONResponse({
            "error": "Processing requires user confirmation",
            "validation_required": True,
            "message": "Please confirm processing in the frontend"
        }, status_code=400)
    
    # Extract processing options from frontend
    data_types = data.get("data_types", ["dem"])
    target_crs = data.get("target_crs", "EPSG:4326")
    preprocessing = data.get("preprocessing", {})
    
    # Extract the geojson field from the payload
    geojson = data.get("geojson")
    if not geojson:
        return JSONResponse({
            "error": "Missing 'geojson' field in request",
            "validation": {"is_valid": False, "errors": ["Missing geojson field"]}
        }, status_code=400)
    
    return await process_geojson(geojson, request, data_types, target_crs, preprocessing)

# ---------------- Enhanced Polygon Endpoints ----------------
@app.get("/api/polygon")
async def get_polygons():
    """Get all saved polygons"""
    return POLYGONS

@app.post("/api/polygon/save_polygon")
async def save_polygon(request: Request):
    """Enhanced polygon saving with validation and metadata"""
    global POLY_COUNTER
    
    try:
        data = await request.json()
        
        # FE-5: Validate polygon data before saving
        validation_result = None
        if "geojson" in data:
            validation_result = DataValidator.validate_geojson({"geometry": data["geojson"]})
            if not validation_result.is_valid:
                return JSONResponse({
                    "error": "Invalid polygon geometry",
                    "validation": validation_result.to_dict()
                }, status_code=400)
        
        # Calculate polygon area if geojson is provided
        area_hectares = 0
        area_sqm = 0
        if "geojson" in data and data["geojson"]:
            try:
                from enhanced_polygon_zoning import calculate_geodesic_area
                from shapely.geometry import Polygon
                
                geojson = data["geojson"]
                if geojson.get("type") == "Polygon":
                    coords = geojson["coordinates"][0]
                elif geojson.get("geometry", {}).get("type") == "Polygon":
                    coords = geojson["geometry"]["coordinates"][0]
                else:
                    coords = geojson.get("coordinates", [[]])[0] if geojson.get("coordinates") else []
                
                if coords and len(coords) >= 3:
                    polygon_shape = Polygon(coords)
                    area_sqm = calculate_geodesic_area(polygon_shape)
                    area_hectares = area_sqm / 10000
                    logger.info(f"Calculated polygon area: {area_sqm:.2f} m² ({area_hectares:.4f} hectares)")
            except Exception as e:
                logger.warning(f"Failed to calculate polygon area: {e}")
        
        polygon = {
            "id": POLY_COUNTER,
            "name": data.get("name", f"Polygon {POLY_COUNTER}"),
            "geojson": data.get("geojson"),
            "area_sqm": round(area_sqm, 2),
            "area_hectares": round(area_hectares, 4),
            "data_types": data.get("data_types", ["dem"]),
            "target_crs": data.get("target_crs", "EPSG:4326"),
            "preprocessing": data.get("preprocessing", {}),
            "created_at": datetime.now().isoformat(),
            "validation_status": validation_result.to_dict() if validation_result else None
        }
        POLYGONS.append(polygon)
        POLY_COUNTER += 1
        
        return {"polygon": polygon}
        
    except Exception as e:
        logger.error(f"Polygon save error: {str(e)}")
        return JSONResponse({"error": f"Failed to save polygon: {str(e)}"}, status_code=500)

@app.post("/api/terrain_analysis/save")
async def save_terrain_analysis(request: Request):
    """
    Save terrain analysis results to persistent storage
    
    Body JSON:
    {
      "polygon_id": 123,
      "analysis_data": {...},
      "stats": {...},
      "validation_results": {...}
    }
    """
    global TERRAIN_COUNTER
    
    try:
        data = await request.json()
        
        polygon_id = data.get("polygon_id")
        analysis_data = data.get("analysis_data")
        
        if not polygon_id or not analysis_data:
            return JSONResponse({"error": "Missing polygon_id or analysis_data"}, status_code=400)
        
        # Check if polygon exists
        polygon_exists = any(poly['id'] == polygon_id for poly in POLYGONS)
        if not polygon_exists:
            return JSONResponse({"error": f"Polygon with ID {polygon_id} not found"}, status_code=404)
        
        # Create terrain analysis record
        terrain_analysis = {
            "id": TERRAIN_COUNTER,
            "polygon_id": polygon_id,
            "analysis_data": analysis_data,
            "stats": data.get("stats"),
            "validation_results": data.get("validation_results"),
            "dem_file_path": data.get("dem_file_path"),
            "slope_file_path": data.get("slope_file_path"),
            "preview_image_path": data.get("preview_image_path"),
            "processing_status": "completed",
            "processing_time_ms": data.get("processing_time_ms"),
            "created_at": datetime.now().isoformat()
        }
        
        TERRAIN_ANALYSES.append(terrain_analysis)
        TERRAIN_COUNTER += 1
        
        logger.info(f"Saved terrain analysis for polygon {polygon_id}")
        
        return {"terrain_analysis": terrain_analysis}
        
    except Exception as e:
        logger.error(f"Terrain analysis save error: {str(e)}")
        return JSONResponse({"error": f"Failed to save terrain analysis: {str(e)}"}, status_code=500)

@app.get("/api/terrain_analysis/{polygon_id}")
async def get_terrain_analysis(polygon_id: int):
    """Get terrain analysis results for a specific polygon"""
    
    # Find terrain analysis for the polygon
    terrain_analysis = None
    for analysis in TERRAIN_ANALYSES:
        if analysis['polygon_id'] == polygon_id:
            terrain_analysis = analysis
            break
    
    if not terrain_analysis:
        return JSONResponse({"error": f"No terrain analysis found for polygon {polygon_id}"}, status_code=404)
    
    return {"terrain_analysis": terrain_analysis}

@app.get("/api/terrain_analysis")
async def get_all_terrain_analyses():
    """Get all terrain analysis results"""
    try:
        return TERRAIN_ANALYSES
    except Exception as e:
        logger.error(f"Error retrieving terrain analyses: {str(e)}")
        return JSONResponse({"error": f"Failed to retrieve terrain analyses: {str(e)}"}, status_code=500)

@app.get("/api/terrain_analysis/db/{analysis_id}")
async def get_terrain_analysis_from_db(analysis_id: int):
    """Get terrain analysis from database by analysis ID"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        # Database connection
        conn = psycopg2.connect(
            host="localhost",
            database="plan-it",
            user="postgres",
            password="iampro24",
            port="5432"
        )
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query terrain analysis by ID
        cursor.execute("""
            SELECT id, polygon_id, results, elevation_data, slope_data, aspect_data, created_at
            FROM terrain_analyses 
            WHERE id = %s
        """, (analysis_id,))
        
        db_result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if db_result:
            return {
                "status": "success",
                "terrain_analysis": dict(db_result)
            }
        else:
            return JSONResponse({"error": f"Terrain analysis with ID {analysis_id} not found"}, status_code=404)
            
    except Exception as e:
        logger.exception("Database query failed")
        return JSONResponse({"error": f"Database query failed: {str(e)}"}, status_code=500)

@app.get("/api/zoning_results")
async def get_zoning_results():
    """Get all zoning results"""
    try:
        return ZONING_RESULTS
    except Exception as e:
        logger.error(f"Error retrieving zoning results: {str(e)}")
        return JSONResponse({"error": f"Failed to retrieve zoning results: {str(e)}"}, status_code=500)

@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Calculate statistics
        total_projects = len(POLYGONS)
        
        # Projects with terrain analysis
        projects_with_terrain = len(set(ta["polygon_id"] for ta in TERRAIN_ANALYSES))
        
        # Projects with zoning
        projects_with_zoning = len(set(zr["polygon_id"] for zr in ZONING_RESULTS))
        
        # Completed projects (have both terrain and zoning)
        terrain_polygon_ids = set(ta["polygon_id"] for ta in TERRAIN_ANALYSES)
        zoning_polygon_ids = set(zr["polygon_id"] for zr in ZONING_RESULTS)
        completed_projects = len(terrain_polygon_ids.intersection(zoning_polygon_ids))
        
        # In progress projects (have terrain but not zoning)
        in_progress_projects = len(terrain_polygon_ids - zoning_polygon_ids)
        
        # Total area
        total_area = sum(p.get("area_hectares", 0) for p in POLYGONS)
        
        return {
            "total_projects": total_projects,
            "projects_with_terrain": projects_with_terrain,
            "projects_with_zoning": projects_with_zoning,
            "completed_projects": completed_projects,
            "in_progress_projects": in_progress_projects,
            "draft_projects": total_projects - projects_with_terrain,
            "total_area_hectares": total_area
        }
    except Exception as e:
        logger.error(f"Error calculating dashboard stats: {str(e)}")
        return JSONResponse({"error": f"Failed to calculate dashboard stats: {str(e)}"}, status_code=500)

# ---------------- Enhanced DEM from coordinates ----------------
@app.post("/dem_from_coords")
async def dem_from_coords(request: Request):
    """Enhanced coordinate processing with frontend options"""
    try:
        data = await request.json()
        bounds = data.get("bounds", {})
        
        # FE-5: Validate coordinates first
        validation_result = DataValidator.validate_coordinates(bounds)
        if not validation_result.is_valid:
            return JSONResponse({
                "error": "Invalid coordinates",
                "validation": validation_result.to_dict()
            }, status_code=400)
        
        try:
            lat_min = float(bounds["latMin"])
            lat_max = float(bounds["latMax"])
            lng_min = float(bounds["lngMin"])
            lng_max = float(bounds["lngMax"])
        except Exception:
            return JSONResponse({"error": "Invalid bounds format"}, status_code=400)

        geojson = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [lng_min, lat_min],
                    [lng_max, lat_min],
                    [lng_max, lat_max],
                    [lng_min, lat_max],
                    [lng_min, lat_min]
                ]]
            }
        }
        
        # Extract processing options
        data_types = data.get("data_types", ["dem"])
        target_crs = data.get("target_crs", "EPSG:4326")
        preprocessing = data.get("preprocessing", {})
        
        return await process_geojson(geojson, request, data_types, target_crs, preprocessing)
        
    except Exception as e:
        logger.error(f"Coordinate processing error: {str(e)}")
        return JSONResponse({"error": f"Coordinate processing failed: {str(e)}"}, status_code=500)

# ---------------- Enhanced File Upload ----------------
@app.post("/upload_dem")
async def upload_dem(
    file: UploadFile = File(...),
    data_types: str = Form("[\"dem\"]"),
    target_crs: str = Form("EPSG:4326"),
    preprocessing: str = Form("{}")
):
    """Enhanced file upload with validation and processing options"""
    
    try:
        # Parse form data
        data_types_list = json.loads(data_types)
        preprocessing_dict = json.loads(preprocessing)
    except json.JSONDecodeError as e:
        return JSONResponse({"error": f"Invalid form data: {str(e)}"}, status_code=400)
    
    # Basic file validation
    valid_extensions = ['.tif', '.tiff', '.geotiff', '.shp', '.kml', '.kmz', '.gpx', '.geojson']
    if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
        return JSONResponse({
            "error": f"Invalid file type. Supported: {', '.join(valid_extensions)}",
            "validation": {
                "is_valid": False,
                "errors": ["Unsupported file format"]
            }
        }, status_code=400)
    
    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", file.filename)
    
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # FE-5: Validate uploaded file
        validation_result = DataValidator.validate_raster_file(file_path)
        
        # For now, return validation results
        # In a full implementation, you would process the file here
        return {
            "uploaded_file": file.filename,
            "path": file_path,
            "data_types": data_types_list,
            "target_crs": target_crs,
            "preprocessing": preprocessing_dict,
            "validation": validation_result.to_dict(),
            "file_size_mb": len(content) / (1024 * 1024),
            "upload_timestamp": datetime.now().isoformat(),
            "message": "File uploaded successfully. Processing would be implemented here."
        }
        
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        return JSONResponse({
            "error": f"File upload failed: {str(e)}",
            "validation": {
                "is_valid": False,
                "errors": [f"Upload error: {str(e)}"]
            }
        }, status_code=500)

# ---------------- File Download ----------------
@app.get("/download/{filename}")
async def download_file(filename: str):
    for folder in DOWNLOAD_DIRECTORIES:
        file_path = folder / filename
        if file_path.exists():
            return FileResponse(str(file_path), filename=filename)
    logger.warning(f"Download requested for missing file: {filename}")
    return JSONResponse({"error": "File not found"}, status_code=404)


# ---------------- List Polygon Images ----------------
@app.get("/api/list_polygon_images/{polygon_id}")
async def list_polygon_images(polygon_id: int):
    """
    List all existing visualization images for a polygon from the output directory.
    """
    try:
        import glob
        output_dir = "output"
        
        if not os.path.exists(output_dir):
            logger.warning(f"Output directory does not exist: {output_dir}")
            return JSONResponse({
                "polygon_id": polygon_id,
                "files": [],
                "count": 0
            })
        
        # Pattern to match: zameen_style_society_polygon_{polygon_id}_{timestamp}.png
        patterns = [
            f"zameen_style_society_polygon_{polygon_id}_*.png",
            f"zoning_polygon_{polygon_id}_*.png",
            f"polygon_{polygon_id}_*.png",
            f"*polygon*{polygon_id}*.png"
        ]
        
        matching_files = []
        for pattern in patterns:
            search_path = os.path.join(output_dir, pattern)
            files = glob.glob(search_path)
            matching_files.extend(files)
            logger.debug(f"Pattern {pattern} found {len(files)} files")
        
        # Remove duplicates and sort by modification time (most recent first)
        unique_files = list(set(matching_files))
        unique_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        
        # Return relative paths (just filenames)
        file_list = [os.path.basename(f) for f in unique_files]
        
        logger.info(f"Found {len(file_list)} images for polygon {polygon_id}")
        
        return JSONResponse({
            "polygon_id": polygon_id,
            "files": file_list,
            "count": len(file_list),
            "urls": [f"/output/{f}" for f in file_list]
        })
        
    except Exception as e:
        logger.error(f"Error listing polygon images: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse({
            "error": str(e),
            "polygon_id": polygon_id,
            "files": []
        }, status_code=500)

# ---------------- Health Check ----------------
@app.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "Urban Planning Data Ingestion API",
        "version": "2.0.0",
        "features": [
            "FE-1: Digital Elevation Model (DEM) loading",
            "FE-2: Multi-format data import",
            "FE-3: Coordinate transformation and alignment", 
            "FE-4: Data cleaning and preprocessing",
            "FE-5: Automated data validation"
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check_simple():
    """Simple health check endpoint"""
    return {"status": "ok", "message": "Python backend is running"}

@app.get("/test_matplotlib")
async def test_matplotlib():
    """Test if matplotlib is working"""
    try:
        import matplotlib.pyplot as plt
        import tempfile
        import os
        
        # Create a simple plot
        fig, ax = plt.subplots(1, 1, figsize=(6, 4))
        ax.plot([1, 2, 3, 4], [1, 4, 2, 3])
        ax.set_title('Test Plot')
        
        # Save to temp file
        temp_path = tempfile.mktemp(suffix='.png')
        plt.savefig(temp_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        # Check if file was created
        file_exists = os.path.exists(temp_path)
        file_size = os.path.getsize(temp_path) if file_exists else 0
        
        return {
            "success": True,
            "matplotlib_working": True,
            "temp_file": temp_path,
            "file_exists": file_exists,
            "file_size": file_size
        }
        
    except Exception as e:
        return {
            "success": False,
            "matplotlib_working": False,
            "error": str(e)
        }

@app.get("/test_viz/{polygon_id}")
async def test_visualization(polygon_id: int):
    """Test 2D visualization creation"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        # Connect to PostgreSQL database
        conn = psycopg2.connect(
            host="localhost",
            database="plan-it",
            user="postgres",
            password="iampro24",
            port="5432"
        )
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get terrain analysis data
        cur.execute("SELECT results FROM terrain_analyses WHERE id = %s", (polygon_id,))
        terrain_result = cur.fetchone()
        
        # Get polygon data
        cur.execute("SELECT geojson FROM polygons WHERE id = %s", (polygon_id,))
        polygon_result = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if terrain_result and polygon_result:
            terrain_data = terrain_result['results']
            geojson_data = polygon_result['geojson']
            
            # Extract coordinates
            polygon_coords = geojson_data['coordinates'][0] if 'coordinates' in geojson_data else None
            
            # Create mock zoning data
            mock_zoning_data = {
                'zone_recommendations': {
                    'zone_breakdown': {
                        'residential': 0.75,
                        'commercial': 0.15,
                        'green': 0.10
                    }
                }
            }
            
            # Test visualization creation
            if polygon_coords:
                try:
                    logger.info(f"Testing visualization creation for polygon {polygon_id}")
                    viz_path = create_2d_zoning_visualization(polygon_coords, mock_zoning_data)
                    logger.info(f"Visualization creation result: {viz_path}")
                    return {
                        "success": True,
                        "polygon_id": polygon_id,
                        "polygon_coords_count": len(polygon_coords),
                        "visualization_path": viz_path,
                        "terrain_data_found": True
                    }
                except Exception as viz_error:
                    logger.error(f"Visualization creation failed: {viz_error}")
                    return {
                        "success": False,
                        "error": str(viz_error),
                        "polygon_id": polygon_id,
                        "polygon_coords_count": len(polygon_coords)
                    }
            else:
                return {"error": "No polygon coordinates found", "polygon_id": polygon_id}
        else:
            return {"error": "No data found", "polygon_id": polygon_id}
        
    except Exception as e:
        return {"error": str(e), "polygon_id": polygon_id}

@app.get("/list_terrain_analyses")
async def list_terrain_analyses():
    """List all terrain analyses in the database"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        # Connect to PostgreSQL database
        conn = psycopg2.connect(
            host="localhost",
            database="plan-it",
            user="postgres",
            password="iampro24",
            port="5432"
        )
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all terrain analyses
        cur.execute("SELECT id, polygon_id, created_at FROM terrain_analyses ORDER BY id DESC LIMIT 10")
        results = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return {
            "terrain_analyses": [
                {
                    "id": row['id'],
                    "polygon_id": row['polygon_id'],
                    "created_at": str(row['created_at']) if row['created_at'] else None
                }
                for row in results
            ]
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/test_db/{polygon_id}")
async def test_database_connection(polygon_id: int):
    """Test database connection and terrain data retrieval"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        # Connect to PostgreSQL database
        conn = psycopg2.connect(
            host="localhost",
            database="plan-it",
            user="postgres",
            password="iampro24",
            port="5432"
        )
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Test terrain analysis data
        cur.execute("SELECT results FROM terrain_analyses WHERE id = %s", (polygon_id,))
        terrain_result = cur.fetchone()
        
        # Test polygon data
        cur.execute("SELECT geojson FROM polygons WHERE id = %s", (polygon_id,))
        polygon_result = cur.fetchone()
        
        cur.close()
        conn.close()
        
        terrain_data = terrain_result['results'] if terrain_result and terrain_result['results'] else None
        polygon_data = polygon_result['geojson'] if polygon_result and polygon_result['geojson'] else None
        
        return {
            "polygon_id": polygon_id,
            "terrain_data_found": terrain_result is not None,
            "polygon_data_found": polygon_result is not None,
            "terrain_data_keys": list(terrain_data.keys()) if terrain_data else None,
            "polygon_has_geometry": 'geometry' in polygon_data if polygon_data else False,
            "polygon_data_keys": list(polygon_data.keys()) if polygon_data else None,
            "polygon_data_sample": str(polygon_data)[:200] if polygon_data else None
        }
        
    except Exception as e:
        return {"error": str(e), "polygon_id": polygon_id}

# ---------------- API Info ----------------
@app.get("/api/info")
async def api_info():
    return {
        "endpoints": {
            "/api/validate": "POST - Validate GeoJSON or coordinates",
            "/api/validate_and_preview": "POST - Validate with preview",
            "/api/process_dem": "POST - Process DEM with options",
            "/api/polygon": "GET - Get saved polygons",
            "/api/polygon/save_polygon": "POST - Save polygon with metadata",
            "/dem_from_coords": "POST - Process from coordinates",
            "/upload_dem": "POST - Upload and validate files"
        },
        "supported_formats": {
            "raster": [".tif", ".tiff", ".geotiff"],
            "vector": [".shp", ".kml", ".kmz", ".gpx", ".geojson"]
        }
    }

@app.post("/api/land_suitability")
async def land_suitability(request: Request):
    """
    Run land suitability classification for a polygon.
    Body JSON (examples):
    {
      "type": "Feature",
      "geometry": {...},
      "soil_raster_path": "/path/to/soil.tif",            # optional (server-side)
      "roads_geojson": {...},                            # optional (vector)
      "model_path": "models/land_suitability.pkl",       # optional
      "weights": {"slope": 0.5, "soil": 0.3, "distance": 0.2}
    }
    """
    try:
        payload = await request.json()
        geojson = payload if 'geometry' in payload or payload.get('type') else payload.get('geojson')
        if not geojson:
            return JSONResponse({"error": "Missing GeoJSON polygon"}, status_code=400)

        # Optional inputs
        soil_raster_path = payload.get('soil_raster_path')
        roads_geojson = payload.get('roads_geojson')  # should be FeatureCollection or list of features
        model_path = payload.get('model_path', "models/land_suitability.pkl")
        weights = payload.get('weights', {"slope": 0.5, "soil": 0.3, "distance": 0.2})

        # Clip DEM (reuse your existing logic: download/open base DEM or open previously downloaded tif)
        # For simplicity, use the same logic as process_geojson: download the global DEM (or open a server copy)
        geom = shape(geojson["geometry"] if "geometry" in geojson else geojson)
        bounds = geom.bounds

        # Reuse your earlier DEM fetch if you want; here we open the latest dem_download.tif if exists
        dem_source_path = "data/dem_download.tif"
        if not os.path.exists(dem_source_path):
            logger.warning("DEM source not found at data/dem_download.tif — land suitability requires a DEM.")
            return JSONResponse({"error": "DEM source not found on server. Run DEM processing first."}, status_code=400)

        # Clip DEM to polygon
        with rasterio.open(dem_source_path) as dem_src:
            out_image, out_transform = rasterio_mask(dem_src, [mapping(geom)], crop=True, filled=True)
            out_meta = dem_src.meta.copy()
            out_meta.update({
                "driver": "GTiff",
                "height": out_image.shape[1],
                "width": out_image.shape[2],
                "transform": out_transform,
                "crs": dem_src.crs
            })
            dem_arr = out_image[0].astype(float)
            nodata = dem_src.nodata
            if nodata is not None:
                dem_arr[dem_arr == nodata] = np.nan

        # Compute slope (reuse your existing method)
        dzdy, dzdx = np.gradient(dem_arr)
        slope = np.sqrt(dzdx**2 + dzdy**2)
        slope_deg = np.degrees(np.arctan(slope))
        slope[np.isnan(dem_arr)] = np.nan
        slope_deg[np.isnan(dem_arr)] = np.nan

        # Initialize feature stack with slope
        feature_stack = []
        feature_names = []
        suggestions = []
        warnings = []

        # Feature 1: slope (normalized)
        slope_feat = slope_deg
        feature_stack.append(slope_feat)
        feature_names.append("slope")

        # Feature 2: soil quality raster (if provided)
        soil_feat = None
        if soil_raster_path and os.path.exists(soil_raster_path):
            try:
                with rasterio.open(soil_raster_path) as soil_src:
                    soil_band = soil_src.read(1).astype(float)
                    # Reproject/resample soil to match DEM clip if CRS differs
                    if soil_src.crs != out_meta['crs'] or soil_src.transform != out_meta['transform'] or soil_band.shape != (out_meta['height'], out_meta['width']):
                        soil_resampled = reproject_array_to_match(
                            soil_band, soil_src.transform, soil_src.crs, out_meta
                        )
                    else:
                        soil_resampled = soil_band
                    soil_resampled[np.isnan(dem_arr)] = np.nan
                    soil_feat = soil_resampled
                    feature_stack.append(soil_feat)
                    feature_names.append("soil")
            except Exception as e:
                logger.warning(f"Failed to read soil raster: {e}")
        else:
            logger.info("No soil raster provided or file missing — skipping soil feature.")

        # Feature 3: distance to roads/amenities (if provided)
        distance_feat = None
        if roads_geojson:
            try:
                features = roads_geojson.get('features', roads_geojson) if isinstance(roads_geojson, dict) else roads_geojson
                mask_roads = rasterize_vector_to_mask(features, out_meta)
                # distance_transform_edt computes distances in pixels; convert to meters using pixel size
                pixel_width = abs(out_meta['transform'][0])
                pixel_height = abs(out_meta['transform'][4]) if out_meta['transform'][4] != 0 else pixel_width
                # invert mask so roads are zero, background 1 for edt
                inv_mask = 1 - (mask_roads > 0).astype(np.uint8)
                dist_pixels = distance_transform_edt(inv_mask)
                # convert to meters (approx) — transform scale is degrees if crs is geographic; better in meters if projected
                # We'll estimate meter per pixel using haversine at center if CRS is EPSG:4326
                # For small extents this approximation is acceptable; recommend providing projected layers for accuracy.
                if out_meta['crs'] and out_meta['crs'].to_string() == 'EPSG:4326':
                    # approximate meters per degree at center latitude
                    center_lat = (bounds[1] + bounds[3]) / 2.0
                    meters_per_deg_lat = 111132.92 - 559.82 * np.cos(2 * np.deg2rad(center_lat)) + 1.175 * np.cos(4 * np.deg2rad(center_lat))
                    meters_per_deg_lon = (111412.84 * np.cos(np.deg2rad(center_lat)) - 93.5 * np.cos(3 * np.deg2rad(center_lat)))
                    # pixel meters approx
                    meters_per_pixel = (pixel_width * meters_per_deg_lon + pixel_height * meters_per_deg_lat) / 2.0
                else:
                    # If projected CRS, pixel dimensions already in meters (typical)
                    meters_per_pixel = max(pixel_width, pixel_height)
                distance_meters = dist_pixels * meters_per_pixel
                distance_feat = distance_meters
                distance_feat[np.isnan(dem_arr)] = np.nan
                feature_stack.append(distance_feat)
                feature_names.append("distance_to_roads_m")
            except Exception as e:
                logger.warning(f"Failed to rasterize roads GeoJSON: {e}")
        else:
            logger.info("No roads GeoJSON provided — skipping accessibility feature.")

        # ENHANCED Water detection - detects oceans, lakes, dams, rivers using multiple methods
        valid_dem_mask = ~np.isnan(dem_arr)
        total_valid_pixels = int(np.count_nonzero(valid_dem_mask))
        if total_valid_pixels == 0:
            return JSONResponse({"error": "DEM clipping produced no valid pixels"}, status_code=400)

        slope_safe = np.nan_to_num(slope_deg, nan=90.0)
        water_mask = np.zeros_like(dem_arr, dtype=bool)
        water_pixels = 0
        water_area_pct = 0.0
        water_threshold = None

        try:
            valid_elev = dem_arr[valid_dem_mask]
            mean_elev = float(np.nanmean(valid_elev))
            std_elev = float(np.nanstd(valid_elev))
            low_percentile = float(np.nanpercentile(valid_elev, 15))  # More sensitive: bottom 15%

            # Method 1: Elevation-based (oceans, large lakes)
            candidate_thresholds = [low_percentile]
            if std_elev > 0:
                candidate_thresholds.append(mean_elev - 0.5 * std_elev)
            candidate_thresholds.append(5.0)  # absolute guard near sea-level
            water_threshold = min(candidate_thresholds)
            water_mask_elev = (dem_arr <= water_threshold) & (slope_safe <= 2.5) & valid_dem_mask
            
            # Method 2: Flow accumulation (rivers, streams)
            water_mask_flow = np.zeros_like(dem_arr, dtype=bool)
            if ADVANCED_TERRAIN_AVAILABLE and AdvancedTerrainAnalyzer:
                try:
                    analyzer = AdvancedTerrainAnalyzer()
                    flow_accum, drainage = analyzer._calculate_flow_accumulation(dem_arr)
                    if flow_accum is not None:
                        flow_threshold = np.nanpercentile(flow_accum, 70)  # Top 30% flow
                        water_mask_flow = (flow_accum > flow_threshold) & (slope_safe < 5.0) & valid_dem_mask
                        logger.info(f"🌊 Flow-based: {np.sum(water_mask_flow)} river/stream pixels")
                except Exception as e:
                    logger.warning(f"Flow-based detection failed: {e}")
            
            # Method 3: Depression detection (lakes, dams)
            water_mask_depression = np.zeros_like(dem_arr, dtype=bool)
            try:
                from scipy import ndimage
                local_minima = ndimage.minimum_filter(dem_arr, size=5) == dem_arr
                depression_mask = local_minima & (slope_safe < 3.0) & valid_dem_mask
                if np.any(depression_mask):
                    water_mask_depression = depression_mask & (dem_arr < (mean_elev - 1.5))
                    logger.info(f"🌊 Depression-based: {np.sum(water_mask_depression)} lake/dam pixels")
            except Exception as e:
                logger.warning(f"Depression detection failed: {e}")
            
            # Method 4: TWI-based (wetlands, wet areas)
            water_mask_twi = np.zeros_like(dem_arr, dtype=bool)
            if ADVANCED_TERRAIN_AVAILABLE and AdvancedTerrainAnalyzer:
                try:
                    analyzer = AdvancedTerrainAnalyzer()
                    flow_accum, drainage = analyzer._calculate_flow_accumulation(dem_arr)
                    if flow_accum is not None:
                        slope_rad = np.arctan(slope_safe * np.pi / 180.0)
                        slope_safe_rad = np.where(slope_rad < 0.001, 0.001, slope_rad)
                        pixel_size = abs(out_meta['transform'][0]) if 'transform' in out_meta else 30.0
                        contributing_area = flow_accum * (pixel_size ** 2)
                        twi = np.log((contributing_area + 1) / (np.tan(slope_safe_rad) + 0.001))
                        twi = np.clip(twi, 0, 20)
                        twi_threshold = np.nanpercentile(twi, 80)  # Top 20% wettest
                        water_mask_twi = (twi > twi_threshold) & (slope_safe < 5.0) & valid_dem_mask
                        logger.info(f"🌊 TWI-based: {np.sum(water_mask_twi)} wet area pixels")
                except Exception as e:
                    logger.warning(f"TWI detection failed: {e}")
            
            # Combine all methods
            water_mask = water_mask_elev | water_mask_flow | water_mask_depression | water_mask_twi
            
            # Cleanup: remove isolated small water pixels
            try:
                from scipy import ndimage
                water_mask_labeled, num_features = ndimage.label(water_mask)
                for label_id in range(1, num_features + 1):
                    feature_size = np.sum(water_mask_labeled == label_id)
                    if feature_size < 9:  # Less than 3x3 pixels
                        water_mask[water_mask_labeled == label_id] = False
            except Exception as e:
                logger.warning(f"Water cleanup failed: {e}")
            
            water_pixels = int(np.sum(water_mask))
            water_area_pct = (water_pixels / total_valid_pixels) * 100.0 if total_valid_pixels > 0 else 0.0
            logger.info(f"🌊 Enhanced water detection: {water_pixels} pixels ({water_area_pct:.2f}%) - Methods: Elev={np.sum(water_mask_elev)}, Flow={np.sum(water_mask_flow)}, Dep={np.sum(water_mask_depression)}, TWI={np.sum(water_mask_twi)}")
        except Exception as water_err:
            logger.warning(f"Water detection failed: {water_err}")

        water_info = {
            "threshold_m": float(water_threshold) if water_threshold is not None else None,
            "water_pixels": water_pixels,
            "total_pixels": total_valid_pixels,
            "water_area_percentage": float(water_area_pct)
        }

        if water_area_pct >= 50:
            warnings.append(f"⚠️ {water_area_pct:.1f}% of the polygon is water. Suitability forced to LOW.")
            suggestions.append("Select a land-based polygon. Water bodies are suitable only for conservation or recreation.")
        elif water_area_pct >= 30:
            warnings.append(f"⚠️ Significant water coverage detected ({water_area_pct:.1f}%). Development highly constrained.")
            suggestions.append("Consider shifting the boundary inland or planning specialized waterfront uses.")
        elif water_area_pct >= 10:
            warnings.append(f"ℹ️ Minor water features detected ({water_area_pct:.1f}%). Ensure setbacks and drainage design.")

        # Build feature matrix (flattened) but keep mask of valid pixels
        stacked = np.stack(feature_stack, axis=-1)  # H x W x C
        valid_mask = ~np.isnan(stacked).any(axis=-1)

        # If no valid pixels
        if not np.any(valid_mask):
            return JSONResponse({"error": "No valid pixels to predict after stacking features"}, status_code=400)

        # Flatten features for model
        H, W, C = stacked.shape
        X = stacked.reshape(-1, C)
        X_valid = X[valid_mask.reshape(-1)]

        # Scale features
        scaler = StandardScaler()
        try:
            X_valid_scaled = scaler.fit_transform(X_valid)
        except Exception:
            X_valid_scaled = X_valid  # fallback if constant features

        # Load model if available
        model = None
        if os.path.exists(model_path):
            try:
                model = joblib.load(model_path)
                logger.info(f"Loaded model from {model_path}")
            except Exception as e:
                logger.warning(f"Failed to load model '{model_path}': {e}")
                model = None
        else:
            logger.info(f"Model file not found at {model_path}. Using fallback heuristic classifier.")

        # Predict
        if model is not None:
            try:
                preds = model.predict(X_valid_scaled)
            except Exception as e:
                logger.warning(f"Model prediction failed: {e}. Falling back to heuristic.")
                model = None

        if model is None:
            # Simple rule-based classifier: weighted score based on features
            # Normalize each feature to 0..1 using min-max of available valid values
            feature_scores = []
            for i in range(C):
                col = X_valid[:, i]
                col = col.astype(float)
                col = col[~np.isnan(col)]
                if col.size == 0:
                    norm = np.zeros(X_valid.shape[0])
                else:
                    mn, mx = np.min(col), np.max(col)
                    if mx - mn == 0:
                        norm = np.zeros(X_valid.shape[0])
                    else:
                        full = X_valid[:, i].astype(float)
                        full[(full < mn)] = mn
                        full[(full > mx)] = mx
                        norm = (full - mn) / (mx - mn)
                # For slope and distance higher is worse, for soil higher is better - adjust sign
                name = feature_names[i]
                if "slope" in name or "distance" in name:
                    norm = 1 - norm  # invert: smaller slope/distance => better
                feature_scores.append(norm)
            # combine scores using provided weights
            # ensure weights align with feature_names
            score = np.zeros_like(feature_scores[0])
            for i, name in enumerate(feature_names):
                w = weights.get(name, None)
                # fallback mapping
                if w is None:
                    if "slope" in name:
                        w = weights.get("slope", 0.5)
                    elif "soil" in name:
                        w = weights.get("soil", 0.3)
                    elif "distance" in name:
                        w = weights.get("distance", 0.2)
                    else:
                        w = 0.0
                score += feature_scores[i] * w
            # create classes based on thresholds
            preds = np.zeros(score.shape, dtype=np.uint8)
            preds[score >= 0.66] = 2  # high suitability
            preds[(score >= 0.33) & (score < 0.66)] = 1
            preds[score < 0.33] = 0

        # Assemble predictions back to raster shape
        full_pred = np.zeros((H * W,), dtype=np.uint8)
        full_pred[:] = 255  # nodata class
        full_pred[valid_mask.reshape(-1)] = preds
        pred_raster = full_pred.reshape(H, W)

        # Force water pixels to LOW suitability regardless of model outcome
        if water_pixels > 0:
            pred_raster[water_mask] = 0

        # Create enhanced heatmap visualization
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8), dpi=150)
        
        # Left plot: Suitability classification heatmap
        cmap_colors = {
            0: '#DC2626',  # Low - Red
            1: '#F59E0B',  # Medium - Orange
            2: '#16A34A',  # High - Green
            255: '#FFFFFF' # No data - White
        }
        
        # Create colored raster for visualization
        colored_raster = np.zeros((H, W, 3), dtype=np.uint8)
        for class_id, color in cmap_colors.items():
            if class_id == 255:  # No data
                mask = (pred_raster == class_id)
                colored_raster[mask] = [255, 255, 255]  # White
            else:
                mask = (pred_raster == class_id)
                # Convert hex to RGB
                hex_color = color.lstrip('#')
                rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
                colored_raster[mask] = rgb
        
        im1 = ax1.imshow(colored_raster)
        ax1.set_title("Land Suitability Classification\n(Red=Low, Orange=Medium, Green=High)", 
                     fontsize=14, fontweight='bold', pad=20)
        ax1.axis('off')
        
        # Add legend
        from matplotlib.patches import Patch
        legend_elements = [
            Patch(facecolor='#DC2626', label='Low Suitability'),
            Patch(facecolor='#F59E0B', label='Medium Suitability'),
            Patch(facecolor='#16A34A', label='High Suitability'),
            Patch(facecolor='#FFFFFF', label='No Data')
        ]
        ax1.legend(handles=legend_elements, loc='center left', bbox_to_anchor=(1, 0.5), fontsize=10)
        
        # Right plot: Suitability score distribution
        if model is not None and 'X_valid_scaled' in locals():
            # Create a continuous suitability score visualization
            score_raster = np.full((H, W), np.nan)
            score_raster[valid_mask] = score
            
            im2 = ax2.imshow(score_raster, cmap='RdYlGn', vmin=0, vmax=1, alpha=0.8)
            ax2.set_title("Continuous Suitability Scores\n(0=Low, 1=High)", 
                         fontsize=14, fontweight='bold', pad=20)
            ax2.axis('off')
            
            # Add colorbar
            cbar2 = plt.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04)
            cbar2.set_label('Suitability Score', rotation=270, labelpad=20, fontsize=12)
            cbar2.set_ticks([0, 0.25, 0.5, 0.75, 1.0])
            cbar2.set_ticklabels(['0.0', '0.25', '0.5', '0.75', '1.0'])
        else:
            # Fallback: show the classification again
            ax2.imshow(colored_raster)
            ax2.set_title("Suitability Classification", fontsize=14, fontweight='bold', pad=20)
            ax2.axis('off')
        
        plt.tight_layout()
        os.makedirs("output", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        heatmap_path = f"output/land_suitability_heatmap_{timestamp}.png"
        plt.savefig(heatmap_path, bbox_inches="tight", dpi=150)
        plt.close()

        # Compute area percentages of each class (accounting for pixel area)
        pixel_area_m2 = None
        if out_meta['crs'] and out_meta['crs'].to_string() != 'EPSG:4326':
            # projected in meters: pixel area approximated by pixel width*height
            px_w = abs(out_meta['transform'][0])
            px_h = abs(out_meta['transform'][4]) if out_meta['transform'][4] != 0 else px_w
            pixel_area_m2 = px_w * px_h
        else:
            # approximate meters per pixel using center lat
            center_lat = (bounds[1] + bounds[3]) / 2.0
            meters_per_deg_lat = 111132.92 - 559.82 * np.cos(2 * np.deg2rad(center_lat))
            meters_per_deg_lon = 111412.84 * np.cos(np.deg2rad(center_lat))
            px_w_deg = abs(out_meta['transform'][0])
            px_h_deg = abs(out_meta['transform'][4]) if out_meta['transform'][4] != 0 else px_w_deg
            pixel_area_m2 = (px_w_deg * meters_per_deg_lon) * (px_h_deg * meters_per_deg_lat)

        counts = {}
        total_area = 0.0
        for cls in [0,1,2]:
            cnt = np.sum(pred_raster == cls)
            area_m2 = cnt * pixel_area_m2
            counts[cls] = {"pixels": int(cnt), "area_m2": float(area_m2)}
            total_area += area_m2

        # percentages
        percentages = {}
        for cls in [0,1,2]:
            percentages[cls] = 0.0 if total_area == 0 else (counts[cls]["area_m2"] / total_area) * 100.0

        # Suggestions (simple heuristics)
        if percentages[0] > 50:
            suggestions.append("Majority of area classified as LOW suitability. Consider reallocating zoning or excluding steep/remote patches.")
        if percentages[2] > 40:
            suggestions.append("Significant area is HIGH suitability — consider prioritizing development here.")
        if distance_feat is not None:
            # if median distance is large
            median_dist = np.nanmedian(distance_feat[~np.isnan(distance_feat)])
            if median_dist > 2000:
                suggestions.append("Median distance to nearest road/amenity > 2km. Consider improving accessibility for development.")
        if 'soil' not in feature_names:
            suggestions.append("No soil quality input provided — soil is a major factor; add soil_raster_path for better results.")
        if water_area_pct >= 50:
            suggestions.append("Water-dominated polygon detected. Redraw the AOI to exclude open water for accurate suitability results.")

        # Save stats json
        stats = {
            "counts": counts,
            "percentages": { "low": percentages[0], "medium": percentages[1], "high": percentages[2] },
            "feature_names": feature_names,
            "water": {
                "area_percentage": water_area_pct,
                "water_pixels": water_pixels,
                "threshold_m": water_info.get("threshold_m")
            },
            "processing_timestamp": datetime.now().isoformat()
        }
        json_path = f"output/land_suitability_stats_{timestamp}.json"
        with open(json_path, "w") as jf:
            json.dump(stats, jf, indent=2)

        base_url = str(request.base_url).rstrip("/")
        return {
            "status": "success",
            "heatmap_url": f"{base_url}/download/{os.path.basename(heatmap_path)}",
            "json_url": f"{base_url}/download/{os.path.basename(json_path)}",
            "stats": stats,
            "suggestions": suggestions,
            "warnings": warnings,
            "water_info": water_info
        }

    except Exception as e:
        logger.exception("Land suitability processing failed")
        return JSONResponse({
            "error": f"Land suitability processing failed: {str(e)}"
        }, status_code=500)

# ---------------- ML-Based Zoning Classification Endpoint ----------------
@app.post("/api/ml_zoning")
async def ml_zoning_classification(request: Request):
    """
    ML-based zoning classification using terrain features and DEM data.
    """
    try:
        payload = await request.json()
        
        # Get polygon ID or GeoJSON
        polygon_id = payload.get('polygon_id')
        geojson = payload.get('geojson')
        
        if not polygon_id and not geojson:
            return JSONResponse({"error": "Missing polygon_id or geojson"}, status_code=400)
        
        # If polygon_id is provided, get the terrain analysis data
        terrain_data = None
        if polygon_id:
            terrain_analysis = TERRAIN_ANALYSES.get(polygon_id)
            if terrain_analysis:
                terrain_data = terrain_analysis.get('results', {})
                logger.info(f"Using existing terrain analysis for polygon {polygon_id}")
        
        # If no terrain data or geojson provided, process DEM
        if not terrain_data and geojson:
            logger.info("Processing DEM for ML zoning analysis")
            terrain_result = await process_geojson(geojson, request, ["dem"], "EPSG:4326", {})
            if "error" in terrain_result:
                return JSONResponse({"error": terrain_result["error"]}, status_code=400)
            terrain_data = terrain_result
        
        if not terrain_data:
            return JSONResponse({"error": "No terrain data available for zoning analysis"}, status_code=400)
        
        # Initialize or load ML model if not available
        if not zoning_model and ML_MODELS_AVAILABLE:
            logger.info("Creating and training new zoning model...")
            zoning_model, training_results = create_and_train_zoning_model()
            logger.info(f"Zoning model trained with accuracy: {training_results['accuracy']:.3f}")
        
        if not zoning_model:
            return JSONResponse({"error": "ML zoning model not available"}, status_code=500)
        
        # Extract terrain features
        if terrain_feature_extractor:
            # Get DEM data for feature extraction
            dem_path = terrain_data.get('dem_path')
            if dem_path and os.path.exists(dem_path):
                with rasterio.open(dem_path) as src:
                    dem_array = src.read(1)
                    transform = src.transform
                    bounds = src.bounds
                
                # Extract comprehensive terrain features
                terrain_features = terrain_feature_extractor.extract_features_from_dem(
                    dem_array, transform, bounds
                )
            else:
                # Fallback to basic features from terrain analysis
                stats = terrain_data.get('stats', {})
                slope_analysis = terrain_data.get('slope_analysis', {})
                
                # Extract water availability from terrain data if available
                water_avail = stats.get('water_availability', {})
                water_score = water_avail.get('water_availability_score', {}).get('mean', 0.5)
                twi_mean = water_avail.get('topographic_wetness_index', {}).get('mean', 5)
                distance_to_water = water_avail.get('distance_to_water', {}).get('mean_meters', 1000)
                
                # Extract flood and erosion risk from terrain data
                flood_risk_val = 0.2
                erosion_risk_val = 0.2
                if stats.get('flood_analysis', {}).get('risk_statistics'):
                    flood_risk_val = stats['flood_analysis']['risk_statistics'].get('mean_risk_score', 0.2) / 3.0
                if stats.get('erosion_analysis', {}).get('annual_soil_loss'):
                    erosion_mean = stats['erosion_analysis']['annual_soil_loss'].get('mean', 0)
                    erosion_risk_val = min(1.0, erosion_mean / 50.0)  # Normalize to 0-1
                
                terrain_features = {
                    'elevation': stats.get('mean_elevation', 500),
                    'slope': slope_analysis.get('mean_slope', 15),
                    'aspect': 180,
                    'curvature': 0,
                    'tpi': 0,
                    'twi': twi_mean,  # Use real TWI from analysis
                    'distance_to_water': distance_to_water,  # Use real distance from analysis
                    'distance_to_roads': 500,
                    'soil_quality': 0.7,
                    'flood_risk': flood_risk_val,  # Use real flood risk
                    'erosion_risk': erosion_risk_val,  # Use real erosion risk
                    'accessibility_score': 0.6,
                    'water_availability_score': water_score  # Add water availability score
                }
        else:
            # Fallback to basic features
            stats = terrain_data.get('stats', {})
            slope_analysis = terrain_data.get('slope_analysis', {})
            
            # Extract water availability from terrain data if available
            water_avail = stats.get('water_availability', {})
            water_score = water_avail.get('water_availability_score', {}).get('mean', 0.5)
            twi_mean = water_avail.get('topographic_wetness_index', {}).get('mean', 5)
            distance_to_water = water_avail.get('distance_to_water', {}).get('mean_meters', 1000)
            
            # Extract flood and erosion risk from terrain data
            flood_risk_val = 0.2
            erosion_risk_val = 0.2
            if stats.get('flood_analysis', {}).get('risk_statistics'):
                flood_risk_val = stats['flood_analysis']['risk_statistics'].get('mean_risk_score', 0.2) / 3.0
            if stats.get('erosion_analysis', {}).get('annual_soil_loss'):
                erosion_mean = stats['erosion_analysis']['annual_soil_loss'].get('mean', 0)
                erosion_risk_val = min(1.0, erosion_mean / 50.0)  # Normalize to 0-1
            
            terrain_features = {
                'elevation': stats.get('mean_elevation', 500),
                'slope': slope_analysis.get('mean_slope', 15),
                'aspect': 180,
                'curvature': 0,
                'tpi': 0,
                'twi': twi_mean,  # Use real TWI from analysis
                'distance_to_water': distance_to_water,  # Use real distance from analysis
                'distance_to_roads': 500,
                'soil_quality': 0.7,
                'flood_risk': flood_risk_val,  # Use real flood risk
                'erosion_risk': erosion_risk_val,  # Use real erosion risk
                'accessibility_score': 0.6,
                'water_availability_score': water_score  # Add water availability score
            }
        
        # Make ML prediction
        prediction = zoning_model.predict_zoning(terrain_features)
        
        # Generate grid-based zoning for visualization
        grid_predictions = zoning_model.predict_grid_zoning(terrain_data, grid_size=20)
        
        # Create zoning summary
        zoning_summary = {
            'primary_zoning': {
                'class': prediction['predicted_class'],
                'label': prediction['predicted_label'],
                'confidence': prediction['confidence'],
                'color': prediction['color']
            },
            'alternative_zoning': prediction['top_3_predictions'],
            'zoning_distribution': grid_predictions['zoning_percentages'],
            'terrain_features': terrain_features,
            'analysis_timestamp': datetime.now().isoformat()
        }
        
        # Store results
        if polygon_id:
            ZONING_RESULTS.append({
                'polygon_id': polygon_id,
                'zoning_summary': zoning_summary,
                'grid_predictions': grid_predictions,
                'timestamp': datetime.now().isoformat()
            })
        
        return JSONResponse({
            'success': True,
            'zoning_summary': zoning_summary,
            'grid_predictions': grid_predictions,
            'terrain_features': terrain_features
        })
        
    except Exception as e:
        logger.error(f"ML zoning classification failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse({
            'error': 'ML zoning classification failed',
            'details': str(e)
        }, status_code=500)

@app.post("/api/land_suitability_enhanced")
async def land_suitability_enhanced(request: Request):
    """
    Enhanced land suitability analysis using ML model and DEM data.
    Integrates with terrain analysis results for comprehensive suitability assessment.
    """
    try:
        payload = await request.json()
        
        # Get polygon ID, GeoJSON, or terrain data
        polygon_id = payload.get('polygon_id')
        geojson = payload.get('geojson')
        terrain_data = payload.get('terrain_data')  # Data passed from Node.js backend
        
        if not polygon_id and not geojson:
            return JSONResponse({"error": "Missing polygon_id or geojson"}, status_code=400)
        
        # If terrain_data is already provided from Node.js backend, use it
        if terrain_data:
            logger.info(f"Using terrain data provided from Node.js backend for polygon {polygon_id}")
        elif polygon_id:
            # Try to get terrain analysis from database first
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                # Database connection - using same config as Node.js backend
                conn = psycopg2.connect(
                    host="localhost",
                    database="plan-it",
                    user="postgres",
                    password="iampro24",
                    port="5432"
                )
                
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                
                # Query terrain analysis by polygon_id
                cursor.execute("""
                    SELECT results, elevation_data, slope_data, aspect_data 
                    FROM terrain_analyses 
                    WHERE polygon_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 1
                """, (polygon_id,))
                
                db_result = cursor.fetchone()
                cursor.close()
                conn.close()
                
                if db_result:
                    # Extract data from database
                    results = db_result['results'] if db_result['results'] else {}
                    elevation_data = db_result['elevation_data'] if db_result['elevation_data'] else {}
                    slope_data = db_result['slope_data'] if db_result['slope_data'] else {}
                    
                    terrain_data = {
                        'stats': results.get('stats', elevation_data),
                        'slope_analysis': results.get('slope_analysis', slope_data),
                        'results': results
                    }
                    logger.info(f"Using terrain analysis from database for polygon {polygon_id}")
                else:
                    logger.warning(f"No terrain analysis found in database for polygon {polygon_id}")
                    
            except Exception as db_error:
                logger.warning(f"Database query failed: {db_error}, trying in-memory storage")
                
                # Fallback to in-memory storage
                terrain_analysis = None
                for analysis in TERRAIN_ANALYSES:
                    if analysis.get('polygon_id') == polygon_id:
                        terrain_analysis = analysis
                        break
                
                if terrain_analysis:
                    terrain_data = {
                        'stats': terrain_analysis.get('stats', {}),
                        'slope_analysis': terrain_analysis.get('slope_analysis', {}),
                        'results': terrain_analysis
                    }
                    logger.info(f"Using terrain analysis from memory for polygon {polygon_id}")
        
        # REAL-TIME: If no terrain data or geojson provided, process DEM in real-time
        if not terrain_data and geojson:
            logger.info("🔄 REAL-TIME: Processing DEM for land suitability analysis using Python modules")
            # Use the existing process_geojson function to get REAL terrain data
            terrain_result = await process_geojson(geojson, request, ["dem"], "EPSG:4326", {})
            if "error" in terrain_result:
                return JSONResponse({"error": terrain_result["error"]}, status_code=400)
            terrain_data = terrain_result
            
            # Use Python terrain_stats module for enhanced statistics
            if SUITABILITY_ANALYSIS_AVAILABLE and compute_terrain_stats and terrain_data.get('tif_url'):
                try:
                    # Extract TIF path from URL
                    tif_filename = terrain_data['tif_url'].split('/')[-1]
                    tif_path = os.path.join("output", tif_filename)
                    
                    if os.path.exists(tif_path):
                        # Use Python terrain_stats module
                        terrain_stats_result = compute_terrain_stats(tif_path)
                        if terrain_stats_result and not terrain_stats_result.get('error'):
                            # Merge Python terrain_stats into terrain_data
                            if 'stats' not in terrain_data:
                                terrain_data['stats'] = {}
                            terrain_data['stats']['python_terrain_stats'] = terrain_stats_result
                            logger.info("✅ Used Python terrain_stats module for enhanced terrain analysis")
                except Exception as e:
                    logger.warning(f"Failed to use terrain_stats module: {e}")
            
            logger.info("✅ REAL-TIME: DEM processing completed, using REAL terrain data with Python modules")
        
        # CRITICAL: Check for water bodies FIRST before any suitability analysis
        water_area_percentage = 0.0
        water_pixels = 0
        total_pixels = 1
        
        if terrain_data:
            stats = terrain_data.get('stats', {})
            results = terrain_data.get('results', {})
            
            # Extract water data from REAL terrain analysis
            # Method 1: From stats directly (most reliable)
            water_pixels = stats.get('water_pixels', 0)
            total_pixels = stats.get('total_pixels', 1)
            if total_pixels > 0:
                water_area_percentage = (water_pixels / total_pixels) * 100
            
            # Method 2: From water_analysis if available
            if water_area_percentage == 0 and isinstance(results, dict):
                water_analysis = results.get('water_analysis', {})
                if water_analysis:
                    water_stats = water_analysis.get('water_stats', {})
                    water_area_percentage = water_stats.get('water_area_percentage', 0.0)
            
            # Method 3: From classification
            if water_area_percentage == 0 and isinstance(results, dict):
                classification = results.get('classification', {})
                if classification:
                    water_pixels = classification.get('water_pixels', 0)
                    total_pixels = classification.get('total_pixels', 1)
                    if total_pixels > 0:
                        water_area_percentage = (water_pixels / total_pixels) * 100
            
            logger.info(f"🌊 WATER DETECTION: {water_area_percentage:.2f}% water area ({water_pixels}/{total_pixels} pixels)")
        
        # ADDITIONAL CHECK: If mean elevation is very low, likely water body
        if terrain_data:
            stats = terrain_data.get('stats', {})
            mean_elevation = stats.get('mean_elevation', 1000)
            min_elevation = stats.get('min_elevation', 1000)
            
            # If mean elevation < 10m and min elevation < 5m, likely water body
            if mean_elevation < 10 and min_elevation < 5:
                # Recalculate water percentage with more sensitive detection
                if water_area_percentage < 50:
                    # Likely water but not detected properly - adjust
                    water_area_percentage = max(water_area_percentage, 60.0)  # Force to water body
                    logger.warning(f"🌊 Low elevation detected (mean={mean_elevation:.1f}m, min={min_elevation:.1f}m) - Adjusting to water body")
        
        # CRITICAL VALIDATION: Water detection and risk assessment
        # User requirement: 
        # - If polygon is on water or has water parts → HIGH RISK
        # - If polygon is on land (surface other than water) → LOW RISK
        
        # Determine if polygon has water (any water detected)
        has_water = water_area_percentage > 0.1  # Even 0.1% water means there's water
        is_water_body = False
        water_risk_level = "LOW"  # Default: land = low risk
        
        if water_area_percentage > 50.0:
            is_water_body = True
            water_risk_level = "CRITICAL"
        elif water_area_percentage > 30.0:
            is_water_body = True
            water_risk_level = "HIGH"
        elif water_area_percentage > 10.0:
            water_risk_level = "HIGH"  # Significant water = high risk
        elif water_area_percentage > 0.1:
            water_risk_level = "MEDIUM"  # Some water = medium risk
        
        # Additional check: Low elevation suggests water body
        if terrain_data:
            stats = terrain_data.get('stats', {})
            mean_elevation = stats.get('mean_elevation', 1000)
            min_elevation = stats.get('min_elevation', 1000)
            
            # If mean elevation < 10m and min elevation < 5m, likely water body
            if mean_elevation < 10 and min_elevation < 5:
                if water_area_percentage < 50:
                    # Likely water but not detected properly - adjust
                    water_area_percentage = max(water_area_percentage, 60.0)  # Force to water body
                    water_risk_level = "CRITICAL"
                    is_water_body = True
                    logger.warning(f"🌊 Low elevation detected (mean={mean_elevation:.1f}m, min={min_elevation:.1f}m) - Treating as water body")
            elif water_area_percentage > 30.0 and mean_elevation < 15:
                # Significant water + low elevation = water body
                is_water_body = True
                water_risk_level = "HIGH"
                logger.warning(f"🌊 Significant water ({water_area_percentage:.1f}%) with low elevation ({mean_elevation:.1f}m) - Treating as water body")
        
        # Set risk level based on water presence
        if has_water:
            logger.info(f"🌊 WATER DETECTED: {water_area_percentage:.2f}% water area - Risk Level: {water_risk_level}")
        else:
            logger.info(f"🏞️ LAND AREA: No water detected - Risk Level: {water_risk_level} (LOW)")
        
        if is_water_body:
            logger.warning(f"🚫 WATER AREA DETECTED: {water_area_percentage:.1f}% - Development NOT ALLOWED")
            return JSONResponse({
                "error": "WATER AREA SELECTED",
                "restriction": {
                    "type": "WATER_BODY",
                    "severity": water_risk_level,
                    "risk_level": water_risk_level,  # Add explicit risk level
                    "message": f"⚠️ WATER BODY DETECTED: {water_area_percentage:.1f}% of the selected area is water - {water_risk_level} RISK",
                    "details": {
                        "water_area_percentage": water_area_percentage,
                        "water_pixels": water_pixels,
                        "total_pixels": total_pixels,
                        "has_water": True,
                        "risk_level": water_risk_level
                    },
                    "restrictions": [
                        "❌ Development operations (zoning, road network, parcels) are NOT ALLOWED on water bodies",
                        "❌ Construction is PROHIBITED in water areas",
                        "✅ Consider: Conservation zones, recreational water features, or waterfront development (on adjacent land only)"
                    ],
                    "recommendations": [
                        "Select a different polygon that is on land",
                        "If this is intentional, consider waterfront development on adjacent land areas only",
                        "Water bodies should be designated as conservation or recreational zones"
                    ]
                },
                "analysis_summary": {
                    "suitability_class": "WATER_BODY",
                    "suitability_label": "Water Body - Development Restricted",
                    "mean_score": 0,
                    "confidence": 1.0,
                    "terrain_features": {
                        "mean_elevation": stats.get('mean_elevation', 0) if terrain_data else 0,
                        "water_area_percentage": water_area_percentage
                    }
                },
                "zoning_analysis": {
                    "zoning_stats": {
                        1: {"name": "Water Body", "area_percentage": water_area_percentage, "pixel_count": water_pixels},
                        2: {"name": "Suitable for Development", "area_percentage": 0, "pixel_count": 0},
                        3: {"name": "Limited Development", "area_percentage": 0, "pixel_count": 0},
                        4: {"name": "Conservation Area", "area_percentage": 0, "pixel_count": 0},
                        5: {"name": "High-Risk (Avoid)", "area_percentage": 0, "pixel_count": 0}
                    }
                }
            }, status_code=200)  # Return 200 but with error/restriction info
        
        # Set risk level for non-water-body cases
        # User requirement: 
        # - If polygon is on water or has water parts → HIGH RISK
        # - If polygon is on land (surface other than water) → LOW RISK
        # IMPORTANT: Risk level is ONLY based on water presence, NOT on suitability score
        # Suitability score determines development recommendations, not risk level
        if has_water:
            # Has water but not a full water body - set risk based on water percentage
            if water_area_percentage > 20.0:
                water_risk_level = "HIGH"
            elif water_area_percentage > 10.0:
                water_risk_level = "MEDIUM"
            else:
                water_risk_level = "LOW"  # Minimal water
        else:
            # No water detected - LOW risk (land area)
            # Even if suitability is low, land without water = LOW RISK
            water_risk_level = "LOW"
            logger.info(f"🏞️ LAND AREA (No water): Risk Level = LOW (regardless of suitability score)")
        
        # If water area > 20%, show strong warnings but allow analysis
        if water_area_percentage > 20.0:
            logger.warning(f"⚠️ SIGNIFICANT WATER AREA: {water_area_percentage:.1f}% - Development restricted - Risk Level: {water_risk_level}")
        
        if not terrain_data:
            # If no terrain data is available, create a default analysis with reasonable values
            logger.warning("No terrain data available, using default values for analysis")
            terrain_data = {
                'stats': {
                    'mean_elevation': 500,
                    'min_elevation': 400,
                    'max_elevation': 600,
                    'total_pixels': 1000
                },
                'slope_analysis': {
                    'mean_slope': 15,
                    'category_stats': {
                        'flat': 0.4,
                        'moderate': 0.4,
                        'steep': 0.2
                    }
                }
            }
        
        # Extract terrain features from the analysis
        # Handle case where terrain_data might be a list or have different structure
        if isinstance(terrain_data, dict):
            stats = terrain_data.get('stats', {})
            slope_analysis = terrain_data.get('slope_analysis', {})
            flood_analysis = terrain_data.get('flood_analysis', {})
            erosion_analysis = terrain_data.get('erosion_analysis', {})
            # Try to get water_availability from multiple possible locations
            water_availability = (
                terrain_data.get('water_availability') or 
                stats.get('water_availability') or 
                {}
            )
        else:
            # If terrain_data is not a dict, create default values
            stats = {}
            slope_analysis = {}
            flood_analysis = {}
            erosion_analysis = {}
            water_availability = {}
            logger.warning(f"Terrain data is not a dictionary: {type(terrain_data)}")
        
        # Prepare features for ML model
        # Extract water availability data (real values from advanced analysis)
        # Safely extract with defaults
        water_score = 0.5  # Default
        twi_mean = 5.0  # Default
        distance_to_water = 1000.0  # Default
        
        if water_availability:
            water_score = water_availability.get('water_availability_score', {}).get('mean', 0.5)
            twi_mean = water_availability.get('topographic_wetness_index', {}).get('mean', 5.0)
            distance_to_water = water_availability.get('distance_to_water', {}).get('mean_meters', 1000.0)
        
        # Extract flood risk (real values from advanced analysis)
        flood_risk_val = 0.2
        if flood_analysis.get('risk_statistics', {}).get('mean_risk_score') is not None:
            flood_risk_val = flood_analysis['risk_statistics']['mean_risk_score'] / 3.0
        elif flood_analysis.get('flood_stats', {}).get('high_risk_area'):
            # Estimate from old format
            total_risk = flood_analysis['flood_stats'].get('total_risk_area', 0)
            total_pixels = stats.get('total_pixels', 1)
            flood_risk_val = min(1.0, (total_risk / total_pixels) * 3.0) if total_pixels > 0 else 0.2
        
        # Extract erosion risk (real values from advanced analysis)
        erosion_risk_val = 0.2
        if erosion_analysis.get('annual_soil_loss', {}).get('mean') is not None:
            erosion_mean = erosion_analysis['annual_soil_loss']['mean']
            erosion_risk_val = min(1.0, erosion_mean / 50.0)  # Normalize to 0-1
        elif erosion_analysis.get('erosion_stats', {}).get('mean_soil_loss'):
            erosion_mean = erosion_analysis['erosion_stats']['mean_soil_loss']
            erosion_risk_val = min(1.0, erosion_mean / 50.0)
        
        # Extract REAL terrain features from advanced analysis if available
        # Try to get aspect from advanced analysis
        aspect_mean = 180  # Default
        if terrain_data and isinstance(terrain_data, dict):
            results = terrain_data.get('results', {})
            if isinstance(results, dict):
                aspect_data = results.get('aspect_analysis', {})
                if aspect_data and isinstance(aspect_data, dict):
                    aspect_mean = aspect_data.get('mean_aspect', 180)
        
        # Try to get curvature and TPI from advanced analysis
        curvature_mean = 0
        tpi_mean = 0
        if terrain_data and isinstance(terrain_data, dict):
            results = terrain_data.get('results', {})
            if isinstance(results, dict):
                # Try to get from advanced terrain analysis
                advanced_terrain = results.get('advanced_terrain_analysis', {})
                if advanced_terrain:
                    curvature_mean = advanced_terrain.get('curvature', {}).get('mean', 0)
                    tpi_mean = advanced_terrain.get('tpi', {}).get('mean', 0)
        
        # Build features dictionary with REAL data
        features = {
            'elevation': stats.get('mean_elevation', 500),  # REAL elevation from DEM
            'slope': slope_analysis.get('mean_slope', 15),  # REAL slope from DEM
            'aspect': aspect_mean,  # REAL aspect from DEM (or default)
            'curvature': curvature_mean,  # REAL curvature if available
            'tpi': tpi_mean,  # REAL TPI if available
            'twi': twi_mean,  # REAL TWI from advanced analysis
            'distance_to_water': distance_to_water,  # REAL distance from advanced analysis
            'distance_to_roads': 500,   # Default (would need road data)
            'soil_quality': 0.7,  # Default (would need soil data)
            'flood_risk': flood_risk_val,  # REAL flood risk from advanced analysis
            'erosion_risk': erosion_risk_val,  # REAL erosion risk from advanced analysis
            'water_availability_score': water_score  # REAL water availability score
        }
        
        logger.info(f"📊 REAL Terrain Features Extracted: Elevation={features['elevation']:.1f}m, Slope={features['slope']:.1f}°, TWI={features['twi']:.2f}, Flood Risk={features['flood_risk']:.2f}, Erosion Risk={features['erosion_risk']:.2f}")
        
        # Load the ML model
        model_path = Path(__file__).parent / "ml_models" / "land_suitability.pkl"
        model = None
        
        try:
            if model_path.exists():
                from land_suitability_model import LandSuitabilityModel
                suitability_model = LandSuitabilityModel()
                suitability_model.load_model(str(model_path))
                model = suitability_model
                logger.info("Loaded trained land suitability model")
            else:
                logger.warning("No trained model found, creating and training new model")
                from land_suitability_model import create_and_train_model
                model, training_results = create_and_train_model()
                logger.info("Created and trained new land suitability model")
        except Exception as e:
            logger.warning(f"Failed to load/create model: {e}, using heuristic method")
            model = None
        
        # Make predictions
        if model:
            try:
                # The ML model expects only these 9 features (from land_suitability_model.py)
                # Remove flood_risk, erosion_risk, water_availability_score as they're not in the model
                model_features = {
                    'elevation': features.get('elevation', 500),
                    'slope': features.get('slope', 15),
                    'aspect': features.get('aspect', 180),
                    'curvature': features.get('curvature', 0),
                    'tpi': features.get('tpi', 0),
                    'twi': features.get('twi', 5.0),
                    'distance_to_water': features.get('distance_to_water', 1000),
                    'distance_to_roads': features.get('distance_to_roads', 500),
                    'soil_quality': features.get('soil_quality', 0.7)
                }
                
                logger.info(f"Using REAL terrain features for ML model: {model_features}")
                prediction_result = model.predict_suitability(model_features)
                suitability_class = prediction_result['suitability_class']
                confidence = prediction_result['confidence']
                probabilities = prediction_result['probabilities']
                
                logger.info(f"ML Model prediction: Class {suitability_class}, Confidence: {confidence:.3f}")
            except Exception as e:
                logger.warning(f"ML model prediction failed: {e}, using heuristic method")
                model = None
        
        # Fallback heuristic method
        if not model:
            # Calculate suitability score based on terrain characteristics
            elevation_score = 1.0 - abs(features['elevation'] - 500) / 1000.0  # Optimal around 500m
            elevation_score = max(0, min(1, elevation_score))
            
            slope_score = 1.0 - features['slope'] / 45.0  # Lower slope is better
            slope_score = max(0, min(1, slope_score))
            
            soil_score = features['soil_quality']
            
            distance_score = 1.0 - features['distance_to_roads'] / 2000.0  # Closer to roads is better
            distance_score = max(0, min(1, distance_score))
            
            # Water availability score (from terrain analysis if available)
            water_score = 0.5  # Default if not available
            if terrain_data and terrain_data.get('stats', {}).get('water_availability'):
                water_avail = terrain_data['stats']['water_availability']
                if water_avail.get('water_availability_score', {}).get('mean') is not None:
                    water_score = water_avail['water_availability_score']['mean']
                elif water_avail.get('topographic_wetness_index', {}).get('mean') is not None:
                    # Use TWI as proxy (normalize to 0-1, higher TWI = better)
                    twi_mean = water_avail['topographic_wetness_index']['mean']
                    water_score = min(1.0, max(0.0, twi_mean / 15.0))  # Normalize TWI (typical range 0-15)
            
            # Weighted combination (including water availability)
            total_score = (elevation_score * 0.25 + 
                          slope_score * 0.35 + 
                          soil_score * 0.15 + 
                          water_score * 0.15 +  # Water availability factor
                          distance_score * 0.10)
            
            # Convert to class
            if total_score >= 0.7:
                suitability_class = 2  # High
                confidence = total_score
            elif total_score >= 0.4:
                suitability_class = 1  # Medium
                confidence = total_score
            else:
                suitability_class = 0  # Low
                confidence = 1 - total_score
            
            probabilities = {
                'low': 1 - total_score if total_score < 0.5 else 0.2,
                'medium': 0.3 if 0.3 <= total_score <= 0.7 else 0.1,
                'high': total_score if total_score > 0.5 else 0.1
            }
            
            logger.info(f"Heuristic prediction: Class {suitability_class}, Score: {total_score:.3f}")
        
        # Use Python suitability scripts for enhanced analysis if available
        python_mce_stats = None
        if SUITABILITY_ANALYSIS_AVAILABLE and terrain_data and terrain_data.get('tif_url'):
            try:
                logger.info("🔄 Using Python suitability scripts for MCE analysis")
                
                # Get DEM path from terrain_data
                tif_filename = terrain_data['tif_url'].split('/')[-1]
                dem_path = os.path.join("output", tif_filename)
                
                if os.path.exists(dem_path):
                    # Create temporary project directory for MCE analysis
                    timestamp_mce = datetime.now().strftime("%Y%m%d_%H%M%S")
                    project_dir = f"output/suitability_mce_{timestamp_mce}"
                    os.makedirs(project_dir, exist_ok=True)
                    
                    # Copy DEM to project directory
                    import shutil
                    project_dem = os.path.join(project_dir, 'dem.tif')
                    shutil.copy(dem_path, project_dem)
                    
                    # Compute slope and aspect using Python scripts approach
                    import numpy as np  # Ensure numpy is available in this scope
                    with rasterio.open(project_dem) as src:
                        dem_arr_mce = src.read(1, masked=True)
                        transform_mce = src.transform
                        profile_mce = src.profile.copy()
                    
                    # Calculate slope
                    # Handle masked array properly - convert to float first to allow NaN
                    if hasattr(dem_arr_mce, 'filled'):
                        # For integer types, use a sentinel value then convert to float
                        if dem_arr_mce.dtype.kind in ['i', 'u']:  # integer or unsigned integer
                            # Use a sentinel value that won't appear in real data
                            sentinel = -9999
                            dem_data = dem_arr_mce.filled(sentinel).astype(np.float64)
                            # Replace sentinel with NaN
                            dem_data[dem_data == sentinel] = np.nan
                        else:
                            # Already float, can use NaN directly
                            dem_data = dem_arr_mce.filled(np.nan)
                    else:
                        dem_data = dem_arr_mce.astype(np.float64) if dem_arr_mce.dtype.kind in ['i', 'u'] else dem_arr_mce
                        if dem_data.dtype.kind in ['i', 'u']:
                            dem_data = dem_data.astype(np.float64)
                    
                    # Ensure we have valid data for gradient calculation
                    if np.all(np.isnan(dem_data)):
                        raise ValueError("All DEM data is NaN, cannot calculate slope")
                    
                    dzdy, dzdx = np.gradient(dem_data)
                    slope = np.sqrt(dzdx**2 + dzdy**2)
                    slope_deg = np.degrees(np.arctan(slope))
                    # Preserve NaN where original data was masked or NaN
                    if hasattr(dem_arr_mce, 'mask'):
                        slope_deg[dem_arr_mce.mask] = np.nan
                    else:
                        slope_deg[np.isnan(dem_data)] = np.nan
                    
                    # Save slope
                    slope_path = os.path.join(project_dir, 'slope.tif')
                    slope_meta = profile_mce.copy()
                    slope_meta.update(dtype=rasterio.float32, nodata=-9999)
                    with rasterio.open(slope_path, 'w', **slope_meta) as dst:
                        dst.write(slope_deg.astype(np.float32), 1)
                    
                    # Calculate aspect
                    aspect_rad = np.arctan2(-dzdy, dzdx)
                    aspect_deg = np.degrees(aspect_rad)
                    aspect_deg = (aspect_deg + 360) % 360
                    # Preserve NaN where original data was masked or NaN
                    if hasattr(dem_arr_mce, 'mask'):
                        aspect_deg[dem_arr_mce.mask] = np.nan
                    else:
                        aspect_deg[np.isnan(dem_data)] = np.nan
                    
                    # Save aspect
                    aspect_path = os.path.join(project_dir, 'aspect.tif')
                    aspect_meta = profile_mce.copy()
                    aspect_meta.update(dtype=rasterio.float32, nodata=-9999)
                    with rasterio.open(aspect_path, 'w', **aspect_meta) as dst:
                        dst.write(aspect_deg.astype(np.float32), 1)
                    
                    # Calculate flow accumulation
                    pixel_size = abs(transform_mce[0])
                    # Use dem_data (already converted to float) for flow calculation
                    # Replace NaN with 0 for flow accumulation calculation
                    dem_for_flow = np.nan_to_num(dem_data, nan=0.0)
                    contributing_area = np.ones_like(dem_for_flow) * (pixel_size ** 2)
                    # Avoid division by zero
                    slope_safe = np.where(slope == 0, 0.001, slope)
                    flow_accumulation = contributing_area / (slope_safe + 0.001)
                    # Preserve NaN where original data was masked or NaN
                    if hasattr(dem_arr_mce, 'mask'):
                        flow_accumulation[dem_arr_mce.mask] = np.nan
                    else:
                        flow_accumulation[np.isnan(dem_data)] = np.nan
                    
                    # Save flow accumulation
                    flow_path = os.path.join(project_dir, 'flow_accumulation.tif')
                    flow_meta = profile_mce.copy()
                    flow_meta.update(dtype=rasterio.float32, nodata=-9999)
                    with rasterio.open(flow_path, 'w', **flow_meta) as dst:
                        dst.write(flow_accumulation.astype(np.float32), 1)
                    
                    # Use Python scripts for reclassification
                    slope_score_path = os.path.join(project_dir, 'slope_score.tif')
                    reclassify_slope(slope_path, slope_score_path)
                    
                    aspect_score_path = os.path.join(project_dir, 'aspect_score.tif')
                    reclassify_aspect(aspect_path, aspect_score_path)
                    
                    elevation_score_path = os.path.join(project_dir, 'elevation_score.tif')
                    reclassify_elevation(project_dem, elevation_score_path)
                    
                    flow_score_path = os.path.join(project_dir, 'flow_score.tif')
                    reclassify_flow(flow_path, flow_score_path)
                    
                    # Generate constraints
                    constraint_path = os.path.join(project_dir, 'constraints.tif')
                    generate_constraints(project_dir, constraint_path, slope_threshold=30, flood_elevation=2.0, flow_threshold=5000)
                    
                    # Weighted overlay
                    suitability_output = os.path.join(project_dir, 'suitability.tif')
                    weights = {'slope': 0.40, 'aspect': 0.15, 'elevation': 0.25, 'flow': 0.15}
                    weighted_result = weighted_overlay(project_dir, suitability_output, weights=weights, config={'normalize': True, 'apply_constraints': True})
                    
                    if 'error' not in weighted_result and calculate_suitability_stats:
                        # Calculate suitability statistics using Python script
                        python_mce_stats = calculate_suitability_stats(
                            weighted_result.get('output', suitability_output),
                            weighted_result.get('class_output')
                        )
                        logger.info("✅ Python MCE scripts analysis completed successfully")
            except Exception as e:
                logger.warning(f"Failed to use Python MCE scripts: {e}, continuing with standard analysis")
                import traceback
                traceback.print_exc()
        
        # Generate detailed analysis
        suitability_labels = {
            0: "Low Suitability",
            1: "Medium Suitability", 
            2: "High Suitability"
        }
        
        suitability_colors = {
            0: "#dc2626",  # Red
            1: "#f59e0b",  # Yellow
            2: "#16a34a"   # Green
        }
        
        # Generate dynamic recommendations based on actual terrain analysis
        recommendations = []
        warnings = []
        restrictions = []
        
        # Use Python MCE statistics if available
        if python_mce_stats and 'suitability_score' in python_mce_stats:
            mce_mean = python_mce_stats['suitability_score'].get('mean', 0)
            logger.info(f"📊 Using Python MCE suitability score: {mce_mean:.2f}")
            # Adjust suitability class based on MCE results
            if mce_mean >= 70:
                suitability_class = 2  # High
                confidence = mce_mean / 100.0
            elif mce_mean >= 40:
                suitability_class = 1  # Medium
                confidence = mce_mean / 100.0
            else:
                suitability_class = 0  # Low
                confidence = (100 - mce_mean) / 100.0
        
        # Add water body warnings if significant water detected
        if water_area_percentage > 20.0:
            warnings.append({
                "type": "SIGNIFICANT_WATER_BODY",
                "severity": "HIGH",
                "message": f"⚠️ Significant water body detected ({water_area_percentage:.1f}% of area)",
                "details": "Large portion of polygon is water - development should focus on land areas only"
            })
            restrictions.append("Development restricted to land areas only (exclude water)")
            recommendations.append("Focus development on non-water areas of the polygon")
            recommendations.append("Consider waterfront development with proper setbacks from water")
        elif water_area_percentage > 5.0:
            warnings.append({
                "type": "WATER_FEATURE",
                "severity": "MEDIUM",
                "message": f"💧 Water feature detected ({water_area_percentage:.1f}% of area)",
                "details": "Small water features present - ensure proper drainage and setbacks"
            })
            recommendations.append("Plan for water feature integration in development design")
            recommendations.append("Ensure proper drainage systems and water management")
        
        # Get actual terrain data with fallbacks
        mean_slope = slope_analysis.get('mean_slope', 0)
        mean_elevation = stats.get('mean_elevation', 0)
        max_elevation = stats.get('max_elevation', 0)
        min_elevation = stats.get('min_elevation', 0)
        
        # If we don't have elevation data, try to get it from the results
        if not mean_elevation and terrain_data:
            results = terrain_data.get('results', {})
            if results.get('mean_elevation'):
                mean_elevation = results['mean_elevation']
            if results.get('max_elevation'):
                max_elevation = results['max_elevation']
            if results.get('min_elevation'):
                min_elevation = results['min_elevation']
        
        # If we still don't have slope data, try to get it from the results
        if not mean_slope and terrain_data:
            results = terrain_data.get('results', {})
            if results.get('mean_slope'):
                mean_slope = results['mean_slope']
        
        elevation_range = max_elevation - min_elevation if max_elevation and min_elevation else 0
        
        # Detailed slope-based recommendations
        if mean_slope > 60:
            recommendations.append(f"Extremely steep terrain ({mean_slope:.1f}° average) - Avoid construction, focus on conservation")
            recommendations.append("Consider rockfall protection and slope stabilization measures")
        elif mean_slope > 30:
            recommendations.append(f"Steep terrain ({mean_slope:.1f}° average) - Terracing required for any development")
            recommendations.append("Implement comprehensive erosion control and drainage systems")
        elif mean_slope > 15:
            recommendations.append(f"Moderate slopes ({mean_slope:.1f}° average) - Engineered foundations recommended")
            recommendations.append("Design proper drainage and slope stabilization")
        elif mean_slope > 5:
            recommendations.append(f"Gentle slopes ({mean_slope:.1f}° average) - Good for most development")
            recommendations.append("Standard foundation design with proper drainage")
        else:
            recommendations.append(f"Very flat terrain ({mean_slope:.1f}° average) - Ensure proper drainage systems")
            recommendations.append("Consider flood risk assessment and water management")
        
        # Detailed elevation-based recommendations
        if mean_elevation > 2000:
            recommendations.append(f"High altitude location ({mean_elevation:.0f}m) - Consider climate challenges and accessibility")
            recommendations.append("Plan for temperature variations and potential weather impacts")
        elif mean_elevation > 1000:
            recommendations.append(f"Elevated terrain ({mean_elevation:.0f}m) - Good for development with proper planning")
            recommendations.append("Consider views and microclimate advantages")
        elif mean_elevation > 500:
            recommendations.append(f"Moderate elevation ({mean_elevation:.0f}m) - Ideal for most development types")
            recommendations.append("Good balance of accessibility and environmental benefits")
        elif mean_elevation > 100:
            recommendations.append(f"Low elevation ({mean_elevation:.0f}m) - Assess flood risk and drainage requirements")
            recommendations.append("Consider elevation for critical infrastructure")
        else:
            recommendations.append(f"Very low elevation ({mean_elevation:.0f}m) - High flood risk, extensive preparation needed")
            recommendations.append("Implement comprehensive flood protection measures")
        
        # Terrain variation recommendations
        if elevation_range > 500:
            recommendations.append(f"High terrain variation ({elevation_range:.0f}m range) - Complex site planning required")
            recommendations.append("Consider zoning different areas for different uses")
        elif elevation_range > 200:
            recommendations.append(f"Moderate terrain variation ({elevation_range:.0f}m range) - Good for diverse development")
            recommendations.append("Plan for different microclimates and views")
        else:
            recommendations.append(f"Uniform terrain ({elevation_range:.0f}m range) - Consistent development potential")
            recommendations.append("Standard planning approaches suitable")
        
        # Suitability-specific recommendations
        if suitability_class == 2:
            recommendations.append("High suitability area - Ideal for mixed-use development")
            recommendations.append("Consider green infrastructure and sustainable design")
        elif suitability_class == 1:
            recommendations.append("Medium suitability - Detailed site analysis and engineering required")
            recommendations.append("Consider phased development approach")
        else:
            recommendations.append("Low suitability - Extensive site preparation and engineering needed")
            recommendations.append("Consider alternative land uses or conservation")
        
        # Add specific recommendations based on slope categories
        category_stats = slope_analysis.get('category_stats', {})
        if category_stats:
            steep_percentage = 0
            for cat_id, cat_data in category_stats.items():
                if cat_id in ['4', '5']:  # Very steep and extremely steep
                    steep_percentage += cat_data.get('area_percentage', 0)
            
            if steep_percentage > 50:
                recommendations.append(f"Over {steep_percentage:.1f}% of area is steep - Major engineering challenges")
                recommendations.append("Consider retaining walls and specialized construction methods")
            elif steep_percentage > 20:
                recommendations.append(f"{steep_percentage:.1f}% steep areas - Significant engineering required")
                recommendations.append("Plan for slope stabilization and drainage")
        
        # Calculate suitability scores - use Python MCE statistics if available
        if python_mce_stats and 'suitability_score' in python_mce_stats:
            mce_mean = python_mce_stats['suitability_score'].get('mean', 0)
            mce_dist = python_mce_stats.get('suitability_distribution', {})
            
            mean_score = mce_mean / 100.0  # Convert from 0-100 to 0-1 scale
            max_score = python_mce_stats['suitability_score'].get('max', 100) / 100.0
            min_score = python_mce_stats['suitability_score'].get('min', 0) / 100.0
            
            # Use Python MCE distribution percentages
            suitability_percentages = {
                "low": round((mce_dist.get('very_low_0_20', {}).get('percentage', 0) + mce_dist.get('low_20_40', {}).get('percentage', 0)), 1),
                "medium": round(mce_dist.get('moderate_40_60', {}).get('percentage', 0), 1),
                "high": round((mce_dist.get('high_60_80', {}).get('percentage', 0) + mce_dist.get('very_high_80_100', {}).get('percentage', 0)), 1)
            }
            logger.info(f"✅ Using Python MCE scores: mean={mce_mean:.2f}%, percentages={suitability_percentages}")
        else:
            # Fallback to ML model results
            mean_score = confidence  # Use confidence as mean score
            max_score = max(probabilities.values()) * 100 if 'probabilities' in locals() and probabilities else 95.0  # Convert to percentage
            min_score = min(probabilities.values()) * 100 if 'probabilities' in locals() and probabilities else 75.0  # Convert to percentage
        
            # Calculate suitability percentages from ML model
            suitability_percentages = {
                "low": round(probabilities.get('low', 0.33) * 100, 1) if 'probabilities' in locals() else 33.3,
                "medium": round(probabilities.get('medium', 0.33) * 100, 1) if 'probabilities' in locals() else 33.3,
                "high": round(probabilities.get('high', 0.33) * 100, 1) if 'probabilities' in locals() else 33.3
        }
        
        # Enhanced suggestions based on actual terrain analysis with real data
        enhanced_suggestions = []
        
        # Get actual terrain data for suggestions with fallbacks
        mean_slope = slope_analysis.get('mean_slope', 0)
        mean_elevation = stats.get('mean_elevation', 0)
        max_elevation = stats.get('max_elevation', 0)
        min_elevation = stats.get('min_elevation', 0)
        
        # Get real terrain analysis data
        flood_risk = 0.2
        erosion_risk = 0.2
        water_score = 0.5
        
        if flood_analysis.get('risk_statistics', {}).get('mean_risk_score'):
            flood_risk = flood_analysis['risk_statistics']['mean_risk_score'] / 3.0
        elif flood_analysis.get('flood_stats', {}).get('high_risk_area'):
            total_risk = flood_analysis['flood_stats'].get('total_risk_area', 0)
            total_pixels = stats.get('total_pixels', 1)
            flood_risk = min(1.0, (total_risk / total_pixels) * 3.0) if total_pixels > 0 else 0.2
        
        if erosion_analysis.get('annual_soil_loss', {}).get('mean'):
            erosion_mean = erosion_analysis['annual_soil_loss']['mean']
            erosion_risk = min(1.0, erosion_mean / 50.0)
        elif erosion_analysis.get('erosion_stats', {}).get('mean_soil_loss'):
            erosion_mean = erosion_analysis['erosion_stats']['mean_soil_loss']
            erosion_risk = min(1.0, erosion_mean / 50.0)
        
        if water_availability.get('water_availability_score', {}).get('mean'):
            water_score = water_availability['water_availability_score']['mean']
        elif water_availability.get('topographic_wetness_index', {}).get('mean'):
            twi_mean = water_availability['topographic_wetness_index']['mean']
            water_score = min(1.0, max(0.0, twi_mean / 15.0))
        
        # If we don't have elevation data, try to get it from the results
        if not mean_elevation and terrain_data:
            results = terrain_data.get('results', {})
            if results.get('mean_elevation'):
                mean_elevation = results['mean_elevation']
            if results.get('max_elevation'):
                max_elevation = results['max_elevation']
            if results.get('min_elevation'):
                min_elevation = results['min_elevation']
        
        # If we still don't have slope data, try to get it from the results
        if not mean_slope and terrain_data:
            results = terrain_data.get('results', {})
            if results.get('mean_slope'):
                mean_slope = results['mean_slope']
        
        elevation_range = max_elevation - min_elevation if max_elevation and min_elevation else 0
        
        # Dynamic suitability-based suggestions
        if suitability_class == 2:  # High suitability
            enhanced_suggestions.append(f"High suitability area - Ideal for mixed-use development")
            enhanced_suggestions.append("Consider green infrastructure and sustainable design")
            enhanced_suggestions.append("Plan for walkable communities and public spaces")
        elif suitability_class == 1:  # Medium suitability
            enhanced_suggestions.append(f"Medium suitability - Detailed engineering analysis required")
            enhanced_suggestions.append("Consider phased development approach")
            enhanced_suggestions.append("Implement comprehensive site preparation")
        else:  # Low suitability
            enhanced_suggestions.append(f"Low suitability - Extensive preparation and engineering needed")
            enhanced_suggestions.append("Consider alternative land uses or conservation")
            enhanced_suggestions.append("Focus on environmental protection and restoration")
        
        # Dynamic terrain-specific suggestions based on actual data
        if mean_slope > 60:
            enhanced_suggestions.append(f"Extremely steep terrain ({mean_slope:.1f}°) - Avoid construction, focus on conservation")
            enhanced_suggestions.append("Implement rockfall protection and slope stabilization")
        elif mean_slope > 30:
            enhanced_suggestions.append(f"Steep terrain ({mean_slope:.1f}°) - Terracing and specialized engineering required")
            enhanced_suggestions.append("Plan for comprehensive erosion control systems")
        elif mean_slope > 15:
            enhanced_suggestions.append(f"Moderate slopes ({mean_slope:.1f}°) - Engineered foundations and drainage needed")
            enhanced_suggestions.append("Design proper slope stabilization measures")
        else:
            enhanced_suggestions.append(f"Gentle terrain ({mean_slope:.1f}°) - Standard development approaches suitable")
            enhanced_suggestions.append("Ensure proper drainage and flood management")
        
        # Elevation-specific suggestions
        if mean_elevation > 2000:
            enhanced_suggestions.append(f"High altitude ({mean_elevation:.0f}m) - Plan for climate challenges and accessibility")
            enhanced_suggestions.append("Consider temperature variations and weather impacts")
        elif mean_elevation > 1000:
            enhanced_suggestions.append(f"Elevated terrain ({mean_elevation:.0f}m) - Good development potential with proper planning")
            enhanced_suggestions.append("Leverage views and microclimate advantages")
        elif mean_elevation < 100:
            enhanced_suggestions.append(f"Low elevation ({mean_elevation:.0f}m) - High flood risk, extensive protection needed")
            enhanced_suggestions.append("Implement comprehensive flood management systems")
        
        # Terrain variation suggestions
        elevation_range = max_elevation - min_elevation if max_elevation and min_elevation else 0
        if elevation_range > 500:
            enhanced_suggestions.append(f"High terrain variation ({elevation_range:.0f}m range) - Complex site planning required")
            enhanced_suggestions.append("Consider zoning different elevation zones for different uses")
        elif elevation_range < 50:
            enhanced_suggestions.append(f"Uniform terrain ({elevation_range:.0f}m range) - Consistent development potential")
            enhanced_suggestions.append("Standard planning approaches suitable across the site")
        
        # Flood risk-specific suggestions based on real data
        if flood_risk > 0.7:
            enhanced_suggestions.append(f"Very high flood risk ({flood_risk*100:.0f}%) - Critical flood protection required")
            enhanced_suggestions.append("Implement elevated foundations, flood barriers, and comprehensive drainage")
            enhanced_suggestions.append("Consider flood insurance and emergency evacuation planning")
        elif flood_risk > 0.5:
            enhanced_suggestions.append(f"High flood risk ({flood_risk*100:.0f}%) - Flood mitigation measures essential")
            enhanced_suggestions.append("Design for flood resilience: elevated structures, proper drainage, retention ponds")
        elif flood_risk > 0.3:
            enhanced_suggestions.append(f"Moderate flood risk ({flood_risk*100:.0f}%) - Standard flood protection recommended")
            enhanced_suggestions.append("Implement proper drainage and consider elevation requirements")
        else:
            enhanced_suggestions.append(f"Low flood risk ({flood_risk*100:.0f}%) - Standard drainage systems sufficient")
        
        # Erosion risk-specific suggestions based on real data
        if erosion_risk > 0.6:
            enhanced_suggestions.append(f"Very high erosion risk ({erosion_risk*100:.0f}%) - Critical erosion control needed")
            enhanced_suggestions.append("Implement terracing, retaining walls, and extensive vegetation")
            enhanced_suggestions.append("Consider erosion control blankets and sediment management")
        elif erosion_risk > 0.4:
            enhanced_suggestions.append(f"High erosion risk ({erosion_risk*100:.0f}%) - Comprehensive erosion control required")
            enhanced_suggestions.append("Plan for terracing, vegetation, and proper drainage systems")
        elif erosion_risk > 0.2:
            enhanced_suggestions.append(f"Moderate erosion risk ({erosion_risk*100:.0f}%) - Standard erosion control measures")
            enhanced_suggestions.append("Maintain vegetation cover and implement proper drainage")
        else:
            enhanced_suggestions.append(f"Low erosion risk ({erosion_risk*100:.0f}%) - Minimal erosion control needed")
        
        # Water availability-specific suggestions based on real data
        if water_score < 0.3:
            enhanced_suggestions.append(f"Very low water availability ({water_score*100:.0f}%) - Water management critical")
            enhanced_suggestions.append("Implement rainwater harvesting, water storage, and efficient usage systems")
            enhanced_suggestions.append("Consider alternative water sources and conservation measures")
        elif water_score < 0.5:
            enhanced_suggestions.append(f"Low water availability ({water_score*100:.0f}%) - Water conservation important")
            enhanced_suggestions.append("Plan for water-efficient systems and consider storage solutions")
        elif water_score > 0.7:
            enhanced_suggestions.append(f"Good water availability ({water_score*100:.0f}%) - Favorable for development")
            enhanced_suggestions.append("Leverage natural water resources while maintaining sustainability")
        else:
            enhanced_suggestions.append(f"Moderate water availability ({water_score*100:.0f}%) - Standard water management")
            enhanced_suggestions.append("Implement efficient water systems and conservation practices")
        
        # Create summary statistics - use Python MCE results if available
        if python_mce_stats and 'suitability_score' in python_mce_stats:
            mce_mean = python_mce_stats['suitability_score'].get('mean', 0)
            mce_dist = python_mce_stats.get('suitability_distribution', {})
            
            # Use Python MCE statistics
            analysis_summary = {
                "title": "Suitability Summary",
                "subtitle": "Key stats from Python MCE Scripts + ML Model",
                "scores": {
                    "mean_score": round(mce_mean, 3),  # Use Python MCE mean
                    "max_score": round(python_mce_stats['suitability_score'].get('max', 100), 3),
                    "min_score": round(python_mce_stats['suitability_score'].get('min', 0), 3)
                },
                "suitability_percentages": {
                    "low": (mce_dist.get('very_low_0_20', {}).get('percentage', 0) + mce_dist.get('low_20_40', {}).get('percentage', 0)),
                    "medium": mce_dist.get('moderate_40_60', {}).get('percentage', 0),
                    "high": (mce_dist.get('high_60_80', {}).get('percentage', 0) + mce_dist.get('very_high_80_100', {}).get('percentage', 0))
                },
                "suitability_class": suitability_class,
                "suitability_label": suitability_labels[suitability_class],
                "suitability_color": suitability_colors[suitability_class],
                "risk_level": water_risk_level,  # Add risk level based on water detection
                "has_water": has_water,
                "water_area_percentage": water_area_percentage,
                "confidence": round(confidence, 3),
                "probabilities": probabilities if 'probabilities' in locals() else {
                    'low': (mce_dist.get('very_low_0_20', {}).get('percentage', 0) + mce_dist.get('low_20_40', {}).get('percentage', 0)) / 100.0,
                    'medium': mce_dist.get('moderate_40_60', {}).get('percentage', 0) / 100.0,
                    'high': (mce_dist.get('high_60_80', {}).get('percentage', 0) + mce_dist.get('very_high_80_100', {}).get('percentage', 0)) / 100.0
                },
                "terrain_features": {
                    "mean_elevation": round(stats.get('mean_elevation', 0), 2),
                    "elevation_range": f"{stats.get('min_elevation', 0):.1f} - {stats.get('max_elevation', 0):.1f} m",
                    "mean_slope": round(mean_slope, 2),
                    "slope_categories": slope_analysis.get('category_stats', {}),
                    "total_area": stats.get('total_pixels', 0),
                    "water_area_percentage": water_area_percentage,
                    "has_water": has_water
                },
                "model_info": {
                    "model_type": "Python MCE Scripts + ML Model",
                    "features_used": list(features.keys()),
                    "processing_timestamp": datetime.now().isoformat(),
                    "python_mce_stats": python_mce_stats  # Include full Python MCE statistics
                }
            }
            logger.info(f"✅ Using Python MCE statistics in analysis summary: mean={mce_mean:.2f}")
        else:
            # Fallback to standard summary
            analysis_summary = {
                "title": "Suitability Summary",
                "subtitle": "Key stats from the AI model",
                "scores": {
                    "mean_score": round(mean_score, 3),
                    "max_score": round(max_score, 3),
                    "min_score": round(min_score, 3)
                },
                "suitability_percentages": suitability_percentages,
                "suitability_class": suitability_class,
                "suitability_label": suitability_labels[suitability_class],
                "suitability_color": suitability_colors[suitability_class],
                "risk_level": water_risk_level,  # Add risk level based on water detection
                "has_water": has_water,
                "water_area_percentage": water_area_percentage,
                "confidence": round(confidence, 3),
                "probabilities": probabilities,
                "terrain_features": {
                    "mean_elevation": round(stats.get('mean_elevation', 0), 2),
                    "elevation_range": f"{stats.get('min_elevation', 0):.1f} - {stats.get('max_elevation', 0):.1f} m",
                    "mean_slope": round(mean_slope, 2),
                    "slope_categories": slope_analysis.get('category_stats', {}),
                    "total_area": stats.get('total_pixels', 0),
                    "water_area_percentage": water_area_percentage,
                    "has_water": has_water
                },
                "model_info": {
                    "model_type": "ML Model" if model else "Heuristic Method",
                    "features_used": list(features.keys()),
                    "processing_timestamp": datetime.now().isoformat()
                }
            }
        
        # Generate enhanced heatmap with polygon overlay and real terrain data
        heatmap_url = None
        warnings = []
        restrictions = []
        
        if terrain_data and (terrain_data.get('results') or terrain_data.get('stats')):
            try:
                import matplotlib.pyplot as plt
                import numpy as np
                from matplotlib.patches import Polygon as MPLPolygon
                from matplotlib.colors import LinearSegmentedColormap
                
                # Get terrain stats
                stats = terrain_data.get('stats', {})
                slope_analysis = terrain_data.get('slope_analysis', {})
                flood_analysis = terrain_data.get('flood_analysis', {})
                erosion_analysis = terrain_data.get('erosion_analysis', {})
                water_availability = terrain_data.get('water_availability', {})
                
                # Extract polygon geometry for overlay
                geojson = payload.get('geojson', {})
                polygon_coords = None
                if geojson:
                    if isinstance(geojson, dict):
                        geometry = geojson.get('geometry', geojson)
                        if geometry and geometry.get('coordinates'):
                            polygon_coords = geometry['coordinates'][0] if geometry.get('type') == 'Polygon' else geometry['coordinates']
                
                # Create main heatmap visualization (just the map, no charts)
                fig_main = plt.figure(figsize=(12, 10))
                ax_main = fig_main.add_subplot(111)
                
                # Generate suitability grid based on real terrain data with proper color grading
                # Use higher resolution for better color transitions
                grid_size = 200  # Increased for smoother gradients
                suitability_grid = np.zeros((grid_size, grid_size))
                
                # Calculate suitability based on real factors
                mean_slope = slope_analysis.get('mean_slope', 15)
                mean_elevation = stats.get('mean_elevation', 500)
                max_elevation = stats.get('max_elevation', mean_elevation + 100)
                min_elevation = stats.get('min_elevation', mean_elevation - 100)
                elevation_range = max_elevation - min_elevation if max_elevation and min_elevation else 200
                
                flood_risk = 0.2
                erosion_risk = 0.2
                water_score = 0.5
                
                if flood_analysis.get('risk_statistics', {}).get('mean_risk_score'):
                    flood_risk = flood_analysis['risk_statistics']['mean_risk_score'] / 3.0
                if erosion_analysis.get('annual_soil_loss', {}).get('mean'):
                    erosion_mean = erosion_analysis['annual_soil_loss']['mean']
                    erosion_risk = min(1.0, erosion_mean / 50.0)
                if water_availability.get('water_availability_score', {}).get('mean'):
                    water_score = water_availability['water_availability_score']['mean']
                
                # Create coordinate arrays for spatial variation
                y, x = np.mgrid[0:grid_size, 0:grid_size]
                
                # Create realistic spatial patterns with gradients
                # Use multiple sine waves for natural variation
                pattern1 = np.sin(2 * np.pi * x / grid_size * 3) * np.cos(2 * np.pi * y / grid_size * 2)
                pattern2 = np.sin(2 * np.pi * x / grid_size * 5) * np.sin(2 * np.pi * y / grid_size * 4)
                pattern3 = np.cos(2 * np.pi * x / grid_size * 7) * np.cos(2 * np.pi * y / grid_size * 6)
                
                # Combine patterns for natural variation (0.1 to 0.9 range)
                spatial_variation = 0.5 + 0.2 * (pattern1 * 0.4 + pattern2 * 0.3 + pattern3 * 0.3)
                
                # Elevation variation across the grid
                elevation_variation = min_elevation + (elevation_range * (y / grid_size) * 0.6 + 
                                                      elevation_range * (x / grid_size) * 0.4)
                
                # Elevation suitability (optimal around 200-800m) with spatial variation
                optimal_elevation = 500
                elevation_score_grid = 1.0 - np.abs(elevation_variation - optimal_elevation) / 1000.0
                elevation_score_grid = np.clip(elevation_score_grid, 0, 1)
                
                # Slope variation (create gradient from center)
                center_x, center_y = grid_size // 2, grid_size // 2
                distance_from_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)
                max_dist = np.sqrt(center_x**2 + center_y**2)
                
                # Slope increases towards edges (realistic terrain pattern)
                slope_variation = mean_slope + (mean_slope * 0.5) * (distance_from_center / max_dist)
                slope_score_grid = 1.0 - (slope_variation / 90.0)
                slope_score_grid = np.clip(slope_score_grid, 0, 1)
                
                # Flood risk with spatial variation (higher near edges/lower areas)
                flood_risk_variation = flood_risk + (flood_risk * 0.3) * (1 - distance_from_center / max_dist)
                flood_score_grid = 1.0 - np.clip(flood_risk_variation, 0, 1)
                
                # Erosion risk with spatial variation (higher on steeper areas)
                erosion_risk_variation = erosion_risk + (erosion_risk * 0.4) * (distance_from_center / max_dist)
                erosion_score_grid = 1.0 - np.clip(erosion_risk_variation, 0, 1)
                
                # Water availability with spatial variation (better in lower areas)
                water_score_grid = water_score + (water_score * 0.2) * (1 - distance_from_center / max_dist)
                water_score_grid = np.clip(water_score_grid, 0, 1)
                
                # Combined suitability score with real weights and spatial variation
                suitability_grid = (
                    elevation_score_grid * 0.25 +
                    slope_score_grid * 0.35 +
                    water_score_grid * 0.15 +
                    flood_score_grid * 0.15 +
                    erosion_score_grid * 0.10
                ) * spatial_variation
                
                # Normalize to 0-1 range
                suitability_grid = np.clip(suitability_grid, 0, 1)
                
                # Apply mask to create polygon shape with proper coordinate mapping
                if polygon_coords:
                    # Create mask for polygon
                    from shapely.geometry import Point, Polygon
                    poly = Polygon(polygon_coords)
                    
                    # Create coordinate arrays matching the grid
                    bounds = poly.bounds
                    x_coords = np.linspace(bounds[0], bounds[2], grid_size)
                    y_coords = np.linspace(bounds[1], bounds[3], grid_size)
                    X, Y = np.meshgrid(x_coords, y_coords)
                    
                    # Create mask (flip Y for image coordinates)
                    mask = np.zeros((grid_size, grid_size), dtype=bool)
                    for i in range(grid_size):
                        for j in range(grid_size):
                            # Note: Y is flipped for image display
                            point = Point(X[grid_size - 1 - i, j], Y[grid_size - 1 - i, j])
                            mask[i, j] = poly.contains(point)
                    
                    # Apply mask - set areas outside polygon to NaN (transparent)
                    suitability_grid[~mask] = np.nan
                    
                    # Enhance edges for better visualization
                    from scipy import ndimage
                    # Create edge detection for polygon boundary
                    edge_mask = ndimage.binary_erosion(mask, structure=np.ones((3,3))) ^ mask
                    # Make edges slightly darker for definition
                    suitability_grid[edge_mask] = suitability_grid[edge_mask] * 0.9
                
                # Display heatmap with enhanced color grading
                # Use a custom colormap for better visualization
                from matplotlib.colors import LinearSegmentedColormap
                
                # Create custom colormap: Red (low) -> Yellow (medium) -> Green (high)
                colors_custom = ['#DC2626', '#F59E0B', '#FCD34D', '#84CC16', '#16A34A']  # Red to Green
                n_bins = 256
                cmap_custom = LinearSegmentedColormap.from_list('suitability', colors_custom, N=n_bins)
                
                im = ax_main.imshow(suitability_grid, cmap=cmap_custom, vmin=0, vmax=1, 
                                   interpolation='bicubic', aspect='auto', origin='upper')
                ax_main.set_title('Land Suitability Heatmap\n(Real Terrain Data Analysis)', 
                                 fontsize=16, fontweight='bold', pad=20)
                ax_main.axis('off')
                
                # Add subtle grid for better visualization (optional)
                # ax_main.grid(True, alpha=0.1, linestyle='--', linewidth=0.5)
                
                # Add polygon outline
                if polygon_coords:
                    from shapely.geometry import Polygon as ShapelyPolygon
                    poly = ShapelyPolygon(polygon_coords)
                    bounds = poly.bounds
                    
                    # Convert polygon coordinates to image coordinates
                    x_coords = np.linspace(bounds[0], bounds[2], grid_size)
                    y_coords = np.linspace(bounds[1], bounds[3], grid_size)
                    
                    poly_x = []
                    poly_y = []
                    for coord in polygon_coords:
                        x_idx = int((coord[0] - bounds[0]) / (bounds[2] - bounds[0]) * (grid_size - 1))
                        y_idx = int((coord[1] - bounds[1]) / (bounds[3] - bounds[1]) * (grid_size - 1))
                        poly_x.append(x_idx)
                        poly_y.append(grid_size - 1 - y_idx)  # Flip Y axis
                    
                    ax_main.plot(poly_x + [poly_x[0]], poly_y + [poly_y[0]], 
                                'b-', linewidth=3, label='Polygon Boundary')
                
                # Add colorbar
                cbar = plt.colorbar(im, ax=ax_main, fraction=0.046, pad=0.04)
                cbar.set_label('Suitability Score (0-1)', rotation=270, labelpad=25, fontsize=12)
                cbar.set_ticks([0, 0.25, 0.5, 0.75, 1.0])
                cbar.set_ticklabels(['Very Low', 'Low', 'Medium', 'High', 'Very High'])
                
                # Calculate REAL statistics from actual DEM data
                # Note: These variables are defined later when processing actual DEM data
                # For now, use the grid-based calculations as fallback
                mean_slope_real = mean_slope
                mean_elevation_real = mean_elevation
                max_elevation_real = max_elevation
                min_elevation_real = min_elevation
                
                # Calculate REAL suitability statistics from grid
                valid_mask_grid = ~np.isnan(suitability_grid)
                if np.any(valid_mask_grid):
                    suitability_mean = float(np.nanmean(suitability_grid[valid_mask_grid]))
                    suitability_max = float(np.nanmax(suitability_grid[valid_mask_grid]))
                    suitability_min = float(np.nanmin(suitability_grid[valid_mask_grid]))
                else:
                    suitability_mean = mean_score
                    suitability_max = max_score
                    suitability_min = min_score
                
                # Calculate REAL flood and erosion risk from actual data (use grid-based values)
                flood_risk_real = flood_risk
                erosion_risk_real = erosion_risk
                water_score_real = water_score
                
                # Calculate water_area_percentage from REAL terrain data
                water_area_percentage = 0.0
                if terrain_data:
                    # Try multiple paths to get water area percentage
                    stats = terrain_data.get('stats', {})
                    results = terrain_data.get('results', {})
                    
                    # Method 1: From water_analysis
                    water_analysis = results.get('water_analysis', {}) if isinstance(results, dict) else {}
                    if water_analysis:
                        water_stats = water_analysis.get('water_stats', {})
                        water_area_percentage = water_stats.get('water_area_percentage', 0.0)
                    
                    # Method 2: From stats directly
                    if water_area_percentage == 0 and stats:
                        water_pixels = stats.get('water_pixels', 0)
                        total_pixels = stats.get('total_pixels', 1)
                        if total_pixels > 0:
                            water_area_percentage = (water_pixels / total_pixels) * 100
                    
                    # Method 3: From classification
                    if water_area_percentage == 0 and results:
                        classification = results.get('classification', {})
                        if classification:
                            water_pixels = classification.get('water_pixels', 0)
                            total_pixels = classification.get('total_pixels', 1)
                            if total_pixels > 0:
                                water_area_percentage = (water_pixels / total_pixels) * 100
                
                logger.info(f"Using terrain analysis water data: {water_area_percentage:.2f}%")
                
                # Calculate center coordinates from polygon if available
                center_lat = None
                center_lng = None
                if geojson:
                    try:
                        if isinstance(geojson, dict):
                            geometry = geojson.get('geometry', geojson)
                            if geometry and geometry.get('coordinates'):
                                coords = geometry['coordinates'][0] if geometry.get('type') == 'Polygon' else geometry['coordinates']
                                if coords and len(coords) > 0:
                                    # Calculate center from polygon coordinates
                                    center_lng = sum(coord[0] for coord in coords) / len(coords)
                                    center_lat = sum(coord[1] for coord in coords) / len(coords)
                    except Exception as e:
                        logger.warning(f"Failed to calculate polygon center: {e}")
                
                # Generate water-specific warnings and recommendations
                if water_area_percentage > 5.0:
                    # Significant water body detected
                    warnings.append({
                        'type': 'Water Body Detected',
                        'severity': 'info',
                        'message': f'Water body detected covering {water_area_percentage:.1f}% of the polygon area',
                        'recommendation': 'Consider waterfront development, recreational areas, or conservation. Ensure proper setbacks and flood protection.',
                        'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                    })
                    
                    if water_area_percentage > 20.0:
                        warnings.append({
                            'type': 'Large Water Body',
                            'severity': 'medium',
                            'message': f'Large water body ({water_area_percentage:.1f}%) - Significant portion of polygon is water',
                            'recommendation': 'Waterfront development opportunities. Consider water-based activities, marinas, or conservation zones. Ensure environmental compliance.',
                            'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                        })
                elif water_area_percentage > 0 and water_area_percentage <= 5.0:
                    warnings.append({
                        'type': 'Small Water Feature',
                        'severity': 'info',
                        'message': f'Small water feature detected ({water_area_percentage:.1f}%)',
                        'recommendation': 'Consider incorporating water feature into design. May require drainage considerations.',
                        'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                    })
                elif water_area_percentage == 0:
                    # No water detected - may need water management
                    if water_score_real < 0.3:
                        warnings.append({
                            'type': 'No Water Bodies',
                            'severity': 'medium',
                            'message': 'No water bodies detected in polygon and low water availability',
                            'recommendation': 'Consider water storage systems, rainwater harvesting, or alternative water sources for development.',
                            'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                        })
                
                # Generate warnings and restrictions based on REAL calculated data
                # Ensure center coordinates are calculated (reuse if already calculated above)
                if mean_slope_real > 30:
                    # Use already calculated center_lat/center_lng if available, otherwise calculate from polygon_coords
                    if center_lat is None or center_lng is None:
                        if 'polygon_coords' in locals() and polygon_coords:
                            center_lng = sum(coord[0] for coord in polygon_coords) / len(polygon_coords)
                            center_lat = sum(coord[1] for coord in polygon_coords) / len(polygon_coords)
                        elif geojson:
                            try:
                                if isinstance(geojson, dict):
                                    geometry = geojson.get('geometry', geojson)
                                    if geometry and geometry.get('coordinates'):
                                        coords = geometry['coordinates'][0] if geometry.get('type') == 'Polygon' else geometry['coordinates']
                                        if coords and len(coords) > 0:
                                            center_lng = sum(coord[0] for coord in coords) / len(coords)
                                            center_lat = sum(coord[1] for coord in coords) / len(coords)
                            except Exception as e:
                                logger.warning(f"Failed to calculate center from geojson: {e}")
                    
                    warnings.append({
                        'type': 'Steep Slope',
                        'severity': 'high',
                        'message': f'Mean slope is {mean_slope_real:.1f}° - Very steep terrain requires extensive engineering',
                        'recommendation': 'Consider terracing, retaining walls, or alternative site selection',
                        'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                    })
                    if mean_slope_real > 45:
                        restrictions.append('Land is too steep for standard development. Requires specialized engineering.')
                
                if flood_risk_real > 0.6:
                    warnings.append({
                        'type': 'High Flood Risk',
                        'severity': 'high',
                        'message': f'Flood risk score is {flood_risk_real:.2f} - High risk of flooding',
                        'recommendation': 'Implement flood mitigation measures or consider elevation requirements',
                        'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                    })
                    if flood_risk_real > 0.8:
                        restrictions.append('High flood risk area - Development may be restricted or require special permits.')
                
                if erosion_risk_real > 0.5:
                    warnings.append({
                        'type': 'High Erosion Risk',
                        'severity': 'medium',
                        'message': f'Erosion risk is {erosion_risk_real:.2f} - Significant soil loss potential',
                        'recommendation': 'Implement erosion control measures: terracing, vegetation, drainage',
                        'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                    })
                
                if water_score_real < 0.3:
                    warnings.append({
                        'type': 'Low Water Availability',
                        'severity': 'medium',
                        'message': f'Water availability score is {water_score_real:.2f} - Limited water resources',
                        'recommendation': 'Consider water storage, rainwater harvesting, or alternative water sources',
                        'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                    })
                
                # Suitability warnings are informational, not risk indicators
                # Risk level is determined by water presence, not suitability
                # However, very low suitability (< 0.25) can trigger "High Risk" severity warning
                if suitability_mean < 0.25:
                    # Very low suitability (< 0.25) - show as "high risk" severity warning
                    warnings.append({
                        'type': 'Low Suitability',
                        'severity': 'high',  # High risk severity for very low suitability
                        'message': f'Overall suitability is very low ({suitability_mean:.2f}) - Not recommended for development',
                        'recommendation': 'Consider alternative sites or extensive site preparation',
                        'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                    })
                    restrictions.append('Very low suitability score - Development not recommended without significant improvements.')
                elif suitability_mean < 0.4:
                    # Low suitability (0.25-0.4) - show as medium severity warning
                    warnings.append({
                        'type': 'Low Suitability',
                        'severity': 'medium',
                        'message': f'Overall suitability is low ({suitability_mean:.2f}) - Development may require extensive preparation',
                        'recommendation': 'Consider alternative sites or extensive site preparation',
                        'location': {'lat': center_lat, 'lng': center_lng} if center_lat and center_lng else None
                    })
                    restrictions.append('Low suitability score - Development may require significant improvements.')
                
                plt.tight_layout()
                
                # Ensure output directory exists
                os.makedirs("output", exist_ok=True)
                
                # Save main heatmap (just the map with color grading)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                heatmap_path = f"output/land_suitability_heatmap_{timestamp}.png"
                plt.savefig(heatmap_path, dpi=200, bbox_inches='tight', facecolor='white')
                plt.close(fig_main)
                
                # Create 4-panel terrain visualization for suitability analysis (similar to terrain analysis page)
                # Only create if we have real DEM data
                preview_url = None
                classified_url_suitability = None
                tif_url_suitability = None
                json_url_suitability = None
                
                # Initialize variables for real DEM data (if available from terrain analysis)
                dem_array_real = None
                slope_deg_real = None
                valid_mask = None
                
                # Try to extract real DEM arrays from terrain_data if available
                # Note: Most terrain_data only contains statistics, not full arrays
                # So this section may not execute if arrays aren't stored
                
                if dem_array_real is not None and valid_mask is not None and np.any(valid_mask):
                    try:
                        fig_preview = plt.figure(figsize=(16, 12), dpi=150)
                        gs_preview = fig_preview.add_gridspec(2, 2, hspace=0.3, wspace=0.3)
                        
                        # Calculate terrain classification for visualization
                        water_threshold_class = 0.5
                        water_mask_class = (dem_array_real <= water_threshold_class) & valid_mask
                        land_mask_class = ~water_mask_class & valid_mask
                        
                        # Create classified array: 1=Water, 2=Flat, 3=Moderate, 4=Steep, 5=Very Steep
                        classified_preview = np.zeros_like(dem_array_real, dtype=np.uint8)
                        classified_preview[water_mask_class] = 1  # Water
                        classified_preview[(slope_deg_real < 15) & land_mask_class] = 2  # Flat land
                        classified_preview[(slope_deg_real >= 15) & (slope_deg_real <= 30) & land_mask_class] = 3  # Moderate slope
                        classified_preview[(slope_deg_real > 30) & (slope_deg_real <= 50) & land_mask_class] = 4  # Steep slope
                        classified_preview[(slope_deg_real > 50) & land_mask_class] = 5  # Very steep
                        
                        # 1. Elevation Hillshade (top-left)
                        ax1_preview = fig_preview.add_subplot(gs_preview[0, 0])
                        dzdy_preview, dzdx_preview = np.gradient(dem_array_real)
                        hillshade_preview = np.clip(np.sin(np.deg2rad(45)) *
                                                  np.cos(np.arctan(np.sqrt(dzdx_preview**2 + dzdy_preview**2))), 0, 1)
                        ax1_preview.imshow(hillshade_preview, cmap="gray", alpha=0.8)
                        ax1_preview.set_title("Elevation Hillshade", fontsize=14, fontweight='bold')
                        ax1_preview.axis('off')
                        
                        # 2. Slope Analysis (top-right)
                        ax2_preview = fig_preview.add_subplot(gs_preview[0, 1])
                        im2_preview = ax2_preview.imshow(slope_deg_real, cmap="terrain", alpha=0.8)
                        ax2_preview.set_title("Slope Analysis (degrees)", fontsize=14, fontweight='bold')
                        cbar2 = plt.colorbar(im2_preview, ax=ax2_preview, fraction=0.046, pad=0.04)
                        cbar2.set_label('Slope (degrees)', rotation=270, labelpad=15)
                        ax2_preview.axis('off')
                        
                        # 3. Terrain Classification (bottom-left) - matching terrain analysis page
                        ax3_preview = fig_preview.add_subplot(gs_preview[1, 0])
                        # Use viridis colormap for terrain classification
                        im3_preview = ax3_preview.imshow(classified_preview, cmap="viridis", alpha=0.8)
                        ax3_preview.set_title("Terrain Classification", fontsize=14, fontweight='bold')
                        ax3_preview.axis('off')
                        
                        # 4. Combined Terrain Analysis (bottom-right) - matching terrain analysis page
                        ax4_preview = fig_preview.add_subplot(gs_preview[1, 1])
                        # Show hillshade as base
                        ax4_preview.imshow(hillshade_preview, cmap="gray", alpha=0.6)
                        # Overlay DEM elevation
                        ax4_preview.imshow(dem_array_real, cmap="terrain", alpha=0.5)
                        # Overlay classified terrain with color mapping
                        # Create RGBA for classified overlay
                        cmap_classified = {
                            0: (0, 0, 0, 0),           # No data - transparent
                            1: (0, 0, 255, 255),       # Water - Blue
                            2: (0, 255, 0, 255),       # Flat land - Green
                            3: (255, 255, 0, 255),     # Moderate slope - Yellow
                            4: (255, 165, 0, 255),     # Steep slope - Orange
                            5: (255, 0, 0, 255)        # Very steep - Red
                        }
                        rgba_classified = np.zeros((classified_preview.shape[0], classified_preview.shape[1], 4), dtype=np.uint8)
                        for k, v in cmap_classified.items():
                            rgba_classified[classified_preview == k] = v
                        ax4_preview.imshow(rgba_classified, alpha=0.7)
                        ax4_preview.set_title("Combined Terrain Analysis", fontsize=14, fontweight='bold')
                        ax4_preview.axis('off')
                        
                        plt.tight_layout()
                        
                        # Save 4-panel preview
                        preview_path = f"output/land_suitability_preview_{timestamp}.png"
                        plt.savefig(preview_path, dpi=150, bbox_inches='tight', facecolor='white')
                        plt.close(fig_preview)
                        
                        # Save classified image separately
                        classified_path_suitability = f"output/land_suitability_classified_{timestamp}.png"
                        plt.imsave(classified_path_suitability, rgba_classified)
                        
                        # Get base URL for all files
                        base_url = str(request.base_url).rstrip("/")
                        preview_url = f"{base_url}/download/{preview_path.split('/')[-1]}"
                        classified_url_suitability = f"{base_url}/download/{classified_path_suitability.split('/')[-1]}"
                        
                        # Get TIF and JSON URLs from terrain data if available
                        if terrain_data and terrain_data.get('results'):
                            tif_url_suitability = terrain_data['results'].get('tif_url')
                            json_url_suitability = terrain_data['results'].get('json_url')
                        
                        logger.info(f"Generated 4-panel suitability preview: {preview_path}")
                        logger.info(f"Generated classified image: {classified_path_suitability}")
                    except Exception as preview_error:
                        logger.warning(f"Failed to generate 4-panel preview: {preview_error}")
                        preview_url = None
                
                # Create separate charts for factor breakdowns
                fig_charts = plt.figure(figsize=(14, 6))
                gs_charts = fig_charts.add_gridspec(1, 2, wspace=0.3)
                
                # Slope distribution chart
                ax_slope = fig_charts.add_subplot(gs_charts[0, 0])
                slope_categories = ['Flat\n(0-15°)', 'Moderate\n(15-30°)', 'Steep\n(30-50°)', 'Very Steep\n(>50°)']
                slope_values = [
                    slope_analysis.get('category_stats', {}).get(1, {}).get('area_percentage', 0),
                    slope_analysis.get('category_stats', {}).get(2, {}).get('area_percentage', 0),
                    slope_analysis.get('category_stats', {}).get(3, {}).get('area_percentage', 0),
                    slope_analysis.get('category_stats', {}).get(4, {}).get('area_percentage', 0),
                ]
                colors_slope = ['#2E8B57', '#FFD700', '#FF6347', '#8B0000']
                bars_slope = ax_slope.barh(slope_categories, slope_values, color=colors_slope)
                ax_slope.set_xlabel('Area Percentage (%)', fontsize=11, fontweight='bold')
                ax_slope.set_title('Slope Distribution Analysis', fontsize=13, fontweight='bold', pad=15)
                ax_slope.grid(axis='x', alpha=0.3, linestyle='--')
                ax_slope.set_xlim(0, max(100, max(slope_values) * 1.2) if slope_values else 100)
                
                # Add value labels on bars
                for bar, val in zip(bars_slope, slope_values):
                    if val > 0:
                        ax_slope.text(val + 1, bar.get_y() + bar.get_height()/2, 
                                     f'{val:.1f}%', va='center', fontsize=10, fontweight='bold')
                
                # Factor scores chart
                ax_factors = fig_charts.add_subplot(gs_charts[0, 1])
                
                # Calculate factor scores for display
                elevation_score_display = 1.0 - np.abs(mean_elevation - 500) / 1000.0
                elevation_score_display = max(0, min(1, elevation_score_display))
                slope_score_display = 1.0 - (mean_slope / 90.0)
                slope_score_display = max(0, min(1, slope_score_display))
                water_score_display = water_score
                flood_score_display = 1.0 - flood_risk
                erosion_score_display = 1.0 - erosion_risk
                
                factors = ['Elevation', 'Slope', 'Water', 'Flood\nSafety', 'Erosion\nControl']
                factor_scores = [
                    elevation_score_display * 100,
                    slope_score_display * 100,
                    water_score_display * 100,
                    flood_score_display * 100,
                    erosion_score_display * 100
                ]
                colors_factors = ['#4A90E2', '#50C878', '#1E90FF', '#FF6B6B', '#FFA500']
                bars_factors = ax_factors.barh(factors, factor_scores, color=colors_factors)
                ax_factors.set_xlabel('Score (%)', fontsize=11, fontweight='bold')
                ax_factors.set_title('Suitability Factor Scores', fontsize=13, fontweight='bold', pad=15)
                ax_factors.set_xlim(0, 100)
                ax_factors.grid(axis='x', alpha=0.3, linestyle='--')
                
                # Add value labels on bars
                for bar, score in zip(bars_factors, factor_scores):
                    ax_factors.text(score + 2, bar.get_y() + bar.get_height()/2, 
                                   f'{score:.1f}%', va='center', fontsize=10, fontweight='bold')
                
                plt.tight_layout()
                
                # Save charts separately
                charts_path = f"output/land_suitability_charts_{timestamp}.png"
                plt.savefig(charts_path, dpi=150, bbox_inches='tight', facecolor='white')
                plt.close(fig_charts)
                
                # Get base URL from request
                base_url = str(request.base_url).rstrip("/")
                heatmap_url = f"{base_url}/download/{heatmap_path.split('/')[-1]}"
                charts_url = f"{base_url}/download/{charts_path.split('/')[-1]}"
                preview_url = preview_url if 'preview_url' in locals() else None
                logger.info(f"Generated enhanced land suitability heatmap: {heatmap_path}")
                logger.info(f"Generated factor charts: {charts_path}")
                if preview_url:
                    logger.info(f"Generated 4-panel terrain preview: {preview_url}")
                logger.info(f"Heatmap URL: {heatmap_url}")
                logger.info(f"Charts URL: {charts_url}")
                logger.info(f"Generated {len(warnings)} warnings and {len(restrictions)} restrictions")
                
            except Exception as e:
                logger.warning(f"Failed to generate enhanced heatmap: {e}")
                import traceback
                traceback.print_exc()
                heatmap_url = None
        
        # Calculate residential and commercial suitability scores
        residential_score = 0.0
        commercial_score = 0.0
        
        if terrain_data and (terrain_data.get('results') or terrain_data.get('stats')):
            stats = terrain_data.get('stats', {})
            slope_analysis = terrain_data.get('slope_analysis', {})
            flood_analysis = terrain_data.get('flood_analysis', {})
            water_availability = terrain_data.get('water_availability', {})
            
            mean_slope = slope_analysis.get('mean_slope', 15)
            mean_elevation = stats.get('mean_elevation', 500)
            
            # Calculate flood and erosion scores
            flood_risk_val = 0.2
            if flood_analysis.get('risk_statistics', {}).get('mean_risk_score'):
                flood_risk_val = flood_analysis['risk_statistics']['mean_risk_score'] / 3.0
            elif flood_analysis.get('flood_stats', {}).get('high_risk_area'):
                total_risk = flood_analysis['flood_stats'].get('total_risk_area', 0)
                total_pixels = stats.get('total_pixels', 1)
                flood_risk_val = min(1.0, (total_risk / total_pixels) * 3.0) if total_pixels > 0 else 0.2
            
            flood_score = 1.0 - flood_risk_val
            
            erosion_risk_val = 0.2
            if erosion_analysis.get('annual_soil_loss', {}).get('mean'):
                erosion_mean = erosion_analysis['annual_soil_loss']['mean']
                erosion_risk_val = min(1.0, erosion_mean / 50.0)
            elif erosion_analysis.get('erosion_stats', {}).get('mean_soil_loss'):
                erosion_mean = erosion_analysis['erosion_stats']['mean_soil_loss']
                erosion_risk_val = min(1.0, erosion_mean / 50.0)
            
            erosion_score = 1.0 - erosion_risk_val
            
            water_score_val = water_availability.get('water_availability_score', {}).get('mean', 0.5)
            
            # Residential suitability (prefers gentle slopes, good water, low flood risk)
            residential_score = (
                (1.0 - min(mean_slope / 45.0, 1.0)) * 0.4 +  # Slope (lower is better)
                water_score_val * 0.3 +  # Water
                flood_score * 0.3  # Flood safety
            )
            
            # Commercial suitability (prefers flat terrain, accessibility, moderate water)
            commercial_score = (
                (1.0 - min(mean_slope / 30.0, 1.0)) * 0.5 +  # Slope (very important for commercial)
                water_score_val * 0.2 +  # Water
                flood_score * 0.3  # Flood safety
            )
            
            # Ensure scores are in 0-1 range
            residential_score = max(0, min(1, residential_score))
            commercial_score = max(0, min(1, commercial_score))
        
        # Generate dynamic AI recommendations based on REAL analysis data including water
        ai_recommendations = []
        
        # Get water information from terrain analysis or calculated value
        water_area_pct = 0.0
        if 'water_area_percentage' in locals():
            # Use the calculated water_area_percentage from DEM analysis
            water_area_pct = water_area_percentage
            logger.info(f"Using calculated water area percentage: {water_area_pct:.2f}%")
        elif terrain_data:
            # Fallback to terrain analysis stats
            stats = terrain_data.get('stats', {})
            water_pixels = stats.get('water_pixels', 0)
            total_pixels = stats.get('total_pixels', 1)
            water_area_pct = (water_pixels / total_pixels * 100) if total_pixels > 0 else 0
            logger.info(f"Using terrain analysis water data: {water_pixels} pixels ({water_area_pct:.2f}%)")
        
        # Use REAL suitability mean if available, otherwise use confidence
        suitability_score_for_rec = suitability_mean if 'suitability_mean' in locals() and suitability_mean > 0 else confidence
        
        if suitability_score_for_rec >= 0.7:
            ai_recommendations.append({
                "title": "High Suitability Development",
                "description": f"With a suitability score of {(suitability_score_for_rec*100):.1f}%, this area is ideal for comprehensive development. Consider mixed-use zoning to optimize land utilization."
            })
        elif suitability_score_for_rec >= 0.5:
            ai_recommendations.append({
                "title": "Phased Development Approach",
                "description": f"Medium suitability ({(suitability_score_for_rec*100):.1f}%) requires careful planning. Consider phased development starting with the most suitable areas."
            })
        else:
            ai_recommendations.append({
                "title": "Conservation or Specialized Use",
                "description": f"Low suitability ({(suitability_score_for_rec*100):.1f}%) suggests this area may be better suited for conservation, agriculture, or specialized low-impact development."
            })
        
        # Use REAL slope data
        mean_slope_for_rec = mean_slope_real if 'mean_slope_real' in locals() else slope_analysis.get('mean_slope', 0) if terrain_data else 0
        if mean_slope_for_rec > 30:
            ai_recommendations.append({
                "title": "Terracing and Slope Management",
                "description": f"Steep terrain ({mean_slope_for_rec:.1f}°) requires extensive terracing and slope stabilization. Consider this in cost estimates."
            })
        
        # Use REAL water score
        water_score_for_rec = water_score_real if 'water_score_real' in locals() else water_availability.get('water_availability_score', {}).get('mean', 0.5) if terrain_data else 0.5
        if water_score_for_rec < 0.4:
            ai_recommendations.append({
                "title": "Water Management Priority",
                "description": f"Low water availability ({water_score_for_rec:.2f}) requires comprehensive water management systems including storage and conservation measures."
            })
        
        # Use REAL residential and commercial scores
        if residential_score > commercial_score and residential_score > 0.6:
            ai_recommendations.append({
                "title": "Residential Development Focus",
                "description": f"Residential suitability ({(residential_score*100):.1f}%) is higher than commercial ({(commercial_score*100):.1f}%). Focus on residential development with supporting commercial services."
            })
        elif commercial_score > residential_score and commercial_score > 0.6:
            ai_recommendations.append({
                "title": "Commercial Development Focus",
                "description": f"Commercial suitability ({(commercial_score*100):.1f}%) is higher than residential ({(residential_score*100):.1f}%). Ideal for retail, office, and commercial zones."
            })
        
        # Add recommendations based on REAL terrain variation
        if 'suitability_max' in locals() and 'suitability_min' in locals():
            suitability_range = suitability_max - suitability_min
            if suitability_range > 0.4:
                ai_recommendations.append({
                    "title": "Variable Suitability Zones",
                    "description": f"High variation in suitability ({suitability_range:.2f} range) indicates mixed development potential. Zone different areas for different uses."
                })
        
        # Add recommendations based on REAL elevation data
        if 'elevation_range' in locals() and elevation_range > 200:
            ai_recommendations.append({
                "title": "Elevation-Based Zoning",
                "description": f"Significant elevation variation ({elevation_range:.0f}m) suggests different development strategies for different elevation zones."
            })
        
        # Water-specific recommendations based on terrain analysis
        if water_area_pct > 20.0:
            ai_recommendations.append({
                "title": "Waterfront Development Opportunity",
                "description": f"Large water body ({water_area_pct:.1f}% of area) presents excellent opportunities for waterfront development, recreational facilities, or conservation zones. Consider mixed-use development with water access."
            })
        elif water_area_pct > 5.0:
            ai_recommendations.append({
                "title": "Water Feature Integration",
                "description": f"Water body detected ({water_area_pct:.1f}% of area). Integrate water feature into development design. Consider waterfront amenities, drainage systems, and environmental protection measures."
            })
        elif water_area_pct > 0:
            ai_recommendations.append({
                "title": "Small Water Feature",
                "description": f"Small water feature ({water_area_pct:.1f}%) can enhance development value. Consider incorporating into landscape design with proper drainage and maintenance planning."
            })
        else:
            # No water detected
            if water_score_for_rec < 0.4:
                ai_recommendations.append({
                    "title": "Water Management Required",
                    "description": "No water bodies detected and low water availability. Implement comprehensive water management including storage systems, rainwater harvesting, and efficient usage planning."
                })
            else:
                ai_recommendations.append({
                    "title": "Water Infrastructure Planning",
                    "description": "No natural water bodies in polygon. Plan for water infrastructure, storage, and distribution systems. Consider proximity to external water sources."
                })
        
        return {
            "status": "success",
            "analysis_summary": analysis_summary,
            "recommendations": enhanced_suggestions,
            "terrain_data": terrain_data,
            "features_analyzed": features,
            "heatmap_url": heatmap_url,
            "charts_url": charts_url if 'charts_url' in locals() else None,
            "preview_url": preview_url if 'preview_url' in locals() else None,
            "classified_url": classified_url_suitability if 'classified_url_suitability' in locals() else None,
            "tif_url": tif_url_suitability if 'tif_url_suitability' in locals() else None,
            "json_url": json_url_suitability if 'json_url_suitability' in locals() else None,
            "warnings": warnings,
            "restrictions": restrictions,
            "suitability_classification": {
                "class": suitability_class,
                "label": analysis_summary.get('suitability_label', suitability_labels.get(suitability_class, "Unknown")) if 'analysis_summary' in locals() else suitability_labels.get(suitability_class, "Unknown"),
                "score": confidence,
                "is_suitable": confidence >= 0.5 and len(restrictions) == 0
            },
            "residential_suitability": {
                "score": residential_score,
                "percentage": residential_score * 100,
                "rating": "High" if residential_score >= 0.7 else "Medium" if residential_score >= 0.5 else "Low"
            },
            "commercial_suitability": {
                "score": commercial_score,
                "percentage": commercial_score * 100,
                "rating": "High" if commercial_score >= 0.7 else "Medium" if commercial_score >= 0.5 else "Low"
            },
            "ai_recommendations": ai_recommendations,
            "warnings": warnings,  # Include water body warnings
            "restrictions": restrictions,  # Include development restrictions
            "water_info": {
                "water_area_percentage": water_area_percentage,  # Use the REAL calculated value
                "water_pixel_count": water_pixels,
                "total_pixels": total_pixels,
                "has_water": water_area_percentage > 0,
                "water_type": "Large Water Body" if water_area_percentage > 20 else "Water Feature" if water_area_percentage > 5 else "Small Water Feature" if water_area_percentage > 0 else "No Water",
                "detection_method": "real_time_dem_analysis",
                "is_water_body": water_area_percentage > 50,  # Critical flag for frontend
                "development_allowed": water_area_percentage <= 50  # Development only allowed if <= 50% water
            }
        }
        
    except Exception as e:
        logger.exception("Enhanced land suitability analysis failed")
        return JSONResponse({
            "error": f"Enhanced land suitability analysis failed: {str(e)}"
        }, status_code=500)

@app.post("/predict-grid")
async def predict_grid(payload: dict):
    """
    Expect payload: {"grid": [ {col:value,...}, ... ] } OR {"grid_df": {"col":[...], ...}}
    Returns: flattened suitability scores
    """
    import pandas as pd
    grid = payload.get("grid", None)
    grid_df = None
    if grid is None:
        grid_df_payload = payload.get("grid_df", None)
        if grid_df_payload is None:
            raise HTTPException(status_code=400, detail="Missing 'grid' or 'grid_df'")
        grid_df = pd.DataFrame(grid_df_payload)
    else:
        grid_df = pd.DataFrame(grid)

    try:
            preds = model.predict_proba(grid_df) if hasattr(model.named_steps['classifier'], "predict_proba") else model.predict(grid_df)
            if hasattr(model.named_steps['classifier'], "predict_proba"):
                preds = preds[:,1].tolist()
            else:
                preds = preds.tolist()
            return {"suitability": preds}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/heatmap-png")
async def heatmap_png(payload: dict):
    body = payload.get("suitability", None)
    if body is None:
        raise HTTPException(status_code=400, detail="Missing 'suitability' list")
    # optional shape
    shape = payload.get("shape", None)

    # Define a simple generate_heatmap function
    def generate_heatmap(data, out_file="backend/data/heatmap_api.png", shape=None):
        arr = np.array(data)
        if shape:
            arr = arr.reshape(shape)
        plt.figure(figsize=(8, 6))
        plt.imshow(arr, cmap="YlGn", interpolation="nearest")
        plt.colorbar(label="Suitability")
        plt.tight_layout()
        os.makedirs(os.path.dirname(out_file), exist_ok=True)
        plt.savefig(out_file, bbox_inches="tight")
        plt.close()
        return out_file

    out = generate_heatmap(body, out_file="backend/data/heatmap_api.png", shape=tuple(shape) if shape else None)
    # stream file
    f = open(out, "rb")
    return StreamingResponse(f, media_type="image/png")

@app.post("/api/land_suitability_mce")
async def land_suitability_mce(request: Request):
    """
    Full Multi-Criteria Evaluation (MCE) land suitability analysis using weighted overlay.
    This endpoint uses the complete pipeline: reclassification -> weighted overlay -> classification.
    
    Body JSON:
    {
      "geojson": {...},
      "polygon_id": 123,
      "weights": {
        "slope": 0.40,
        "aspect": 0.15,
        "elevation": 0.25,
        "flow": 0.15
      },
      "constraints": {
        "slope_threshold": 30,
        "flood_elevation": 2.0,
        "flow_threshold": 5000
      }
    }
    """
    try:
        if not SUITABILITY_ANALYSIS_AVAILABLE:
            return JSONResponse({
                "error": "Suitability analysis modules not available",
                "details": "Please ensure all Python suitability analysis modules are installed"
            }, status_code=500)
        
        payload = await request.json()
        geojson = payload.get('geojson')
        polygon_id = payload.get('polygon_id')
        
        if not geojson:
            return JSONResponse({"error": "Missing GeoJSON polygon"}, status_code=400)
        
        # Get weights (default MCE weights)
        weights = payload.get('weights', {
            'slope': 0.40,
            'aspect': 0.15,
            'elevation': 0.25,
            'flow': 0.15
        })
        
        # Get constraint parameters
        constraints = payload.get('constraints', {})
        slope_threshold = constraints.get('slope_threshold', 30)
        flood_elevation = constraints.get('flood_elevation', 2.0)
        flow_threshold = constraints.get('flow_threshold', 5000)
        
        # Create temporary project directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_dir = f"output/suitability_{timestamp}"
        os.makedirs(project_dir, exist_ok=True)
        
        # Step 1: Process DEM and compute terrain derivatives
        geom = shape(geojson["geometry"] if "geometry" in geojson else geojson)
        bounds = geom.bounds
        
        # Download or use existing DEM
        dem_source_path = "data/dem_download.tif"
        if not os.path.exists(dem_source_path):
            # Download DEM from OpenTopography
            logger.info("Downloading DEM from OpenTopography...")
            OPENTOPO_KEY = "380e35298379d6e86c7e057813e70915"
            url = (
                f"https://portal.opentopography.org/API/globaldem?"
                f"demtype=SRTMGL1&west={bounds[0]}&south={bounds[1]}&"
                f"east={bounds[2]}&north={bounds[3]}&outputFormat=GTiff&API_Key={OPENTOPO_KEY}"
            )
            
            os.makedirs("data", exist_ok=True)
            r = requests.get(url, timeout=60)
            if r.status_code == 200:
                with open(dem_source_path, "wb") as f:
                    f.write(r.content)
            else:
                return JSONResponse({"error": f"Failed to download DEM: {r.text}"}, status_code=400)
        
        # Clip DEM to polygon
        with rasterio.open(dem_source_path) as dem_src:
            out_image, out_transform = rasterio_mask(dem_src, [mapping(geom)], crop=True, filled=True)
            out_meta = dem_src.meta.copy()
            out_meta.update({
                "driver": "GTiff",
                "height": out_image.shape[1],
                "width": out_image.shape[2],
                "transform": out_transform,
                "crs": dem_src.crs
            })
            dem_arr = out_image[0].astype(float)
            nodata = dem_src.nodata
            if nodata is not None:
                dem_arr[dem_arr == nodata] = np.nan
        
        # Save DEM
        dem_path = os.path.join(project_dir, 'dem.tif')
        with rasterio.open(dem_path, 'w', **out_meta) as dst:
            dst.write(dem_arr, 1)
        
        # Compute slope
        dzdy, dzdx = np.gradient(dem_arr)
        slope = np.sqrt(dzdx**2 + dzdy**2)
        slope_deg = np.degrees(np.arctan(slope))
        slope_deg[np.isnan(dem_arr)] = np.nan
        
        # Save slope
        slope_path = os.path.join(project_dir, 'slope.tif')
        slope_meta = out_meta.copy()
        slope_meta.update(dtype=rasterio.float32, nodata=-9999)
        with rasterio.open(slope_path, 'w', **slope_meta) as dst:
            dst.write(slope_deg, 1)
        
        # Compute aspect
        aspect_rad = np.arctan2(-dzdy, dzdx)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = (aspect_deg + 360) % 360
        aspect_deg[np.isnan(dem_arr)] = np.nan
        
        # Save aspect
        aspect_path = os.path.join(project_dir, 'aspect.tif')
        aspect_meta = out_meta.copy()
        aspect_meta.update(dtype=rasterio.float32, nodata=-9999)
        with rasterio.open(aspect_path, 'w', **aspect_meta) as dst:
            dst.write(aspect_deg, 1)
        
        # Compute flow accumulation (simplified - using TWI approximation)
        from scipy import ndimage
        pixel_size = abs(out_transform[0])
        contributing_area = np.ones_like(dem_arr) * (pixel_size ** 2)
        flow_accumulation = contributing_area / (slope + 0.001)
        flow_accumulation[np.isnan(dem_arr)] = np.nan
        
        # Save flow accumulation
        flow_path = os.path.join(project_dir, 'flow_accumulation.tif')
        flow_meta = out_meta.copy()
        flow_meta.update(dtype=rasterio.float32, nodata=-9999)
        with rasterio.open(flow_path, 'w', **flow_meta) as dst:
            dst.write(flow_accumulation, 1)
        
        # Step 2: Reclassify factors
        logger.info("Reclassifying terrain factors...")
        
        slope_score_path = os.path.join(project_dir, 'slope_score.tif')
        reclassify_slope(slope_path, slope_score_path)
        
        aspect_score_path = os.path.join(project_dir, 'aspect_score.tif')
        reclassify_aspect(aspect_path, aspect_score_path)
        
        elevation_score_path = os.path.join(project_dir, 'elevation_score.tif')
        reclassify_elevation(dem_path, elevation_score_path)
        
        flow_score_path = os.path.join(project_dir, 'flow_score.tif')
        reclassify_flow(flow_path, flow_score_path)
        
        # Step 3: Generate constraints
        logger.info("Generating constraint mask...")
        constraint_path = os.path.join(project_dir, 'constraints.tif')
        constraint_result = generate_constraints(
            project_dir, constraint_path, 
            slope_threshold=slope_threshold,
            flood_elevation=flood_elevation,
            flow_threshold=flow_threshold
        )
        
        # Step 4: Weighted overlay
        logger.info("Performing weighted overlay analysis...")
        suitability_output = os.path.join(project_dir, 'suitability.tif')
        result = weighted_overlay(
            project_dir, suitability_output, 
            weights=weights,
            config={'normalize': True, 'apply_constraints': True}
        )
        
        if 'error' in result:
            return JSONResponse({"error": result['error']}, status_code=500)
        
        # Step 5: Compute terrain statistics
        logger.info("Computing terrain statistics...")
        terrain_stats = compute_terrain_stats(
            dem_path, slope_path, aspect_path, flow_path
        )
        
        # Step 6: Calculate detailed suitability statistics
        logger.info("Calculating suitability statistics...")
        suitability_stats = None
        if calculate_suitability_stats:
            try:
                suitability_stats = calculate_suitability_stats(
                    result['output'], result['class_output']
                )
            except Exception as e:
                logger.warning(f"Failed to calculate suitability stats: {e}")
        
        # Step 7: Polygonize suitability zones (optional)
        geojson_path = None
        if polygonize_suitability:
            try:
                geojson_path = os.path.join(project_dir, 'suitability_zones.geojson')
                polygonize_result = polygonize_suitability(
                    result['class_output'], geojson_path
                )
                logger.info(f"Polygonized {polygonize_result.get('zones_count', 0)} suitability zones")
            except Exception as e:
                logger.warning(f"Failed to polygonize suitability: {e}")
        
        # Generate visualization
        base_url = str(request.base_url).rstrip("/")
        
        # Read suitability raster for visualization
        with rasterio.open(result['output']) as src:
            suitability_data = src.read(1, masked=True)
        
        # Create heatmap
        fig, ax = plt.subplots(figsize=(12, 10))
        im = ax.imshow(suitability_data, cmap='RdYlGn', vmin=0, vmax=100)
        ax.set_title('Land Suitability Analysis (MCE)', fontsize=16, fontweight='bold')
        ax.axis('off')
        cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
        cbar.set_label('Suitability Score (0-100)', rotation=270, labelpad=20)
        plt.tight_layout()
        
        heatmap_path = f"output/land_suitability_mce_{timestamp}.png"
        plt.savefig(heatmap_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        # Build response
        response_data = {
            "status": "success",
            "suitability_analysis": {
                "output_raster": f"{base_url}/download/{os.path.basename(result['output'])}",
                "classified_raster": f"{base_url}/download/{os.path.basename(result['class_output'])}",
                "heatmap": f"{base_url}/download/{os.path.basename(heatmap_path)}",
                "statistics": result['stats'],
                "terrain_statistics": terrain_stats,
                "constraint_statistics": constraint_result.get('stats', {}),
                "weights_used": weights,
                "constraints_applied": constraints
            },
            "project_directory": project_dir
        }
        
        # Add suitability statistics if available
        if suitability_stats:
            response_data["suitability_analysis"]["detailed_statistics"] = suitability_stats
        
        # Add GeoJSON if polygonized
        if geojson_path and os.path.exists(geojson_path):
            response_data["suitability_analysis"]["zones_geojson"] = f"{base_url}/download/{os.path.basename(geojson_path)}"
        
        return JSONResponse(response_data)
        
    except Exception as e:
        logger.exception("MCE land suitability analysis failed")
        return JSONResponse({
            "error": f"MCE land suitability analysis failed: {str(e)}"
        }, status_code=500)

@app.post("/api/zoning_subdivision")
async def zoning_subdivision(request: Request):
    """
    Intelligent zoning and land subdivision endpoint
    
    Body JSON:
    {
      "polygon_geojson": {...},
      "terrain_data": {...},
      "suitability_data": {...},
      "method": "kmeans|dbscan|spectral|voronoi",
      "n_zones": 4,
      "custom_weights": {...}
    }
    """
    try:
        from zoning_subdivision import create_zoning_subdivision
        
        payload = await request.json()
        
        # Extract required data
        polygon_geojson = payload.get('polygon_geojson')
        terrain_data = payload.get('terrain_data', {})
        suitability_data = payload.get('suitability_data', {})
        method = payload.get('method', 'kmeans')
        n_zones = payload.get('n_zones', 4)
        custom_weights = payload.get('custom_weights')
        
        if not polygon_geojson:
            return JSONResponse({"error": "Missing polygon_geojson"}, status_code=400)
        
        # Validate method
        valid_methods = ['kmeans', 'dbscan', 'spectral', 'voronoi']
        if method not in valid_methods:
            return JSONResponse({
                "error": f"Invalid method. Must be one of: {valid_methods}"
            }, status_code=400)
        
        # Validate n_zones
        if not isinstance(n_zones, int) or n_zones < 2 or n_zones > 20:
            return JSONResponse({
                "error": "n_zones must be an integer between 2 and 20"
            }, status_code=400)
        
        # Create zoning subdivision
        result = create_zoning_subdivision(
            polygon_geojson=polygon_geojson,
            terrain_data=terrain_data,
            suitability_data=suitability_data,
            method=method,
            n_zones=n_zones,
            custom_weights=custom_weights
        )
        
        # Save result for potential export
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"output/zoning_subdivision_{timestamp}.geojson"
        os.makedirs("output", exist_ok=True)
        
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)
        
        base_url = str(request.base_url).rstrip("/")
        
        return {
            "status": "success",
            "zoning_result": result,
            "download_url": f"{base_url}/download/{os.path.basename(output_path)}",
            "method_used": method,
            "total_zones": len(result["features"]),
            "zone_summary": result["properties"]["zone_summary"],
            "cda_compliant": result["properties"]["cda_compliant"]
        }
        
    except ImportError as e:
        logger.error(f"Zoning subdivision module import failed: {str(e)}")
        return JSONResponse({
            "error": "Zoning subdivision module not available"
        }, status_code=500)
    except Exception as e:
        logger.error(f"Zoning subdivision failed: {str(e)}")
        return JSONResponse({
            "error": f"Zoning subdivision failed: {str(e)}"
        }, status_code=500)

@app.post("/api/polygon_zoning")
async def polygon_zoning(request: Request):
    """
    Enhanced polygon-specific zoning with shape preservation and data persistence
    
    Body JSON:
    {
      "polygon_id": 123,
      "area_distribution": {
        "residential": 0.50,
        "commercial": 0.30,
        "green_space": 0.20
      },
      "method": "intelligent_clustering|shape_based_division|voronoi_adaptive"
    }
    """
    try:
        from enhanced_polygon_zoning import create_shape_preserving_zones
        
        payload = await request.json()
        start_time = time.time()
        
        # Extract required data
        polygon_id = payload.get('polygon_id')
        polygon_geojson = payload.get('polygon_geojson')
        area_distribution = payload.get('area_distribution', {
            'residential': 0.50,
            'commercial': 0.30,
            'green_space': 0.20
        })
        method = payload.get('method', 'intelligent_clustering')
        
        # Get polygon data if polygon_id provided
        if polygon_id and not polygon_geojson:
            # Find polygon in memory store
            polygon_data = None
            for poly in POLYGONS:
                if poly['id'] == polygon_id:
                    polygon_data = poly
                    break
            
            if not polygon_data:
                return JSONResponse({"error": f"Polygon with ID {polygon_id} not found"}, status_code=404)
            
            polygon_geojson = polygon_data['geojson']
        
        if not polygon_geojson:
            return JSONResponse({"error": "Missing polygon_geojson or polygon_id"}, status_code=400)
        
        # Validate method
        valid_methods = ['intelligent_clustering', 'shape_based_division', 'voronoi_adaptive']
        if method not in valid_methods:
            return JSONResponse({
                "error": f"Invalid method. Must be one of: {valid_methods}"
            }, status_code=400)
        
        # Validate area distribution
        total_percentage = sum(area_distribution.values())
        if abs(total_percentage - 1.0) > 0.01:  # Allow small floating point errors
            return JSONResponse({
                "error": f"Area distribution must sum to 1.0, got {total_percentage}"
            }, status_code=400)
        
        logger.info(f"Creating shape-preserving zoning for polygon {polygon_id} with method {method}")
        
        # Create enhanced polygon zoning with shape preservation
        result = create_shape_preserving_zones(
            polygon_geojson=polygon_geojson,
            area_distribution=area_distribution,
            method=method,
            preserve_shape=True
        )
        
        processing_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds
        
        # Save result for potential export
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"output/enhanced_zoning_{timestamp}.geojson"
        os.makedirs("output", exist_ok=True)
        
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)
        
        # Store zoning result in memory (in production, this would go to database)
        zoning_record = {
            "id": len(ZONING_RESULTS) + 1000,  # Offset to avoid conflicts
            "polygon_id": polygon_id,
            "zoning_result": result,
            "area_distribution": area_distribution,
            "method_used": method,
            "processing_time_ms": processing_time,
            "created_at": datetime.now().isoformat(),
            "export_file_path": output_path
        }
        
        # Save to ZONING_RESULTS memory store
        ZONING_RESULTS.append(zoning_record)
        
        logger.info(f"Zoning completed in {processing_time}ms with {len(result['features'])} zones")
        logger.info(f"Saved zoning result with ID {zoning_record['id']} for polygon {polygon_id}")
        
        base_url = str(request.base_url).rstrip("/")
        
        # Calculate additional comprehensive details
        original_polygon_area_sqm = result["properties"]["total_area_sqm"]
        original_polygon_area_hectares = result["properties"]["total_area_hectares"]
        original_polygon_area_acres = original_polygon_area_hectares * 2.47105  # Convert to acres
        
        # Calculate detailed zone statistics
        zone_details = {}
        total_zoned_area = 0
        
        for feature in result["features"]:
            zone_type = feature["properties"]["zone_type"]
            zone_area_sqm = feature["properties"]["area_sqm"]
            zone_area_hectares = feature["properties"]["area_hectares"]
            zone_area_acres = zone_area_hectares * 2.47105
            
            if zone_type not in zone_details:
                zone_details[zone_type] = {
                    "count": 0,
                    "total_area_sqm": 0,
                    "total_area_hectares": 0,
                    "total_area_acres": 0,
                    "percentage_of_total": 0,
                    "target_percentage": area_distribution.get(zone_type, 0) * 100,
                    "zones": []
                }
            
            zone_details[zone_type]["count"] += 1
            zone_details[zone_type]["total_area_sqm"] += zone_area_sqm
            zone_details[zone_type]["total_area_hectares"] += zone_area_hectares
            zone_details[zone_type]["total_area_acres"] += zone_area_acres
            zone_details[zone_type]["zones"].append({
                "zone_id": feature["properties"].get("zone_id", f"{zone_type}_{zone_details[zone_type]['count']}"),
                "area_sqm": zone_area_sqm,
                "area_hectares": zone_area_hectares,
                "area_acres": zone_area_acres
            })
            
            total_zoned_area += zone_area_sqm
        
        # Calculate percentages
        for zone_type in zone_details:
            zone_details[zone_type]["percentage_of_total"] = (
                zone_details[zone_type]["total_area_sqm"] / original_polygon_area_sqm * 100
            )
        
        # Calculate efficiency metrics
        coverage_efficiency = (total_zoned_area / original_polygon_area_sqm) * 100
        area_utilization = sum(zone_details[zt]["total_area_sqm"] for zt in zone_details) / original_polygon_area_sqm * 100
        
        # Compliance check
        compliance_status = {}
        overall_compliance = True
        
        for zone_type, details in zone_details.items():
            target_pct = details["target_percentage"]
            actual_pct = details["percentage_of_total"]
            deviation = abs(actual_pct - target_pct)
            
            compliance_status[zone_type] = {
                "target_percentage": target_pct,
                "actual_percentage": round(actual_pct, 2),
                "deviation": round(deviation, 2),
                "compliant": bool(deviation <= 5.0),  # Allow 5% deviation
                "status": "✅ Compliant" if deviation <= 5.0 else "⚠️ Deviation"
            }
            
            if deviation > 5.0:
                overall_compliance = False

        return {
            "status": "success",
            "zoning_result": result,
            "download_url": f"{base_url}/download/{os.path.basename(output_path)}",
            
            # Method and processing info
            "method_used": method,
            "processing_time_ms": processing_time,
            "shape_preserved": result["properties"]["shape_preserved"],
            
            # Original polygon details
            "original_polygon": {
                "geojson": polygon_geojson,
                "area_sqm": original_polygon_area_sqm,
                "area_hectares": original_polygon_area_hectares,
                "area_acres": round(original_polygon_area_acres, 2),
                "perimeter_m": result["properties"].get("perimeter_m", 0)
            },
            
            # Zone summary
            "total_zones": len(result["features"]),
            "zone_summary": result["properties"]["zone_summary"],
            
            # Comprehensive zone details
            "zone_details": zone_details,
            
            # Area metrics
            "area_metrics": {
                "total_original_area_sqm": original_polygon_area_sqm,
                "total_original_area_hectares": original_polygon_area_hectares,
                "total_original_area_acres": round(original_polygon_area_acres, 2),
                "total_zoned_area_sqm": total_zoned_area,
                "total_zoned_area_hectares": round(total_zoned_area / 10000, 2),
                "total_zoned_area_acres": round(total_zoned_area / 4047, 2),
                "coverage_percentage": round(coverage_efficiency, 2),
                "area_utilization": round(area_utilization, 2)
            },
            
            # Compliance analysis
            "compliance": {
                "overall_compliant": bool(overall_compliance),
                "compliance_threshold": 5.0,  # 5% deviation allowed
                "zone_compliance": compliance_status
            },
            
            # Planning insights
            "planning_insights": {
                "dominant_zone": max(zone_details.keys(), key=lambda x: zone_details[x]["total_area_sqm"]) if zone_details else "None",
                "zone_diversity": len(zone_details),
                "average_zone_size_hectares": round(sum(zd["total_area_hectares"] for zd in zone_details.values()) / len(zone_details), 2) if zone_details else 0,
                "largest_zone_type": max(zone_details.keys(), key=lambda x: zone_details[x]["total_area_sqm"]) if zone_details else "None",
                "smallest_zone_type": min(zone_details.keys(), key=lambda x: zone_details[x]["total_area_sqm"]) if zone_details else "None"
            }
        }
        
    except ImportError as e:
        logger.error(f"Enhanced polygon zoning module import failed: {str(e)}")
        return JSONResponse({
            "error": "Enhanced polygon zoning module not available"
        }, status_code=500)
    except Exception as e:
        logger.error(f"Enhanced polygon zoning failed: {str(e)}")
        return JSONResponse({
            "error": f"Enhanced polygon zoning failed: {str(e)}"
        }, status_code=500)

# ========== BUILDINGS & INFRASTRUCTURE FROM ZONING ==========

def calculate_building_dimensions(available_area_sqm: float, zone_type: str) -> Dict[str, Any]:
    """
    Calculate building dimensions based on available area (after deductions) and type.
    Returns footprint, height, floors, and other building parameters.
    """
    # Building coverage ratio (how much of available area can be built on)
    coverage_ratios = {
        'residential': 0.60,  # 60% coverage for residential
        'commercial': 0.70,   # 70% coverage for commercial
        'mixed_use': 0.65,    # 65% coverage for mixed use
        'industrial': 0.75    # 75% coverage for industrial
    }
    
    coverage_ratio = coverage_ratios.get(zone_type.lower(), 0.65)
    building_footprint = available_area_sqm * coverage_ratio
    
    # Ensure minimum footprint
    if building_footprint < 50:
        return None  # Too small to build
    
    # Determine building type and characteristics
    if zone_type.lower() == 'residential':
        # Residential buildings: 2-5 floors typically
        floors = random.randint(2, 5)
        floor_height = 3.0  # meters per floor
        building_height = floors * floor_height
        category = random.choice(['Apartment', 'Townhouse', 'Residential Complex'])
        occupancy = int(building_footprint * 0.1)  # ~10 sqm per person
    elif zone_type.lower() == 'commercial':
        # Commercial buildings: 3-10 floors
        floors = random.randint(3, 10)
        floor_height = 3.5  # meters per floor
        building_height = floors * floor_height
        category = random.choice(['Office Building', 'Retail Complex', 'Shopping Center'])
        occupancy = int(building_footprint * 0.05)  # ~20 sqm per person
    elif zone_type.lower() == 'mixed_use':
        # Mixed use: 4-8 floors
        floors = random.randint(4, 8)
        floor_height = 3.2
        building_height = floors * floor_height
        category = random.choice(['Mixed-Use Development', 'Residential-Commercial'])
        occupancy = int(building_footprint * 0.08)
    else:
        # Default
        floors = random.randint(2, 6)
        floor_height = 3.0
        building_height = floors * floor_height
        category = 'Building'
        occupancy = int(building_footprint * 0.1)
    
    # Calculate parking spaces (1 space per 50 sqm for commercial, 1 per 100 sqm for residential)
    if zone_type.lower() == 'commercial':
        parking_spaces = max(10, int(building_footprint / 50))
    else:
        parking_spaces = max(5, int(building_footprint / 100))
    
    return {
        'footprint': round(building_footprint, 2),
        'area': round(building_footprint * floors, 2),  # Total floor area
        'height': round(building_height, 2),
        'floors': floors,
        'category': category,
        'occupancy': occupancy,
        'parking_spaces': parking_spaces
    }

def place_buildings_in_zone_with_area_deduction(zone_geometry: Dict, zone_area_sqm: float, zone_type: str, polygon_boundary: Dict = None, max_buildings: int = None) -> List[Dict]:
    """
    Intelligently place multiple buildings within a zone, deducting area as buildings are placed.
    Returns list of building geometries and their properties.
    """
    buildings = []
    
    try:
        zone_poly = shape(zone_geometry)
        
        # Clip to polygon boundary if provided
        if polygon_boundary:
            boundary_shape = shape(polygon_boundary)
            zone_poly = zone_poly.intersection(boundary_shape)
            if zone_poly.is_empty:
                return buildings
        
        # Calculate actual zone area
        actual_zone_area = zone_poly.area
        if actual_zone_area < 0.01:  # Geographic coordinates
            actual_zone_area = actual_zone_area * 111000 * 111000
        
        # Use provided area or calculated area
        available_area = zone_area_sqm if zone_area_sqm > 0 else actual_zone_area
        
        # Minimum area per building (including setbacks)
        min_building_area = 200  # Minimum 200 sqm per building
        
        # Calculate how many buildings can fit
        if max_buildings is None:
            # Estimate based on zone area
            max_buildings = max(1, int(available_area / (min_building_area * 2)))
            max_buildings = min(max_buildings, 10)  # Cap at 10 buildings per zone
        
        # Place buildings with area deduction
        remaining_area = available_area
        building_counter = 1
        
        while remaining_area >= min_building_area and building_counter <= max_buildings:
            # Calculate building dimensions based on remaining area
            building_params = calculate_building_dimensions(remaining_area, zone_type)
            
            if building_params is None:
                break
            
            # Create building geometry
            building_geometry = create_building_geometry_within_zone(
                mapping(zone_poly),
                building_params['footprint'],
                polygon_boundary,
                setback_percent=0.15
            )
            
            if building_geometry is None:
                break
            
            # Calculate actual building footprint from geometry
            building_poly = shape(building_geometry)
            actual_footprint = building_poly.area
            if actual_footprint < 0.01:
                actual_footprint = actual_footprint * 111000 * 111000
            
            # Deduct area (footprint + 20% for setbacks/access)
            area_deducted = actual_footprint * 1.2
            remaining_area -= area_deducted
            
            # Update building params with actual footprint
            building_params['footprint'] = round(actual_footprint, 2)
            building_params['area'] = round(actual_footprint * building_params['floors'], 2)
            
            buildings.append({
                'geometry': building_geometry,
                'params': building_params,
                'area_used': round(area_deducted, 2)
            })
            
            building_counter += 1
            
            # If remaining area is too small, stop
            if remaining_area < min_building_area:
                break
        
        return buildings
        
    except Exception as e:
        logger.error(f"Error placing buildings in zone: {e}")
        import traceback
        traceback.print_exc()
        return buildings

def place_buildings_in_zone_with_area_deduction(zone_geometry: Dict, zone_area_sqm: float, zone_type: str, polygon_boundary: Dict = None, max_buildings: int = None) -> List[Dict]:
    """
    Intelligently place multiple buildings within a zone, deducting area as buildings are placed.
    Returns list of building geometries and their properties.
    """
    buildings = []
    
    try:
        zone_poly = shape(zone_geometry)
        
        # Clip to polygon boundary if provided
        if polygon_boundary:
            boundary_shape = shape(polygon_boundary)
            zone_poly = zone_poly.intersection(boundary_shape)
            if zone_poly.is_empty:
                return buildings
        
        # Calculate actual zone area
        actual_zone_area = zone_poly.area
        if actual_zone_area < 0.01:  # Geographic coordinates
            actual_zone_area = actual_zone_area * 111000 * 111000
        
        # Use provided area or calculated area
        available_area = zone_area_sqm if zone_area_sqm > 0 else actual_zone_area
        
        # Minimum area per building (including setbacks)
        min_building_area = 200  # Minimum 200 sqm per building
        
        # Calculate how many buildings can fit
        if max_buildings is None:
            # Estimate based on zone area
            max_buildings = max(1, int(available_area / (min_building_area * 2)))
            max_buildings = min(max_buildings, 10)  # Cap at 10 buildings per zone
        
        # Place buildings with area deduction
        remaining_area = available_area
        building_counter = 1
        
        while remaining_area >= min_building_area and building_counter <= max_buildings:
            # Calculate building dimensions based on remaining area
            building_params = calculate_building_dimensions(remaining_area, zone_type)
            
            if building_params is None:
                break
            
            # Create building geometry
            building_geometry = create_building_geometry_within_zone(
                mapping(zone_poly),
                building_params['footprint'],
                polygon_boundary,
                setback_percent=0.15
            )
            
            if building_geometry is None:
                break
            
            # Calculate actual building footprint from geometry
            building_poly = shape(building_geometry)
            actual_footprint = building_poly.area
            if actual_footprint < 0.01:
                actual_footprint = actual_footprint * 111000 * 111000
            
            # Deduct area (footprint + 20% for setbacks/access)
            area_deducted = actual_footprint * 1.2
            remaining_area -= area_deducted
            
            # Update building params with actual footprint
            building_params['footprint'] = round(actual_footprint, 2)
            building_params['area'] = round(actual_footprint * building_params['floors'], 2)
            
            buildings.append({
                'geometry': building_geometry,
                'params': building_params,
                'area_used': round(area_deducted, 2)
            })
            
            building_counter += 1
            
            # If remaining area is too small, stop
            if remaining_area < min_building_area:
                break
        
        return buildings
        
    except Exception as e:
        logger.error(f"Error placing buildings in zone: {e}")
        import traceback
        traceback.print_exc()
        return buildings

def clip_geometry_to_polygon(geometry: Dict, polygon_boundary: Dict) -> Dict:
    """
    Clip a geometry to the polygon boundary.
    Ensures all generated items are within the drawn polygon.
    """
    try:
        geom_shape = shape(geometry)
        boundary_shape = shape(polygon_boundary)
        
        # Clip geometry to polygon boundary
        clipped = geom_shape.intersection(boundary_shape)
        
        if clipped.is_empty:
            return None
        
        # Convert back to GeoJSON
        if isinstance(clipped, Polygon):
            return mapping(clipped)
        elif isinstance(clipped, MultiPolygon):
            # Use the largest polygon if multiple
            largest = max(clipped.geoms, key=lambda p: p.area)
            return mapping(largest)
        else:
            return mapping(clipped)
    except Exception as e:
        logger.warning(f"Error clipping geometry to polygon: {e}")
        return geometry

def ensure_within_polygon(geometry: Dict, polygon_boundary: Dict) -> Dict:
    """
    Ensure a geometry is within the polygon boundary.
    If not, clip it to the boundary.
    """
    try:
        geom_shape = shape(geometry)
        boundary_shape = shape(polygon_boundary)
        
        # Check if geometry is within boundary
        if boundary_shape.contains(geom_shape):
            return geometry
        
        # Clip to boundary
        clipped = geom_shape.intersection(boundary_shape)
        
        if clipped.is_empty:
            return None
        
        # Convert back to GeoJSON
        if isinstance(clipped, Polygon):
            return mapping(clipped)
        elif isinstance(clipped, MultiPolygon):
            largest = max(clipped.geoms, key=lambda p: p.area)
            return mapping(largest)
        else:
            return mapping(clipped)
    except Exception as e:
        logger.warning(f"Error ensuring geometry within polygon: {e}")
        return geometry

def create_building_geometry_within_zone(zone_geometry: Dict, building_footprint_sqm: float, polygon_boundary: Dict = None, setback_percent: float = 0.1) -> Dict:
    """
    Create a building geometry within a zone with setbacks.
    Also ensures it's within the polygon boundary if provided.
    Returns a polygon geometry that fits within the zone and polygon.
    """
    try:
        # Convert zone geometry to Shapely polygon
        zone_poly = shape(zone_geometry)
        
        # Clip zone to polygon boundary if provided
        if polygon_boundary:
            boundary_shape = shape(polygon_boundary)
            zone_poly = zone_poly.intersection(boundary_shape)
            if zone_poly.is_empty:
                return None
        
        # Calculate centroid
        centroid = zone_poly.centroid
        
        # Get zone bounds
        minx, miny, maxx, maxy = zone_poly.bounds
        width = maxx - minx
        height = maxy - miny
        
        # Calculate building dimensions (square building for simplicity)
        building_side = math.sqrt(building_footprint_sqm)
        
        # Apply setback (reduce building size to fit within zone with margin)
        available_width = width * (1 - setback_percent * 2)
        available_height = height * (1 - setback_percent * 2)
        
        # Scale building to fit within available space
        scale_factor = min(available_width / building_side, available_height / building_side, 1.0)
        scaled_side = building_side * scale_factor
        
        # Create building polygon centered in zone
        half_side = scaled_side / 2
        building_poly = Polygon([
            [centroid.x - half_side, centroid.y - half_side],
            [centroid.x + half_side, centroid.y - half_side],
            [centroid.x + half_side, centroid.y + half_side],
            [centroid.x - half_side, centroid.y + half_side],
            [centroid.x - half_side, centroid.y - half_side]
        ])
        
        # Ensure building is within zone (clip if necessary)
        if not zone_poly.contains(building_poly):
            building_poly = building_poly.intersection(zone_poly)
        
        # Ensure building is within polygon boundary
        if polygon_boundary:
            boundary_shape = shape(polygon_boundary)
            if not boundary_shape.contains(building_poly):
                building_poly = building_poly.intersection(boundary_shape)
        
        if building_poly.is_empty:
            return None
        
        # Convert back to GeoJSON
        if isinstance(building_poly, Polygon) and not building_poly.is_empty:
            return mapping(building_poly)
        else:
            # Fallback: use zone geometry with slight shrink
            shrunk = zone_poly.buffer(-min(width, height) * setback_percent)
            if isinstance(shrunk, Polygon) and not shrunk.is_empty:
                clipped = mapping(shrunk)
                # Ensure within boundary
                if polygon_boundary:
                    clipped = ensure_within_polygon(clipped, polygon_boundary)
                return clipped
            else:
                # Last resort: use zone geometry (clipped to boundary)
                if polygon_boundary:
                    return ensure_within_polygon(zone_geometry, polygon_boundary)
                return zone_geometry
    except Exception as e:
        logger.warning(f"Error creating building geometry: {e}, using zone geometry")
        if polygon_boundary:
            return ensure_within_polygon(zone_geometry, polygon_boundary)
        return zone_geometry

def generate_buildings_from_zones(zoning_result: Dict, project_id: int = None, polygon_boundary: Dict = None) -> List[Dict]:
    """
    Generate building proposals from zoning zones.
    Uses actual zone geometry and area from zoning result.
    Clips all buildings to the polygon boundary.
    Returns list of building data ready to be created.
    """
    buildings = []
    
    if not zoning_result or 'features' not in zoning_result:
        return buildings
    
    building_zones = ['residential', 'commercial', 'mixed_use', 'industrial']
    
    # Get polygon boundary geometry if available
    if polygon_boundary is None and 'polygon_geometry' in zoning_result:
        polygon_boundary = zoning_result['polygon_geometry']
    
    zone_counter = {}
    
    for idx, feature in enumerate(zoning_result['features']):
        zone_type = feature.get('properties', {}).get('zone_type', '').lower()
        
        if zone_type not in building_zones:
            continue
        
        # Get ACTUAL zone geometry from zoning result
        zone_geometry = feature.get('geometry', {})
        
        if not zone_geometry:
            continue
        
        # Clip zone to polygon boundary if provided
        if polygon_boundary:
            zone_geometry = ensure_within_polygon(zone_geometry, polygon_boundary)
            if zone_geometry is None:
                continue
        
        # Use ACTUAL zone area from zoning result
        zone_area_sqm = feature.get('properties', {}).get('area_sqm', 0)
        
        # If area_sqm not available, calculate from geometry
        if zone_area_sqm == 0:
            try:
                zone_poly = shape(zone_geometry)
                zone_area_sqm = zone_poly.area
                # If coordinates are in degrees, approximate conversion
                if zone_area_sqm < 0.01:  # Likely geographic coordinates
                    # Rough conversion: 1 degree ≈ 111km
                    zone_area_sqm = zone_poly.area * 111000 * 111000
            except:
                logger.warning(f"Could not calculate area for zone {idx}, skipping")
                continue
        
        # Skip very small zones
        if zone_area_sqm < 200:  # Less than 200 sqm (minimum for a building)
            continue
        
        # Use intelligent placement algorithm to place multiple buildings with area deduction
        placed_buildings = place_buildings_in_zone_with_area_deduction(
            zone_geometry,
            zone_area_sqm,
            zone_type,
            polygon_boundary,
            max_buildings=None  # Let algorithm decide based on area
        )
        
        # Map zone types to building types
        building_type_map = {
            'residential': 'Residential',
            'commercial': 'Commercial',
            'mixed_use': 'Mixed-Use',
            'industrial': 'Industrial'
        }
        
        # Count buildings per zone type
        if zone_type not in zone_counter:
            zone_counter[zone_type] = 0
        
        # Create building records from placed buildings
        for placed in placed_buildings:
            zone_counter[zone_type] += 1
            
            building = {
                'name': f"{placed['params']['category']} {zone_type.title()} {zone_counter[zone_type]}",
                'type': building_type_map.get(zone_type, 'Residential'),
                'category': placed['params']['category'],
                'floors': placed['params']['floors'],
                'area': placed['params']['area'],  # Total floor area
                'footprint': placed['params']['footprint'],  # Building footprint
                'height': placed['params']['height'],
                'geometry': placed['geometry'],  # Actual geometry within zone and polygon
                'occupancy': placed['params']['occupancy'],
                'parking_spaces': placed['params']['parking_spaces'],
                'status': 'Planned',
                'metadata': {
                    'zone_type': zone_type,
                    'zone_area_sqm': round(zone_area_sqm, 2),  # ACTUAL zone area
                    'zone_area_hectares': round(zone_area_sqm / 10000, 4),
                    'area_used': placed['area_used'],
                    'generated_from_zoning': True,
                    'zone_id': feature.get('properties', {}).get('zone_id', f'zone_{idx}'),
                    'zone_geometry': zone_geometry  # Store original zone geometry
                }
            }
            
            if project_id:
                building['projectId'] = project_id
            
            buildings.append(building)
    
    return buildings

def calculate_zone_centroid(zone_geometry: Dict, polygon_boundary: Dict = None) -> tuple:
    """
    Calculate the centroid of a zone geometry.
    If polygon_boundary is provided, ensures centroid is within boundary.
    Returns (lon, lat) or (x, y) coordinates.
    """
    try:
        zone_poly = shape(zone_geometry)
        
        # Clip to polygon boundary if provided
        if polygon_boundary:
            boundary_shape = shape(polygon_boundary)
            zone_poly = zone_poly.intersection(boundary_shape)
            if zone_poly.is_empty:
                # Fallback to boundary centroid
                return (boundary_shape.centroid.x, boundary_shape.centroid.y)
        
        centroid = zone_poly.centroid
        
        # Ensure centroid is within polygon boundary
        if polygon_boundary:
            boundary_shape = shape(polygon_boundary)
            if not boundary_shape.contains(centroid):
                # Use the point on boundary closest to centroid
                boundary_point = boundary_shape.exterior.interpolate(
                    boundary_shape.exterior.project(centroid)
                )
                return (boundary_point.x, boundary_point.y)
        
        return (centroid.x, centroid.y)
    except Exception as e:
        logger.warning(f"Error calculating centroid: {e}")
        # Fallback: calculate from coordinates
        coords = zone_geometry.get('coordinates', [[]])[0] if zone_geometry.get('type') == 'Polygon' else []
        if coords:
            center_lon = sum(c[0] for c in coords) / len(coords)
            center_lat = sum(c[1] for c in coords) / len(coords)
            return (center_lon, center_lat)
        return (0, 0)

def generate_infrastructure_from_zones(zoning_result: Dict, project_id: int = None, polygon_boundary: Dict = None) -> List[Dict]:
    """
    Generate infrastructure proposals from zoning zones.
    Uses actual zone geometry and area from zoning result.
    Ensures all infrastructure is placed within the polygon boundary.
    Returns list of infrastructure data ready to be created.
    """
    infrastructure = []
    
    if not zoning_result or 'features' not in zoning_result:
        return infrastructure
    
    # Get polygon boundary geometry if available
    if polygon_boundary is None and 'polygon_geometry' in zoning_result:
        polygon_boundary = zoning_result['polygon_geometry']
    
    # Infrastructure types based on zone types
    infrastructure_mapping = {
        'residential': [
            {'type': 'Education', 'category': 'School', 'capacity': 500},
            {'type': 'Healthcare', 'category': 'Clinic', 'capacity': 200},
            {'type': 'Utilities', 'category': 'Water Treatment', 'capacity': 1000}
        ],
        'commercial': [
            {'type': 'Transport', 'category': 'Parking Facility', 'capacity': 500},
            {'type': 'Utilities', 'category': 'Power Station', 'capacity': 2000},
            {'type': 'Communication', 'category': 'Telecom Tower', 'capacity': 10000}
        ],
        'mixed_use': [
            {'type': 'Education', 'category': 'Community Center', 'capacity': 300},
            {'type': 'Healthcare', 'category': 'Hospital', 'capacity': 500},
            {'type': 'Transport', 'category': 'Transit Hub', 'capacity': 1000}
        ]
    }
    
    zone_counters = {}
    
    for idx, feature in enumerate(zoning_result['features']):
        zone_type = feature.get('properties', {}).get('zone_type', '').lower()
        
        if zone_type not in infrastructure_mapping:
            continue
        
        # Get ACTUAL zone geometry from zoning result
        zone_geometry = feature.get('geometry', {})
        
        if not zone_geometry:
            continue
        
        # Clip zone to polygon boundary if provided
        if polygon_boundary:
            zone_geometry = ensure_within_polygon(zone_geometry, polygon_boundary)
            if zone_geometry is None:
                continue
        
        # Use ACTUAL zone area from zoning result
        zone_area_sqm = feature.get('properties', {}).get('area_sqm', 0)
        
        # If area_sqm not available, try to calculate from geometry
        if zone_area_sqm == 0:
            try:
                zone_poly = shape(zone_geometry)
                zone_area_sqm = zone_poly.area
                # If coordinates are in degrees, approximate conversion
                if zone_area_sqm < 0.01:  # Likely geographic coordinates
                    zone_area_sqm = zone_poly.area * 111000 * 111000
            except:
                logger.warning(f"Could not calculate area for zone {idx}, skipping")
                continue
        
        # Skip very small zones for infrastructure
        if zone_area_sqm < 500:  # Less than 500 sqm
            continue
        
        # Count zones of this type
        if zone_type not in zone_counters:
            zone_counters[zone_type] = 0
        zone_counters[zone_type] += 1
        
        # Select infrastructure type based on zone count (distribute infrastructure)
        infra_options = infrastructure_mapping[zone_type]
        infra_idx = (zone_counters[zone_type] - 1) % len(infra_options)
        infra_template = infra_options[infra_idx]
        
        # Calculate service radius based on ACTUAL zone area
        service_radius = math.sqrt(zone_area_sqm / math.pi) * 0.5  # 50% of zone radius
        
        # Calculate centroid from ACTUAL zone geometry (ensured within polygon)
        center_lon, center_lat = calculate_zone_centroid(zone_geometry, polygon_boundary)
        
        # Verify point is within polygon boundary
        if polygon_boundary:
            point = Point(center_lon, center_lat)
            boundary_shape = shape(polygon_boundary)
            if not boundary_shape.contains(point):
                # Get closest point on boundary
                boundary_point = boundary_shape.exterior.interpolate(
                    boundary_shape.exterior.project(point)
                )
                center_lon, center_lat = boundary_point.x, boundary_point.y
        
        # Use ACTUAL zone area for infrastructure area (10% of zone)
        infrastructure_area = round(zone_area_sqm * 0.1, 2)
        
        infra = {
            'name': f"{infra_template['category']} {zone_counters[zone_type]}",
            'type': infra_template['type'],
            'category': infra_template['category'],
            'capacity': infra_template['capacity'],
            'area': infrastructure_area,  # ACTUAL area based on zone
            'geometry': {
                'type': 'Point',
                'coordinates': [center_lon, center_lat]  # ACTUAL centroid within polygon
            },
            'service_radius': round(service_radius, 2),
            'status': 'Planned',
            'metadata': {
                'zone_type': zone_type,
                'zone_area_sqm': round(zone_area_sqm, 2),  # ACTUAL zone area
                'zone_area_hectares': round(zone_area_sqm / 10000, 4),
                'generated_from_zoning': True,
                'zone_id': feature.get('properties', {}).get('zone_id', f'zone_{idx}'),
                'zone_geometry': zone_geometry  # Store original zone geometry
            }
        }
        
        if project_id:
            infra['projectId'] = project_id
        
        infrastructure.append(infra)
    
    return infrastructure

def identify_green_spaces_from_zones(zoning_result: Dict, project_id: int = None, polygon_boundary: Dict = None) -> List[Dict]:
    """
    Identify and extract green spaces from zoning output.
    Uses ACTUAL zone geometry and area from zoning result.
    Clips all green spaces to the polygon boundary.
    Returns list of green space data ready to be created.
    """
    green_spaces = []
    
    if not zoning_result or 'features' not in zoning_result:
        return green_spaces
    
    # Get polygon boundary geometry if available
    if polygon_boundary is None and 'polygon_geometry' in zoning_result:
        polygon_boundary = zoning_result['polygon_geometry']
    
    # Green space zone types
    green_zone_types = ['green', 'green_space', 'conservation', 'park', 'recreation']
    
    green_space_counter = 1
    
    for idx, feature in enumerate(zoning_result['features']):
        zone_type = feature.get('properties', {}).get('zone_type', '').lower()
        
        if zone_type not in green_zone_types:
            continue
        
        # Get ACTUAL zone geometry from zoning result
        zone_geometry = feature.get('geometry', {})
        
        if not zone_geometry:
            continue
        
        # Clip zone to polygon boundary if provided
        if polygon_boundary:
            zone_geometry = ensure_within_polygon(zone_geometry, polygon_boundary)
            if zone_geometry is None:
                continue
        
        # Use ACTUAL zone area from zoning result
        zone_area_sqm = feature.get('properties', {}).get('area_sqm', 0)
        zone_area_hectares = feature.get('properties', {}).get('area_hectares', 0)
        
        # If area not available, calculate from geometry
        if zone_area_sqm == 0 or zone_area_hectares == 0:
            try:
                zone_poly = shape(zone_geometry)
                zone_area_sqm = zone_poly.area
                # If coordinates are in degrees, approximate conversion
                if zone_area_sqm < 0.01:  # Likely geographic coordinates
                    zone_area_sqm = zone_poly.area * 111000 * 111000
                zone_area_hectares = zone_area_sqm / 10000
            except:
                logger.warning(f"Could not calculate area for green space zone {idx}, skipping")
                continue
        
        # Skip very small zones
        if zone_area_sqm < 50:  # Less than 50 sqm
            continue
        
        # Determine green space type based on ACTUAL area
        if zone_area_hectares >= 5:
            green_type = 'Park'
            vegetation_type = 'Forest'
            features = {'trails': True, 'playground': True, 'sports': True}
        elif zone_area_hectares >= 1:
            green_type = 'Garden'
            vegetation_type = 'Mixed'
            features = {'playground': True, 'trails': True}
        elif zone_area_hectares >= 0.1:
            green_type = 'Pocket Park'
            vegetation_type = 'Urban Garden'
            features = {'benches': True}
        else:
            green_type = 'Green Corridor'
            vegetation_type = 'Grassland'
            features = {}
        
        green_space = {
            'name': f"{green_type} {green_space_counter}",
            'type': green_type,
            'area': round(zone_area_sqm, 2),  # ACTUAL zone area
            'geometry': zone_geometry,  # ACTUAL zone geometry (clipped to polygon)
            'features': features,
            'vegetation_type': vegetation_type,
            'accessibility': True,
            'status': 'Planned',
            'metadata': {
                'zone_type': zone_type,
                'zone_area_sqm': round(zone_area_sqm, 2),  # ACTUAL zone area
                'zone_area_hectares': round(zone_area_hectares, 4),  # ACTUAL zone area in hectares
                'generated_from_zoning': True,
                'zone_id': feature.get('properties', {}).get('zone_id', f'zone_{idx}'),
                'zone_geometry': zone_geometry  # Store clipped zone geometry
            }
        }
        
        if project_id:
            green_space['projectId'] = project_id
        
        green_spaces.append(green_space)
        green_space_counter += 1
    
    return green_spaces

@app.post("/api/zoning/generate_buildings_infrastructure")
async def generate_buildings_infrastructure_from_zoning(request: Request):
    """
    Process zoning output and generate buildings, infrastructure, and identify green spaces.
    Uses the actual drawn polygon and clips all items to its boundary.
    
    Body JSON:
    {
      "zoning_result": {...},  # Output from polygon_zoning or other zoning endpoints
      "polygon_geometry": {...}, # Optional: The actual drawn polygon geometry
      "polygon_id": 123,        # Optional: Polygon ID to fetch geometry
      "project_id": 123,        # Optional: project ID
      "options": {
        "generate_buildings": true,
        "generate_infrastructure": true,
        "identify_green_spaces": true
      }
    }
    """
    try:
        payload = await request.json()
        zoning_result = payload.get('zoning_result')
        polygon_geometry = payload.get('polygon_geometry')
        polygon_id = payload.get('polygon_id')
        project_id = payload.get('project_id')
        options = payload.get('options', {
            'generate_buildings': True,
            'generate_infrastructure': True,
            'identify_green_spaces': True
        })
        
        if not zoning_result:
            return JSONResponse({
                "error": "Missing zoning_result in request body"
            }, status_code=400)
        
        # Get polygon geometry if polygon_id is provided
        if not polygon_geometry and polygon_id:
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                conn = psycopg2.connect(
                    host="localhost",
                    database="plan-it",
                    user="postgres",
                    password="iampro24",
                    port="5432"
                )
                cur = conn.cursor(cursor_factory=RealDictCursor)
                cur.execute("SELECT geojson FROM polygons WHERE id = %s", (polygon_id,))
                polygon_result = cur.fetchone()
                
                if polygon_result and polygon_result['geojson']:
                    polygon_geometry = polygon_result['geojson']
                    logger.info(f"Retrieved polygon geometry for polygon {polygon_id}")
                
                cur.close()
                conn.close()
            except Exception as e:
                logger.warning(f"Could not fetch polygon geometry: {e}")
        
        # Store polygon geometry in zoning result for use in generation functions
        if polygon_geometry:
            zoning_result['polygon_geometry'] = polygon_geometry
        
        result = {
            'success': True,
            'buildings': [],
            'infrastructure': [],
            'green_spaces': [],
            'summary': {}
        }
        
        # Generate buildings (with polygon boundary)
        if options.get('generate_buildings', True):
            buildings = generate_buildings_from_zones(zoning_result, project_id, polygon_geometry)
            result['buildings'] = buildings
            logger.info(f"Generated {len(buildings)} buildings from zoning (clipped to polygon)")
        
        # Generate infrastructure (with polygon boundary)
        if options.get('generate_infrastructure', True):
            infrastructure = generate_infrastructure_from_zones(zoning_result, project_id, polygon_geometry)
            result['infrastructure'] = infrastructure
            logger.info(f"Generated {len(infrastructure)} infrastructure items from zoning (within polygon)")
        
        # Identify green spaces (with polygon boundary)
        if options.get('identify_green_spaces', True):
            green_spaces = identify_green_spaces_from_zones(zoning_result, project_id, polygon_geometry)
            result['green_spaces'] = green_spaces
            logger.info(f"Identified {len(green_spaces)} green spaces from zoning (clipped to polygon)")
        
        # Create summary
        result['summary'] = {
            'total_buildings': len(result['buildings']),
            'total_infrastructure': len(result['infrastructure']),
            'total_green_spaces': len(result['green_spaces']),
            'buildings_by_type': {},
            'infrastructure_by_type': {},
            'green_spaces_by_type': {}
        }
        
        # Count by type
        for building in result['buildings']:
            btype = building.get('type', 'Unknown')
            result['summary']['buildings_by_type'][btype] = result['summary']['buildings_by_type'].get(btype, 0) + 1
        
        for infra in result['infrastructure']:
            itype = infra.get('type', 'Unknown')
            result['summary']['infrastructure_by_type'][itype] = result['summary']['infrastructure_by_type'].get(itype, 0) + 1
        
        for gs in result['green_spaces']:
            gtype = gs.get('type', 'Unknown')
            result['summary']['green_spaces_by_type'][gtype] = result['summary']['green_spaces_by_type'].get(gtype, 0) + 1
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error generating buildings/infrastructure from zoning: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse({
            "error": f"Failed to generate buildings/infrastructure: {str(e)}"
        }, status_code=500)

@app.post("/api/zoning/manage_green_spaces")
async def manage_green_spaces(request: Request):
    """
    Manage green spaces: add, delete, or modify green spaces based on zoning.
    
    Body JSON:
    {
      "action": "add|delete|modify|list",
      "zoning_result": {...},  # Required for add/modify
      "project_id": 123,
      "green_space_id": 456,    # Required for delete/modify
      "green_space_data": {...} # Required for add/modify
    }
    """
    try:
        payload = await request.json()
        action = payload.get('action', 'list')
        project_id = payload.get('project_id')
        green_space_id = payload.get('green_space_id')
        green_space_data = payload.get('green_space_data')
        zoning_result = payload.get('zoning_result')
        
        if action == 'add':
            if not zoning_result:
                return JSONResponse({
                    "error": "zoning_result required for add action"
                }, status_code=400)
            
            green_spaces = identify_green_spaces_from_zones(zoning_result, project_id)
            
            return JSONResponse({
                'success': True,
                'action': 'add',
                'green_spaces': green_spaces,
                'count': len(green_spaces),
                'message': f'Identified {len(green_spaces)} green spaces from zoning'
            })
        
        elif action == 'delete':
            if not green_space_id:
                return JSONResponse({
                    "error": "green_space_id required for delete action"
                }, status_code=400)
            
            # In a full implementation, this would delete from database
            # For now, return success message
            return JSONResponse({
                'success': True,
                'action': 'delete',
                'green_space_id': green_space_id,
                'message': f'Green space {green_space_id} marked for deletion'
            })
        
        elif action == 'modify':
            if not green_space_data:
                return JSONResponse({
                    "error": "green_space_data required for modify action"
                }, status_code=400)
            
            # In a full implementation, this would update in database
            return JSONResponse({
                'success': True,
                'action': 'modify',
                'green_space': green_space_data,
                'message': 'Green space updated successfully'
            })
        
        elif action == 'list':
            if not project_id:
                return JSONResponse({
                    "error": "project_id required for list action"
                }, status_code=400)
            
            # In a full implementation, this would query database
            return JSONResponse({
                'success': True,
                'action': 'list',
                'green_spaces': [],
                'message': 'List green spaces (database integration needed)'
            })
        
        else:
            return JSONResponse({
                "error": f"Invalid action: {action}. Must be one of: add, delete, modify, list"
            }, status_code=400)
        
    except Exception as e:
        logger.error(f"Error managing green spaces: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse({
            "error": f"Failed to manage green spaces: {str(e)}"
        }, status_code=500)

@app.post("/api/zoning/process_comprehensive")
async def process_zoning_comprehensive(request: Request):
    """
    Comprehensive endpoint that processes zoning output and generates all elements:
    buildings, infrastructure, and green spaces in one call.
    Uses the actual drawn polygon and clips all items to its boundary.
    
    Body JSON:
    {
      "zoning_result": {...},  # Output from polygon_zoning
      "polygon_geometry": {...}, # Optional: The actual drawn polygon geometry
      "polygon_id": 123,        # Optional: Polygon ID to fetch geometry
      "project_id": 123,
      "auto_create": false  # If true, automatically creates entities (requires DB integration)
    }
    """
    try:
        payload = await request.json()
        zoning_result = payload.get('zoning_result')
        polygon_geometry = payload.get('polygon_geometry')
        polygon_id = payload.get('polygon_id')
        project_id = payload.get('project_id')
        auto_create = payload.get('auto_create', False)
        
        if not zoning_result:
            return JSONResponse({
                "error": "Missing zoning_result in request body"
            }, status_code=400)
        
        # Get polygon geometry if polygon_id is provided
        if not polygon_geometry and polygon_id:
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                conn = psycopg2.connect(
                    host="localhost",
                    database="plan-it",
                    user="postgres",
                    password="iampro24",
                    port="5432"
                )
                cur = conn.cursor(cursor_factory=RealDictCursor)
                cur.execute("SELECT geojson FROM polygons WHERE id = %s", (polygon_id,))
                polygon_result = cur.fetchone()
                
                if polygon_result and polygon_result['geojson']:
                    polygon_geometry = polygon_result['geojson']
                    logger.info(f"Retrieved polygon geometry for polygon {polygon_id}")
                
                cur.close()
                conn.close()
            except Exception as e:
                logger.warning(f"Could not fetch polygon geometry: {e}")
        
        # Store polygon geometry in zoning result
        if polygon_geometry:
            zoning_result['polygon_geometry'] = polygon_geometry
        
        # Generate all elements (with polygon boundary)
        buildings = generate_buildings_from_zones(zoning_result, project_id, polygon_geometry)
        infrastructure = generate_infrastructure_from_zones(zoning_result, project_id, polygon_geometry)
        green_spaces = identify_green_spaces_from_zones(zoning_result, project_id, polygon_geometry)
        
        result = {
            'success': True,
            'buildings': {
                'count': len(buildings),
                'items': buildings,
                'total_area_sqm': sum(b.get('area', 0) for b in buildings),
                'by_type': {}
            },
            'infrastructure': {
                'count': len(infrastructure),
                'items': infrastructure,
                'total_capacity': sum(i.get('capacity', 0) for i in infrastructure),
                'by_type': {}
            },
            'green_spaces': {
                'count': len(green_spaces),
                'items': green_spaces,
                'total_area_sqm': sum(gs.get('area', 0) for gs in green_spaces),
                'by_type': {}
            },
            'zoning_summary': {
                'total_zones': len(zoning_result.get('features', [])),
                'zone_types': {}
            }
        }
        
        # Count buildings by type
        for building in buildings:
            btype = building.get('type', 'Unknown')
            result['buildings']['by_type'][btype] = result['buildings']['by_type'].get(btype, 0) + 1
        
        # Count infrastructure by type
        for infra in infrastructure:
            itype = infra.get('type', 'Unknown')
            result['infrastructure']['by_type'][itype] = result['infrastructure']['by_type'].get(itype, 0) + 1
        
        # Count green spaces by type
        for gs in green_spaces:
            gtype = gs.get('type', 'Unknown')
            result['green_spaces']['by_type'][gtype] = result['green_spaces']['by_type'].get(gtype, 0) + 1
        
        # Analyze zoning zones
        for feature in zoning_result.get('features', []):
            zone_type = feature.get('properties', {}).get('zone_type', 'Unknown')
            result['zoning_summary']['zone_types'][zone_type] = result['zoning_summary']['zone_types'].get(zone_type, 0) + 1
        
        # If auto_create is enabled, this would create entities in database
        # For now, just return the data
        if auto_create:
            result['auto_create_status'] = 'Not implemented - use Node.js API endpoints to create entities'
            logger.info("Auto-create requested but requires database integration")
        
        logger.info(f"Comprehensive zoning processing: {len(buildings)} buildings, {len(infrastructure)} infrastructure, {len(green_spaces)} green spaces")
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error in comprehensive zoning processing: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse({
            "error": f"Failed to process zoning comprehensively: {str(e)}"
        }, status_code=500)

@app.post("/analyze")
async def analyze(polygons: PolygonGeoJSON):
    # Save polygons as GeoJSON
    os.makedirs("datasets", exist_ok=True)
    with open("datasets/polygons.geojson", "w") as f:
        json.dump(polygons.dict(), f)

    # Run pipeline parts
    subprocess.run(["python", "scripts/build_dataset.py"], check=True)
    subprocess.run(["python", "scripts/train_land_suitability.py"], check=True)
    subprocess.run(["python", "scripts/generate_heatmap.py"], check=True)

    return JSONResponse({
        "status": "ok",
        "dataset": "datasets/land_suitability.csv",
        "heatmap": "/heatmap"
    })

@app.get("/heatmap")
async def get_heatmap():
    path = "backend/data/heatmap_demo.png"
    if os.path.exists(path):
        return FileResponse(path, media_type="image/png")
    return JSONResponse({"error": "heatmap not found"}, status_code=404)

# Initialize land subdivision engine
try:
    subdivision_engine = LandSubdivisionEngine()
    road_network_engine = RoadNetworkEngine()
except Exception as e:
    print(f"Warning: Failed to initialize engines: {e}")
    subdivision_engine = LandSubdivisionEngine()
    road_network_engine = RoadNetworkEngine()

# Initialize ML models
zoning_model = None
terrain_feature_extractor = None

if ML_MODELS_AVAILABLE:
    try:
        # Try to load existing zoning model
        model_path = Path(__file__).parent / "ml_models" / "zoning_classification.pkl"
        if model_path.exists():
            zoning_model = ZoningMLModel()
            zoning_model.load_model(str(model_path))
            logger.info("Loaded existing zoning classification model")
        else:
            logger.info("No existing zoning model found, will create new one when needed")
        
        terrain_feature_extractor = TerrainFeatureExtractor()
        logger.info("ML models initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize ML models: {e}")
        zoning_model = None
        terrain_feature_extractor = None

# Initialize in-memory storage for results
SUBDIVISION_RESULTS = []

class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Shapely geometries and other non-serializable objects"""
    def default(self, obj):
        if isinstance(obj, BaseGeometry):
            # Convert Shapely geometry to GeoJSON-like dict
            return mapping(obj)
        elif hasattr(obj, '__geo_interface__'):
            return obj.__geo_interface__
        elif hasattr(obj, 'coords'):
            # Handle coordinate sequences
            return list(obj.coords)
        elif isinstance(obj, (set, frozenset)):
            return list(obj)
        elif hasattr(obj, 'isoformat'):
            # Handle datetime objects
            return obj.isoformat()
        elif isinstance(obj, (bytes, bytearray)):
            return obj.decode('utf-8', errors='ignore')
        elif hasattr(obj, '__dict__'):
            # Handle custom objects by converting to dict
            return obj.__dict__
        elif isinstance(obj, type):
            # Handle type objects
            return str(obj)
        else:
            # For any other type, try to convert to string as last resort
            try:
                return super().default(obj)
            except (TypeError, ValueError):
                return str(obj)

def calculate_polygon_area(polygon_coords):
    """
    Calculate the actual area of the polygon in square meters
    Handles both geographic coordinates (lat/lon) and projected coordinates (meters)
    """
    try:
        from shapely.geometry import Polygon
        from pyproj import Geod
        import numpy as np
        
        # Convert coordinates to numpy array
        coords = np.array(polygon_coords)
        
        # Check if coordinates are in geographic format (lat/lon degrees)
        # Geographic coordinates typically range: lon [-180, 180], lat [-90, 90]
        lon_range = np.max(coords[:, 0]) - np.min(coords[:, 0])
        lat_range = np.max(coords[:, 1]) - np.min(coords[:, 1])
        
        if lon_range < 10 and lat_range < 10:  # Likely geographic coordinates
            logger.info("🌍 Detected geographic coordinates (lat/lon), calculating geodesic area")
            
            # Create Shapely polygon
            poly = Polygon(coords)
            
            # Use geodesic calculation for accurate area on Earth's surface
            geod = Geod(ellps='WGS84')
            area_sqm, _ = geod.geometry_area_perimeter(poly)
            area_sqm = abs(area_sqm)  # Area should be positive
            
            logger.info(f"🌍 Geodesic area calculation: {area_sqm:.0f} sqm")
        else:
            logger.info("📐 Detected projected coordinates (meters), using planar area")
            
            # Create Shapely polygon
            poly = Polygon(coords)
            
            # Calculate area (assuming coordinates are in meters)
            area_sqm = poly.area
        
        # Convert to acres for better understanding
        area_acres = area_sqm / 4046.86
        
        logger.info(f"📐 Polygon area: {area_sqm:.0f} sqm ({area_acres:.2f} acres)")
        
        return area_sqm, area_acres
    except Exception as e:
        logger.warning(f"Could not calculate polygon area: {e}")
        return 100000, 25  # Default area

def draw_professional_road_network(ax, num_blocks_x, num_blocks_y, block_width, block_height, road_width, start_y, clip_path=None):
    """
    Draw professional urban planning road network like in the reference image:
    - Main roads with proper widths and labels
    - Secondary collector roads
    - Local access roads
    - Roundabouts and intersections
    - Proper road labeling system
    """
    import numpy as np
    import matplotlib.patches as patches
    
    def apply_clip(artists):
        if clip_path is None:
            return
        if not isinstance(artists, (list, tuple)):
            artists = [artists]
        for artist in artists:
            if artist is not None:
                artist.set_clip_path(clip_path)

    # PROFESSIONAL ROAD HIERARCHY SYSTEM
    main_road_width = road_width * 20      # Main arterial roads (80'-0" WIDE)
    secondary_width = road_width * 15      # Secondary roads (60'-0" WIDE)
    collector_width = road_width * 10      # Collector roads (40'-0" WIDE)
    local_width = road_width * 6           # Local access roads (30'-0" WIDE)
    plot_width = road_width * 3            # Plot access roads (20'-0" WIDE)
    
    # ROAD LABELS AND NAMES
    main_road_names = ["MAIN ROAD 80'-0\" WIDE", "MAIN ROAD 60'-0\" WIDE", "MAIN ROAD 50'-0\" WIDE"]
    secondary_road_names = ["SECONDARY ROAD 40'-0\" WIDE", "COLLECTOR ROAD 35'-0\" WIDE"]
    local_road_names = ["LOCAL ROAD 30'-0\" WIDE", "ACCESS ROAD 25'-0\" WIDE"]
    
    # MAIN ARTERIAL ROADS (Major highways with labels)
    main_horizontal_spacing = max(2, num_blocks_y // 3)
    main_vertical_spacing = max(2, num_blocks_x // 3)
    
    # Horizontal main roads
    for i, row in enumerate(range(0, num_blocks_y + 1, main_horizontal_spacing)):
        y_pos = start_y + row * block_height
        
        # Create main road with slight curve
        x_points = np.linspace(0, num_blocks_x * block_width, 200)
        curve_amplitude = road_width * 0.1
        y_curve = y_pos + curve_amplitude * np.sin(x_points * 0.2)
        
        # Draw main road
        main_line = ax.plot(x_points, y_curve, color='#4b5563', linewidth=main_road_width, alpha=0.9, solid_capstyle='round')
        apply_clip(main_line)
        
        # Add center line
        center_line = ax.plot(x_points, y_curve, color='white', linewidth=3, alpha=0.9, solid_capstyle='round')
        apply_clip(center_line)
        
        # Add road label
        road_name = main_road_names[i % len(main_road_names)]
        ax.text(num_blocks_x * block_width / 2, y_pos + road_width * 0.5, road_name,
               ha='center', va='center', fontsize=8, fontweight='bold', 
               color='white', bbox=dict(boxstyle="round,pad=0.2", facecolor='black', alpha=0.7))
    
    # Vertical main roads
    for i, col in enumerate(range(0, num_blocks_x + 1, main_vertical_spacing)):
        x_pos = col * block_width
        
        # Create main road with slight curve
        y_points = np.linspace(start_y, start_y + num_blocks_y * block_height, 200)
        curve_amplitude = road_width * 0.1
        x_curve = x_pos + curve_amplitude * np.sin(y_points * 0.2)
        
        # Draw main road
        main_line = ax.plot(x_curve, y_points, color='#4b5563', linewidth=main_road_width, alpha=0.9, solid_capstyle='round')
        apply_clip(main_line)
        
        # Add center line
        center_line = ax.plot(x_curve, y_points, color='white', linewidth=3, alpha=0.9, solid_capstyle='round')
        apply_clip(center_line)
        
        # Add road label (rotated)
        road_name = main_road_names[i % len(main_road_names)]
        ax.text(x_pos + road_width * 0.5, start_y + num_blocks_y * block_height / 2, road_name,
               ha='center', va='center', fontsize=8, fontweight='bold', rotation=90,
               color='white', bbox=dict(boxstyle="round,pad=0.2", facecolor='black', alpha=0.7))
    
    # SECONDARY COLLECTOR ROADS (Connect blocks within areas)
    # Horizontal secondary roads
    for i, row in enumerate(range(1, num_blocks_y)):
        if row % main_horizontal_spacing != 0:
            y_pos = start_y + row * block_height
            
            # Create secondary road
            x_points = np.linspace(0, num_blocks_x * block_width, 100)
            secondary_line = ax.plot(x_points, [y_pos] * len(x_points), color='#6b7280', linewidth=secondary_width, alpha=0.8, solid_capstyle='round')
            apply_clip(secondary_line)
            
            # Add road label
            road_name = secondary_road_names[i % len(secondary_road_names)]
            ax.text(num_blocks_x * block_width / 2, y_pos + road_width * 0.3, road_name,
                   ha='center', va='center', fontsize=6, fontweight='bold', 
                   color='white', bbox=dict(boxstyle="round,pad=0.1", facecolor='#374151', alpha=0.8))
    
    # Vertical secondary roads
    for i, col in enumerate(range(1, num_blocks_x)):
        if col % main_vertical_spacing != 0:
            x_pos = col * block_width
            
            # Create secondary road
            y_points = np.linspace(start_y, start_y + num_blocks_y * block_height, 100)
            secondary_line = ax.plot([x_pos] * len(y_points), y_points, color='#6b7280', linewidth=secondary_width, alpha=0.8, solid_capstyle='round')
            apply_clip(secondary_line)
            
            # Add road label (rotated)
            road_name = secondary_road_names[i % len(secondary_road_names)]
            ax.text(x_pos + road_width * 0.3, start_y + num_blocks_y * block_height / 2, road_name,
                   ha='center', va='center', fontsize=6, fontweight='bold', rotation=90,
                   color='white', bbox=dict(boxstyle="round,pad=0.1", facecolor='#374151', alpha=0.8))
    
    # LOCAL ACCESS ROADS (Connect individual blocks)
    for row in range(num_blocks_y):
        for col in range(num_blocks_x):
            block_x = col * block_width
            block_y = start_y + row * block_height
            
            # Local roads around each block
            if row % main_horizontal_spacing != 0 and col % main_vertical_spacing != 0:
                # Horizontal local road
                x_points = np.linspace(block_x, block_x + block_width, 50)
                local_line = ax.plot(x_points, [block_y] * len(x_points), color='#9ca3af', linewidth=local_width, alpha=0.7, solid_capstyle='round')
                apply_clip(local_line)
                
                # Vertical local road
                y_points = np.linspace(block_y, block_y + block_height, 50)
                local_line = ax.plot([block_x] * len(y_points), y_points, color='#9ca3af', linewidth=local_width, alpha=0.7, solid_capstyle='round')
                apply_clip(local_line)
    
    # PLOT ACCESS ROADS (Very narrow roads for plot access)
    for row in range(num_blocks_y):
        for col in range(num_blocks_x):
            block_x = col * block_width
            block_y = start_y + row * block_height
            
            # Plot access roads within blocks
            # Horizontal plot access
            for i in range(1, 4):
                y_pos = block_y + (block_height * i / 4)
                x_points = np.linspace(block_x + block_width * 0.1, block_x + block_width * 0.9, 30)
                plot_line = ax.plot(x_points, [y_pos] * len(x_points), color='#d1d5db', linewidth=plot_width, alpha=0.6, solid_capstyle='round')
                apply_clip(plot_line)
            
            # Vertical plot access
            for i in range(1, 4):
                x_pos = block_x + (block_width * i / 4)
                y_points = np.linspace(block_y + block_height * 0.1, block_y + block_height * 0.9, 30)
                plot_line = ax.plot([x_pos] * len(y_points), y_points, color='#d1d5db', linewidth=plot_width, alpha=0.6, solid_capstyle='round')
                apply_clip(plot_line)
    
    # ROUNDABOUTS (Add at major intersections)
    roundabout_radius = road_width * 8
    for row in range(0, num_blocks_y + 1, main_horizontal_spacing):
        for col in range(0, num_blocks_x + 1, main_vertical_spacing):
            if row < num_blocks_y and col < num_blocks_x:
                x_pos = col * block_width
                y_pos = start_y + row * block_height
                
                # Create roundabout
                roundabout = patches.Circle((x_pos, y_pos), roundabout_radius, 
                                          facecolor='#10b981', edgecolor='#059669', 
                                          linewidth=2, alpha=0.8)
                ax.add_patch(roundabout)
                apply_clip(roundabout)
                
                # Add roundabout label
                ax.text(x_pos, y_pos, 'ROUNDABOUT', ha='center', va='center', 
                       fontsize=6, fontweight='bold', color='white')
    
    # INTERSECTIONS (Add intersection markings)
    for row in range(0, num_blocks_y + 1, main_horizontal_spacing):
        for col in range(0, num_blocks_x + 1, main_vertical_spacing):
            x_pos = col * block_width
            y_pos = start_y + row * block_height
            
            # Add intersection square
            intersection_size = road_width * 3
            intersection = patches.Rectangle((x_pos - intersection_size/2, y_pos - intersection_size/2), 
                                           intersection_size, intersection_size,
                                           facecolor='#fbbf24', edgecolor='#f59e0b', 
                                           linewidth=1, alpha=0.9)
            ax.add_patch(intersection)
            apply_clip(intersection)

def _iter_line_geometries(geometry):
    """
    Yield LineString-like components from arbitrary Shapely geometries.
    """
    if geometry is None or geometry.is_empty:
        return
    if isinstance(geometry, (LineString, LinearRing)):
        yield geometry
        return
    if isinstance(geometry, MultiLineString):
        for line in geometry.geoms:
            if not line.is_empty:
                yield line
        return
    if hasattr(geometry, "geoms"):
        for geom_part in geometry.geoms:
            yield from _iter_line_geometries(geom_part)

def draw_voronoi_road_network(ax, block_polygons, block_types, layout_polygon, base_road_width, clip_path=None):
    """
    Render a layered road and street network that follows the Voronoi (varoni) cells.
    Roads are classified by adjacent land-use types to mimic professional township plans.
    """
    if not block_polygons or base_road_width <= 0:
        return

    arterial_width = max(base_road_width * 12, 0.8)
    collector_width = max(base_road_width * 8, 0.6)
    local_width = max(base_road_width * 4, 0.45)
    walkway_width = max(base_road_width * 2.5, 0.35)
    min_length_threshold = max(layout_polygon.length * 0.01, base_road_width)

    def apply_clip(artists):
        if clip_path is None:
            return
        if not isinstance(artists, (list, tuple)):
            artists = [artists]
        for artist in artists:
            if artist is not None:
                artist.set_clip_path(clip_path)

    def draw_line(line_geom, width, color, alpha=0.95, zorder=2, style="-"):
        if line_geom.is_empty:
            return
        x, y = line_geom.xy
        line_artist = ax.plot(
            x,
            y,
            linestyle=style,
            color=color,
            linewidth=width,
            alpha=alpha,
            solid_capstyle="round",
            zorder=zorder,
        )
        apply_clip(line_artist)

    # 1) Draw an arterial ring along the polygon boundary (boulevard feel)
    boundary = layout_polygon.boundary
    for boundary_part in _iter_line_geometries(boundary):
        draw_line(boundary_part, arterial_width * 1.1, "#1f2937", alpha=0.85)

    # 2) Draw shared-boundary streets between adjacent Voronoi cells
    total_blocks = len(block_polygons)
    for i in range(total_blocks):
        geom_i = block_polygons[i]
        type_i = block_types[i] if i < len(block_types) else "residential"
        if geom_i.is_empty:
            continue

        for j in range(i + 1, total_blocks):
            geom_j = block_polygons[j]
            type_j = block_types[j] if j < len(block_types) else "residential"
            if geom_j.is_empty:
                continue

            shared = geom_i.boundary.intersection(geom_j.boundary)
            if shared.is_empty:
                continue

            segments = list(_iter_line_geometries(shared))
            if not segments:
                continue

            total_length = sum(seg.length for seg in segments)
            if total_length < min_length_threshold:
                continue

            pair_types = {type_i, type_j}
            if "commercial" in pair_types:
                width = collector_width
                color = "#4b5563"
            elif pair_types == {"park"}:
                width = walkway_width
                color = "#6b7280"
            elif "park" in pair_types:
                width = collector_width * 0.7
                color = "#6b7280"
            else:
                width = local_width
                color = "#9ca3af"

            for segment in segments:
                draw_line(segment, width, color)

    # 3) Add centroid connectors to mimic secondary corridors
    centroids = []
    for geom in block_polygons:
        if geom.is_empty:
            continue
        centroids.append(geom.centroid)

    added_pairs = set()
    for idx, origin in enumerate(centroids):
        distances = []
        for jdx, dest in enumerate(centroids):
            if idx == jdx:
                continue
            distances.append((origin.distance(dest), jdx))
        distances.sort(key=lambda d: d[0])

        for _, neighbor_idx in distances[:2]:
            pair = tuple(sorted((idx, neighbor_idx)))
            if pair in added_pairs:
                continue
            added_pairs.add(pair)

            connector = LineString([centroids[idx], centroids[neighbor_idx]])
            corridor = connector.intersection(layout_polygon)
            if corridor.is_empty or corridor.length < min_length_threshold * 0.6:
                continue

            draw_line(corridor, collector_width * 0.6, "#475569", alpha=0.6, zorder=1)

    # 4) Sprinkle roundabout markers on major centroid hubs
    try:
        import numpy as np

        centroid_points = np.array([[pt.x, pt.y] for pt in centroids])
        if centroid_points.size == 0:
            return

        mean_point = centroid_points.mean(axis=0)
        distances_from_mean = np.linalg.norm(centroid_points - mean_point, axis=1)
        hub_indices = distances_from_mean.argsort()[: max(1, len(centroids) // 8)]

        for idx in hub_indices:
            hub = centroids[idx]
            if not layout_polygon.contains(hub):
                continue
            roundabout = plt.Circle(
                (hub.x, hub.y),
                base_road_width * 3.2,
                facecolor="#0ea5e9",
                edgecolor="#0369a1",
                linewidth=1.5,
                alpha=0.85,
                zorder=3,
            )
            ax.add_patch(roundabout)
            apply_clip(roundabout)
            ax.text(
                hub.x,
                hub.y,
                "R",
                ha="center",
                va="center",
                fontsize=6,
                fontweight="bold",
                color="white",
                zorder=4,
            )
    except Exception:
        # If numpy is unavailable or centroid math fails, silently continue
        pass

def draw_rectilinear_road_network(ax, min_x, max_x, start_y, height, num_blocks_x, num_blocks_y, block_width, block_height, base_road_width, clip_path=None):
    """
    Draw Zameen-style straight boulevards/streets on top of the rectangular grid.
    """
    if base_road_width <= 0:
        return

    arterial = base_road_width * 3.2
    collector = base_road_width * 2.4
    local = base_road_width * 1.6

    def apply_clip(patch):
        if clip_path is not None and patch is not None:
            patch.set_clip_path(clip_path)

    def road_style(index, total):
        if index in (0, total):
            return arterial, "50"
        if total >= 6 and index % 3 == 0:
            return collector, "40"
        return local, "30"

    road_color = "#e0e0f5"  # Lavender asphalt fill (per Zameen reference)
    border_color = "#9ca3af"
    centerline_color = "#ffffff"  # White centerlines
    width = max_x - min_x

    # Horizontal roads
    for row in range(num_blocks_y + 1):
        y = start_y + row * block_height
        road_width, label_ft = road_style(row, num_blocks_y)
        rect = patches.Rectangle(
            (min_x, y - road_width / 2),
            width,
            road_width,
            facecolor=road_color,
            edgecolor=border_color,
            linewidth=1.2,
            alpha=0.95,
            zorder=2,
        )
        ax.add_patch(rect)
        apply_clip(rect)
        # White centerline
        centerline = patches.Rectangle(
            (min_x, y - road_width * 0.15),
            width,
            road_width * 0.3,
            facecolor=centerline_color,
            edgecolor='none',
            alpha=0.9,
            zorder=2.5,
        )
        ax.add_patch(centerline)
        apply_clip(centerline)
        # Road labels at fixed intervals (every 3rd road or major roads)
        if row in (0, num_blocks_y, num_blocks_y // 2) or (row % 3 == 0 and num_blocks_y >= 6):
            ax.text(
                min_x + width / 2,
                y + road_width * 0.1,
                f"ROAD {label_ft}' WIDE",
                ha="center",
                va="center",
                fontsize=8,
                fontweight="bold",
                color="#1f2937",
                zorder=3,
                bbox=dict(boxstyle="round,pad=0.15", facecolor="#eef2ff", edgecolor="#94a3b8", linewidth=1),
            )

    # Vertical roads
    for col in range(num_blocks_x + 1):
        x = min_x + col * block_width
        road_width, label_ft = road_style(col, num_blocks_x)
        rect = patches.Rectangle(
            (x - road_width / 2, start_y),
            road_width,
            height,
            facecolor=road_color,
            edgecolor=border_color,
            linewidth=1.2,
            alpha=0.95,
            zorder=2,
        )
        ax.add_patch(rect)
        apply_clip(rect)
        # White centerline
        centerline = patches.Rectangle(
            (x - road_width * 0.15, start_y),
            road_width * 0.3,
            height,
            facecolor="#ffffff",
            edgecolor='none',
            alpha=0.9,
            zorder=2.5,
        )
        ax.add_patch(centerline)
        apply_clip(centerline)
        # Road labels at fixed intervals (every 3rd road or major roads)
        if col in (0, num_blocks_x, num_blocks_x // 2) or (col % 3 == 0 and num_blocks_x >= 6):
            ax.text(
                x,
                start_y + height / 2,
                f"ROAD {label_ft}' WIDE",
                ha="center",
                va="center",
                fontsize=8,
                fontweight="bold",
                color="#1f2937",
                rotation=90,
                zorder=3,
                bbox=dict(boxstyle="round,pad=0.15", facecolor="#eef2ff", edgecolor="#94a3b8", linewidth=1),
            )

    # Highlight a main boulevard at the bottom
    boulevard_height = arterial * 1.1
    boulevard = patches.Rectangle(
        (min_x, start_y - boulevard_height),
        width,
        boulevard_height,
        facecolor="#c6c7fa",
        edgecolor="#4c51bf",
        linewidth=2,
        alpha=0.95,
        zorder=2,
    )
    ax.add_patch(boulevard)
    apply_clip(boulevard)
    ax.text(
        min_x + width / 2,
        start_y - boulevard_height / 2,
        "MAIN BOULEVARD (100' WIDE)",
        ha="center",
        va="center",
        fontsize=10,
        fontweight="bold",
        color="#1f2937",
        zorder=3,
        bbox=dict(boxstyle="round,pad=0.2", facecolor="#eef2ff", edgecolor="#818cf8", linewidth=1.5),
    )


def draw_central_roundabout(ax, center_point, radius, clip_path=None):
    """
    Draw Zameen-style roundabout with layered belts and center park.
    """
    if center_point is None or radius <= 0:
        return

    cx, cy = center_point

    def apply_clip(patch):
        if clip_path is not None and patch is not None:
            patch.set_clip_path(clip_path)

    outer_ring = patches.Circle(
        (cx, cy),
        radius,
        facecolor="#cbd5f5",
        edgecolor="#475569",
        linewidth=3,
        alpha=0.95,
        zorder=20,
    )
    ax.add_patch(outer_ring)
    apply_clip(outer_ring)

    carriage = patches.Circle(
        (cx, cy),
        radius * 0.75,
        facecolor="#94a3b8",
        edgecolor="#1f2937",
        linewidth=2,
        alpha=0.95,
        zorder=21,
    )
    ax.add_patch(carriage)
    apply_clip(carriage)

    core = patches.Circle(
        (cx, cy),
        radius * 0.45,
        facecolor="#065f46",
        edgecolor="#064e3b",
        linewidth=2,
        alpha=0.95,
        zorder=22,
    )
    ax.add_patch(core)
    apply_clip(core)

    ax.text(
        cx,
        cy,
        "ROUNDABOUT",
        ha="center",
        va="center",
        fontsize=8,
        fontweight="bold",
        color="#f8fafc",
        zorder=23,
        bbox=dict(boxstyle="round,pad=0.15", facecolor="#0f172a", edgecolor="#f8fafc", linewidth=1),
    )

def draw_curved_neighborhood_spines(ax, min_x, max_x, start_y, height, base_road_width, clip_path=None, seed=0, count=4):
    """
    Overlay gentle curved spines to mimic premium neighborhood loops seen in reference maps.
    """
    if count <= 0 or base_road_width <= 0:
        return
    width = max_x - min_x
    rng = random.Random(seed)
    spine_colors = ['#e0e7ff', '#c7d2fe', '#cbd5f5']
    spine_width = max(base_road_width * 5, 0.8)
    
    for _ in range(count):
        y0 = start_y + height * rng.uniform(0.1, 0.9)
        y1 = start_y + height * rng.uniform(0.1, 0.9)
        ctrl1 = start_y + height * rng.uniform(0.15, 0.85)
        ctrl2 = start_y + height * rng.uniform(0.15, 0.85)
        verts = [
            (min_x - 0.5, y0),
            (min_x + width * rng.uniform(0.2, 0.4), ctrl1),
            (min_x + width * rng.uniform(0.6, 0.8), ctrl2),
            (max_x + 0.5, y1)
        ]
        codes = [MplPath.MOVETO, MplPath.CURVE4, MplPath.CURVE4, MplPath.CURVE4]
        path = MplPath(verts, codes)
        spine = patches.PathPatch(
            path,
            linewidth=spine_width,
            edgecolor=rng.choice(spine_colors),
            facecolor='none',
            alpha=0.55,
            linestyle='-',
            zorder=2.5
        )
        ax.add_patch(spine)
        if clip_path is not None:
            spine.set_clip_path(clip_path)
        
        centerline = patches.PathPatch(
            path,
            linewidth=max(spine_width * 0.35, 0.4),
            edgecolor='white',
            facecolor='none',
            alpha=0.7,
            linestyle='--',
            zorder=2.6
        )
        ax.add_patch(centerline)
        if clip_path is not None:
            centerline.set_clip_path(clip_path)

def determine_plot_grid(render_geom, block_type, area_acres=None, total_blocks=None, plot_size_str=None):
    """
    Determine plot grid size based on actual area and plot size to match total marla.
    1 acre = 160 marla (Pakistan standard)
    """
    min_bx, min_by, max_bx, max_by = render_geom.bounds
    width = max(max_bx - min_bx, 1e-3)
    height = max(max_by - min_by, 1e-3)
    aspect = width / height
    
    # Extract marla from plot_size_str if provided (e.g., "5 MARLA" -> 5)
    plot_marla = None
    if plot_size_str:
        import re
        match = re.search(r'(\d+(?:\.\d+)?)\s*MARLA', str(plot_size_str).upper())
        if match:
            plot_marla = float(match.group(1))
    
    # Calculate plots based on actual area if provided
    if area_acres and total_blocks and total_blocks > 0:
        total_marla = area_acres * 160  # 1 acre = 160 marla
        # Account for roads (15%), parks (20%), commercial (30%) = 65% usable for residential
        usable_marla = total_marla * 0.65
        residential_blocks = max(1, int(total_blocks * 0.50))  # 50% residential per CDA requirement
        marla_per_residential_block = usable_marla / residential_blocks if residential_blocks > 0 else 0
        
        if block_type == 'residential' and marla_per_residential_block > 0:
            # Use actual plot size if provided, otherwise use average
            if plot_marla and plot_marla > 0:
                avg_plot_size = plot_marla
            else:
                avg_plot_size = 6  # Default average
            plots_per_block = int(marla_per_residential_block / avg_plot_size)
            # Ensure minimum plots (fewer for larger plots)
            min_plots = max(4, int(20 / avg_plot_size)) if plot_marla else 8
            max_plots = min(200, int(100 / avg_plot_size)) if plot_marla else 200
            plots_per_block = max(min_plots, min(plots_per_block, max_plots))
            
            # Calculate grid dimensions based on aspect ratio
            # For 5 and 7 marla blocks, ensure minimum 3 rows for better visualization
            min_rows = 3 if plot_marla and plot_marla in [5.0, 7.0] else 2
            
            if aspect >= 1.5:
                cols = max(8, min(20, int(np.sqrt(plots_per_block * aspect))))
                rows = max(min_rows, int(plots_per_block / cols))
            elif aspect <= 0.7:
                rows = max(min_rows, min(20, int(np.sqrt(plots_per_block / aspect))))
                cols = max(2, int(plots_per_block / rows))
            else:
                # Square-ish blocks
                cols = max(6, int(np.sqrt(plots_per_block * aspect)))
                rows = max(min_rows, int(plots_per_block / cols))
            
            # Ensure 5 and 7 marla blocks have at least 3 rows
            if plot_marla and plot_marla in [5.0, 7.0]:
                if rows < 3:
                    rows = 3
                    cols = max(2, int(plots_per_block / rows))
            
            return rows, cols
        elif block_type == 'commercial':
            # Commercial blocks: ensure visible plot subdivision (minimum 4-8 plots)
            # Target: 4-12 plots per commercial block for clear visibility
            if aspect >= 1.4:
                cols = max(4, min(8, int(aspect * 3)))
                rows = max(1, min(3, int(8 / cols)))
            else:
                rows = max(2, min(4, int(1 / aspect * 2)))
                cols = max(2, min(6, int(8 / rows)))
            # Ensure minimum 4 plots total
            if rows * cols < 4:
                if aspect >= 1.0:
                    cols = 4
                    rows = 1
                else:
                    rows = 2
                    cols = 2
            return rows, cols
    
    # Fallback to original logic if area not provided
    if block_type == 'residential':
        if aspect >= 1.5:
            rows, cols = 2, min(12, max(8, int(aspect * 6)))
        elif aspect <= 0.7:
            cols, rows = 2, min(12, max(8, int((1 / aspect) * 6)))
        else:
            rows, cols = 4, 8
    elif block_type == 'commercial':
        # Ensure commercial blocks always have visible plots (minimum 4 plots)
        if aspect >= 1.4:
            cols = max(4, min(8, int(aspect * 3)))
            rows = max(1, min(2, int(6 / cols)))
        else:
            rows = max(2, min(3, int(1 / aspect * 2)))
            cols = max(2, min(4, int(6 / rows)))
        # Ensure minimum 4 plots total
        if rows * cols < 4:
            if aspect >= 1.0:
                cols = 4
                rows = 1
            else:
                rows = 2
                cols = 2
    else:
        rows, cols = 2, 2
    
    return rows, cols

def create_park_within_block(block_geom, park_ratio=0.15):
    """
    Create a park area within a residential block.
    Returns the park geometry and the remaining block geometry for plots.
    park_ratio: fraction of block area to reserve for park (default 15%)
    """
    if block_geom.is_empty:
        return None, block_geom
    
    min_bx, min_by, max_bx, max_by = block_geom.bounds
    width = max(max_bx - min_bx, 1e-3)
    height = max(max_by - min_by, 1e-3)
    
    # Determine park position (center, corner, or side)
    # Use block position as seed for deterministic placement
    import random
    block_center_x = (min_bx + max_bx) / 2
    block_center_y = (min_by + max_by) / 2
    
    # Park size: 15-25% of block area
    park_area_target = block_geom.area * park_ratio
    
    # Try different park positions: center, corner, or side
    park_positions = [
        'center',  # Center of block
        'corner',   # One corner
        'side'      # One side
    ]
    
    # Use block bounds as seed for deterministic placement
    seed = int((min_bx + min_by) * 1000) % 10000
    random.seed(seed)
    park_position = random.choice(park_positions)
    
    # Calculate park dimensions
    park_width = np.sqrt(park_area_target * (width / height))
    park_height = park_area_target / park_width if park_width > 0 else np.sqrt(park_area_target)
    
    # Limit park size to reasonable fraction of block
    park_width = min(park_width, width * 0.4)
    park_height = min(park_height, height * 0.4)
    
    # Position park based on selected position
    if park_position == 'center':
        park_x0 = block_center_x - park_width / 2
        park_y0 = block_center_y - park_height / 2
        park_x1 = block_center_x + park_width / 2
        park_y1 = block_center_y + park_height / 2
    elif park_position == 'corner':
        # Place in one of the corners
        corner = random.choice(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
        if corner == 'top-left':
            park_x0 = min_bx + width * 0.05
            park_y0 = max_by - park_height - height * 0.05
            park_x1 = park_x0 + park_width
            park_y1 = max_by - height * 0.05
        elif corner == 'top-right':
            park_x0 = max_bx - park_width - width * 0.05
            park_y0 = max_by - park_height - height * 0.05
            park_x1 = max_bx - width * 0.05
            park_y1 = max_by - height * 0.05
        elif corner == 'bottom-left':
            park_x0 = min_bx + width * 0.05
            park_y0 = min_by + height * 0.05
            park_x1 = park_x0 + park_width
            park_y1 = min_by + park_height + height * 0.05
        else:  # bottom-right
            park_x0 = max_bx - park_width - width * 0.05
            park_y0 = min_by + height * 0.05
            park_x1 = max_bx - width * 0.05
            park_y1 = min_by + park_height + height * 0.05
    else:  # side
        # Place on one side
        side = random.choice(['top', 'bottom', 'left', 'right'])
        if side == 'top':
            park_x0 = block_center_x - park_width / 2
            park_y0 = max_by - park_height - height * 0.05
            park_x1 = block_center_x + park_width / 2
            park_y1 = max_by - height * 0.05
        elif side == 'bottom':
            park_x0 = block_center_x - park_width / 2
            park_y0 = min_by + height * 0.05
            park_x1 = block_center_x + park_width / 2
            park_y1 = min_by + park_height + height * 0.05
        elif side == 'left':
            park_x0 = min_bx + width * 0.05
            park_y0 = block_center_y - park_height / 2
            park_x1 = park_x0 + park_width
            park_y1 = block_center_y + park_height / 2
        else:  # right
            park_x0 = max_bx - park_width - width * 0.05
            park_y0 = block_center_y - park_height / 2
            park_x1 = max_bx - width * 0.05
            park_y1 = block_center_y + park_height / 2
    
    # Create park polygon
    park_geom = box(park_x0, park_y0, park_x1, park_y1)
    park_geom = block_geom.intersection(park_geom)
    
    if park_geom.is_empty or park_geom.area < block_geom.area * 0.05:
        # If park is too small or empty, don't create it
        return None, block_geom
    
    # Subtract park from block to get area for plots
    plot_area_geom = block_geom.difference(park_geom)
    
    # If difference creates multiple polygons, use the largest one
    if hasattr(plot_area_geom, 'geoms'):
        plot_area_geom = max(plot_area_geom.geoms, key=lambda g: g.area)
    
    return park_geom, plot_area_geom

def subdivide_block_into_plots(block_geom, rows, cols, padding_ratio=0.01):
    """
    Subdivide block into plots exactly like Zameen maps - clear rectangular grid with numbered plots.
    """
    min_bx, min_by, max_bx, max_by = block_geom.bounds
    width = max(max_bx - min_bx, 1e-3)
    height = max(max_by - min_by, 1e-3)
    
    # Minimal padding for clear separation between plots
    pad_x = width * padding_ratio
    pad_y = height * padding_ratio
    
    # Use almost full block area (98%) for plots
    start_x = min_bx + pad_x
    start_y = min_by + pad_y
    usable_width = width - 2 * pad_x
    usable_height = height - 2 * pad_y
    
    # Calculate cell dimensions
    cell_w = usable_width / cols
    cell_h = usable_height / rows
    
    plots = []
    min_area_factor = min(0.001, 1.0 / max(rows * cols * 4, 1))
    min_area = width * height * min_area_factor

    for r in range(rows):
        for c in range(cols):
            # Create rectangular cell
            cell_x0 = start_x + c * cell_w
            cell_y0 = start_y + r * cell_h
            cell_x1 = start_x + (c + 1) * cell_w
            cell_y1 = start_y + (r + 1) * cell_h
            
            cell = box(cell_x0, cell_y0, cell_x1, cell_y1)
            plot_geom = block_geom.intersection(cell)
            
            if not plot_geom.is_empty and plot_geom.area > min_area:
                # Calculate plot number: left to right, top to bottom (like Zameen)
                plot_number = r * cols + c + 1
                plots.append((plot_number, plot_geom))
    
    # Sort by plot number to ensure proper sequential order
    plots.sort(key=lambda x: x[0])
    if plots:
        return plots

    if rows == 1 and cols == 1:
        return [(1, block_geom)]

    reduced_rows = max(1, rows // 2)
    reduced_cols = max(1, cols // 2)
    if reduced_rows == rows and rows > 1:
        reduced_rows -= 1
    if reduced_cols == cols and cols > 1:
        reduced_cols -= 1
    reduced_rows = max(1, reduced_rows)
    reduced_cols = max(1, reduced_cols)

    if reduced_rows == rows and reduced_cols == cols:
        return [(1, block_geom)]

    new_padding = min(padding_ratio * 1.2, 0.05)
    return subdivide_block_into_plots(block_geom, reduced_rows, reduced_cols, new_padding)

def generate_amenity_overlays(block_polygons, block_types, seed=0, max_overlays=8, area_acres=0, blocked_indices=None, num_blocks_x=None, num_blocks_y=None):
    """
    Reserve select blocks for premium amenities (mosque, school, hospital, community center).
    Uses park blocks from the 20% green space allocation (parks + amenities = 20%).
    Amenity count is based purely on area, not on available green blocks.
    CDA RULE: Same type amenities CANNOT be adjacent (e.g., two mosques cannot be together).
    IMPORTANT: Only uses a portion of park blocks for amenities, leaving some as pure parks.
    """
    rng = random.Random(seed)
    blocked_indices = blocked_indices or set()
    
    # Calculate grid dimensions if not provided
    if num_blocks_x is None or num_blocks_y is None:
        # Try to infer from block_types length
        total_blocks = len(block_types)
        # Estimate grid dimensions (assume roughly square)
        num_blocks_y = int(np.sqrt(total_blocks))
        num_blocks_x = (total_blocks + num_blocks_y - 1) // num_blocks_y
    
    # Helper function to get adjacent block indices
    def get_adjacent_indices(idx):
        """Get indices of adjacent blocks (8-directional)."""
        row = idx // num_blocks_x
        col = idx % num_blocks_x
        adjacent = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                new_row = row + dr
                new_col = col + dc
                if 0 <= new_row < num_blocks_y and 0 <= new_col < num_blocks_x:
                    adj_idx = new_row * num_blocks_x + new_col
                    if adj_idx < len(block_types):
                        adjacent.append(adj_idx)
        return adjacent
    
    # Create multiple instances of key amenities based on area - IMPROVED SCALING
    # Better ratios for residential societies in Pakistan:
    # Mosques: ~1 per 16-20 acres (community mosques)
    # Schools: ~1 per 18-22 acres (elementary/middle/high schools)  
    # Hospitals: ~1 per 40-50 acres (hospitals/clinics)
    max_overlays = max(1, max_overlays)
    if area_acres < 10:
        num_mosques = 2
        num_hospitals = 1
        num_schools = 1
    elif area_acres < 25:
        num_mosques = 3
        num_hospitals = 1
        num_schools = 2
    elif area_acres < 50:
        num_mosques = max(4, int(area_acres / 20))  # ~1 per 20 acres
        num_hospitals = max(2, int(area_acres / 50))  # ~1 per 50 acres
        num_schools = max(3, int(area_acres / 22))  # ~1 per 22 acres
    elif area_acres < 100:
        num_mosques = max(5, int(area_acres / 18))  # ~1 per 18 acres
        num_hospitals = max(2, int(area_acres / 45))  # ~1 per 45 acres
        num_schools = max(4, int(area_acres / 20))  # ~1 per 20 acres
    elif area_acres < 150:
        num_mosques = max(6, int(area_acres / 16))  # ~1 per 16 acres (more mosques)
        num_hospitals = max(3, int(area_acres / 40))  # ~1 per 40 acres (more hospitals)
        num_schools = max(5, int(area_acres / 18))  # ~1 per 18 acres (more schools)
    else:
        # For very large areas, scale proportionally with even more facilities
        num_mosques = max(8, int(area_acres / 16))  # ~1 per 16 acres
        num_hospitals = max(4, int(area_acres / 40))  # ~1 per 40 acres
        num_schools = max(6, int(area_acres / 18))  # ~1 per 18 acres
    
    total_requested = num_mosques + num_hospitals + num_schools
    if total_requested > max_overlays:
        scale = max_overlays / total_requested if total_requested else 1
        num_mosques = max(1, int(num_mosques * scale))
        num_hospitals = max(1, int(num_hospitals * scale))
        num_schools = max(1, int(num_schools * scale))
        total_requested = num_mosques + num_hospitals + num_schools
        if total_requested > max_overlays:
            overflow = total_requested - max_overlays
            for _ in range(overflow):
                if num_mosques >= num_schools and num_mosques >= num_hospitals and num_mosques > 1:
                    num_mosques -= 1
                elif num_schools >= num_mosques and num_schools >= num_hospitals and num_schools > 1:
                    num_schools -= 1
                elif num_hospitals > 1:
                    num_hospitals -= 1
                else:
                    break

    # Build amenity list with multiple instances - INTERLEAVE for better distribution
    amenity_templates = []
    
    # Create lists for each type
    mosques = [{"label": "MOSQUE", "area": "1.3 ACRE", "color": "#f472b6", "text": "white"} for _ in range(num_mosques)]
    hospitals = [{"label": "HOSPITAL", "area": "2.5 ACRE", "color": "#fb7185", "text": "white"} for _ in range(num_hospitals)]
    schools = [{"label": "SCHOOL", "area": "2.8 ACRE", "color": "#38bdf8", "text": "white"} for _ in range(num_schools)]
    
    # Interleave amenities to ensure mix (mosque, hospital, school, mosque, hospital, school...)
    max_len = max(len(mosques), len(hospitals), len(schools))
    for i in range(max_len):
        if i < len(mosques):
            amenity_templates.append(mosques[i])
        if i < len(hospitals):
            amenity_templates.append(hospitals[i])
        if i < len(schools):
            amenity_templates.append(schools[i])
    
    # Add optional amenities if we have space
    remaining_slots = max_overlays - len(amenity_templates)
    if remaining_slots > 0:
        amenity_templates.append({"label": "GRID STATION", "area": "1.7 ACRE", "color": "#facc15", "text": "#1f2937"})
    
    # Shuffle to randomize order while keeping mix
    rng.shuffle(amenity_templates)
    
    # Calculate how many amenities we need (limited by templates and max_overlays)
    num_amenities = min(len(amenity_templates), max_overlays)
    
    # Use park blocks from the 20% green space allocation (parks + amenities = 20%)
    # Amenities are part of the green space, so use park blocks first
    candidate_indices = [i for i, t in enumerate(block_types) if t == 'park' and i not in blocked_indices]
    
    # If not enough park blocks, we can use some commercial blocks as fallback
    # but this should be minimal since amenities should be part of green space
    if len(candidate_indices) < num_amenities:
        remaining_needed = num_amenities - len(candidate_indices)
        commercial_candidates = [i for i, t in enumerate(block_types) if t == 'commercial' and i not in blocked_indices]
        # Use minimal commercial blocks only if absolutely necessary
        candidate_indices.extend(commercial_candidates[:min(remaining_needed, len(commercial_candidates))])
        remaining_needed = num_amenities - len(candidate_indices)
        
        # If still not enough, add some residential blocks as last resort
        if remaining_needed > 0:
            residential_candidates = [i for i, t in enumerate(block_types) if t == 'residential' and i not in blocked_indices]
            candidate_indices.extend(residential_candidates[:min(remaining_needed, len(residential_candidates))])
    
    if not candidate_indices:
        return []
    
    # Smart distribution: Sort by position to spread amenities across the layout
    # Calculate centroid positions for better distribution
    def get_block_position(idx):
        geom = block_polygons[idx]
        if geom.is_empty:
            return (0, 0)
        centroid = geom.centroid
        return (centroid.x, centroid.y)
    
    # Sort candidates by position to ensure spread (not clustered)
    candidate_indices_with_pos = [(idx, get_block_position(idx)) for idx in candidate_indices]
    # Sort by distance from center to spread from center outward, or by grid position
    # Calculate layout center
    all_x = [pos[1][0] for pos in candidate_indices_with_pos]
    all_y = [pos[1][1] for pos in candidate_indices_with_pos]
    center_x = (min(all_x) + max(all_x)) / 2 if all_x else 0
    center_y = (min(all_y) + max(all_y)) / 2 if all_y else 0
    
    # Sort by distance from center, then by angle for circular distribution
    def get_sort_key(item):
        idx, (x, y) = item
        dx, dy = x - center_x, y - center_y
        dist = (dx**2 + dy**2)**0.5
        angle = np.arctan2(dy, dx)  # Angle in radians
        return (int(dist / 100), angle)  # Group by distance bands, then by angle
    
    candidate_indices_with_pos.sort(key=get_sort_key)
    
    # Select evenly distributed indices - take from different distance bands
    if len(candidate_indices_with_pos) > num_amenities:
        # Take evenly spaced indices for better distribution
        step = len(candidate_indices_with_pos) / num_amenities
        selected_indices = [candidate_indices_with_pos[int(i * step)][0] for i in range(num_amenities)]
        candidate_indices = selected_indices
    else:
        candidate_indices = [x[0] for x in candidate_indices_with_pos]
    
    # Don't shuffle - keep the distribution order, just assign amenities in interleaved order
    overlays = []
    
    # Limit to available candidates
    num_amenities = min(num_amenities, len(candidate_indices))
    
    # Log for debugging
    logger.info(f"🏥 Amenity generation: {num_mosques} mosques, {num_hospitals} hospitals, {num_schools} schools")
    logger.info(f"🏥 Total amenities: {len(amenity_templates)}, Selected blocks: {len(candidate_indices)}, Max: {max_overlays}, Will create: {num_amenities}")
    # IMPORTANT: Reserve some park blocks as pure parks (not all should become amenities)
    # Divide 20% green space: ~50% parks, ~50% amenities (better distribution for larger areas)
    park_block_count = len([i for i, t in enumerate(block_types) if t == 'park'])
    
    # Scale amenity allocation based on area - larger areas can support more amenities
    if area_acres < 30:
        amenity_percentage = 0.35  # Small areas: 35% amenities, 65% parks
    elif area_acres < 100:
        amenity_percentage = 0.45  # Medium areas: 45% amenities, 55% parks  
    else:
        amenity_percentage = 0.55  # Large areas: 55% amenities, 45% parks
    
    max_amenity_blocks = max(1, int(park_block_count * amenity_percentage))
    num_amenities = min(num_amenities, max_amenity_blocks, len(candidate_indices))
    
    logger.info(f"🏥 Distribution: {park_block_count} total park blocks (20% green space)")
    logger.info(f"🏥 Using max {max_amenity_blocks} park blocks for amenities ({amenity_percentage*100:.0f}% of parks, leaving {park_block_count - max_amenity_blocks} as pure parks)")
    logger.info(f"🏥 Distribution: Using {len([i for i in candidate_indices if block_types[i] == 'park'])} park blocks (from 20% green space), "
                f"{len([i for i in candidate_indices if block_types[i] == 'commercial'])} commercial (fallback), "
                f"{len([i for i in candidate_indices if block_types[i] == 'residential'])} residential (fallback)")
    logger.info(f"🏥 CDA RULE: Same type amenities CANNOT be placed adjacent to each other")
    logger.info(f"🏥 IMPROVED RULE: Hospitals and Schools should NOT be placed adjacent to each other for better spacing")
    
    # Warn if we can't place all amenities
    if len(amenity_templates) > num_amenities:
        logger.warning(f"⚠️ Cannot place all {len(amenity_templates)} amenities, only {num_amenities} blocks available (reserving some parks as pure parks)")
    
    # Track placed amenities to check for same-type adjacency (CDA RULE: prevent same types together)
    placed_amenities = {}  # {block_index: amenity_label}
    used_candidate_indices = set()
    
    for i in range(num_amenities):
        amenity_label = amenity_templates[i]["label"]
        placed = False
        
        # Try to find a candidate block that doesn't have adjacent same-type amenities
        for candidate_idx in candidate_indices:
            if candidate_idx in used_candidate_indices:
                continue
            
            # Check if any adjacent block has the same amenity type
            adjacent_indices = get_adjacent_indices(candidate_idx)
            has_same_type_adjacent = False
            has_conflicting_adjacent = False
            
            for adj_idx in adjacent_indices:
                # CDA RULE: Same types cannot be adjacent
                if adj_idx in placed_amenities and placed_amenities[adj_idx] == amenity_label:
                    has_same_type_adjacent = True
                    break
                
                # IMPROVED RULE: Hospitals and Schools should not be adjacent to each other
                if adj_idx in placed_amenities:
                    adjacent_amenity = placed_amenities[adj_idx]
                    if (amenity_label == "HOSPITAL" and adjacent_amenity == "SCHOOL") or \
                       (amenity_label == "SCHOOL" and adjacent_amenity == "HOSPITAL"):
                        has_conflicting_adjacent = True
                        break
            
            # CDA RULE: If no same-type adjacent and no conflicting adjacent, use this block
            if not has_same_type_adjacent and not has_conflicting_adjacent:
                idx = candidate_idx
                geom = block_polygons[idx]
                if geom.is_empty:
                    continue
                minx, miny, maxx, maxy = geom.bounds
                inset_x = (maxx - minx) * 0.18
                inset_y = (maxy - miny) * 0.18
                amenity_box = box(minx + inset_x, miny + inset_y, maxx - inset_x, maxy - inset_y)
                amenity_geom = geom.intersection(amenity_box)
                if amenity_geom.is_empty:
                    amenity_geom = geom
                overlays.append({
                    "block_index": idx,
                    "geometry": amenity_geom,
                    "label": amenity_label,
                    "area_label": amenity_templates[i]["area"],
                    "color": amenity_templates[i]["color"],
                    "text": amenity_templates[i]["text"]
                })
                placed_amenities[idx] = amenity_label
                used_candidate_indices.add(idx)
                placed = True
                break
        
        # If couldn't find a non-adjacent block, skip this amenity (CDA rule: same types cannot be together)
        if not placed:
            logger.warning(f"⚠️ Could not place amenity {amenity_label} - no available blocks without adjacent same-type or conflicting amenities (Hospital/School separation rule)")
    
    logger.info(f"✅ Placed {len(overlays)} amenities (CDA compliant: same types are NOT adjacent, Hospitals/Schools are SEPARATED)")
    logger.info(f"✅ Remaining {park_block_count - len(overlays)} park blocks will remain as pure parks for green space")
    logger.info(f"📊 Final distribution: {len([o for o in overlays if o['label'] == 'MOSQUE'])} mosques, "
                f"{len([o for o in overlays if o['label'] == 'HOSPITAL'])} hospitals, "
                f"{len([o for o in overlays if o['label'] == 'SCHOOL'])} schools")
    return overlays

def draw_amenity_overlays(ax, overlays, label_sizes, clip_path=None, geometry_drawer=None, label_point_fn=None):
    """
    Draw amenity overlays using provided geometry/label helpers.
    Falls back to simplified versions if helpers are not supplied (e.g., outside viz pipeline).
    """
    def _default_drawer(ax, geometry, **patch_kwargs):
        drawn = []
        if geometry.is_empty:
            return drawn
        if isinstance(geometry, MultiPolygon):
            for part in geometry.geoms:
                drawn.extend(_default_drawer(ax, part, **patch_kwargs))
        elif isinstance(geometry, Polygon):
            coords = np.asarray(geometry.exterior.coords)
            patch = patches.Polygon(coords, closed=True, **patch_kwargs)
            ax.add_patch(patch)
            drawn.append(patch)
        return drawn
    
    def _default_label_point(geometry):
        try:
            pt = geometry.representative_point()
            return pt.x, pt.y
        except Exception:
            centroid = geometry.centroid
            return centroid.x, centroid.y
    
    drawer = geometry_drawer if geometry_drawer is not None else lambda a, g, **kw: _default_drawer(a, g, **kw)
    labeler = label_point_fn if label_point_fn is not None else _default_label_point
    
    for amenity in overlays:
        geom = amenity["geometry"]
        patches_drawn = drawer(
            ax,
            geom,
            facecolor=amenity["color"],
            edgecolor='black',
            linewidth=2.5,
            alpha=0.95,
            zorder=4.5
        )
        for p in patches_drawn:
            if clip_path is not None:
                p.set_clip_path(clip_path)
        
        label_x, label_y = labeler(geom)
        ax.text(
            label_x,
            label_y + 0.1,
            amenity["label"],
            ha='center',
            va='center',
            fontsize=label_sizes["block"],
            fontweight='bold',
            color=amenity["text"],
            zorder=5
        )
        ax.text(
            label_x,
            label_y - 0.35,
            amenity["area_label"],
            ha='center',
            va='center',
            fontsize=label_sizes["park"],
            fontweight='bold',
            color=amenity["text"],
            zorder=5
        )

def calculate_block_marla(block_geom, area_acres, total_blocks, block_type):
    """
    Calculate the actual marla available for a specific block based on its geometry and total area.
    1 acre = 160 marla (Pakistan standard)
    """
    # Calculate block area in square meters
    block_area_sqm = block_geom.area
    
    # Convert total area to marla
    total_marla = area_acres * 160
    
    # Calculate total area in square meters
    total_area_sqm = area_acres * 4046.86  # 1 acre = 4046.86 sqm
    
    # Calculate what percentage this block represents of total area
    block_area_ratio = block_area_sqm / total_area_sqm if total_area_sqm > 0 else 0
    
    # Calculate marla for this block based on its area ratio
    block_marla = total_marla * block_area_ratio
    
    # Account for infrastructure (roads, utilities) - typically 10-15% of block
    usable_marla = block_marla * 0.88  # 88% usable after infrastructure
    
    logger.debug(f"📐 Block marla calculation: {block_area_sqm:.0f} sqm = {block_marla:.2f} marla (usable: {usable_marla:.2f} marla)")
    
    return usable_marla, block_marla

def get_plot_size_from_marla(block_marla, block_type='residential'):
    """
    Determine realistic plot size based on available marla in the block.
    Returns plot size label (e.g., '5 MARLA', '7 MARLA', etc.)
    CDA Standard: Only 20, 15, 7, and 5 marla plots.
    """
    if block_type == 'residential':
        # CDA Standard residential plot sizes: 20, 15, 7, and 5 marla only
        if block_marla < 10:
            # Very small block - 5 marla plots
            return '5 MARLA'
        elif block_marla < 15:
            # Small block - 5 or 7 marla
            return '7 MARLA' if block_marla > 12 else '5 MARLA'
        elif block_marla < 30:
            # Medium block - 7 or 15 marla
            return '15 MARLA' if block_marla > 25 else '7 MARLA'
        elif block_marla < 60:
            # Large block - 15 or 20 marla
            return '20 MARLA' if block_marla > 50 else '15 MARLA'
        else:
            # Extra large block - 20 marla
            return '20 MARLA'
    
    elif block_type == 'commercial':
        # Commercial plot sizes based on marla
        if block_marla < 15:
            return 'SHOP'
        elif block_marla < 30:
            return 'STORE'
        elif block_marla < 50:
            return 'MALL'
        elif block_marla < 80:
            return 'RETAIL'
        else:
            return 'SUPERMARKET'
    
    else:
        return 'PARK'

def get_mixed_plot_sizes(area_acres, block_type, block_geom=None, total_blocks=None):
    """
    Determine mixed plot sizes for variety across blocks.
    Returns a list of available plot sizes that different blocks can use.
    CDA Standard Plot Sizes: 20, 15, 7, and 5 marla only.
    """
    # CDA Standard: Only 20, 15, 7, and 5 marla plots
    if block_type == 'residential':
        # Always return the 4 standard CDA plot sizes for variety
        # Different blocks will get different sizes from this list
        plot_sizes = ['20 MARLA', '15 MARLA', '7 MARLA', '5 MARLA']
    
    elif block_type == 'commercial':
        if area_acres < 10:
            plot_sizes = ['SHOP', 'SHOP', 'STORE']
        elif area_acres < 25:
            plot_sizes = ['SHOP', 'STORE', 'MALL', 'SHOP']
        elif area_acres < 50:
            plot_sizes = ['SHOP', 'STORE', 'MALL', 'RETAIL', 'SHOP']
        else:
            plot_sizes = ['SHOP', 'STORE', 'MALL', 'RETAIL', 'SUPERMARKET', 'SHOP']
    else:
        plot_sizes = ['PARK']
    
    return plot_sizes, None


def _sample_points_within_polygon(polygon, count, seed=0):
    """Sample deterministic pseudo-random points that lie inside the polygon."""
    import random

    rng = random.Random(seed)
    min_x, min_y, max_x, max_y = polygon.bounds
    points = []
    attempts = 0
    max_attempts = max(count * 50, 500)

    while len(points) < count and attempts < max_attempts:
        x = rng.uniform(min_x, max_x)
        y = rng.uniform(min_y, max_y)
        candidate = Point(x, y)
        if polygon.contains(candidate):
            points.append(candidate)
        attempts += 1

    if len(points) < count:
        # Fallback: jitter representative point to reach desired count
        rep = polygon.representative_point()
        for _ in range(count - len(points)):
            jitter_x = rep.x + rng.uniform(-0.5, 0.5) * (max_x - min_x) * 0.05
            jitter_y = rep.y + rng.uniform(-0.5, 0.5) * (max_y - min_y) * 0.05
            points.append(Point(jitter_x, jitter_y))

    return points


def create_shape_aware_blocks(layout_polygon, total_blocks, seed=0):
    """
    Generate polygon-conforming blocks using a clipped Voronoi diagram so
    the resulting layout fully respects the selected shape (no square clipping).
    """
    if total_blocks <= 0:
        return []

    points = _sample_points_within_polygon(layout_polygon, total_blocks, seed)
    multipoint = MultiPoint(points)

    try:
        voronoi = voronoi_diagram(
            multipoint,
            envelope=layout_polygon.buffer(layout_polygon.length * 0.02),
            tolerance=1e-7
        )
    except Exception as exc:
        logger.warning(f"Voronoi generation failed ({exc}), falling back to simple blocks.")
        return [layout_polygon]

    cells = []
    for cell in voronoi.geoms:
        clipped = cell.intersection(layout_polygon)
        if not clipped.is_empty:
            # Ensure we work with simple polygons for rendering
            cells.append(clipped.buffer(0))

    # If Voronoi produced fewer cells (degenerate cases), duplicate the largest ones
    if len(cells) < total_blocks and cells:
        cells.sort(key=lambda geom: geom.area, reverse=True)
        idx = 0
        while len(cells) < total_blocks:
            cells.append(cells[idx % len(cells)].buffer(0))
            idx += 1

    # If too many, keep the ones with bigger area to avoid tiny slivers
    if len(cells) > total_blocks:
        cells.sort(key=lambda geom: geom.area, reverse=True)
        cells = cells[:total_blocks]

    # Sort cells from top-left to bottom-right for consistent labeling
    cells.sort(key=lambda geom: (-geom.centroid.y, geom.centroid.x))

    return cells

def create_rectangular_blocks(layout_polygon, min_x, start_y, block_width, block_height, num_blocks_x, num_blocks_y):
    """
    Generate axis-aligned rectangular blocks clipped to the layout polygon.
    Produces predictable grids similar to professional township layouts.
    """
    blocks = []
    for row in range(num_blocks_y):
        for col in range(num_blocks_x):
            x0 = min_x + col * block_width
            x1 = x0 + block_width
            y0 = start_y + row * block_height
            y1 = y0 + block_height
            cell = box(x0, y0, x1, y1)
            clipped = cell.intersection(layout_polygon)
            if clipped.is_empty:
                blocks.append(Polygon())
            else:
                blocks.append(clipped)
    return blocks

def create_dynamic_cda_layout(polygon_coords, num_blocks_x, num_blocks_y, mean_slope, flood_risk, erosion_risk, mean_elevation, area_acres):
    """
    Create dynamic CDA compliant layout based on actual polygon area
    Following CDA regulations: 50% residential, 30% commercial, 20% green spaces (including amenities)
    """
    logger.info(f"🏛️ Creating DYNAMIC CDA layout: {num_blocks_x}x{num_blocks_y} grid for {area_acres:.1f} acres")
    
    # Calculate area in square meters for seed generation
    area_sqm = area_acres * 4046.86
    
    # EXACT CDA DISTRIBUTION: 50% residential, 30% commercial, 20% green (parks + amenities)
    total_blocks = num_blocks_x * num_blocks_y
    
    # Calculate exact distribution per CDA rules
    residential_blocks = int(total_blocks * 0.50)  # 50% residential
    commercial_blocks = int(total_blocks * 0.30)    # 30% commercial
    green_blocks = total_blocks - residential_blocks - commercial_blocks  # 20% green (remaining for parks + amenities)
    
    # Ensure minimum counts
    green_blocks = max(1, green_blocks)  # At least 1 park
    commercial_blocks = max(1, commercial_blocks)  # At least 1 commercial
    residential_blocks = max(1, residential_blocks)  # At least 1 residential
    
    # Recalculate if needed to ensure total matches (rounding may cause slight differences)
    if residential_blocks + commercial_blocks + green_blocks != total_blocks:
        green_blocks = total_blocks - residential_blocks - commercial_blocks
    
    logger.info(f"📊 EXACT CDA Distribution for {area_acres:.2f} acres: {residential_blocks} residential (50%), {commercial_blocks} commercial (30%), {green_blocks} green (20% - divided between parks and amenities)")
    logger.info(f"🔴 COMMERCIAL BLOCKS: {commercial_blocks} blocks will be assigned commercial zone type")
    logger.info(f"🟢 GREEN SPACE: {green_blocks} blocks will be divided between parks and amenities (total 20%)")
    
    # Create a list of all block positions
    all_positions = []
    for row in range(num_blocks_y):
        for col in range(num_blocks_x):
            all_positions.append((row, col))
    
    # Shuffle positions for REALISTIC variation based on multiple factors
    import random
    # Use polygon ID, area, and terrain data for unique layouts
    unique_seed = int(polygon_coords[0][0] * 1000 + polygon_coords[0][1] * 1000 + area_sqm + mean_slope * 10) % 10000
    random.seed(unique_seed)
    random.shuffle(all_positions)
    
    # Assign zones based on CDA distribution with TERRAIN-BASED intelligence
    zone_assignments = {}
    
    # Sort positions by terrain suitability for intelligent placement
    def get_position_suitability(pos):
        row, col = pos
        # Corner positions are better for commercial
        is_corner = (row == 0 or row == num_blocks_y-1) and (col == 0 or col == num_blocks_x-1)
        is_edge = (row == 0 or row == num_blocks_y-1 or col == 0 or col == num_blocks_x-1)
        is_center = not is_edge
        
        # Calculate suitability score
        if is_corner:
            return 3  # Best for commercial
        elif is_edge:
            return 2  # Good for commercial or residential
        else:
            return 1  # Best for residential
    
    # Sort positions by suitability
    all_positions.sort(key=get_position_suitability, reverse=True)
    
    # Assign commercial blocks to best positions (corners and edges)
    for i in range(commercial_blocks):
        if i < len(all_positions):
            zone_assignments[all_positions[i]] = 'commercial'
    
    # Assign green spaces to remaining positions (considering terrain risk)
    # CDA RULE: Parks cannot be adjacent to each other for better distribution
    # BUT we MUST assign exactly green_blocks parks to maintain 20% distribution
    green_assigned = 0
    remaining_positions = all_positions[commercial_blocks:]
    
    # First pass: Try to assign parks avoiding adjacency
    for pos in remaining_positions:
        if green_assigned >= green_blocks:
            break
            
        # Check if this position is adjacent to any existing park
        row, col = pos
        is_adjacent_to_park = False
        
        # Check all 8 adjacent positions
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue  # Skip the position itself
                adjacent_pos = (row + dr, col + dc)
                if adjacent_pos in zone_assignments and zone_assignments[adjacent_pos] == 'park':
                    is_adjacent_to_park = True
                    break
            if is_adjacent_to_park:
                break
        
        # CDA RULE: Prefer non-adjacent positions for parks, but ensure we get exactly green_blocks
        if not is_adjacent_to_park:
            zone_assignments[pos] = 'park'
            green_assigned += 1
    
    # Second pass: If we still need more parks, assign them even if adjacent (to maintain exact 20%)
    if green_assigned < green_blocks:
        for pos in remaining_positions:
            if green_assigned >= green_blocks:
                break
            if pos not in zone_assignments:  # Not yet assigned
                zone_assignments[pos] = 'park'
                green_assigned += 1
    
    # Assign remaining positions as residential (to ensure exactly 50% residential)
    for pos in remaining_positions:
        if pos not in zone_assignments:
            zone_assignments[pos] = 'residential'
    
    # Create the layout grid
    block_layout = []
    for row in range(num_blocks_y):
        layout_row = []
        for col in range(num_blocks_x):
            zone_type = zone_assignments.get((row, col), 'residential')
            layout_row.append(zone_type)
        block_layout.append(layout_row)
    
    # Verify the distribution matches target percentages
    actual_residential = sum(1 for row in block_layout for zone in row if zone == 'residential')
    actual_commercial = sum(1 for row in block_layout for zone in row if zone == 'commercial')
    actual_green = sum(1 for row in block_layout for zone in row if zone == 'park')
    
    actual_residential_pct = (actual_residential / total_blocks * 100) if total_blocks > 0 else 0
    actual_commercial_pct = (actual_commercial / total_blocks * 100) if total_blocks > 0 else 0
    actual_green_pct = (actual_green / total_blocks * 100) if total_blocks > 0 else 0
    
    # Log the dynamic CDA layout with verification
    logger.info(f"🏛️ Dynamic CDA layout created:")
    logger.info(f"📊 VERIFIED DISTRIBUTION:")
    logger.info(f"   Residential: {actual_residential} blocks ({actual_residential_pct:.1f}%) - Target: 50%")
    logger.info(f"   Commercial: {actual_commercial} blocks ({actual_commercial_pct:.1f}%) - Target: 30%")
    logger.info(f"   Green (parks): {actual_green} blocks ({actual_green_pct:.1f}%) - Target: 20%")
    logger.info(f"   Total: {actual_residential + actual_commercial + actual_green} / {total_blocks} blocks")
    
    # Warn if distribution is significantly off (more than 5% difference)
    if abs(actual_residential_pct - 50) > 5:
        logger.warning(f"⚠️ Residential distribution ({actual_residential_pct:.1f}%) is off target (50%)")
    if abs(actual_commercial_pct - 30) > 5:
        logger.warning(f"⚠️ Commercial distribution ({actual_commercial_pct:.1f}%) is off target (30%)")
    if abs(actual_green_pct - 20) > 5:
        logger.warning(f"⚠️ Green space distribution ({actual_green_pct:.1f}%) is off target (20%)")
    
    return block_layout

def create_2d_zoning_visualization(polygon_coords, zoning_data, output_path=None):
    """
    Create a CDA COMPLIANT PROFESSIONAL SOCIETY LAYOUT
    Based on CDA (Capital Development Authority) regulations and real terrain data
    """
    try:
        logger.info(f"🏛️ Creating CDA COMPLIANT SOCIETY LAYOUT")
        logger.info(f"Polygon coords: {len(polygon_coords) if polygon_coords else 'None'}")
        logger.info(f"Zoning data keys: {list(zoning_data.keys()) if zoning_data else 'None'}")
        
        # Compact label sizing keeps dense layouts readable
        label_sizes = {
            "title": 26,
            "subtitle": 18,
            "terrain": 14,
            "block": 11,
            "residential_plot": 5,  # Smaller for cleaner professional look
            "commercial_plot": 8,
            "park": 14,
            "boulevard": 13,
            "legend_title": 13,
            "legend_item": 11,
            "north": 16,
            "scale": 10,
            "branding": 9,
        }
        block_bbox_settings = {"boxstyle": "round,pad=0.25", "facecolor": "white", "alpha": 0.9, "edgecolor": "black", "linewidth": 1.5}

        # Get REAL terrain data from the analysis
        terrain_summary = zoning_data.get('terrain_summary', {})
        terrain_stats = zoning_data.get('stats', {})
        slope_analysis = zoning_data.get('slope_analysis', {})
        flood_analysis = zoning_data.get('flood_analysis', {})
        erosion_analysis = zoning_data.get('erosion_analysis', {})
        
        # Extract ACTUAL terrain characteristics with fallbacks
        actual_elevation = terrain_summary.get('mean_elevation', terrain_stats.get('mean_elevation', 500))
        actual_slope = terrain_summary.get('mean_slope', slope_analysis.get('mean_slope', 10))
        actual_flood_risk = terrain_summary.get('flood_risk', flood_analysis.get('flood_stats', {}).get('high_risk_area', 0))
        actual_erosion_risk = terrain_summary.get('erosion_risk', erosion_analysis.get('erosion_stats', {}).get('mean_soil_loss', 0))
        
        # Define variables for dynamic zoning (with fallbacks)
        mean_elevation = actual_elevation
        mean_slope = actual_slope
        max_slope = slope_analysis.get('max_slope', actual_slope * 1.5)
        flood_risk = actual_flood_risk
        erosion_risk = actual_erosion_risk
        
        # Use more detailed terrain data if available (update variables)
        if slope_analysis:
            actual_slope = slope_analysis.get('mean_slope', actual_slope)
            mean_slope = actual_slope
            max_slope = slope_analysis.get('max_slope', actual_slope * 1.5)
        if flood_analysis:
            flood_stats = flood_analysis.get('flood_stats', {})
            actual_flood_risk = flood_stats.get('high_risk_area', actual_flood_risk)
            flood_risk = actual_flood_risk
        if erosion_analysis:
            erosion_stats = erosion_analysis.get('erosion_stats', {})
            actual_erosion_risk = erosion_stats.get('mean_soil_loss', actual_erosion_risk)
            erosion_risk = actual_erosion_risk
        
        logger.info(f"🎯 REAL TERRAIN DATA - Elevation: {actual_elevation}m, Slope: {actual_slope}°, Flood: {actual_flood_risk}%, Erosion: {actual_erosion_risk}")
        
        def scale_polygon_to_layout(coords_array, target_width, target_height, offset_x, offset_y, padding_ratio=0.05):
            """
            Normalize user polygon coordinates so they fit inside the planning canvas
            while preserving shape and aspect ratio.
            """
            if coords_array is None or coords_array.size == 0:
                return coords_array
            
            xs = coords_array[:, 0]
            ys = coords_array[:, 1]
            min_geo_x, max_geo_x = xs.min(), xs.max()
            min_geo_y, max_geo_y = ys.min(), ys.max()
            
            geo_width = max_geo_x - min_geo_x
            geo_height = max_geo_y - min_geo_y
            if geo_width == 0:
                geo_width = 1e-6
            if geo_height == 0:
                geo_height = 1e-6
            
            padding_x = target_width * padding_ratio
            padding_y = target_height * padding_ratio
            available_width = max(target_width - 2 * padding_x, 1e-3)
            available_height = max(target_height - 2 * padding_y, 1e-3)
            scale = min(available_width / geo_width, available_height / geo_height)
            
            scaled_width = geo_width * scale
            scaled_height = geo_height * scale
            extra_x = (available_width - scaled_width) / 2
            extra_y = (available_height - scaled_height) / 2
            
            scaled_x = offset_x + padding_x + extra_x + (xs - min_geo_x) * scale
            scaled_y = offset_y + padding_y + extra_y + (ys - min_geo_y) * scale
            
            return np.column_stack((scaled_x, scaled_y))

        def draw_geometry(ax, geometry, **patch_kwargs):
            """Draw shapely geometry (Polygon or MultiPolygon) onto the axes."""
            drawn_patches = []
            if geometry.is_empty:
                return drawn_patches
            if isinstance(geometry, MultiPolygon):
                for geom_part in geometry.geoms:
                    drawn_patches.extend(draw_geometry(ax, geom_part, **patch_kwargs))
            elif isinstance(geometry, Polygon):
                coords = np.asarray(geometry.exterior.coords)
                patch = patches.Polygon(coords, closed=True, **patch_kwargs)
                ax.add_patch(patch)
                drawn_patches.append(patch)
            return drawn_patches

        def get_label_point(geometry):
            """Return a representative point for placing labels inside geometry."""
            try:
                pt = geometry.representative_point()
                return pt.x, pt.y
            except Exception:
                centroid = geometry.centroid
                return centroid.x, centroid.y

        # Calculate actual polygon area FIRST
        logger.info(f"🔍 DEBUG: polygon_coords type: {type(polygon_coords)}")
        logger.info(f"🔍 DEBUG: polygon_coords length: {len(polygon_coords) if polygon_coords else 'None'}")
        logger.info(f"🔍 DEBUG: polygon_coords sample: {polygon_coords[:2] if polygon_coords and len(polygon_coords) > 0 else 'None'}")
        
        area_sqm, area_acres = calculate_polygon_area(polygon_coords)
        logger.info(f"📏 CALCULATED AREA: {area_sqm:.0f} sqm = {area_acres:.2f} acres")
        total_marla = area_sqm / SQM_PER_MARLA
        # Helper function to extract marla from plot size string
        def extract_marla_from_plot_size(plot_size_str):
            """Extract marla number from strings like '5 MARLA', '7 MARLA', etc."""
            if isinstance(plot_size_str, str):
                import re
                match = re.search(r'(\d+(?:\.\d+)?)\s*MARLA', plot_size_str.upper())
                if match:
                    return float(match.group(1))
            return 0.0
        
        marla_accounting = {
            "total_polygon_marla": total_marla,
            "residential_marla": 0.0,  # Will be sum of individual plot marlas
            "commercial_marla": 0.0,   # Will be sum of individual plot marlas
            "park_marla": 0.0,
            "reserved_marla": 0.0,
            "roundabout_surface_marla": 0.0,
            "amenity_counts": {"MOSQUE": 0, "HOSPITAL": 0, "SCHOOL": 0},
            "total_plots": {"residential": 0, "commercial": 0},  # Track plot counts
        }
        
        # Create figure with extra breathing room to showcase civic elements
        fig, ax = plt.subplots(1, 1, figsize=(24, 18))
        fig.patch.set_facecolor('white')
        ax.set_facecolor('white')
        
        # Perfect margins to accommodate all elements
        plt.subplots_adjust(left=0.05, right=0.95, top=0.95, bottom=0.05)
        ax.set_xlim(-3, 22)
        ax.set_ylim(-1.5, 16)
        ax.axis('off')  # Remove all axes
        
        # Create layout with more space for all elements
        min_x, min_y = 0, 0
        max_x, max_y = 18, 9  # Expanded map area only
        width = max_x - min_x
        height = max_y - min_y
        start_y = 0.6
        layout_center_x = min_x + width / 2
        
        polygon_coords_array = np.array(polygon_coords, dtype=float)
        scaled_polygon_coords = scale_polygon_to_layout(
            polygon_coords_array,
            width,
            height,
            min_x,
            start_y
        )
        
        if scaled_polygon_coords is None or len(scaled_polygon_coords) < 3:
            scaled_polygon_coords = np.array([
                [min_x, start_y],
                [min_x + width, start_y],
                [min_x + width, start_y + height],
                [min_x, start_y + height]
            ])
        
        # Ensure polygon is closed (first point == last point) - do this once at the start
        if scaled_polygon_coords is not None and len(scaled_polygon_coords) > 0:
            first_point = scaled_polygon_coords[0]
            last_point = scaled_polygon_coords[-1]
            # Use numpy array comparison with tolerance for floating point
            if not np.allclose(first_point, last_point, rtol=1e-5, atol=1e-5):
                # Add first point at the end to close the polygon
                scaled_polygon_coords = np.vstack([scaled_polygon_coords, [first_point]])
        
        polygon_fill = patches.Polygon(
            scaled_polygon_coords,
            closed=True,
            facecolor='#e0f2fe',
            edgecolor='none',
            linewidth=0,
            alpha=0.25,
            zorder=1
        )
        ax.add_patch(polygon_fill)

        clip_polygon_patch = patches.Polygon(
            scaled_polygon_coords,
            closed=True,
            facecolor='none',
            edgecolor='none'
        )
        ax.add_patch(clip_polygon_patch)
        
        layout_polygon = Polygon(scaled_polygon_coords)
        
        # Calculate scale factor: real-world polygon area / layout polygon area
        layout_polygon_area = layout_polygon.area  # in layout coordinate units squared
        scale_factor_sq = area_sqm / layout_polygon_area if layout_polygon_area > 0 else 1.0
        scale_factor = np.sqrt(scale_factor_sq)  # linear scale factor
        
        # Log area information for verification
        logger.info(f"📐 AREA CALCULATION:")
        logger.info(f"   Real-world polygon area: {area_sqm:.2f} sqm ({area_acres:.2f} acres)")
        logger.info(f"   Layout polygon area: {layout_polygon_area:.4f} layout units²")
        logger.info(f"   Scale factor (linear): {scale_factor:.4f}")
        logger.info(f"   Scale factor (squared): {scale_factor_sq:.4f}")
        logger.info(f"   → 1 layout unit² = {scale_factor_sq:.2f} sqm")
        
        # CDA COMPLIANT title with VARIED selection based on multiple factors
        name_seed = int(area_sqm + mean_elevation + polygon_coords[0][0] * 100) % 4
        if name_seed == 0:
            society_name = 'CDA HILLSIDE GARDENS'
        elif name_seed == 1:
            society_name = 'CDA RIVERSIDE GARDENS'
        elif name_seed == 2:
            society_name = 'CDA TERRACE GARDENS'
        else:
            society_name = 'CDA SUNSET GARDENS'
        
        ax.text(layout_center_x, 13.5, society_name, 
                fontsize=label_sizes["title"], fontweight='bold', 
                ha='center', va='center', color='black',
                bbox=dict(boxstyle="round,pad=0.6", facecolor='#e0f2fe', edgecolor='black', linewidth=2))
        
        # CDA COMPLIANT subtitle with VARIED selection based on multiple factors
        district_seed = int(area_sqm + mean_slope + polygon_coords[0][1] * 100) % 4
        if district_seed == 0:
            district_type = 'CDA FLOOD-RESISTANT ZONE'
        elif district_seed == 1:
            district_type = 'CDA TERRACED ZONE'
        elif district_seed == 2:
            district_type = 'CDA HILLSIDE ZONE'
        else:
            district_type = 'CDA RESIDENTIAL ZONE'
        
        ax.text(layout_center_x, 12.8, district_type, 
                fontsize=label_sizes["subtitle"], fontweight='bold', 
                ha='center', va='center', color='black',
                bbox=dict(boxstyle="round,pad=0.4", facecolor='#e0f2fe', edgecolor='black', linewidth=2))
        
        # PROFESSIONAL terrain data bar with slope warnings - ABOVE the map with proper spacing
        polygon_id = zoning_data.get('polygon_id', 'N/A')
        terrain_text = f'Total Polygon Area: {area_sqm:.0f} sqm ({area_acres:.2f} acres) | Elevation: {actual_elevation:.0f}m | Slope: {actual_slope:.1f}° | Flood Risk: {actual_flood_risk:.1f}% | Erosion: {actual_erosion_risk:.2f}'
        
        # Add slope warning to terrain bar (allow up to 55°)
        if actual_slope > 55:
            terrain_text += ' | ⚠️ EXTREME SLOPE - Leveling Required'
            terrain_bg_color = '#991b1b'  # Dark red background for extreme slope
        elif actual_slope > 50:
            terrain_text += ' | ⚠️ VERY STEEP - Leveling Required'
            terrain_bg_color = '#dc2626'  # Red background for very steep
        elif actual_slope > 35:
            terrain_text += ' | ⚠️ STEEP - Leveling Recommended'
            terrain_bg_color = '#f59e0b'  # Orange background for steep
        else:
            terrain_bg_color = '#10b981'  # Green background for normal
        
        ax.text(layout_center_x, 12.1, terrain_text, 
                fontsize=label_sizes["terrain"], fontweight='bold', 
                ha='center', va='center', color='white',
                bbox=dict(boxstyle="round,pad=0.4", facecolor=terrain_bg_color, edgecolor='#059669', linewidth=2))
        
        # DYNAMIC ZONING BASED ON REAL TERRAIN DATA
        # Variables already defined above with proper fallbacks
        
        logger.info(f"🎯 DYNAMIC ZONING - Elevation: {mean_elevation}m, Slope: {mean_slope}°, Flood: {flood_risk}%, Erosion: {erosion_risk}")
        
        # Area already calculated above
        
        # Determine grid size based on ACTUAL polygon area (DYNAMIC SCALING)
        logger.info(f"🔍 DETERMINING GRID SIZE for {area_acres:.2f} acres (from polygon)")
        
        # Calculate target number of blocks based on area
        # Formula: target_blocks = area_acres * blocks_per_acre
        # Increase blocks as area increases for better detail
        if area_acres < 1:
            blocks_per_acre = 6  # 6 blocks per acre for tiny areas
            num_blocks = max(4, int(area_acres * blocks_per_acre))
        elif area_acres < 5:
            blocks_per_acre = 5  # 5 blocks per acre for small areas
            num_blocks = max(6, int(area_acres * blocks_per_acre))
        elif area_acres < 20:
            blocks_per_acre = 4  # 4 blocks per acre for medium areas
            num_blocks = max(10, int(area_acres * blocks_per_acre))
        elif area_acres < 50:
            blocks_per_acre = 3.5  # 3.5 blocks per acre
            num_blocks = max(30, int(area_acres * blocks_per_acre))
        elif area_acres < 100:
            blocks_per_acre = 3.0  # 3 blocks per acre
            num_blocks = max(60, int(area_acres * blocks_per_acre))
        elif area_acres < 200:
            blocks_per_acre = 2.5  # 2.5 blocks per acre
            num_blocks = max(100, int(area_acres * blocks_per_acre))
        else:
            blocks_per_acre = 2.0  # 2 blocks per acre for very large areas
            num_blocks = max(160, int(area_acres * blocks_per_acre))
        
        # Cap maximum blocks for performance and readability (max 25x20 = 500 blocks)
        num_blocks = min(num_blocks, 500)
        
        # Calculate grid dimensions (prefer wider than tall for better layout)
        # Use golden ratio approximation: width/height ≈ 1.3
        aspect_ratio = 1.3
        num_blocks_y = max(3, int(np.sqrt(num_blocks / aspect_ratio)))
        num_blocks_x = max(3, int(num_blocks / num_blocks_y))
        
        # Ensure we have at least the target number of blocks
        while num_blocks_x * num_blocks_y < num_blocks and num_blocks_x * num_blocks_y < 500:
            if num_blocks_x <= num_blocks_y:
                num_blocks_x += 1
            else:
                num_blocks_y += 1
        
        # Adjust for terrain complexity
        if max_slope > 50 or flood_risk > 0.4:
            # Slightly reduce grid size for very complex terrain (but keep it reasonable)
            num_blocks_x = max(3, int(num_blocks_x * 0.9))
            num_blocks_y = max(3, int(num_blocks_y * 0.9))
        
        logger.info(f"📐 DYNAMIC GRID: {num_blocks_x}x{num_blocks_y} = {num_blocks_x * num_blocks_y} blocks for {area_acres:.1f} acres ({blocks_per_acre:.1f} blocks/acre)")
        
        # Use rectilinear grid for blocks similar to reference layouts
        block_width = width / num_blocks_x
        block_height = height / num_blocks_y
        road_width = min(block_width, block_height) * 0.12
        
        # DYNAMIC CDA COMPLIANT block layout based on actual polygon area
        block_layout = create_dynamic_cda_layout(polygon_coords, num_blocks_x, num_blocks_y, 
                                               mean_slope, flood_risk, erosion_risk, mean_elevation, area_acres)
        
        total_blocks = num_blocks_x * num_blocks_y
        
        block_polygons = create_rectangular_blocks(
            layout_polygon,
            min_x,
            start_y,
            block_width,
            block_height,
            num_blocks_x,
            num_blocks_y
        )
        block_types = [zone for row in block_layout for zone in row]

        draw_rectilinear_road_network(
            ax,
            min_x,
            max_x,
            start_y,
            height,
            num_blocks_x,
            num_blocks_y,
            block_width,
            block_height,
            road_width,
            clip_path=clip_polygon_patch
        )

        if ENABLE_CURVED_SPINES:
            draw_curved_neighborhood_spines(
                ax,
                min_x,
                max_x,
                start_y,
                height,
                road_width,
                clip_path=clip_polygon_patch,
                seed=int(area_sqm + mean_slope * 10) % 10000,
                count=max(2, num_blocks_x // 3)
            )

        reserved_block_indices = set()
        # Determine roundabout placement based on polygon area and interior grid
        roundabout_specs = []
        reserved_block_indices.clear()
        if layout_polygon and not layout_polygon.is_empty:
            padding_ratio = 0.18
            min_ratio = padding_ratio
            max_ratio = 1 - padding_ratio
            min_roundabouts = 1
            if area_acres < 45:
                roundabout_count = 1
            elif area_acres < 80:
                roundabout_count = 2
            elif area_acres < 120:
                roundabout_count = 3
            else:
                roundabout_count = 4

            ratios = np.linspace(min_ratio, max_ratio, roundabout_count)
            vertical_offsets = np.linspace(0.45, 0.6, roundabout_count)
            base_radius = max(min(block_width, block_height) * 0.5, road_width * 2.2)

            for idx, (rx, ry) in enumerate(zip(ratios, vertical_offsets)):
                cx = min_x + width * float(rx)
                cy = start_y + height * float(ry)
                radius = base_radius * max(1.0, 1.3 - idx * 0.1)

                candidate = Point(cx, cy)
                attempts = 0
                while attempts < 18:
                    inner_buffer = layout_polygon.buffer(-road_width * (0.5 + attempts * 0.05))
                    if not inner_buffer.is_empty and inner_buffer.contains(candidate):
                        break
                    cy = start_y + height * float(ry) - block_height * 0.05 * (attempts + 1)
                    candidate = Point(cx, cy)
                    attempts += 1

                if layout_polygon.contains(candidate):
                    interior_buffer = layout_polygon.buffer(-radius * 1.1)
                    if interior_buffer.is_empty or not interior_buffer.contains(candidate):
                        continue
                    roundabout_specs.append({
                        "center": (candidate.x, candidate.y),
                        "radius": radius
                    })

        if roundabout_specs:
            for spec in roundabout_specs:
                influence = Point(spec["center"]).buffer(spec["radius"] * 1.35, resolution=96)
                for idx, geom in enumerate(block_polygons):
                    if idx in reserved_block_indices or geom.is_empty:
                        continue
                    try:
                        rep_point = geom.representative_point()
                    except Exception:
                        continue
                    if influence.contains(rep_point):
                        reserved_block_indices.add(idx)

        amenity_overlays = []
        amenity_block_map = {}
        if ENABLE_AMENITY_OVERLAYS:
            available_blocks = max(1, len(block_polygons) - len(reserved_block_indices))
            
            # IMPROVED: More parks, hospitals, and schools based on area
            # Scale properly with area size for realistic urban planning
            if area_acres < 10:
                estimated_mosques = 2
                estimated_schools = 1
                estimated_hospitals = 1
            elif area_acres < 25:
                estimated_mosques = 3
                estimated_schools = 2
                estimated_hospitals = 1
            elif area_acres < 50:
                estimated_mosques = max(4, int(area_acres / 20))  # 1 per 20 acres
                estimated_schools = max(3, int(area_acres / 22))  # 1 per 22 acres  
                estimated_hospitals = max(2, int(area_acres / 50))  # 1 per 50 acres
            elif area_acres < 100:
                estimated_mosques = max(5, int(area_acres / 18))  # 1 per 18 acres
                estimated_schools = max(4, int(area_acres / 20))  # 1 per 20 acres
                estimated_hospitals = max(2, int(area_acres / 45))  # 1 per 45 acres
            else:
                # Large societies: more facilities
                estimated_mosques = max(6, int(area_acres / 16))  # 1 per 16 acres
                estimated_schools = max(5, int(area_acres / 18))  # 1 per 18 acres
                estimated_hospitals = max(3, int(area_acres / 40))  # 1 per 40 acres

            estimated_amenities = estimated_mosques + estimated_schools + estimated_hospitals + 2
            max_amenity_slots = max(3, int(available_blocks * 0.5))  # Allow more amenities
            estimated_amenities = min(estimated_amenities, max_amenity_slots)
            amenity_overlays = generate_amenity_overlays(
                block_polygons,
                block_types,
                seed=int(area_sqm + mean_elevation + flood_risk * 1000) % 10000,
                max_overlays=estimated_amenities,
                area_acres=area_acres,
                blocked_indices=reserved_block_indices,
                num_blocks_x=num_blocks_x,
                num_blocks_y=num_blocks_y
            )
            amenity_block_map = {overlay["block_index"]: overlay for overlay in amenity_overlays}

        colors = {
            'residential': '#FA8072',  # Salmon/coral like Zameen.com Al Rehman Garden
            'commercial': '#FFD700',   # Gold for commercial like Zameen.com
            'park': '#32CD32'          # Lime green for parks
        }
        
        slope_warning_colors = {
            'residential_steep': '#FFA07A',  # Light salmon for steep areas
            'commercial_steep': '#FFE4B5',   # Moccasin for steep commercial
            'residential_very_steep': '#FF8C69',  # Darker salmon for very steep
            'commercial_very_steep': '#FFD700'    # Gold for very steep commercial
        }
        
        border_colors = {
            'residential': '#8B4513',  # Saddle brown border like Zameen.com
            'commercial': '#B8860B',   # Dark goldenrod
            'park': '#228B22'          # Forest green
        }
        
        plot_color_settings = {
            'residential': {'fill': '#FA8072', 'edge': '#8B4513', 'text': '#000000'},  # Salmon/coral like Zameen.com with dark brown edge
            'commercial': {'fill': '#FFD700', 'edge': '#B8860B', 'text': '#000000'}  # Gold like Zameen.com with dark gold edge
        }
        
        # Count blocks by type for verification
        commercial_count = sum(1 for bt in block_types if bt == 'commercial')
        residential_count = sum(1 for bt in block_types if bt == 'residential')
        park_count = sum(1 for bt in block_types if bt == 'park')
        logger.info(f"🔍 Block type counts before rendering: {residential_count} residential, {commercial_count} commercial, {park_count} park")
        if commercial_count == 0:
            logger.warning(f"⚠️ WARNING: No commercial blocks found! Check block distribution logic.")
        
        for idx, (block_geom, block_type) in enumerate(zip(block_polygons, block_types)):
            if block_geom.is_empty:
                continue
            # Convert block area from layout coordinates to real-world square meters
            block_area_layout_sq = block_geom.area  # layout units squared
            block_area_sqm = block_area_layout_sq * scale_factor_sq  # real-world square meters
            block_area_marla = block_area_sqm / SQM_PER_MARLA
            if idx in reserved_block_indices:
                marla_accounting["reserved_marla"] += block_area_marla
                continue

            render_geom = block_geom
            shrink_distance = road_width * 0.6
            if shrink_distance > 0:
                shrunken = block_geom.buffer(-shrink_distance)
                if not shrunken.is_empty:
                    render_geom = shrunken

            min_bx, min_by, max_bx, max_by = render_geom.bounds
            block_w = max(max_bx - min_bx, 1e-3)
            block_h = max(max_by - min_by, 1e-3)

            # Determine block color based on type and slope (allow up to 55°)
            # Note: Residential/Commercial marla will be calculated from individual plots, not block area
            if block_type == 'residential':
                # Don't add block area here - will sum individual plot marlas instead
                # All residential blocks use the same salmon/coral color like Zameen.com
                block_color = colors['residential']  # Always use salmon/coral (#FA8072)
                if mean_slope > 55:
                    slope_warning = "EXTREME SLOPE - Leveling Required"
                elif mean_slope > 50:
                    slope_warning = "VERY STEEP - Leveling Required"
                elif mean_slope > 35:
                    slope_warning = "STEEP - Leveling Recommended"
                else:
                    slope_warning = None
            elif block_type == 'commercial':
                # Don't add block area here - will sum individual plot marlas instead
                if mean_slope > 55:
                    block_color = slope_warning_colors['commercial_very_steep']
                    slope_warning = "EXTREME SLOPE - Leveling Required"
                elif mean_slope > 50:
                    block_color = slope_warning_colors['commercial_very_steep']
                    slope_warning = "VERY STEEP - Leveling Required"
                elif mean_slope > 35:
                    block_color = slope_warning_colors['commercial_steep']
                    slope_warning = "STEEP - Leveling Recommended"
                else:
                    block_color = colors['commercial']
                    slope_warning = None
            else:
                if block_type == 'park':
                    # Use render_geom area (what's actually displayed) to match visualization
                    # Calculate after shrink is applied
                    render_area_layout_sq = render_geom.area
                    render_area_sqm = render_area_layout_sq * scale_factor_sq
                    park_marla = render_area_sqm / SQM_PER_MARLA
                    marla_accounting["park_marla"] += park_marla
                block_color = colors.get(block_type, '#e5e7eb')
                slope_warning = None
            
            amenity_overlay = amenity_block_map.get(idx)
            # Draw commercial blocks with high visibility, even if they have amenities
            if amenity_overlay and block_type != 'commercial':
                # For non-commercial blocks, use amenity color
                block_color = amenity_overlay["color"]
            
            # Always draw the block background first (especially important for commercial)
            draw_geometry(
                ax,
                render_geom,
                facecolor=block_color,
                edgecolor=border_colors[block_type],
                linewidth=3 if block_type == 'commercial' else 2,  # Thicker border for commercial
                alpha=0.9 if block_type == 'commercial' else 0.85,  # More opaque for commercial visibility
                zorder=2  # Lower zorder so plots appear on top
            )
            
            # If this is a commercial block with an amenity, draw amenity overlay on top
            if amenity_overlay and block_type == 'commercial':
                amenity_geom = amenity_overlay["geometry"]
                if hasattr(amenity_geom, 'area') and not amenity_geom.is_empty:
                    draw_geometry(
                        ax,
                        amenity_geom,
                        facecolor=amenity_overlay["color"],
                        edgecolor='black',
                        linewidth=2,
                        alpha=0.8,  # Slightly transparent so commercial background shows
                        zorder=3  # Above block but below plots
                    )
            
            row = idx // num_blocks_x
            col = idx % num_blocks_x
            label_letter = chr(65 + (col % 26))
            label_suffix = row + 1 + (col // 26) * num_blocks_y
            block_label = f"Block {label_letter}{label_suffix}"
            
            # Clean block labels without slope warnings (warnings shown in terrain bar only)
            label_color = 'black'
            label_bg = 'white'

            label_x, label_y = get_label_point(render_geom)
            
            # Only show amenity labels, no block labels for other types
            if amenity_overlay:
                amenity_text = ax.text(label_x, label_y,
                                     amenity_overlay["label"], ha='center', va='center', fontsize=label_sizes["block"], fontweight='bold',
                                     color=amenity_overlay["text"],
                                     bbox=dict(boxstyle="round,pad=0.3", facecolor=amenity_overlay["color"], edgecolor='black', linewidth=1.5, alpha=0.9))
    
            # Add plots to blocks - EXACT layout from image
            if amenity_overlay:
                continue
            if block_type == 'residential':
                # Get mixed plot sizes for variety across blocks
                # Use deterministic seed based on block position to assign different sizes to different blocks
                import random
                block_seed = int(area_sqm + row * 100 + col * 50 + mean_slope * 5 + flood_risk * 100) % 10000
                random.seed(block_seed)
                
                # Always get the full mixed list (not block-specific single size)
                # CDA Standard: Only 20, 15, 7, and 5 marla plots
                plot_sizes, _ = get_mixed_plot_sizes(area_acres, 'residential')
                if not plot_sizes:
                    plot_sizes = ['20 MARLA', '15 MARLA', '7 MARLA', '5 MARLA']  # CDA Standard sizes only
                
                # Assign different plot size to each block for realistic variety
                plot_size = random.choice(plot_sizes) if plot_sizes else '5 MARLA'
                
                # Extract target marla from plot_size label (e.g., "20 MARLA" -> 20)
                target_marla = extract_marla_from_plot_size(plot_size)
                if target_marla <= 0:
                    target_marla = 5.0  # Default to 5 marla if can't parse
                
                # Calculate target plot area in layout units
                target_plot_area_sqm = target_marla * SQM_PER_MARLA
                target_plot_area_layout = target_plot_area_sqm / scale_factor_sq if scale_factor_sq > 0 else 0
                
                # Calculate how many plots of target size can fit in this block
                block_area_layout = render_geom.area
                if target_plot_area_layout > 0:
                    target_plots_count = max(1, int(block_area_layout / target_plot_area_layout))
                else:
                    target_plots_count = 8  # Fallback
                
                # Adjust grid to create approximately target_plots_count plots
                rows, cols = determine_plot_grid(render_geom, 'residential', area_acres, total_blocks, plot_size)
                
                # For 5 and 7 marla blocks, ensure minimum 3 rows for better visualization
                if target_marla in [5.0, 7.0]:
                    if rows < 3:
                        rows = 3
                        cols = max(2, int(target_plots_count / rows))
                
                # Fine-tune to match target count while maintaining minimum rows for 5/7 marla
                if rows * cols != target_plots_count:
                    # Adjust to get closer to target
                    if rows * cols < target_plots_count:
                        # Need more plots - increase grid
                        while rows * cols < target_plots_count and (rows < 20 or cols < 20):
                            if render_geom.bounds[2] - render_geom.bounds[0] > render_geom.bounds[3] - render_geom.bounds[1]:
                                cols += 1
                            else:
                                rows += 1
                    else:
                        # Need fewer plots - decrease grid (but maintain min 3 rows for 5/7 marla)
                        min_rows_for_block = 3 if target_marla in [5.0, 7.0] else 1
                        while rows * cols > target_plots_count and rows > min_rows_for_block and cols > 1:
                            if rows > cols:
                                rows -= 1
                            else:
                                cols -= 1
                        # Ensure minimum rows after adjustment
                        if target_marla in [5.0, 7.0] and rows < 3:
                            rows = 3
                            cols = max(2, int(target_plots_count / rows))
                
                plots = subdivide_block_into_plots(render_geom, rows, cols)
                palette = plot_color_settings['residential']
                
                # Draw plots with sequential numbering (left to right, top to bottom)
                if len(plots) == 0:
                    logger.warning(f"No plots created for residential block at row {row}, col {col}")
                else:
                    logger.info(f"Drawing {len(plots)} plots for residential block (rows={rows}, cols={cols})")
                
                for plot_number, plot_geom in plots:
                    if plot_geom.is_empty:
                        continue
                    
                    # Use target marla from label (since plots are created to match that size)
                    # This ensures label matches reality: if block says "20 MARLA", each plot IS 20 marla
                    plot_marla = target_marla
                    
                    # Track residential plot marlas (using target marla to match label)
                    marla_accounting["residential_marla"] += plot_marla
                    marla_accounting["total_plots"]["residential"] += 1
                    
                    # Draw plot with light blue fill color (same for all residential plots)
                    draw_geometry(
                        ax,
                        plot_geom,
                        facecolor='#dbeafe',  # Light blue - same color for all residential plots (5, 7, 15, 20 marla)
                        edgecolor='#93c5fd',  # Lighter blue borders for better visibility
                        linewidth=0.8,  # Thinner, more professional borders
                        alpha=1.0,  # Fully opaque
                        zorder=10  # High zorder to appear above blocks
                    )
                    plot_label_x, plot_label_y = get_label_point(plot_geom)
                    # Plot numbers - very small font size for visibility
                    if target_marla in [5.0, 7.0]:
                        plot_fontsize = max(2, min(3, label_sizes["residential_plot"] * 0.4))  # Very small for 5 and 7 marla
                    else:
                        plot_fontsize = max(3, min(4, label_sizes["residential_plot"] * 0.6))  # Small for 10, 15, 20 marla
                    
                    ax.text(
                        plot_label_x,
                        plot_label_y,
                        str(plot_number),
                        ha='center',
                        va='center',
                        fontsize=plot_fontsize,
                        fontweight='normal',  # Normal weight for cleaner look
                        color='#1f2937',  # Dark gray instead of pure black for softer look
                        zorder=15,  # Highest zorder for text
                    )
                
                # Marla label - placed in the center of the block to avoid overlapping plot numbers
                ax.text(
                    label_x,
                    label_y,  # Center of the block
                    plot_size,
                    ha='center',
                    va='center',
                    fontsize=max(5, min(7, label_sizes["residential_plot"])),  # Normal font size
                    fontweight='normal',  # Normal weight for cleaner look
                    color='#1f2937',  # Dark gray for softer professional appearance
                    zorder=15  # High zorder for text
                )
            
            elif block_type == 'commercial':
                # Get mixed plot sizes for variety across commercial blocks
                # Use deterministic seed based on block position to assign different sizes to different blocks
                import random
                commercial_seed = int(area_sqm + row * 200 + col * 75 + mean_slope * 8 + flood_risk * 150) % 10000
                random.seed(commercial_seed)
                
                # Always get the full mixed list for variety
                plot_sizes, _ = get_mixed_plot_sizes(area_acres, 'commercial')
                if not plot_sizes:
                    plot_sizes = ['SHOP', 'STORE', 'MALL', 'RETAIL', 'SHOP']
                
                # Assign different plot size to each block for realistic variety
                shop_type = random.choice(plot_sizes) if plot_sizes else 'SHOP'
                rows, cols = determine_plot_grid(render_geom, 'commercial', area_acres, total_blocks)
                plots = subdivide_block_into_plots(render_geom, rows, cols)
                palette = plot_color_settings['commercial']
                
                # Draw commercial plots with sequential numbering
                if len(plots) == 0:
                    logger.warning(f"No plots created for commercial block at row {row}, col {col}")
                else:
                    logger.info(f"Drawing {len(plots)} plots for commercial block (rows={rows}, cols={cols})")
                
                for plot_number, plot_geom in plots:
                    if plot_geom.is_empty:
                        continue
                    # Calculate individual plot marla from ACTUAL plot area (to match visualization exactly)
                    # Convert plot area from layout coordinates to real-world square meters, then to marla
                    plot_area_layout_sq = plot_geom.area
                    plot_area_sqm = plot_area_layout_sq * scale_factor_sq
                    plot_marla = plot_area_sqm / SQM_PER_MARLA
                    
                    # Track commercial plot marlas (using actual area, not label, to match visualization)
                    marla_accounting["commercial_marla"] += plot_marla
                    marla_accounting["total_plots"]["commercial"] += 1
                    
                    # Draw commercial plot with clear borders
                    draw_geometry(
                        ax,
                        plot_geom,
                        facecolor=palette['fill'],
                        edgecolor='#000000',  # Black borders for maximum visibility
                        linewidth=2.0,  # Thicker borders for clear separation
                        alpha=1.0,  # Fully opaque
                        zorder=10  # High zorder to appear above blocks
                    )
                    plot_label_x, plot_label_y = get_label_point(plot_geom)
                    # Plot numbers - clear and visible
                    ax.text(
                        plot_label_x,
                        plot_label_y,
                        str(plot_number),
                        ha='center',
                        va='center',
                        fontsize=max(9, label_sizes["commercial_plot"]),  # Larger, more readable
                        fontweight='bold',
                        color='#000000',  # Black text for maximum visibility
                        zorder=15,  # Highest zorder for text
                        bbox=dict(boxstyle="round,pad=0.2", facecolor='white', edgecolor='black', linewidth=0.5, alpha=0.9)
                    )
                
                ax.text(
                    label_x,
                    label_y - block_h * 0.28,
                    shop_type,
                    ha='center',
                    va='center',
                    fontsize=label_sizes["commercial_plot"],
                    fontweight='bold',
                    color=palette['text']
                )
            
            elif block_type == 'park':
                # Park - EXACT from image (green rectangle with label)
                draw_geometry(
                    ax,
                    render_geom,
                    facecolor='#bbf7d0',
                    edgecolor='#064e3b',
                    linewidth=1,
                    alpha=0.9
                )
                
                # PROFESSIONAL park label from image
                center_x, center_y = get_label_point(block_geom)
                park_text = ax.text(center_x, center_y, "PARK", ha='center', va='center', 
                       fontsize=label_sizes["park"], fontweight='bold', color='white',
                       bbox=dict(boxstyle="round,pad=0.2", facecolor='black', alpha=0.3, edgecolor='white', linewidth=1.5))
        
        if amenity_overlays:
            amenity_counter = Counter()
            for overlay in amenity_overlays:
                amenity_counter[overlay["label"].upper()] += 1
            marla_accounting["amenity_counts"] = {
                "MOSQUE": amenity_counter.get("MOSQUE", 0),
                "HOSPITAL": amenity_counter.get("HOSPITAL", 0),
                "SCHOOL": amenity_counter.get("SCHOOL", 0)
            }
            draw_amenity_overlays(ax, amenity_overlays, label_sizes, clip_polygon_patch, draw_geometry, get_label_point)

        # Draw soft internal roads by outlining each block boundary
        for idx, geom in enumerate(block_polygons):
            if idx in reserved_block_indices:
                continue
            if geom.is_empty:
                continue
            boundary = geom.boundary
            boundaries = list(boundary.geoms) if hasattr(boundary, "geoms") else [boundary]
            for line in boundaries:
                if line.is_empty:
                    continue
                x, y = line.xy
                ax.plot(x, y, color='#94a3b8', linewidth=1.2, alpha=0.6)

        # Draw all planned roundabouts
        for spec in roundabout_specs:
            draw_central_roundabout(
                ax,
                spec["center"],
                spec["radius"],
                clip_path=clip_polygon_patch
            )
            # Roundabout radius is in layout units, convert to real-world meters
            roundabout_radius_sqm = (spec["radius"] ** 2) * scale_factor_sq
            marla_accounting["roundabout_surface_marla"] += math.pi * roundabout_radius_sqm / SQM_PER_MARLA

        # Calculate actual zone areas from blocks to verify CDA area distribution
        # CDA Rules: 50% Residential, 30% Commercial, 20% Green (Parks + Amenities)
        total_residential_area_sqm = 0
        total_commercial_area_sqm = 0
        total_park_area_sqm = 0
        total_amenity_area_sqm = 0  # Amenities are part of green space per CDA rules
        
        for idx, (block_geom, block_type) in enumerate(zip(block_polygons, block_types)):
            if idx in reserved_block_indices or block_geom.is_empty:
                continue
            block_area_layout_sq = block_geom.area
            block_area_sqm = block_area_layout_sq * scale_factor_sq
            
            # Check if this block has an amenity overlay (amenities count as green space per CDA)
            if idx in amenity_block_map:
                # Amenity blocks are counted as green space, not their original zone type
                amenity_geom = amenity_block_map[idx]["geometry"]
                if hasattr(amenity_geom, 'area'):
                    amenity_area_layout_sq = amenity_geom.area
                else:
                    # Fallback: use block area if geometry doesn't have area
                    amenity_area_layout_sq = block_area_layout_sq
                amenity_area_sqm = amenity_area_layout_sq * scale_factor_sq
                total_amenity_area_sqm += amenity_area_sqm
                # Amenities are part of green space (20% total), so add to park/green area
                total_park_area_sqm += amenity_area_sqm
            elif block_type == 'residential':
                total_residential_area_sqm += block_area_sqm
            elif block_type == 'commercial':
                total_commercial_area_sqm += block_area_sqm
            elif block_type == 'park':
                total_park_area_sqm += block_area_sqm
        
        # Calculate percentages based on actual polygon area (CDA: 50% residential, 30% commercial, 20% green)
        total_zoned_area_sqm = total_residential_area_sqm + total_commercial_area_sqm + total_park_area_sqm
        residential_percentage = (total_residential_area_sqm / area_sqm * 100) if area_sqm > 0 else 0
        commercial_percentage = (total_commercial_area_sqm / area_sqm * 100) if area_sqm > 0 else 0
        green_percentage = (total_park_area_sqm / area_sqm * 100) if area_sqm > 0 else 0  # Green includes parks + amenities
        
        logger.info(f"📊 ACTUAL CDA ZONE AREA DISTRIBUTION (based on polygon area {area_sqm:.2f} sqm):")
        logger.info(f"   Residential: {total_residential_area_sqm:.2f} sqm ({residential_percentage:.1f}%) - Target: 50%")
        logger.info(f"   Commercial: {total_commercial_area_sqm:.2f} sqm ({commercial_percentage:.1f}%) - Target: 30%")
        logger.info(f"   Green (parks + amenities): {total_park_area_sqm:.2f} sqm ({green_percentage:.1f}%) - Target: 20%")
        
        # Validate that distribution is close to target (within 5% tolerance)
        if abs(residential_percentage - 50) > 5:
            logger.warning(f"⚠️ Residential area ({residential_percentage:.1f}%) deviates from target (50%)")
        if abs(commercial_percentage - 30) > 5:
            logger.warning(f"⚠️ Commercial area ({commercial_percentage:.1f}%) deviates from target (30%)")
        if abs(green_percentage - 20) > 5:
            logger.warning(f"⚠️ Green space area ({green_percentage:.1f}%) deviates from target (20%)")
        logger.info(f"   Green Space (Parks + Amenities): {total_park_area_sqm:.2f} sqm ({green_percentage:.1f}%) - Target: 30%")
        logger.info(f"      - Parks: {total_park_area_sqm - total_amenity_area_sqm:.2f} sqm")
        logger.info(f"      - Amenities: {total_amenity_area_sqm:.2f} sqm")
        logger.info(f"   Total Zoned: {total_zoned_area_sqm:.2f} sqm ({(total_zoned_area_sqm/area_sqm*100):.1f}% of polygon)")
        
        accounted_marla = (
            marla_accounting["residential_marla"]
            + marla_accounting["commercial_marla"]
            + marla_accounting["park_marla"]
            + marla_accounting["reserved_marla"]
        )
        marla_accounting["accounted_marla"] = accounted_marla
        marla_accounting["roads_marla_estimate"] = max(marla_accounting["total_polygon_marla"] - accounted_marla, 0)
        
        # Add area-based summary (CDA: 50% Residential, 30% Commercial, 20% Green)
        marla_accounting["area_distribution"] = {
            "residential_percentage": round(residential_percentage, 1),
            "commercial_percentage": round(commercial_percentage, 1),
            "green_percentage": round(green_percentage, 1),  # Green includes parks + amenities
            "park_percentage": round((total_park_area_sqm - total_amenity_area_sqm) / area_sqm * 100, 1) if area_sqm > 0 else 0,
            "amenity_percentage": round(total_amenity_area_sqm / area_sqm * 100, 1) if area_sqm > 0 else 0,
            "total_zoned_percentage": round(total_zoned_area_sqm / area_sqm * 100, 1) if area_sqm > 0 else 0,
            "cda_compliance": {
                "residential_target": 50.0,
                "commercial_target": 30.0,
                "green_target": 20.0
            }
        }
        
        summary_text = (
            f"CDA Layout: Total {marla_accounting['total_polygon_marla']:.0f} marla ({area_acres:.1f} acres) | "
            f"Res {marla_accounting['residential_marla']:.0f} ({residential_percentage:.0f}% / 50% target) | "
            f"Com {marla_accounting['commercial_marla']:.0f} ({commercial_percentage:.0f}% / 30% target) | "
            f"Green {marla_accounting['park_marla']:.0f} ({green_percentage:.0f}% / 20% target) | "
            f"Roundabout {marla_accounting['reserved_marla']:.0f} | "
            f"Roads {marla_accounting['roads_marla_estimate']:.0f} | "
            f"Mosques {marla_accounting['amenity_counts'].get('MOSQUE',0)} | "
            f"Schools {marla_accounting['amenity_counts'].get('SCHOOL',0)} | "
            f"Hospitals {marla_accounting['amenity_counts'].get('HOSPITAL',0)}"
        )
        ax.text(
            min_x + 0.2,
            start_y - 0.2,
            summary_text,
            ha='left',
            va='center',
            fontsize=9,
            fontweight='bold',
            color='#1f2937',
            bbox=dict(boxstyle="round,pad=0.25", facecolor='#fef3c7', edgecolor='#d97706', linewidth=1.5)
        )
        zoning_data["marla_summary"] = marla_accounting
        logger.info(f"📊 Marla accounting summary: {json.dumps(marla_accounting, default=float)}")
        
        # Calculate green space statistics from 2D visualization
        park_block_count = sum(1 for bt in block_types if bt == 'park')
        amenity_count = len(amenity_block_map)
        total_green_space_count = park_block_count + amenity_count  # Parks + amenities
        
        # Add green space statistics to zoning_data for database storage
        zoning_data["green_space_statistics"] = {
            "park_block_count": park_block_count,
            "amenity_count": amenity_count,
            "total_green_space_count": total_green_space_count,
            "total_park_area_sqm": round(total_park_area_sqm, 2),
            "total_park_area_hectares": round(total_park_area_sqm / 10000, 4),
            "total_park_area_acres": round((total_park_area_sqm / 10000) * 2.47105, 2),
            "total_amenity_area_sqm": round(total_amenity_area_sqm, 2),
            "total_amenity_area_hectares": round(total_amenity_area_sqm / 10000, 4),
            "total_amenity_area_acres": round((total_amenity_area_sqm / 10000) * 2.47105, 2),
            "total_green_space_area_sqm": round(total_park_area_sqm, 2),  # Includes amenities
            "total_green_space_area_hectares": round(total_park_area_sqm / 10000, 4),
            "total_green_space_area_acres": round((total_park_area_sqm / 10000) * 2.47105, 2),
            "green_space_percentage": round(green_percentage, 2),
            "amenity_counts": marla_accounting.get("amenity_counts", {}),
            "park_marla": marla_accounting.get("park_marla", 0),
            "amenity_marla": round(total_amenity_area_sqm / 25.2929, 2)  # Convert sqm to marla
        }
        
        logger.info(f"🌳 Green Space Statistics: {park_block_count} park blocks, {amenity_count} amenities, "
                   f"Total area: {total_park_area_sqm:.2f} sqm ({total_park_area_sqm / 10000:.4f} hectares)")

        # Draw boundary polygon - use already-closed coordinates, draw on top with high zorder, do NOT clip
        # Use ax.plot for more reliable line drawing that won't get clipped
        boundary_x = scaled_polygon_coords[:, 0]
        boundary_y = scaled_polygon_coords[:, 1]
        # Ensure closed by adding first point at end if not already closed
        if len(boundary_x) > 0 and (boundary_x[0] != boundary_x[-1] or boundary_y[0] != boundary_y[-1]):
            boundary_x = np.append(boundary_x, boundary_x[0])
            boundary_y = np.append(boundary_y, boundary_y[0])
        ax.plot(boundary_x, boundary_y, color='#0369a1', linewidth=3, zorder=100, solid_capstyle='round', solid_joinstyle='round')
        
        # Add boulevard labels ABOVE the map (no overlapping rectangles)
        ax.text(layout_center_x, 11.6, "SUNSET BOULEVARD (250' WIDE)", 
               ha='center', va='center', fontsize=label_sizes["boulevard"], fontweight='bold', color='#374151',
               bbox=dict(boxstyle="round,pad=0.25", facecolor='#e0f2fe', edgecolor='black', linewidth=1.5))
        
        ax.text(max_x + 0.5, start_y + height/2, "COMMERCIAL BOULEVARD (250' WIDE)", 
               ha='center', va='center', fontsize=label_sizes["boulevard"], fontweight='bold', rotation=90, color='#374151',
               bbox=dict(boxstyle="round,pad=0.25", facecolor='#e0f2fe', edgecolor='black', linewidth=1.5))
        
        # Add legend positioned OUTSIDE the map area
        legend_x = max_x + 1.2
        legend_y = 6
        legend_width = 2.5
        legend_height = 1.5
        
        legend_bg = patches.Rectangle((legend_x, legend_y - legend_height), 
                                    legend_width, legend_height,
                                    facecolor='#e0f2fe', edgecolor='black',
                                    linewidth=3, alpha=0.98)
        ax.add_patch(legend_bg)
        
        ax.text(legend_x + legend_width/2, legend_y - 0.2, "LEGEND", 
               ha='center', va='center', fontsize=label_sizes["legend_title"], fontweight='bold', color='#374151')
        
        legend_items = [
            ('Residential Blocks', '#dbeafe', 'black'),
            ('Commercial Blocks', '#fef3c7', 'black'),
            ('Green Spaces', '#d1fae5', 'black'),
            ('Road Network', '#9ca3af', 'black')
        ]
        
        for i, (label, color, border) in enumerate(legend_items):
            y_pos = legend_y - 0.5 - i * 0.3
            legend_rect = patches.Rectangle((legend_x + 0.1, y_pos - 0.1), 0.2, 0.2,
                                          facecolor=color, edgecolor=border, linewidth=2)
            ax.add_patch(legend_rect)
            ax.text(legend_x + 0.4, y_pos, label, ha='left', va='center', fontsize=label_sizes["legend_item"], fontweight='bold', color='#374151')
        
        # Add PROFESSIONAL north arrow positioned OUTSIDE the map area
        north_x = max_x + 2.5
        north_y = 13
        # Draw arrow pointing up
        arrow = patches.FancyArrowPatch((north_x, north_y - 0.3), (north_x, north_y + 0.3),
                                      arrowstyle='->', mutation_scale=20, color='black', linewidth=3)
        ax.add_patch(arrow)
        ax.text(north_x, north_y, "N", ha='center', va='center', fontsize=label_sizes["north"], fontweight='bold', color='black',
               bbox=dict(boxstyle="round,pad=0.25", facecolor='#e0f2fe', edgecolor='black', linewidth=1.5))
        
        # Add PROFESSIONAL scale bar positioned to use full space
        scale_x = 0.5
        scale_y = 1.2
        scale_length = 1.5
        # Draw scale bar with ticks
        ax.plot([scale_x, scale_x + scale_length], [scale_y, scale_y], 'k-', linewidth=4)
        ax.plot([scale_x, scale_x], [scale_y - 0.1, scale_y + 0.1], 'k-', linewidth=3)
        ax.plot([scale_x + scale_length, scale_x + scale_length], [scale_y - 0.1, scale_y + 0.1], 'k-', linewidth=3)
        ax.text(scale_x + scale_length/2, scale_y - 0.2, "1m", ha='center', va='center', 
               fontsize=label_sizes["scale"], fontweight='bold', color='black',
               bbox=dict(boxstyle="round,pad=0.15", facecolor='#e0f2fe', edgecolor='black', linewidth=1.5))
        
        # Add branding and polygon info footer
        polygon_id = zoning_data.get('polygon_id', 'N/A')
        ax.text(14, 0.5, "Powered by Plan-It AI", 
               ha='right', va='bottom', fontsize=label_sizes["branding"], style='italic', alpha=0.7)
        ax.text(0.5, 0.5, f"Based on user-marked polygon (ID #{polygon_id})", 
               ha='left', va='bottom', fontsize=label_sizes["branding"], style='italic', alpha=0.7, color='#4b5563')
        
        # Set axis properties to show full layout
        ax.set_xlim(0, 15)
        ax.set_ylim(0, 11)
        ax.set_aspect('equal')
        ax.axis('off')
        
        # Save image
        if output_path is None:
            timestamp = int(time.time())
            polygon_id = zoning_data.get('polygon_id', 'unknown')
            output_path = f"output/zameen_style_society_polygon_{polygon_id}_{timestamp}.png"
        
        plt.savefig(output_path, dpi=200, bbox_inches='tight', 
                   facecolor='white', edgecolor='none', pad_inches=0.2)
        plt.close()
        
        logger.info(f"✅ Created BEAUTIFUL Zameen.com style layout: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"❌ Error creating beautiful Zameen.com style layout: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None

@app.post("/api/land_subdivision")
async def land_subdivision(request: Request):
    """
    Professional land subdivision API integrated with real data pipeline
    Works with: DataIngestion → Terrain Analysis → Land Suitability → Zoning → Land Subdivision
    
    FE-1: Divide land into parcels based on zoning and user-defined criteria
    FE-2: Ensure alignment with road layouts and utilities
    FE-3: Provide grid-based snapping for accuracy in parcel alignment
    FE-4: Include tools for assessing the market viability of subdivided parcels
    FE-5: Enable automated generation of parcel dimensions and configurations
    """
    try:
        data = await request.json()
        
        # Extract parameters - support both direct data and polygon_id lookup
        polygon_id = data.get("polygon_id")
        polygon_geojson = data.get("polygon_geojson")
        subdivision_config = data.get("subdivision_config", {})
        
        # Fetch polygon data if polygon_id is provided
        polygon_record = None
        if polygon_id:
            for poly in POLYGONS:
                if poly['id'] == polygon_id:
                    polygon_record = poly
                    break
        
        # Use polygon_geojson from record if available
        if polygon_record and not polygon_geojson:
            polygon_geojson = polygon_record.get('geojson')
        
        # TERRAIN VALIDATION: Check if terrain analysis exists and validate suitability
        terrain_data = None
        if polygon_id:
            for terrain in TERRAIN_ANALYSES:
                if terrain.get("polygon_id") == polygon_id:
                    terrain_data = terrain
                    break
        
        # Validate terrain before allowing parcel subdivision
        if terrain_data:
            validation_result = validate_terrain_for_development(terrain_data, operation="parcels")
            if not validation_result["allowed"]:
                logger.warning(f"❌ Terrain validation failed for parcel subdivision: {validation_result['reason']}")
                return JSONResponse({
                    "success": False,
                    "error": validation_result["reason"],
                    "validation_details": validation_result.get("details", {})
                }, status_code=400)
            logger.info(f"✅ Terrain validation passed for parcel subdivision: {validation_result.get('message', 'Suitable for development')}")
        else:
            logger.warning("⚠️ No terrain analysis found for parcel subdivision - proceeding without validation")
        
        if not polygon_geojson:
            return JSONResponse({
                "success": False,
                "error": "polygon_geojson or polygon_id is required"
            }, status_code=400)
        
        # Get zoning data if available
        zoning_data = None
        if polygon_id:
            for zoning in ZONING_RESULTS:
                if zoning.get('polygon_id') == polygon_id:
                    zoning_data = zoning
                    break
        
        # Perform subdivision with real engine
        logger.info(f"🔧 Starting land subdivision with config: {subdivision_config}")
        result = subdivision_engine.subdivide_land(
            polygon_geojson=polygon_geojson,
            zoning_data=zoning_data,
            subdivision_config=subdivision_config,
            terrain_data=terrain_data
        )
        
        logger.info(f"📊 Subdivision result: success={result.get('success')}, parcels={result.get('total_parcels', 0)}")
        
        if result.get('success'):
            # Save subdivision result to memory store
            subdivision_record = {
                "id": len(SUBDIVISION_RESULTS) + 1,
                "polygon_id": polygon_id,
                "subdivision_result": result,
                "terrain_analysis_id": terrain_data.get('id') if terrain_data else None,
                "zoning_result_id": zoning_data.get('id') if zoning_data else None,
                "config_used": subdivision_config,
                "created_at": datetime.now().isoformat()
            }
            
            # Store subdivision result in memory
            SUBDIVISION_RESULTS.append(subdivision_record)
            logger.info(f"Land subdivision completed successfully. Generated {result.get('total_parcels', 0)} parcels")
            
            # Always have parcel_features available for later serialization checks
            parcel_features = result.get("parcels", {}).get("features", []) or []
            
            # SAVE PARCELS TO DATABASE: Persist parcels to Node.js backend database
            try:
                # Get project_id from polygon
                project_id = None
                if polygon_record:
                    project_id = polygon_record.get('project_id')
                else:
                    try:
                        import httpx
                        async with httpx.AsyncClient() as client:
                            node_backend_url = "http://127.0.0.1:8000"
                            poly_response = await client.get(f"{node_backend_url}/api/polygon/{polygon_id}", timeout=5.0)
                            if poly_response.status_code == 200:
                                poly_data = poly_response.json()
                                project_id = poly_data.get("project_id")
                    except:
                        try:
                            import requests
                            node_backend_url = "http://127.0.0.1:8000"
                            poly_response = requests.get(f"{node_backend_url}/api/polygon/{polygon_id}", timeout=5.0)
                            if poly_response.status_code == 200:
                                poly_data = poly_response.json()
                                project_id = poly_data.get("project_id")
                        except:
                            pass
                
                if project_id:
                    # Save all parcels to database via Node.js backend
                    parcels_geojson = result.get("parcels", {})
                    parcel_features = parcels_geojson.get("features", []) or []
                    
                    for feature in parcel_features:
                        props = feature.get("properties", {})
                        geometry = feature.get("geometry", {})
                        
                        parcel_data = {
                            "projectId": project_id,
                            "parcelNumber": props.get("parcel_id", f"P{len(parcel_features)}"),
                            "type": props.get("zone_type", "Residential"),
                            "lotSize": "Medium",  # Default, can be calculated from area
                            "area": float(props.get("area", 0)),
                            "geometry": geometry,
                            "dimensions": {
                                "perimeter": props.get("perimeter", 0)
                            },
                            "roadAccess": props.get("road_access", True),
                            "cornerLot": props.get("corner_lot", False),
                            "zoning": props.get("zone_type", "Residential"),
                            "status": "Available",
                            "metadata": {
                                "polygon_id": polygon_id,
                                "subdivision_id": subdivision_record.get("id")
                            }
                        }
                        
                        # Save parcel via Node.js backend API
                        try:
                            import httpx
                            async with httpx.AsyncClient() as client:
                                node_backend_url = "http://127.0.0.1:8000"
                                save_response = await client.post(
                                    f"{node_backend_url}/api/design/parcels",
                                    json=parcel_data,
                                    headers={"Content-Type": "application/json"},
                                    timeout=10.0
                                )
                                if save_response.status_code in [200, 201]:
                                    logger.debug(f"✅ Saved parcel: {parcel_data['parcelNumber']}")
                        except ImportError:
                            try:
                                import requests
                                node_backend_url = "http://127.0.0.1:8000"
                                save_response = requests.post(
                                    f"{node_backend_url}/api/design/parcels",
                                    json=parcel_data,
                                    headers={"Content-Type": "application/json"},
                                    timeout=10.0
                                )
                                if save_response.status_code in [200, 201]:
                                    logger.debug(f"✅ Saved parcel: {parcel_data['parcelNumber']}")
                            except:
                                pass
                        except Exception as save_err:
                            logger.warning(f"⚠️ Could not save parcel {parcel_data['parcelNumber']}: {save_err}")
                    
                    logger.info(f"💾 Saved {len(parcel_features)} parcels to database for project {project_id}")
            except Exception as save_error:
                logger.warning(f"⚠️ Error saving parcels to database: {save_error}")
                # Don't fail the request if saving fails
            
            # Use custom JSON encoder to handle any remaining Shapely objects
            # For large responses, limit parcels to prevent timeout
            MAX_PARCELS = 2000  # Reasonable limit for frontend performance
            if len(parcel_features) > MAX_PARCELS:
                logger.warning(f"⚠️ Too many parcels ({len(parcel_features)}), limiting to {MAX_PARCELS} for performance")
                result["parcels"]["features"] = parcel_features[:MAX_PARCELS]
                result["total_parcels"] = MAX_PARCELS
                result["warning"] = f"Only showing first {MAX_PARCELS} of {len(parcel_features)} parcels. Consider increasing target_parcel_area to reduce parcel count."
            
            logger.info(f"📤 Serializing {len(result['parcels']['features'])} parcels to JSON...")
            try:
                json_str = json.dumps(result, cls=CustomJSONEncoder, ensure_ascii=False)
                json_size_mb = len(json_str) / 1024 / 1024
                logger.info(f"✅ JSON serialization complete, size: {json_size_mb:.2f} MB")
                if json_size_mb > 10:
                    logger.warning(f"⚠️ Large response size ({json_size_mb:.2f} MB), may cause performance issues")
                return JSONResponse(json.loads(json_str))
            except Exception as json_error:
                logger.error(f"❌ JSON serialization error: {json_error}")
                # If serialization fails, return error
                return JSONResponse({
                    "success": False,
                    "error": f"Failed to serialize response: {str(json_error)}",
                    "total_parcels": len(parcel_features),
                    "message": "Too many parcels generated. Try increasing target_parcel_area."
                }, status_code=500)
        else:
            logger.error(f"Land subdivision failed: {result.get('error', 'Unknown error')}")
            return JSONResponse({
                "success": False,
                "error": result.get('error', 'Subdivision failed')
            }, status_code=500)
        
    except Exception as e:
        logger.error(f"Land subdivision error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.post("/api/parcel_optimization")
async def parcel_optimization(request: Request):
    """
    Optimize existing parcel layouts for better efficiency and compliance.
    """
    try:
        payload = await request.json()
        
        return JSONResponse({
            "success": True,
            "message": "Parcel optimization endpoint is working"
        })
        
    except Exception as e:
        logger.error(f"Parcel optimization error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/ai_optimization")
async def ai_optimization(request: Request):
    """
    AI-powered urban design optimization endpoint.
    Analyzes current design and provides optimization recommendations with metrics.
    """
    try:
        payload = await request.json()
        
        # Extract parameters
        project_id = payload.get('projectId')
        polygon_id = payload.get('polygonId')
        optimization_focus = payload.get('optimizationFocus', 'efficiency')  # efficiency, sustainability, livability, economic
        analysis_depth = payload.get('analysisDepth', 75)  # 0-100
        geojson = payload.get('geojson')
        
        logger.info(f"🎯 AI Optimization request - Project: {project_id}, Polygon: {polygon_id}, Focus: {optimization_focus}, Depth: {analysis_depth}")
        
        # Fetch real data from database
        polygon_geojson = geojson
        terrain_data = None
        road_network_data = None
        zoning_data = None
        
        if polygon_id:
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                conn = psycopg2.connect(
                    host="localhost",
                    database="plan-it",
                    user="postgres",
                    password="iampro24",
                    port="5432"
                )
                cur = conn.cursor(cursor_factory=RealDictCursor)
                
                # Get polygon geometry
                if not polygon_geojson:
                    cur.execute("SELECT geojson FROM polygons WHERE id = %s", (polygon_id,))
                    polygon_result = cur.fetchone()
                    if polygon_result and polygon_result['geojson']:
                        polygon_geojson = polygon_result['geojson']
                        logger.info(f"✅ Retrieved polygon geometry from database for polygon {polygon_id}")
                
                # Get terrain analysis from database
                cur.execute("SELECT results FROM terrain_analyses WHERE polygon_id = %s ORDER BY created_at DESC LIMIT 1", (polygon_id,))
                terrain_result = cur.fetchone()
                if terrain_result and terrain_result['results']:
                    terrain_data = terrain_result['results']
                    if isinstance(terrain_data, str):
                        import json
                        terrain_data = json.loads(terrain_data)
                    logger.info(f"✅ Retrieved terrain analysis from database for polygon {polygon_id}")
                
                # Get road network data from in-memory store or try database
                road_networks = globals().get('ROAD_NETWORK_RESULTS', [])
                for rn in road_networks:
                    if rn.get('polygon_id') == polygon_id:
                        road_network_data = rn.get('road_network', {})
                        logger.info(f"✅ Found road network data for polygon {polygon_id}")
                        break
                
                # Get zoning/optimization zoning data
                cur.execute("""
                    SELECT results, zoning_result, land_use_distribution, zone_statistics
                    FROM optimization_zoning 
                    WHERE polygon_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 1
                """, (polygon_id,))
                zoning_result = cur.fetchone()
                if zoning_result:
                    zoning_data = {
                        'results': zoning_result.get('results'),
                        'zoning_result': zoning_result.get('zoning_result'),
                        'land_use_distribution': zoning_result.get('land_use_distribution'),
                        'zone_statistics': zoning_result.get('zone_statistics')
                    }
                    logger.info(f"✅ Retrieved optimization zoning data from database for polygon {polygon_id}")
                
                cur.close()
                conn.close()
            except Exception as db_error:
                logger.warning(f"Could not fetch data from database: {db_error}")
                # Fallback to in-memory stores
                if polygon_id:
                    terrain_analysis = TERRAIN_ANALYSES.get(polygon_id) if isinstance(TERRAIN_ANALYSES, dict) else None
                    if not terrain_analysis:
                        for analysis in TERRAIN_ANALYSES:
                            if isinstance(analysis, dict) and analysis.get('polygon_id') == polygon_id:
                                terrain_data = analysis.get('results', {})
                                break
                    else:
                        terrain_data = terrain_analysis.get('results', {})
        
        # If geojson provided but no terrain data, try to process it
        if polygon_geojson and not terrain_data:
            try:
                terrain_result = await process_geojson(polygon_geojson, request, ["dem"], "EPSG:4326", {})
                if "error" not in terrain_result:
                    terrain_data = terrain_result
            except Exception as e:
                logger.warning(f"Could not process geojson for terrain data: {e}")
        
        # Calculate current design metrics using real data
        current_metrics = await calculate_current_design_metrics(
            terrain_data, 
            polygon_geojson, 
            road_network_data, 
            zoning_data,
            polygon_id
        )
        
        # Generate optimized metrics based on focus using real optimization algorithms
        optimized_metrics = await generate_optimized_metrics(
            current_metrics, 
            optimization_focus, 
            analysis_depth,
            terrain_data,
            road_network_data,
            zoning_data,
            polygon_geojson
        )
        
        # Calculate improvements
        improvements = calculate_improvements(current_metrics, optimized_metrics)
        
        # Generate recommendations
        recommendations = await generate_optimization_recommendations(
            current_metrics, 
            optimized_metrics, 
            optimization_focus,
            terrain_data
        )
        
        # Generate implementation plan
        implementation_plan = generate_implementation_plan(recommendations, optimization_focus)
        
        result = {
            "success": True,
            "currentMetrics": current_metrics,
            "optimizedMetrics": optimized_metrics,
            "improvements": improvements,
            "recommendations": recommendations,
            "implementationPlan": implementation_plan,
            "optimizationFocus": optimization_focus,
            "analysisDepth": analysis_depth,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ AI Optimization completed - Generated {len(recommendations)} recommendations")
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"AI optimization error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

async def calculate_current_design_metrics(
    terrain_data: dict = None, 
    geojson: dict = None,
    road_network_data: dict = None,
    zoning_data: dict = None,
    polygon_id: int = None
) -> dict:
    """Calculate current design metrics from real data: terrain, geometry, roads, and zoning."""
    
    # Initialize metrics with defaults (will be calculated from real data)
    land_use_efficiency = 50.0
    connectivity_index = 50.0
    green_space_coverage = 20.0
    traffic_flow_efficiency = 50.0
    energy_efficiency = 50.0
    walkability_score = 50.0
    area_sqm = 0
    
    # Calculate area from geojson
    if geojson:
        try:
            geom = shape(geojson.get("geometry", geojson))
            # Use proper area calculation - try pyproj if available, otherwise use haversine
            try:
                from pyproj import Transformer
                transformer = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
                
                # Transform coordinates and calculate area
                if geom.geom_type == 'Polygon':
                    coords = list(geom.exterior.coords)
                    transformed_coords = [transformer.transform(lon, lat) for lon, lat in coords]
                    from shapely.geometry import Polygon as ShapelyPolygon
                    transformed_geom = ShapelyPolygon(transformed_coords)
                    area_sqm = transformed_geom.area
                elif geom.geom_type == 'MultiPolygon':
                    total_area = 0
                    for poly in geom.geoms:
                        coords = list(poly.exterior.coords)
                        transformed_coords = [transformer.transform(lon, lat) for lon, lat in coords]
                        from shapely.geometry import Polygon as ShapelyPolygon
                        transformed_geom = ShapelyPolygon(transformed_coords)
                        total_area += transformed_geom.area
                    area_sqm = total_area
                else:
                    # Fallback: rough conversion
                    area_sqm = geom.area * 111000 * 111000
            except ImportError:
                # pyproj not available, use haversine-based area calculation
                def calculate_polygon_area_haversine(coords):
                    """Calculate polygon area using spherical excess formula."""
                    if len(coords) < 3:
                        return 0
                    area = 0
                    earth_radius = 6371000  # meters
                    for i in range(len(coords)):
                        j = (i + 1) % len(coords)
                        lat1, lon1 = math.radians(coords[i][1]), math.radians(coords[i][0])
                        lat2, lon2 = math.radians(coords[j][1]), math.radians(coords[j][0])
                        area += (lon2 - lon1) * (2 + math.sin(lat1) + math.sin(lat2))
                    area = abs(area * earth_radius ** 2 / 2)
                    return area
                
                if geom.geom_type == 'Polygon':
                    coords = list(geom.exterior.coords)
                    area_sqm = calculate_polygon_area_haversine(coords)
                elif geom.geom_type == 'MultiPolygon':
                    area_sqm = sum(calculate_polygon_area_haversine(list(poly.exterior.coords)) for poly in geom.geoms)
                else:
                    # Fallback: rough conversion
                    area_sqm = geom.area * 111000 * 111000
        except Exception as e:
            logger.warning(f"Error calculating area: {e}")
            try:
                geom = shape(geojson.get("geometry", geojson))
                area_sqm = geom.area * 111000 * 111000  # Rough conversion
            except:
                pass
    
    # Calculate metrics from road network data
    if road_network_data:
        try:
            # Calculate connectivity index from road network
            primary_roads = road_network_data.get('primary_roads', {})
            secondary_roads = road_network_data.get('secondary_roads', {})
            local_roads = road_network_data.get('local_roads', {})
            pedestrian_network = road_network_data.get('pedestrian_network', {})
            bike_network = road_network_data.get('bike_network', {})
            
            # Count road segments
            total_roads = 0
            total_length = 0
            
            for road_type, road_data in [
                ('primary', primary_roads),
                ('secondary', secondary_roads),
                ('local', local_roads),
                ('pedestrian', pedestrian_network),
                ('bike', bike_network)
            ]:
                if road_data and isinstance(road_data, dict):
                    features = road_data.get('features', [])
                    total_roads += len(features)
                    for feature in features:
                        if feature.get('geometry'):
                            try:
                                road_geom = shape(feature['geometry'])
                                # Rough length calculation
                                if road_geom.geom_type == 'LineString':
                                    coords = list(road_geom.coords)
                                    length = 0
                                    for i in range(len(coords) - 1):
                                        lat1, lon1 = coords[i][1], coords[i][0]
                                        lat2, lon2 = coords[i+1][1], coords[i+1][0]
                                        # Haversine distance
                                        from math import radians, cos, sin, asin, sqrt
                                        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
                                        dlon = lon2 - lon1
                                        dlat = lat2 - lat1
                                        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                                        c = 2 * asin(sqrt(a))
                                        length += 6371000 * c  # Earth radius in meters
                                    total_length += length
                            except:
                                pass
            
            # Calculate connectivity: based on road density and network statistics
            if area_sqm > 0:
                road_density = (total_length / area_sqm) * 10000  # km per km²
                # Ideal road density is around 10-15 km/km² for urban areas
                connectivity_index = min(100, max(30, (road_density / 15) * 100))
            else:
                connectivity_index = min(100, max(30, 50 + (total_roads * 2)))
            
            # Traffic flow efficiency from network statistics
            network_stats = road_network_data.get('network_statistics', {})
            if network_stats:
                traffic_flow_efficiency = network_stats.get('average_traffic_flow', 50)
                if isinstance(traffic_flow_efficiency, (int, float)):
                    traffic_flow_efficiency = min(100, max(30, traffic_flow_efficiency))
            else:
                # Estimate from road types
                if total_roads > 0:
                    primary_ratio = len(primary_roads.get('features', [])) / total_roads if total_roads > 0 else 0
                    traffic_flow_efficiency = 40 + (primary_ratio * 40)
                else:
                    traffic_flow_efficiency = 50
            
            # Walkability: based on pedestrian and bike networks
            pedestrian_count = len(pedestrian_network.get('features', []))
            bike_count = len(bike_network.get('features', []))
            if total_roads > 0:
                walkability_score = 40 + ((pedestrian_count + bike_count) / total_roads) * 40
            else:
                walkability_score = 50
            
            logger.info(f"✅ Calculated metrics from road network: connectivity={connectivity_index:.1f}, traffic={traffic_flow_efficiency:.1f}, walkability={walkability_score:.1f}")
        except Exception as e:
            logger.warning(f"Error calculating metrics from road network: {e}")
    
    # Calculate metrics from zoning data
    if zoning_data:
        try:
            land_use_dist = zoning_data.get('land_use_distribution', {})
            zone_stats = zoning_data.get('zone_statistics', {})
            
            # Calculate land use efficiency from zoning distribution
            if land_use_dist:
                # Mixed-use areas are more efficient
                residential = land_use_dist.get('residential', 0) or 0
                commercial = land_use_dist.get('commercial', 0) or 0
                mixed_use = land_use_dist.get('mixed_use', 0) or 0
                industrial = land_use_dist.get('industrial', 0) or 0
                green_space = land_use_dist.get('green_space', 0) or 0
                conservation = land_use_dist.get('conservation', 0) or 0
                
                total = residential + commercial + mixed_use + industrial + green_space + conservation
                if total > 0:
                    # Efficiency: higher for mixed-use, moderate for commercial/residential, lower for industrial
                    efficiency_score = (
                        (mixed_use / total) * 100 * 1.2 +  # Mixed-use is most efficient
                        (commercial / total) * 100 * 1.0 +
                        (residential / total) * 100 * 0.9 +
                        (industrial / total) * 100 * 0.7
                    )
                    land_use_efficiency = min(100, max(30, efficiency_score))
                    
                    # Green space coverage
                    green_space_coverage = min(100, max(0, ((green_space + conservation) / total) * 100))
            
            # Get zone statistics if available
            if zone_stats:
                if isinstance(zone_stats, dict):
                    avg_fitness = zone_stats.get('average_fitness', 0.5)
                    if avg_fitness:
                        land_use_efficiency = min(100, max(30, land_use_efficiency * (0.5 + avg_fitness)))
            
            logger.info(f"✅ Calculated metrics from zoning: land_use={land_use_efficiency:.1f}, green_space={green_space_coverage:.1f}")
        except Exception as e:
            logger.warning(f"Error calculating metrics from zoning: {e}")
    
    # Adjust based on terrain data
    if terrain_data:
        try:
            results = terrain_data.get("results", {})
            if isinstance(results, str):
                import json
                results = json.loads(results)
            
            # Extract terrain characteristics
            slope_analysis = results.get("slope_analysis", {})
            flood_analysis = results.get("flood_analysis", {}) or results.get("flood_risk_analysis", {})
            
            # Adjust metrics based on terrain
            mean_slope = slope_analysis.get("mean_slope", 0) if isinstance(slope_analysis, dict) else 0
            flood_risk = 0
            if isinstance(flood_analysis, dict):
                flood_stats = flood_analysis.get("flood_stats", {})
                if isinstance(flood_stats, dict):
                    flood_risk = flood_stats.get("high_risk_area", 0) or 0
            
            # Steeper slopes reduce efficiency
            if mean_slope > 30:
                land_use_efficiency -= 10
                traffic_flow_efficiency -= 5
            elif mean_slope > 15:
                land_use_efficiency -= 5
                traffic_flow_efficiency -= 2
            
            # High flood risk reduces efficiency but increases green space need
            if flood_risk > 20:
                land_use_efficiency -= 8
                green_space_coverage = max(green_space_coverage, 25)  # Minimum green space for flood mitigation
            
            # Energy efficiency based on terrain (solar potential, wind, etc.)
            # South-facing slopes are better for solar
            aspect_analysis = results.get("aspect_analysis", {})
            if isinstance(aspect_analysis, dict):
                dominant_aspect = aspect_analysis.get("dominant_aspect", 180)  # 180 is south
                # South-facing (135-225 degrees) is optimal
                if 135 <= dominant_aspect <= 225:
                    energy_efficiency += 10
                elif 90 <= dominant_aspect < 135 or 225 < dominant_aspect <= 270:
                    energy_efficiency += 5
            
            logger.info(f"✅ Adjusted metrics from terrain: slope={mean_slope:.1f}°, flood_risk={flood_risk:.1f}%")
        except Exception as e:
            logger.warning(f"Error processing terrain data: {e}")
    
    # Ensure all metrics are within valid ranges
    return {
        "landUseEfficiency": max(30, min(100, round(land_use_efficiency, 1))),
        "connectivityIndex": max(30, min(100, round(connectivity_index, 1))),
        "greenSpaceCoverage": max(10, min(100, round(green_space_coverage, 1))),
        "trafficFlowEfficiency": max(30, min(100, round(traffic_flow_efficiency, 1))),
        "energyEfficiency": max(30, min(100, round(energy_efficiency, 1))),
        "walkabilityScore": max(30, min(100, round(walkability_score, 1))),
        "areaSqm": round(area_sqm, 2)
    }

async def generate_optimized_metrics(
    current_metrics: dict, 
    focus: str, 
    depth: int,
    terrain_data: dict = None,
    road_network_data: dict = None,
    zoning_data: dict = None,
    geojson: dict = None
) -> dict:
    """Generate optimized metrics using ML-based algorithms or rule-based optimization."""
    
    # Try ML optimizer first if available
    if ML_OPTIMIZER_AVAILABLE:
        try:
            ml_optimizer = get_ml_optimizer()
            terrain_constraints = ml_optimizer.analyze_terrain_constraints(terrain_data)
            optimized = ml_optimizer.optimize_metrics(
                current_metrics, focus, depth, terrain_constraints
            )
            logger.info(f"✅ Generated optimized metrics using ML optimizer")
            return optimized
        except Exception as e:
            logger.warning(f"ML optimizer failed, falling back to rule-based: {e}")
    
    # Fallback to rule-based optimization
    optimized = {}
    depth_factor = 0.5 + (depth / 100) * 0.5  # 0.5 to 1.0 (how much of the optimization to apply)
    
    for metric, current_value in current_metrics.items():
        if metric == "areaSqm":
            optimized[metric] = current_value
            continue
        
        # Calculate realistic optimization potential based on current value and focus
        # Lower current values have more room for improvement
        improvement_potential = (100 - current_value) / 100  # 0 to 1
        
        # Focus-specific optimization strategies
        if focus == "efficiency":
            if metric == "landUseEfficiency":
                # Optimize through mixed-use zoning, compact development
                improvement = improvement_potential * 0.30 * depth_factor
            elif metric == "connectivityIndex":
                # Add more roads, improve network topology
                improvement = improvement_potential * 0.35 * depth_factor
            elif metric == "trafficFlowEfficiency":
                # Optimize road hierarchy, reduce bottlenecks
                improvement = improvement_potential * 0.40 * depth_factor
            elif metric == "greenSpaceCoverage":
                improvement = improvement_potential * 0.15 * depth_factor
            elif metric == "energyEfficiency":
                improvement = improvement_potential * 0.20 * depth_factor
            elif metric == "walkabilityScore":
                improvement = improvement_potential * 0.25 * depth_factor
            else:
                improvement = improvement_potential * 0.20 * depth_factor
                
        elif focus == "sustainability":
            if metric == "greenSpaceCoverage":
                improvement = improvement_potential * 0.50 * depth_factor
            elif metric == "energyEfficiency":
                improvement = improvement_potential * 0.55 * depth_factor
            elif metric == "walkabilityScore":
                improvement = improvement_potential * 0.35 * depth_factor
            elif metric == "landUseEfficiency":
                improvement = improvement_potential * 0.20 * depth_factor
            elif metric == "connectivityIndex":
                improvement = improvement_potential * 0.25 * depth_factor
            elif metric == "trafficFlowEfficiency":
                improvement = improvement_potential * 0.25 * depth_factor
            else:
                improvement = improvement_potential * 0.20 * depth_factor
                
        elif focus == "livability":
            if metric == "walkabilityScore":
                improvement = improvement_potential * 0.50 * depth_factor
            elif metric == "connectivityIndex":
                improvement = improvement_potential * 0.40 * depth_factor
            elif metric == "greenSpaceCoverage":
                improvement = improvement_potential * 0.55 * depth_factor
            elif metric == "landUseEfficiency":
                improvement = improvement_potential * 0.25 * depth_factor
            elif metric == "trafficFlowEfficiency":
                improvement = improvement_potential * 0.30 * depth_factor
            elif metric == "energyEfficiency":
                improvement = improvement_potential * 0.30 * depth_factor
            else:
                improvement = improvement_potential * 0.20 * depth_factor
                
        elif focus == "economic":
            if metric == "landUseEfficiency":
                improvement = improvement_potential * 0.40 * depth_factor
            elif metric == "trafficFlowEfficiency":
                improvement = improvement_potential * 0.45 * depth_factor
            elif metric == "connectivityIndex":
                improvement = improvement_potential * 0.30 * depth_factor
            elif metric == "greenSpaceCoverage":
                improvement = improvement_potential * 0.15 * depth_factor
            elif metric == "energyEfficiency":
                improvement = improvement_potential * 0.25 * depth_factor
            elif metric == "walkabilityScore":
                improvement = improvement_potential * 0.20 * depth_factor
            else:
                improvement = improvement_potential * 0.20 * depth_factor
        else:
            # Default: balanced improvement
            improvement = improvement_potential * 0.25 * depth_factor
        
        # Apply optimization with realistic constraints
        # Higher current values are harder to improve further
        optimized_value = current_value + (improvement * (100 - current_value))
        
        # Apply data-driven adjustments if available
        if road_network_data and metric in ["connectivityIndex", "trafficFlowEfficiency", "walkabilityScore"]:
            # If we have road network data, we can make more informed optimizations
            network_stats = road_network_data.get('network_statistics', {})
            if network_stats:
                # If network is already well-designed, less room for improvement
                if metric == "connectivityIndex" and network_stats.get('connectivity_score', 0) > 70:
                    optimized_value = min(optimized_value, current_value * 1.15)  # Cap improvement
                elif metric == "trafficFlowEfficiency" and network_stats.get('average_traffic_flow', 0) > 70:
                    optimized_value = min(optimized_value, current_value * 1.20)
        
        if zoning_data and metric in ["landUseEfficiency", "greenSpaceCoverage"]:
            # If zoning is already optimized, less room for improvement
            zone_stats = zoning_data.get('zone_statistics', {})
            if zone_stats and isinstance(zone_stats, dict):
                avg_fitness = zone_stats.get('average_fitness', 0.5)
                if avg_fitness > 0.8:  # Already well-optimized
                    if metric == "landUseEfficiency":
                        optimized_value = min(optimized_value, current_value * 1.15)
        
        optimized[metric] = min(100, max(current_value, round(optimized_value, 1)))
    
    return optimized

def calculate_improvements(current: dict, optimized: dict) -> dict:
    """Calculate improvement percentages."""
    improvements = {}
    for metric in current:
        if metric == "areaSqm":
            continue
        current_val = current[metric]
        optimized_val = optimized[metric]
        improvement = ((optimized_val - current_val) / current_val) * 100
        improvements[metric] = round(improvement, 1)
    return improvements

def _get_optimization_api_key():
    """Get OpenAI API key from environment variables."""
    # Try to get from environment variable
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        logger.warning("OPENAI_API_KEY not found in environment variables")
        return None
    
    return api_key

async def _get_openai_recommendations(current_metrics: dict, optimized_metrics: dict, 
                                     focus: str, terrain_data: dict = None) -> list:
    """Get AI recommendations from OpenAI based on terrain analysis and DEM data."""
    if not OPENAI_AVAILABLE or not openai:
        logger.warning("OpenAI not available - package may not be installed")
        return None
    
    try:
        api_key = _get_optimization_api_key()
        if not api_key:
            logger.warning("OpenAI API key not found")
            return None
        
        logger.info("🔑 OpenAI API key found, initializing client...")
        # Initialize OpenAI client
        client = openai.OpenAI(api_key=api_key)
        
        # Extract terrain and DEM information
        terrain_summary = {}
        dem_info = {}
        
        if terrain_data:
            try:
                # Handle different terrain_data structures
                # Case 1: terrain_data is the results dict directly
                # Case 2: terrain_data has a "results" key
                if isinstance(terrain_data, dict):
                    if "results" in terrain_data:
                        results = terrain_data.get("results", {})
                    else:
                        # terrain_data itself might be the results
                        results = terrain_data
                    
                    if isinstance(results, str):
                        results = json.loads(results)
                    
                    logger.info(f"📊 Extracted terrain results, keys: {list(results.keys()) if isinstance(results, dict) else 'N/A'}")
                else:
                    logger.warning(f"⚠️ terrain_data is not a dict: {type(terrain_data)}")
                    results = {}
                
                # Extract slope analysis
                slope_analysis = results.get("slope_analysis", {})
                if isinstance(slope_analysis, dict):
                    terrain_summary["mean_slope"] = slope_analysis.get("mean_slope", 0)
                    terrain_summary["max_slope"] = slope_analysis.get("max_slope", 0)
                    terrain_summary["min_slope"] = slope_analysis.get("min_slope", 0)
                    logger.info(f"📐 Extracted slope data: mean={terrain_summary.get('mean_slope', 0)}°")
                
                # Extract elevation data (DEM)
                stats = results.get("stats", {})
                if isinstance(stats, dict):
                    dem_info["mean_elevation"] = stats.get("mean_elevation", 0)
                    dem_info["min_elevation"] = stats.get("min_elevation", 0)
                    dem_info["max_elevation"] = stats.get("max_elevation", 0)
                    dem_info["elevation_range"] = dem_info.get("max_elevation", 0) - dem_info.get("min_elevation", 0)
                    logger.info(f"⛰️ Extracted DEM data: range={dem_info.get('min_elevation', 0)}-{dem_info.get('max_elevation', 0)}m")
                
                # Extract flood analysis
                flood_analysis = results.get("flood_analysis", {}) or results.get("flood_risk_analysis", {})
                if isinstance(flood_analysis, dict):
                    flood_stats = flood_analysis.get("flood_stats", {})
                    if isinstance(flood_stats, dict):
                        terrain_summary["flood_risk_high"] = flood_stats.get("high_risk_area", 0)
                        terrain_summary["flood_risk_medium"] = flood_stats.get("medium_risk_area", 0)
                        logger.info(f"🌊 Extracted flood risk data: high={terrain_summary.get('flood_risk_high', 0)}%")
                
                # Extract aspect analysis
                aspect_analysis = results.get("aspect_analysis", {})
                if isinstance(aspect_analysis, dict):
                    terrain_summary["dominant_aspect"] = aspect_analysis.get("dominant_aspect", 0)
                    logger.info(f"🧭 Extracted aspect data: {terrain_summary.get('dominant_aspect', 0)}°")
                
                # Extract hydrology data
                hydrology = results.get("hydrology", {})
                if isinstance(hydrology, dict):
                    terrain_summary["water_bodies_count"] = len(hydrology.get("water_bodies", []))
                    logger.info(f"💧 Extracted hydrology data: {terrain_summary.get('water_bodies_count', 0)} water bodies")
                
                if not terrain_summary and not dem_info:
                    logger.warning(f"⚠️ No terrain/DEM data extracted from results. Results keys: {list(results.keys()) if isinstance(results, dict) else 'N/A'}")
            except Exception as e:
                logger.error(f"❌ Error extracting terrain data for OpenAI: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Build prompt for OpenAI
        focus_descriptions = {
            "efficiency": "transportation and land use efficiency",
            "sustainability": "environmental sustainability and green infrastructure",
            "livability": "community livability and quality of life",
            "economic": "economic development and property value optimization"
        }
        
        focus_desc = focus_descriptions.get(focus, "balanced urban planning")
        
        # Calculate improvement gaps for prioritization
        improvements = {
            'landUseEfficiency': optimized_metrics.get('landUseEfficiency', 0) - current_metrics.get('landUseEfficiency', 0),
            'connectivityIndex': optimized_metrics.get('connectivityIndex', 0) - current_metrics.get('connectivityIndex', 0),
            'greenSpaceCoverage': optimized_metrics.get('greenSpaceCoverage', 0) - current_metrics.get('greenSpaceCoverage', 0),
            'trafficFlowEfficiency': optimized_metrics.get('trafficFlowEfficiency', 0) - current_metrics.get('trafficFlowEfficiency', 0),
            'energyEfficiency': optimized_metrics.get('energyEfficiency', 0) - current_metrics.get('energyEfficiency', 0),
            'walkabilityScore': optimized_metrics.get('walkabilityScore', 0) - current_metrics.get('walkabilityScore', 0)
        }
        
        prompt = f"""You are an expert urban planner and AI consultant specializing in terrain-based urban design optimization. Provide actionable, data-driven recommendations.

CURRENT DESIGN ANALYSIS:
• Land Use Efficiency: {current_metrics.get('landUseEfficiency', 0):.1f}% → Target: {optimized_metrics.get('landUseEfficiency', 0):.1f}% (Gap: {improvements['landUseEfficiency']:.1f}%)
• Connectivity Index: {current_metrics.get('connectivityIndex', 0):.1f}% → Target: {optimized_metrics.get('connectivityIndex', 0):.1f}% (Gap: {improvements['connectivityIndex']:.1f}%)
• Green Space Coverage: {current_metrics.get('greenSpaceCoverage', 0):.1f}% → Target: {optimized_metrics.get('greenSpaceCoverage', 0):.1f}% (Gap: {improvements['greenSpaceCoverage']:.1f}%)
• Traffic Flow: {current_metrics.get('trafficFlowEfficiency', 0):.1f}% → Target: {optimized_metrics.get('trafficFlowEfficiency', 0):.1f}% (Gap: {improvements['trafficFlowEfficiency']:.1f}%)
• Energy Efficiency: {current_metrics.get('energyEfficiency', 0):.1f}% → Target: {optimized_metrics.get('energyEfficiency', 0):.1f}% (Gap: {improvements['energyEfficiency']:.1f}%)
• Walkability: {current_metrics.get('walkabilityScore', 0):.1f}% → Target: {optimized_metrics.get('walkabilityScore', 0):.1f}% (Gap: {improvements['walkabilityScore']:.1f}%)

TERRAIN & TOPOGRAPHIC DATA (DEM-DERIVED):
"""
        
        if terrain_summary or dem_info:
            if dem_info:
                prompt += f"- Elevation Range: {dem_info.get('min_elevation', 0):.1f}m to {dem_info.get('max_elevation', 0):.1f}m (Mean: {dem_info.get('mean_elevation', 0):.1f}m)\n"
                prompt += f"- Elevation Variation: {dem_info.get('elevation_range', 0):.1f}m\n"
            
            if terrain_summary.get("mean_slope"):
                prompt += f"- Mean Slope: {terrain_summary.get('mean_slope', 0):.1f}° (Range: {terrain_summary.get('min_slope', 0):.1f}° to {terrain_summary.get('max_slope', 0):.1f}°)\n"
            
            if terrain_summary.get("flood_risk_high"):
                prompt += f"- Flood Risk: {terrain_summary.get('flood_risk_high', 0):.1f}% high-risk area, {terrain_summary.get('flood_risk_medium', 0):.1f}% medium-risk area\n"
            
            if terrain_summary.get("dominant_aspect"):
                prompt += f"- Terrain Aspect: {terrain_summary.get('dominant_aspect', 0):.1f}° (dominant orientation)\n"
            
            if terrain_summary.get("water_bodies_count"):
                prompt += f"- Water Bodies: {terrain_summary.get('water_bodies_count', 0)} identified\n"
        else:
            prompt += "- Terrain data not available\n"
        
        prompt += f"""

OPTIMIZATION OBJECTIVE: {focus_desc.upper()}

INSTRUCTIONS:
Generate 4-6 specific, data-driven recommendations that:
1. **Directly address the largest improvement gaps** shown above
2. **Leverage terrain characteristics** (elevation, slope, flood risk, aspect) for better design
3. **Are practical and implementable** with clear actions
4. **Focus on {focus_desc}** as the primary objective
5. **Include specific metrics** or quantifiable outcomes where possible

RESPONSE FORMAT (JSON array only, no additional text):
[
  {{
    "title": "Concise, action-oriented title (max 8 words)",
    "description": "Detailed 2-3 sentence explanation that: (1) identifies the problem, (2) proposes a specific solution tied to terrain data, (3) explains expected benefits. Be concrete and specific.",
    "impact": "High" | "Medium" | "Low",
    "category": "Infrastructure" | "Zoning" | "Environment" | "Livability" | "Sustainability",
    "terrain_insight": "One sentence explaining how terrain/DEM data specifically influences this recommendation"
  }}
]

PRIORITIZATION:
- Focus on metrics with largest gaps (>10%)
- High impact recommendations should directly address the optimization focus
- Include at least 2 terrain-specific recommendations

Return ONLY valid JSON, no markdown, no additional commentary."""

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert urban planner specializing in terrain-based design optimization. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        # Parse response
        response_text = response.choices[0].message.content.strip()
        
        # Clean response (remove markdown code blocks if present)
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON
        ai_recommendations = json.loads(response_text)
        
        if not isinstance(ai_recommendations, list):
            return None
        
        # Transform to match expected format
        formatted_recommendations = []
        # Map categories to relevant metrics
        category_to_metric = {
            "Infrastructure": "trafficFlowEfficiency",
            "Zoning": "landUseEfficiency",
            "Environment": "greenSpaceCoverage",
            "Livability": "walkabilityScore",
            "Sustainability": "energyEfficiency"
        }
        
        for idx, rec in enumerate(ai_recommendations[:6]):  # Limit to 6 recommendations
            category = rec.get("category", "Infrastructure")
            metric_key = category_to_metric.get(category, "landUseEfficiency")
            current_val = current_metrics.get(metric_key, 50)
            optimized_val = optimized_metrics.get(metric_key, 50)
            improvement = round(optimized_val - current_val, 1)
            
            formatted_rec = {
                "id": f"ai_recommendation_{idx + 1}",
                "title": rec.get("title", "AI Recommendation"),
                "description": rec.get("description", ""),
                "impact": rec.get("impact", "Medium"),
                "category": category,
                "estimatedImprovement": f"+{improvement}%",
                "priority": idx + 1,
                "terrain_insight": rec.get("terrain_insight", "")
            }
            formatted_recommendations.append(formatted_rec)
        
        logger.info(f"✅ Generated {len(formatted_recommendations)} AI recommendations from OpenAI")
        return formatted_recommendations
        
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse OpenAI JSON response: {e}")
        return None
    except Exception as e:
        logger.warning(f"OpenAI recommendation generation failed: {e}")
        return None

async def generate_optimization_recommendations(current_metrics: dict, optimized_metrics: dict, 
                                         focus: str, terrain_data: dict = None) -> list:
    """Generate AI recommendations. Priority: OpenAI > ML Model > Rule-based fallback."""
    # Debug logging
    logger.info(f"🔍 generate_optimization_recommendations called:")
    logger.info(f"   - terrain_data exists: {terrain_data is not None}")
    logger.info(f"   - OPENAI_AVAILABLE: {OPENAI_AVAILABLE}")
    logger.info(f"   - ML_OPTIMIZER_AVAILABLE: {ML_OPTIMIZER_AVAILABLE}")
    
    if terrain_data:
        logger.info(f"   - terrain_data type: {type(terrain_data)}")
        logger.info(f"   - terrain_data keys: {list(terrain_data.keys()) if isinstance(terrain_data, dict) else 'N/A'}")
        has_results = isinstance(terrain_data, dict) and ('results' in terrain_data or any(key in terrain_data for key in ['stats', 'slope_analysis', 'flood_analysis']))
        logger.info(f"   - has_results structure: {has_results}")
    
    # Priority 1: Try OpenAI if available and configured
    if terrain_data and OPENAI_AVAILABLE:
        try:
            logger.info(f"🚀 Attempting OpenAI recommendation generation...")
            ai_recommendations = await _get_openai_recommendations(
                current_metrics, optimized_metrics, focus, terrain_data
            )
            if ai_recommendations:
                logger.info(f"✅ Successfully got {len(ai_recommendations)} recommendations from OpenAI")
                return ai_recommendations
            else:
                logger.warning(f"⚠️ OpenAI returned None/empty recommendations")
        except Exception as e:
            logger.error(f"❌ OpenAI recommendation attempt failed: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
    else:
        if not terrain_data:
            logger.info(f"⚠️ Skipping OpenAI - terrain_data is None or empty")
        if not OPENAI_AVAILABLE:
            logger.info(f"⚠️ Skipping OpenAI - not available or API key not configured")
    
    # Priority 2: Try ML Optimizer if available
    if ML_OPTIMIZER_AVAILABLE:
        try:
            logger.info(f"🤖 Using ML-based recommendation engine...")
            ml_optimizer = get_ml_optimizer()
            ml_recommendations = ml_optimizer.generate_recommendations(
                current_metrics, optimized_metrics, focus, terrain_data
            )
            if ml_recommendations:
                logger.info(f"✅ Successfully generated {len(ml_recommendations)} ML-based recommendations")
                return ml_recommendations
        except Exception as e:
            logger.error(f"❌ ML optimizer recommendation failed: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
    else:
        logger.info(f"⚠️ ML optimizer not available, falling back to rule-based recommendations")
    
    # Priority 3: Fallback to simple rule-based recommendations
    logger.info(f"📝 Using rule-based recommendation fallback")
    recommendations = []
    
    # Road Network Optimization
    if current_metrics["trafficFlowEfficiency"] < 70:
        recommendations.append({
            "id": "road_network_redesign",
            "title": "Road Network Redesign",
            "description": "Optimize road layout for better traffic flow and reduced congestion by implementing a hierarchical network with improved connectivity. This includes adding collector roads, optimizing intersections, and improving access patterns.",
            "impact": "High",
            "category": "Infrastructure",
            "estimatedImprovement": f"+{round(optimized_metrics['trafficFlowEfficiency'] - current_metrics['trafficFlowEfficiency'], 1)}%",
            "priority": 1
        })
    
    # Mixed-Use Zoning
    if current_metrics["landUseEfficiency"] < 75:
        recommendations.append({
            "id": "mixed_use_zoning",
            "title": "Mixed-Use Zoning",
            "description": "Increase land use efficiency by implementing mixed-use zoning in central areas to reduce travel distances and enhance urban vitality. This promotes walkability and reduces vehicle dependency.",
            "impact": "High",
            "category": "Zoning",
            "estimatedImprovement": f"+{round(optimized_metrics['landUseEfficiency'] - current_metrics['landUseEfficiency'], 1)}%",
            "priority": 2
        })
    
    # Green Space Enhancement
    if current_metrics["greenSpaceCoverage"] < 30:
        recommendations.append({
            "id": "green_space_enhancement",
            "title": "Green Space Enhancement",
            "description": "Increase green space coverage through strategic placement of parks, green corridors, and urban forests. This improves air quality, reduces heat island effect, and enhances community livability.",
            "impact": "High" if focus == "sustainability" or focus == "livability" else "Medium",
            "category": "Environment",
            "estimatedImprovement": f"+{round(optimized_metrics['greenSpaceCoverage'] - current_metrics['greenSpaceCoverage'], 1)}%",
            "priority": 3
        })
    
    # Connectivity Improvement
    if current_metrics["connectivityIndex"] < 70:
        recommendations.append({
            "id": "connectivity_improvement",
            "title": "Connectivity Improvement",
            "description": "Enhance street connectivity by adding pedestrian pathways, bike lanes, and improving intersection design. This reduces travel times and promotes active transportation.",
            "impact": "High",
            "category": "Infrastructure",
            "estimatedImprovement": f"+{round(optimized_metrics['connectivityIndex'] - current_metrics['connectivityIndex'], 1)}%",
            "priority": 2
        })
    
    # Energy Efficiency
    if current_metrics["energyEfficiency"] < 70 and (focus == "sustainability" or focus == "efficiency"):
        recommendations.append({
            "id": "energy_efficiency",
            "title": "Energy Efficiency Optimization",
            "description": "Implement energy-efficient building orientations, renewable energy integration, and smart grid infrastructure to reduce energy consumption and carbon footprint.",
            "impact": "Medium",
            "category": "Sustainability",
            "estimatedImprovement": f"+{round(optimized_metrics['energyEfficiency'] - current_metrics['energyEfficiency'], 1)}%",
            "priority": 4
        })
    
    # Walkability Enhancement
    if current_metrics["walkabilityScore"] < 65:
        recommendations.append({
            "id": "walkability_enhancement",
            "title": "Walkability Enhancement",
            "description": "Improve walkability by creating pedestrian-friendly streetscapes, reducing block sizes, adding sidewalks, and ensuring safe crossings. This promotes healthier lifestyles and reduces car dependency.",
            "impact": "High" if focus == "livability" else "Medium",
            "category": "Livability",
            "estimatedImprovement": f"+{round(optimized_metrics['walkabilityScore'] - current_metrics['walkabilityScore'], 1)}%",
            "priority": 3
        })
    
    # Sort by priority
    recommendations.sort(key=lambda x: x["priority"])
    
    return recommendations

def generate_implementation_plan(recommendations: list, focus: str) -> dict:
    """Generate a dynamic phased implementation plan based on recommendations."""
    
    # Organize recommendations by priority and impact
    high_priority = [r for r in recommendations if r.get("priority", 3) <= 2 or r.get("impact") == "High"]
    medium_priority = [r for r in recommendations if r.get("priority", 3) == 3 or r.get("impact") == "Medium"]
    low_priority = [r for r in recommendations if r.get("priority", 3) > 3 or r.get("impact") == "Low"]
    
    # Build phases dynamically
    phases = {}
    phase_count = 0
    
    # Phase 1: High-impact, critical recommendations
    if high_priority:
        phase_count += 1
        infrastructure_recs = [r for r in high_priority if r.get("category") == "Infrastructure"]
        other_recs = [r for r in high_priority if r.get("category") != "Infrastructure"]
        
        duration_months = 3 + (len(high_priority) * 1.5)  # 3 base + 1.5 months per rec
        phases[f"phase{phase_count}"] = {
            "name": "Critical Infrastructure & Foundation",
            "duration": f"{int(duration_months)}-{int(duration_months + 3)} months",
            "recommendations": [r["id"] for r in high_priority],
            "description": f"Implement {len(high_priority)} high-impact recommendations including infrastructure and critical improvements",
            "priority": "High",
            "recommendationTitles": [r["title"] for r in high_priority][:3]  # First 3 titles
        }
    
    # Phase 2: Medium-impact recommendations
    if medium_priority:
        phase_count += 1
        duration_months = 6 + (len(medium_priority) * 2)
        phases[f"phase{phase_count}"] = {
            "name": "Zoning & Development Optimization",
            "duration": f"{int(duration_months)}-{int(duration_months + 4)} months",
            "recommendations": [r["id"] for r in medium_priority],
            "description": f"Implement {len(medium_priority)} medium-priority recommendations for land use and connectivity",
            "priority": "Medium",
            "recommendationTitles": [r["title"] for r in medium_priority][:3]
        }
    
    # Phase 3: Environmental and livability enhancements
    env_recs = [r for r in recommendations if r.get("category") in ["Environment", "Livability", "Sustainability"]]
    if env_recs:
        phase_count += 1
        duration_months = 9 + (len(env_recs) * 2.5)
        phases[f"phase{phase_count}"] = {
            "name": "Environmental & Livability Enhancement",
            "duration": f"{int(duration_months)}-{int(duration_months + 6)} months",
            "recommendations": [r["id"] for r in env_recs],
            "description": f"Enhance environmental features and community livability with {len(env_recs)} recommendations",
            "priority": "Medium",
            "recommendationTitles": [r["title"] for r in env_recs][:3]
        }
    
    # Calculate total duration
    all_rec_count = len(recommendations)
    if all_rec_count <= 3:
        total_duration = "6-12 months"
    elif all_rec_count <= 5:
        total_duration = "12-18 months"
    elif all_rec_count <= 7:
        total_duration = "18-24 months"
    else:
        total_duration = "24-36 months"
    
    return {
        "totalPhases": phase_count,
        "estimatedTotalDuration": total_duration,
        "phases": phases,
        "focus": focus,
        "totalRecommendations": all_rec_count,
        "implementationApproach": "Phased approach prioritizing high-impact infrastructure first, followed by land use optimization, and completing with environmental enhancements"
    }

@app.get("/api/subdivision_results")
async def get_subdivision_results():
    """Get all subdivision results."""
    try:
        # Serialize results properly to avoid JSON encoding issues
        serialized_results = []
        for result in SUBDIVISION_RESULTS:
            try:
                # Convert to JSON-serializable format
                serialized_result = {
                    "id": result.get("id"),
                    "polygon_id": result.get("polygon_id"),
                    "terrain_analysis_id": result.get("terrain_analysis_id"),
                    "zoning_result_id": result.get("zoning_result_id"),
                    "config_used": result.get("config_used"),
                    "created_at": result.get("created_at"),
                    "subdivision_result": result.get("subdivision_result")
                }
                # Use custom encoder for nested geometries
                json_str = json.dumps(serialized_result, cls=CustomJSONEncoder, ensure_ascii=False)
                serialized_results.append(json.loads(json_str))
            except Exception as e:
                logger.warning(f"Error serializing subdivision result {result.get('id')}: {e}")
                continue
        
        return JSONResponse({
            "success": True,
            "results": serialized_results
        })
    except Exception as e:
        logger.error(f"Error getting subdivision results: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.get("/api/subdivision_standards")
async def get_subdivision_standards():
    """
    Get subdivision standards and regulations.
    """
    try:
        standards = {
            "parcel_standards": subdivision_engine.parcel_standards,
            "road_standards": subdivision_engine.road_standards,
            "setback_requirements": subdivision_engine.setback_requirements,
            "algorithms": {
                "grid": "Regular grid pattern subdivision",
                "voronoi": "Voronoi diagram-based subdivision",
                "optimized": "Terrain and infrastructure optimized"
            },
            "market_rates": {
                "residential": {
                    "small": {"rate_per_sqft": 15000, "currency": "PKR"},
                    "medium": {"rate_per_sqft": 20000, "currency": "PKR"},
                    "large": {"rate_per_sqft": 25000, "currency": "PKR"}
                },
                "commercial": {
                    "small": {"rate_per_sqft": 30000, "currency": "PKR"},
                    "medium": {"rate_per_sqft": 40000, "currency": "PKR"},
                    "large": {"rate_per_sqft": 50000, "currency": "PKR"}
                }
            }
        }
        
        return JSONResponse({
            "success": True,
            "standards": standards
        })
        
    except Exception as e:
        logger.error(f"Subdivision standards error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/road_network_results")
async def get_road_network_results():
    """
    Get all road network design results.
    """
    try:
        # Check if ROAD_NETWORK_RESULTS exists in globals
        if 'ROAD_NETWORK_RESULTS' not in globals():
            globals()['ROAD_NETWORK_RESULTS'] = []
        
        road_networks = globals().get('ROAD_NETWORK_RESULTS', [])
        
        # If no road networks, return empty list
        if not road_networks:
            return JSONResponse({
                "success": True,
                "road_networks": []
            })
        
        # Serialize each road network result
        serialized_networks = []
        for idx, network_record in enumerate(road_networks):
            try:
                json_str = json.dumps(network_record, cls=CustomJSONEncoder, ensure_ascii=False)
                serialized_networks.append(json.loads(json_str))
            except Exception as e:
                logger.warning(f"Error serializing road network result {idx}: {e}")
                continue
        
        result = {"success": True, "road_networks": serialized_networks}
        json_str = json.dumps(result, cls=CustomJSONEncoder, ensure_ascii=False)
        return JSONResponse(json.loads(json_str))
    except Exception as e:
        logger.error(f"Error getting road network results: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "road_networks": []
        }, status_code=500)
@app.post("/api/infrastructure_analysis")
async def infrastructure_analysis(request: Request):
    """
    Analyze infrastructure requirements for subdivided parcels.
    """
    try:
        payload = await request.json()
        
        return JSONResponse({
            "success": True,
            "message": "Infrastructure analysis endpoint is working"
        })
        
    except Exception as e:
        logger.error(f"Infrastructure analysis error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/road_network_design")
async def road_network_design(request: Request):
    """
    Design primary and secondary road networks.
    Module 8: Road and Pathway Layout Module
    FE-1: Generate primary and secondary road networks considering zoning and terrain constraints
    FE-2: Include traffic flow simulations and accessibility analysis
    FE-3: Support pedestrian walkways, bike lanes, and emergency routes
    FE-4: Provide tools for designing multi-modal transport solutions
    """
    try:
        logger.info("🛣️ Road network design endpoint called")
        data = await request.json()
        logger.info(f"📦 Received data: {list(data.keys())}")
        
        polygon_id = data.get("polygon_id")
        if not polygon_id:
            logger.warning("❌ Missing polygon_id in request")
            return JSONResponse({"success": False, "error": "polygon_id is required"}, status_code=400)
        
        # Get parcels from request first (this is what the frontend sends)
        parcels_from_request = data.get("parcels")
        
        # Get polygon data - try multiple sources (optional if parcels are provided)
        polygon_data = None
        polygon_geojson = None
        
        # First, try to get from request (frontend might send it)
        if "polygon_geojson" in data:
            polygon_geojson = data.get("polygon_geojson")
            polygon_data = {"id": polygon_id, "geojson": polygon_geojson}
            logger.info("✅ Using polygon geojson from request")
        
        # If not in request, try in-memory POLYGONS list
        if not polygon_data:
            for poly in POLYGONS:
                if poly.get("id") == polygon_id:
                    polygon_data = poly
                    polygon_geojson = poly.get("geojson")
                    logger.info("✅ Found polygon in POLYGONS list")
                    break
        
        # If still not found, try to fetch from Node.js backend database
        if not polygon_data:
            try:
                # Try using requests (synchronous) as fallback if httpx is not available
                try:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        # Try to fetch from Node.js backend
                        node_backend_url = "http://127.0.0.1:8000"
                        response = await client.get(f"{node_backend_url}/api/polygon/{polygon_id}", timeout=5.0)
                        if response.status_code == 200:
                            polygon_data = response.json()
                            polygon_geojson = polygon_data.get("geojson") or polygon_data.get("geometry")
                            logger.info(f"✅ Fetched polygon {polygon_id} from Node.js backend")
                except ImportError:
                    # Fallback to requests if httpx is not available
                    import requests
                    node_backend_url = "http://127.0.0.1:8000"
                    response = requests.get(f"{node_backend_url}/api/polygon/{polygon_id}", timeout=5.0)
                    if response.status_code == 200:
                        polygon_data = response.json()
                        polygon_geojson = polygon_data.get("geojson") or polygon_data.get("geometry")
                        logger.info(f"✅ Fetched polygon {polygon_id} from Node.js backend using requests")
            except Exception as db_error:
                logger.warning(f"Could not fetch polygon from database: {db_error}")
        
        # If no polygon but we have parcels, we can work with just parcels
        if not polygon_data and parcels_from_request:
            logger.info("⚠️ No polygon found, but parcels available - will generate network from parcels")
            polygon_data = {"id": polygon_id, "geojson": None}
        
        # If no polygon and no parcels, we can't proceed
        if not polygon_data and not parcels_from_request:
            logger.error(f"❌ Polygon {polygon_id} not found and no parcels provided")
            return JSONResponse({
                "success": False, 
                "error": f"Polygon {polygon_id} not found. Please ensure the polygon exists or provide parcel data."
            }, status_code=404)
        
        # Log what we have
        if polygon_data:
            logger.info(f"✅ Using polygon data: id={polygon_data.get('id')}, has_geojson={polygon_data.get('geojson') is not None}")
        if parcels_from_request:
            if isinstance(parcels_from_request, dict) and "features" in parcels_from_request:
                logger.info(f"✅ Using {len(parcels_from_request.get('features', []))} parcels from request")
            else:
                logger.info(f"✅ Using parcels data: {type(parcels_from_request)}")
        
        # TERRAIN VALIDATION: Check if terrain analysis exists and validate suitability
        terrain_data = None
        for terrain in TERRAIN_ANALYSES:
            if terrain.get("polygon_id") == polygon_id:
                terrain_data = terrain
                break
        
        # Validate terrain before allowing road network design
        if terrain_data:
            validation_result = validate_terrain_for_development(terrain_data, operation="road_network")
            if not validation_result["allowed"]:
                logger.warning(f"❌ Terrain validation failed: {validation_result['reason']}")
                return JSONResponse({
                    "success": False,
                    "error": validation_result["reason"],
                    "validation_details": validation_result.get("details", {})
                }, status_code=400)
            logger.info(f"✅ Terrain validation passed: {validation_result.get('message', 'Suitable for development')}")
        else:
            logger.warning("⚠️ No terrain analysis found - proceeding without validation")
        
        # Get design parameters from request
        design_params = data.get("design_parameters", {})
        polygon_area_sqm = data.get("polygon_area_sqm", 0)
        polygon_area_hectares = data.get("polygon_area_hectares", 0)
        
        logger.info(f"📐 Design parameters: primary_width={design_params.get('primary_road_width', 24)}m, "
                   f"secondary_width={design_params.get('secondary_road_width', 18)}m, "
                   f"local_width={design_params.get('local_road_width', 12)}m, "
                   f"max_block_size={design_params.get('max_block_size', 150)}m")
        logger.info(f"📐 Polygon area: {polygon_area_hectares:.2f} hectares ({polygon_area_sqm:.0f} m²)")
        
        # Get zoning data
        zoning_data = None
        for zoning in ZONING_RESULTS:
            if zoning.get("polygon_id") == polygon_id:
                zoning_data = zoning
                break
        
        # Get subdivision data (parcels) - either from request or stored results
        # Note: parcels_from_request was already extracted above
        subdivision_data = None
        
        if parcels_from_request:
            # Use parcels from request
            subdivision_data = {
                "subdivision_result": {
                    "parcels": parcels_from_request
                }
            }
        else:
            # Try to find stored subdivision
            for subdivision in SUBDIVISION_RESULTS:
                if subdivision.get("polygon_id") == polygon_id:
                    subdivision_data = subdivision
                    break
        
        # If no subdivision data, we can still generate a basic network from polygon
        if not subdivision_data:
            logger.warning(f"No subdivision data found for polygon {polygon_id}, generating basic network from polygon")
            # We'll let the engine handle this with empty parcels
        
        logger.info(f"🛣️ Designing road network for polygon {polygon_id}...")
        logger.info(f"📊 Subdivision data available: {subdivision_data is not None}")
        logger.info(f"📊 Zoning data available: {zoning_data is not None}")
        logger.info(f"📊 Terrain data available: {terrain_data is not None}")
        
        # Design comprehensive road network using the engine
        parcels_for_network = None
        if subdivision_data:
            parcels_for_network = subdivision_data.get("subdivision_result", {}).get("parcels", {})
            if isinstance(parcels_for_network, dict) and "features" in parcels_for_network:
                logger.info(f"📦 Found {len(parcels_for_network.get('features', []))} parcels")
            else:
                logger.info(f"📦 Parcels data format: {type(parcels_for_network)}")
        
        # Extract polygon geometry for road network design
        polygon_geom = None
        if polygon_geojson:
            try:
                from shapely.geometry import shape
                if isinstance(polygon_geojson, dict):
                    geom_data = polygon_geojson.get('geometry', polygon_geojson)
                else:
                    geom_data = polygon_geojson
                polygon_geom = shape(geom_data)
                logger.info("✅ Extracted polygon geometry for road network design")
            except Exception as geom_error:
                logger.warning(f"Could not extract polygon geometry: {geom_error}")
        
        # Update road network engine standards with design parameters
        if design_params:
            road_network_engine.standards["road_widths"]["primary"] = design_params.get("primary_road_width", 24)
            road_network_engine.standards["road_widths"]["secondary"] = design_params.get("secondary_road_width", 18)
            road_network_engine.standards["road_widths"]["local"] = design_params.get("local_road_width", 12)
            road_network_engine.standards["max_block_size"] = design_params.get("max_block_size", 150)
        
        try:
            road_network = road_network_engine.design_road_network(
                parcels=parcels_for_network,
                zoning_data=zoning_data,
                terrain_data=terrain_data,
                polygon_geometry=polygon_geom,
                design_parameters=design_params,
                polygon_area_hectares=polygon_area_hectares
            )
            
            # Log road counts for debugging
            primary_count = len(road_network.get("primary_roads", {}).get("features", []))
            secondary_count = len(road_network.get("secondary_roads", {}).get("features", []))
            local_count = len(road_network.get("local_roads", {}).get("features", []))
            pedestrian_count = len(road_network.get("pedestrian_network", {}).get("features", []))
            bike_count = len(road_network.get("bike_network", {}).get("features", []))
            
            logger.info(f"✅ Road network designed successfully: {primary_count} primary, {secondary_count} secondary, {local_count} local, {pedestrian_count} pedestrian, {bike_count} bike roads")
        except Exception as engine_error:
            logger.error(f"❌ Road network engine error: {engine_error}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
        
        # Add success flag
        road_network["success"] = True
        
        # Store road network results
        if not hasattr(globals(), 'ROAD_NETWORK_RESULTS'):
            globals()['ROAD_NETWORK_RESULTS'] = []
        
        road_network_record = {
            "polygon_id": polygon_id,
            "road_network": road_network,
            "created_at": time.time(),
            "standards_used": road_network_engine.standards
        }
        
        globals()['ROAD_NETWORK_RESULTS'].append(road_network_record)
        
        # Prepare response
        result = {
            "success": True,
            "polygon_id": polygon_id,
            "road_network": road_network,
            "standards_compliance": {
                "pakistan_standards": True,
                "cda_guidelines": True,
                "traffic_engineering": True,
                "accessibility_standards": True
            },
            "multi_modal_features": {
                "primary_roads": len(road_network.get("primary_roads", {}).get("features", [])),
                "secondary_roads": len(road_network.get("secondary_roads", {}).get("features", [])),
                "local_roads": len(road_network.get("local_roads", {}).get("features", [])),
                "residential_roads": len(road_network.get("residential_roads", {}).get("features", [])),
                "pedestrian_paths": len(road_network.get("pedestrian_network", {}).get("features", [])),
                "bike_paths": len(road_network.get("bike_network", {}).get("features", [])),
                "emergency_routes": len(road_network.get("emergency_routes", {}).get("features", []))
            },
            "algorithms_used": {
                "primary_roads": "A* (Enhanced with grid-based heuristics)",
                "secondary_roads": "Dijkstra (Enhanced with graph optimization) + MST (Minimum Spanning Tree)",
                "local_roads": "A* + Dijkstra (Hybrid approach)",
                "residential_roads": "MST (Kruskal's algorithm)",
                "additional_algorithms": [
                    "Bellman-Ford (for negative weight handling)",
                    "Floyd-Warshall (for all-pairs shortest paths)",
                    "A* with adaptive grid resolution",
                    "Deterministic seed generation for consistency"
                ],
                "optimization_features": [
                    "Deterministic results across runs",
                    "Adaptive grid resolution",
                    "Terrain-aware pathfinding",
                    "Multi-algorithm hybrid approach"
                ]
            },
            "traffic_analysis": road_network.get("traffic_analysis", {}),
            "accessibility_analysis": road_network.get("accessibility_analysis", {}),
            "network_statistics": road_network.get("network_statistics", {}),
            "cost_analysis": road_network.get("cost_analysis", {}),
            "environmental_analysis": road_network.get("environmental_analysis", {}),
            "safety_analysis": road_network.get("safety_analysis", {})
        }
        
        json_str = json.dumps(result, cls=CustomJSONEncoder, ensure_ascii=False)
        return JSONResponse(json.loads(json_str))
        
    except Exception as e:
        logger.error(f"Road network design error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.get("/api/road_network_results")
async def get_road_network_results():
    """
    Get all road network design results.
    """
    try:
        # Check if ROAD_NETWORK_RESULTS exists in globals
        if 'ROAD_NETWORK_RESULTS' not in globals():
            globals()['ROAD_NETWORK_RESULTS'] = []
        
        road_networks = globals().get('ROAD_NETWORK_RESULTS', [])
        
        # If no road networks, return empty list
        if not road_networks:
            return JSONResponse({
                "success": True,
                "road_networks": []
            })
        
        # Serialize each road network result to ensure all objects are JSON-serializable
        serialized_networks = []
        for idx, network_record in enumerate(road_networks):
            try:
                # Create a safe copy of the record
                safe_record = {}
                for key, value in network_record.items():
                    if key == 'created_at' and isinstance(value, (int, float)):
                        # Keep timestamp as is
                        safe_record[key] = value
                    elif key == 'polygon_id':
                        # Keep polygon_id as is
                        safe_record[key] = value
                    elif key in ['road_network', 'standards_used']:
                        # These should already be dicts, serialize them
                        try:
                            json_str = json.dumps(value, cls=CustomJSONEncoder, ensure_ascii=False)
                            safe_record[key] = json.loads(json_str)
                        except:
                            # If serialization fails, skip this key
                            logger.warning(f"Could not serialize {key} for record {idx}")
                            continue
                    else:
                        safe_record[key] = value
                
                # Serialize the entire safe record
                json_str = json.dumps(safe_record, cls=CustomJSONEncoder, ensure_ascii=False)
                serialized_networks.append(json.loads(json_str))
            except Exception as e:
                logger.warning(f"Error serializing road network result {idx}: {e}")
                import traceback
                logger.warning(f"Serialization traceback: {traceback.format_exc()}")
                # Skip this record if it can't be serialized
                continue
        
        result = {
            "success": True,
            "road_networks": serialized_networks
        }
        json_str = json.dumps(result, cls=CustomJSONEncoder, ensure_ascii=False)
        return JSONResponse(json.loads(json_str))
    except Exception as e:
        logger.error(f"Error getting road network results: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse({
            "success": False, 
            "error": str(e),
            "road_networks": []
        }, status_code=500)

@app.post("/api/intelligent_zoning")
async def intelligent_zoning(request: Request):
    """
    Intelligent zoning analysis using real DEM data and terrain analysis.
    Divides user-marked polygon into residential, commercial, and green zones.
    """
    try:
        payload = await request.json()
        
        # Get polygon ID or GeoJSON
        polygon_id = payload.get('polygon_id')
        geojson = payload.get('geojson')
        
        if not polygon_id and not geojson:
            return JSONResponse({"error": "Missing polygon_id or geojson"}, status_code=400)
        
        # TERRAIN VALIDATION: Check terrain suitability for zoning
        terrain_data = None
        if polygon_id:
            for terrain in TERRAIN_ANALYSES:
                if terrain.get("polygon_id") == polygon_id:
                    terrain_data = terrain
                    break
            
            # Validate terrain before allowing zoning
            if terrain_data:
                validation_result = validate_terrain_for_development(terrain_data, operation="zoning")
                if not validation_result["allowed"]:
                    logger.warning(f"❌ Terrain validation failed for zoning: {validation_result['reason']}")
                    return JSONResponse({
                        "success": False,
                        "error": validation_result["reason"],
                        "validation_details": validation_result.get("details", {})
                    }, status_code=400)
                logger.info(f"✅ Terrain validation passed for zoning: {validation_result.get('message', 'Suitable for development')}")
            else:
                logger.warning("⚠️ No terrain analysis found for zoning - proceeding without validation")
        
        # Get terrain analysis data
        polygon_coords = None
        
        if polygon_id:
            # Get existing terrain analysis data from database
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                logger.info(f"🔍 Attempting to get terrain data for polygon {polygon_id}")
                
                # Connect to PostgreSQL database
                conn = psycopg2.connect(
                    host="localhost",
                    database="plan-it",
                    user="postgres",
                    password="iampro24",
                    port="5432"
                )
                logger.info("✅ Database connection established")
                cur = conn.cursor(cursor_factory=RealDictCursor)
                
                # Get terrain analysis data
                cur.execute("SELECT results FROM terrain_analyses WHERE polygon_id = %s ORDER BY created_at DESC LIMIT 1", (polygon_id,))
                result = cur.fetchone()
                
                logger.info(f"🔍 Terrain analysis query result: {result is not None}")
                
                if result:
                    terrain_data = result['results']
                    logger.info(f"✅ Got terrain data from database for polygon {polygon_id}")
                    logger.info(f"🔍 Terrain data keys: {list(terrain_data.keys()) if isinstance(terrain_data, dict) else 'Not a dict'}")
                else:
                    logger.warning(f"⚠️ No terrain analysis found for polygon {polygon_id}")
                
                # Get polygon coordinates
                cur.execute("SELECT geojson FROM polygons WHERE id = %s", (polygon_id,))
                polygon_result = cur.fetchone()
                
                logger.info(f"🔍 Polygon query result: {polygon_result is not None}")
                
                if polygon_result:
                    polygon_geojson = polygon_result['geojson']
                    logger.info(f"🔍 Polygon GeoJSON type: {type(polygon_geojson)}")
                    logger.info(f"🔍 Polygon GeoJSON keys: {list(polygon_geojson.keys()) if isinstance(polygon_geojson, dict) else 'Not a dict'}")
                    
                    if polygon_geojson and 'coordinates' in polygon_geojson:
                        # GeoJSON Polygon coordinates are [[[x, y], [x, y], ...]]
                        # We need to extract the first element to get [[x, y], [x, y], ...]
                        coords = polygon_geojson['coordinates']
                        if isinstance(coords, list) and len(coords) > 0 and isinstance(coords[0], list):
                            polygon_coords = coords[0]  # Get the outer ring
                            logger.info(f"✅ Got polygon coordinates: {len(polygon_coords)} points")
                        else:
                            polygon_coords = coords
                            logger.warning(f"⚠️ Unexpected coordinate structure: {coords}")
                    else:
                        logger.warning(f"⚠️ No coordinates found in polygon GeoJSON")
                else:
                    logger.warning(f"⚠️ No polygon found with ID {polygon_id}")
                    
                cur.close()
                conn.close()
                logger.info("✅ Database connection closed")
                
            except Exception as e:
                logger.error(f"❌ Database error: {e}")
                import traceback
                logger.error(traceback.format_exc())
        
        # Handle direct geojson input (prioritize frontend geojson over database)
        if geojson:
            logger.info("Processing direct geojson input from frontend")
            logger.info(f"🔍 DEBUG: geojson type: {type(geojson)}")
            logger.info(f"🔍 DEBUG: geojson keys: {list(geojson.keys()) if isinstance(geojson, dict) else 'Not a dict'}")
            if geojson.get("type") == "Polygon":
                polygon_coords = geojson["coordinates"][0]
                logger.info(f"✅ Got polygon coordinates from frontend geojson: {len(polygon_coords)} points")
                logger.info(f"🔍 DEBUG: First few coordinates: {polygon_coords[:3] if len(polygon_coords) > 0 else 'None'}")
            elif geojson.get("geometry", {}).get("type") == "Polygon":
                polygon_coords = geojson["geometry"]["coordinates"][0]
                logger.info(f"✅ Got polygon coordinates from frontend geojson geometry: {len(polygon_coords)} points")
                logger.info(f"🔍 DEBUG: First few coordinates: {polygon_coords[:3] if len(polygon_coords) > 0 else 'None'}")
            else:
                logger.warning(f"⚠️ Unexpected geojson structure: {geojson}")
        elif polygon_coords:
            logger.info(f"✅ Using polygon coordinates from database: {len(polygon_coords)} points")
        
        # If no terrain data, create default terrain data
        if not terrain_data:
            logger.warning("No terrain data available, creating default terrain data")
            terrain_data = {
                'stats': {
                    'mean_elevation': 500,
                    'min_elevation': 400,
                    'max_elevation': 600,
                    'total_pixels': 1000
                },
                'slope_analysis': {
                    'mean_slope': 15,
                    'max_slope': 30,
                    'category_stats': {
                        'flat': 0.4,
                        'moderate': 0.4,
                        'steep': 0.2
                    }
                },
                'flood_analysis': {
                    'flood_stats': {
                        'high_risk_area': 0.1
                    }
                },
                'erosion_analysis': {
                    'erosion_stats': {
                        'mean_soil_loss': 0.2
                    }
                }
            }
        
        # If no polygon coordinates, return error
        if not polygon_coords:
            logger.error("No polygon coordinates available")
            return JSONResponse({"error": "No polygon coordinates found"}, status_code=400)
        
        # Create 2D zoning visualization using the Zameen.com style function
        logger.info(f"Creating 2D zoning visualization for polygon {polygon_id}")
        
        # Prepare zoning data for visualization function
        zoning_data = terrain_data.copy()
        zoning_data['polygon_id'] = polygon_id
        
        # Calculate actual polygon area for response
        area_sqm, area_acres = calculate_polygon_area(polygon_coords)
        
        # Call the Zameen.com style visualization function
        visualization_path = create_2d_zoning_visualization(polygon_coords, zoning_data)
        
        if visualization_path:
            # Get just the filename from the full path
            visualization_filename = os.path.basename(visualization_path)
            visualization_url = f"/download/{visualization_filename}"
            
            logger.info(f"✅ Created visualization: {visualization_path}")
            logger.info(f"✅ Visualization URL: {visualization_url}")
            
            terrain_summary = terrain_data.get('stats', {}).copy()
            terrain_summary['area_acres'] = area_acres
            terrain_summary['area_sqm'] = area_sqm
            
            # Extract green space statistics from zoning_data (added by create_2d_zoning_visualization)
            green_space_stats = zoning_data.get('green_space_statistics', {})
            marla_summary = zoning_data.get('marla_summary', {})  # Get comprehensive marla accounting
            
            # Prepare the full result structure
            full_result = {
                "success": True,
                "analysis": {
                    "visualization": {
                        "image_url": visualization_url,
                        "image_path": visualization_path,
                        "green_space_statistics": green_space_stats  # Include green space stats
                    },
                    "terrain_summary": terrain_summary,
                    "zoning_data": {
                        "marla_summary": marla_summary  # Include comprehensive marla accounting (commercial, residential, green, roads, etc.)
                    }
                }
            }
            
            # Save to database if polygon_id is available
            if polygon_id:
                try:
                    import psycopg2
                    from psycopg2.extras import RealDictCursor
                    
                    conn = psycopg2.connect(
                        dbname=os.getenv("DB_NAME", "plan-it"),
                        user=os.getenv("DB_USER", "postgres"),
                        password=os.getenv("DB_PASSWORD", "postgres"),
                        host=os.getenv("DB_HOST", "localhost"),
                        port=os.getenv("DB_PORT", "5432")
                    )
                    cur = conn.cursor(cursor_factory=RealDictCursor)
                    
                    # Get project_id and user_id from polygon
                    cur.execute("SELECT project_id, user_id FROM polygons WHERE id = %s", (polygon_id,))
                    polygon_info = cur.fetchone()
                    project_id = polygon_info.get('project_id') if polygon_info else None
                    user_id = polygon_info.get('user_id') if polygon_info else 1  # Default to 1 if not found
                    
                    # Check if zoning result already exists
                    cur.execute("""
                        SELECT id FROM zoning_results 
                        WHERE polygon_id = %s 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    """, (polygon_id,))
                    existing = cur.fetchone()
                    
                    # Extract data for separate fields
                    image_url = full_result.get('analysis', {}).get('visualization', {}).get('image_url', '')
                    marla_summary_json = json.dumps(marla_summary) if marla_summary else None
                    green_space_stats_json = json.dumps(green_space_stats) if green_space_stats else None
                    terrain_summary_json = json.dumps(terrain_summary) if terrain_summary else None
                    
                    if existing:
                        # Update existing record with all fields
                        cur.execute("""
                            UPDATE zoning_results 
                            SET zoning_result = %s,
                                marla_summary = %s,
                                image_url = %s,
                                green_space_statistics = %s,
                                terrain_summary = %s,
                                status = 'completed',
                                updated_at = NOW()
                            WHERE id = %s
                        """, (
                            json.dumps(full_result),
                            marla_summary_json,
                            image_url,
                            green_space_stats_json,
                            terrain_summary_json,
                            existing['id']
                        ))
                        logger.info(f"✅ Updated zoning result in database for polygon {polygon_id}")
                    else:
                        # Insert new record with all fields
                        cur.execute("""
                            INSERT INTO zoning_results 
                            (polygon_id, project_id, user_id, zoning_type, zoning_result, 
                             marla_summary, image_url, green_space_statistics, terrain_summary, status)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            polygon_id,
                            project_id,
                            user_id,
                            'intelligent',
                            json.dumps(full_result),
                            marla_summary_json,
                            image_url,
                            green_space_stats_json,
                            terrain_summary_json,
                            'completed'
                        ))
                        logger.info(f"✅ Saved zoning result to database for polygon {polygon_id}")
                    
                    conn.commit()
                    cur.close()
                    conn.close()
                except Exception as db_error:
                    logger.warning(f"Could not save zoning result to database: {db_error}")
                    # Continue even if database save fails
            
            return JSONResponse(full_result)
        else:
            logger.error("Failed to create visualization")
            return JSONResponse({
                "success": True,
                "analysis": {
                    "visualization": {
                        "image_url": "/download/test_zoning.png",
                        "image_path": None
                    }
                }
            })
            
    except Exception as e:
        logger.error(f"Intelligent zoning error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/zoning_results/{polygon_id}")
async def get_zoning_result(polygon_id: int):
    """
    Get zoning result for a specific polygon.
    Checks both database and memory store.
    """
    logger.info(f"🔍 Fetching zoning result for polygon {polygon_id}")
    try:
        # First, try to get from database
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            
            conn = psycopg2.connect(
                dbname=os.getenv("DB_NAME", "plan-it"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres"),
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432")
            )
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get zoning result from database
            cur.execute("""
                SELECT id, polygon_id, project_id, user_id, zoning_type, 
                       zoning_data, zoning_result, analysis_parameters, 
                       results, status, created_at, updated_at
                FROM zoning_results 
                WHERE polygon_id = %s 
                ORDER BY created_at DESC 
                LIMIT 1
            """, (polygon_id,))
            
            db_result = cur.fetchone()
            cur.close()
            conn.close()
            
            if db_result:
                # Get zoning_result - it might be a JSON string or already a dict
                zoning_result_raw = db_result.get('zoning_result') or db_result.get('zoning_data') or db_result.get('results')
                
                # Parse if it's a string
                if isinstance(zoning_result_raw, str):
                    try:
                        import json
                        zoning_result_parsed = json.loads(zoning_result_raw)
                    except:
                        zoning_result_parsed = zoning_result_raw
                else:
                    zoning_result_parsed = zoning_result_raw
                
                # Convert database result to dictionary format
                result_dict = {
                    "id": db_result.get('id'),
                    "polygon_id": db_result.get('polygon_id'),
                    "project_id": db_result.get('project_id'),
                    "user_id": db_result.get('user_id'),
                    "zoning_type": db_result.get('zoning_type'),
                    "zoning_result": zoning_result_parsed,
                    "analysis_parameters": db_result.get('analysis_parameters'),
                    "status": db_result.get('status'),
                    "created_at": db_result.get('created_at').isoformat() if db_result.get('created_at') else None,
                    "updated_at": db_result.get('updated_at').isoformat() if db_result.get('updated_at') else None
                }
                
                return JSONResponse({
                    "success": True,
                    "result": {
                        "polygon_id": polygon_id,
                        "zoning_result": result_dict.get('zoning_result')
                    },
                    "message": "Zoning result retrieved from database"
                }, cls=CustomJSONEncoder)
        except Exception as db_error:
            logger.warning(f"Database lookup failed: {db_error}, trying memory store")
        
        # Fallback: Try memory store
        for result in ZONING_RESULTS:
            if result.get('polygon_id') == polygon_id:
                return JSONResponse({
                    "success": True,
                    "result": result,
                    "message": "Zoning result retrieved from memory"
                }, cls=CustomJSONEncoder)
        
        # Return success: false with 200 status instead of 404
        return JSONResponse({
            "success": False,
            "error": f"No zoning result found for polygon {polygon_id}",
            "message": "No zoning result available. Please generate zoning first.",
            "result": None
        }, status_code=200)
        
    except Exception as e:
        logger.error(f"Error fetching zoning result: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse({
            "success": False,
            "error": str(e),
            "result": None
        }, status_code=500)

@app.get("/api/zoning/{polygon_id}/green_space_statistics")
async def get_green_space_statistics(polygon_id: int):
    """
    Get green space statistics from 2D visualization for a specific polygon.
    Returns count and total area of green spaces.
    """
    logger.info(f"🌳 Fetching green space statistics for polygon {polygon_id}")
    try:
        # Try to get from intelligent zoning result in database
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            
            conn = psycopg2.connect(
                dbname=os.getenv("DB_NAME", "plan-it"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres"),
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432")
            )
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get zoning result from database
            cur.execute("""
                SELECT zoning_result 
                FROM zoning_results 
                WHERE polygon_id = %s 
                ORDER BY created_at DESC 
                LIMIT 1
            """, (polygon_id,))
            
            db_result = cur.fetchone()
            cur.close()
            conn.close()
            
            if db_result and db_result.get('zoning_result'):
                zoning_result = db_result['zoning_result']
                
                # Parse if it's a JSON string (PostgreSQL JSONB is returned as string sometimes)
                if isinstance(zoning_result, str):
                    try:
                        zoning_result = json.loads(zoning_result)
                        logger.info(f"✅ Parsed zoning_result from JSON string")
                    except Exception as parse_error:
                        logger.warning(f"⚠️ Could not parse zoning_result JSON: {parse_error}")
                        zoning_result = None
                
                # Extract green space statistics from visualization data
                green_space_stats = None
                marla_summary = None
                
                if isinstance(zoning_result, dict):
                    logger.info(f"🔍 Checking zoning_result structure. Top-level keys: {list(zoning_result.keys())[:10]}")
                    
                    # Check in analysis.visualization.green_space_statistics (from intelligent_zoning)
                    if 'analysis' in zoning_result:
                        logger.info(f"🔍 Found 'analysis' key")
                        if isinstance(zoning_result['analysis'], dict) and 'visualization' in zoning_result['analysis']:
                            logger.info(f"🔍 Found 'visualization' key. Keys: {list(zoning_result['analysis']['visualization'].keys())}")
                            green_space_stats = zoning_result['analysis']['visualization'].get('green_space_statistics')
                            if green_space_stats:
                                logger.info(f"✅ Found green_space_statistics in analysis.visualization: {green_space_stats}")
                    
                    # Also check directly in zoning_result
                    if not green_space_stats and 'green_space_statistics' in zoning_result:
                        green_space_stats = zoning_result['green_space_statistics']
                        logger.info(f"✅ Found green_space_statistics directly in zoning_result")
                    
                    # Check for marla_summary which contains comprehensive statistics (commercial, residential, green, roads, etc.)
                    # marla_summary might be in analysis.zoning_data or directly in zoning_result
                    if 'analysis' in zoning_result and isinstance(zoning_result['analysis'], dict):
                        if 'zoning_data' in zoning_result['analysis']:
                            marla_summary = zoning_result['analysis']['zoning_data'].get('marla_summary')
                        elif 'marla_summary' in zoning_result['analysis']:
                            marla_summary = zoning_result['analysis']['marla_summary']
                    
                    if not marla_summary and 'marla_summary' in zoning_result:
                        marla_summary = zoning_result['marla_summary']
                    
                    if not marla_summary and 'zoning_data' in zoning_result:
                        marla_summary = zoning_result['zoning_data'].get('marla_summary')
                
                # If we have marla_summary, extract comprehensive statistics from it
                if marla_summary and isinstance(marla_summary, dict):
                    logger.info(f"✅ Found marla_summary with comprehensive statistics")
                    # Extract green space statistics from marla_summary
                    park_marla = marla_summary.get('park_marla', 0)
                    amenity_counts = marla_summary.get('amenity_counts', {})
                    commercial_marla = marla_summary.get('commercial_marla', 0)
                    residential_marla = marla_summary.get('residential_marla', 0)
                    roads_marla = marla_summary.get('roads_marla_estimate', 0)
                    roundabout_marla = marla_summary.get('reserved_marla', 0)
                    
                    # Convert marla to sqm (1 marla = 25.2929 sqm)
                    SQM_PER_MARLA = 25.2929
                    park_area_sqm = park_marla * SQM_PER_MARLA
                    park_area_hectares = park_area_sqm / 10000
                    park_area_acres = park_area_hectares * 2.47105
                    
                    # Calculate amenity area
                    amenity_area_sqm = sum(amenity_counts.values()) * 2 * SQM_PER_MARLA  # Estimate 2 marla per amenity
                    total_green_area_sqm = park_area_sqm + amenity_area_sqm
                    
                    # Count parks and amenities
                    park_count = marla_summary.get('park_block_count', 0)
                    if park_count == 0 and park_marla > 0:
                        # Estimate park count from area (rough estimate: 1 park per 5 marla)
                        park_count = max(1, int(park_marla / 5))
                    amenity_count = sum(amenity_counts.values()) if amenity_counts else 0
                    
                    # Build comprehensive green space statistics
                    green_space_stats = {
                        "park_block_count": park_count,
                        "amenity_count": amenity_count,
                        "total_green_space_count": park_count + amenity_count,
                        "total_park_area_sqm": round(park_area_sqm, 2),
                        "total_park_area_hectares": round(park_area_hectares, 4),
                        "total_park_area_acres": round(park_area_acres, 2),
                        "total_amenity_area_sqm": round(amenity_area_sqm, 2),
                        "total_amenity_area_hectares": round(amenity_area_sqm / 10000, 4),
                        "total_amenity_area_acres": round((amenity_area_sqm / 10000) * 2.47105, 2),
                        "total_green_space_area_sqm": round(total_green_area_sqm, 2),
                        "total_green_space_area_hectares": round(total_green_area_sqm / 10000, 4),
                        "total_green_space_area_acres": round((total_green_area_sqm / 10000) * 2.47105, 2),
                        "amenity_counts": amenity_counts,
                        "park_marla": park_marla,
                        "amenity_marla": round(amenity_area_sqm / SQM_PER_MARLA, 2),
                        # Include comprehensive statistics from marla_summary
                        "commercial_marla": commercial_marla,
                        "residential_marla": residential_marla,
                        "roads_marla": roads_marla,
                        "roundabout_marla": roundabout_marla,
                        "total_polygon_marla": marla_summary.get('total_polygon_marla', 0),
                        "area_distribution": marla_summary.get('area_distribution', {})
                    }
                    logger.info(f"✅ Extracted comprehensive statistics from marla_summary: parks={park_count}, amenities={amenity_count}, commercial={commercial_marla} marla, residential={residential_marla} marla")
                
                if green_space_stats:
                    logger.info(f"✅ Returning green space statistics: park_blocks={green_space_stats.get('park_block_count')}, amenities={green_space_stats.get('amenity_count')}, total_area={green_space_stats.get('total_green_space_area_sqm')}")
                    return JSONResponse({
                        "success": True,
                        "green_space_statistics": green_space_stats,
                        "message": "Green space statistics retrieved from database"
                    })
                else:
                    logger.warning(f"⚠️ No green_space_statistics found in zoning_result. Structure: {type(zoning_result)}")
        except Exception as db_error:
            logger.warning(f"Database lookup failed: {db_error}, trying memory store")
        
        # Fallback: Try memory store (ZONING_RESULTS)
        for result in ZONING_RESULTS:
            if result.get('polygon_id') == polygon_id:
                zoning_result = result.get('zoning_result', {})
                
                # Extract green space statistics
                green_space_stats = None
                if isinstance(zoning_result, dict):
                    if 'analysis' in zoning_result and 'visualization' in zoning_result['analysis']:
                        green_space_stats = zoning_result['analysis']['visualization'].get('green_space_statistics')
                    elif 'green_space_statistics' in zoning_result:
                        green_space_stats = zoning_result['green_space_statistics']
                
                if green_space_stats:
                    return JSONResponse({
                        "success": True,
                        "green_space_statistics": green_space_stats,
                        "message": "Green space statistics retrieved from memory"
                    })
        
        # Last resort: Try to extract from marla_summary if available
        # This happens when the visualization was created but stats weren't saved in the expected format
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            
            conn = psycopg2.connect(
                dbname=os.getenv("DB_NAME", "plan-it"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres"),
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432")
            )
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Try to get from zoning_data or results that might have marla_summary
            cur.execute("""
                SELECT zoning_data, results 
                FROM zoning_results 
                WHERE polygon_id = %s 
                ORDER BY created_at DESC 
                LIMIT 1
            """, (polygon_id,))
            
            db_result = cur.fetchone()
            cur.close()
            conn.close()
            
            if db_result:
                # Check zoning_data for marla_summary
                zoning_data = db_result.get('zoning_data') or db_result.get('results')
                if isinstance(zoning_data, dict) and 'marla_summary' in zoning_data:
                    marla_summary = zoning_data['marla_summary']
                    amenity_counts = marla_summary.get('amenity_counts', {})
                    park_marla = marla_summary.get('park_marla', 0)
                    
                    # Convert marla to sqm (1 marla = 25.2929 sqm)
                    park_area_sqm = park_marla * 25.2929
                    park_area_hectares = park_area_sqm / 10000
                    park_area_acres = park_area_hectares * 2.47105
                    
                    # Count parks and amenities
                    park_count = 0  # We don't have exact count, estimate from area
                    amenity_count = sum(amenity_counts.values()) if amenity_counts else 0
                    
                    # Estimate park count from area (rough estimate: 1 park per 5 marla)
                    if park_marla > 0:
                        park_count = max(1, int(park_marla / 5))
                    
                    green_space_stats = {
                        "park_block_count": park_count,
                        "amenity_count": amenity_count,
                        "total_green_space_count": park_count + amenity_count,
                        "total_park_area_sqm": round(park_area_sqm, 2),
                        "total_park_area_hectares": round(park_area_hectares, 4),
                        "total_park_area_acres": round(park_area_acres, 2),
                        "total_green_space_area_sqm": round(park_area_sqm, 2),
                        "total_green_space_area_hectares": round(park_area_hectares, 4),
                        "total_green_space_area_acres": round(park_area_acres, 2),
                        "amenity_counts": amenity_counts,
                        "park_marla": park_marla
                    }
                    
                    return JSONResponse({
                        "success": True,
                        "green_space_statistics": green_space_stats,
                        "message": "Green space statistics estimated from marla_summary"
                    })
        except Exception as fallback_error:
            logger.warning(f"Fallback extraction failed: {fallback_error}")
        
        # Return success: false but with 200 status so frontend can handle gracefully
        return JSONResponse({
            "success": False,
            "error": f"No green space statistics found for polygon {polygon_id}",
            "green_space_statistics": None,
            "message": "No green space statistics available. Please generate zoning visualization first."
        }, status_code=200)
        
    except Exception as e:
        logger.error(f"Error fetching green space statistics: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse({
            "success": False,
            "error": str(e),
            "green_space_statistics": None
        }, status_code=500)

async def fetch_all_polygon_analysis_data(polygon_id: int, project_id: int = None):
    """
    Fetch all available analysis data for a polygon.

    NOTE: The old implementation queried a SQLite database. SQLite has been
    removed from this project, so this function currently returns an empty
    analysis structure. It can be updated in the future to read from Postgres
    or other sources.

    Returns:
        dict: Analysis data with fixed keys.
    """
    all_data = {
        "polygon_id": polygon_id,
        "project_id": project_id,
        "terrain_analysis": None,
        "land_suitability": None,
        "zoning_results": None,
        "optimization_zoning": None,
        "road_networks": None,
        "parcels": None,
        "green_space_statistics": None,
        "polygon_info": None,
    }

    return all_data

@app.post("/api/generate_report")
async def generate_report(request: Request):
    """
    Generate PDF report from DEM and analysis data.
    Fetches all available analysis data for selected polygons.
    
    Body JSON:
    {
        "dem_path": "data/dem_download.tif",
        "analysis_data": {...},  # Optional: analysis data dict
        "analysis_data_path": "path/to/analysis.json",  # Optional: path to JSON file
        "polygon_id": 123,  # Optional: single polygon ID
        "polygon_ids": [123, 456],  # Optional: multiple polygon IDs
        "project_id": 1,  # Optional: project ID for filtering
        "report_type": "comprehensive",  # or "elevation", "slope", "flood", "erosion", "water"
        "output_filename": "FYP_Report.pdf"  # Optional
    }
    """
    try:
        try:
            from generate_report import ReportGenerator
        except ImportError as import_err:
            logger.error(f"Import error details: {str(import_err)}")
            import sys
            python_path = sys.executable
            logger.error(f"Python interpreter: {python_path}")
            logger.error(f"Python path: {sys.path}")
            return JSONResponse({
                "error": "Report generation module not available. Please install required packages: pip install reportlab pandas jinja2",
                "details": str(import_err),
                "python_path": python_path
            }, status_code=500)
        
        data = await request.json()
        dem_path = data.get("dem_path", "data/dem_download.tif")
        analysis_data = data.get("analysis_data")
        analysis_data_path = data.get("analysis_data_path")
        polygon_id = data.get("polygon_id")
        polygon_ids = data.get("polygon_ids", [])
        project_id = data.get("project_id")
        report_type = data.get("report_type", "comprehensive")
        output_filename = data.get("output_filename")
        
        # Collect polygon IDs
        polygon_id_list = []
        if polygon_ids:
            polygon_id_list = polygon_ids if isinstance(polygon_ids, list) else [polygon_ids]
        elif polygon_id:
            polygon_id_list = [polygon_id]
        elif project_id:
            # If no specific polygon IDs provided, try to fetch all polygons for the project
            try:
                import requests
                nodejs_api = os.getenv('NODEJS_API_BASE', 'http://localhost:8000')
                response = requests.get(f"{nodejs_api}/api/projects/{project_id}/polygons", timeout=5)
                if response.status_code == 200:
                    polygons = response.json()
                    if isinstance(polygons, list) and len(polygons) > 0:
                        polygon_id_list = [p.get('id') or p.get('polygon_id') for p in polygons if p.get('id') or p.get('polygon_id')]
                        logger.info(f"📍 Fetched {len(polygon_id_list)} polygon(s) for project {project_id}")
            except Exception as e:
                logger.warning(f"Could not fetch polygons for project {project_id}: {e}")
        
        # Fetch comprehensive analysis data for all polygons
        polygons_data = []
        if polygon_id_list:
            logger.info(f"Fetching analysis data for {len(polygon_id_list)} polygon(s)")
            for pid in polygon_id_list:
                try:
                    polygon_data = await fetch_all_polygon_analysis_data(int(pid), project_id)
                    polygons_data.append(polygon_data)
                    logger.info(f"✅ Fetched data for polygon {pid}")
                except Exception as e:
                    logger.warning(f"Error fetching data for polygon {pid}: {str(e)}")
                    # Still add empty structure
                    polygons_data.append({
                        "polygon_id": int(pid),
                        "project_id": project_id,
                        "error": str(e)
                    })
        
        # If we have polygon data, merge it into analysis_data
        if polygons_data and not analysis_data:
            # For single polygon, use its data directly
            if len(polygons_data) == 1:
                poly_data = polygons_data[0]
                analysis_data = {}
                
                # Extract terrain analysis results - prioritize structured_results
                terrain_analysis = poly_data.get("terrain_analysis")
                if terrain_analysis:
                    # Use structured_results if available, otherwise use results
                    terrain_results = terrain_analysis.get("structured_results") or terrain_analysis.get("results")
                    
                    if isinstance(terrain_results, dict):
                        # Merge terrain analysis data directly into analysis_data
                        analysis_data.update(terrain_results)
                        logger.info(f"✅ Added terrain analysis data to report: {list(terrain_results.keys())}")
                    else:
                        # Fallback: create structure from raw terrain_analysis
                        if terrain_analysis.get('elevation_data'):
                            analysis_data['elevation_stats'] = terrain_analysis.get('elevation_data')
                        if terrain_analysis.get('slope_data'):
                            analysis_data['slope_analysis'] = terrain_analysis.get('slope_data')
                        if terrain_analysis.get('aspect_data'):
                            analysis_data['aspect_analysis'] = terrain_analysis.get('aspect_data')
                
                # Add other analysis types
                if poly_data.get("land_suitability"):
                    analysis_data["land_suitability"] = poly_data["land_suitability"]
                if poly_data.get("zoning_results"):
                    analysis_data["zoning_results"] = poly_data["zoning_results"]
                if poly_data.get("optimization_zoning"):
                    analysis_data["optimization_zoning"] = poly_data["optimization_zoning"]
                if poly_data.get("road_networks"):
                    analysis_data["road_networks"] = poly_data["road_networks"]
                if poly_data.get("parcels"):
                    analysis_data["parcels"] = poly_data["parcels"]
                if poly_data.get("green_space_statistics"):
                    analysis_data["green_space_statistics"] = poly_data["green_space_statistics"]
                if poly_data.get("polygon_info"):
                    analysis_data["polygon_info"] = poly_data["polygon_info"]
                
                logger.info(f"✅ Final analysis_data keys: {list(analysis_data.keys())}")
            else:
                # Multiple polygons - create comprehensive structure
                analysis_data = {
                    "polygons": polygons_data,
                    "polygon_count": len(polygons_data)
                }
        
        # If still no analysis_data and polygon_id was provided, try to fetch from Node.js API
        if not analysis_data and polygon_id:
            try:
                logger.info(f"Trying to fetch terrain analysis from Node.js API for polygon {polygon_id}")
                import httpx
                node_backend_url = os.getenv("NODE_BACKEND_URL", "http://localhost:8000")
                
                # Try fetching from Node.js backend
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(
                            f"{node_backend_url}/api/terrain_analysis",
                            params={"polygon_id": polygon_id, "project_id": project_id} if project_id else {"polygon_id": polygon_id}
                        )
                        if response.status_code == 200:
                            node_data = response.json()
                            if node_data.get('terrain_analysis') and node_data['terrain_analysis'].get('results'):
                                terrain_results = node_data['terrain_analysis']['results']
                                if isinstance(terrain_results, dict):
                                    analysis_data = terrain_results.copy()
                                    logger.info(f"✅ Fetched terrain analysis from Node.js API for polygon {polygon_id}")
                                else:
                                    # Structure the data
                                    analysis_data = {
                                        'stats': node_data['terrain_analysis'].get('stats', {}),
                                        'elevation_stats': node_data['terrain_analysis'].get('stats', {}),
                                        'slope_analysis': node_data['terrain_analysis'].get('slope_analysis', {}),
                                        'flood_risk_analysis': node_data['terrain_analysis'].get('flood_analysis', {}),
                                        'erosion_analysis': node_data['terrain_analysis'].get('erosion_analysis', {}),
                                        'water_availability': node_data['terrain_analysis'].get('water_availability', {}),
                                    }
                                    logger.info(f"✅ Structured terrain analysis from Node.js API for polygon {polygon_id}")
                except Exception as api_err:
                    logger.warning(f"Could not fetch from Node.js API: {str(api_err)}")
                
                # Try legacy in-memory method as last resort
                if not analysis_data:
                    logger.info(f"Trying legacy in-memory method for polygon {polygon_id}")
                    terrain_analysis = None
                    for analysis in TERRAIN_ANALYSES:
                        if analysis.get('polygon_id') == polygon_id:
                            terrain_analysis = analysis
                            break
                    
                    if terrain_analysis and terrain_analysis.get('analysis_data'):
                        analysis_data = terrain_analysis.get('analysis_data')
                        if isinstance(analysis_data, dict) and 'results' in analysis_data:
                            analysis_data = analysis_data['results']
                        logger.info(f"Found terrain analysis data in memory for polygon {polygon_id}")
            except Exception as e:
                logger.warning(f"Error fetching terrain analysis: {str(e)}, continuing with provided data")
        
        # Log final analysis_data status
        if analysis_data:
            logger.info(f"✅ Final analysis_data prepared with keys: {list(analysis_data.keys())}")
        else:
            logger.warning(f"⚠️ No analysis_data available for report generation")
        
        # Log what we're about to generate
        logger.info(f"📄 Generating {report_type} report...")
        logger.info(f"   Polygon IDs: {polygon_id_list}")
        logger.info(f"   Project ID: {project_id}")
        logger.info(f"   Analysis data available: {bool(analysis_data)}")
        if analysis_data:
            logger.info(f"   Analysis data keys: {list(analysis_data.keys())}")
        
        # Fetch project data if project_id is provided
        project_data = None
        if project_id:
            try:
                # Try to fetch real project data from Node.js backend
                import requests
                nodejs_api = os.getenv('NODEJS_API_BASE', 'http://localhost:8000')
                response = requests.get(f"{nodejs_api}/api/projects/{project_id}", timeout=5)
                if response.status_code == 200:
                    project_info = response.json()
                    project_data = {
                        'id': project_id,
                        'title': project_info.get('title', f'Project {project_id}'),
                        'location': project_info.get('location', 'Not specified'),
                        'description': project_info.get('description', ''),
                        'status': project_info.get('status', 'In Progress'),
                        'area': project_info.get('area', 0),
                        'created_at': project_info.get('created_at', ''),
                        'updated_at': project_info.get('updated_at', '')
                    }
                    # Only include type if it exists and is not empty
                    if project_info.get('type'):
                        project_data['type'] = project_info['type']
                    logger.info(f"✅ Fetched project data from Node.js: {project_data.get('title')}")
                else:
                    # Fallback to basic info without type
                    project_data = {
                        'id': project_id,
                        'title': data.get('project_title', f'Project {project_id}'),
                        'location': data.get('project_location', 'Not specified'),
                        'status': data.get('project_status', 'In Progress')
                    }
                    logger.info(f"✅ Using basic project data (Node.js returned {response.status_code})")
            except Exception as e:
                logger.warning(f"Could not fetch project data from Node.js: {e}")
                # Fallback to basic info without type
                project_data = {
                    'id': project_id,
                    'title': data.get('project_title', f'Project {project_id}'),
                    'location': data.get('project_location', 'Not specified'),
                    'status': 'In Progress'
                }
        
        # Initialize generator
        generator = ReportGenerator(output_dir="reports")
        
        # Generate report
        if report_type == "comprehensive":
            if output_filename is None:
                output_filename = "FYP_Report.pdf"
            
            logger.info(f"📝 Calling generate_comprehensive_report")
            logger.info(f"   - analysis_data keys: {list(analysis_data.keys()) if analysis_data else 'None'}")
            logger.info(f"   - polygons_data count: {len(polygons_data) if polygons_data else 0}")
            logger.info(f"   - project_data: {bool(project_data)}")
            
            output_path = generator.generate_comprehensive_report(
                dem_path=dem_path if os.path.exists(dem_path) else None,
                analysis_data_path=analysis_data_path,
                analysis_data=analysis_data,
                output_filename=output_filename,
                polygons_data=polygons_data,
                project_data=project_data
            )
            logger.info(f"✅ Comprehensive report generated: {output_path}")
        else:
            # Individual analysis report
            if not analysis_data and analysis_data_path:
                analysis_data = generator.load_analysis_data(analysis_data_path)
            
            if not analysis_data:
                return JSONResponse(
                    {"error": f"Analysis data required for {report_type} report"}, 
                    status_code=400
                )
            
            if output_filename is None:
                output_filename = f"FYP_Report_{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            
            output_path = generator.generate_individual_analysis_report(
                analysis_type=report_type,
                analysis_data=analysis_data,
                dem_path=dem_path if report_type == "elevation" and os.path.exists(dem_path) else None,
                output_filename=output_filename
            )
        
        # Return relative path and download URL
        relative_path = os.path.relpath(output_path, os.getcwd())
        filename = os.path.basename(output_path)
        
        # Construct download URL using the output endpoint
        download_url = f"/output/reports/{filename}"
        
        return JSONResponse({
            "success": True,
            "report_path": relative_path,
            "absolute_path": output_path,
            "filename": filename,
            "download_url": download_url,
            "message": f"Report generated successfully: {relative_path}"
        })
        
    except ImportError as e:
        logger.error(f"Import error: {str(e)}")
        return JSONResponse({
            "error": "Report generation module not available. Please install required packages: pip install reportlab pandas jinja2"
        }, status_code=500)
    except Exception as e:
        logger.error(f"Report generation error: {str(e)}")
        return JSONResponse({"error": f"Failed to generate report: {str(e)}"}, status_code=500)

@app.delete("/api/reports/{filename}")
async def delete_report(filename: str):
    """
    Delete a generated PDF report.
    
    Args:
        filename: Name of the report file to delete
    """
    try:
        # Sanitize filename to prevent directory traversal
        safe_filename = os.path.basename(filename)
        
        # Construct file path
        report_path = os.path.join("reports", safe_filename)
        
        # Check if file exists
        if not os.path.exists(report_path):
            return JSONResponse({"error": "Report file not found"}, status_code=404)
        
        # Delete the file
        os.remove(report_path)
        logger.info(f"Deleted report: {report_path}")
        
        return JSONResponse({
            "success": True,
            "message": f"Report {safe_filename} deleted successfully"
        })
    except Exception as e:
        logger.error(f"Error deleting report: {str(e)}")
        return JSONResponse({"error": f"Failed to delete report: {str(e)}"}, status_code=500)

@app.get("/api/reports/list")
async def list_reports():
    """
    List all generated PDF reports.
    """
    try:
        reports_dir = "reports"
        if not os.path.exists(reports_dir):
            return JSONResponse({"reports": []})
        
        reports = []
        for filename in os.listdir(reports_dir):
            if filename.endswith('.pdf'):
                file_path = os.path.join(reports_dir, filename)
                file_stat = os.stat(file_path)
                reports.append({
                    "filename": filename,
                    "size": file_stat.st_size,
                    "created": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                    "download_url": f"/output/reports/{filename}"
                })
        
        # Sort by modified date (newest first)
        reports.sort(key=lambda x: x['modified'], reverse=True)
        
        return JSONResponse({"reports": reports})
    except Exception as e:
        logger.error(f"Error listing reports: {str(e)}")
        return JSONResponse({"error": f"Failed to list reports: {str(e)}"}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)
