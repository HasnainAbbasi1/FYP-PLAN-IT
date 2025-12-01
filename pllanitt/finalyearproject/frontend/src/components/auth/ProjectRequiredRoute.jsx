import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ProjectRequiredRoute - A route wrapper that requires a project to be selected
 * If no project is selected, redirects to the Projects page
 */
const ProjectRequiredRoute = ({ children }) => {
  const { currentProject, loading: projectLoading } = useProject();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (authLoading || projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 md:w-10 md:h-10 border-4 md:border-[3px] border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login (let ProtectedRoute handle this)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no project is selected, redirect to projects page
  if (!currentProject) {
    return (
      <Navigate 
        to="/projects" 
        state={{ 
          from: location,
          message: 'Please select a project to continue',
          requireProject: true
        }} 
        replace 
      />
    );
  }

  // Project is selected, render the children
  return children;
};

export default ProjectRequiredRoute;

