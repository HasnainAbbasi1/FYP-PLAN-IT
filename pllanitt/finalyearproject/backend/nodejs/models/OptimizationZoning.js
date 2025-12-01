const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OptimizationZoning = sequelize.define('OptimizationZoning', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'project_id',
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  polygonId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'polygon_id',
    references: {
      model: 'polygons',
      key: 'id'
    }
  },
  zoningPolygons: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'zoning_polygons'
  },
  statistics: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  outputFiles: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'output_files'
  },
  parameters: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  results: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  fitnessScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'fitness_score'
  },
  generations: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  convergenceInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'convergence_info'
  },
  zoneStatistics: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'zone_statistics'
  },
  assignments: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  landUseDistribution: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'land_use_distribution'
  },
  totalCells: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'total_cells'
  },
  method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  roadNetwork: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'road_network'
  },
  zones: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  rawResult: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'raw_result'
  }
}, {
  tableName: 'optimization_zoning',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Legacy class methods for backward compatibility
class OptimizationZoningClass {
  static async createOptimizationZoning(data) {
    return await OptimizationZoning.create(data);
  }

  static async getOptimizationZoningById(id) {
    return await OptimizationZoning.findByPk(id);
  }

  static async getOptimizationZoningByProjectId(projectId) {
    return await OptimizationZoning.findOne({
      where: { projectId },
      order: [['created_at', 'DESC']]
    });
  }

  static async updateOptimizationZoning(id, data) {
    const optimizationZoning = await OptimizationZoning.findByPk(id);
    if (!optimizationZoning) {
      throw new Error('Optimization zoning not found');
    }
    return await optimizationZoning.update(data);
  }

  static async deleteOptimizationZoning(id) {
    const optimizationZoning = await OptimizationZoning.findByPk(id);
    if (!optimizationZoning) {
      throw new Error('Optimization zoning not found');
    }
    return await optimizationZoning.destroy();
  }

  static async getAllOptimizationZoning() {
    return await OptimizationZoning.findAll({
      order: [['created_at', 'DESC']]
    });
  }

  static async getOptimizationZoningByUserId(userId) {
    return await OptimizationZoning.findAll({
      where: { userId },
      order: [['created_at', 'DESC']]
    });
  }
}

// Add class methods to the model
Object.assign(OptimizationZoning, OptimizationZoningClass);

module.exports = OptimizationZoning;
