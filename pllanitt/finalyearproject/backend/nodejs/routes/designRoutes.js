const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  roadController,
  buildingController,
  infrastructureController,
  greenSpaceController,
  parcelController
} = require('../controllers/designController');

// Apply authentication middleware to all routes
router.use(verifyToken);

// ========== ROADS ROUTES ==========
router.get('/roads/project/:projectId', roadController.getProjectRoads);
router.get('/roads/:id', roadController.getRoad);
router.post('/roads', roadController.createRoad);
router.put('/roads/:id', roadController.updateRoad);
router.delete('/roads/:id', roadController.deleteRoad);

// ========== BUILDINGS ROUTES ==========
router.get('/buildings/project/:projectId', buildingController.getProjectBuildings);
router.get('/buildings/:id', buildingController.getBuilding);
router.post('/buildings', buildingController.createBuilding);
router.put('/buildings/:id', buildingController.updateBuilding);
router.delete('/buildings/:id', buildingController.deleteBuilding);

// ========== INFRASTRUCTURE ROUTES ==========
router.get('/infrastructure/project/:projectId', infrastructureController.getProjectInfrastructure);
router.get('/infrastructure/:id', infrastructureController.getInfrastructure);
router.post('/infrastructure', infrastructureController.createInfrastructure);
router.put('/infrastructure/:id', infrastructureController.updateInfrastructure);
router.delete('/infrastructure/:id', infrastructureController.deleteInfrastructure);

// ========== GREEN SPACES ROUTES ==========
router.get('/greenspaces/project/:projectId', greenSpaceController.getProjectGreenSpaces);
router.get('/greenspaces/:id', greenSpaceController.getGreenSpace);
router.post('/greenspaces', greenSpaceController.createGreenSpace);
router.put('/greenspaces/:id', greenSpaceController.updateGreenSpace);
router.delete('/greenspaces/:id', greenSpaceController.deleteGreenSpace);

// ========== PARCELS ROUTES ==========
router.get('/parcels/project/:projectId', parcelController.getProjectParcels);
router.get('/parcels/:id', parcelController.getParcel);
router.post('/parcels', parcelController.createParcel);
router.put('/parcels/:id', parcelController.updateParcel);
router.delete('/parcels/:id', parcelController.deleteParcel);

module.exports = router;

