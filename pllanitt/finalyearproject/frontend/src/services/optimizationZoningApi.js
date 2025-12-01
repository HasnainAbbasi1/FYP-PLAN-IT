import { authHelper } from '../utils/authHelper';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class OptimizationZoningApiService {
    constructor() {
        this.baseURL = `${API_BASE_URL}/optimization-zoning`;
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        return authHelper.getAuthHeaders();
    }

    /**
     * Generate optimization-based zoning for a project
     */
    async generateOptimizationZoning(data) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            
            // Prepare the request body with all required fields
            const requestBody = {
                ...data,
                userId: userId || data.userId
            };
            
            // Log the request for debugging
            console.log('📤 Sending optimization request:', {
                url: `${this.baseURL}/generate`,
                hasProjectId: !!requestBody.projectId,
                hasDemFile: !!requestBody.demFile,
                hasPolygonBoundary: !!requestBody.polygonBoundary,
                hasUserId: !!requestBody.userId
            });
            
            const response = await fetch(`${this.baseURL}/generate`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    throw new Error(`Server error (${response.status}): ${errorText}`);
                }
                
                // Include details if available
                const errorMessage = errorData.error || errorData.message || 'Failed to generate optimization zoning';
                const errorDetails = errorData.details ? `\nDetails: ${errorData.details}` : '';
                throw new Error(`${errorMessage}${errorDetails}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error generating optimization zoning:', error);
            throw error;
        }
    }

    /**
     * Get optimization zoning for a project
     */
    async getOptimizationZoning(projectId) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            const response = await fetch(`${this.baseURL}/${projectId}?userId=${userId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get optimization zoning');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting optimization zoning:', error);
            throw error;
        }
    }

    /**
     * Update optimization zoning parameters
     */
    async updateOptimizationZoning(projectId, data) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            const response = await fetch(`${this.baseURL}/${projectId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    ...data,
                    userId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update optimization zoning');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating optimization zoning:', error);
            throw error;
        }
    }

    /**
     * Delete optimization zoning
     */
    async deleteOptimizationZoning(projectId) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            const response = await fetch(`${this.baseURL}/${projectId}?userId=${userId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete optimization zoning');
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting optimization zoning:', error);
            throw error;
        }
    }

    /**
     * Get optimization zoning statistics
     */
    async getOptimizationZoningStats(projectId) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            const response = await fetch(`${this.baseURL}/${projectId}/stats?userId=${userId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get optimization zoning stats');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting optimization zoning stats:', error);
            throw error;
        }
    }

    /**
     * Download optimization zoning results
     */
    async downloadOptimizationZoning(projectId) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            const response = await fetch(`${this.baseURL}/${projectId}/download?userId=${userId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to download optimization zoning');
            }

            return await response.json();
        } catch (error) {
            console.error('Error downloading optimization zoning:', error);
            throw error;
        }
    }

    /**
     * Compare optimization scenarios
     */
    async compareScenarios(projectId, scenarios) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            const response = await fetch(`${this.baseURL}/${projectId}/compare`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    scenarios,
                    userId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to compare scenarios');
            }

            return await response.json();
        } catch (error) {
            console.error('Error comparing scenarios:', error);
            throw error;
        }
    }

    /**
     * Get optimization zoning visualization data
     */
    async getOptimizationZoningVisualization(projectId) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            const response = await fetch(`${this.baseURL}/${projectId}/visualization?userId=${userId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get visualization data');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting optimization zoning visualization:', error);
            throw error;
        }
    }

    /**
     * Get Pareto front for multi-objective optimization
     */
    async getParetoFront(projectId) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            const response = await fetch(`${this.baseURL}/${projectId}/pareto-front?userId=${userId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get Pareto front');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting Pareto front:', error);
            throw error;
        }
    }

    /**
     * Validate optimization parameters
     */
    async validateParameters(parameters) {
        try {
            const response = await fetch(`${this.baseURL}/validate-parameters`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(parameters)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to validate parameters');
            }

            return await response.json();
        } catch (error) {
            console.error('Error validating parameters:', error);
            throw error;
        }
    }
}

const optimizationZoningApiService = new OptimizationZoningApiService();
export default optimizationZoningApiService;
