const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TerrainAnalysis = sequelize.define('TerrainAnalysis', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  polygon_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'polygons',
      key: 'id'
    }
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  analysis_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'terrain'
  },
  elevation_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  slope_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  aspect_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  analysis_parameters: {
    type: DataTypes.JSON,
    allowNull: true
  },
  results: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'terrain_analyses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = TerrainAnalysis;