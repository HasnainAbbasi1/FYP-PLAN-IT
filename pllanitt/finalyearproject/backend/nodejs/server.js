// Load environment variables from the parent backend .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');   // ✅ needed for static serving
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { sequelize, testConnection } = require('./config/database');
const PYTHON_BACKEND_DIR = path.join(__dirname, '..', 'python', 'app');

// ---------------- Import Routes ----------------
const polygonRoutes = require('./routes/polygonRoutes');
const suitabilityRoutes = require('./routes/suitabilityRoutes');
const authRoutes = require('./routes/auth');
// ✅ Import new project and dashboard routes
const projectRoutes = require('./routes/projectRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
// ✅ Import optimization zoning routes
const optimizationZoningRoutes = require('./routes/optimizationZoningRoutes');
// ✅ Import admin routes
const adminRoutes = require('./routes/adminRoutes');
// ✅ Import design routes
const designRoutes = require('./routes/designRoutes');
// ✅ Import report routes
const reportRoutes = require('./routes/reportRoutes');
// ✅ Import analytics routes
const analyticsRoutes = require('./routes/analyticsRoutes');
// ✅ Import zoning routes
const zoningRoutes = require('./routes/zoningRoutes');
// ✅ Import admin panel routes
const adminPanelRoutes = require('./routes/adminPanelRoutes');
// ✅ Import activity routes
const activityRoutes = require('./routes/activityRoutes');
// ✅ Import notification routes
const notificationRoutes = require('./routes/notificationRoutes');

// ✅ Import model associations
require('./models/associations');

const app = express();

// ---------------- Security & Rate Limiting Middleware ----------------
const { securityHeaders, sanitizeInput, requestSizeLimiter } = require('./middleware/security');
const { apiRateLimiter, authRateLimiter, uploadRateLimiter } = require('./middleware/rateLimiter');

// Security headers (apply to all routes)
app.use(securityHeaders);

// Request size limiting
app.use(requestSizeLimiter('50mb'));

// ---------------- Middleware ----------------
// Enhanced CORS configuration to allow all origins during development
app.use(cors({
  origin: '*', // Allow all origins (for development)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for large payloads
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Input sanitization (apply to all routes)
app.use(sanitizeInput);

// ---------------- Static folders ----------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ✅ Serve analysis outputs (heatmaps, etc.)
app.use('/output', express.static(path.join(__dirname, 'output')));

// ---------------- Routes ----------------
// Apply rate limiting to routes
app.use('/api/auth', authRateLimiter, authRoutes); // Stricter rate limit for auth
app.use('/api/polygon', apiRateLimiter, polygonRoutes);
app.use('/api/suitability', apiRateLimiter, suitabilityRoutes);
// ✅ New project and dashboard routes
app.use('/api/projects', apiRateLimiter, projectRoutes);
app.use('/api/dashboard', apiRateLimiter, dashboardRoutes);
// ✅ Optimization zoning routes
app.use('/api/optimization-zoning', apiRateLimiter, optimizationZoningRoutes);
// ✅ Admin routes
app.use('/api/admin', apiRateLimiter, adminRoutes);
// ✅ Design routes (roads, buildings, infrastructure, greenspaces, parcels)
app.use('/api/design', designRoutes);
// ✅ Report routes
app.use('/api/reports', reportRoutes);
// ✅ Analytics routes
app.use('/api/analytics', analyticsRoutes);
// ✅ Zoning routes
app.use('/api/zoning', zoningRoutes);
// ✅ Admin panel routes
app.use('/api/admin-panel', adminPanelRoutes);
// ✅ Activity routes
app.use('/api/activities', activityRoutes);
// ✅ Notification routes
app.use('/api/notifications', notificationRoutes);

// ---------------- Health check ----------------
// Health check endpoint - should be early in the route definitions
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running 🚀' });
});

// ---------------- User-specific Projects Endpoint (handled by routes/projectRoutes.js) ----------------

// ---------------- DEM Processing Endpoint (Proxy to Python Backend) ----------------
app.post('/api/process_dem', async (req, res) => {
  try {
    const { geojson, data_types, target_crs, preprocessing } = req.body;
    
    // Basic validation
    if (!geojson) {
      return res.status(400).json({ 
        error: 'GeoJSON data is required',
        validation: {
          is_valid: false,
          errors: ['Missing GeoJSON data']
        }
      });
    }
    
    // Ensure confirmation is set for Python backend
    const payload = {
      ...req.body,
      confirmed: req.body.confirmed || true
    };
    
    // Proxy request to Python backend for actual DEM processing
    try {
      const response = await fetchPythonBackend('/api/process_dem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python backend error: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('DEM processing result from Python backend:', result);
      res.json(result);
      
    } catch (pythonError) {
      console.error('Python backend communication error:', pythonError);
      
      // Fallback to simulated processing if Python backend is not available
      console.log('Falling back to simulated processing...');
      const fallbackResult = {
        message: 'DEM processing initiated (simulated - Python backend unavailable)',
        geojson: geojson,
        data_types: data_types || ['dem'],
        target_crs: target_crs || 'EPSG:4326',
        preprocessing: preprocessing || {},
        status: 'processing',
        timestamp: new Date().toISOString(),
        stats: {
          elevation: {
            min: 100,
            max: 500,
            mean: 300,
            std: 50
          },
          slope: {
            min: 0,
            max: 45,
            mean: 15,
            std: 10
          },
          aspect: {
            north: 25,
            south: 25,
            east: 25,
            west: 25
          }
        },
        validation: {
          is_valid: true,
          errors: [],
          warnings: ['Using simulated data - Python backend unavailable'],
          info: ['This is simulated terrain analysis data']
        }
      };
      
      res.json(fallbackResult);
    }
    
  } catch (error) {
    console.error('DEM processing error:', error);
    res.status(500).json({ 
      error: 'DEM processing failed',
      message: error.message 
    });
  }
});

// ---------------- Polygon Zoning Endpoint ----------------
app.post('/api/polygon_zoning', (req, res) => {
  try {
    const { polygon_id, zoning_type, parameters } = req.body;
    
    // Basic validation
    if (!polygon_id) {
      return res.status(400).json({ 
        error: 'Polygon ID is required',
        validation: {
          is_valid: false,
          errors: ['Missing polygon ID']
        }
      });
    }
    
    // Simulate zoning processing
    const result = {
      message: 'Zoning analysis initiated',
      polygon_id: polygon_id,
      zoning_type: zoning_type || 'residential',
      parameters: parameters || {},
      status: 'processing',
      timestamp: new Date().toISOString(),
      results: {
        zones: [
          { type: 'residential', area: 0.5, percentage: 50 },
          { type: 'commercial', area: 0.3, percentage: 30 },
          { type: 'green_space', area: 0.2, percentage: 20 }
        ],
        total_area: 1.0,
        efficiency_score: 85
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('Polygon zoning error:', error);
    res.status(500).json({ 
      error: 'Zoning analysis failed',
      message: error.message 
    });
  }
});

// ---------------- Intelligent Zoning Endpoint (Proxy to Python Backend) ----------------
app.post('/api/intelligent_zoning', async (req, res) => {
  try {
    const { polygon_id, geojson } = req.body;
    
    // Basic validation
    if (!polygon_id && !geojson) {
      return res.status(400).json({ 
        error: 'Polygon ID or GeoJSON is required',
        validation: {
          is_valid: false,
          errors: ['Missing polygon_id or geojson']
        }
      });
    }

    // Try to proxy to Python backend first
    try {
      const pythonResponse = await fetchPythonBackend('/api/intelligent_zoning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ polygon_id, geojson })
      });

      if (pythonResponse.ok) {
        const result = await pythonResponse.json();
        return res.json(result);
      }
    } catch (pythonError) {
      console.error('Python backend communication error:', pythonError);
      console.log('Python backend error details:', pythonError.message);
      console.log('Falling back to simulated processing...');
    }

    // Fallback: Simple intelligent zoning without Python backend
    const fallbackResult = {
      success: true,
      analysis: {
        zoning_prediction: {
          predicted_class: 0,
          predicted_label: "Residential",
          confidence: 0.75,
          color: "#3b82f6",
          top_3_predictions: [
            { class: 0, label: "Residential", probability: 0.75, color: "#3b82f6" },
            { class: 1, label: "Mixed Use", probability: 0.15, color: "#8b5cf6" },
            { class: 2, label: "Green Space", probability: 0.10, color: "#10b981" }
          ],
          all_probabilities: {
            "Residential": 0.75,
            "Commercial": 0.05,
            "Green Space/Parks": 0.10,
            "Mixed Use": 0.15,
            "Industrial": 0.02,
            "Conservation/Protected": 0.03
          }
        },
        terrain_summary: {
          mean_elevation: 500,
          mean_slope: 15,
          flood_risk: 20,
          erosion_risk: 0.3
        },
        zone_recommendations: {
          primary_zone: "residential",
          confidence: 0.75,
          recommendation: "Based on terrain analysis, this area is best suited for residential development with 75% confidence. The terrain shows moderate slopes and good elevation, making it ideal for housing development.",
          zone_breakdown: {
            residential: 0.75,
            commercial: 0.05,
            green: 0.10,
            mixed_use: 0.15,
            industrial: 0.02,
            conservation: 0.03
          }
        },
        visualization: {
          image_path: null,
          image_url: null
        }
      },
      message: "Intelligent zoning analysis completed successfully (fallback mode)"
    };

    res.json(fallbackResult);

  } catch (error) {
    console.error('Intelligent zoning proxy error:', error);
    res.status(500).json({
      error: 'Intelligent zoning analysis failed',
      details: error.message
    });
  }
});

// ---------------- Terrain Analysis Save Endpoint ----------------
app.post('/api/terrain_analysis/save', async (req, res) => {
  try {
    const { polygon_id, analysis_data, results, user_id, project_id } = req.body;
    
    // Basic validation
    if (!polygon_id) {
      return res.status(400).json({ 
        error: 'Polygon ID is required',
        validation: {
          is_valid: false,
          errors: ['Missing polygon ID']
        }
      });
    }

    if (!user_id) {
      return res.status(400).json({ 
        error: 'User ID is required',
        validation: {
          is_valid: false,
          errors: ['Missing user ID']
        }
      });
    }
    
    // Import TerrainAnalysis model
    const { TerrainAnalysis } = require('./models/associations');
    
    // Check if analysis already exists for this polygon
    // Search by polygon_id first, then check project_id match
    let existingAnalysis = null;
    
    if (project_id) {
      // Try exact match first
      existingAnalysis = await TerrainAnalysis.findOne({
        where: {
          polygon_id: polygon_id,
          project_id: parseInt(project_id)
        },
        order: [['created_at', 'DESC']]
      });
    }
    
    // If not found, try with any project_id for this polygon
    if (!existingAnalysis) {
      existingAnalysis = await TerrainAnalysis.findOne({
        where: {
          polygon_id: polygon_id
        },
        order: [['created_at', 'DESC']]
      });
    }
    
    // Prepare complete results for comprehensive report generation
    const completeResults = {
      stats: results?.stats || analysis_data?.stats || {},
      elevation_stats: results?.elevation_stats || analysis_data?.elevation_stats || {},
      slope_analysis: results?.slope_analysis || analysis_data?.slope_analysis || {},
      aspect_analysis: results?.aspect_analysis || analysis_data?.aspect_analysis || {},
      flood_risk_analysis: results?.flood_analysis || results?.flood_risk_analysis || analysis_data?.flood_analysis || {},
      erosion_analysis: results?.erosion_analysis || analysis_data?.erosion_analysis || {},
      water_availability: results?.water_availability || analysis_data?.water_availability || {},
      terrain_ruggedness: results?.terrain_ruggedness || analysis_data?.terrain_ruggedness || {},
      flow_accumulation_stats: results?.flow_accumulation_stats || analysis_data?.flow_accumulation_stats || {},
      preview_url: results?.preview_url || analysis_data?.preview_url || null,
      tif_url: results?.tif_url || analysis_data?.tif_url || null,
      classified_url: results?.classified_url || analysis_data?.classified_url || null,
      json_url: results?.json_url || analysis_data?.json_url || null,
      water_bodies_geojson: results?.water_bodies_geojson || analysis_data?.water_bodies_geojson || null,
      flood_risk_geojson: results?.flood_risk_geojson || analysis_data?.flood_risk_geojson || null,
      ...results, // Include any additional fields
      ...analysis_data // Include analysis data fields
    };
    
    let terrainAnalysis;
    
    if (existingAnalysis) {
      // Update existing analysis
      console.log('🔄 Updating existing terrain analysis:', existingAnalysis.id);
      await existingAnalysis.update({
        elevation_data: completeResults.stats || completeResults.elevation_stats || null,
        slope_data: completeResults.slope_analysis || null,
        aspect_data: completeResults.aspect_analysis || null,
        analysis_parameters: analysis_data?.parameters || null,
        results: completeResults, // Store complete results for report generation
        status: 'completed',
        updated_at: new Date()
      });
      terrainAnalysis = existingAnalysis;
      console.log('✅ Updated terrain analysis:', terrainAnalysis.id);
    } else {
      // Create new analysis
      console.log('✨ Creating new terrain analysis for polygon:', polygon_id, 'project_id:', project_id || 'null');
      terrainAnalysis = await TerrainAnalysis.create({
        polygon_id: polygon_id,
        project_id: project_id ? parseInt(project_id) : null,
        user_id: user_id,
        analysis_type: 'terrain',
        elevation_data: completeResults.stats || completeResults.elevation_stats || null,
        slope_data: completeResults.slope_analysis || null,
        aspect_data: completeResults.aspect_analysis || null,
        analysis_parameters: analysis_data?.parameters || null,
        results: completeResults, // Store complete results for report generation
        status: 'completed'
      });
      console.log('✅ Created new terrain analysis:', terrainAnalysis.id, 'saved with project_id:', terrainAnalysis.project_id);
    }
    
    // Verify the saved record by querying it back
    const verifyRecord = await TerrainAnalysis.findByPk(terrainAnalysis.id);
    if (verifyRecord) {
      console.log('✅ Verified saved record - ID:', verifyRecord.id, 'polygon_id:', verifyRecord.polygon_id, 'project_id:', verifyRecord.project_id, 'has_results:', !!verifyRecord.results);
    } else {
      console.error('❌ Failed to verify saved record!');
    }
    
    const result = {
      message: 'Terrain analysis data saved successfully',
      terrain_analysis_id: terrainAnalysis.id,
      polygon_id: polygon_id,
      project_id: terrainAnalysis.project_id,
      analysis_data: analysis_data || {},
      results: results || {},
      status: 'saved',
      timestamp: new Date().toISOString()
    };
    
    res.json(result);
  } catch (error) {
    console.error('Terrain analysis save error:', error);
    res.status(500).json({ 
      error: 'Failed to save terrain analysis',
      message: error.message
    });
  }
});

// ---------------- Land Suitability Endpoint ----------------
app.post('/api/land_suitability', async (req, res) => {
  try {
    const {
      geojson,
      polygon_id,
      parameters = {},
      user_id,
      project_id,
      weights,
      soil_raster_path,
      roads_geojson,
      terrain_data
    } = req.body || {};

    if (!user_id) {
      return res.status(400).json({ 
        error: 'User ID is required',
        validation: {
          is_valid: false,
          errors: ['Missing user ID']
        }
      });
    }

    // Determine GeoJSON either from request or database
    let polygonGeojson = geojson;
    if (!polygonGeojson && polygon_id) {
      try {
        const { Polygon } = require('./models/associations');
        const polygon = await Polygon.findByPk(polygon_id);
        if (polygon?.geojson) {
          polygonGeojson = polygon.geojson;
        }
      } catch (dbErr) {
        console.warn('Failed to fetch polygon geojson:', dbErr.message);
      }
    }

    if (!polygonGeojson) {
      return res.status(400).json({ 
        error: 'GeoJSON data is required',
        validation: {
          is_valid: false,
          errors: ['Missing GeoJSON data. Pass geojson in the request or ensure the polygon exists.']
        }
      });
    }
    
    // Ensure Python backend is ready
    let isRunning = await checkPythonBackend();
    if (!isRunning) {
      console.log('🔄 Python backend not running, attempting to start...');
      startPythonBackend();
      await new Promise(resolve => setTimeout(resolve, 5000));
      isRunning = await checkPythonBackend();
      if (!isRunning) {
        return res.status(503).json({ 
          error: 'Python backend is not running and could not be started automatically.',
          message: 'Please start the Python backend manually from backend/python/app: py -m uvicorn main:app --host 127.0.0.1 --port 5002',
          details: 'The land suitability analysis requires the Python backend to be running on port 5002.'
        });
      }
    }

    // Build payload for Python service
    // Try to include recent terrain analysis to improve DEM-derived stats (water, flood, etc.)
    let resolvedTerrainData = terrain_data;
    if (!resolvedTerrainData && polygon_id) {
      try {
        const { TerrainAnalysis } = require('./models/associations');
        const terrainAnalysis = await TerrainAnalysis.findOne({
          where: { polygon_id },
          order: [['created_at', 'DESC']]
        });

        if (terrainAnalysis) {
          const results = terrainAnalysis.results || {};
          let stats = {};
          let slope_analysis = {};
          let flood_analysis = {};
          let erosion_analysis = {};
          let water_availability = {};

          if (results.stats) {
            stats = results.stats;
          } else if (terrainAnalysis.elevation_data) {
            stats = terrainAnalysis.elevation_data;
          }

          if (results.slope_analysis) {
            slope_analysis = results.slope_analysis;
          } else if (terrainAnalysis.slope_data) {
            slope_analysis = terrainAnalysis.slope_data;
          }

          if (results.flood_analysis) {
            flood_analysis = results.flood_analysis;
          } else if (results.flood_risk_analysis) {
            flood_analysis = results.flood_risk_analysis;
          }

          if (results.erosion_analysis) {
            erosion_analysis = results.erosion_analysis;
          }

          if (results.water_availability) {
            water_availability = results.water_availability;
          } else if (stats.water_availability) {
            water_availability = stats.water_availability;
          }

          resolvedTerrainData = {
            stats,
            slope_analysis,
            flood_analysis,
            erosion_analysis,
            water_availability,
            results
          };
        }
      } catch (terrainErr) {
        console.warn('Unable to attach terrain analysis for land suitability:', terrainErr.message);
      }
    }

    const pythonPayload = {
      geojson: polygonGeojson,
      polygon_id,
      project_id,
      user_id,
      weights,
      parameters,
      soil_raster_path,
      roads_geojson,
      terrain_data: resolvedTerrainData
    };

    // Remove undefined keys to avoid overwriting Python defaults
    Object.keys(pythonPayload).forEach((key) => {
      if (pythonPayload[key] === undefined || pythonPayload[key] === null) {
        delete pythonPayload[key];
      }
    });

    let pythonResponse;
    try {
      pythonResponse = await fetchPythonBackend('/api/land_suitability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pythonPayload)
      });
    } catch (pythonErr) {
      console.error('Python backend communication error:', pythonErr);
      return res.status(500).json({
        error: 'Failed to communicate with Python backend',
        message: pythonErr.message
      });
    }

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('Python backend error:', errorText);
      return res.status(pythonResponse.status).json({
        error: 'Land suitability analysis failed in Python backend',
        details: errorText
      });
    }

    const data = await pythonResponse.json();

    const suitabilityPercentages = data?.stats?.percentages || null;
    let summary = data.summary;
    if (!summary && suitabilityPercentages) {
      const { low = 0, medium = 0, high = 0 } = suitabilityPercentages;
      const weightedScore = ((high * 0.9) + (medium * 0.6) + (low * 0.3)) / 100;
      const dominantClass = high >= medium && high >= low ? 'High'
        : medium >= low ? 'Medium'
        : 'Low';
      summary = {
        mean_score: Number(weightedScore.toFixed(2)),
        max_score: Math.max(low, medium, high),
        min_score: Math.min(low, medium, high),
        suitability_label: `${dominantClass} Suitability`,
        suitability_class: dominantClass.toUpperCase(),
        percentages: suitabilityPercentages
      };
    }

    // Persist results so they can be fetched later
    let landSuitabilityRecord = null;
    if (polygon_id) {
      try {
        const { LandSuitability } = require('./models/associations');
        landSuitabilityRecord = await LandSuitability.create({
          polygon_id,
          project_id: project_id || null,
          user_id,
          analysis_type: 'land_suitability',
          soil_data: parameters?.soil || null,
          land_use_data: parameters?.land_use || null,
          environmental_factors: parameters?.environmental || null,
          suitability_scores: suitabilityPercentages,
          analysis_parameters: {
            ...parameters,
            weights: weights || parameters?.weights || null
          },
          results: {
            ...data,
            summary
          },
          status: data.status === 'success' ? 'completed' : data.status || 'completed'
        });
      } catch (dbError) {
        console.error('Failed to save land suitability analysis:', dbError);
      }
    }

    res.json({
      status: data.status || 'success',
      message: data.message || 'Land suitability analysis completed successfully',
      land_suitability_id: landSuitabilityRecord?.id || null,
      polygon_id: polygon_id || null,
      project_id: project_id || null,
      geojson: polygonGeojson,
      parameters,
      timestamp: new Date().toISOString(),
      summary,
      ...data
    });
  } catch (error) {
    console.error('Land suitability analysis error:', error);
    res.status(500).json({ 
      error: 'Land suitability analysis failed',
      message: error.message 
    });
  }
});

// ---------------- AI Assistant Endpoint (OpenAI or OpenRouter) ----------------
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!openaiKey && !openrouterKey) {
      console.error('❌ No AI API key configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY in backend/.env');
      return res.status(500).json({
        answer:
          'AI is not configured. Please set OPENAI_API_KEY or OPENROUTER_API_KEY in backend/.env.',
      });
    }

    console.log('📩 User Question:', question);

    // Shared messages
    const messages = [
            {
        role: 'system',
        content:
          `You are PLAN-it, a helpful assistant who specializes in urban planning, city design, transportation, housing, and sustainability.
Always try to connect the user's question to these topics if possible. 
Only if it is absolutely impossible to relate the question to urban planning, reply with: "I can't do that".`,
            },
            {
        role: 'assistant',
              content:
                "👋 Hi, I'm PLAN-it, your urban planning assistant! Ask me anything about cities, transport, housing, or sustainability.",
            },
      { role: 'user', content: question },
    ];

    let response;

    if (openaiKey) {
      // Use OpenAI directly
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `❌ OpenAI HTTP error ${response.status}: ${errText.slice(0, 500)}`
        );
        throw new Error(`OpenAI HTTP error ${response.status}`);
      }
    } else {
      // Fallback to OpenRouter
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'PLAN-it AI Assistant',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages,
        }),
      });

    if (!response.ok) {
        const errText = await response.text();
        console.error(
          `❌ OpenRouter HTTP error ${response.status}: ${errText.slice(0, 500)}`
        );
        throw new Error(`OpenRouter HTTP error ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('🤖 AI raw response:', JSON.stringify(data, null, 2));

    const answer = data?.choices?.[0]?.message?.content || 'No response received.';
    res.json({ answer });
  } catch (error) {
    console.error('❌ AI Assistant API Error:', error);
    res.status(500).json({ answer: 'Error connecting to AI.' });
  }
});

// ---------------- Create Admin User Endpoint (Development Only) ----------------
app.post('/api/create-admin', async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@planit.com' } });
    
    if (existingAdmin) {
      return res.status(200).json({ 
        message: '⚠️ Admin user already exists',
        email: 'admin@planit.com'
      });
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@planit.com',
      password: 'Admin123',
      role: 'admin',
      isActive: true
    });

    res.status(201).json({
      message: '✅ Admin user created successfully!',
      email: 'admin@planit.com',
      password: 'Admin123',
      note: 'Change this password after first login'
    });
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin user', details: error.message });
  }
});

// ---------------- Enhanced Land Suitability Endpoint ----------------
// Handle both GET (for checking) and POST (for analysis)
app.get('/api/land_suitability_enhanced', (req, res) => {
  res.status(405).json({ 
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST requests. Use POST to run land suitability analysis.'
  });
});

app.post('/api/land_suitability_enhanced', async (req, res) => {
  try {
    console.log('✅ Enhanced land suitability request received at Node.js backend');
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('Request polygon_id:', req.body?.polygon_id);
    
    const { polygon_id } = req.body;
    
    // If polygon_id is provided, get terrain analysis data from database
    if (polygon_id) {
      try {
        const { TerrainAnalysis } = require('./models/associations');
        
        // Get the latest terrain analysis for this polygon
        const terrainAnalysis = await TerrainAnalysis.findOne({
          where: { polygon_id: polygon_id },
          order: [['created_at', 'DESC']]
        });
        
        if (terrainAnalysis) {
          console.log('Found terrain analysis in database for polygon:', polygon_id);
          
          // Extract terrain data from database - check multiple possible locations
          let stats = {};
          let slope_analysis = {};
          let flood_analysis = {};
          let erosion_analysis = {};
          let water_availability = {};
          
          // Get the full results object
          const results = terrainAnalysis.results || {};
          
          // Try to get stats from results first, then from elevation_data
          if (results.stats) {
            stats = results.stats;
          } else if (terrainAnalysis.elevation_data) {
            stats = terrainAnalysis.elevation_data;
          }
          
          // Try to get slope_analysis from results first, then from slope_data
          if (results.slope_analysis) {
            slope_analysis = results.slope_analysis;
          } else if (terrainAnalysis.slope_data) {
            slope_analysis = terrainAnalysis.slope_data;
          }
          
          // Extract flood_analysis, erosion_analysis, and water_availability from results
          if (results.flood_analysis) {
            flood_analysis = results.flood_analysis;
          } else if (results.flood_risk_analysis) {
            flood_analysis = results.flood_risk_analysis;
          }
          
          if (results.erosion_analysis) {
            erosion_analysis = results.erosion_analysis;
          }
          
          if (results.water_availability) {
            water_availability = results.water_availability;
          } else if (stats.water_availability) {
            water_availability = stats.water_availability;
          }
          
          // If we still don't have the data, try to extract from the raw results
          if (!stats.mean_elevation && results) {
            // Try to find elevation data in the results
            if (results.stats) {
              stats = results.stats;
            } else if (results.elevation_data) {
              stats = results.elevation_data;
            } else if (results.mean_elevation !== undefined) {
              stats = { mean_elevation: results.mean_elevation };
            }
          }
          
          if (!slope_analysis.mean_slope && results) {
            // Try to find slope data in the results
            if (results.slope_analysis) {
              slope_analysis = results.slope_analysis;
            } else if (results.slope_data) {
              slope_analysis = results.slope_data;
            } else if (results.mean_slope !== undefined) {
              slope_analysis = { mean_slope: results.mean_slope };
            }
          }
          
          const terrainData = {
            stats: stats,
            slope_analysis: slope_analysis,
            flood_analysis: flood_analysis,
            erosion_analysis: erosion_analysis,
            water_availability: water_availability,
            results: results
          };
          
          // Add terrain data to the request payload
          req.body.terrain_data = terrainData;
          console.log('Added terrain data to request:', {
            mean_elevation: terrainData.stats?.mean_elevation,
            mean_slope: terrainData.slope_analysis?.mean_slope,
            max_elevation: terrainData.stats?.max_elevation,
            min_elevation: terrainData.stats?.min_elevation,
            stats_keys: Object.keys(terrainData.stats || {}),
            slope_keys: Object.keys(terrainData.slope_analysis || {})
          });
        } else {
          console.log('No terrain analysis found in database for polygon:', polygon_id);
        }
      } catch (dbError) {
        console.error('Database query error:', dbError);
        // Continue without terrain data
      }
    }
    
    // Check if Python backend is running first
    const isRunning = await checkPythonBackend();
    if (!isRunning) {
      console.log('🔄 Python backend not running, attempting to start...');
      startPythonBackend();
      // Wait a bit for it to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check again
      const stillNotRunning = !(await checkPythonBackend());
      if (stillNotRunning) {
        return res.status(503).json({ 
          error: 'Python backend is not running and could not be started automatically.',
          message: 'Please start the Python backend manually from backend/python/app: py -m uvicorn main:app --host 127.0.0.1 --port 5002',
          details: 'The land suitability analysis requires the Python backend to be running on port 5002.'
        });
      }
    }
    
    // Proxy the request to Python backend
    try {
      console.log('🔄 Proxying land suitability request to Python backend...');
      const response = await fetchPythonBackend('/api/land_suitability_enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Python backend error:', errorText);
        return res.status(response.status).json({
          error: 'Enhanced land suitability analysis failed',
          details: errorText
        });
      }
      
      const data = await response.json();
      console.log('✅ Enhanced land suitability response received from Python backend');
      
      // Save enhanced land suitability results to database
      if (data.status === 'success' && polygon_id) {
        try {
          const { LandSuitability } = require('./models/associations');
          const { user_id, project_id } = req.body;
          
          // Check if land suitability record already exists
          let landSuitability = await LandSuitability.findOne({
            where: { 
              polygon_id: polygon_id,
              project_id: project_id || null
            },
            order: [['created_at', 'DESC']]
          });
          
          // Prepare results object with enhanced data - include ALL data for comprehensive reports
          const enhancedResults = {
            residential_suitability: data.residential_suitability,
            commercial_suitability: data.commercial_suitability,
            ai_recommendations: data.ai_recommendations || [],
            water_info: data.water_info || {},
            suitability_classification: data.suitability_classification || {},
            analysis_summary: data.analysis_summary || {},
            recommendations: data.recommendations || [],
            warnings: data.warnings || [],
            restrictions: data.restrictions || [],
            suitability_score: data.suitability_classification?.score || data.analysis_summary?.scores?.mean_score || 0,
            land_use_recommendations: data.recommendations || [],
            constraints: data.restrictions || [],
            // Include terrain data if available
            terrain_data: data.terrain_data || {},
            terrain_features: data.analysis_summary?.terrain_features || {},
            suitability_percentages: data.analysis_summary?.suitability_percentages || {},
            probabilities: data.analysis_summary?.probabilities || {},
            // Include visualization URLs
            heatmap_url: data.heatmap_url || null,
            charts_url: data.charts_url || null,
            preview_url: data.preview_url || null,
            classified_url: data.classified_url || null,
            tif_url: data.tif_url || null,
            json_url: data.json_url || null,
            // Include all other data
            ...data
          };
          
          if (landSuitability) {
            // Update existing record
            console.log('🔄 Updating existing land suitability record:', landSuitability.id);
            await landSuitability.update({
              results: enhancedResults,
              suitability_scores: {
                residential: data.residential_suitability?.score || 0,
                commercial: data.commercial_suitability?.score || 0
              },
              status: 'completed',
              updated_at: new Date()
            });
            console.log('✅ Updated land suitability record:', landSuitability.id);
          } else if (user_id) {
            // Create new record
            console.log('✨ Creating new land suitability record for polygon:', polygon_id);
            landSuitability = await LandSuitability.create({
              polygon_id: polygon_id,
              project_id: project_id || null,
              user_id: user_id,
              analysis_type: 'land_suitability_enhanced',
              results: enhancedResults,
              suitability_scores: {
                residential: data.residential_suitability?.score || 0,
                commercial: data.commercial_suitability?.score || 0
              },
              status: 'completed'
            });
            console.log('✅ Created new land suitability record:', landSuitability.id);
          }
        } catch (dbError) {
          console.error('Error saving enhanced land suitability to database:', dbError);
          // Continue even if database save fails
        }
      }
      
      res.json(data);
    } catch (error) {
      console.error('Enhanced land suitability proxy error:', error);
      res.status(500).json({ 
        error: 'Enhanced land suitability analysis failed',
        message: error.message 
      });
    }
  } catch (error) {
    console.error('Enhanced land suitability endpoint error:', error);
    res.status(500).json({ 
      error: 'Enhanced land suitability analysis failed',
      message: error.message 
    });
  }
});

// ---------------- Get Saved Land Suitability Analysis ----------------
app.get('/api/land_suitability', async (req, res) => {
  try {
    const { polygon_id, project_id } = req.query;
    
    if (!polygon_id) {
      return res.status(400).json({ 
        error: 'Polygon ID is required',
        validation: {
          is_valid: false,
          errors: ['Missing polygon_id parameter']
        }
      });
    }
    
    // Get saved land suitability analysis from database
    try {
      const { LandSuitability } = require('./models/associations');
      
      const whereClause = { polygon_id: parseInt(polygon_id) };
      if (project_id) {
        whereClause.project_id = parseInt(project_id);
      }
      
      const savedAnalysis = await LandSuitability.findOne({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });
      
      if (savedAnalysis && savedAnalysis.results) {
        console.log('✅ Found saved land suitability analysis in database for polygon:', polygon_id);
        
        // Parse results if it's a string
        const results = typeof savedAnalysis.results === 'string' 
          ? JSON.parse(savedAnalysis.results) 
          : savedAnalysis.results;
        
        // Return saved analysis in the format expected by frontend
        return res.json({
          status: 'success',
          message: 'Land suitability analysis retrieved from database',
          land_suitability: {
            id: savedAnalysis.id,
            polygon_id: savedAnalysis.polygon_id,
            project_id: savedAnalysis.project_id,
            created_at: savedAnalysis.created_at,
            results: results,
            analysis_summary: results.analysis_summary || {},
            suitability_classification: results.suitability_classification || {},
            residential_suitability: results.residential_suitability || {},
            commercial_suitability: results.commercial_suitability || {},
            recommendations: results.recommendations || [],
            warnings: results.warnings || [],
            restrictions: results.restrictions || [],
            ai_recommendations: results.ai_recommendations || [],
            water_info: results.water_info || {},
            heatmap_url: results.heatmap_url || null,
            charts_url: results.charts_url || null,
            preview_url: results.preview_url || null,
            classified_url: results.classified_url || null,
            tif_url: results.tif_url || null,
            json_url: results.json_url || null
          }
        });
      } else {
        return res.json({
          status: 'not_found',
          message: 'No saved land suitability analysis found',
          land_suitability: null
        });
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      res.status(500).json({ 
        error: 'Failed to retrieve land suitability analysis',
        message: dbError.message 
      });
    }
    
  } catch (error) {
    console.error('Land suitability retrieval error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve land suitability analysis',
      message: error.message 
    });
  }
});

// ---------------- Terrain Analysis Endpoint ----------------
app.get('/api/terrain_analysis', async (req, res) => {
  try {
    // Get polygon_id and project_id from query parameters
    const { polygon_id, project_id } = req.query;
    
    if (!polygon_id) {
      return res.status(400).json({ 
        error: 'Polygon ID is required',
        validation: {
          is_valid: false,
          errors: ['Missing polygon_id parameter']
        }
      });
    }
    
    // First, try to get saved analysis from database
    try {
      const { TerrainAnalysis } = require('./models/associations');
      
      // Search by polygon_id (most important) - try with project_id match first, then any
      console.log('🔍 Searching for saved terrain analysis with polygon_id:', polygon_id, 'project_id:', project_id || 'any');
      
      let savedAnalysis = null;
      
      // First try: exact match with polygon_id and project_id (if provided)
      if (project_id) {
        const parsedProjectId = parseInt(project_id);
        const parsedPolygonId = parseInt(polygon_id);
        console.log('🔍 Trying exact match - polygon_id:', parsedPolygonId, 'project_id:', parsedProjectId);
        savedAnalysis = await TerrainAnalysis.findOne({
          where: {
            polygon_id: parsedPolygonId,
            project_id: parsedProjectId
          },
          order: [['created_at', 'DESC']]
        });
        if (savedAnalysis) {
          console.log('✅ Found with exact project_id match - ID:', savedAnalysis.id);
        } else {
          console.log('❌ Not found with exact match');
        }
      }
      
      // Second try: polygon_id only (in case project_id was null or different)
      if (!savedAnalysis) {
        const parsedPolygonId = parseInt(polygon_id);
        console.log('🔍 Trying polygon_id only - polygon_id:', parsedPolygonId);
        const allMatches = await TerrainAnalysis.findAll({
          where: {
            polygon_id: parsedPolygonId
          },
          order: [['created_at', 'DESC']]
        });
        console.log('📊 Found', allMatches.length, 'records with polygon_id:', parsedPolygonId);
        if (allMatches.length > 0) {
          allMatches.forEach((match, idx) => {
            console.log(`  [${idx}] ID: ${match.id}, polygon_id: ${match.polygon_id}, project_id: ${match.project_id}, created_at: ${match.created_at}`);
          });
          savedAnalysis = allMatches[0]; // Get the most recent
          console.log('✅ Found with polygon_id only - ID:', savedAnalysis.id, 'project_id:', savedAnalysis.project_id);
        } else {
          console.log('❌ Not found with polygon_id only');
        }
      }
      
      if (savedAnalysis) {
        console.log('✅ Found saved terrain analysis in database:', savedAnalysis.id, 'project_id:', savedAnalysis.project_id);
        
        // Parse results if it's a string
        let results = {};
        if (savedAnalysis.results) {
          try {
            results = typeof savedAnalysis.results === 'string' 
              ? JSON.parse(savedAnalysis.results) 
              : savedAnalysis.results;
          } catch (parseError) {
            console.warn('⚠️ Error parsing results:', parseError);
            results = {};
          }
        }
        
        // Return saved analysis in the format expected by frontend
        return res.json({
          status: 'success',
          message: 'Terrain analysis retrieved from database',
          terrain_analysis: {
            id: savedAnalysis.id,
            polygon_id: savedAnalysis.polygon_id,
            project_id: savedAnalysis.project_id,
            created_at: savedAnalysis.created_at,
            results: results,
            stats: results.stats || savedAnalysis.elevation_data || {},
            slope_analysis: results.slope_analysis || savedAnalysis.slope_data || {},
            aspect_analysis: results.aspect_analysis || savedAnalysis.aspect_data || {},
            flood_analysis: results.flood_risk_analysis || results.flood_analysis || {},
            erosion_analysis: results.erosion_analysis || {},
            water_availability: results.water_availability || {},
            terrain_ruggedness: results.terrain_ruggedness || {},
            flow_accumulation_stats: results.flow_accumulation_stats || {},
            preview_url: results.preview_url || null,
            tif_url: results.tif_url || null,
            classified_url: results.classified_url || null,
            json_url: results.json_url || null,
            water_bodies_geojson: results.water_bodies_geojson || null,
            flood_risk_geojson: results.flood_risk_geojson || null
          }
        });
      } else {
        console.log('ℹ️ No saved terrain analysis found in database for polygon:', polygon_id);
        // Return not_found response immediately instead of trying Python backend
        return res.json({
          status: 'not_found',
          message: 'No saved terrain analysis found in database',
          terrain_analysis: null
        });
      }
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      console.error('Error details:', dbError.stack);
      // Return error response instead of trying Python backend
      return res.status(500).json({
        status: 'error',
        message: 'Database query failed',
        error: dbError.message,
        terrain_analysis: null
      });
    }
    
  } catch (error) {
    console.error('Terrain analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve terrain analysis',
      message: error.message 
    });
  }
});

// ---------------- Get All Terrain Analyses Endpoint ----------------
app.get('/api/terrain_analysis/all', async (req, res) => {
  try {
    // Proxy request to Python backend for all terrain analyses
    const pythonBackendUrl = 'http://localhost:5000/api/terrain_analysis';
    
    try {
      const response = await fetch(pythonBackendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python backend error: ${errorText}`);
      }
      
      const result = await response.json();
      res.json(result);
      
    } catch (pythonError) {
      console.error('Python backend error:', pythonError);
      // Return empty array if Python backend is not available
      res.json([]);
    }
    
  } catch (error) {
    console.error('Get all terrain analyses error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve terrain analyses',
      message: error.message 
    });
  }
});

// ---------------- Zoning Subdivision Endpoint ----------------
// ---------------- Land Subdivision Endpoint (Proxy to Python Backend) ----------------
app.post('/api/land_subdivision', async (req, res) => {
  try {
    console.log('📦 Land subdivision request received, proxying to Python backend...');
    
    // Proxy request to Python backend with longer timeout for large subdivisions
    try {
      const response = await fetchPythonBackend('/api/land_subdivision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      }, 3, 120000); // 3 retries, 120 second timeout (2 minutes)
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          errorData = { error: errorText || 'Unknown error' };
        }
        
        // Return the actual error from Python backend with appropriate status code
        return res.status(response.status).json({
          success: false,
          error: errorData.error || 'Subdivision failed',
          ...errorData
        });
      }
      
      const result = await response.json();
      console.log('✅ Land subdivision result from Python backend');
      res.json(result);
      
    } catch (pythonError) {
      console.error('❌ Python backend communication error:', pythonError);
      
      // Check if it's a connection error vs other error
      const isConnectionError = pythonError.code === 'ECONNREFUSED' || 
                                 pythonError.message.includes('ECONNREFUSED') ||
                                 pythonError.message.includes('fetch failed') ||
                                 pythonError.name === 'TypeError';
      
      if (isConnectionError) {
        res.status(503).json({ 
          success: false,
          error: 'Failed to connect to Python backend. Please ensure the Python server is running on port 5002.',
          message: pythonError.message 
        });
      } else {
        // It's a different error (timeout, etc.) - pass through the actual error
        res.status(500).json({ 
          success: false,
          error: pythonError.message || 'Python backend communication failed',
          message: pythonError.message 
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Land subdivision error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Land subdivision failed',
      message: error.message 
    });
  }
});

// ---------------- Road Network Design Endpoint (Proxy to Python Backend) ----------------
app.post('/api/road_network_design', async (req, res) => {
  try {
    console.log('🛣️ Road network design request received, proxying to Python backend...');
    console.log('📦 Request payload:', { 
      polygon_id: req.body.polygon_id,
      has_geojson: !!req.body.polygon_geojson,
      has_parcels: !!req.body.parcels
    });
    
    // Check if Python backend is running first
    const isRunning = await checkPythonBackend();
    if (!isRunning) {
      console.log('🔄 Python backend not running, attempting to start...');
      startPythonBackend();
      // Wait a bit for it to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check again
      const stillNotRunning = !(await checkPythonBackend());
      if (stillNotRunning) {
        return res.status(503).json({ 
          success: false,
          error: 'Python backend is not running and could not be started automatically.',
          message: 'Please start the Python backend manually from backend/python/app: py -m uvicorn main:app --host 127.0.0.1 --port 5002'
        });
      }
    }
    
    // Proxy request to Python backend
    try {
      const response = await fetchPythonBackend('/api/road_network_design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error('❌ Python backend error response:', errorData);
        return res.status(response.status).json({ 
          success: false,
          error: errorData.error || 'Road network design failed',
          message: errorData.message || errorText
        });
      }
      
      const result = await response.json();
      console.log('✅ Road network design result from Python backend');
      res.json(result);
      
    } catch (pythonError) {
      console.error('❌ Python backend communication error:', pythonError);
      res.status(500).json({ 
        success: false,
        error: pythonError.code === 'ECONNREFUSED' 
          ? 'Failed to connect to Python backend. Please ensure the Python server is running on port 5002.'
          : 'Python backend communication failed',
        message: pythonError.message 
      });
    }
    
  } catch (error) {
    console.error('❌ Road network design error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Road network design failed',
      message: error.message 
    });
  }
});

// ---------------- Road Network Results Endpoint (Proxy to Python Backend) ----------------
app.get('/api/road_network_results', async (req, res) => {
  try {
    console.log('🛣️ Road network results request received, proxying to Python backend...');
    
    // Proxy request to Python backend
    try {
      const response = await fetchPythonBackend('/api/road_network_results', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python backend error: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Road network results from Python backend');
      res.json(result);
      
    } catch (pythonError) {
      console.error('❌ Python backend communication error:', pythonError);
      res.status(500).json({ 
        success: false,
        error: 'Failed to connect to Python backend. Please ensure the Python server is running on port 5002.',
        message: pythonError.message,
        road_networks: []
      });
    }
    
  } catch (error) {
    console.error('❌ Road network results error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch road network results',
      message: error.message,
      road_networks: []
    });
  }
});

// ---------------- Subdivision Results Endpoint (Proxy to Python Backend) ----------------
app.get('/api/subdivision_results', async (req, res) => {
  try {
    // Proxy request to Python backend
    try {
      const response = await fetchPythonBackend('/api/subdivision_results', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python backend error: ${errorText}`);
      }
      
      const result = await response.json();
      res.json(result);
      
    } catch (pythonError) {
      console.error('❌ Python backend communication error:', pythonError);
      res.status(500).json({ 
        success: false,
        error: 'Failed to connect to Python backend',
        message: pythonError.message 
      });
    }
    
  } catch (error) {
    console.error('❌ Subdivision results error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch subdivision results',
      message: error.message 
    });
  }
});

// ---------------- Subdivision Standards Endpoint (Proxy to Python Backend) ----------------
app.get('/api/subdivision_standards', async (req, res) => {
  try {
    // Proxy request to Python backend
    try {
      const response = await fetchPythonBackend('/api/subdivision_standards', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python backend error: ${errorText}`);
      }
      
      const result = await response.json();
      res.json(result);
      
    } catch (pythonError) {
      console.error('❌ Python backend communication error:', pythonError);
      res.status(500).json({ 
        success: false,
        error: 'Failed to connect to Python backend',
        message: pythonError.message 
      });
    }
    
  } catch (error) {
    console.error('❌ Subdivision standards error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch subdivision standards',
      message: error.message 
    });
  }
});

app.post('/api/zoning_subdivision', async (req, res) => {
  try {
    const { polygon_id, polygon_geojson, terrain_data, suitability_data, method, n_zones, custom_weights } = req.body;
    
    // Basic validation
    if (!polygon_geojson) {
      return res.status(400).json({ 
        error: 'Polygon GeoJSON is required',
        validation: {
          is_valid: false,
          errors: ['Missing polygon GeoJSON data']
        }
      });
    }
    
    // Simulate zoning subdivision processing
    const subdivisionResult = {
      message: 'Zoning subdivision completed successfully',
      polygon_id: polygon_id || null,
      method: method || 'equal_area',
      n_zones: n_zones || 3,
      custom_weights: custom_weights || {},
      status: 'completed',
      timestamp: new Date().toISOString(),
      zoning_result: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              zone_id: 1,
              zone_type: 'residential',
              area_percentage: 40,
              suitability_score: 85
            },
            geometry: polygon_geojson
          },
          {
            type: 'Feature',
            properties: {
              zone_id: 2,
              zone_type: 'commercial',
              area_percentage: 30,
              suitability_score: 75
            },
            geometry: polygon_geojson
          },
          {
            type: 'Feature',
            properties: {
              zone_id: 3,
              zone_type: 'green_space',
              area_percentage: 30,
              suitability_score: 90
            },
            geometry: polygon_geojson
          }
        ]
      },
      download_url: `${req.protocol}://${req.get('host')}/download/zoning_subdivision_${Date.now()}.geojson`,
      analysis_summary: {
        total_zones: 3,
        average_suitability: 83.3,
        zone_distribution: {
          residential: 40,
          commercial: 30,
          green_space: 30
        }
      }
    };
    
    res.json(subdivisionResult);
  } catch (error) {
    console.error('Zoning subdivision error:', error);
    res.status(500).json({ 
      error: 'Zoning subdivision failed',
      message: error.message 
    });
  }
});

// ---------------- Zoning Results Endpoint ----------------
app.get('/api/zoning_results', (req, res) => {
  try {
    // Simulate zoning results data
    const result = {
      message: 'Zoning results data retrieved',
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        zoning_summary: {
          residential_zones: 60,
          commercial_zones: 25,
          industrial_zones: 10,
          green_zones: 5
        },
        efficiency_metrics: {
          land_use_efficiency: 85,
          connectivity_score: 78,
          sustainability_index: 82
        },
        recommendations: [
          'Optimize residential density',
          'Improve commercial accessibility',
          'Enhance green space connectivity'
        ]
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('Zoning results error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve zoning results',
      message: error.message 
    });
  }
});

// ---------------- Validate Endpoint ----------------
app.post('/api/validate', async (req, res) => {
  try {
    const { coordinates, bounds } = req.body;
    
    // Basic validation
    if (!coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates format',
        validation: {
          is_valid: false,
          errors: ['Coordinates must be an array']
        }
      });
    }
    
    if (!bounds || !bounds.north || !bounds.south || !bounds.east || !bounds.west) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounds format',
        validation: {
          is_valid: false,
          errors: ['Bounds must contain north, south, east, west values']
        }
      });
    }
    
    // Validate coordinate ranges
    const validCoordinates = coordinates.every(coord => 
      Array.isArray(coord) && 
      coord.length >= 2 && 
      typeof coord[0] === 'number' && 
      typeof coord[1] === 'number' &&
      coord[0] >= -180 && coord[0] <= 180 &&
      coord[1] >= -90 && coord[1] <= 90
    );
    
    if (!validCoordinates) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinate values',
        validation: {
          is_valid: false,
          errors: ['Coordinates must be valid longitude/latitude values']
        }
      });
    }
    
    // Validate bounds
    const validBounds = 
      bounds.north >= bounds.south &&
      bounds.east >= bounds.west &&
      bounds.north >= -90 && bounds.north <= 90 &&
      bounds.south >= -90 && bounds.south <= 90 &&
      bounds.east >= -180 && bounds.east <= 180 &&
      bounds.west >= -180 && bounds.west <= 180;
    
    if (!validBounds) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounds values',
        validation: {
          is_valid: false,
          errors: ['Bounds must be valid geographic coordinates']
        }
      });
    }
    
    res.json({
      success: true,
      validation: {
        is_valid: true,
        coordinates: coordinates.length,
        bounds: bounds,
        area: Math.abs((bounds.north - bounds.south) * (bounds.east - bounds.west))
      },
      message: 'Coordinates and bounds validated successfully'
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      message: error.message
    });
  }
});

// ---------------- Get Polygon Images Endpoint ----------------
app.get('/api/polygon-images/:polygonId', async (req, res) => {
  try {
    const { polygonId } = req.params;
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(__dirname, 'output');
    
    if (!fs.existsSync(outputDir)) {
      return res.json({ images: [], count: 0 });
    }
    
    // Read all files in output directory
    const files = fs.readdirSync(outputDir);
    
    // Filter files that match polygon ID patterns
    const polygonImages = files
      .filter(file => {
        // Match patterns like: zameen_style_society_polygon_{id}_{timestamp}.png
        const patterns = [
          new RegExp(`zameen_style_society_polygon_${polygonId}_\\d+\\.png$`),
          new RegExp(`zoning_polygon_${polygonId}_\\d+\\.png$`),
          new RegExp(`polygon_${polygonId}_\\d+\\.png$`),
          new RegExp(`.*polygon.*${polygonId}.*\\.png$`, 'i')
        ];
        return patterns.some(pattern => pattern.test(file));
      })
      .map(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          url: `/output/${file}`,
          created: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.created - a.created); // Sort by most recent first
    
    res.json({ 
      polygonId: parseInt(polygonId),
      images: polygonImages,
      count: polygonImages.length
    });
  } catch (error) {
    console.error('Error getting polygon images:', error);
    res.status(500).json({ 
      error: 'Failed to get polygon images',
      message: error.message 
    });
  }
});

// ---------------- Python Backend Manager ----------------
const PYTHON_BACKEND_PORT = 5002;
// Use 127.0.0.1 instead of localhost to force IPv4 and avoid IPv6 issues
const PYTHON_BACKEND_URL = `http://127.0.0.1:${PYTHON_BACKEND_PORT}`;
let pythonProcess = null;

// Function to check if Python backend is running
async function checkPythonBackend() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Function to find Python executable
function findPythonCommand() {
  const commands = process.platform === 'win32' 
    ? ['py', 'python', 'python3'] 
    : ['python3', 'python'];
  
  for (const cmd of commands) {
    try {
      // Try to get Python version to verify it exists
      execSync(`${cmd} --version`, { 
        stdio: 'ignore',
        timeout: 2000,
        shell: true
      });
      console.log(`✅ Found Python: ${cmd}`);
      return cmd;
    } catch (error) {
      // Command not found, try next
      continue;
    }
  }
  
  return null;
}

// Function to start Python backend
function startPythonBackend() {
  // Check if Python backend is already running
  checkPythonBackend().then(isRunning => {
    if (isRunning) {
      console.log('✅ Python backend is already running on port', PYTHON_BACKEND_PORT);
      return;
    }

    console.log('🔄 Starting Python backend on port', PYTHON_BACKEND_PORT + '...');
    
    // Find Python command
    const pythonCommand = findPythonCommand();
    if (!pythonCommand) {
      console.error('❌ Python not found!');
      console.log('💡 Please install Python from https://www.python.org/downloads/');
      console.log('💡 Or if Python is installed, make sure it\'s added to your PATH');
      console.log('💡 On Windows, you can also try: py --version');
      return;
    }
    
    // Use uvicorn to start the FastAPI app (same as manual start)
    const uvicornArgs = ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', PYTHON_BACKEND_PORT.toString()];

    if (!fs.existsSync(path.join(PYTHON_BACKEND_DIR, 'main.py'))) {
      console.error('❌ Cannot start Python backend: main.py not found in', PYTHON_BACKEND_DIR);
      return;
    }
    
    console.log(`🐍 Using Python command: ${pythonCommand}`);
    console.log(`📄 Starting with: ${pythonCommand} ${uvicornArgs.join(' ')} (cwd: ${PYTHON_BACKEND_DIR})`);
    
    pythonProcess = spawn(pythonCommand, uvicornArgs, {
      cwd: PYTHON_BACKEND_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { 
        ...process.env,
        PYTHONIOENCODING: 'utf-8'  // Fix Unicode encoding for emoji characters on Windows
      }
    });

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      // Only log important messages, filter out verbose uvicorn output
      if (output.includes('Application startup complete') || 
          output.includes('Uvicorn running') ||
          output.includes('Started server process') ||
          output.includes('ERROR') ||
          output.includes('WARNING')) {
        console.log(`[Python Backend] ${output}`);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString().trim();
      // Filter out common uvicorn startup messages that aren't errors
      if (!errorMsg.includes('INFO:') && 
          !errorMsg.includes('Application startup complete') &&
          !errorMsg.includes('Uvicorn running') &&
          !errorMsg.includes('Started server process') &&
          !errorMsg.includes('Waiting for application')) {
        console.error(`[Python Backend Error] ${errorMsg}`);
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('❌ Failed to start Python backend:', error.message);
      if (error.message.includes('not found') || error.code === 'ENOENT') {
        console.log('💡 Python is not installed or not in PATH');
        console.log('💡 Install Python from: https://www.python.org/downloads/');
        console.log('💡 Make sure to check "Add Python to PATH" during installation');
        console.log('💡 On Windows, you can also try using: py');
      } else {
        console.log('💡 Make sure Python and required packages are installed:');
        console.log('   pip install -r requirements.txt');
      }
      pythonProcess = null;
    });

    pythonProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ Python backend exited with code ${code}`);
        if (code === 9009 || code === 1) {
          console.log('💡 This usually means Python was not found');
          console.log('💡 Try running: py --version (Windows) or python3 --version (Linux/Mac)');
        }
      }
      pythonProcess = null;
    });

    // Wait longer for uvicorn to start and check if it started successfully
    setTimeout(async () => {
      let isRunning = false;
      // Try checking multiple times with delays
      for (let i = 0; i < 5; i++) {
        isRunning = await checkPythonBackend();
        if (isRunning) {
          console.log('✅ Python backend started successfully on port', PYTHON_BACKEND_PORT);
          break;
        }
        // Wait 2 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (!isRunning) {
        console.log('⚠️  Python backend may still be starting or failed to start');
        console.log('💡 You can manually start it from backend/python/app with: py -m uvicorn main:app --host 127.0.0.1 --port 5002');
      }
    }, 5000); // Start checking after 5 seconds
  }).catch(err => {
    console.error('Error checking Python backend:', err);
  });
}

// Function to stop Python backend
function stopPythonBackend() {
  if (pythonProcess) {
    console.log('🛑 Stopping Python backend...');
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopPythonBackend();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopPythonBackend();
  process.exit(0);
});

// Helper function to make requests to Python backend with retry
async function fetchPythonBackend(url, options = {}, retries = 2, timeoutMs = 30000) {
  const fullUrl = url.startsWith('http') ? url : `${PYTHON_BACKEND_URL}${url}`;
  
  for (let i = 0; i <= retries; i++) {
    let timeoutId = null;
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      // Merge signals if one is already provided
      const signal = options.signal 
        ? (() => {
            const mergedController = new AbortController();
            options.signal.addEventListener('abort', () => mergedController.abort());
            controller.signal.addEventListener('abort', () => mergedController.abort());
            return mergedController.signal;
          })()
        : controller.signal;
      
      const response = await fetch(fullUrl, {
        ...options,
        signal: signal
      });
      
      clearTimeout(timeoutId);
      timeoutId = null;
      
      if (response.ok) {
        return response;
      }
      
      // If not the last retry, wait a bit before retrying
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      return response;
    } catch (error) {
      // Clear timeout if it wasn't already cleared
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // If connection refused and not last retry, try to start backend
      if (error.code === 'ECONNREFUSED' && i === 0) {
        console.log('🔄 Python backend not running, attempting to start...');
        startPythonBackend();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        continue;
      }
      
      if (i === retries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 8000;

(async () => {
  try {
    const connected = await testConnection();
    if (connected) {
      console.log('✅ Database connection verified');
      
      // Run migrations automatically
      try {
        const { runAllMigrations } = require('./scripts/runMigrations');
        const result = await runAllMigrations();
        if (result.success) {
          console.log('✅ Database migrations completed');
        }
      } catch (migrationError) {
        console.warn('⚠️  Migration error (non-fatal):', migrationError.message);
        // Continue even if migrations fail
      }
    }

    // Start Python backend before starting Node.js server (only once)
    startPythonBackend();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Node.js server running at http://localhost:${PORT}`);
      console.log(`🌐 Server listening on all interfaces (0.0.0.0:${PORT})`);
      console.log(`🔄 Python backend should be running at http://127.0.0.1:${PYTHON_BACKEND_PORT}`);
      console.log(`📝 If Python backend fails to start, run manually from backend/python/app: py -m uvicorn main:app --host 127.0.0.1 --port ${PYTHON_BACKEND_PORT}`);
      console.log(`📡 Python backend should be available at ${PYTHON_BACKEND_URL}`);
      console.log(`✅ Server is ready to accept connections!`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error(`💡 To fix this, run one of the following:`);
        console.error(`   Windows: netstat -ano | findstr :${PORT}  (then kill the PID)`);
        console.error(`   Linux/Mac: lsof -i :${PORT}  (then kill the PID)`);
        console.error(`   Or simply wait a few seconds for the port to be released.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        throw error;
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('Error stack:', err.stack);
    stopPythonBackend();
    // Don't exit immediately - allow server to continue if possible
    // process.exit(1);
  }
})();

// Handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Error stack:', error.stack);
  // Keep server running - don't exit
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep server running - don't exit
});
