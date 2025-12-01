// Model associations for the urban planning application
const User = require('./User');
const Project = require('./Project');
const Polygon = require('./Polygon');
const TerrainAnalysis = require('./TerrainAnalysis');
const LandSuitability = require('./LandSuitability');
const ZoningResult = require('./ZoningResult');
const OptimizationZoning = require('./OptimizationZoning');
const Road = require('./Road');
const Building = require('./Building');
const Infrastructure = require('./Infrastructure');
const GreenSpace = require('./GreenSpace');
const Parcel = require('./Parcel');
const ProjectActivity = require('./ProjectActivity');
const Notification = require('./Notification');

// User associations
User.hasMany(Project, { 
  foreignKey: 'created_by', 
  as: 'createdProjects' 
});

User.hasMany(Polygon, { 
  foreignKey: 'user_id', 
  as: 'polygons' 
});

// Project associations
Project.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

Project.belongsTo(User, { 
  foreignKey: 'updated_by', 
  as: 'updater' 
});

Project.belongsTo(Polygon, { 
  foreignKey: 'polygon_id', 
  as: 'polygon' 
});

// Polygon associations
Polygon.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});

Polygon.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

Polygon.hasMany(Project, { 
  foreignKey: 'polygon_id', 
  as: 'projects' 
});

Polygon.hasMany(TerrainAnalysis, { 
  foreignKey: 'polygon_id', 
  as: 'terrainAnalyses' 
});

Polygon.hasMany(LandSuitability, { 
  foreignKey: 'polygon_id', 
  as: 'landSuitabilityAnalyses' 
});

Polygon.hasMany(ZoningResult, { 
  foreignKey: 'polygon_id', 
  as: 'zoningResults' 
});

Polygon.hasMany(OptimizationZoning, { 
  foreignKey: 'polygon_id', 
  as: 'optimizationZoning' 
});

// TerrainAnalysis associations
TerrainAnalysis.belongsTo(Polygon, { 
  foreignKey: 'polygon_id', 
  as: 'polygon' 
});

TerrainAnalysis.hasMany(ZoningResult, { 
  foreignKey: 'terrain_analysis_id', 
  as: 'zoningResults' 
});

// ZoningResult associations
ZoningResult.belongsTo(Polygon, { 
  foreignKey: 'polygon_id', 
  as: 'polygon' 
});

ZoningResult.belongsTo(TerrainAnalysis, { 
  foreignKey: 'terrain_analysis_id', 
  as: 'terrainAnalysis' 
});

// OptimizationZoning associations
OptimizationZoning.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

OptimizationZoning.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});

OptimizationZoning.belongsTo(Polygon, { 
  foreignKey: 'polygon_id', 
  as: 'polygon' 
});

// Design entities associations
Project.hasMany(Road, { 
  foreignKey: 'project_id', 
  as: 'roads' 
});

Project.hasMany(Building, { 
  foreignKey: 'project_id', 
  as: 'buildings' 
});

Project.hasMany(Infrastructure, { 
  foreignKey: 'project_id', 
  as: 'infrastructure' 
});

Project.hasMany(GreenSpace, { 
  foreignKey: 'project_id', 
  as: 'greenSpaces' 
});

Project.hasMany(Parcel, { 
  foreignKey: 'project_id', 
  as: 'parcels' 
});

Project.hasMany(TerrainAnalysis, { 
  foreignKey: 'project_id', 
  as: 'terrainAnalyses' 
});

Project.hasMany(LandSuitability, { 
  foreignKey: 'project_id', 
  as: 'landSuitabilityAnalyses' 
});

Project.hasMany(ZoningResult, { 
  foreignKey: 'project_id', 
  as: 'zoningResults' 
});

TerrainAnalysis.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

LandSuitability.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

ZoningResult.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

Road.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

Road.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

Building.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

Building.belongsTo(Parcel, { 
  foreignKey: 'parcel_id', 
  as: 'parcel' 
});

Building.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

Parcel.hasMany(Building, { 
  foreignKey: 'parcel_id', 
  as: 'buildings' 
});

Infrastructure.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

Infrastructure.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

GreenSpace.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

GreenSpace.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

Parcel.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

Parcel.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

// ProjectActivity associations
ProjectActivity.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

ProjectActivity.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Project.hasMany(ProjectActivity, {
  foreignKey: 'project_id',
  as: 'activities'
});

User.hasMany(ProjectActivity, {
  foreignKey: 'user_id',
  as: 'activities'
});

// Notification associations
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications'
});

module.exports = {
  User,
  Project,
  Polygon,
  TerrainAnalysis,
  LandSuitability,
  ZoningResult,
  OptimizationZoning,
  Road,
  Building,
  Infrastructure,
  GreenSpace,
  Parcel
};
