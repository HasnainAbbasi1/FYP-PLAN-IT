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
const { Op } = require('sequelize');

const reportController = {
  // Get all reports for user's projects
  getAllReports: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get all projects for the user (ongoing = status 'In Progress' or 'Planning')
      const Polygon = require('../models/Polygon');
      const projects = await Project.findAll({
        where: {
          created_by: userId,
          is_active: true,
          status: {
            [Op.in]: ['Planning', 'In Progress']
          }
        },
        order: [['updated_at', 'DESC']],
        include: [
          {
            model: Polygon,
            as: 'polygon',
            required: false
          }
        ]
      });

      // Get all analysis reports for user's projects
      const analysisReports = await getAllAnalysisReports(userId);

      // Transform projects into report format
      const projectReports = await Promise.all(projects.map(async (project) => {
        const report = await generateReportData(project);
        return report;
      }));

      // Combine project reports with analysis reports
      const allReports = [...projectReports, ...analysisReports];

      res.json({
        success: true,
        reports: allReports,
        count: allReports.length
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({
        error: 'Failed to fetch reports',
        details: error.message
      });
    }
  },

  // Generate report for a specific project
  generateReport: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { reportType = 'full', format = 'json', components = {} } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get project
      const Polygon = require('../models/Polygon');
      const project = await Project.findOne({
        where: {
          id: projectId,
          created_by: userId,
          is_active: true
        },
        include: [
          {
            model: Polygon,
            as: 'polygon',
            required: false
          }
        ]
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if this is an analysis-specific report
      const analysisTypes = ['terrain', 'land_suitability', 'zoning', 'optimization_zoning'];
      if (analysisTypes.includes(reportType)) {
        // Generate analysis-specific report
        const reportData = await generateAnalysisReport(project, reportType, userId);
        res.json({
          success: true,
          report: reportData,
          generatedAt: new Date().toISOString()
        });
      } else {
        // Generate project report
        const reportData = await generateReportData(project, reportType, components);
        
        if (format === 'json') {
          res.json({
            success: true,
            report: reportData,
            generatedAt: new Date().toISOString()
          });
        } else {
          res.json({
            success: true,
            report: reportData,
            format: format,
            generatedAt: new Date().toISOString(),
            note: 'PDF/DOCX generation will be handled by frontend'
          });
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({
        error: 'Failed to generate report',
        details: error.message
      });
    }
  },

  // Download report
  downloadReport: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { format = 'json' } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get project
      const project = await Project.findOne({
        where: {
          id: projectId,
          created_by: userId,
          is_active: true
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const { reportType } = req.query;
      
      // Generate report data based on type
      let reportData;
      const analysisTypes = ['terrain', 'land_suitability', 'zoning', 'optimization_zoning'];
      
      if (reportType && analysisTypes.includes(reportType)) {
        reportData = await generateAnalysisReport(project, reportType, userId);
      } else {
        reportData = await generateReportData(project);
      }

      // Set headers for download
      const reportTypeSuffix = reportType ? `_${reportType}` : '';
      const filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}${reportTypeSuffix}_report_${Date.now()}.${format}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.json(reportData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.json({
          ...reportData,
          downloadFormat: format,
          filename: filename
        });
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      res.status(500).json({
        error: 'Failed to download report',
        details: error.message
      });
    }
  },

  // Generate PDF Report (Python backend integration)
  generatePDFReport: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        dem_path,
        polygon_id,
        polygon_ids,
        project_id,
        report_type = 'comprehensive',
        output_filename
      } = req.body;

      if (!project_id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Proxy to Python backend for PDF generation
      const axios = require('axios');
      const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:5002';

      const response = await axios.post(`${PYTHON_API_BASE}/api/generate_pdf_report`, {
        dem_path,
        polygon_id,
        polygon_ids,
        project_id,
        report_type,
        output_filename: output_filename || `FYP_Report_Project_${project_id}_${Date.now()}.pdf`
      }, {
        timeout: 120000 // 2 minutes timeout for PDF generation
      });

      res.json(response.data);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      res.status(500).json({
        error: 'Failed to generate PDF report',
        details: error.response?.data?.detail || error.message
      });
    }
  },

  // List PDF Reports
  listPDFReports: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Proxy to Python backend
      const axios = require('axios');
      const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:5002';

      const response = await axios.get(`${PYTHON_API_BASE}/api/pdf_reports`);
      
      res.json(response.data);
    } catch (error) {
      console.error('Error listing PDF reports:', error);
      res.status(500).json({
        error: 'Failed to list PDF reports',
        details: error.response?.data?.detail || error.message,
        reports: []
      });
    }
  },

  // Delete PDF Report
  deletePDFReport: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { filename } = req.params;

      if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
      }

      // Proxy to Python backend
      const axios = require('axios');
      const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:5002';

      const response = await axios.delete(`${PYTHON_API_BASE}/api/pdf_reports/${filename}`);
      
      res.json(response.data);
    } catch (error) {
      console.error('Error deleting PDF report:', error);
      res.status(500).json({
        error: 'Failed to delete PDF report',
        details: error.response?.data?.detail || error.message
      });
    }
  },

  // Export Report (Excel, CSV, JSON)
  exportReport: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { format = 'excel', reportType = 'full' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get project
      const project = await Project.findOne({
        where: {
          id: projectId,
          created_by: userId,
          is_active: true
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Generate report data
      const reportData = await generateReportData(project, reportType);

      // Export based on format
      if (format === 'excel') {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        // Create worksheets for different sections
        await createExcelWorksheets(workbook, reportData);
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title}_Report_${Date.now()}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
      } else if (format === 'csv') {
        const csv = await generateCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title}_Report_${Date.now()}.csv"`);
        res.send(csv);
      } else {
        // JSON export
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title}_Report_${Date.now()}.json"`);
        res.json(reportData);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        error: 'Failed to export report',
        details: error.message
      });
    }
  },

  // Get Report Templates
  getReportTemplates: async (req, res) => {
    try {
      const templates = [
        {
          id: 'full',
          name: 'Full Project Report',
          description: 'Comprehensive report including all analyses and design elements',
          sections: ['executive', 'terrain', 'suitability', 'design', 'recommendations'],
          icon: 'FileText'
        },
        {
          id: 'executive',
          name: 'Executive Summary',
          description: 'High-level overview for stakeholders',
          sections: ['executive', 'keyMetrics', 'recommendations'],
          icon: 'Briefcase'
        },
        {
          id: 'terrain',
          name: 'Terrain Analysis Report',
          description: 'Detailed terrain and topography analysis',
          sections: ['terrain', 'elevation', 'slope', 'floodRisk'],
          icon: 'Mountain'
        },
        {
          id: 'land_suitability',
          name: 'Land Suitability Report',
          description: 'Comprehensive land suitability assessment',
          sections: ['suitability', 'recommendations', 'constraints'],
          icon: 'Map'
        },
        {
          id: 'zoning',
          name: 'Zoning Analysis Report',
          description: 'Zoning regulations and compliance analysis',
          sections: ['zoning', 'compliance', 'recommendations'],
          icon: 'Grid'
        },
        {
          id: 'optimization_zoning',
          name: 'Optimization Zoning Report',
          description: 'AI-optimized zoning with performance metrics',
          sections: ['optimization', 'zoning', 'performance'],
          icon: 'Zap'
        },
        {
          id: 'design',
          name: 'Design & Infrastructure Report',
          description: 'Detailed design elements and infrastructure',
          sections: ['buildings', 'roads', 'parcels', 'infrastructure'],
          icon: 'Building'
        },
        {
          id: 'environmental',
          name: 'Environmental Assessment',
          description: 'Environmental impact and sustainability analysis',
          sections: ['terrain', 'water', 'erosion', 'sustainability'],
          icon: 'Leaf'
        },
        {
          id: 'financial',
          name: 'Financial Analysis',
          description: 'Budget, costs, and financial projections',
          sections: ['budget', 'costs', 'projections'],
          icon: 'DollarSign'
        }
      ];

      res.json({
        success: true,
        templates
      });
    } catch (error) {
      console.error('Error fetching report templates:', error);
      res.status(500).json({
        error: 'Failed to fetch report templates',
        details: error.message
      });
    }
  }
};

// Helper function to generate report data
// IMPORTANT: This function fetches REAL analysis data from the same sources as the UI pages:
// - Terrain analysis: From database (saved by Terrain.jsx) or Python backend
// - Land suitability: From database (saved by server.js after Suitability.jsx analysis) or Python backend
// - Road networks: From Python backend
// - Subdivisions: From Python backend
// All data matches the exact structure shown in the UI for consistency
async function generateReportData(project, reportType = 'full', components = {}) {
  const axios = require('axios');
  const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8000';
  
  const report = {
    id: `report_${project.id}_${Date.now()}`,
    projectId: project.id,
    projectTitle: project.title,
    projectDescription: project.description,
    projectLocation: project.location,
    projectType: project.type,
    projectStatus: project.status,
    projectPriority: project.priority,
    projectProgress: project.progress,
    projectBudget: project.budget,
    startDate: project.start_date,
    endDate: project.end_date,
    area: project.area,
    generatedAt: new Date().toISOString(),
    reportType: reportType,
    sections: {}
  };

  // Get polygon for fetching analysis data (same as analysis pages do)
  const Polygon = require('../models/Polygon');
  let polygon = project.polygon;
  if (!polygon) {
    polygon = await Polygon.findOne({
      where: { project_id: project.id },
      order: [['created_at', 'DESC']]
    });
  }
  
  // Ensure polygon has geojson if needed
  if (polygon && !polygon.geojson && polygon.geometry) {
    polygon.geojson = polygon.geometry;
  }

  // Get comprehensive terrain analysis data - use database first (most reliable, matches UI)
  if (polygon && polygon.id) {
    try {
      // First try database - this contains the real analysis data saved by Terrain.jsx
      // The structure matches what's shown in the UI
      const terrainAnalysis = await TerrainAnalysis.findOne({
        where: {
          polygon_id: polygon.id,
          project_id: project.id
        },
        order: [['created_at', 'DESC']]
      });

      if (terrainAnalysis && terrainAnalysis.results) {
        // Parse the saved results - this contains the real analysis data from Python backend
        // Structure: results contains { stats, slope_analysis, flood_analysis, erosion_analysis, water_availability }
        const savedResults = typeof terrainAnalysis.results === 'string' 
          ? JSON.parse(terrainAnalysis.results) 
          : terrainAnalysis.results;
        
        // Extract real analysis data - matches the structure from Python backend advanced terrain analysis
        const stats = savedResults.stats || terrainAnalysis.elevation_data || {};
        const slopeAnalysis = savedResults.slope_analysis || terrainAnalysis.slope_data || {};
        const floodAnalysis = savedResults.flood_analysis || savedResults.flood_risk_analysis || {};
        const erosionAnalysis = savedResults.erosion_analysis || {};
        const waterAvailability = savedResults.water_availability || {};
        
        // Build terrain analysis section with REAL data (same structure as shown in UI)
        report.sections.terrainAnalysis = {
          // Elevation stats from real analysis
          elevation: savedResults.elevation_stats || {
            mean: stats.mean_elevation,
            min: stats.min_elevation,
            max: stats.max_elevation,
            range: (stats.max_elevation || 0) - (stats.min_elevation || 0),
            std: stats.std_elevation,
            median: stats.median_elevation
          },
          // Slope analysis from real data (matches UI display)
          slope: slopeAnalysis || {
            mean_slope: stats.mean_slope || slopeAnalysis.mean_slope,
            max_slope: stats.max_slope || slopeAnalysis.max_slope,
            min_slope: stats.min_slope || slopeAnalysis.min_slope,
            std_slope: stats.std_slope || slopeAnalysis.std_slope,
            slope_distribution: slopeAnalysis.slope_distribution,
            category_stats: slopeAnalysis.category_stats
          },
          // Aspect from real analysis
          aspect: savedResults.aspect_analysis || terrainAnalysis.aspect_data,
          // Flood risk from real analysis (matches UI)
          floodRisk: floodAnalysis || {
            flood_stats: floodAnalysis.flood_stats || stats.flood_stats,
            flood_risk_score: floodAnalysis.flood_risk_score || stats.flood_risk_score
          },
          // Erosion from real analysis (matches UI)
          erosion: erosionAnalysis || {
            erosion_stats: erosionAnalysis.erosion_stats || stats.erosion_stats,
            erosion_risk_score: erosionAnalysis.erosion_risk_score || stats.erosion_risk_score
          },
          // Water availability from real analysis (matches UI)
          waterAvailability: waterAvailability || {
            water_stats: waterAvailability.water_stats || stats.water_stats,
            water_availability_score: waterAvailability.water_availability_score || stats.water_availability_score
          },
          // Additional terrain metrics
          terrainRuggedness: savedResults.terrain_ruggedness,
          flowAccumulation: savedResults.flow_accumulation_stats,
          // Full results for reference
          results: savedResults,
          stats: stats,
          analysisDate: terrainAnalysis.created_at
        };
      } else {
        // Fallback to Python backend if database doesn't have it
        const terrainResponse = await axios.get(`${PYTHON_API_BASE}/api/terrain_analysis/${polygon.id}`).catch(() => null);
        
        if (terrainResponse && terrainResponse.data) {
          const terrainData = terrainResponse.data.terrain_analysis || terrainResponse.data;
          const analysisData = terrainData.analysis_data || terrainData.results || terrainData;
          const stats = terrainData.stats || analysisData.stats || {};
          
          report.sections.terrainAnalysis = {
            elevation: analysisData.elevation_stats || stats.elevation_stats || {
              mean: stats.mean_elevation,
              min: stats.min_elevation,
              max: stats.max_elevation,
              range: (stats.max_elevation || 0) - (stats.min_elevation || 0),
              std: stats.std_elevation,
              median: stats.median_elevation
            },
            slope: analysisData.slope_analysis || stats.slope_analysis || {
              mean_slope: stats.mean_slope,
              max_slope: stats.max_slope,
              min_slope: stats.min_slope,
              std_slope: stats.std_slope
            },
            aspect: analysisData.aspect_analysis || stats.aspect_analysis,
            floodRisk: analysisData.flood_risk_analysis || stats.flood_analysis,
            erosion: analysisData.erosion_analysis || stats.erosion_analysis,
            waterAvailability: analysisData.water_availability || stats.water_availability,
            results: analysisData,
            stats: stats,
            analysisDate: terrainData.created_at || new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.error('Error fetching terrain analysis:', error.message);
    }

    // Get road network results from Python backend
    try {
      const roadNetworkResponse = await axios.get(`${PYTHON_API_BASE}/api/road_network_results`).catch(() => null);
      if (roadNetworkResponse && roadNetworkResponse.data) {
        const roadNetworks = Array.isArray(roadNetworkResponse.data) 
          ? roadNetworkResponse.data 
          : (roadNetworkResponse.data.road_networks || []);
        const roadNetwork = roadNetworks.find(rn => rn.polygon_id === polygon.id);
        if (roadNetwork && roadNetwork.road_network) {
          report.sections.roadNetwork = {
            networkStatistics: roadNetwork.road_network.network_statistics,
            trafficAnalysis: roadNetwork.road_network.traffic_analysis,
            accessibilityAnalysis: roadNetwork.road_network.accessibility_analysis,
            multiModalFeatures: {
              primaryRoads: roadNetwork.road_network.primary_roads?.features?.length || 0,
              secondaryRoads: roadNetwork.road_network.secondary_roads?.features?.length || 0,
              localRoads: roadNetwork.road_network.local_roads?.features?.length || 0,
              residentialRoads: roadNetwork.road_network.residential_roads?.features?.length || 0,
              pedestrianPaths: roadNetwork.road_network.pedestrian_network?.features?.length || 0,
              bikePaths: roadNetwork.road_network.bike_network?.features?.length || 0
            },
            roadNetwork: roadNetwork.road_network
          };
        }
      }
    } catch (error) {
      console.error('Error fetching road network:', error.message);
    }

    // Get subdivision results from Python backend
    try {
      const subdivisionResponse = await axios.get(`${PYTHON_API_BASE}/api/subdivision_results`).catch(() => null);
      if (subdivisionResponse && subdivisionResponse.data) {
        const subdivisions = Array.isArray(subdivisionResponse.data) 
          ? subdivisionResponse.data 
          : (subdivisionResponse.data.subdivisions || []);
        const subdivision = subdivisions.find(sub => sub.polygon_id === polygon.id);
        if (subdivision && subdivision.subdivision_result) {
          report.sections.subdivision = {
            totalParcels: subdivision.subdivision_result.total_parcels || 0,
            parcels: subdivision.subdivision_result.parcels,
            statistics: subdivision.subdivision_result.statistics,
            subdivisionResult: subdivision.subdivision_result
          };
        }
      }
    } catch (error) {
      console.error('Error fetching subdivision:', error.message);
    }
  }

  // Get design elements from database
  const [buildings, roads, parcels, greenSpaces, infrastructure] = await Promise.all([
    Building.findAll({ where: { project_id: project.id } }).catch(() => []),
    Road.findAll({ where: { project_id: project.id } }).catch(() => []),
    Parcel.findAll({ where: { project_id: project.id } }).catch(() => []),
    GreenSpace.findAll({ where: { project_id: project.id } }).catch(() => []),
    Infrastructure.findAll({ where: { project_id: project.id } }).catch(() => [])
  ]);

  // Get enhanced land suitability data (same structure as returned by Python backend and shown in UI)
  // Priority: Database (most reliable) -> Python backend (if DB doesn't have enhanced format)
  if (polygon && polygon.id) {
    try {
      // First try database - enhanced land suitability is saved there after analysis
      // This matches the exact structure saved by server.js from Python backend response
      const landSuitability = await LandSuitability.findOne({
        where: { 
          polygon_id: polygon.id,
          project_id: project.id
        },
        order: [['created_at', 'DESC']]
      }).catch(() => null);
      
      let suitabilityData = null;
      
      if (landSuitability && landSuitability.results) {
        // Parse results - should contain enhanced data structure saved by server.js
        const results = typeof landSuitability.results === 'string' 
          ? JSON.parse(landSuitability.results) 
          : landSuitability.results;
        
        // Check if this is enhanced format (same structure as returned by Python backend and shown in UI)
        if (results.residential_suitability || results.commercial_suitability) {
          suitabilityData = {
            residentialSuitability: results.residential_suitability,
            commercialSuitability: results.commercial_suitability,
            aiRecommendations: results.ai_recommendations || [],
            waterInfo: results.water_info || {},
            suitabilityClassification: results.suitability_classification || {},
            analysisSummary: results.analysis_summary || {},
            recommendations: results.recommendations || [],
            warnings: results.warnings || [],
            restrictions: results.restrictions || [],
            analysisDate: landSuitability.created_at
          };
        } else if (landSuitability.suitability_scores) {
          // Legacy format - convert to enhanced format if possible
          const scores = landSuitability.suitability_scores;
          suitabilityData = {
            residentialSuitability: {
              score: (scores.residential || 0) / 100,
              percentage: scores.residential || 0,
              rating: (scores.residential || 0) >= 70 ? 'High' : (scores.residential || 0) >= 50 ? 'Medium' : 'Low'
            },
            commercialSuitability: {
              score: (scores.commercial || 0) / 100,
              percentage: scores.commercial || 0,
              rating: (scores.commercial || 0) >= 70 ? 'High' : (scores.commercial || 0) >= 50 ? 'Medium' : 'Low'
            },
            aiRecommendations: results.recommendations || [],
            recommendations: results.recommendations || [],
            warnings: results.warnings || [],
            restrictions: results.restrictions || [],
            analysisDate: landSuitability.created_at
          };
        }
      }
      
      // If we got enhanced data from database, use it
      if (suitabilityData) {
        report.sections.landSuitability = suitabilityData;
      } else {
        // Fallback: Try to get from Python backend directly (same as UI does)
        // This ensures we get the latest real analysis data
        try {
          const suitabilityResponse = await axios.post(`${PYTHON_API_BASE}/api/land_suitability_enhanced`, {
            polygon_id: polygon.id,
            user_id: project.created_by,
            project_id: project.id,
            geojson: polygon.geojson
          }, {
            timeout: 30000 // 30 second timeout
          }).catch(() => null);
          
          if (suitabilityResponse && suitabilityResponse.data && suitabilityResponse.data.status === 'success') {
            const data = suitabilityResponse.data;
            // Use the exact same structure as shown in UI (Suitability.jsx)
            report.sections.landSuitability = {
              residentialSuitability: data.residential_suitability,
              commercialSuitability: data.commercial_suitability,
              aiRecommendations: data.ai_recommendations || [],
              waterInfo: data.water_info || {},
              suitabilityClassification: data.suitability_classification || {},
              analysisSummary: data.analysis_summary || {},
              recommendations: data.recommendations || [],
              warnings: data.warnings || [],
              restrictions: data.restrictions || [],
              analysisDate: new Date().toISOString()
            };
          }
        } catch (backendError) {
          console.error('Error fetching from Python backend:', backendError.message);
        }
      }
    } catch (error) {
      console.error('Error fetching land suitability:', error.message);
    }
  }

  // Get additional analysis data
  const [zoningResult, optimizationZoning] = await Promise.all([
    ZoningResult.findOne({
      where: { project_id: project.id },
      order: [['created_at', 'DESC']]
    }).catch(() => null),
    OptimizationZoning.findOne({
      where: { projectId: project.id },
      order: [['created_at', 'DESC']]
    }).catch(() => null)
  ]);

  // Add zoning data
  if (zoningResult) {
    report.sections.zoning = {
      zoningType: zoningResult.zoning_type,
      zoningData: zoningResult.zoning_data,
      zoningResult: zoningResult.zoning_result,
      results: zoningResult.results,
      analysisDate: zoningResult.created_at
    };
  }

  // Add optimization zoning data
  if (optimizationZoning) {
    report.sections.optimizationZoning = {
      statistics: optimizationZoning.statistics,
      zoneStatistics: optimizationZoning.zoneStatistics,
      landUseDistribution: optimizationZoning.landUseDistribution,
      roadNetwork: optimizationZoning.roadNetwork,
      zones: optimizationZoning.zones,
      results: optimizationZoning.results,
      fitnessScore: optimizationZoning.fitnessScore,
      generations: optimizationZoning.generations,
      convergenceInfo: optimizationZoning.convergenceInfo,
      analysisDate: optimizationZoning.created_at
    };
  }

  // Add design data
  report.sections.design = {
    buildings: {
      count: buildings.length,
      totalArea: buildings.reduce((sum, b) => sum + parseFloat(b.area || 0), 0),
      byType: groupBy(buildings, 'type'),
      details: buildings.map(b => ({
        name: b.name,
        type: b.type,
        area: b.area,
        floors: b.floors,
        status: b.status
      }))
    },
    roads: {
      count: roads.length,
      totalLength: roads.reduce((sum, r) => sum + parseFloat(r.length || 0), 0),
      byType: groupBy(roads, 'type'),
      details: roads.map(r => ({
        name: r.name,
        type: r.type,
        width: r.width,
        length: r.length,
        status: r.status
      }))
    },
    parcels: {
      count: parcels.length,
      totalArea: parcels.reduce((sum, p) => sum + parseFloat(p.area || 0), 0),
      details: parcels.map(p => ({
        id: p.id,
        area: p.area,
        zoning: p.zoning_type,
        status: p.status
      }))
    },
    greenSpaces: {
      count: greenSpaces.length,
      totalArea: greenSpaces.reduce((sum, g) => sum + parseFloat(g.area || 0), 0),
      details: greenSpaces.map(g => ({
        name: g.name,
        type: g.type,
        area: g.area
      }))
    },
    infrastructure: {
      count: infrastructure.length,
      byType: groupBy(infrastructure, 'type'),
      details: infrastructure.map(i => ({
        name: i.name,
        type: i.type,
        status: i.status
      }))
    }
  };

  // Generate executive summary
  report.sections.executiveSummary = {
    overview: `This report provides a comprehensive analysis of the ${project.title} project located in ${project.location}.`,
    keyMetrics: {
      progress: `${project.progress}%`,
      status: project.status,
      priority: project.priority,
      area: `${project.area} hectares`,
      budget: project.budget ? `$${parseFloat(project.budget).toLocaleString()}` : 'Not specified'
    },
    components: {
      buildings: buildings.length,
      roads: roads.length,
      parcels: parcels.length,
      greenSpaces: greenSpaces.length,
      infrastructure: infrastructure.length
    }
  };

  // Generate recommendations based on analysis
  if (report.sections.terrainAnalysis) {
    report.sections.recommendations = generateRecommendations(report.sections.terrainAnalysis, report.sections.design);
  }

  return report;
}

// Helper function to group by property
function groupBy(array, property) {
  return array.reduce((acc, item) => {
    const key = item[property] || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

// Generate recommendations based on analysis
function generateRecommendations(terrainAnalysis, design) {
  const recommendations = [];

  if (terrainAnalysis.slope) {
    const slopeData = terrainAnalysis.slope;
    if (slopeData.steep_slopes > 30) {
      recommendations.push({
        type: 'slope',
        priority: 'high',
        message: 'High percentage of steep slopes detected. Consider terracing or slope stabilization measures.',
        impact: 'Construction safety and stability'
      });
    }
  }

  if (terrainAnalysis.results?.flood_analysis) {
    const floodData = terrainAnalysis.results.flood_analysis;
    if (floodData.flood_stats?.high_risk_area > 0.1) {
      recommendations.push({
        type: 'flood',
        priority: 'high',
        message: 'Significant flood risk areas identified. Implement proper drainage systems and elevation strategies.',
        impact: 'Property protection and safety'
      });
    }
  }

  if (design.buildings.count === 0) {
    recommendations.push({
      type: 'design',
      priority: 'medium',
      message: 'No buildings have been designed yet. Consider adding building designs to the project.',
      impact: 'Project completeness'
    });
  }

  if (design.roads.count === 0) {
    recommendations.push({
      type: 'design',
      priority: 'medium',
      message: 'No road network has been designed. Road infrastructure is essential for project viability.',
      impact: 'Accessibility and connectivity'
    });
  }

  return recommendations;
}

// Get all analysis reports for a user
async function getAllAnalysisReports(userId) {
  const reports = [];

  // Get Terrain Analysis Reports
  const terrainAnalyses = await TerrainAnalysis.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']]
  });

  for (const analysis of terrainAnalyses) {
    if (analysis.project_id) {
      const project = await Project.findByPk(analysis.project_id);
      if (project && (project.status === 'Planning' || project.status === 'In Progress')) {
        reports.push(await generateTerrainReport(analysis, project));
      }
    }
  }

  // Get Land Suitability Reports
  const landSuitabilityAnalyses = await LandSuitability.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']]
  });

  for (const analysis of landSuitabilityAnalyses) {
    if (analysis.project_id) {
      const project = await Project.findByPk(analysis.project_id);
      if (project && (project.status === 'Planning' || project.status === 'In Progress')) {
        reports.push(await generateLandSuitabilityReport(analysis, project));
      }
    }
  }

  // Get Zoning Reports
  // Use attributes to only select columns that exist, or use raw query
  // For now, we'll use findAll and handle missing columns gracefully
  const zoningResults = await ZoningResult.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    // Don't specify attributes - let Sequelize handle it and we'll check for existence
    raw: false // Keep as instance to access all fields
  });

  for (const zoning of zoningResults) {
    if (zoning.project_id) {
      const project = await Project.findByPk(zoning.project_id);
      if (project && (project.status === 'Planning' || project.status === 'In Progress')) {
        reports.push(await generateZoningReport(zoning, project));
      }
    }
  }

  // Get Optimization Zoning Reports
  const optimizationZonings = await OptimizationZoning.findAll({
    where: { userId: userId },
    order: [['created_at', 'DESC']]
  });

  for (const optZoning of optimizationZonings) {
    if (optZoning.projectId) {
      const project = await Project.findByPk(optZoning.projectId);
      if (project && (project.status === 'Planning' || project.status === 'In Progress')) {
        reports.push(await generateOptimizationZoningReport(optZoning, project));
      }
    }
  }

  return reports;
}

// Generate Terrain Analysis Report
async function generateTerrainReport(analysis, project) {
  // Parse results if it's a string
  const results = typeof analysis.results === 'string' 
    ? JSON.parse(analysis.results) 
    : (analysis.results || {});
  
  return {
    id: `terrain_${analysis.id}_${Date.now()}`,
    reportType: 'terrain',
    analysisType: 'Terrain Analysis',
    projectId: project.id,
    projectTitle: project.title,
    projectLocation: project.location,
    generatedAt: analysis.created_at || new Date().toISOString(),
    analysisDate: analysis.created_at,
    sections: {
      elevation: results.elevation_stats || analysis.elevation_data || {},
      slope: results.slope_analysis || analysis.slope_data || {},
      aspect: results.aspect_analysis || analysis.aspect_data || {},
      floodRisk: results.flood_risk_analysis || results.flood_analysis || {},
      erosion: results.erosion_analysis || {},
      waterAvailability: results.water_availability || {},
      terrainRuggedness: results.terrain_ruggedness || {},
      flowAccumulation: results.flow_accumulation_stats || {},
      results: results,
      analysisParameters: analysis.analysis_parameters
    },
    summary: {
      status: analysis.status,
      analysisType: analysis.analysis_type || 'terrain',
      meanElevation: results.elevation_stats?.mean || results.stats?.mean_elevation,
      meanSlope: results.slope_analysis?.mean_slope || results.stats?.mean_slope,
      floodRiskScore: results.flood_risk_analysis?.flood_risk_score || results.flood_analysis?.flood_risk_score,
      erosionRiskScore: results.erosion_analysis?.erosion_risk_score
    }
  };
}

// Generate Land Suitability Report
async function generateLandSuitabilityReport(analysis, project) {
  // Parse results if it's a string
  const results = typeof analysis.results === 'string' 
    ? JSON.parse(analysis.results) 
    : (analysis.results || {});
  
  return {
    id: `land_suitability_${analysis.id}_${Date.now()}`,
    reportType: 'land_suitability',
    analysisType: 'Land Suitability Analysis',
    projectId: project.id,
    projectTitle: project.title,
    projectLocation: project.location,
    generatedAt: analysis.created_at || new Date().toISOString(),
    analysisDate: analysis.created_at,
    sections: {
      soilData: analysis.soil_data,
      landUseData: analysis.land_use_data,
      environmentalFactors: analysis.environmental_factors,
      suitabilityScores: analysis.suitability_scores || results.suitability_scores || {},
      analysisSummary: results.analysis_summary || {},
      suitabilityClassification: results.suitability_classification || {},
      residentialSuitability: results.residential_suitability || {},
      commercialSuitability: results.commercial_suitability || {},
      recommendations: results.recommendations || [],
      warnings: results.warnings || [],
      restrictions: results.restrictions || [],
      aiRecommendations: results.ai_recommendations || [],
      waterInfo: results.water_info || {},
      terrainFeatures: results.terrain_features || results.analysis_summary?.terrain_features || {},
      suitabilityPercentages: results.suitability_percentages || results.analysis_summary?.suitability_percentages || {},
      probabilities: results.probabilities || results.analysis_summary?.probabilities || {},
      results: results,
      analysisParameters: analysis.analysis_parameters
    },
    summary: {
      status: analysis.status,
      analysisType: analysis.analysis_type || 'land_suitability',
      suitabilityScore: results.suitability_score || results.analysis_summary?.scores?.mean_score || analysis.suitability_scores?.residential || 0,
      suitabilityClass: results.analysis_summary?.suitability_class || results.suitability_classification?.class,
      suitabilityLabel: results.analysis_summary?.suitability_label || results.suitability_classification?.label,
      confidence: results.analysis_summary?.confidence || results.probabilities?.high || 0
    }
  };
}

// Generate Zoning Report
async function generateZoningReport(zoning, project) {
  return {
    id: `zoning_${zoning.id}_${Date.now()}`,
    reportType: 'zoning',
    analysisType: 'Zoning Analysis',
    projectId: project.id,
    projectTitle: project.title,
    projectLocation: project.location,
    generatedAt: zoning.created_at || new Date().toISOString(),
    analysisDate: zoning.created_at,
    sections: {
      zoningType: zoning.zoning_type,
      zoningData: zoning.zoning_data,
      zoningResult: zoning.zoning_result,
      results: zoning.results,
      analysisParameters: zoning.analysis_parameters
    },
    summary: {
      status: zoning.status,
      zoningType: zoning.zoning_type
    }
  };
}

// Generate Optimization Zoning Report
async function generateOptimizationZoningReport(optZoning, project) {
  return {
    id: `optimization_zoning_${optZoning.id}_${Date.now()}`,
    reportType: 'optimization_zoning',
    analysisType: 'Optimization Zoning Analysis',
    projectId: project.id,
    projectTitle: project.title,
    projectLocation: project.location,
    generatedAt: optZoning.created_at || new Date().toISOString(),
    analysisDate: optZoning.created_at,
    sections: {
      statistics: optZoning.statistics,
      zoneStatistics: optZoning.zoneStatistics,
      landUseDistribution: optZoning.landUseDistribution,
      roadNetwork: optZoning.roadNetwork,
      zones: optZoning.zones,
      results: optZoning.results,
      parameters: optZoning.parameters,
      fitnessScore: optZoning.fitnessScore,
      generations: optZoning.generations,
      convergenceInfo: optZoning.convergenceInfo
    },
    summary: {
      status: optZoning.status,
      method: optZoning.method,
      fitnessScore: optZoning.fitnessScore
    }
  };
}

// Generate analysis-specific report
async function generateAnalysisReport(project, reportType, userId) {
  let report = null;

  switch (reportType) {
    case 'terrain':
      const terrainAnalysis = await TerrainAnalysis.findOne({
        where: {
          project_id: project.id,
          user_id: userId
        },
        order: [['created_at', 'DESC']]
      });
      if (terrainAnalysis) {
        report = await generateTerrainReport(terrainAnalysis, project);
      }
      break;

    case 'land_suitability':
      const landSuitability = await LandSuitability.findOne({
        where: {
          project_id: project.id,
          user_id: userId
        },
        order: [['created_at', 'DESC']]
      });
      if (landSuitability) {
        report = await generateLandSuitabilityReport(landSuitability, project);
      }
      break;

    case 'zoning':
      const zoning = await ZoningResult.findOne({
        where: {
          project_id: project.id,
          user_id: userId
        },
        order: [['created_at', 'DESC']]
      });
      if (zoning) {
        report = await generateZoningReport(zoning, project);
      }
      break;

    case 'optimization_zoning':
      const optZoning = await OptimizationZoning.findOne({
        where: {
          projectId: project.id,
          userId: userId
        },
        order: [['created_at', 'DESC']]
      });
      if (optZoning) {
        report = await generateOptimizationZoningReport(optZoning, project);
      }
      break;
  }

  if (!report) {
    throw new Error(`No ${reportType} analysis found for this project`);
  }

  return report;
}

// Extend reportController with additional methods
Object.assign(reportController, {
  // Generate PDF Report (Python backend integration)
  generatePDFReport: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        dem_path,
        polygon_id,
        polygon_ids,
        project_id,
        report_type = 'comprehensive',
        output_filename
      } = req.body;

      if (!project_id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Proxy to Python backend for PDF generation
      const axios = require('axios');
      const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:5002';

      const response = await axios.post(`${PYTHON_API_BASE}/api/generate_pdf_report`, {
        dem_path,
        polygon_id,
        polygon_ids,
        project_id,
        report_type,
        output_filename: output_filename || `FYP_Report_Project_${project_id}_${Date.now()}.pdf`
      }, {
        timeout: 120000 // 2 minutes timeout for PDF generation
      });

      res.json(response.data);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      res.status(500).json({
        error: 'Failed to generate PDF report',
        details: error.response?.data?.detail || error.message
      });
    }
  },

  // List PDF Reports
  listPDFReports: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Proxy to Python backend
      const axios = require('axios');
      const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:5002';

      const response = await axios.get(`${PYTHON_API_BASE}/api/pdf_reports`);
      
      res.json(response.data);
    } catch (error) {
      console.error('Error listing PDF reports:', error);
      res.status(500).json({
        error: 'Failed to list PDF reports',
        details: error.response?.data?.detail || error.message,
        reports: []
      });
    }
  },

  // Delete PDF Report
  deletePDFReport: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { filename } = req.params;

      if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
      }

      // Proxy to Python backend
      const axios = require('axios');
      const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:5002';

      const response = await axios.delete(`${PYTHON_API_BASE}/api/pdf_reports/${filename}`);
      
      res.json(response.data);
    } catch (error) {
      console.error('Error deleting PDF report:', error);
      res.status(500).json({
        error: 'Failed to delete PDF report',
        details: error.response?.data?.detail || error.message
      });
    }
  },

  // Export Report (Excel, CSV, JSON)
  exportReport: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { format = 'excel', reportType = 'full' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get project
      const project = await Project.findOne({
        where: {
          id: projectId,
          created_by: userId,
          is_active: true
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Generate report data
      const reportData = await generateReportData(project, reportType);

      // Export based on format
      if (format === 'excel') {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        // Create worksheets for different sections
        await createExcelWorksheets(workbook, reportData);
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title}_Report_${Date.now()}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
      } else if (format === 'csv') {
        const csv = await generateCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title}_Report_${Date.now()}.csv"`);
        res.send(csv);
      } else {
        // JSON export
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title}_Report_${Date.now()}.json"`);
        res.json(reportData);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        error: 'Failed to export report',
        details: error.message
      });
    }
  },

  // Get Report Templates
  getReportTemplates: async (req, res) => {
    try {
      const templates = [
        {
          id: 'full',
          name: 'Full Project Report',
          description: 'Comprehensive report including all analyses and design elements',
          sections: ['executive', 'terrain', 'suitability', 'design', 'recommendations'],
          icon: 'FileText'
        },
        {
          id: 'executive',
          name: 'Executive Summary',
          description: 'High-level overview for stakeholders',
          sections: ['executive', 'keyMetrics', 'recommendations'],
          icon: 'Briefcase'
        },
        {
          id: 'terrain',
          name: 'Terrain Analysis Report',
          description: 'Detailed terrain and topography analysis',
          sections: ['terrain', 'elevation', 'slope', 'floodRisk'],
          icon: 'Mountain'
        },
        {
          id: 'land_suitability',
          name: 'Land Suitability Report',
          description: 'Comprehensive land suitability assessment',
          sections: ['suitability', 'recommendations', 'constraints'],
          icon: 'Map'
        },
        {
          id: 'zoning',
          name: 'Zoning Analysis Report',
          description: 'Zoning regulations and compliance analysis',
          sections: ['zoning', 'compliance', 'recommendations'],
          icon: 'Grid'
        },
        {
          id: 'optimization_zoning',
          name: 'Optimization Zoning Report',
          description: 'AI-optimized zoning with performance metrics',
          sections: ['optimization', 'zoning', 'performance'],
          icon: 'Zap'
        },
        {
          id: 'design',
          name: 'Design & Infrastructure Report',
          description: 'Detailed design elements and infrastructure',
          sections: ['buildings', 'roads', 'parcels', 'infrastructure'],
          icon: 'Building'
        },
        {
          id: 'environmental',
          name: 'Environmental Assessment',
          description: 'Environmental impact and sustainability analysis',
          sections: ['terrain', 'water', 'erosion', 'sustainability'],
          icon: 'Leaf'
        },
        {
          id: 'financial',
          name: 'Financial Analysis',
          description: 'Budget, costs, and financial projections',
          sections: ['budget', 'costs', 'projections'],
          icon: 'DollarSign'
        }
      ];

      res.json({
        success: true,
        templates
      });
    } catch (error) {
      console.error('Error fetching report templates:', error);
      res.status(500).json({
        error: 'Failed to fetch report templates',
        details: error.message
      });
    }
  }
});

// Helper function to create Excel worksheets
async function createExcelWorksheets(workbook, reportData) {
  // Project Overview worksheet
  const overviewSheet = workbook.addWorksheet('Project Overview');
  overviewSheet.columns = [
    { header: 'Property', key: 'property', width: 30 },
    { header: 'Value', key: 'value', width: 50 }
  ];
  
  overviewSheet.addRows([
    { property: 'Project Title', value: reportData.projectTitle },
    { property: 'Location', value: reportData.projectLocation },
    { property: 'Type', value: reportData.projectType },
    { property: 'Status', value: reportData.projectStatus },
    { property: 'Priority', value: reportData.projectPriority },
    { property: 'Progress', value: `${reportData.projectProgress}%` },
    { property: 'Budget', value: reportData.projectBudget },
    { property: 'Area', value: `${reportData.area} hectares` },
    { property: 'Start Date', value: reportData.startDate },
    { property: 'End Date', value: reportData.endDate }
  ]);

  // Terrain Analysis worksheet
  if (reportData.sections?.terrainAnalysis) {
    const terrainSheet = workbook.addWorksheet('Terrain Analysis');
    terrainSheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 30 }
    ];

    const terrain = reportData.sections.terrainAnalysis;
    if (terrain.elevation) {
      terrainSheet.addRows([
        { metric: 'Mean Elevation', value: `${terrain.elevation.mean || 0} m` },
        { metric: 'Min Elevation', value: `${terrain.elevation.min || 0} m` },
        { metric: 'Max Elevation', value: `${terrain.elevation.max || 0} m` },
        { metric: 'Elevation Range', value: `${terrain.elevation.range || 0} m` }
      ]);
    }
    if (terrain.slope) {
      terrainSheet.addRows([
        { metric: 'Mean Slope', value: `${terrain.slope.mean_slope || 0}°` },
        { metric: 'Max Slope', value: `${terrain.slope.max_slope || 0}°` },
        { metric: 'Min Slope', value: `${terrain.slope.min_slope || 0}°` }
      ]);
    }
  }

  // Design Elements worksheet
  if (reportData.sections?.design) {
    const designSheet = workbook.addWorksheet('Design Elements');
    designSheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Count', key: 'count', width: 15 },
      { header: 'Details', key: 'details', width: 50 }
    ];

    const design = reportData.sections.design;
    designSheet.addRows([
      { 
        category: 'Buildings', 
        count: design.buildings?.count || 0, 
        details: `Total Area: ${design.buildings?.totalArea || 0} m²` 
      },
      { 
        category: 'Roads', 
        count: design.roads?.count || 0, 
        details: `Total Length: ${design.roads?.totalLength || 0} m` 
      },
      { 
        category: 'Parcels', 
        count: design.parcels?.count || 0, 
        details: `Total Area: ${design.parcels?.totalArea || 0} m²` 
      },
      { 
        category: 'Green Spaces', 
        count: design.greenSpaces?.count || 0, 
        details: `Total Area: ${design.greenSpaces?.totalArea || 0} m²` 
      },
      { 
        category: 'Infrastructure', 
        count: design.infrastructure?.count || 0, 
        details: '' 
      }
    ]);
  }
}

// Helper function to generate CSV
async function generateCSV(reportData) {
  const rows = [];
  
  // Header
  rows.push(['Property', 'Value']);
  rows.push(['Project Title', reportData.projectTitle]);
  rows.push(['Location', reportData.projectLocation]);
  rows.push(['Type', reportData.projectType]);
  rows.push(['Status', reportData.projectStatus]);
  rows.push(['Progress', `${reportData.projectProgress}%`]);
  rows.push([]);
  
  // Design Elements
  if (reportData.sections?.design) {
    rows.push(['Design Elements', '']);
    rows.push(['Category', 'Count', 'Total']);
    const design = reportData.sections.design;
    rows.push(['Buildings', design.buildings?.count || 0, `${design.buildings?.totalArea || 0} m²`]);
    rows.push(['Roads', design.roads?.count || 0, `${design.roads?.totalLength || 0} m`]);
    rows.push(['Parcels', design.parcels?.count || 0, `${design.parcels?.totalArea || 0} m²`]);
    rows.push(['Green Spaces', design.greenSpaces?.count || 0, `${design.greenSpaces?.totalArea || 0} m²`]);
    rows.push(['Infrastructure', design.infrastructure?.count || 0, '']);
  }
  
  // Convert to CSV string
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

module.exports = reportController;

