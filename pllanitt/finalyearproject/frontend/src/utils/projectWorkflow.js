/**
 * Project Workflow Utilities
 * Defines the project lifecycle stages and provides helper functions
 */

export const PROJECT_WORKFLOW_STAGES = {
  DRAFT: {
    id: 'draft',
    label: 'Draft',
    description: 'Project created, initial setup',
    icon: '📝',
    color: 'gray',
    nextStage: 'terrain',
    requiredActions: ['Create project', 'Add location'],
    availableFeatures: ['data-ingestion', 'editor']
  },
  TERRAIN: {
    id: 'terrain',
    label: 'Terrain Analysis',
    description: 'Analyzing terrain and site conditions',
    icon: '⛰️',
    color: 'blue',
    nextStage: 'suitability',
    requiredActions: ['Run terrain analysis', 'Review terrain data'],
    availableFeatures: ['terrain', 'data-ingestion', 'editor']
  },
  SUITABILITY: {
    id: 'suitability',
    label: 'Land Suitability',
    description: 'Assessing land suitability for development',
    icon: '🗺️',
    color: 'green',
    nextStage: 'zoning',
    requiredActions: ['Run suitability analysis', 'Review suitability report'],
    availableFeatures: ['suitability', 'terrain', 'data-ingestion', 'editor']
  },
  ZONING: {
    id: 'zoning',
    label: 'Zoning & Design',
    description: 'Creating zoning plans and subdivisions',
    icon: '🏗️',
    color: 'purple',
    nextStage: 'completed',
    requiredActions: ['Run zoning analysis', 'Create subdivisions', 'Design roads'],
    availableFeatures: ['zoning', 'parcels', 'roads', 'suitability', 'terrain', 'data-ingestion', 'editor']
  },
  COMPLETED: {
    id: 'completed',
    label: 'Completed',
    description: 'Project finalized and ready',
    icon: '✅',
    color: 'green',
    nextStage: null,
    requiredActions: [],
    availableFeatures: ['zoning', 'parcels', 'roads', 'suitability', 'terrain', 'analytics', 'reports']
  }
};

/**
 * Determine project workflow stage based on progress and status
 */
export const getProjectWorkflowStage = (project) => {
  if (!project) return PROJECT_WORKFLOW_STAGES.DRAFT;
  
  const progress = project.progress || 0;
  const status = project.status?.toLowerCase() || 'planning';
  
  // Check metadata for completed stages
  const metadata = project.metadata || {};
  const hasTerrain = metadata.terrain_completed || progress >= 20;
  const hasSuitability = metadata.suitability_completed || progress >= 40;
  const hasZoning = metadata.zoning_completed || progress >= 60;
  
  if (status === 'completed' || progress === 100) {
    return PROJECT_WORKFLOW_STAGES.COMPLETED;
  }
  
  if (hasZoning && progress >= 60) {
    return PROJECT_WORKFLOW_STAGES.ZONING;
  }
  
  if (hasSuitability && progress >= 40) {
    return PROJECT_WORKFLOW_STAGES.SUITABILITY;
  }
  
  if (hasTerrain && progress >= 20) {
    return PROJECT_WORKFLOW_STAGES.TERRAIN;
  }
  
  return PROJECT_WORKFLOW_STAGES.DRAFT;
};

/**
 * Get next recommended action for a project
 */
export const getNextAction = (project) => {
  const stage = getProjectWorkflowStage(project);
  return stage.requiredActions[0] || 'Continue project setup';
};

/**
 * Check if a feature is available for the project
 */
export const isFeatureAvailable = (project, featureName) => {
  const stage = getProjectWorkflowStage(project);
  return stage.availableFeatures.includes(featureName);
};

/**
 * Get workflow progress percentage
 */
export const getWorkflowProgress = (project) => {
  const stage = getProjectWorkflowStage(project);
  const stages = Object.values(PROJECT_WORKFLOW_STAGES);
  const currentIndex = stages.findIndex(s => s.id === stage.id);
  return Math.round(((currentIndex + 1) / stages.length) * 100);
};


