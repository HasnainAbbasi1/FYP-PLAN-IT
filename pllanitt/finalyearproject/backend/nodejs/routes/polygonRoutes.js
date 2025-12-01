const express = require('express');
const router = express.Router();
const polygonController = require('../controllers/polygonController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Save polygon - add logging middleware
router.post('/', (req, res, next) => {
  console.log('🔵 POST /api/polygon - Request received');
  console.log('🔵 Request body keys:', Object.keys(req.body || {}));
  console.log('🔵 User from token:', req.user?.id);
  next();
}, polygonController.savePolygon);

// Get all polygons
router.get('/', polygonController.getPolygons);

// Get polygons by project ID
router.get('/project/:projectId', polygonController.getPolygonsByProject);

// Get polygon by ID
router.get('/:id', polygonController.getPolygonById);

// Delete polygon
router.delete('/:id', polygonController.deletePolygon);

// Fetch DEM data for a specific polygon
router.post('/:id/fetch-dem', polygonController.fetchDEMForPolygon);

// Fetch DEM data for all polygons
router.post('/fetch-dem-all', polygonController.fetchDEMForAllPolygons);

module.exports = router;
