const Project = require('../models/Project');
const User = require('../models/User');
const Polygon = require('../models/Polygon');
const { Op } = require('sequelize');

const projectController = {
  // Get all projects with optional filtering
  getAllProjects: async (req, res) => {
    try {
      const { 
        status, 
        type, 
        priority, 
        createdBy, 
        search, 
        limit = 50, 
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      // Build where clause
      const whereClause = { is_active: true };
      
      // Automatically filter by user unless they're admin
      if (req.user?.role !== 'admin') {
        whereClause.created_by = req.user?.id;
      } else if (createdBy) {
        // Admin can specify createdBy to see specific user's projects
        whereClause.created_by = createdBy;
      }
      
      if (status) whereClause.status = status;
      if (type) whereClause.type = type;
      if (priority) whereClause.priority = priority;
      
      // Add enhanced search functionality
      if (search) {
        const searchTerm = search.trim();
        if (searchTerm.length > 0) {
          const { sequelize } = require('../config/database');
          const isPostgres = sequelize.getDialect() === 'postgres';
          
          if (isPostgres) {
            // Enhanced search: Combine full-text search with ILIKE for better results
            // Full-text search for relevance, ILIKE for partial matches
            whereClause[Op.or] = [
              // Full-text search (more relevant results)
              sequelize.literal(`to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(location, '')) @@ plainto_tsquery('english', ${sequelize.escape(searchTerm)})`),
              // ILIKE for partial matches (fallback)
              { title: { [Op.iLike]: `%${searchTerm}%` } },
              { description: { [Op.iLike]: `%${searchTerm}%` } },
              { location: { [Op.iLike]: `%${searchTerm}%` } }
            ];
          } else {
            // Fallback to ILIKE for other databases
            whereClause[Op.or] = [
              { title: { [Op.iLike]: `%${searchTerm}%` } },
              { description: { [Op.iLike]: `%${searchTerm}%` } },
              { location: { [Op.iLike]: `%${searchTerm}%` } }
            ];
          }
        }
      }

      // Validate sort parameters
      const validSortFields = ['created_at', 'updated_at', 'title', 'progress', 'priority', 'status'];
      const validSortOrders = ['ASC', 'DESC'];
      
      const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      const projects = await Project.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[finalSortBy, finalSortOrder]],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'avatar'],
            foreignKey: 'created_by'
          }
        ]
      });

      res.json({
        projects: projects.rows,
        total: projects.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ 
        error: 'Failed to fetch projects',
        details: error.message 
      });
    }
  },

  // Get single project by ID
  getProjectById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const project = await Project.findOne({
        where: { id, is_active: true },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'avatar'],
            foreignKey: 'created_by'
          },
          {
            model: Polygon,
            as: 'polygon',
            attributes: ['id', 'name', 'geojson'],
            required: false
          }
        ]
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ 
        error: 'Failed to fetch project',
        details: error.message 
      });
    }
  },

  // Create new project
  createProject: async (req, res) => {
    try {
      const {
        title,
        description,
        location,
        type,
        priority = 'Medium',
        budget,
        startDate,
        endDate,
        estimatedDuration,
        tags = [],
        objectives = [],
        teamMembers = [],
        polygonId,
        metadata = {}
      } = req.body;

      // Get user ID from auth middleware
      const createdBy = req.user?.id;
      if (!createdBy) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate required fields
      if (!title || !description || !location || !type) {
        return res.status(400).json({ 
          error: 'Missing required fields: title, description, location, type' 
        });
      }

      // Create project
      const project = await Project.create({
        title,
        description,
        location,
        type,
        priority,
        budget: budget ? parseFloat(budget) : null,
        start_date: startDate,
        end_date: endDate,
        estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : null,
        tags: Array.isArray(tags) ? tags : [],
        objectives: Array.isArray(objectives) ? objectives : [],
        team_members: Array.isArray(teamMembers) ? teamMembers : [createdBy],
        polygon_id: polygonId,
        metadata,
        created_by: createdBy,
        updated_by: createdBy
      });

      // Fetch the created project with associations
      const createdProject = await Project.findByPk(project.id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'avatar'],
            foreignKey: 'created_by'
          }
        ]
      });

      res.status(201).json(createdProject);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ 
        error: 'Failed to create project',
        details: error.message 
      });
    }
  },

  // Update existing project
  updateProject: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has permission to update (creator or admin)
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Update fields
      const updateData = { ...req.body, updated_by: userId };
      
      // Handle date fields
      if (updateData.startDate !== undefined) {
        updateData.start_date = updateData.startDate;
        delete updateData.startDate;
      }
      if (updateData.endDate !== undefined) {
        updateData.end_date = updateData.endDate;
        delete updateData.endDate;
      }
      if (updateData.estimatedDuration !== undefined) {
        updateData.estimated_duration = updateData.estimatedDuration;
        delete updateData.estimatedDuration;
      }
      if (updateData.teamMembers !== undefined) {
        updateData.team_members = updateData.teamMembers;
        delete updateData.teamMembers;
      }
      if (updateData.polygonId !== undefined) {
        updateData.polygon_id = updateData.polygonId;
        delete updateData.polygonId;
      }

      // Auto-update status based on progress if progress is being updated
      if (updateData.progress !== undefined) {
        const newProgress = parseInt(updateData.progress, 10);
        if (!isNaN(newProgress)) {
          // Auto-update status based on progress
          if (newProgress === 0) {
            // Reset to Planning if progress is 0
            updateData.status = 'Planning';
          } else if (newProgress > 0 && newProgress < 100) {
            // Change from Planning to In Progress when progress > 0
            // Don't change if already In Progress, On Hold, or Completed
            if (project.status === 'Planning') {
              updateData.status = 'In Progress';
            } else if (project.status === 'Completed' && newProgress < 100) {
              // If project was completed but progress is now < 100, change back to In Progress
              updateData.status = 'In Progress';
            }
          } else if (newProgress === 100) {
            // Mark as Completed when progress reaches 100
            updateData.status = 'Completed';
          }
        }
      }

      await project.update(updateData);

      // Fetch updated project with associations
      const updatedProject = await Project.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'avatar'],
            foreignKey: 'created_by'
          }
        ]
      });

      res.json(updatedProject);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ 
        error: 'Failed to update project',
        details: error.message 
      });
    }
  },

  // Delete project (soft delete)
  deleteProject: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has permission to delete (creator or admin)
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Soft delete
      await project.update({ 
        is_active: false, 
        updated_by: userId 
      });

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ 
        error: 'Failed to delete project',
        details: error.message 
      });
    }
  },

  // Update project status
  updateProjectStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const validStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const project = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has permission (creator, team member, or admin)
      const hasPermission = project.created_by === userId || 
                           (project.team_members && project.team_members.includes(userId)) ||
                           req.user?.role === 'admin';

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Auto-update progress based on status
      let progress = project.progress;
      if (status === 'Completed') progress = 100;
      else if (status === 'Planning' && progress > 0) progress = 0;

      await project.update({ 
        status, 
        progress,
        updated_by: userId 
      });

      res.json(project);
    } catch (error) {
      console.error('Error updating project status:', error);
      res.status(500).json({ 
        error: 'Failed to update project status',
        details: error.message 
      });
    }
  },

  // Get project statistics
  getProjectStats: async (req, res) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const stats = await Project.getProjectStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching project stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch project statistics',
        details: error.message 
      });
    }
  },

  // Get user's projects
  getUserProjects: async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;

      // Users can only see their own projects unless they're admin
      if (parseInt(userId) !== requestingUserId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const projects = await Project.findAll({
        where: { 
          created_by: userId, 
          is_active: true 
        },
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'avatar'],
            foreignKey: 'created_by'
          }
        ]
      });

      res.json({
        success: true,
        projects: projects,
        count: projects.length
      });
    } catch (error) {
      console.error('Error fetching user projects:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user projects',
        details: error.message 
      });
    }
  },

  // Add team member to project
  addTeamMember: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId: newMemberId } = req.body;
      const requestingUserId = req.user?.id;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permission (creator or admin)
      if (project.created_by !== requestingUserId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Verify the user exists
      const userExists = await User.findByPk(newMemberId);
      if (!userExists) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Add team member if not already present
      const currentMembers = project.team_members || [];
      if (!currentMembers.includes(newMemberId)) {
        currentMembers.push(newMemberId);
        await project.update({ 
          team_members: currentMembers,
          updated_by: requestingUserId 
        });
      }

      res.json({ message: 'Team member added successfully', teamMembers: currentMembers });
    } catch (error) {
      console.error('Error adding team member:', error);
      res.status(500).json({ 
        error: 'Failed to add team member',
        details: error.message 
      });
    }
  },

  // Remove team member from project
  removeTeamMember: async (req, res) => {
    try {
      const { id, userId: memberToRemove } = req.params;
      const requestingUserId = req.user?.id;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permission (creator or admin)
      if (project.created_by !== requestingUserId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Remove team member
      const currentMembers = project.team_members || [];
      const updatedMembers = currentMembers.filter(id => id !== parseInt(memberToRemove));
      
      await project.update({ 
        team_members: updatedMembers,
        updated_by: requestingUserId 
      });

      res.json({ message: 'Team member removed successfully', teamMembers: updatedMembers });
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(500).json({ 
        error: 'Failed to remove team member',
        details: error.message 
      });
    }
  },

  // Update project progress
  updateProjectProgress: async (req, res) => {
    try {
      const { id } = req.params;
      const { progress } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (progress === undefined || progress < 0 || progress > 100) {
        return res.status(400).json({ error: 'Progress must be between 0 and 100' });
      }

      const project = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permission (creator, team member, or admin)
      const hasPermission = project.created_by === userId || 
                           (project.team_members && project.team_members.includes(userId)) ||
                           req.user?.role === 'admin';

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await project.updateProgress(progress, userId);

      res.json(project);
    } catch (error) {
      console.error('Error updating project progress:', error);
      res.status(500).json({ 
        error: 'Failed to update project progress',
        details: error.message 
      });
    }
  },

  // Add objective to project
  addObjective: async (req, res) => {
    try {
      const { id } = req.params;
      const { objective } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!objective || objective.trim().length === 0) {
        return res.status(400).json({ error: 'Objective text is required' });
      }

      const project = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permission (creator, team member, or admin)
      const hasPermission = project.created_by === userId || 
                           (project.team_members && project.team_members.includes(userId)) ||
                           req.user?.role === 'admin';

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await project.addObjective(objective.trim(), userId);

      res.json(project);
    } catch (error) {
      console.error('Error adding objective:', error);
      res.status(500).json({ 
        error: 'Failed to add objective',
        details: error.message 
      });
    }
  },

  // Complete objective
  completeObjective: async (req, res) => {
    try {
      const { id, objectiveId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permission (creator, team member, or admin)
      const hasPermission = project.created_by === userId || 
                           (project.team_members && project.team_members.includes(userId)) ||
                           req.user?.role === 'admin';

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await project.completeObjective(parseInt(objectiveId), userId);

      res.json(project);
    } catch (error) {
      console.error('Error completing objective:', error);
      res.status(500).json({ 
        error: 'Failed to complete objective',
        details: error.message 
      });
    }
  },

  // Get upcoming deadlines
  getUpcomingDeadlines: async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const userId = req.query.userId || req.user?.id;

      const projects = await Project.getUpcomingDeadlines(userId, parseInt(days));

      res.json(projects);
    } catch (error) {
      console.error('Error fetching upcoming deadlines:', error);
      res.status(500).json({ 
        error: 'Failed to fetch upcoming deadlines',
        details: error.message 
      });
    }
  },

  // Get recent activity
  getRecentActivity: async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const userId = req.query.userId || req.user?.id;

      const projects = await Project.getRecentActivity(userId, parseInt(limit));

      res.json(projects);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({ 
        error: 'Failed to fetch recent activity',
        details: error.message 
      });
    }
  },

  // Get project dashboard data
  getProjectDashboard: async (req, res) => {
    try {
      const userId = req.query.userId || req.user?.id;

      const [stats, upcomingDeadlines, recentActivity] = await Promise.all([
        Project.getProjectStats(userId),
        Project.getUpcomingDeadlines(userId, 7), // Next 7 days
        Project.getRecentActivity(userId, 5) // Last 5 activities
      ]);

      res.json({
        stats,
        upcomingDeadlines,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching project dashboard:', error);
      res.status(500).json({ 
        error: 'Failed to fetch project dashboard',
        details: error.message 
      });
    }
  },

  // Clone project
  cloneProject: async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const originalProject = await Project.findOne({
        where: { id, is_active: true }
      });

      if (!originalProject) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permission to view original project
      const hasPermission = originalProject.created_by === userId || 
                           (originalProject.team_members && originalProject.team_members.includes(userId)) ||
                           req.user?.role === 'admin';

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Create cloned project
      const clonedData = {
        title: title || `${originalProject.title} (Copy)`,
        description: originalProject.description,
        location: originalProject.location,
        type: originalProject.type,
        priority: originalProject.priority,
        budget: originalProject.budget,
        estimated_duration: originalProject.estimated_duration,
        area: originalProject.area,
        tags: originalProject.tags,
        objectives: originalProject.objectives?.map(obj => ({
          ...obj,
          id: Date.now() + Math.random(),
          completed: false,
          createdAt: new Date(),
          createdBy: userId
        })) || [],
        metadata: originalProject.metadata,
        created_by: userId,
        updated_by: userId,
        status: 'Planning',
        progress: 0
      };

      const clonedProject = await Project.create(clonedData);

      // Fetch the created project with associations
      const result = await Project.findByPk(clonedProject.id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'avatar'],
            foreignKey: 'created_by'
          }
        ]
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Error cloning project:', error);
      res.status(500).json({ 
        error: 'Failed to clone project',
        details: error.message 
      });
    }
  }
};

module.exports = projectController;
