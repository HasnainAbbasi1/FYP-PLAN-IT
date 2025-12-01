const Project = require('../models/Project');
const TerrainAnalysis = require('../models/TerrainAnalysis');
const LandSuitability = require('../models/LandSuitability');
const ZoningResult = require('../models/ZoningResult');
const OptimizationZoning = require('../models/OptimizationZoning');
const Building = require('../models/Building');
const Road = require('../models/Road');
const Parcel = require('../models/Parcel');
const GreenSpace = require('../models/GreenSpace');
const Infrastructure = require('../models/Infrastructure');
const Polygon = require('../models/Polygon');
const { Op } = require('sequelize');
const axios = require('axios');

const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8000';

const analyticsController = {
  // Get comprehensive analytics data from real analysis results
  getAnalyticsData: async (req, res) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      const { projectId } = req.query; // Add project filter support

      // Build where clause for projects
      let projectWhere = isAdmin ? { is_active: true } : { created_by: userId, is_active: true };
      if (projectId) {
        projectWhere.id = projectId;
      }

      // Get user's projects (or all if admin)
      const projects = await Project.findAll({
        where: projectWhere,
        include: [
          {
            model: Polygon,
            as: 'polygon',
            required: false
          }
        ]
      });

      // Get all terrain analyses for these projects
      const terrainAnalyses = await TerrainAnalysis.findAll({
        where: {
          project_id: { [Op.in]: projects.map(p => p.id) }
        },
        order: [['created_at', 'DESC']]
      });

      // Get all land suitability analyses
      const landSuitabilityAnalyses = await LandSuitability.findAll({
        where: {
          project_id: { [Op.in]: projects.map(p => p.id) }
        },
        order: [['created_at', 'DESC']]
      });

      // Get all design elements
      const [buildings, roads, parcels, greenSpaces, infrastructure] = await Promise.all([
        Building.findAll({ where: { project_id: { [Op.in]: projects.map(p => p.id) } } }).catch(() => []),
        Road.findAll({ where: { project_id: { [Op.in]: projects.map(p => p.id) } } }).catch(() => []),
        Parcel.findAll({ where: { project_id: { [Op.in]: projects.map(p => p.id) } } }).catch(() => []),
        GreenSpace.findAll({ where: { project_id: { [Op.in]: projects.map(p => p.id) } } }).catch(() => []),
        Infrastructure.findAll({ where: { project_id: { [Op.in]: projects.map(p => p.id) } } }).catch(() => [])
      ]);

      // Aggregate terrain analysis data
      const terrainStats = aggregateTerrainData(terrainAnalyses);
      
      // Aggregate land suitability data
      const suitabilityStats = aggregateLandSuitabilityData(landSuitabilityAnalyses);
      
      // Get project trends (monthly)
      const projectTrends = getProjectTrends(projects);
      
      // Get land use distribution from real data
      const landUseDistribution = getLandUseDistribution(landSuitabilityAnalyses, parcels, greenSpaces);
      
      // Get development by location (from projects)
      const developmentByLocation = getDevelopmentByLocation(projects);
      
      // Get road network statistics
      const roadNetworkStats = await getRoadNetworkStatistics(projects);
      
      // Get subdivision statistics
      const subdivisionStats = await getSubdivisionStatistics(projects);

      // Get optimization zoning analytics
      const optimizationStats = await getOptimizationZoningAnalytics(projects);

      // Get zoning results analytics
      const zoningStats = await getZoningResultsAnalytics(projects);

      // Calculate performance metrics
      const performanceMetrics = calculatePerformanceMetrics(projects, optimizationStats, terrainStats);

      // Get time-series data
      const timeSeriesData = getTimeSeriesData(projects, terrainAnalyses, landSuitabilityAnalyses);
      
      // Get comparison data
      const comparisonData = getComparisonData(projects);

      res.json({
        success: true,
        data: {
          // Project statistics
          projectStats: {
            total: projects.length,
            byStatus: groupBy(projects, 'status'),
            byType: groupBy(projects, 'type'),
            byPriority: groupBy(projects, 'priority')
          },
          // Terrain analysis statistics
          terrainStats,
          // Land suitability statistics
          suitabilityStats,
          // Project trends over time
          projectTrends,
          // Land use distribution
          landUseDistribution,
          // Development by location
          developmentByLocation,
          // Road network statistics
          roadNetworkStats,
          // Subdivision statistics
          subdivisionStats,
          // Optimization zoning statistics
          optimizationStats,
          // Zoning results statistics
          zoningStats,
          // Performance metrics
          performanceMetrics,
          // Time-series data
          timeSeriesData,
          // Comparison data
          comparisonData,
          // Design elements summary
          designElements: {
            buildings: {
              total: buildings.length,
              totalArea: buildings.reduce((sum, b) => sum + parseFloat(b.area || 0), 0),
              byType: groupBy(buildings, 'type')
            },
            roads: {
              total: roads.length,
              totalLength: roads.reduce((sum, r) => sum + parseFloat(r.length || 0), 0),
              byType: groupBy(roads, 'type')
            },
            parcels: {
              total: parcels.length,
              totalArea: parcels.reduce((sum, p) => sum + parseFloat(p.area || 0), 0),
              byZoning: groupBy(parcels, 'zoning_type')
            },
            greenSpaces: {
              total: greenSpaces.length,
              totalArea: greenSpaces.reduce((sum, g) => sum + parseFloat(g.area || 0), 0),
              byType: groupBy(greenSpaces, 'type')
            },
            infrastructure: {
              total: infrastructure.length,
              byType: groupBy(infrastructure, 'type')
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics data',
        details: error.message
      });
    }
  },

  // Get list of projects for filtering
  getProjectsList: async (req, res) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      const projects = await Project.findAll({
        where: isAdmin ? { is_active: true } : { created_by: userId, is_active: true },
        attributes: ['id', 'title', 'location', 'type', 'status', 'created_at'],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('Error fetching projects list:', error);
      res.status(500).json({
        error: 'Failed to fetch projects list',
        details: error.message
      });
    }
  }
};

// Helper function to aggregate terrain analysis data
function aggregateTerrainData(terrainAnalyses) {
  if (!terrainAnalyses || terrainAnalyses.length === 0) {
    return {
      totalAnalyses: 0,
      averageElevation: 0,
      averageSlope: 0,
      floodRiskDistribution: {},
      erosionRiskDistribution: {},
      waterAvailabilityStats: {}
    };
  }

  const elevations = [];
  const slopes = [];
  const floodRisks = { high: 0, medium: 0, low: 0 };
  const erosionRisks = { high: 0, medium: 0, low: 0 };
  const waterScores = [];

  terrainAnalyses.forEach(analysis => {
    const results = typeof analysis.results === 'string' 
      ? JSON.parse(analysis.results) 
      : analysis.results || {};
    
    const stats = results.stats || analysis.elevation_data || {};
    const slopeAnalysis = results.slope_analysis || analysis.slope_data || {};
    const floodAnalysis = results.flood_analysis || results.flood_risk_analysis || {};
    const erosionAnalysis = results.erosion_analysis || {};
    const waterAvailability = results.water_availability || {};

    // Collect elevation data
    if (stats.mean_elevation) elevations.push(stats.mean_elevation);
    if (results.elevation_stats?.mean) elevations.push(results.elevation_stats.mean);

    // Collect slope data
    if (slopeAnalysis.mean_slope) slopes.push(slopeAnalysis.mean_slope);
    if (stats.mean_slope) slopes.push(stats.mean_slope);

    // Collect flood risk data
    if (floodAnalysis.flood_stats) {
      const highRisk = floodAnalysis.flood_stats.high_risk_area || 0;
      const mediumRisk = floodAnalysis.flood_stats.medium_risk_area || 0;
      const lowRisk = floodAnalysis.flood_stats.low_risk_area || 0;
      
      if (highRisk > 0.3) floodRisks.high++;
      else if (mediumRisk > 0.3) floodRisks.medium++;
      else floodRisks.low++;
    }

    // Collect erosion risk data
    if (erosionAnalysis.erosion_stats) {
      const meanErosion = erosionAnalysis.erosion_stats.mean_erosion_rate || 0;
      if (meanErosion > 20) erosionRisks.high++;
      else if (meanErosion > 10) erosionRisks.medium++;
      else erosionRisks.low++;
    }

    // Collect water availability data
    if (waterAvailability.water_stats?.availability_score) {
      waterScores.push(waterAvailability.water_stats.availability_score);
    }
  });

  return {
    totalAnalyses: terrainAnalyses.length,
    averageElevation: elevations.length > 0 ? elevations.reduce((a, b) => a + b, 0) / elevations.length : 0,
    averageSlope: slopes.length > 0 ? slopes.reduce((a, b) => a + b, 0) / slopes.length : 0,
    floodRiskDistribution: floodRisks,
    erosionRiskDistribution: erosionRisks,
    waterAvailabilityStats: {
      averageScore: waterScores.length > 0 ? waterScores.reduce((a, b) => a + b, 0) / waterScores.length : 0,
      totalAnalyses: waterScores.length
    }
  };
}

// Helper function to aggregate land suitability data
function aggregateLandSuitabilityData(landSuitabilityAnalyses) {
  if (!landSuitabilityAnalyses || landSuitabilityAnalyses.length === 0) {
    return {
      totalAnalyses: 0,
      residentialSuitability: { high: 0, medium: 0, low: 0, average: 0 },
      commercialSuitability: { high: 0, medium: 0, low: 0, average: 0 },
      landUseDistribution: {}
    };
  }

  const residentialScores = [];
  const commercialScores = [];
  const residentialRatings = { high: 0, medium: 0, low: 0 };
  const commercialRatings = { high: 0, medium: 0, low: 0 };
  const landUseCounts = {};

  landSuitabilityAnalyses.forEach(analysis => {
    const results = typeof analysis.results === 'string' 
      ? JSON.parse(analysis.results) 
      : analysis.results || {};
    
    // Check for enhanced format
    if (results.residential_suitability) {
      const residential = results.residential_suitability;
      const score = residential.percentage || (residential.score ? residential.score * 100 : 0);
      residentialScores.push(score);
      
      const rating = residential.rating || (score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low');
      residentialRatings[rating.toLowerCase()]++;
    } else if (analysis.suitability_scores?.residential) {
      const score = analysis.suitability_scores.residential;
      residentialScores.push(score);
      if (score >= 70) residentialRatings.high++;
      else if (score >= 50) residentialRatings.medium++;
      else residentialRatings.low++;
    }

    if (results.commercial_suitability) {
      const commercial = results.commercial_suitability;
      const score = commercial.percentage || (commercial.score ? commercial.score * 100 : 0);
      commercialScores.push(score);
      
      const rating = commercial.rating || (score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low');
      commercialRatings[rating.toLowerCase()]++;
    } else if (analysis.suitability_scores?.commercial) {
      const score = analysis.suitability_scores.commercial;
      commercialScores.push(score);
      if (score >= 70) commercialRatings.high++;
      else if (score >= 50) commercialRatings.medium++;
      else commercialRatings.low++;
    }

    // Extract land use recommendations
    if (results.land_use_recommendations) {
      results.land_use_recommendations.forEach(rec => {
        const type = rec.type || 'Other';
        landUseCounts[type] = (landUseCounts[type] || 0) + 1;
      });
    }
  });

  return {
    totalAnalyses: landSuitabilityAnalyses.length,
    residentialSuitability: {
      ...residentialRatings,
      average: residentialScores.length > 0 
        ? residentialScores.reduce((a, b) => a + b, 0) / residentialScores.length 
        : 0
    },
    commercialSuitability: {
      ...commercialRatings,
      average: commercialScores.length > 0 
        ? commercialScores.reduce((a, b) => a + b, 0) / commercialScores.length 
        : 0
    },
    landUseDistribution: landUseCounts
  };
}

// Helper function to get project trends
function getProjectTrends(projects) {
  const monthlyData = {};
  const now = new Date();
  
  // Get last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
    monthlyData[monthKey] = { created: 0, completed: 0, area: 0 };
  }

  projects.forEach(project => {
    const createdDate = new Date(project.created_at);
    const monthKey = createdDate.toLocaleDateString('en-US', { month: 'short' });
    
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].created++;
      monthlyData[monthKey].area += parseFloat(project.area || 0);
      
      if (project.status === 'Completed') {
        monthlyData[monthKey].completed++;
      }
    }
  });

  return Object.entries(monthlyData).map(([name, data]) => ({
    name,
    value: data.area,
    created: data.created,
    completed: data.completed
  }));
}

// Helper function to get land use distribution
function getLandUseDistribution(landSuitabilityAnalyses, parcels, greenSpaces) {
  const distribution = {
    Residential: 0,
    Commercial: 0,
    Industrial: 0,
    'Green Space': 0,
    Mixed: 0,
    Other: 0
  };

  // From parcels
  parcels.forEach(parcel => {
    const zoning = parcel.zoning_type || 'Other';
    if (zoning.includes('Residential') || zoning.includes('residential')) {
      distribution.Residential += parseFloat(parcel.area || 0);
    } else if (zoning.includes('Commercial') || zoning.includes('commercial')) {
      distribution.Commercial += parseFloat(parcel.area || 0);
    } else if (zoning.includes('Industrial') || zoning.includes('industrial')) {
      distribution.Industrial += parseFloat(parcel.area || 0);
    } else if (zoning.includes('Mixed') || zoning.includes('mixed')) {
      distribution.Mixed += parseFloat(parcel.area || 0);
    } else {
      distribution.Other += parseFloat(parcel.area || 0);
    }
  });

  // From green spaces
  greenSpaces.forEach(gs => {
    distribution['Green Space'] += parseFloat(gs.area || 0);
  });

  // From land suitability recommendations
  landSuitabilityAnalyses.forEach(analysis => {
    const results = typeof analysis.results === 'string' 
      ? JSON.parse(analysis.results) 
      : analysis.results || {};
    
    if (results.land_use_recommendations) {
      results.land_use_recommendations.forEach(rec => {
        const type = rec.type || 'Other';
        const area = rec.area_percentage || 0;
        
        if (type.includes('residential')) {
          distribution.Residential += area;
        } else if (type.includes('commercial')) {
          distribution.Commercial += area;
        } else if (type.includes('industrial')) {
          distribution.Industrial += area;
        } else if (type.includes('green')) {
          distribution['Green Space'] += area;
        }
      });
    }
  });

  // Convert to percentage
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(distribution).forEach(key => {
      distribution[key] = (distribution[key] / total) * 100;
    });
  }

  return Object.entries(distribution)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value: Math.round(value) }));
}

// Helper function to get development by location
function getDevelopmentByLocation(projects) {
  const locationData = {};
  
  projects.forEach(project => {
    const location = project.location || 'Unknown';
    if (!locationData[location]) {
      locationData[location] = { projects: 0, totalArea: 0 };
    }
    locationData[location].projects++;
    locationData[location].totalArea += parseFloat(project.area || 0);
  });

  return Object.entries(locationData)
    .map(([name, data]) => ({
      name,
      value: data.totalArea,
      projects: data.projects
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 locations
}

// Helper function to get road network statistics
async function getRoadNetworkStatistics(projects) {
  try {
    const roadNetworkResponse = await axios.get(`${PYTHON_API_BASE}/api/road_network_results`).catch(() => null);
    
    if (roadNetworkResponse && roadNetworkResponse.data) {
      const roadNetworks = Array.isArray(roadNetworkResponse.data) 
        ? roadNetworkResponse.data 
        : (roadNetworkResponse.data.road_networks || []);
      
      let totalLength = 0;
      let totalSegments = 0;
      const byType = {};

      roadNetworks.forEach(rn => {
        if (rn.road_network?.network_statistics) {
          const stats = rn.road_network.network_statistics;
          totalLength += stats.total_road_length_km || 0;
          totalSegments += stats.total_segments || 0;
        }

        if (rn.road_network) {
          const types = ['primary_roads', 'secondary_roads', 'local_roads', 'residential_roads', 'pedestrian_network', 'bike_network'];
          types.forEach(type => {
            const count = rn.road_network[type]?.features?.length || 0;
            byType[type] = (byType[type] || 0) + count;
          });
        }
      });

      return {
        totalLength,
        totalSegments,
        byType,
        totalNetworks: roadNetworks.length
      };
    }
  } catch (error) {
    console.error('Error fetching road network statistics:', error.message);
  }

  return {
    totalLength: 0,
    totalSegments: 0,
    byType: {},
    totalNetworks: 0
  };
}

// Helper function to get subdivision statistics
async function getSubdivisionStatistics(projects) {
  try {
    const subdivisionResponse = await axios.get(`${PYTHON_API_BASE}/api/subdivision_results`).catch(() => null);
    
    if (subdivisionResponse && subdivisionResponse.data) {
      const subdivisions = Array.isArray(subdivisionResponse.data) 
        ? subdivisionResponse.data 
        : (subdivisionResponse.data.subdivisions || []);
      
      let totalParcels = 0;
      let totalArea = 0;

      subdivisions.forEach(sub => {
        if (sub.subdivision_result) {
          totalParcels += sub.subdivision_result.total_parcels || 0;
          if (sub.subdivision_result.statistics?.total_area) {
            totalArea += sub.subdivision_result.statistics.total_area;
          }
        }
      });

      return {
        totalSubdivisions: subdivisions.length,
        totalParcels,
        totalArea,
        averageParcelsPerSubdivision: subdivisions.length > 0 ? totalParcels / subdivisions.length : 0
      };
    }
  } catch (error) {
    console.error('Error fetching subdivision statistics:', error.message);
  }

  return {
    totalSubdivisions: 0,
    totalParcels: 0,
    totalArea: 0,
    averageParcelsPerSubdivision: 0
  };
}

// Helper function to get optimization zoning analytics
async function getOptimizationZoningAnalytics(projects) {
  try {
    const projectIds = projects.map(p => p.id);
    const optimizations = await OptimizationZoning.findAll({
      where: {
        projectId: { [Op.in]: projectIds },
        status: 'completed'
      },
      order: [['created_at', 'DESC']]
    });

    if (optimizations.length === 0) {
      return {
        total: 0,
        averageFitnessScore: 0,
        averageGenerations: 0,
        landUseBreakdown: {},
        byMethod: {},
        fitnessScoreTrend: []
      };
    }

    const fitnessScores = [];
    const generations = [];
    const landUseTotals = {};
    const methodCounts = {};

    optimizations.forEach(opt => {
      if (opt.fitnessScore) fitnessScores.push(opt.fitnessScore);
      if (opt.generations) generations.push(opt.generations);
      if (opt.method) methodCounts[opt.method] = (methodCounts[opt.method] || 0) + 1;

      // Aggregate land use distribution
      if (opt.landUseDistribution) {
        Object.entries(opt.landUseDistribution).forEach(([type, value]) => {
          landUseTotals[type] = (landUseTotals[type] || 0) + value;
        });
      }
    });

    // Calculate fitness score trend (last 10 optimizations)
    const fitnessScoreTrend = optimizations.slice(0, 10).reverse().map((opt, idx) => ({
      name: `Run ${idx + 1}`,
      score: opt.fitnessScore || 0,
      generations: opt.generations || 0
    }));

    return {
      total: optimizations.length,
      averageFitnessScore: fitnessScores.length > 0 
        ? (fitnessScores.reduce((a, b) => a + b, 0) / fitnessScores.length).toFixed(2)
        : 0,
      averageGenerations: generations.length > 0 
        ? Math.round(generations.reduce((a, b) => a + b, 0) / generations.length)
        : 0,
      landUseBreakdown: landUseTotals,
      byMethod: methodCounts,
      fitnessScoreTrend,
      completedOptimizations: optimizations.length
    };
  } catch (error) {
    console.error('Error fetching optimization analytics:', error.message);
    return {
      total: 0,
      averageFitnessScore: 0,
      averageGenerations: 0,
      landUseBreakdown: {},
      byMethod: {},
      fitnessScoreTrend: []
    };
  }
}

// Helper function to get zoning results analytics
async function getZoningResultsAnalytics(projects) {
  try {
    const projectIds = projects.map(p => p.id);
    const zoningResults = await ZoningResult.findAll({
      where: {
        project_id: { [Op.in]: projectIds },
        status: 'completed'
      },
      order: [['created_at', 'DESC']]
    });

    if (zoningResults.length === 0) {
      return {
        total: 0,
        byType: {},
        marlaSummary: {},
        greenSpaceStats: {}
      };
    }

    const byType = {};
    let totalResidentialMarlas = 0;
    let totalCommercialMarlas = 0;
    let totalParkMarlas = 0;
    let totalRoadMarlas = 0;
    let greenSpaceCount = 0;
    let totalGreenSpaceArea = 0;

    zoningResults.forEach(result => {
      const type = result.zoning_type || 'Unknown';
      byType[type] = (byType[type] || 0) + 1;

      // Aggregate marla summary - handle both direct field and nested in zoning_result
      const marlaSummary = result.marla_summary || 
        result.zoning_result?.analysis?.zoning_data?.marla_summary ||
        result.zoning_result?.analysis?.marla_summary ||
        null;
      
      if (marlaSummary) {
        totalResidentialMarlas += marlaSummary.residential_marlas || 0;
        totalCommercialMarlas += marlaSummary.commercial_marlas || 0;
        totalParkMarlas += marlaSummary.park_marlas || 0;
        totalRoadMarlas += marlaSummary.road_marlas || 0;
      }

      // Aggregate green space statistics
      if (result.green_space_statistics) {
        greenSpaceCount += result.green_space_statistics.green_spaces?.length || 0;
        totalGreenSpaceArea += result.green_space_statistics.total_green_space_area || 0;
      }
    });

    return {
      total: zoningResults.length,
      byType,
      marlaSummary: {
        totalResidential: totalResidentialMarlas,
        totalCommercial: totalCommercialMarlas,
        totalPark: totalParkMarlas,
        totalRoad: totalRoadMarlas,
        total: totalResidentialMarlas + totalCommercialMarlas + totalParkMarlas + totalRoadMarlas
      },
      greenSpaceStats: {
        count: greenSpaceCount,
        totalArea: totalGreenSpaceArea.toFixed(2)
      }
    };
  } catch (error) {
    console.error('Error fetching zoning results analytics:', error.message);
    return {
      total: 0,
      byType: {},
      marlaSummary: {},
      greenSpaceStats: {}
    };
  }
}

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(projects, optimizationStats, terrainStats) {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Count projects created in last month and week
  const projectsLastMonth = projects.filter(p => new Date(p.created_at) >= lastMonth).length;
  const projectsLastWeek = projects.filter(p => new Date(p.created_at) >= lastWeek).length;

  // Count completed projects
  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  const completionRate = projects.length > 0 ? ((completedProjects / projects.length) * 100).toFixed(1) : 0;

  // Calculate average project progress
  const avgProgress = projects.length > 0
    ? (projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length).toFixed(1)
    : 0;

  // Count projects by priority
  const highPriorityCount = projects.filter(p => p.priority === 'High' || p.priority === 'Critical').length;

  return {
    projectsLastMonth,
    projectsLastWeek,
    completedProjects,
    completionRate,
    averageProgress: parseFloat(avgProgress),
    highPriorityProjects: highPriorityCount,
    activeProjects: projects.filter(p => p.status === 'In Progress').length,
    totalAnalyses: terrainStats.totalAnalyses + (optimizationStats.total || 0),
    optimizationCount: optimizationStats.total || 0
  };
}

// Helper function to group by property
function groupBy(array, property) {
  return array.reduce((acc, item) => {
    const key = item[property] || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

// Get time-series data for analytics
function getTimeSeriesData(projects, terrainAnalyses, landSuitabilityAnalyses) {
  const now = new Date();
  const months = [];
  
  // Generate last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
      date: date.toISOString().split('T')[0]
    });
  }

  // Aggregate projects by month
  const projectsByMonth = months.map(month => {
    const monthStart = new Date(month.date);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    
    const created = projects.filter(p => {
      const created = new Date(p.created_at);
      return created >= monthStart && created <= monthEnd;
    }).length;
    
    const completed = projects.filter(p => {
      if (p.status !== 'Completed') return false;
      const updated = new Date(p.updated_at);
      return updated >= monthStart && updated <= monthEnd;
    }).length;
    
    const inProgress = projects.filter(p => {
      if (p.status !== 'In Progress') return false;
      const updated = new Date(p.updated_at);
      return updated >= monthStart && updated <= monthEnd;
    }).length;
    
    return {
      ...month,
      created,
      completed,
      inProgress,
      total: projects.filter(p => {
        const created = new Date(p.created_at);
        return created <= monthEnd;
      }).length
    };
  });

  // Aggregate analyses by month
  const analysesByMonth = months.map(month => {
    const monthStart = new Date(month.date);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    
    const terrain = terrainAnalyses.filter(a => {
      const created = new Date(a.created_at);
      return created >= monthStart && created <= monthEnd;
    }).length;
    
    const suitability = landSuitabilityAnalyses.filter(a => {
      const created = new Date(a.created_at);
      return created >= monthStart && created <= monthEnd;
    }).length;
    
    return {
      ...month,
      terrain,
      suitability,
      total: terrain + suitability
    };
  });

  return {
    projects: projectsByMonth,
    analyses: analysesByMonth
  };
}

// Get comparison data between projects
function getComparisonData(projects) {
  if (projects.length < 2) {
    return {
      available: false,
      message: 'Need at least 2 projects for comparison'
    };
  }

  // Compare projects by various metrics
  const comparisons = {
    byProgress: projects
      .filter(p => p.progress !== undefined && p.progress !== null)
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.title,
        progress: p.progress,
        status: p.status
      })),
    
    byPriority: {
      Critical: projects.filter(p => p.priority === 'Critical').length,
      High: projects.filter(p => p.priority === 'High').length,
      Medium: projects.filter(p => p.priority === 'Medium').length,
      Low: projects.filter(p => p.priority === 'Low').length
    },
    
    byStatus: {
      Planning: projects.filter(p => p.status === 'Planning').length,
      'In Progress': projects.filter(p => p.status === 'In Progress').length,
      'On Hold': projects.filter(p => p.status === 'On Hold').length,
      Completed: projects.filter(p => p.status === 'Completed').length,
      Cancelled: projects.filter(p => p.status === 'Cancelled').length
    },
    
    byType: groupBy(projects, 'type'),
    
    averageProgress: projects.length > 0
      ? (projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length).toFixed(1)
      : 0,
    
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'In Progress').length,
    completedProjects: projects.filter(p => p.status === 'Completed').length
  };

  return {
    available: true,
    ...comparisons
  };
}

module.exports = analyticsController;

