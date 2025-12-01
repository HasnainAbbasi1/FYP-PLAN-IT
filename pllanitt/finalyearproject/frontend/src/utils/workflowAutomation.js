/**
 * Workflow Automation Utilities
 * Auto-advance project stages based on completed tasks
 */

import { PROJECT_WORKFLOW_STAGES } from './projectWorkflow';

/**
 * Check if project should auto-advance to next stage
 */
export const checkWorkflowAdvancement = (project, projectData) => {
  const currentStage = getProjectWorkflowStage(project);
  if (!currentStage.nextStage) return null; // Already at final stage

  const nextStage = PROJECT_WORKFLOW_STAGES[currentStage.nextStage.toUpperCase()];
  if (!nextStage) return null;

  // Check if requirements for next stage are met
  const canAdvance = checkStageRequirements(project, projectData, nextStage);
  
  return canAdvance ? nextStage : null;
};

/**
 * Check if project meets requirements for a stage
 */
const checkStageRequirements = (project, projectData, stage) => {
  const metadata = project.metadata || {};
  
  switch (stage.id) {
    case 'terrain':
      // Advance to terrain if project has location and basic info
      return project.location && project.title;
      
    case 'suitability':
      // Advance to suitability if terrain analysis is completed
      return metadata.terrain_completed || projectData?.hasTerrainAnalysis;
      
    case 'zoning':
      // Advance to zoning if suitability analysis is completed
      return metadata.suitability_completed || projectData?.hasSuitabilityAnalysis;
      
    case 'completed':
      // Advance to completed if zoning is done and progress is high
      return (metadata.zoning_completed || projectData?.hasZoning) && 
             (project.progress >= 90);
      
    default:
      return false;
  }
};

/**
 * Auto-advance project stage
 */
export const autoAdvanceStage = async (project, projectData, onUpdate) => {
  const nextStage = checkWorkflowAdvancement(project, projectData);
  
  if (!nextStage) return false;

  try {
    // Update project metadata
    const updatedMetadata = {
      ...(project.metadata || {}),
      [`${nextStage.id}_started`]: new Date().toISOString(),
      previous_stage: getProjectWorkflowStage(project).id,
      stage_changed_at: new Date().toISOString()
    };

    // Calculate new progress based on stage
    const progressMap = {
      'draft': 0,
      'terrain': 25,
      'suitability': 50,
      'zoning': 75,
      'completed': 100
    };
    const newProgress = progressMap[nextStage.id] || project.progress;

    // Update project
    if (onUpdate) {
      await onUpdate(project.id, {
        metadata: updatedMetadata,
        progress: newProgress,
        status: nextStage.id === 'completed' ? 'Completed' : 'In Progress'
      });
    }

    // Send notification
    await sendStageChangeNotification(project, nextStage);

    return true;
  } catch (error) {
    console.error('Error auto-advancing stage:', error);
    return false;
  }
};

/**
 * Send notification when stage changes
 */
const sendStageChangeNotification = async (project, newStage) => {
  try {
    // This would call the notification service
    // For now, we'll just log it
    console.log(`Project ${project.title} advanced to stage: ${newStage.label}`);
    
    // TODO: Integrate with notification service
    // await notificationService.notifyStatusChange(
    //   project.id,
    //   project.title,
    //   project.created_by,
    //   getProjectWorkflowStage(project).label,
    //   newStage.label
    // );
  } catch (error) {
    console.error('Error sending stage change notification:', error);
  }
};

/**
 * Get project workflow stage (re-export from projectWorkflow)
 */
const getProjectWorkflowStage = (project) => {
  if (!project) return PROJECT_WORKFLOW_STAGES.DRAFT;
  
  const progress = project.progress || 0;
  const status = project.status?.toLowerCase() || 'planning';
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
 * Workflow rules engine
 */
export const workflowRules = {
  /**
   * Rule: Auto-advance to terrain after project creation with location
   */
  onProjectCreated: (project) => {
    if (project.location && project.title) {
      return {
        action: 'advance',
        targetStage: 'terrain',
        condition: 'project_has_location'
      };
    }
    return null;
  },

  /**
   * Rule: Auto-advance to suitability after terrain analysis
   */
  onTerrainCompleted: (project) => {
    return {
      action: 'advance',
      targetStage: 'suitability',
      condition: 'terrain_analysis_complete'
    };
  },

  /**
   * Rule: Auto-advance to zoning after suitability analysis
   */
  onSuitabilityCompleted: (project) => {
    return {
      action: 'advance',
      targetStage: 'zoning',
      condition: 'suitability_analysis_complete'
    };
  },

  /**
   * Rule: Auto-complete project after zoning and high progress
   */
  onZoningCompleted: (project) => {
    if (project.progress >= 90) {
      return {
        action: 'advance',
        targetStage: 'completed',
        condition: 'zoning_complete_and_high_progress'
      };
    }
    return null;
  }
};

export default {
  checkWorkflowAdvancement,
  autoAdvanceStage,
  workflowRules
};

