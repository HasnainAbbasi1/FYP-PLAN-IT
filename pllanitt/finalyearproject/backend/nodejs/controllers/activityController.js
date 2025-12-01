const ProjectActivity = require('../models/ProjectActivity');
const Project = require('../models/Project');
const User = require('../models/User');

/**
 * Get activities for a project
 */
const getProjectActivities = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, offset = 0, activityType, search } = req.query;
    const { Op } = require('sequelize');
    const { sequelize } = require('../config/database');

    const where = { project_id: projectId };
    if (activityType) {
      where.activity_type = activityType;
    }

    // Add search functionality
    if (search) {
      const searchTerm = search.trim();
      if (searchTerm.length > 0) {
        const isPostgres = sequelize.getDialect() === 'postgres';
        
        if (isPostgres) {
          // Full-text search for activities
          where[Op.or] = [
            sequelize.literal(`to_tsvector('english', COALESCE(description, '') || ' ' || COALESCE(activity_type, '')) @@ plainto_tsquery('english', ${sequelize.escape(searchTerm)})`),
            { description: { [Op.iLike]: `%${searchTerm}%` } },
            { activity_type: { [Op.iLike]: `%${searchTerm}%` } }
          ];
        } else {
          where[Op.or] = [
            { description: { [Op.iLike]: `%${searchTerm}%` } },
            { activity_type: { [Op.iLike]: `%${searchTerm}%` } }
          ];
        }
      }
    }

    const activities = await ProjectActivity.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      activities: activities.rows,
      total: activities.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching project activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project activities',
      error: error.message
    });
  }
};

/**
 * Get user activities
 */
const getUserActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const activities = await ProjectActivity.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      activities: activities.rows,
      total: activities.count
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activities',
      error: error.message
    });
  }
};

/**
 * Create activity
 */
const createActivity = async (req, res) => {
  try {
    const { projectId, activityType, description, metadata } = req.body;
    const userId = req.user.id;

    if (!projectId || !activityType) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and activity type are required'
      });
    }

    const activity = await ProjectActivity.create({
      project_id: projectId,
      user_id: userId,
      activity_type: activityType,
      description,
      metadata
    });

    // Populate user info
    const activityWithUser = await ProjectActivity.findByPk(activity.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ]
    });

    res.status(201).json({
      success: true,
      activity: activityWithUser
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
      error: error.message
    });
  }
};

/**
 * Get activity statistics
 */
const getActivityStats = async (req, res) => {
  try {
    const { projectId } = req.params;

    const stats = await ProjectActivity.findAll({
      where: { project_id: projectId },
      attributes: [
        'activity_type',
        [ProjectActivity.sequelize.fn('COUNT', ProjectActivity.sequelize.col('id')), 'count']
      ],
      group: ['activity_type']
    });

    const total = await ProjectActivity.count({
      where: { project_id: projectId }
    });

    res.json({
      success: true,
      stats: stats.map(s => ({
        type: s.activity_type,
        count: parseInt(s.get('count'))
      })),
      total
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: error.message
    });
  }
};

module.exports = {
  getProjectActivities,
  getUserActivities,
  createActivity,
  getActivityStats
};

