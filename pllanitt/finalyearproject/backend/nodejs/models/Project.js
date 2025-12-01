const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 2000]
    }
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM(
      'Residential Development',
      'Commercial Development', 
      'Mixed-Use Development',
      'Infrastructure',
      'Transportation',
      'Green Spaces',
      'Urban Renewal',
      'Industrial Zone',
      'Community Facilities',
      'Other'
    ),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Planning'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: false,
    defaultValue: 'Medium'
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  budget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isAfterStartDate(value) {
        if (value && this.start_date && value <= this.start_date) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  estimated_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated duration in days'
  },
  area: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 0,
    comment: 'Project area in hectares'
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of project tags'
  },
  objectives: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of project objectives'
  },
  team_members: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of team member IDs'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  polygon_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'polygons',
      key: 'id'
    },
    comment: 'Associated polygon for spatial data'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional project metadata'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'projects',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['created_by']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['polygon_id']
    }
  ],
  hooks: {
    beforeUpdate: (project) => {
      project.updated_at = new Date();
    }
  }
});

// Instance methods
Project.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // Convert snake_case to camelCase for frontend compatibility
  return {
    id: values.id,
    title: values.title,
    description: values.description,
    location: values.location,
    type: values.type,
    status: values.status,
    priority: values.priority,
    progress: values.progress,
    budget: values.budget,
    startDate: values.start_date,
    endDate: values.end_date,
    estimatedDuration: values.estimated_duration,
    area: values.area,
    tags: values.tags || [],
    objectives: values.objectives || [],
    teamMembers: values.team_members || [],
    createdBy: values.created_by,
    updatedBy: values.updated_by,
    polygonId: values.polygon_id,
    metadata: values.metadata || {},
    isActive: values.is_active,
    createdAt: values.created_at,
    updatedAt: values.updated_at
  };
};

// Instance methods for project management
Project.prototype.updateProgress = async function(newProgress, userId) {
  if (newProgress < 0 || newProgress > 100) {
    throw new Error('Progress must be between 0 and 100');
  }
  
  // Auto-update status based on progress
  let newStatus = this.status;
  if (newProgress === 0 && this.status !== 'Planning') {
    newStatus = 'Planning';
  } else if (newProgress > 0 && newProgress < 100 && this.status === 'Planning') {
    newStatus = 'In Progress';
  } else if (newProgress === 100) {
    newStatus = 'Completed';
  }
  
  return await this.update({
    progress: newProgress,
    status: newStatus,
    updated_by: userId
  });
};

Project.prototype.addObjective = async function(objective, userId) {
  const currentObjectives = this.objectives || [];
  const newObjective = {
    id: Date.now(),
    text: objective,
    completed: false,
    createdAt: new Date(),
    createdBy: userId
  };
  
  currentObjectives.push(newObjective);
  return await this.update({
    objectives: currentObjectives,
    updated_by: userId
  });
};

Project.prototype.completeObjective = async function(objectiveId, userId) {
  const objectives = this.objectives || [];
  const objectiveIndex = objectives.findIndex(obj => obj.id === objectiveId);
  
  if (objectiveIndex === -1) {
    throw new Error('Objective not found');
  }
  
  objectives[objectiveIndex].completed = true;
  objectives[objectiveIndex].completedAt = new Date();
  objectives[objectiveIndex].completedBy = userId;
  
  return await this.update({
    objectives: objectives,
    updated_by: userId
  });
};

Project.prototype.calculateDaysRemaining = function() {
  if (!this.end_date) return null;
  
  const today = new Date();
  const endDate = new Date(this.end_date);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

Project.prototype.isOverdue = function() {
  if (!this.end_date) return false;
  
  const today = new Date();
  const endDate = new Date(this.end_date);
  
  return today > endDate && this.status !== 'Completed';
};

Project.prototype.getCompletionPercentage = function() {
  const objectives = this.objectives || [];
  if (objectives.length === 0) return this.progress;
  
  const completedObjectives = objectives.filter(obj => obj.completed).length;
  const objectiveProgress = (completedObjectives / objectives.length) * 100;
  
  // Average of manual progress and objective-based progress
  return Math.round((this.progress + objectiveProgress) / 2);
};

// Class methods
Project.getProjectStats = async function(userId = null) {
  const whereClause = userId ? { created_by: userId, is_active: true } : { is_active: true };
  
  const [totalProjects, inProgress, completed, planning, onHold, cancelled] = await Promise.all([
    this.count({ where: whereClause }),
    this.count({ where: { ...whereClause, status: 'In Progress' } }),
    this.count({ where: { ...whereClause, status: 'Completed' } }),
    this.count({ where: { ...whereClause, status: 'Planning' } }),
    this.count({ where: { ...whereClause, status: 'On Hold' } }),
    this.count({ where: { ...whereClause, status: 'Cancelled' } })
  ]);

  const projects = await this.findAll({ where: whereClause });
  const totalArea = projects.reduce((sum, project) => sum + parseFloat(project.area || 0), 0);
  const totalBudget = projects.reduce((sum, project) => sum + parseFloat(project.budget || 0), 0);
  const averageProgress = projects.length > 0 
    ? projects.reduce((sum, project) => sum + project.progress, 0) / projects.length 
    : 0;

  // Calculate overdue projects
  const overdueProjects = projects.filter(project => project.isOverdue()).length;
  
  // Calculate projects by type
  const projectsByType = {};
  projects.forEach(project => {
    projectsByType[project.type] = (projectsByType[project.type] || 0) + 1;
  });

  // Calculate projects by priority
  const projectsByPriority = {
    Low: projects.filter(p => p.priority === 'Low').length,
    Medium: projects.filter(p => p.priority === 'Medium').length,
    High: projects.filter(p => p.priority === 'High').length,
    Critical: projects.filter(p => p.priority === 'Critical').length
  };

  return {
    totalProjects,
    inProgress,
    completed,
    planning,
    onHold,
    cancelled,
    overdueProjects,
    totalArea: Math.round(totalArea * 100) / 100,
    totalBudget,
    averageProgress: Math.round(averageProgress * 100) / 100,
    projectsByType,
    projectsByPriority
  };
};

Project.getUpcomingDeadlines = async function(userId = null, days = 30) {
  const whereClause = userId ? { created_by: userId, is_active: true } : { is_active: true };
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  whereClause.end_date = {
    [require('sequelize').Op.between]: [new Date(), futureDate]
  };
  whereClause.status = {
    [require('sequelize').Op.notIn]: ['Completed', 'Cancelled']
  };

  return await this.findAll({
    where: whereClause,
    order: [['end_date', 'ASC']],
    include: [
      {
        model: require('./User'),
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }
    ]
  });
};

Project.getRecentActivity = async function(userId = null, limit = 10) {
  const whereClause = userId ? { created_by: userId, is_active: true } : { is_active: true };
  
  return await this.findAll({
    where: whereClause,
    order: [['updated_at', 'DESC']],
    limit: limit,
    include: [
      {
        model: require('./User'),
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }
    ]
  });
};

module.exports = Project;
