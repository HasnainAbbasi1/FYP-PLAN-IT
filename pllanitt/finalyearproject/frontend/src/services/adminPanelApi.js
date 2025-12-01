import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const adminPanelApi = {
  // System Health
  getSystemHealth: async () => {
    const response = await axios.get(`${API_BASE_URL}/admin-panel/system-health`);
    return response.data;
  },

  // Database Status
  getDatabaseStatus: async () => {
    const response = await axios.get(`${API_BASE_URL}/admin-panel/database-status`);
    return response.data;
  },

  // User Analytics
  getUserAnalytics: async () => {
    const response = await axios.get(`${API_BASE_URL}/admin-panel/user-analytics`);
    return response.data;
  },

  // Activity Log
  getActivityLog: async () => {
    const response = await axios.get(`${API_BASE_URL}/admin-panel/activity-log`);
    return response.data;
  },

  // Server Status
  getServerStatus: async () => {
    const response = await axios.get(`${API_BASE_URL}/admin-panel/server-status`);
    return response.data;
  },

  // Performance Metrics
  getPerformanceMetrics: async () => {
    const response = await axios.get(`${API_BASE_URL}/admin-panel/performance-metrics`);
    return response.data;
  },

  // Admin Analytics
  getAdminAnalytics: async () => {
    const response = await axios.get(`${API_BASE_URL}/admin-panel/admin-analytics`);
    return response.data;
  },

  // Invite User
  inviteUser: async (email, role, message) => {
    const response = await axios.post(`${API_BASE_URL}/admin-panel/invite-user`, {
      email,
      role,
      message
    });
    return response.data;
  },

  // Export Data
  exportData: async (tables, format) => {
    const response = await axios.post(`${API_BASE_URL}/admin-panel/export-data`, {
      tables,
      format
    });
    return response.data;
  }
};

export default adminPanelApi;

