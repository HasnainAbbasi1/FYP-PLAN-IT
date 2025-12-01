const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Project CRUD routes
router.get('/', projectController.getAllProjects);                    // GET /api/projects
router.get('/stats', projectController.getProjectStats);             // GET /api/projects/stats
router.get('/dashboard', projectController.getProjectDashboard);     // GET /api/projects/dashboard
router.get('/deadlines', projectController.getUpcomingDeadlines);    // GET /api/projects/deadlines
router.get('/activity', projectController.getRecentActivity);        // GET /api/projects/activity
router.get('/user/:userId', projectController.getUserProjects);      // GET /api/projects/user/:userId
router.get('/:id', projectController.getProjectById);               // GET /api/projects/:id
router.post('/', projectController.createProject);                   // POST /api/projects
router.post('/:id/clone', projectController.cloneProject);          // POST /api/projects/:id/clone
router.put('/:id', projectController.updateProject);                // PUT /api/projects/:id
router.delete('/:id', projectController.deleteProject);             // DELETE /api/projects/:id

// Project status and progress management
router.patch('/:id/status', projectController.updateProjectStatus); // PATCH /api/projects/:id/status
router.patch('/:id/progress', projectController.updateProjectProgress); // PATCH /api/projects/:id/progress

// Objective management
router.post('/:id/objectives', projectController.addObjective);     // POST /api/projects/:id/objectives
router.patch('/:id/objectives/:objectiveId/complete', projectController.completeObjective); // PATCH /api/projects/:id/objectives/:objectiveId/complete

// Team management
router.post('/:id/team', projectController.addTeamMember);          // POST /api/projects/:id/team
router.delete('/:id/team/:userId', projectController.removeTeamMember); // DELETE /api/projects/:id/team/:userId

module.exports = router;
