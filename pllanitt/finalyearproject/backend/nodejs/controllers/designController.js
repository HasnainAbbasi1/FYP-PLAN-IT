const Road = require('../models/Road');
const Building = require('../models/Building');
const Infrastructure = require('../models/Infrastructure');
const GreenSpace = require('../models/GreenSpace');
const Parcel = require('../models/Parcel');
const Project = require('../models/Project');
const { Op } = require('sequelize');

// ========== ROADS ==========
const roadController = {
  // Get all roads for a project
  getProjectRoads: async (req, res) => {
    try {
      const { projectId } = req.params;
      const roads = await Road.findAll({
        where: { project_id: projectId },
        order: [['created_at', 'DESC']]
      });
      res.json(roads);
    } catch (error) {
      console.error('Error fetching roads:', error);
      res.status(500).json({ error: 'Failed to fetch roads', details: error.message });
    }
  },

  // Get single road
  getRoad: async (req, res) => {
    try {
      const { id } = req.params;
      const road = await Road.findByPk(id);
      if (!road) {
        return res.status(404).json({ error: 'Road not found' });
      }
      res.json(road);
    } catch (error) {
      console.error('Error fetching road:', error);
      res.status(500).json({ error: 'Failed to fetch road', details: error.message });
    }
  },

  // Create road
  createRoad: async (req, res) => {
    try {
      const { projectId, ...roadData } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify project exists and user has access
      const project = await Project.findOne({ where: { id: projectId, is_active: true } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const road = await Road.create({
        ...roadData,
        project_id: projectId,
        created_by: userId
      });

      res.status(201).json(road);
    } catch (error) {
      console.error('Error creating road:', error);
      res.status(500).json({ error: 'Failed to create road', details: error.message });
    }
  },

  // Update road
  updateRoad: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const road = await Road.findByPk(id);
      if (!road) {
        return res.status(404).json({ error: 'Road not found' });
      }

      // Check permission
      const project = await Project.findByPk(road.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await road.update(req.body);
      res.json(road);
    } catch (error) {
      console.error('Error updating road:', error);
      res.status(500).json({ error: 'Failed to update road', details: error.message });
    }
  },

  // Delete road
  deleteRoad: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const road = await Road.findByPk(id);
      if (!road) {
        return res.status(404).json({ error: 'Road not found' });
      }

      const project = await Project.findByPk(road.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await road.destroy();
      res.json({ message: 'Road deleted successfully' });
    } catch (error) {
      console.error('Error deleting road:', error);
      res.status(500).json({ error: 'Failed to delete road', details: error.message });
    }
  }
};

// ========== BUILDINGS ==========
const buildingController = {
  getProjectBuildings: async (req, res) => {
    try {
      const { projectId } = req.params;
      const buildings = await Building.findAll({
        where: { project_id: projectId },
        order: [['created_at', 'DESC']]
      });
      res.json(buildings);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      res.status(500).json({ error: 'Failed to fetch buildings', details: error.message });
    }
  },

  getBuilding: async (req, res) => {
    try {
      const { id } = req.params;
      const building = await Building.findByPk(id);
      if (!building) {
        return res.status(404).json({ error: 'Building not found' });
      }
      res.json(building);
    } catch (error) {
      console.error('Error fetching building:', error);
      res.status(500).json({ error: 'Failed to fetch building', details: error.message });
    }
  },

  createBuilding: async (req, res) => {
    try {
      const { projectId, ...buildingData } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({ where: { id: projectId, is_active: true } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const building = await Building.create({
        ...buildingData,
        project_id: projectId,
        created_by: userId
      });

      res.status(201).json(building);
    } catch (error) {
      console.error('Error creating building:', error);
      res.status(500).json({ error: 'Failed to create building', details: error.message });
    }
  },

  updateBuilding: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const building = await Building.findByPk(id);
      if (!building) {
        return res.status(404).json({ error: 'Building not found' });
      }

      const project = await Project.findByPk(building.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await building.update(req.body);
      res.json(building);
    } catch (error) {
      console.error('Error updating building:', error);
      res.status(500).json({ error: 'Failed to update building', details: error.message });
    }
  },

  deleteBuilding: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const building = await Building.findByPk(id);
      if (!building) {
        return res.status(404).json({ error: 'Building not found' });
      }

      const project = await Project.findByPk(building.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await building.destroy();
      res.json({ message: 'Building deleted successfully' });
    } catch (error) {
      console.error('Error deleting building:', error);
      res.status(500).json({ error: 'Failed to delete building', details: error.message });
    }
  }
};

// ========== INFRASTRUCTURE ==========
const infrastructureController = {
  getProjectInfrastructure: async (req, res) => {
    try {
      const { projectId } = req.params;
      const infrastructure = await Infrastructure.findAll({
        where: { project_id: projectId },
        order: [['created_at', 'DESC']]
      });
      res.json(infrastructure);
    } catch (error) {
      console.error('Error fetching infrastructure:', error);
      res.status(500).json({ error: 'Failed to fetch infrastructure', details: error.message });
    }
  },

  getInfrastructure: async (req, res) => {
    try {
      const { id } = req.params;
      const infrastructure = await Infrastructure.findByPk(id);
      if (!infrastructure) {
        return res.status(404).json({ error: 'Infrastructure not found' });
      }
      res.json(infrastructure);
    } catch (error) {
      console.error('Error fetching infrastructure:', error);
      res.status(500).json({ error: 'Failed to fetch infrastructure', details: error.message });
    }
  },

  createInfrastructure: async (req, res) => {
    try {
      const { projectId, ...infrastructureData } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({ where: { id: projectId, is_active: true } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const infrastructure = await Infrastructure.create({
        ...infrastructureData,
        project_id: projectId,
        created_by: userId
      });

      res.status(201).json(infrastructure);
    } catch (error) {
      console.error('Error creating infrastructure:', error);
      res.status(500).json({ error: 'Failed to create infrastructure', details: error.message });
    }
  },

  updateInfrastructure: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const infrastructure = await Infrastructure.findByPk(id);
      if (!infrastructure) {
        return res.status(404).json({ error: 'Infrastructure not found' });
      }

      const project = await Project.findByPk(infrastructure.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await infrastructure.update(req.body);
      res.json(infrastructure);
    } catch (error) {
      console.error('Error updating infrastructure:', error);
      res.status(500).json({ error: 'Failed to update infrastructure', details: error.message });
    }
  },

  deleteInfrastructure: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const infrastructure = await Infrastructure.findByPk(id);
      if (!infrastructure) {
        return res.status(404).json({ error: 'Infrastructure not found' });
      }

      const project = await Project.findByPk(infrastructure.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await infrastructure.destroy();
      res.json({ message: 'Infrastructure deleted successfully' });
    } catch (error) {
      console.error('Error deleting infrastructure:', error);
      res.status(500).json({ error: 'Failed to delete infrastructure', details: error.message });
    }
  }
};

// ========== GREEN SPACES ==========
const greenSpaceController = {
  getProjectGreenSpaces: async (req, res) => {
    try {
      const { projectId } = req.params;
      const greenSpaces = await GreenSpace.findAll({
        where: { project_id: projectId },
        order: [['created_at', 'DESC']]
      });
      res.json(greenSpaces);
    } catch (error) {
      console.error('Error fetching green spaces:', error);
      res.status(500).json({ error: 'Failed to fetch green spaces', details: error.message });
    }
  },

  getGreenSpace: async (req, res) => {
    try {
      const { id } = req.params;
      const greenSpace = await GreenSpace.findByPk(id);
      if (!greenSpace) {
        return res.status(404).json({ error: 'Green space not found' });
      }
      res.json(greenSpace);
    } catch (error) {
      console.error('Error fetching green space:', error);
      res.status(500).json({ error: 'Failed to fetch green space', details: error.message });
    }
  },

  createGreenSpace: async (req, res) => {
    try {
      const { projectId, ...greenSpaceData } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({ where: { id: projectId, is_active: true } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const greenSpace = await GreenSpace.create({
        ...greenSpaceData,
        project_id: projectId,
        created_by: userId
      });

      res.status(201).json(greenSpace);
    } catch (error) {
      console.error('Error creating green space:', error);
      res.status(500).json({ error: 'Failed to create green space', details: error.message });
    }
  },

  updateGreenSpace: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const greenSpace = await GreenSpace.findByPk(id);
      if (!greenSpace) {
        return res.status(404).json({ error: 'Green space not found' });
      }

      const project = await Project.findByPk(greenSpace.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await greenSpace.update(req.body);
      res.json(greenSpace);
    } catch (error) {
      console.error('Error updating green space:', error);
      res.status(500).json({ error: 'Failed to update green space', details: error.message });
    }
  },

  deleteGreenSpace: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const greenSpace = await GreenSpace.findByPk(id);
      if (!greenSpace) {
        return res.status(404).json({ error: 'Green space not found' });
      }

      const project = await Project.findByPk(greenSpace.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await greenSpace.destroy();
      res.json({ message: 'Green space deleted successfully' });
    } catch (error) {
      console.error('Error deleting green space:', error);
      res.status(500).json({ error: 'Failed to delete green space', details: error.message });
    }
  }
};

// ========== PARCELS ==========
const parcelController = {
  getProjectParcels: async (req, res) => {
    try {
      const { projectId } = req.params;
      const parcels = await Parcel.findAll({
        where: { project_id: projectId },
        order: [['parcel_number', 'ASC']]
      });
      res.json(parcels);
    } catch (error) {
      console.error('Error fetching parcels:', error);
      res.status(500).json({ error: 'Failed to fetch parcels', details: error.message });
    }
  },

  getParcel: async (req, res) => {
    try {
      const { id } = req.params;
      const parcel = await Parcel.findByPk(id);
      if (!parcel) {
        return res.status(404).json({ error: 'Parcel not found' });
      }
      res.json(parcel);
    } catch (error) {
      console.error('Error fetching parcel:', error);
      res.status(500).json({ error: 'Failed to fetch parcel', details: error.message });
    }
  },

  createParcel: async (req, res) => {
    try {
      const { projectId, ...parcelData } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const project = await Project.findOne({ where: { id: projectId, is_active: true } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const parcel = await Parcel.create({
        ...parcelData,
        project_id: projectId,
        created_by: userId
      });

      res.status(201).json(parcel);
    } catch (error) {
      console.error('Error creating parcel:', error);
      res.status(500).json({ error: 'Failed to create parcel', details: error.message });
    }
  },

  updateParcel: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const parcel = await Parcel.findByPk(id);
      if (!parcel) {
        return res.status(404).json({ error: 'Parcel not found' });
      }

      const project = await Project.findByPk(parcel.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await parcel.update(req.body);
      res.json(parcel);
    } catch (error) {
      console.error('Error updating parcel:', error);
      res.status(500).json({ error: 'Failed to update parcel', details: error.message });
    }
  },

  deleteParcel: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const parcel = await Parcel.findByPk(id);
      if (!parcel) {
        return res.status(404).json({ error: 'Parcel not found' });
      }

      const project = await Project.findByPk(parcel.project_id);
      if (project.created_by !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await parcel.destroy();
      res.json({ message: 'Parcel deleted successfully' });
    } catch (error) {
      console.error('Error deleting parcel:', error);
      res.status(500).json({ error: 'Failed to delete parcel', details: error.message });
    }
  }
};

module.exports = {
  roadController,
  buildingController,
  infrastructureController,
  greenSpaceController,
  parcelController
};

