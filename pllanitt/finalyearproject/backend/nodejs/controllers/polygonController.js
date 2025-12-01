const fs = require('fs');
const path = require('path');
const Polygon = require('../models/Polygon');

// Ensure upload folder exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'polygons');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ---------------- Save polygon ----------------
exports.savePolygon = async (req, res) => {
  try {
    console.log('📌 ========== POLYGON SAVE REQUEST ==========');
    console.log('📌 Request method:', req.method);
    console.log('📌 Request URL:', req.url);
    console.log('📌 Authenticated user:', req.user?.id, req.user?.email);
    console.log('📌 Request body keys:', Object.keys(req.body || {}));
    
    const { geojson, name, user_id, project_id, dem_data, fileName, data_types, target_crs, preprocessing } = req.body;

    // Use authenticated user's ID if user_id not provided in body
    const finalUserId = user_id || req.user?.id;
    
    console.log('📌 Received polygon save request:', { 
      name, 
      user_id_from_body: user_id,
      user_id_from_auth: req.user?.id,
      final_user_id: finalUserId,
      project_id, 
      geojson_type: geojson?.type,
      has_coordinates: !!geojson?.coordinates,
      has_geometry: !!geojson?.geometry
    });

    // ✅ Validate GeoJSON - handle both geometry objects and Feature objects
    let validGeoJSON = null;
    
    if (!geojson) {
      return res.status(400).json({ message: 'GeoJSON data is required' });
    }

    // Check if it's a geometry object (type: "Polygon", coordinates: [...])
    if (geojson.type && geojson.coordinates) {
      validGeoJSON = geojson;
    }
    // Check if it's a Feature object (type: "Feature", geometry: {...})
    else if (geojson.type === 'Feature' && geojson.geometry) {
      validGeoJSON = geojson.geometry;
    }
    // Check if it's nested geometry
    else if (geojson.geometry && geojson.geometry.type && geojson.geometry.coordinates) {
      validGeoJSON = geojson.geometry;
    }
    else {
      console.error('❌ Invalid GeoJSON structure:', JSON.stringify(geojson, null, 2));
      return res.status(400).json({ 
        message: 'Valid GeoJSON geometry is required. Expected: { type: "Polygon", coordinates: [...] } or { type: "Feature", geometry: {...} }',
        received: geojson
      });
    }

    // Validate that it's a Polygon type
    if (validGeoJSON.type !== 'Polygon' && validGeoJSON.type !== 'MultiPolygon') {
      return res.status(400).json({ 
        message: `Unsupported geometry type: ${validGeoJSON.type}. Only Polygon and MultiPolygon are supported.` 
      });
    }

    // Validate coordinates structure
    if (!validGeoJSON.coordinates || !Array.isArray(validGeoJSON.coordinates)) {
      return res.status(400).json({ message: 'Invalid coordinates structure in GeoJSON' });
    }

    console.log('✅ Validated GeoJSON:', { 
      type: validGeoJSON.type, 
      coordinates_length: validGeoJSON.coordinates.length 
    });

    let savedFilePath = null;

    // If DEM image data provided (base64)
    if (dem_data && fileName) {
      const buffer = Buffer.from(dem_data, 'base64');
      const uniqueName = `${Date.now()}_${fileName}`;
      const fullPath = path.join(UPLOAD_DIR, uniqueName);

      fs.writeFileSync(fullPath, buffer);
      savedFilePath = `/uploads/polygons/${uniqueName}`; // relative path for serving
    }

    // Store as a Feature object for consistency
    const geojsonFeature = {
      type: 'Feature',
      geometry: validGeoJSON,
      properties: {
        data_types: data_types || [],
        target_crs: target_crs || 'EPSG:4326',
        preprocessing: preprocessing || {},
        created_at: new Date().toISOString()
      }
    };

    // Ensure user_id is set (use authenticated user if not provided)
    if (!finalUserId) {
      console.error('❌ No user_id provided and no authenticated user');
      return res.status(400).json({ message: 'User ID is required. Please ensure you are logged in.' });
    }

    // Ensure project_id is set
    if (!project_id) {
      console.error('❌ No project_id provided');
      return res.status(400).json({ message: 'Project ID is required. Please select a project before creating a polygon.' });
    }

    console.log('📌 Creating polygon in database with:', {
      name: name?.trim() || `Polygon_${Date.now()}`,
      user_id: finalUserId,
      project_id: project_id,
      has_geojson: !!geojsonFeature
    });

    const polygon = await Polygon.create({
      name: name?.trim() || `Polygon_${Date.now()}`,
      geojson: geojsonFeature,
      dem_url: savedFilePath,
      user_id: finalUserId,
      project_id: project_id
    });

    console.log('✅ Polygon saved successfully:', { 
      id: polygon.id, 
      name: polygon.name, 
      project_id: polygon.project_id,
      user_id: polygon.user_id 
    });

    return res.status(201).json({
      message: 'Polygon saved successfully',
      polygon
    });
  } catch (err) {
    console.error('❌ Error saving polygon:', err);
    console.error('❌ Error stack:', err.stack);
    return res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// ---------------- Get all polygons ----------------
exports.getPolygons = async (req, res) => {
  try {
    // Filter polygons by user unless they're admin
    const whereClause = {};
    if (req.user?.role !== 'admin') {
      whereClause.user_id = req.user?.id;
    }
    
    // Filter by project_id if provided as query parameter
    if (req.query.project_id) {
      const projectId = parseInt(req.query.project_id, 10);
      if (!isNaN(projectId)) {
        whereClause.project_id = projectId;
      }
    }
    
    const polygons = await Polygon.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json(polygons);
  } catch (err) {
    console.error('❌ Error fetching polygons:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------- Get single polygon ----------------
exports.getPolygonById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid polygon ID' });
    }

    const polygon = await Polygon.findByPk(id);
    if (!polygon) {
      return res.status(404).json({ message: 'Polygon not found' });
    }
    
    // Check if user owns the polygon (unless admin)
    if (req.user?.role !== 'admin' && polygon.user_id !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied. You can only view your own polygons.' });
    }
    
    return res.status(200).json(polygon);
  } catch (err) {
    console.error('❌ Error fetching polygon by ID:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------- Delete polygon ----------------
exports.deletePolygon = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid polygon ID' });
    }

    const polygon = await Polygon.findByPk(id);
    if (!polygon) {
      return res.status(404).json({ message: 'Polygon not found' });
    }

    // Delete associated file if exists
    if (polygon.dem_url) {
      const filePath = path.join(__dirname, '..', polygon.dem_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await polygon.destroy();
    return res.status(200).json({ message: 'Polygon deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting polygon:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------- Get polygons by project ID ----------------
exports.getPolygonsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Verify user has access to this project
    const { Project } = require('../models/associations');
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user owns the project (unless admin)
    if (req.user?.role !== 'admin' && project.created_by !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied. You can only view polygons from your own projects.' });
    }

    const polygons = await Polygon.findAll({
      where: { project_id: projectId },
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json(polygons);
  } catch (err) {
    console.error('❌ Error fetching polygons by project:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------- Fetch DEM data for a specific polygon ---------------- 
exports.fetchDEMForPolygon = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Polygon ID is required' });
    }

    const polygon = await Polygon.findByPk(id);
    if (!polygon) {
      return res.status(404).json({ message: 'Polygon not found' });
    }

    // Check if user has access to this polygon
    if (req.user?.role !== 'admin' && polygon.user_id !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if polygon already has DEM data
    if (polygon.dem_url) {
      return res.status(200).json({ 
        message: 'Polygon already has DEM data',
        dem_url: polygon.dem_url 
      });
    }

    // Simulate DEM data fetching (in real implementation, this would call OpenTopography API)
    const mockDemUrl = `/uploads/polygons/dem_${id}_${Date.now()}.tif`;
    
    // Update polygon with DEM URL
    await polygon.update({ dem_url: mockDemUrl });

    return res.status(200).json({
      message: 'DEM data fetched successfully',
      dem_url: mockDemUrl,
      resolution: '30m',
      area: polygon.area || 0.5
    });

  } catch (err) {
    console.error('❌ Error fetching DEM for polygon:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------- Fetch DEM data for all polygons ---------------- 
exports.fetchDEMForAllPolygons = async (req, res) => {
  try {
    // Get all polygons for the user
    const whereClause = {};
    if (req.user?.role !== 'admin') {
      whereClause.user_id = req.user?.id;
    }

    const polygons = await Polygon.findAll({
      where: whereClause
    });

    let successful = 0;
    let failed = 0;

    // Process each polygon
    for (const polygon of polygons) {
      try {
        if (!polygon.dem_url) {
          const mockDemUrl = `/uploads/polygons/dem_${polygon.id}_${Date.now()}.tif`;
          await polygon.update({ dem_url: mockDemUrl });
          successful++;
        } else {
          successful++; // Already has DEM data
        }
      } catch (err) {
        console.error(`Failed to fetch DEM for polygon ${polygon.id}:`, err);
        failed++;
      }
    }

    return res.status(200).json({
      message: 'Bulk DEM fetch completed',
      total: polygons.length,
      successful,
      failed
    });

  } catch (err) {
    console.error('❌ Error in bulk DEM fetch:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};