import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';

/**
 * Component to track route changes and save project state
 * This ensures users can continue where they left off
 */
const RouteTracker = () => {
  const location = useLocation();
  
  // Safely access ProjectContext - return null if context not available (during hot reload)
  let projectContext;
  try {
    projectContext = useProject();
  } catch (error) {
    // Context not available yet (e.g., during hot reload), skip tracking
    console.warn('RouteTracker: ProjectContext not available, skipping route tracking');
    return null;
  }
  
  const { currentProject, setCurrentProject, setLastVisitedRoute, isRestoring } = projectContext;
  const lastSavedRoute = useRef(null);
  const lastSavedProjectId = useRef(null);

  useEffect(() => {
    // Skip if we're currently restoring state to prevent loops
    if (isRestoring) {
      return;
    }

    // Only save routes that are project-related
    const projectRoutes = [
      '/projects',
      '/data-ingestion',
      '/terrain',
      '/suitability',
      '/zoning',
      '/parcels',
      '/roads',
      '/editor',
      '/analysis',
      '/ai-optimization',
      '/optimization-zoning'
    ];

    const isProjectRoute = projectRoutes.some(route => 
      location.pathname.startsWith(route)
    );

    if (isProjectRoute) {
      const routeChanged = lastSavedRoute.current !== location.pathname;
      const projectChanged = currentProject && lastSavedProjectId.current !== currentProject.id;
      
      // Only save if route or project actually changed (prevents loops)
      if (routeChanged || projectChanged) {
        // Save the current route
        setLastVisitedRoute(location.pathname);
        lastSavedRoute.current = location.pathname;
        
        // If we have a current project, save its state with the route
        if (currentProject) {
          setCurrentProject(currentProject, location.pathname);
          lastSavedProjectId.current = currentProject.id;
        }
      }
    }
    // Remove function dependencies - they're now stable with useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentProject?.id, isRestoring]);

  return null; // This component doesn't render anything
};

export default RouteTracker;
