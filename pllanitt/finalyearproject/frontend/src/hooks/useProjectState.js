import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';

/**
 * Hook to automatically save and restore project state based on navigation
 * This ensures users can continue where they left off
 */
export const useProjectState = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, setLastVisitedRoute } = useProject();

  // Save route when navigating
  useEffect(() => {
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
      '/analysis'
    ];

    if (projectRoutes.some(route => location.pathname.startsWith(route))) {
      setLastVisitedRoute(location.pathname);
      
      // If we have a current project, save its state
      if (currentProject) {
        setCurrentProject(currentProject, location.pathname);
      }
    }
  }, [location.pathname, currentProject, setCurrentProject, setLastVisitedRoute]);

  return { currentProject };
};
