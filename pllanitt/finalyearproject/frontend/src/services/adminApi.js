import { authHelper } from '../utils/authHelper';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class AdminApiService {
    constructor() {
        this.baseURL = `${API_BASE_URL}/admin`;
    }

    getAuthHeaders() {
        return authHelper.getAuthHeaders();
    }

    // User Management
    async getAllUsers(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.search) queryParams.append('search', params.search);
            if (params.role) queryParams.append('role', params.role);
            if (params.status) queryParams.append('status', params.status);

            const url = `${this.baseURL}/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            
            const response = await fetch(url, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const response = await fetch(`${this.baseURL}/users/${userId}`, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const response = await fetch(`${this.baseURL}/users/${userId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    async createUser(payload) {
        try {
            const response = await fetch(`${this.baseURL}/users`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            let data = null;
            try {
                data = await response.json();
            } catch (e) {
                // response body not JSON
            }

            if (!response.ok) {
                const errorMessage =
                    (data && (data.error || data.message)) ||
                    `Request failed with status ${response.status}`;

                console.error('Create user failed:', {
                    status: response.status,
                    body: data,
                });

                return {
                    success: false,
                    error: errorMessage,
                    status: response.status,
                    details: data && data.details ? data.details : undefined,
                };
            }

            return data;
        } catch (error) {
            console.error('Error creating user:', error);
            return {
                success: false,
                error: error.message || 'Network error while creating user',
            };
        }
    }

    async updateUser(userId, payload) {
        try {
            const response = await fetch(`${this.baseURL}/users/${userId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Project Management
    async getAllProjects(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.search) queryParams.append('search', params.search);
            if (params.userId) queryParams.append('userId', params.userId);
            if (params.status) queryParams.append('status', params.status);

            const url = `${this.baseURL}/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            
            const response = await fetch(url, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching all projects:', error);
            throw error;
        }
    }

    async getProjectById(projectId) {
        try {
            const response = await fetch(`${this.baseURL}/projects/${projectId}`, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching project by ID:', error);
            throw error;
        }
    }

    async deleteProject(projectId) {
        try {
            const response = await fetch(`${this.baseURL}/projects/${projectId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    // Get projects for a specific user
    async getUserProjects(userId) {
        try {
            const response = await fetch(`${this.baseURL}/users/${userId}/projects`, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user projects:', error);
            throw error;
        }
    }

    // Statistics and Analytics
    async getAdminStats() {
        try {
            const response = await fetch(`${this.baseURL}/stats`, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            throw error;
        }
    }

    async getUserAnalytics() {
        try {
            const response = await fetch(`${this.baseURL}/users/analytics`, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user analytics:', error);
            throw error;
        }
    }
}

const adminApiService = new AdminApiService();
export default adminApiService;