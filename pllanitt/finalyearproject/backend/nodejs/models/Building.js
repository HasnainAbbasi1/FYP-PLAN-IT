const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Building = sequelize.define('Building', {
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
  parcel_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'parcels',
      key: 'id'
    },
    comment: 'Associated parcel if applicable'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('Residential', 'Commercial', 'Industrial', 'Public', 'Mixed-Use'),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g., Single Family, Apartment, Office, Retail, etc.'
  },
  floors: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 200
    }
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Building area in square meters'
  },
  footprint: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Building footprint in square meters'
  },
  height: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Building height in meters'
  },
  geometry: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'GeoJSON Polygon geometry'
  },
  occupancy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated occupancy capacity'
  },
  parking_spaces: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Planned', 'Under Construction', 'Completed', 'Renovation'),
    allowNull: false,
    defaultValue: 'Planned'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional building metadata'
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
  tableName: 'buildings',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['project_id'] },
    { fields: ['parcel_id'] },
    { fields: ['type'] },
    // { fields: ['status'] }, // Temporarily commented - will be added after column exists
    { fields: ['created_by'] }
  ]
});

Building.prototype.toJSON = function() {
  const values = { ...this.get() };
  return {
    id: values.id,
    projectId: values.project_id,
    parcelId: values.parcel_id,
    name: values.name,
    type: values.type,
    category: values.category,
    floors: values.floors,
    area: values.area,
    footprint: values.footprint,
    height: values.height,
    geometry: values.geometry,
    occupancy: values.occupancy,
    parkingSpaces: values.parking_spaces,
    status: values.status,
    metadata: values.metadata || {},
    createdBy: values.created_by,
    createdAt: values.created_at,
    updatedAt: values.updated_at
  };
};

module.exports = Building;

