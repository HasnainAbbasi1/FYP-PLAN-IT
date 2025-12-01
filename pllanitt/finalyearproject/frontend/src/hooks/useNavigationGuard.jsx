import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Custom hook to prevent unauthorized navigation
export const useNavigationGuard = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Define public routes that don't require authentication
    const publicPaths = [
      '/login',
      '/signup', 
      '/forgot-password',
      '/reset-password',
      '/landing',
      '/unauthorized'
    ];

    const handleBeforeUnload = (event) => {
      // Optional: Warn user before closing tab/browser if they have unsaved work
      // You can customize this based on your app's needs
      if (isAuthenticated) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    // Only handle navigation when the location actually changes
    const currentPath = location.pathname;
    
    // If user is not authenticated and trying to access protected route
    if (!isAuthenticated && !publicPaths.includes(currentPath)) {
      navigate('/login', { replace: true });
      return;
    }

    // Prevent navigation to login/signup if already authenticated
    // But only if they're actually trying to go to those pages
    if (isAuthenticated && (currentPath === '/login' || currentPath === '/signup')) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, navigate, location.pathname]);
};

// Component wrapper that uses the navigation guard
export const NavigationGuard = ({ children }) => {
  useNavigationGuard();
  return children;
};