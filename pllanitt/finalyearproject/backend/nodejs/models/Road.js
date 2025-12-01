const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Road = sequelize.define('Road', {
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
    },
    comment: 'Associated project'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('Primary', 'Secondary', 'Local', 'Pedestrian', 'Bike Lane'),
    allowNull: false,
    defaultValue: 'Local'
  },
  width: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Road width in meters'
  },
  length: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Road length in meters'
  },
  geometry: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'GeoJSON LineString geometry'
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Road features: bikeLanes, sidewalks, medians, trees, etc.'
  },
  traffic_flow: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated daily traffic flow'
  },
  speed_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Speed limit in km/h'
  },
  surface_type: {
    type: DataTypes.ENUM('Asphalt', 'Concrete', 'Gravel', 'Dirt'),
    allowNull: false,
    defaultValue: 'Asphalt'
  },
  status: {
    type: DataTypes.ENUM('Planned', 'Under Construction', 'Completed', 'Maintenance'),
    allowNull: false,
    defaultValue: 'Planned'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional road metadata'
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
  tableName: 'roads',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['project_id'] },
    { fields: ['type'] },
    // { fields: ['status'] }, // Temporarily commented - will be added after column exists
    { fields: ['created_by'] }
  ]
});

Road.prototype.toJSON = function() {
  const values = { ...this.get() };
  return {
    id: values.id,
    projectId: values.project_id,
    name: values.name,
    type: values.type,
    width: values.width,
    length: values.length,
    geometry: values.geometry,
    features: values.features || {},
    trafficFlow: values.traffic_flow,
    speedLimit: values.speed_limit,
    surfaceType: values.surface_type,
    status: values.status,
    metadata: values.metadata || {},
    createdBy: values.created_by,
    createdAt: values.created_at,
    updatedAt: values.updated_at
  };
};

module.exports = Road;

