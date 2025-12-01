#!/usr/bin/env python3
"""
Terrain Analysis Standards and References
Based on established engineering and scientific standards
"""

# =============================================================================
# SLOPE CLASSIFICATION STANDARDS
# =============================================================================

# USGS Terrain Classification (Professional Paper 1394)
USGS_SLOPE_CLASSES = {
    "nearly_level": {"min": 0, "max": 3, "description": "Nearly level"},
    "gently_sloping": {"min": 3, "max": 8, "description": "Gently sloping"},
    "moderately_sloping": {"min": 8, "max": 15, "description": "Moderately sloping"},
    "strongly_sloping": {"min": 15, "max": 25, "description": "Strongly sloping"},
    "moderately_steep": {"min": 25, "max": 35, "description": "Moderately steep"},
    "steep": {"min": 35, "max": 50, "description": "Steep"},
    "very_steep": {"min": 50, "max": 100, "description": "Very steep"}
}

# FEMA Building Guidelines (FEMA 154, 155)
FEMA_CONSTRUCTION_LIMITS = {
    "suitable": {"max_slope": 15, "description": "Suitable for most construction"},
    "engineered": {"min_slope": 15, "max_slope": 30, "description": "Requires engineered foundations"},
    "limited": {"min_slope": 30, "max_slope": 45, "description": "Limited development potential"},
    "avoid": {"min_slope": 45, "description": "Avoid construction - high risk"}
}

# =============================================================================
# FLOOD RISK STANDARDS
# =============================================================================

# FEMA Flood Zone Classifications
FEMA_FLOOD_ZONES = {
    "high_risk": {"max_elevation": 2.0, "description": "100-year floodplain"},
    "moderate_risk": {"min_elevation": 2.0, "max_elevation": 5.0, "description": "500-year floodplain"},
    "low_risk": {"min_elevation": 5.0, "description": "Above flood risk"}
}

# =============================================================================
# EROSION ANALYSIS STANDARDS
# =============================================================================

# Universal Soil Loss Equation (USLE) Factors
# Source: USDA-NRCS Technical Release 55
USLE_FACTORS = {
    "slope_factor": {
        "description": "LS factor from USLE equation",
        "formula": "LS = (λ/22.13)^m * (sin(β)/0.0896)^n",
        "where": "λ=slope length, β=slope angle, m=0.5, n=1.0"
    },
    "critical_slopes": {
        "moderate_erosion": 15,  # degrees
        "high_erosion": 30,      # degrees
        "severe_erosion": 45     # degrees
    }
}

# =============================================================================
# ZONING STANDARDS
# =============================================================================

# International Building Code (IBC) Slope Requirements
IBC_SLOPE_REQUIREMENTS = {
    "residential": {"max_slope": 25, "description": "Maximum slope for residential development"},
    "commercial": {"max_slope": 20, "description": "Maximum slope for commercial development"},
    "industrial": {"max_slope": 15, "description": "Maximum slope for industrial development"}
}

# =============================================================================
# ENVIRONMENTAL STANDARDS
# =============================================================================

# EPA Environmental Guidelines
EPA_ENVIRONMENTAL_FACTORS = {
    "wetland_threshold": 1.0,  # meters above sea level
    "riparian_buffer": 30,     # meters from water bodies
    "steep_slope_protection": 25  # degrees - requires protection
}

# =============================================================================
# IMPLEMENTATION FUNCTIONS
# =============================================================================

def classify_slope_usgs(slope_degrees):
    """Classify slope according to USGS standards"""
    for class_name, limits in USGS_SLOPE_CLASSES.items():
        if limits["min"] <= slope_degrees < limits["max"]:
            return {
                "class": class_name,
                "description": limits["description"],
                "standard": "USGS Professional Paper 1394"
            }
    return {"class": "undefined", "description": "Outside USGS classification"}

def assess_construction_feasibility(slope_degrees):
    """Assess construction feasibility per FEMA guidelines"""
    for category, limits in FEMA_CONSTRUCTION_LIMITS.items():
        if "max_slope" in limits and slope_degrees <= limits["max_slope"]:
            return {
                "category": category,
                "description": limits["description"],
                "standard": "FEMA 154/155"
            }
        elif "min_slope" in limits and slope_degrees >= limits["min_slope"]:
            return {
                "category": category,
                "description": limits["description"],
                "standard": "FEMA 154/155"
            }
    return {"category": "undefined", "description": "Outside FEMA guidelines"}

def assess_flood_risk_fema(elevation_meters):
    """Assess flood risk per FEMA standards"""
    for zone, limits in FEMA_FLOOD_ZONES.items():
        if "max_elevation" in limits and elevation_meters <= limits["max_elevation"]:
            return {
                "zone": zone,
                "description": limits["description"],
                "standard": "FEMA Flood Insurance Rate Maps"
            }
        elif "min_elevation" in limits and elevation_meters >= limits["min_elevation"]:
            return {
                "zone": zone,
                "description": limits["description"],
                "standard": "FEMA Flood Insurance Rate Maps"
            }
    return {"zone": "undefined", "description": "Outside FEMA classification"}

def calculate_usle_slope_factor(slope_degrees, slope_length_meters=100):
    """Calculate USLE slope factor (LS)"""
    import math
    
    # Convert degrees to radians
    slope_radians = math.radians(slope_degrees)
    
    # USLE LS factor calculation
    # LS = (λ/22.13)^m * (sin(β)/0.0896)^n
    # where λ=slope length, β=slope angle, m=0.5, n=1.0
    
    m = 0.5  # slope length exponent
    n = 1.0  # slope steepness exponent
    
    ls_factor = ((slope_length_meters / 22.13) ** m) * ((math.sin(slope_radians) / 0.0896) ** n)
    
    return {
        "ls_factor": ls_factor,
        "slope_length": slope_length_meters,
        "slope_angle": slope_degrees,
        "standard": "USDA-NRCS Technical Release 55"
    }

# =============================================================================
# REFERENCES AND SOURCES
# =============================================================================

STANDARDS_REFERENCES = {
    "USGS": {
        "title": "Terrain Classification",
        "source": "USGS Professional Paper 1394",
        "url": "https://pubs.usgs.gov/pp/1394/"
    },
    "FEMA": {
        "title": "Building Guidelines",
        "source": "FEMA 154, 155 - Rapid Visual Screening",
        "url": "https://www.fema.gov/emergency-managers/risk-management/building-science"
    },
    "USLE": {
        "title": "Universal Soil Loss Equation",
        "source": "USDA-NRCS Technical Release 55",
        "url": "https://www.nrcs.usda.gov/wps/portal/nrcs/detail/national/technical/nra/rca/?cid=nrcs143_026849"
    },
    "IBC": {
        "title": "International Building Code",
        "source": "International Code Council",
        "url": "https://www.iccsafe.org/"
    },
    "EPA": {
        "title": "Environmental Guidelines",
        "source": "EPA Environmental Protection Guidelines",
        "url": "https://www.epa.gov/"
    }
}

if __name__ == "__main__":
    # Example usage
    print("Terrain Analysis Standards")
    print("=" * 50)
    
    # Test slope classification
    test_slopes = [5, 15, 25, 35, 50]
    for slope in test_slopes:
        usgs_class = classify_slope_usgs(slope)
        fema_assessment = assess_construction_feasibility(slope)
        print(f"Slope {slope}°: {usgs_class['description']} | {fema_assessment['description']}")
    
    print("\nStandards References:")
    for org, ref in STANDARDS_REFERENCES.items():
        print(f"{org}: {ref['title']} - {ref['source']}")

