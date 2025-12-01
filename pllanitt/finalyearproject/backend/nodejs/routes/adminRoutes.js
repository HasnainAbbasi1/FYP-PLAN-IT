const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(verifyToken);
router.use(requireAdmin);

// User Management Routes
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.get('/users/analytics', adminController.getUserAnalytics);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/users/:id/projects', adminController.getUserProjects);

// Project Management Routes
router.get('/projects', adminController.getAllProjects);
router.get('/projects/:id', adminController.getProjectById);
router.delete('/projects/:id', adminController.deleteProject);
router.get('/projects/:id/polygons', adminController.getProjectPolygons);

// Statistics Routes
router.get('/stats', adminController.getAdminStats);

// System Management Routes
router.get('/system/health', adminController.getSystemHealth);

module.exports = router;
