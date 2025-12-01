import React, { createContext, useContext, useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/authHelper';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Handle browser back/forward navigation after logout
  useEffect(() => {
    if (!isAuthenticated) {
      const handlePopState = (event) => {
        // Prevent navigation to protected pages after logout
        const currentPath = window.location.pathname;
        const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/landing', '/unauthorized'];
        
        if (!publicPaths.includes(currentPath)) {
          window.history.replaceState(null, '', '/landing');
        }
      };

      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isAuthenticated]);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
    
    // Note: Project state restoration will be handled by ProjectContext
    // after user is set and projects are loaded
  };

  const logout = () => {
    // Clear all authentication data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken'); // Clear legacy token if exists
    localStorage.removeItem('userData'); // Clear legacy user data if exists
    
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear any other session data
    sessionStorage.clear();
    
    // Clear browser history to prevent back navigation to protected pages
    if (window.history.state) {
      window.history.replaceState(null, '', '/landing');
    }
  };

  const updateUser = async (userData = {}) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to update profile');
      }

      const data = await response.json();
      const updatedUser = {
        ...user,
        ...userData,
        ...data.user
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    
    const permissions = {
      admin: ['view', 'edit', 'delete', 'manage_users', 'manage_projects', 'manage_settings'],
      planner: ['view', 'edit', 'create_projects', 'manage_own_projects'],
      viewer: ['view']
    };

    return permissions[user.role]?.includes(permission) || false;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    hasPermission,
    isAdmin: user?.role === 'admin',
    isPlanner: user?.role === 'planner',
    isViewer: user?.role === 'viewer'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};