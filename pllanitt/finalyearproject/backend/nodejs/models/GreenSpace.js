const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GreenSpace = sequelize.define('GreenSpace', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('Park', 'Garden', 'Recreation', 'Conservation', 'Waterfront', 'Pocket Park', 'Green Corridor'),
    allowNull: false
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Green space area in square meters'
  },
  geometry: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'GeoJSON Polygon geometry'
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Features: playground, sports, trails, water features, etc.'
  },
  vegetation_type: {
    type: DataTypes.ENUM('Forest', 'Grassland', 'Mixed', 'Wetland', 'Desert', 'Urban Garden'),
    allowNull: true
  },
  accessibility: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Wheelchair accessible'
  },
  status: {
    type: DataTypes.ENUM('Planned', 'Under Development', 'Completed', 'Maintenance'),
    allowNull: false,
    defaultValue: 'Planned'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional green space metadata'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'green_spaces',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['project_id'] },
    { fields: ['type'] },
    // { fields: ['status'] }, // Temporarily commented - will be added after column exists
    { fields: ['created_by'] }
  ]
});

GreenSpace.prototype.toJSON = function() {
  const values = { ...this.get() };
  return {
    id: values.id,
    projectId: values.project_id,
    name: values.name,
    type: values.type,
    area: values.area,
    geometry: values.geometry,
    features: values.features || {},
    vegetationType: values.vegetation_type,
    accessibility: values.accessibility,
    status: values.status,
    metadata: values.metadata || {},
    createdBy: values.created_by,
    createdAt: values.created_at,
    updatedAt: values.updated_at
  };
};

module.exports = GreenSpace;

