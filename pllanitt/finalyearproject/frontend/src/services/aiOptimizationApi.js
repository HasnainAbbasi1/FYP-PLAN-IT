import { authHelper } from '../utils/authHelper';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

class AIOptimizationApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        return authHelper.getAuthHeaders();
    }

    /**
     * Run AI optimization analysis
     */
    async runOptimization(data) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            
            const response = await fetch(`${this.baseURL}/ai_optimization`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...data,
                    userId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to run AI optimization');
            }

            return await response.json();
        } catch (error) {
            console.error('Error running AI optimization:', error);
            throw error;
        }
    }

    /**
     * Get optimization history for a project
     */
    async getOptimizationHistory(projectId) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            
            const response = await fetch(`${this.baseURL}/ai_optimization/history/${projectId}?userId=${userId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get optimization history');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting optimization history:', error);
            throw error;
        }
    }

    /**
     * Save optimization results
     */
    async saveOptimizationResults(projectId, results) {
        try {
            const user = authHelper.getCurrentUser();
            const userId = user?.id;
            
            const response = await fetch(`${this.baseURL}/ai_optimization/save`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectId,
                    userId,
                    results
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save optimization results');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving optimization results:', error);
            throw error;
        }
    }
}

const aiOptimizationApiService = new AIOptimizationApiService();
export default aiOptimizationApiService;

