const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getProjectActivities,
  getUserActivities,
  createActivity,
  getActivityStats
} = require('../controllers/activityController');

// All routes require authentication
router.use(verifyToken);

// Get activities for a project
router.get('/project/:projectId', getProjectActivities);

// Get user's activities
router.get('/user', getUserActivities);

// Create new activity
router.post('/', createActivity);

// Get activity statistics for a project
router.get('/project/:projectId/stats', getActivityStats);

module.exports = router;

