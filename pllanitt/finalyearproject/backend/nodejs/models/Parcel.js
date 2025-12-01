const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Parcel = sequelize.define('Parcel', {
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
  parcel_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Unique parcel identifier (e.g., A-42, B-15)'
  },
  type: {
    type: DataTypes.ENUM('Residential', 'Commercial', 'Industrial', 'Mixed-Use', 'Public', 'Green Space'),
    allowNull: false
  },
  lot_size: {
    type: DataTypes.ENUM('Small', 'Medium', 'Large', 'Estate', 'Custom'),
    allowNull: true
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Parcel area in square meters'
  },
  geometry: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'GeoJSON Polygon geometry'
  },
  dimensions: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Parcel dimensions: width, length, etc.'
  },
  road_access: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  road_width: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Adjacent road width in meters'
  },
  corner_lot: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  slope: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Terrain slope percentage'
  },
  utilities: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Available utilities: water, electricity, sewage, internet, etc.'
  },
  zoning: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Zoning classification'
  },
  status: {
    type: DataTypes.ENUM('Available', 'Reserved', 'Sold', 'Under Development', 'Completed'),
    allowNull: false,
    defaultValue: 'Available'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional parcel metadata'
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
  tableName: 'parcels',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['project_id'] },
    { fields: ['type'] },
    // { fields: ['status'] }, // Temporarily commented - will be added after column exists
    { fields: ['parcel_number'] },
    { fields: ['created_by'] }
  ]
});

Parcel.prototype.toJSON = function() {
  const values = { ...this.get() };
  return {
    id: values.id,
    projectId: values.project_id,
    parcelNumber: values.parcel_number,
    type: values.type,
    lotSize: values.lot_size,
    area: values.area,
    geometry: values.geometry,
    dimensions: values.dimensions,
    roadAccess: values.road_access,
    roadWidth: values.road_width,
    cornerLot: values.corner_lot,
    slope: values.slope,
    utilities: values.utilities || {},
    zoning: values.zoning,
    status: values.status,
    metadata: values.metadata || {},
    createdBy: values.created_by,
    createdAt: values.created_at,
    updatedAt: values.updated_at
  };
};

module.exports = Parcel;

