import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ========== ROADS API ==========
export const roadsApi = {
  getProjectRoads: async (projectId) => {
    const response = await api.get(`/api/design/roads/project/${projectId}`);
    return response.data;
  },

  getRoad: async (id) => {
    const response = await api.get(`/api/design/roads/${id}`);
    return response.data;
  },

  createRoad: async (roadData) => {
    const response = await api.post('/api/design/roads', roadData);
    return response.data;
  },

  updateRoad: async (id, roadData) => {
    const response = await api.put(`/api/design/roads/${id}`, roadData);
    return response.data;
  },

  deleteRoad: async (id) => {
    const response = await api.delete(`/api/design/roads/${id}`);
    return response.data;
  }
};

// ========== INFRASTRUCTURE API ==========
export const infrastructureApi = {
  getProjectInfrastructure: async (projectId) => {
    const response = await api.get(`/api/design/infrastructure/project/${projectId}`);
    return response.data;
  },

  getInfrastructure: async (id) => {
    const response = await api.get(`/api/design/infrastructure/${id}`);
    return response.data;
  },

  createInfrastructure: async (infrastructureData) => {
    const response = await api.post('/api/design/infrastructure', infrastructureData);
    return response.data;
  },

  updateInfrastructure: async (id, infrastructureData) => {
    const response = await api.put(`/api/design/infrastructure/${id}`, infrastructureData);
    return response.data;
  },

  deleteInfrastructure: async (id) => {
    const response = await api.delete(`/api/design/infrastructure/${id}`);
    return response.data;
  }
};

// ========== GREEN SPACES API ==========
export const greenSpacesApi = {
  getProjectGreenSpaces: async (projectId) => {
    const response = await api.get(`/api/design/greenspaces/project/${projectId}`);
    return response.data;
  },

  getGreenSpace: async (id) => {
    const response = await api.get(`/api/design/greenspaces/${id}`);
    return response.data;
  },

  createGreenSpace: async (greenSpaceData) => {
    const response = await api.post('/api/design/greenspaces', greenSpaceData);
    return response.data;
  },

  updateGreenSpace: async (id, greenSpaceData) => {
    const response = await api.put(`/api/design/greenspaces/${id}`, greenSpaceData);
    return response.data;
  },

  deleteGreenSpace: async (id) => {
    const response = await api.delete(`/api/design/greenspaces/${id}`);
    return response.data;
  }
};

// ========== PARCELS API ==========
export const parcelsApi = {
  getProjectParcels: async (projectId) => {
    const response = await api.get(`/api/design/parcels/project/${projectId}`);
    return response.data;
  },

  getParcel: async (id) => {
    const response = await api.get(`/api/design/parcels/${id}`);
    return response.data;
  },

  createParcel: async (parcelData) => {
    const response = await api.post('/api/design/parcels', parcelData);
    return response.data;
  },

  updateParcel: async (id, parcelData) => {
    const response = await api.put(`/api/design/parcels/${id}`, parcelData);
    return response.data;
  },

  deleteParcel: async (id) => {
    const response = await api.delete(`/api/design/parcels/${id}`);
    return response.data;
  }
};

// ========== ZONING API ==========
const PYTHON_API_URL = 'http://localhost:5002';

export const zoningApi = {
  // Get polygons for a project
  getProjectPolygons: async (projectId) => {
    const response = await api.get(`/api/polygon?project_id=${projectId}`);
    return response.data;
  },

  // Get zoning result for a polygon (from Node.js backend database)
  getZoningResult: async (polygonId) => {
    try {
      const response = await api.get(`/api/zoning/${polygonId}`);
      if (response.data && response.data.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching zoning result from database:', error);
      // Fallback to Python backend if Node.js fails
      try {
        const fallbackResponse = await fetch(`${PYTHON_API_URL}/api/zoning_results/${polygonId}`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          if (data.success && data.result) {
            return data;
          }
        }
      } catch (fallbackError) {
        console.error('Fallback to Python backend also failed:', fallbackError);
      }
      return null;
    }
  },

  // Get green space statistics from 2D visualization (from Node.js backend database)
  getGreenSpaceStatistics: async (polygonId) => {
    try {
      const response = await api.get(`/api/zoning/${polygonId}/green-space-stats`);
      if (response.data && response.data.success) {
        return response.data.green_space_statistics;
      }
      return null;
    } catch (error) {
      console.error('Error fetching green space statistics from database:', error);
      // Fallback to Python backend
      try {
        const fallbackResponse = await fetch(`${PYTHON_API_URL}/api/zoning/${polygonId}/green_space_statistics`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          if (data.success && data.green_space_statistics) {
            return data.green_space_statistics;
          }
        }
      } catch (fallbackError) {
        console.error('Fallback to Python backend also failed:', fallbackError);
      }
      return null;
    }
  },

  // Get zoning image URL from polygon (from Node.js backend database)
  getZoningImage: async (polygonId) => {
    if (!polygonId) return null;
    
    try {
      // Method 1: Try Node.js backend database (primary)
      const response = await api.get(`/api/zoning/${polygonId}/image`);
      if (response.data && response.data.success && response.data.image_url) {
        const url = response.data.image_url;
        // If it's a relative URL, prepend Python API URL (images are served from Python backend)
        if (url.startsWith('http')) {
          return url;
        }
        return `${PYTHON_API_URL}${url.startsWith('/') ? url : `/${url}`}`;
      }
    } catch (error) {
      console.log('Node.js backend image fetch failed, trying fallback methods');
    }
    
    try {
      // Method 2: Try to get from polygon images endpoint
      const response = await fetch(`${PYTHON_API_URL}/api/list_polygon_images/${polygonId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.urls && data.urls.length > 0) {
          const url = data.urls[0];
          return url.startsWith('http') ? url : `${PYTHON_API_URL}${url}`;
        }
        if (data.files && data.files.length > 0) {
          const url = `/output/${data.files[0]}`;
          return url.startsWith('http') ? url : `${PYTHON_API_URL}${url}`;
        }
      }
    } catch (error) {
      // Continue to next method
    }
    
    try {
      // Method 3: Try Node.js backend polygon images
      const nodeResponse = await api.get(`/api/polygon-images/${polygonId}`);
      if (nodeResponse.data?.images && nodeResponse.data.images.length > 0) {
        const url = nodeResponse.data.images[0].url || nodeResponse.data.images[0];
        return url.startsWith('http') ? url : `${PYTHON_API_URL}${url}`;
      }
    } catch (error) {
      // Continue
    }
    
    return null;
  },

  // Generate buildings/infrastructure/green spaces from zoning
  generateFromZoning: async (zoningResult, projectId, options = {}, polygonGeometry = null, polygonId = null) => {
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/zoning/generate_buildings_infrastructure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoning_result: zoningResult,
          polygon_geometry: polygonGeometry,
          polygon_id: polygonId,
          project_id: projectId,
          options: {
            generate_buildings: options.generate_buildings !== false,
            generate_infrastructure: options.generate_infrastructure !== false,
            identify_green_spaces: options.identify_green_spaces !== false,
            auto_create: options.auto_create || false
          }
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate from zoning' }));
        throw new Error(errorData.error || 'Failed to generate from zoning');
      }
      return response.json();
    } catch (error) {
      console.error('Error generating from zoning:', error);
      throw error;
    }
  },
  
  // Get zoning data from intelligent zoning (alternative method)
  getZoningDataFromIntelligentZoning: async (polygonId, geojson) => {
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/intelligent_zoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          polygon_id: polygonId,
          geojson: geojson
        })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.zoning_result || data?.analysis?.zoning_result || null;
    } catch (error) {
      console.error('Error getting zoning data from intelligent zoning:', error);
      return null;
    }
  },

  // Process comprehensive zoning
  processComprehensive: async (zoningResult, projectId) => {
    const response = await fetch(`${PYTHON_API_URL}/api/zoning/process_comprehensive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zoning_result: zoningResult,
        project_id: projectId
      })
    });
    if (!response.ok) throw new Error('Failed to process zoning');
    return response.json();
  }
};

export default {
  roadsApi,
  infrastructureApi,
  greenSpacesApi,
  parcelsApi,
  zoningApi
};

