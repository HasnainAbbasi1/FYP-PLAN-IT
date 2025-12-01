const Project = require('../models/Project');
const User = require('../models/User');
const { Op } = require('sequelize');

const dashboardController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // Get project stats (all projects for admin, user's projects for others)
      const projectStats = await Project.getProjectStats(isAdmin ? null : userId);
      
      // Get recent project activity
      const recentProjects = await Project.findAll({
        where: isAdmin ? { is_active: true } : { created_by: userId, is_active: true },
        limit: 5,
        order: [['updated_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'avatar'],
            foreignKey: 'created_by'
          }
        ]
      });

      // Calculate additional metrics
      const currentDate = new Date();
      const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const recentProjectsCount = await Project.count({
        where: {
          ...(isAdmin ? {} : { created_by: userId }),
          is_active: true,
          created_at: { [Op.gte]: thirtyDaysAgo }
        }
      });

      // Get overdue projects
      const overdueProjects = await Project.count({
        where: {
          ...(isAdmin ? {} : { created_by: userId }),
          is_active: true,
          end_date: { [Op.lt]: currentDate },
          status: { [Op.not]: 'Completed' }
        }
      });

      res.json({
        ...projectStats,
        recentProjectsCount,
        overdueProjects,
        recentProjects
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch dashboard statistics',
        details: error.message 
      });
    }
  },

  // Get recent activities
  getRecentActivities: async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      // Get recently updated projects
      const recentProjects = await Project.findAll({
        where: isAdmin ? { is_active: true } : { created_by: userId, is_active: true },
        limit: parseInt(limit),
        order: [['updated_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'avatar'],
            foreignKey: 'created_by'
          }
        ]
      });

      // Transform to activity format
      const activities = recentProjects.map(project => {
        const timeDiff = Date.now() - new Date(project.updated_at).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);
        
        let timeAgo;
        if (daysAgo > 0) {
          timeAgo = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
        } else if (hoursAgo > 0) {
          timeAgo = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
        } else {
          timeAgo = 'Just now';
        }

        return {
          id: `project_${project.id}_${project.updated_at}`,
          type: 'project_updated',
          message: `Updated project "${project.title}"`,
          timestamp: project.updated_at,
          timeAgo,
          user: project.creator?.name || 'Unknown User',
          projectId: project.id,
          projectTitle: project.title,
          status: project.status,
          progress: project.progress
        };
      });

      res.json(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      res.status(500).json({ 
        error: 'Failed to fetch recent activities',
        details: error.message 
      });
    }
  },

  // Get project progress data for charts
  getProjectProgress: async (req, res) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      const projects = await Project.findAll({
        where: isAdmin ? { is_active: true } : { created_by: userId, is_active: true },
        attributes: ['id', 'title', 'progress', 'status', 'end_date', 'priority'],
        order: [['progress', 'ASC']]
      });

      const progressData = projects.map(project => ({
        id: project.id,
        title: project.title,
        progress: project.progress,
        status: project.status,
        dueDate: project.end_date,
        priority: project.priority,
        isOverdue: project.end_date && new Date(project.end_date) < new Date() && project.status !== 'Completed'
      }));

      res.json(progressData);
    } catch (error) {
      console.error('Error fetching project progress:', error);
      res.status(500).json({ 
        error: 'Failed to fetch project progress',
        details: error.message 
      });
    }
  },

  // Get project distribution by type
  getProjectDistribution: async (req, res) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      const projects = await Project.findAll({
        where: isAdmin ? { is_active: true } : { created_by: userId, is_active: true },
        attributes: ['type', 'status']
      });

      // Group by type
      const typeDistribution = projects.reduce((acc, project) => {
        const type = project.type || 'Other';
        if (!acc[type]) {
          acc[type] = { total: 0, completed: 0, inProgress: 0, planning: 0 };
        }
        acc[type].total++;
        
        switch (project.status) {
          case 'Completed':
            acc[type].completed++;
            break;
          case 'In Progress':
            acc[type].inProgress++;
            break;
          case 'Planning':
            acc[type].planning++;
            break;
        }
        
        return acc;
      }, {});

      // Group by status
      const statusDistribution = projects.reduce((acc, project) => {
        const status = project.status || 'Planning';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      res.json({
        typeDistribution,
        statusDistribution,
        totalProjects: projects.length
      });
    } catch (error) {
      console.error('Error fetching project distribution:', error);
      res.status(500).json({ 
        error: 'Failed to fetch project distribution',
        details: error.message 
      });
    }
  },

  // Get monthly project creation trend
  getProjectTrends: async (req, res) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      const { months = 6 } = req.query;

      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));

      const projects = await Project.findAll({
        where: {
          ...(isAdmin ? {} : { created_by: userId }),
          is_active: true,
          created_at: { [Op.gte]: monthsAgo }
        },
        attributes: ['created_at', 'status'],
        order: [['created_at', 'ASC']]
      });

      // Group by month
      const monthlyData = {};
      projects.forEach(project => {
        const date = new Date(project.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { created: 0, completed: 0 };
        }
        
        monthlyData[monthKey].created++;
        if (project.status === 'Completed') {
          monthlyData[monthKey].completed++;
        }
      });

      // Fill in missing months with zero values
      const result = [];
      for (let i = parseInt(months) - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        result.push({
          month: monthKey,
          monthName: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          created: monthlyData[monthKey]?.created || 0,
          completed: monthlyData[monthKey]?.completed || 0
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching project trends:', error);
      res.status(500).json({ 
        error: 'Failed to fetch project trends',
        details: error.message 
      });
    }
  }
};

module.exports = dashboardController;
