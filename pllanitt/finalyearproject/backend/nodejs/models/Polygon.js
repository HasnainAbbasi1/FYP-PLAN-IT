const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Polygon = sequelize.define('Polygon', {
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  geojson: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  dem_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_id: {   // 👈 keep this snake_case to match your DB column & controllers
    type: DataTypes.INTEGER,
    allowNull: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'projects',
      key: 'id'
    },
    comment: 'Associated project for this polygon'
  }
}, {
  tableName: 'polygons',
  underscored: true,   // this ensures created_at, updated_at are snake_case
  timestamps: true,
  indexes: [
    {
      fields: ['project_id']
    },
    {
      fields: ['user_id']
    }
  ]
});

module.exports = Polygon;