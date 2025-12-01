const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ZoningResult = sequelize.define('ZoningResult', {
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
  zoning_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'comprehensive'
  },
  zoning_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  zoning_result: {
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
  marla_summary: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Marla summary with residential, commercial, park, roads breakdown'
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to the 2D zoning visualization image'
  },
  green_space_statistics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Green space statistics from 2D visualization'
  },
  terrain_summary: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Terrain analysis summary with area calculations'
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
  tableName: 'zoning_results',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ZoningResult;