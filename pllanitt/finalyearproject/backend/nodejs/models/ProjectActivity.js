const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectActivity = sequelize.define('ProjectActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,  // Allow null for system activities
    references: {
      model: 'users',
      key: 'id'
    }
  },
  activity_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of activity: created, updated, status_changed, etc.'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional activity data'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'project_activities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['project_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['activity_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = ProjectActivity;

