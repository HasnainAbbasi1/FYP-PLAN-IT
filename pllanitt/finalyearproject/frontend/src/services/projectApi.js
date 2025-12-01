// Project Management API Service
import axios from 'axios';
import { mockProjectApi, mockDashboardApi } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || false; // Use real backend by default

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Authentication failed, clearing auth data');
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.clear();
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Project API endpoints
export const projectApi = {
  // Get all projects
  getAllProjects: async () => {
    if (USE_MOCK_DATA) {
      return await mockProjectApi.getAllProjects();
    }
    try {
      const response = await api.get('/api/projects');
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  // Get user-specific projects
  getUserProjects: async (userId) => {
    if (USE_MOCK_DATA) {
      return await mockProjectApi.getUserProjects(userId);
    }
    try {
      const response = await api.get(`/api/projects/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user projects:', error);
      throw error;
    }
  },

  // Get single project by ID
  getProject: async (id) => {
    if (USE_MOCK_DATA) {
      return await mockProjectApi.getProject(id);
    }
    try {
      const response = await api.get(`/api/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  },

  // Create new project
  createProject: async (projectData) => {
    if (USE_MOCK_DATA) {
      return await mockProjectApi.createProject(projectData);
    }
    try {
      const response = await api.post('/api/projects', projectData);
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Update existing project
  updateProject: async (id, projectData) => {
    if (USE_MOCK_DATA) {
      return await mockProjectApi.updateProject(id, projectData);
    }
    try {
      const response = await api.put(`/api/projects/${id}`, projectData);
      return response.data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  // Delete project
  deleteProject: async (id) => {
    if (USE_MOCK_DATA) {
      return await mockProjectApi.deleteProject(id);
    }
    try {
      const response = await api.delete(`/api/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  // Get project statistics
  getProjectStats: async () => {
    if (USE_MOCK_DATA) {
      return await mockProjectApi.getProjectStats();
    }
    try {
      const response = await api.get('/api/projects/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching project stats:', error);
      throw error;
    }
  },

  // Get user's projects
  getUserProjects: async (userId) => {
    try {
      const response = await api.get(`/api/projects/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user projects:', error);
      throw error;
    }
  },

  // Update project status
  updateProjectStatus: async (id, status) => {
    if (USE_MOCK_DATA) {
      return await mockProjectApi.updateProjectStatus(id, status);
    }
    try {
      const response = await api.patch(`/api/projects/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    }
  },

  // Add team member to project
  addTeamMember: async (projectId, userId) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/team`, { userId });
      return response.data;
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  },

  // Remove team member from project
  removeTeamMember: async (projectId, userId) => {
    try {
      const response = await api.delete(`/api/projects/${projectId}/team/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  },

  // Upload project file
  uploadProjectFile: async (projectId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`/api/projects/${projectId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // Get project files
  getProjectFiles: async (projectId) => {
    try {
      const response = await api.get(`/api/projects/${projectId}/files`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project files:', error);
      throw error;
    }
  }
};

// Dashboard API endpoints
export const dashboardApi = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    if (USE_MOCK_DATA) {
      return await mockDashboardApi.getDashboardStats();
    }
    try {
      const response = await api.get('/api/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get recent activities
  getRecentActivities: async (limit = 10) => {
    if (USE_MOCK_DATA) {
      return await mockDashboardApi.getRecentActivities(limit);
    }
    try {
      const response = await api.get(`/api/dashboard/activities?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  },

  // Get project progress data
  getProjectProgress: async () => {
    if (USE_MOCK_DATA) {
      return await mockDashboardApi.getProjectProgress();
    }
    try {
      const response = await api.get('/api/dashboard/project-progress');
      return response.data;
    } catch (error) {
      console.error('Error fetching project progress:', error);
      throw error;
    }
  },

  // Get project distribution
  getProjectDistribution: async () => {
    if (USE_MOCK_DATA) {
      return await mockDashboardApi.getProjectDistribution();
    }
    try {
      const response = await api.get('/api/dashboard/distribution');
      return response.data;
    } catch (error) {
      console.error('Error fetching project distribution:', error);
      throw error;
    }
  },

  // Get project trends
  getProjectTrends: async (months = 6) => {
    if (USE_MOCK_DATA) {
      return await mockDashboardApi.getProjectTrends(months);
    }
    try {
      const response = await api.get(`/api/dashboard/trends?months=${months}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project trends:', error);
      throw error;
    }
  },

  // Get comprehensive planner dashboard data
  getPlannerDashboardData: async () => {
    if (USE_MOCK_DATA) {
      return await mockDashboardApi.getPlannerDashboardData();
    }
    try {
      // Fetch all dashboard data in parallel
      const [statsResponse, activitiesResponse, progressResponse, distributionResponse] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/activities?limit=5'),
        api.get('/api/dashboard/project-progress'),
        api.get('/api/dashboard/distribution')
      ]);

      // Transform and combine data for dashboard
      const stats = statsResponse.data;
      const activities = activitiesResponse.data;
      const progressData = progressResponse.data;
      const distribution = distributionResponse.data;

      // Get upcoming deadlines from progress data
      const upcomingDeadlines = progressData
        .filter(p => p.dueDate && new Date(p.dueDate) > new Date() && p.status !== 'Completed')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 3)
        .map(p => ({
          id: p.id,
          title: p.title,
          dueDate: p.dueDate,
          status: p.status,
          isOverdue: p.isOverdue
        }));

      return {
        stats,
        recentActivities: activities,
        projectProgress: progressData,
        distribution,
        projects: stats.recentProjects || [],
        upcomingDeadlines,
        terrainAnalyses: [], // Placeholder for terrain data
        zoningResults: []    // Placeholder for zoning data
      };
    } catch (error) {
      console.error('Error fetching planner dashboard data:', error);
      throw error;
    }
  }
};

export default { projectApi, dashboardApi };
