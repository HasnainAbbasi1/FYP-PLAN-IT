import { authHelper } from '../utils/authHelper';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class PolygonApiService {
    constructor() {
        this.baseURL = `${API_BASE_URL}/polygon`;
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        return authHelper.getAuthHeaders();
    }

    /**
     * Get all polygons, optionally filtered by project_id
     */
    async getPolygons(projectId = null) {
        try {
            let url = this.baseURL;
            if (projectId) {
                url += `?project_id=${projectId}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Polygons API response:', data);
            
            // Handle different response formats
            const polygonsArray = Array.isArray(data) ? data : (data.polygons || data.data || []);
            return polygonsArray;
        } catch (error) {
            console.error('Error fetching polygons:', error);
            throw error;
        }
    }

    /**
     * Get all polygons for a project with unassigned status
     * @deprecated Use getPolygons(projectId) instead
     */
    async getPolygonsWithUnassigned(projectId) {
        return this.getPolygons(projectId);
    }

    /**
     * Get a specific polygon by ID
     */
    async getPolygon(polygonId) {
        try {
            const response = await fetch(`${this.baseURL}/${polygonId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error('Error fetching polygon:', error);
            throw error;
        }
    }

    /**
     * Create a new polygon
     */
    async createPolygon(polygonData) {
        try {
            const response = await fetch(`${this.baseURL}`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(polygonData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error('Error creating polygon:', error);
            throw error;
        }
    }

    /**
     * Update a polygon
     */
    async updatePolygon(polygonId, polygonData) {
        try {
            const response = await fetch(`${this.baseURL}/${polygonId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(polygonData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error('Error updating polygon:', error);
            throw error;
        }
    }

    /**
     * Delete a polygon
     */
    async deletePolygon(polygonId) {
        try {
            const response = await fetch(`${this.baseURL}/${polygonId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting polygon:', error);
            throw error;
        }
    }

    /**
     * Fetch DEM data for a specific polygon
     */
    async fetchDEMData(polygonId) {
        try {
            const response = await fetch(`${API_BASE_URL}/polygon/${polygonId}/fetch-dem`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching DEM data:', error);
            throw error;
        }
    }

    /**
     * Fetch DEM data for all polygons
     */
    async fetchDEMForAllPolygons() {
        try {
            const response = await fetch(`${API_BASE_URL}/polygon/fetch-dem-all`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching DEM data for all polygons:', error);
            throw error;
        }
    }
}

const polygonApi = new PolygonApiService();
export default polygonApi;
