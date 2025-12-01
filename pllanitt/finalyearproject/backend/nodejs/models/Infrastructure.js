const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Infrastructure = sequelize.define('Infrastructure', {
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
    type: DataTypes.ENUM('Education', 'Healthcare', 'Utilities', 'Communication', 'Transport', 'Other'),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g., School, Hospital, Water Treatment, Power Plant, etc.'
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Service capacity (people, units, etc.)'
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Infrastructure area in square meters'
  },
  geometry: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'GeoJSON geometry (Point or Polygon)'
  },
  service_radius: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Service radius in meters (for point infrastructure)'
  },
  status: {
    type: DataTypes.ENUM('Planned', 'Under Construction', 'Operational', 'Maintenance', 'Decommissioned'),
    allowNull: false,
    defaultValue: 'Planned'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional infrastructure metadata'
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
  tableName: 'infrastructure',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['project_id'] },
    { fields: ['type'] },
    // { fields: ['status'] }, // Temporarily commented - will be added after column exists
    { fields: ['created_by'] }
  ]
});

Infrastructure.prototype.toJSON = function() {
  const values = { ...this.get() };
  return {
    id: values.id,
    projectId: values.project_id,
    name: values.name,
    type: values.type,
    category: values.category,
    capacity: values.capacity,
    area: values.area,
    geometry: values.geometry,
    serviceRadius: values.service_radius,
    status: values.status,
    metadata: values.metadata || {},
    createdBy: values.created_by,
    createdAt: values.created_at,
    updatedAt: values.updated_at
  };
};

module.exports = Infrastructure;

