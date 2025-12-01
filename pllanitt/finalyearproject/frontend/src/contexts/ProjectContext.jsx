import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { projectApi } from '../services/projectApi';
import { useAuth } from './AuthContext';
import { authHelper } from '../utils/authHelper';
import { logProjectActivity, ACTIVITY_TYPES } from '../utils/projectActivity';
import { autoAdvanceStage, workflowRules } from '../utils/workflowAutomation';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastVisitedRoute, setLastVisitedRoute] = useState(null);
  const [projectSessionState, setProjectSessionState] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false); // Flag to prevent loops during restore
  const hasRestoredRef = useRef(false); // Track if we've already restored
  const fetchTimeoutRef = useRef(null); // Debounce timer for fetch calls
  const [stats, setStats] = useState({
    totalProjects: 0,
    inProgress: 0,
    completed: 0,
    totalArea: 0,
    recentActivities: []
  });

  // Save project state to localStorage
  const saveProjectState = useCallback((project, route = null) => {
    if (!user || isRestoring) return; // Don't save during restore
    
    const state = {
      projectId: project?.id,
      projectTitle: project?.title,
      route: route || window.location.pathname,
      timestamp: new Date().toISOString(),
      userId: user.id
    };
    
    localStorage.setItem(`projectState_${user.id}`, JSON.stringify(state));
    setProjectSessionState(state);
  }, [user, isRestoring]);

  // Load saved project state from localStorage
  const loadProjectState = () => {
    if (!user) return null;
    
    try {
      const savedState = localStorage.getItem(`projectState_${user.id}`);
      if (savedState) {
        const state = JSON.parse(savedState);
        // Only restore if it's from the same user
        if (state.userId === user.id) {
          setProjectSessionState(state);
          setLastVisitedRoute(state.route);
          return state;
        }
      }
    } catch (error) {
      console.error('Error loading project state:', error);
    }
    return null;
  };

  // Clear saved project state
  const clearProjectState = () => {
    if (!user) return;
    localStorage.removeItem(`projectState_${user.id}`);
    setProjectSessionState(null);
    setLastVisitedRoute(null);
  };

  // Fetch user-specific projects with rate limit handling
  const fetchProjects = async (retryCount = 0) => {
    try {
      // Check authentication first
      if (!authHelper.isAuthenticated() || !user) {
        console.log("User not authenticated, skipping project fetch");
        setProjects([]);
        return;
      }

      if (authHelper.isTokenExpired()) {
        console.log("Token expired, clearing projects");
        setProjects([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      // Fetch projects for the current user
      const response = await projectApi.getUserProjects(user.id);
      // Handle both mock data (array) and real API response (object with projects array)
      const projectsData = Array.isArray(response) ? response : response.projects || response;
      
      // Filter projects by user ID to ensure user only sees their own projects
      const userProjects = projectsData.filter(project => 
        project.created_by === user.id || project.createdBy === user.id
      );
      
      setProjects(userProjects);
      console.log(`Fetched ${userProjects.length} projects for user ${user.id}`);
    } catch (err) {
      // Handle rate limiting (429) gracefully
      if (err.response?.status === 429) {
        const retryAfter = err.response?.headers?.['retry-after'] || Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.warn(`Rate limit exceeded. Retrying after ${retryAfter}ms...`);
        
        // Retry with exponential backoff (max 3 retries)
        if (retryCount < 3) {
          setTimeout(() => {
            fetchProjects(retryCount + 1);
          }, retryAfter);
          return;
        } else {
          console.warn('Max retries reached for project fetch. Using cached data if available.');
          // Don't set error for rate limiting - it's not a critical error
          return;
        }
      }
      
      console.error('Error fetching user projects:', err);
      if (err.response?.status === 401) {
        console.log("Authentication failed, clearing projects");
        setProjects([]);
        setError("Please log in to access projects.");
      } else if (err.response?.status !== 429) {
        // Only set error for non-rate-limit errors
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch project statistics with rate limit handling
  const fetchProjectStats = async (retryCount = 0) => {
    try {
      // Check authentication first
      if (!authHelper.isAuthenticated() || authHelper.isTokenExpired()) {
        console.log("User not authenticated or token expired, skipping stats fetch");
        return;
      }

      const data = await projectApi.getProjectStats();
      setStats(data);
    } catch (err) {
      // Handle rate limiting (429) gracefully
      if (err.response?.status === 429) {
        const retryAfter = err.response?.headers?.['retry-after'] || Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.warn(`Rate limit exceeded for stats. Retrying after ${retryAfter}ms...`);
        
        // Retry with exponential backoff (max 3 retries)
        if (retryCount < 3) {
          setTimeout(() => {
            fetchProjectStats(retryCount + 1);
          }, retryAfter);
          return;
        } else {
          console.warn('Max retries reached for stats fetch. Skipping stats update.');
          // Don't log as error for rate limiting
          return;
        }
      }
      
      console.error('Error fetching project stats:', err);
      if (err.response?.status === 401) {
        console.log("Authentication failed for stats");
      }
    }
  };

  // Create new project
  const createProject = async (projectData) => {
    try {
      setLoading(true);
      setError(null);
      const newProject = await projectApi.createProject({
        ...projectData,
        createdBy: user?.id,
        status: 'Planning',
        createdAt: new Date().toISOString()
      });
      setProjects(prev => [newProject, ...prev]);
      
      // Log activity
      if (newProject?.id && user) {
        await logProjectActivity(newProject.id, ACTIVITY_TYPES.CREATED, {
          userId: user.id,
          userName: user.name || user.email,
          action: 'created the project',
          description: `Created project "${newProject.title}"`
        });
        
        // Check workflow advancement
        const rule = workflowRules.onProjectCreated(newProject);
        if (rule && rule.action === 'advance') {
          await autoAdvanceStage(newProject, {}, updateProject);
        }
      }
      
      await fetchProjectStats(); // Update stats
      return newProject;
    } catch (err) {
      setError(err.message);
      console.error('Error creating project:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update existing project
  const updateProject = async (id, projectData) => {
    try {
      setLoading(true);
      setError(null);
      const oldProject = projects.find(p => p.id === id);
      const updatedProject = await projectApi.updateProject(id, {
        ...projectData,
        updatedAt: new Date().toISOString()
      });
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      if (currentProject?.id === id) {
        // Use direct setter to avoid circular dependency, then save state
        setCurrentProject(updatedProject);
        saveProjectState(updatedProject);
      }
      
      // Log activity
      if (updatedProject?.id && user) {
        const changes = [];
        if (oldProject?.title !== updatedProject.title) changes.push('title');
        if (oldProject?.description !== updatedProject.description) changes.push('description');
        if (oldProject?.status !== updatedProject.status) changes.push('status');
        if (oldProject?.progress !== updatedProject.progress) changes.push('progress');
        
        if (changes.length > 0) {
          logProjectActivity(updatedProject.id, ACTIVITY_TYPES.UPDATED, {
            userId: user.id,
            userName: user.name || user.email,
            action: 'updated the project',
            description: `Updated: ${changes.join(', ')}`
          });
        }
      }
      
      await fetchProjectStats(); // Update stats
      return updatedProject;
    } catch (err) {
      setError(err.message);
      console.error('Error updating project:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete project
  const deleteProject = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await projectApi.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
      await fetchProjectStats(); // Update stats
    } catch (err) {
      setError(err.message);
      console.error('Error deleting project:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get single project
  const getProject = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const project = await projectApi.getProject(id);
      // Use direct setter, then save state
      setCurrentProject(project);
      saveProjectState(project);
      return project;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching project:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Enhanced setCurrentProject that also saves state
  // This is called when user explicitly selects a project
  const setCurrentProjectWithState = useCallback((project, route = null) => {
    if (!project) {
      setCurrentProject(null);
      return;
    }
    
    // Ensure project has an id (handle both id and _id formats)
    const projectId = project.id || project._id;
    if (!projectId) {
      console.warn('Project selected but missing id field:', project);
      return;
    }
    
    // Normalize project object to ensure it has an id field
    const normalizedProject = {
      ...project,
      id: projectId
    };
    
    const previousProject = currentProject;
    const previousProjectId = previousProject?.id || previousProject?._id;
    
    // Always update to ensure sidebar and other components react to the change
    // Use a new object reference to trigger React re-renders
    setCurrentProject({ ...normalizedProject });
    
    if (!isRestoring) {
      // Save project state so user can continue where they left off
      // But only if they explicitly select it (not auto-restored)
      saveProjectState(normalizedProject, route);
      console.log(`Project explicitly selected: ${normalizedProject.title || normalizedProject.name} (ID: ${projectId})`);
      
      // Log activity if project changed
      if (previousProjectId !== projectId && user) {
        logProjectActivity(projectId, ACTIVITY_TYPES.UPDATED, {
          userId: user.id,
          userName: user.name || user.email,
          action: 'selected the project',
          description: `Started working on "${normalizedProject.title || normalizedProject.name}"`
        });
      }
    }
  }, [isRestoring, saveProjectState, currentProject, user]);
  
  // Stable setter for last visited route
  const setLastVisitedRouteStable = useCallback((route) => {
    if (!isRestoring) {
      setLastVisitedRoute(route);
    }
  }, [isRestoring]);

  // Update project status
  const updateProjectStatus = async (id, status) => {
    try {
      const oldProject = projects.find(p => p.id === id);
      const updatedProject = await projectApi.updateProjectStatus(id, status);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      if (currentProject?.id === id) {
        setCurrentProject(prev => ({ ...prev, status }));
      }
      
      // Log activity
      if (updatedProject?.id && user && oldProject?.status !== status) {
        logProjectActivity(updatedProject.id, ACTIVITY_TYPES.STATUS_CHANGED, {
          userId: user.id,
          userName: user.name || user.email,
          action: 'changed project status',
          description: `Status changed from "${oldProject?.status}" to "${status}"`,
          metadata: { oldStatus: oldProject?.status, newStatus: status }
        });
      }
      
      await fetchProjectStats(); // Update stats
      return updatedProject;
    } catch (err) {
      setError(err.message);
      console.error('Error updating project status:', err);
      throw err;
    }
  };

  // Filter projects by status
  const getProjectsByStatus = (status) => {
    if (!projects || !Array.isArray(projects)) return [];
    return projects.filter(project => project.status === status);
  };

  // Search projects
  const searchProjects = (query) => {
    if (!query) return projects || [];
    if (!projects || !Array.isArray(projects)) return [];
    const lowercaseQuery = query.toLowerCase();
    return projects.filter(project => 
      project.title?.toLowerCase().includes(lowercaseQuery) ||
      project.description?.toLowerCase().includes(lowercaseQuery) ||
      project.location?.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Load initial data - DO NOT auto-restore project on login
  // User must explicitly select a project to work on
  useEffect(() => {
    if (user) {
      // IMPORTANT: Clear project selection on login
      // User must explicitly select a project to see project-related sidebar items
      setCurrentProject(null);
      // Don't clear projectState completely - keep it for "continue where left off" feature
      // but don't auto-restore currentProject
      
      // Debounce fetch calls to prevent rapid successive requests
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
      fetchProjects();
      fetchProjectStats();
      }, 300); // 300ms debounce
    } else {
      // Clear state when user logs out
      clearProjectState();
      setCurrentProject(null);
    }
    
    // Cleanup timeout on unmount or user change
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [user]);

  // DISABLED: Auto-restore project state
  // Users must explicitly select a project to work on
  // This ensures sidebar only shows project items after explicit selection
  // useEffect(() => {
  //   if (user && projects.length > 0 && projectSessionState?.projectId && !hasRestoredRef.current) {
  //     const savedProject = projects.find(p => p.id === projectSessionState.projectId);
  //     if (savedProject && (!currentProject || currentProject.id !== savedProject.id)) {
  //       hasRestoredRef.current = true;
  //       setIsRestoring(true);
  //       setCurrentProject(savedProject);
  //       console.log(`Restored project state: ${savedProject.title}`);
  //       setTimeout(() => setIsRestoring(false), 500);
  //     }
  //   }
  // }, [projects, user, projectSessionState?.projectId]);
  
  // Reset restore flag when user changes
  useEffect(() => {
    hasRestoredRef.current = false;
  }, [user]);

  const value = {
    // State
    projects,
    currentProject,
    loading,
    error,
    stats,
    lastVisitedRoute,
    projectSessionState,
    isRestoring, // Expose isRestoring so RouteTracker can check it
    
    // Actions
    fetchProjects,
    fetchProjectStats,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    updateProjectStatus,
    setCurrentProject: setCurrentProjectWithState,
    setCurrentProjectDirect: setCurrentProject, // Direct setter without saving state
    setProjects, // Expose setter for pages that need direct control (legacy support)
    
    // State Management
    saveProjectState,
    loadProjectState,
    clearProjectState,
    setLastVisitedRoute: setLastVisitedRouteStable,
    
    // Utilities
    getProjectsByStatus,
    searchProjects,
    
    // Clear error
    clearError: () => setError(null)
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
