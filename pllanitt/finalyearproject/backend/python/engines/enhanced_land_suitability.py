"""
Enhanced Land Suitability Analysis Engine
Professional-grade multi-criteria evaluation for land development

Features:
- Multi-factor terrain analysis (20+ parameters)
- Development-type specific scoring
- Intelligent warning system with confidence levels
- Real data integration (DEM, soil, hydrology, infrastructure)
- Regulatory compliance checking
- Actionable mitigation recommendations
"""

import numpy as np
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class WarningSeverity(Enum):
    """Warning severity levels"""
    CRITICAL = "CRITICAL"  # Development blocked
    HIGH_RISK = "HIGH_RISK"  # Requires mitigation
    MODERATE = "MODERATE"  # Design adjustments needed
    INFORMATIONAL = "INFORMATIONAL"  # Helpful info


class DevelopmentType(Enum):
    """Types of development"""
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    AGRICULTURE = "agriculture"
    GREEN_SPACE = "green_space"
    MIXED_USE = "mixed_use"


@dataclass
class TerrainFeatures:
    """Comprehensive terrain feature set"""
    # Elevation & Topography
    elevation_mean: float
    elevation_std: float
    elevation_range: float
    slope_mean: float
    slope_std: float
    slope_max: float
    aspect_mean: float
    curvature: float
    tpi: float  # Topographic Position Index
    tri: float  # Terrain Ruggedness Index
    
    # Hydrological
    flow_accumulation: float
    twi: float  # Topographic Wetness Index
    drainage_density: float
    flood_risk_score: float
    water_table_proximity: float
    
    # Soil (if available)
    soil_type: Optional[str] = None
    bearing_capacity: Optional[float] = None
    permeability: Optional[float] = None
    erosion_risk: Optional[float] = None
    soil_ph: Optional[float] = None
    
    # Accessibility
    distance_to_roads: float = 1000.0
    distance_to_utilities: float = 1500.0
    distance_to_settlements: float = 5000.0
    connectivity_index: float = 0.5
    
    # Environmental
    vegetation_cover: float = 0.3
    protected_area_distance: float = 5000.0
    biodiversity_index: float = 0.5
    land_cover_type: Optional[str] = None


@dataclass
class SuitabilityWarning:
    """Structured warning with actionable information"""
    severity: WarningSeverity
    category: str
    message: str
    impact: str
    location: Optional[Dict] = None
    mitigation: Optional[Dict] = None
    cost_estimate: Optional[str] = None
    confidence: float = 1.0


@dataclass
class SuitabilityResult:
    """Complete suitability analysis result"""
    score: float  # 0-1
    classification: str  # Low/Medium/High/Very High
    confidence: float  # 0-1
    warnings: List[SuitabilityWarning] = field(default_factory=list)
    opportunities: List[Dict] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    constraint_map: Optional[np.ndarray] = None
    suitability_map: Optional[np.ndarray] = None
    factor_contributions: Dict[str, float] = field(default_factory=dict)


class EnhancedLandSuitabilityAnalyzer:
    """
    Professional land suitability analyzer with multi-criteria evaluation
    """
    
    # Development-specific requirements
    DEVELOPMENT_PROFILES = {
        DevelopmentType.RESIDENTIAL: {
            'optimal_slope': (0, 10),
            'max_slope': 15,
            'min_elevation': 50,
            'max_elevation': 1500,
            'flood_tolerance': 0.1,  # Very low
            'soil_bearing_min': 150,  # kPa
            'access_weight': 0.15,
            'utilities_weight': 0.12,
            'environmental_weight': 0.08,
        },
        DevelopmentType.COMMERCIAL: {
            'optimal_slope': (0, 5),
            'max_slope': 8,
            'flood_tolerance': 0.05,
            'soil_bearing_min': 200,
            'access_weight': 0.20,  # Critical
            'visibility_weight': 0.15,
            'utilities_weight': 0.15,
        },
        DevelopmentType.INDUSTRIAL: {
            'optimal_slope': (0, 8),
            'max_slope': 12,
            'flood_tolerance': 0.20,
            'soil_bearing_min': 250,
            'heavy_load_capacity': True,
            'buffer_zone_required': 500,  # meters
            'access_weight': 0.18,
        },
        DevelopmentType.AGRICULTURE: {
            'optimal_slope': (0, 12),
            'max_slope': 20,
            'soil_quality_weight': 0.30,
            'water_access_weight': 0.25,
            'flood_tolerance': 0.40,
            'irrigation_potential_weight': 0.15,
        },
        DevelopmentType.GREEN_SPACE: {
            'slope_flexible': True,
            'environmental_priority': True,
            'natural_features_preserve': True,
            'biodiversity_weight': 0.25,
        },
    }
    
    def __init__(self, development_type: DevelopmentType = DevelopmentType.RESIDENTIAL):
        """
        Initialize the analyzer
        
        Args:
            development_type: Type of development to analyze for
        """
        self.development_type = development_type
        self.profile = self.DEVELOPMENT_PROFILES.get(development_type, 
                                                      self.DEVELOPMENT_PROFILES[DevelopmentType.RESIDENTIAL])
        logger.info(f"Initialized Enhanced Land Suitability Analyzer for {development_type.value}")
    
    def analyze(self, features: TerrainFeatures, pixel_data: Optional[Dict] = None) -> SuitabilityResult:
        """
        Perform comprehensive suitability analysis
        
        Args:
            features: Extracted terrain features
            pixel_data: Optional pixel-level data for spatial analysis
            
        Returns:
            SuitabilityResult with score, warnings, and recommendations
        """
        logger.info(f"Starting enhanced suitability analysis for {self.development_type.value}")
        
        # 1. Calculate factor scores
        factor_scores = self._calculate_factor_scores(features)
        
        # 2. Apply development-specific weights
        weighted_score = self._apply_development_weights(factor_scores)
        
        # 3. Check constraints and generate warnings
        warnings = self._check_constraints(features)
        
        # 4. Apply constraint penalties
        final_score = self._apply_constraint_penalties(weighted_score, warnings)
        
        # 5. Calculate confidence level
        confidence = self._calculate_confidence(features, factor_scores)
        
        # 6. Classify suitability
        classification = self._classify_suitability(final_score)
        
        # 7. Identify opportunities
        opportunities = self._identify_opportunities(features, factor_scores)
        
        # 8. Generate recommendations
        recommendations = self._generate_recommendations(features, warnings, opportunities)
        
        result = SuitabilityResult(
            score=final_score,
            classification=classification,
            confidence=confidence,
            warnings=warnings,
            opportunities=opportunities,
            recommendations=recommendations,
            factor_contributions=factor_scores
        )
        
        logger.info(f"Analysis complete: Score={final_score:.3f}, Class={classification}, Warnings={len(warnings)}")
        
        return result
    
    def _calculate_factor_scores(self, features: TerrainFeatures) -> Dict[str, float]:
        """Calculate normalized scores for each factor (0-1)"""
        scores = {}
        
        # 1. Slope suitability (lower is generally better)
        if features.slope_mean < self.profile.get('optimal_slope', (0, 10))[1]:
            scores['slope'] = 1.0 - (features.slope_mean / self.profile.get('max_slope', 15))
        else:
            scores['slope'] = max(0, 1.0 - (features.slope_mean - self.profile['optimal_slope'][1]) / 10.0)
        scores['slope'] = max(0, min(1, scores['slope']))
        
        # 2. Elevation suitability (moderate elevations preferred for most development)
        min_elev = self.profile.get('min_elevation', 0)
        max_elev = self.profile.get('max_elevation', 2000)
        optimal_range = (min_elev + 100, max_elev - 500)
        
        if optimal_range[0] <= features.elevation_mean <= optimal_range[1]:
            scores['elevation'] = 1.0
        elif features.elevation_mean < min_elev or features.elevation_mean > max_elev:
            scores['elevation'] = 0.2
        else:
            # Gradual falloff outside optimal range
            if features.elevation_mean < optimal_range[0]:
                scores['elevation'] = 0.6 + 0.4 * (features.elevation_mean - min_elev) / (optimal_range[0] - min_elev)
            else:
                scores['elevation'] = 0.6 + 0.4 * (max_elev - features.elevation_mean) / (max_elev - optimal_range[1])
        
        # 3. Drainage & flood risk (lower flood risk is better)
        scores['flood_risk'] = 1.0 - min(1.0, features.flood_risk_score)
        
        # 4. Topographic suitability (flatter/stable terrain)
        scores['terrain_stability'] = 1.0 - min(1.0, abs(features.curvature) + features.tri / 50.0)
        
        # 5. Drainage quality (TWI - higher TWI can mean poor drainage for buildings)
        # For residential/commercial: lower TWI is better (well-drained)
        # For agriculture: moderate TWI is good
        if self.development_type == DevelopmentType.AGRICULTURE:
            optimal_twi = 7.0
            scores['drainage'] = 1.0 - abs(features.twi - optimal_twi) / 10.0
        else:
            scores['drainage'] = max(0, 1.0 - features.twi / 15.0)
        scores['drainage'] = max(0, min(1, scores['drainage']))
        
        # 6. Accessibility (closer to roads is better)
        if features.distance_to_roads < 500:
            scores['accessibility'] = 1.0
        elif features.distance_to_roads < 2000:
            scores['accessibility'] = 1.0 - (features.distance_to_roads - 500) / 1500
        else:
            scores['accessibility'] = max(0.2, 1.0 - features.distance_to_roads / 5000)
        
        # 7. Utilities proximity
        if features.distance_to_utilities < 1000:
            scores['utilities'] = 1.0
        else:
            scores['utilities'] = max(0.3, 1.0 - features.distance_to_utilities / 5000)
        
        # 8. Soil quality (if available)
        if features.bearing_capacity is not None:
            min_bearing = self.profile.get('soil_bearing_min', 150)
            if features.bearing_capacity >= min_bearing:
                scores['soil_bearing'] = min(1.0, features.bearing_capacity / (min_bearing * 2))
            else:
                scores['soil_bearing'] = features.bearing_capacity / min_bearing
        else:
            scores['soil_bearing'] = 0.7  # Assume moderate if unknown
        
        # 9. Erosion risk (lower is better)
        if features.erosion_risk is not None:
            scores['erosion_control'] = 1.0 - features.erosion_risk
        else:
            # Estimate from slope
            scores['erosion_control'] = 1.0 - min(1.0, features.slope_mean / 20.0)
        
        # 10. Environmental suitability
        if self.development_type == DevelopmentType.GREEN_SPACE:
            # Higher vegetation and biodiversity is better
            scores['environmental'] = (features.vegetation_cover * 0.5 + 
                                      features.biodiversity_index * 0.5)
        else:
            # Moderate environmental value, not too sensitive
            if features.protected_area_distance < 500:
                scores['environmental'] = 0.3  # Too close to protected area
            elif features.protected_area_distance < 2000:
                scores['environmental'] = 0.7
            else:
                scores['environmental'] = 1.0
        
        return scores
    
    def _apply_development_weights(self, factor_scores: Dict[str, float]) -> float:
        """Apply development-specific weights to factor scores"""
        
        if self.development_type == DevelopmentType.RESIDENTIAL:
            weights = {
                'slope': 0.20,
                'elevation': 0.12,
                'flood_risk': 0.15,
                'terrain_stability': 0.10,
                'drainage': 0.10,
                'accessibility': 0.12,
                'utilities': 0.10,
                'soil_bearing': 0.08,
                'erosion_control': 0.05,
                'environmental': 0.08,
            }
        elif self.development_type == DevelopmentType.COMMERCIAL:
            weights = {
                'slope': 0.25,
                'flood_risk': 0.18,
                'accessibility': 0.20,
                'utilities': 0.15,
                'soil_bearing': 0.10,
                'drainage': 0.07,
                'environmental': 0.05,
            }
        elif self.development_type == DevelopmentType.INDUSTRIAL:
            weights = {
                'slope': 0.18,
                'soil_bearing': 0.20,
                'flood_risk': 0.12,
                'accessibility': 0.18,
                'utilities': 0.12,
                'drainage': 0.10,
                'environmental': 0.05,
                'terrain_stability': 0.05,
            }
        elif self.development_type == DevelopmentType.AGRICULTURE:
            weights = {
                'slope': 0.15,
                'soil_bearing': 0.25,
                'drainage': 0.20,
                'flood_risk': 0.08,
                'elevation': 0.10,
                'accessibility': 0.07,
                'erosion_control': 0.10,
                'environmental': 0.05,
            }
        elif self.development_type == DevelopmentType.GREEN_SPACE:
            weights = {
                'environmental': 0.30,
                'terrain_stability': 0.15,
                'slope': 0.10,
                'drainage': 0.15,
                'flood_risk': 0.10,
                'accessibility': 0.10,
                'erosion_control': 0.10,
            }
        else:
            # Default balanced weights
            weights = {k: 1.0 / len(factor_scores) for k in factor_scores}
        
        # Calculate weighted sum
        weighted_score = 0.0
        total_weight = 0.0
        
        for factor, score in factor_scores.items():
            weight = weights.get(factor, 0.0)
            weighted_score += score * weight
            total_weight += weight
        
        # Normalize
        if total_weight > 0:
            weighted_score /= total_weight
        
        return min(1.0, max(0.0, weighted_score))
    
    def _check_constraints(self, features: TerrainFeatures) -> List[SuitabilityWarning]:
        """Check constraints and generate warnings"""
        warnings = []
        
        # 1. Slope constraints
        max_slope = self.profile.get('max_slope', 15)
        if features.slope_max > 30:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.CRITICAL,
                category="Slope Excessive",
                message=f"Maximum slope {features.slope_max:.1f}° exceeds safe limit (30°)",
                impact="Development not recommended - high landslide risk",
                mitigation={
                    "method": "Extensive terracing and retaining walls required",
                    "cost_range": "$100-200 per sqm",
                    "specialists": ["Geotechnical Engineer", "Structural Engineer"]
                },
                confidence=0.95
            ))
        elif features.slope_mean > max_slope:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.HIGH_RISK,
                category="Slope Management",
                message=f"Average slope {features.slope_mean:.1f}° exceeds optimal range (0-{max_slope}°)",
                impact="Requires significant grading and terracing",
                mitigation={
                    "method": "Stepped terracing with drainage",
                    "cost_range": "$40-80 per sqm",
                    "time": "2-4 months additional prep"
                },
                cost_estimate="$50,000 - $120,000 for 1000 sqm",
                confidence=0.90
            ))
        elif features.slope_mean > max_slope * 0.7:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.MODERATE,
                category="Slope Design",
                message=f"Slope {features.slope_mean:.1f}° requires design adjustments",
                impact="Building layout must account for terrain",
                mitigation={
                    "method": "Stepped foundations and split-level design",
                    "cost_range": "$20-40 per sqm additional"
                },
                confidence=0.85
            ))
        
        # 2. Flood risk
        if features.flood_risk_score > 0.7:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.CRITICAL,
                category="Flood Hazard",
                message=f"High flood risk detected (score: {features.flood_risk_score:.2f})",
                impact="Frequent flooding expected - development not recommended",
                mitigation={
                    "method": "Elevated construction on stilts/piers",
                    "cost_range": "$80-150 per sqm",
                    "compliance": "Requires flood zone construction permit"
                },
                confidence=0.88
            ))
        elif features.flood_risk_score > 0.4:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.HIGH_RISK,
                category="Flood Risk",
                message=f"Moderate flood risk (score: {features.flood_risk_score:.2f})",
                impact="Periodic flooding possible",
                mitigation={
                    "method": "Raise foundation elevation, install drainage",
                    "cost_range": "$30-60 per sqm"
                },
                confidence=0.80
            ))
        
        # 3. Soil bearing capacity (if available)
        if features.bearing_capacity is not None:
            min_bearing = self.profile.get('soil_bearing_min', 150)
            if features.bearing_capacity < min_bearing * 0.5:
                warnings.append(SuitabilityWarning(
                    severity=WarningSeverity.CRITICAL,
                    category="Soil Strength",
                    message=f"Very low soil bearing capacity ({features.bearing_capacity:.0f} kPa)",
                    impact="Insufficient for standard foundations",
                    mitigation={
                        "method": "Deep pile foundations or soil stabilization",
                        "cost_range": "$100-200 per sqm",
                        "specialists": ["Geotechnical Engineer"]
                    },
                    confidence=0.92
                ))
            elif features.bearing_capacity < min_bearing:
                warnings.append(SuitabilityWarning(
                    severity=WarningSeverity.HIGH_RISK,
                    category="Soil Improvement",
                    message=f"Below-standard bearing capacity ({features.bearing_capacity:.0f} kPa < {min_bearing} kPa)",
                    impact="Soil improvement required",
                    mitigation={
                        "method": "Soil compaction or cement stabilization",
                        "cost_range": "$25-50 per sqm"
                    },
                    confidence=0.85
                ))
        
        # 4. Accessibility
        if features.distance_to_roads > 3000:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.HIGH_RISK if self.development_type == DevelopmentType.COMMERCIAL else WarningSeverity.MODERATE,
                category="Access Road Required",
                message=f"Site is {features.distance_to_roads:.0f}m from nearest road",
                impact="Access road construction required",
                cost_estimate=f"${features.distance_to_roads * 150:.0f} - ${features.distance_to_roads * 300:.0f}",
                mitigation={
                    "method": "Construct access road to site",
                    "cost_range": "$150-300 per linear meter"
                },
                confidence=0.95
            ))
        
        # 5. Erosion risk
        if features.erosion_risk is not None and features.erosion_risk > 0.6:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.MODERATE,
                category="Erosion Control",
                message=f"High erosion risk detected ({features.erosion_risk:.2f})",
                impact="Soil loss and foundation undermining risk",
                mitigation={
                    "method": "Vegetation cover, terracing, and drainage control",
                    "cost_range": "$15-30 per sqm"
                },
                confidence=0.75
            ))
        
        # 6. Protected areas
        if features.protected_area_distance < 500:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.CRITICAL,
                category="Protected Zone",
                message=f"Within {features.protected_area_distance:.0f}m of protected area",
                impact="Development may be restricted or prohibited",
                mitigation={
                    "method": "Obtain environmental clearance and impact assessment",
                    "compliance": "Environmental Protection Act compliance required"
                },
                confidence=0.98
            ))
        
        # 7. Water table proximity
        if features.water_table_proximity < 3.0:
            warnings.append(SuitabilityWarning(
                severity=WarningSeverity.HIGH_RISK,
                category="High Water Table",
                message=f"Water table at {features.water_table_proximity:.1f}m depth",
                impact="Basement construction problematic, drainage issues",
                mitigation={
                    "method": "Dewatering system or raised foundations",
                    "cost_range": "$40-80 per sqm"
                },
                confidence=0.80
            ))
        
        return warnings
    
    def _apply_constraint_penalties(self, base_score: float, warnings: List[SuitabilityWarning]) -> float:
        """Apply penalties based on constraint violations"""
        penalty = 0.0
        
        for warning in warnings:
            if warning.severity == WarningSeverity.CRITICAL:
                penalty += 0.40  # Major penalty
            elif warning.severity == WarningSeverity.HIGH_RISK:
                penalty += 0.20
            elif warning.severity == WarningSeverity.MODERATE:
                penalty += 0.08
        
        # Cap penalty at 0.6 (don't reduce score below 0.1 if base was decent)
        penalty = min(0.6, penalty)
        
        final_score = max(0.0, base_score - penalty)
        
        return final_score
    
    def _calculate_confidence(self, features: TerrainFeatures, factor_scores: Dict[str, float]) -> float:
        """Calculate confidence level based on data quality and completeness"""
        confidence_factors = []
        
        # 1. Data completeness
        available_factors = sum([
            1.0 if features.soil_type is not None else 0.0,
            1.0 if features.bearing_capacity is not None else 0.0,
            1.0 if features.erosion_risk is not None else 0.0,
            1.0 if features.land_cover_type is not None else 0.0,
        ])
        data_completeness = 0.7 + 0.3 * (available_factors / 4.0)  # 70-100%
        confidence_factors.append(data_completeness)
        
        # 2. Terrain data quality (always have DEM)
        terrain_confidence = 0.90  # Assuming good DEM quality
        confidence_factors.append(terrain_confidence)
        
        # 3. Analysis consistency (variance in factor scores)
        score_variance = np.var(list(factor_scores.values()))
        consistency = 1.0 - min(0.3, score_variance)  # Lower variance = higher confidence
        confidence_factors.append(consistency)
        
        # Overall confidence
        confidence = np.mean(confidence_factors)
        
        return min(1.0, max(0.5, confidence))  # 50-100% range
    
    def _classify_suitability(self, score: float) -> str:
        """Classify suitability based on score"""
        if score >= 0.80:
            return "Very High Suitability"
        elif score >= 0.65:
            return "High Suitability"
        elif score >= 0.45:
            return "Medium Suitability"
        elif score >= 0.25:
            return "Low Suitability"
        else:
            return "Very Low Suitability"
    
    def _identify_opportunities(self, features: TerrainFeatures, factor_scores: Dict[str, float]) -> List[Dict]:
        """Identify positive opportunities for the site"""
        opportunities = []
        
        # 1. Solar potential (south-facing slopes in northern hemisphere)
        if 135 <= features.aspect_mean <= 225 and features.slope_mean < 30:
            opportunities.append({
                "type": "Solar Energy",
                "message": f"South-facing slope ({features.aspect_mean:.0f}°) optimal for solar panels",
                "potential": "15-20% energy cost reduction",
                "estimated_savings": "$8,000-12,000 per year for residential development"
            })
        
        # 2. Natural drainage
        if factor_scores.get('drainage', 0) > 0.75 and features.twi < 8.0:
            opportunities.append({
                "type": "Natural Drainage",
                "message": "Excellent natural drainage characteristics",
                "benefit": "Reduced stormwater management costs",
                "estimated_savings": "$20,000-40,000 in infrastructure"
            })
        
        # 3. Good accessibility
        if features.distance_to_roads < 500:
            opportunities.append({
                "type": "Excellent Access",
                "message": f"Prime location - only {features.distance_to_roads:.0f}m from main road",
                "benefit": "Minimal access road development needed",
                "time_saving": "2-3 months faster project timeline"
            })
        
        # 4. Views and elevation
        if features.elevation_mean > 500 and features.tpi > 10:
            opportunities.append({
                "type": "Scenic Views",
                "message": "Elevated position with panoramic views",
                "benefit": "20-30% premium on property values"
            })
        
        # 5. Stable terrain
        if factor_scores.get('terrain_stability', 0) > 0.85:
            opportunities.append({
                "type": "Stable Foundation",
                "message": "Low terrain ruggedness - stable building conditions",
                "benefit": "Simplified foundation design",
                "estimated_savings": "$15-25 per sqm in foundation costs"
            })
        
        return opportunities
    
    def _generate_recommendations(self, features: TerrainFeatures, 
                                 warnings: List[SuitabilityWarning],
                                 opportunities: List[Dict]) -> List[str]:
        """Generate actionable development recommendations"""
        recommendations = []
        
        # Priority areas based on slope
        if features.slope_mean < 8:
            recommendations.append("Prioritize flatter areas (< 8°) for main structures")
        else:
            recommendations.append("Use stepped/terraced design to follow natural contours")
        
        # Drainage recommendations
        if features.twi > 10 or features.flood_risk_score > 0.3:
            recommendations.append("Install comprehensive drainage system with retention basins")
            recommendations.append("Elevate structures minimum 0.5m above grade")
        
        # Access recommendations
        if features.distance_to_roads > 1000:
            recommendations.append(f"Plan for {features.distance_to_roads:.0f}m access road construction")
            recommendations.append("Consider shared access with adjacent properties to reduce costs")
        
        # Environmental recommendations
        if features.vegetation_cover > 0.5:
            recommendations.append("Preserve existing vegetation where possible for erosion control")
            recommendations.append("Designate green buffer zones (minimum 20% of site)")
        
        # Development phasing
        critical_warnings = [w for w in warnings if w.severity == WarningSeverity.CRITICAL]
        if len(critical_warnings) > 0:
            recommendations.append("⚠️ Address critical constraints before proceeding with development")
            recommendations.append("Obtain geotechnical survey and environmental impact assessment")
        elif len(warnings) > 3:
            recommendations.append("Conduct detailed site survey to address identified risks")
        
        # Opportunity-based recommendations
        if any(opp['type'] == 'Solar Energy' for opp in opportunities):
            recommendations.append("Orient buildings to maximize solar exposure (south-facing)")
            recommendations.append("Consider integrated solar panel installation in design phase")
        
        # Soil recommendations
        if features.bearing_capacity and features.bearing_capacity < 200:
            recommendations.append("Conduct soil improvement (compaction/stabilization) before construction")
        
        return recommendations


def extract_features_from_analysis(terrain_data: Dict, dem_array: np.ndarray, 
                                   slope_array: np.ndarray) -> TerrainFeatures:
    """
    Extract comprehensive features from terrain analysis data
    
    Args:
        terrain_data: Dict with terrain analysis results
        dem_array: DEM raster array
        slope_array: Slope raster array
        
    Returns:
        TerrainFeatures object
    """
    stats = terrain_data.get('stats', {})
    slope_analysis = terrain_data.get('slope_analysis', {})
    
    features = TerrainFeatures(
        # Elevation
        elevation_mean=stats.get('mean', np.nanmean(dem_array)),
        elevation_std=stats.get('std', np.nanstd(dem_array)),
        elevation_range=stats.get('range', np.nanmax(dem_array) - np.nanmin(dem_array)),
        
        # Slope
        slope_mean=slope_analysis.get('mean_slope', np.nanmean(slope_array)),
        slope_std=slope_analysis.get('std_slope', np.nanstd(slope_array)),
        slope_max=slope_analysis.get('max_slope', np.nanmax(slope_array)),
        
        # Aspect (calculate from DEM if not available)
        aspect_mean=terrain_data.get('aspect_analysis', {}).get('mean', 180.0),
        
        # Placeholder values - these would be calculated from advanced analysis
        curvature=0.0,  # Would need second derivatives
        tpi=0.0,  # Topographic Position Index
        tri=slope_analysis.get('std_slope', 0.0) * 2,  # Rough approximation
        
        # Hydrological
        flow_accumulation=terrain_data.get('flow_accumulation_stats', {}).get('mean', 0.0),
        twi=7.0,  # Default moderate value
        drainage_density=terrain_data.get('flow_accumulation_stats', {}).get('drainage_density', 0.1),
        flood_risk_score=min(1.0, terrain_data.get('flood_analysis', {}).get('flood_stats', {}).get('high_risk_area', 0.0) / 100.0),
        water_table_proximity=10.0,  # Default - would need hydrogeological data
        
        # Accessibility - these would come from GIS analysis
        distance_to_roads=1000.0,
        distance_to_utilities=1500.0,
        
        # Environmental
        vegetation_cover=0.3,  # Default
    )
    
    return features

