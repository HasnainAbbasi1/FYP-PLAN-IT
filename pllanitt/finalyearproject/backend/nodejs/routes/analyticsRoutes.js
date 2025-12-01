const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Analytics routes
router.get('/data', analyticsController.getAnalyticsData); // GET /api/analytics/data
router.get('/projects', analyticsController.getProjectsList); // GET /api/analytics/projects

module.exports = router;

