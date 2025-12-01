/**
 * Project Activity Utilities
 * Handles activity logging and tracking for projects
 */

const ACTIVITY_TYPES = {
  CREATED: 'created',
  UPDATED: 'updated',
  TERRAIN_ANALYSIS: 'terrain_analysis',
  SUITABILITY_ANALYSIS: 'suitability_analysis',
  ZONING_ANALYSIS: 'zoning_analysis',
  POLYGON_CREATED: 'polygon_created',
  POLYGON_UPDATED: 'polygon_updated',
  STATUS_CHANGED: 'status_changed',
  PROGRESS_UPDATED: 'progress_updated',
  TEAM_MEMBER_ADDED: 'team_member_added',
  REPORT_GENERATED: 'report_generated'
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Log project activity (with backend integration)
 */
export const logProjectActivity = async (projectId, activityType, details = {}) => {
  try {
    const activity = {
      projectId,
      activityType,
      description: details.description || details.action || activityType,
      metadata: {
        userId: details.userId || null,
        userName: details.userName || 'System',
        action: details.action || activityType,
        ...(details.metadata || {})
      }
    };

    // Try to save to backend
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch(`${API_BASE_URL}/api/activities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(activity)
        });

        if (response.ok) {
          const result = await response.json();
          return result.activity;
        }
      }
    } catch (apiError) {
      console.warn('Failed to save activity to backend, using localStorage fallback:', apiError);
    }

    // Fallback to localStorage
    const fallbackActivity = {
      projectId,
      type: activityType,
      timestamp: new Date().toISOString(),
      userId: details.userId || null,
      userName: details.userName || 'System',
      action: details.action || activityType,
      description: details.description || '',
      metadata: details.metadata || {}
    };
    
    const key = `project_activity_${projectId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(fallbackActivity);
    const trimmed = existing.slice(0, 50);
    localStorage.setItem(key, JSON.stringify(trimmed));
    
    return fallbackActivity;
  } catch (error) {
    console.error('Error logging project activity:', error);
    return null;
  }
};

/**
 * Get recent activities for a project (with backend integration)
 */
export const getProjectActivities = async (projectId, limit = 10) => {
  try {
    // Try to fetch from backend
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/activities/project/${projectId}?limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.activities) {
            // Transform backend format to frontend format
            return result.activities.map(activity => ({
              projectId: activity.project_id,
              type: activity.activity_type,
              timestamp: activity.created_at,
              userId: activity.user_id,
              userName: activity.user?.name || 'Unknown',
              action: activity.activity_type,
              description: activity.description,
              metadata: activity.metadata || {}
            }));
          }
        } else if (response.status === 500) {
          // Silently fallback for server errors
          // Don't log 500 errors as they're backend issues
        }
      } catch (apiError) {
        // Only log non-500 errors, silently handle server errors
        if (apiError.status !== 500) {
          console.warn('Failed to fetch activities from backend, using localStorage fallback');
        }
      }
    }

    // Fallback to localStorage
    const key = `project_activity_${projectId}`;
    const activities = JSON.parse(localStorage.getItem(key) || '[]');
    return activities.slice(0, limit);
  } catch (error) {
    // Silently return empty array on error
    return [];
  }
};

/**
 * Get last activity for a project (async)
 */
export const getLastActivity = async (projectId) => {
  try {
    const activities = await getProjectActivities(projectId, 1);
    return activities[0] || null;
  } catch (error) {
    // Silently return null on error
    return null;
  }
};

/**
 * Format activity for display
 */
export const formatActivity = (activity) => {
  if (!activity) return null;
  
  const timeAgo = getTimeAgo(activity.timestamp);
  const actionText = getActivityText(activity);
  
  return {
    ...activity,
    timeAgo,
    displayText: `${activity.userName} ${actionText} ${timeAgo}`
  };
};

/**
 * Get time ago string
 */
const getTimeAgo = (timestamp) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return then.toLocaleDateString();
};

/**
 * Get activity text based on type
 */
const getActivityText = (activity) => {
  if (!activity) return 'performed an action';
  
  const type = activity.type || activity.activity_type;
  const action = activity.action || type;
  
  if (!action) return 'performed an action';
  
  const actionMap = {
    [ACTIVITY_TYPES.CREATED]: 'created the project',
    [ACTIVITY_TYPES.UPDATED]: 'updated the project',
    [ACTIVITY_TYPES.TERRAIN_ANALYSIS]: 'completed terrain analysis',
    [ACTIVITY_TYPES.SUITABILITY_ANALYSIS]: 'completed suitability analysis',
    [ACTIVITY_TYPES.ZONING_ANALYSIS]: 'completed zoning analysis',
    [ACTIVITY_TYPES.POLYGON_CREATED]: 'created a polygon',
    [ACTIVITY_TYPES.POLYGON_UPDATED]: 'updated a polygon',
    [ACTIVITY_TYPES.STATUS_CHANGED]: 'changed project status',
    [ACTIVITY_TYPES.PROGRESS_UPDATED]: 'updated project progress',
    [ACTIVITY_TYPES.TEAM_MEMBER_ADDED]: 'added a team member',
    [ACTIVITY_TYPES.REPORT_GENERATED]: 'generated a report'
  };
  
  if (actionMap[action]) {
    return actionMap[action];
  }
  
  // Safely handle action string
  if (typeof action === 'string' && action.length > 0) {
    return action.replace(/_/g, ' ');
  }
  
  return 'performed an action';
};

export { ACTIVITY_TYPES };


