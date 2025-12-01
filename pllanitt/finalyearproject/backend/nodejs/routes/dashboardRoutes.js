const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Dashboard routes
router.get('/stats', dashboardController.getDashboardStats);           // GET /api/dashboard/stats
router.get('/activities', dashboardController.getRecentActivities);    // GET /api/dashboard/activities
router.get('/project-progress', dashboardController.getProjectProgress); // GET /api/dashboard/project-progress
router.get('/distribution', dashboardController.getProjectDistribution); // GET /api/dashboard/distribution
router.get('/trends', dashboardController.getProjectTrends);           // GET /api/dashboard/trends

module.exports = router;
