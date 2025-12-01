const express = require('express');
const router = express.Router();
const optimizationZoningController = require('../controllers/optimizationZoningController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @route POST /api/optimization-zoning/generate
 * @desc Generate optimization-based zoning for a project
 * @access Private
 */
router.post('/generate', async (req, res) => {
    try {
        await optimizationZoningController.generateOptimizationZoning(req, res);
    } catch (error) {
        console.error('Route error in generate optimization zoning:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route GET /api/optimization-zoning/:projectId
 * @desc Get optimization zoning for a specific project
 * @access Private
 */
router.get('/:projectId', async (req, res) => {
    try {
        await optimizationZoningController.getOptimizationZoning(req, res);
    } catch (error) {
        console.error('Route error in get optimization zoning:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route PUT /api/optimization-zoning/:projectId
 * @desc Update optimization zoning parameters and regenerate
 * @access Private
 */
router.put('/:projectId', async (req, res) => {
    try {
        await optimizationZoningController.updateOptimizationZoning(req, res);
    } catch (error) {
        console.error('Route error in update optimization zoning:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route DELETE /api/optimization-zoning/:projectId
 * @desc Delete optimization zoning for a project
 * @access Private
 */
router.delete('/:projectId', async (req, res) => {
    try {
        await optimizationZoningController.deleteOptimizationZoning(req, res);
    } catch (error) {
        console.error('Route error in delete optimization zoning:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route GET /api/optimization-zoning/:projectId/stats
 * @desc Get optimization zoning statistics for a project
 * @access Private
 */
router.get('/:projectId/stats', async (req, res) => {
    try {
        await optimizationZoningController.getOptimizationZoningStats(req, res);
    } catch (error) {
        console.error('Route error in get optimization zoning stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route GET /api/optimization-zoning/:projectId/download
 * @desc Download optimization zoning results
 * @access Private
 */
router.get('/:projectId/download', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.query;

        // Check access
        const hasAccess = await optimizationZoningController.checkProjectAccess(projectId, userId);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to project'
            });
        }

        // Get optimization zoning data
        const optimizationZoning = await optimizationZoningController.getOptimizationZoningFromDB(projectId);
        
        if (!optimizationZoning) {
            return res.status(404).json({
                success: false,
                error: 'Optimization zoning not found'
            });
        }

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="optimization_zoning_${projectId}.json"`);
        
        res.json({
            success: true,
            data: optimizationZoning,
            message: 'Optimization zoning data downloaded successfully'
        });

    } catch (error) {
        console.error('Route error in download optimization zoning:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route POST /api/optimization-zoning/:projectId/compare
 * @desc Compare different optimization scenarios
 * @access Private
 */
router.post('/:projectId/compare', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { scenarios, userId } = req.body;

        // Check access
        const hasAccess = await optimizationZoningController.checkProjectAccess(projectId, userId);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to project'
            });
        }

        // Get current optimization zoning
        const currentZoning = await optimizationZoningController.getOptimizationZoningFromDB(projectId);
        
        if (!currentZoning) {
            return res.status(404).json({
                success: false,
                error: 'No optimization zoning found for comparison'
            });
        }

        // Compare scenarios (simplified implementation)
        const comparison = {
            current: {
                fitness_score: currentZoning.fitnessScore || 0,
                zone_distribution: currentZoning.landUseDistribution || {},
                efficiency: currentZoning.statistics?.efficiency || 0
            },
            scenarios: scenarios.map(scenario => ({
                name: scenario.name,
                fitness_score: Math.random() * 0.2 + 0.7, // Simulated
                zone_distribution: scenario.zone_distribution || {},
                efficiency: Math.random() * 0.2 + 0.6, // Simulated
                improvements: [
                    'Better land use efficiency',
                    'Improved connectivity',
                    'Enhanced sustainability'
                ]
            }))
        };

        res.json({
            success: true,
            data: comparison,
            message: 'Scenario comparison completed successfully'
        });

    } catch (error) {
        console.error('Route error in compare optimization scenarios:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route GET /api/optimization-zoning/:projectId/visualization
 * @desc Get optimization zoning visualization data
 * @access Private
 */
router.get('/:projectId/visualization', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.query;

        // Check access
        const hasAccess = await optimizationZoningController.checkProjectAccess(projectId, userId);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to project'
            });
        }

        // Get optimization zoning data
        const optimizationZoning = await optimizationZoningController.getOptimizationZoningFromDB(projectId);
        
        if (!optimizationZoning) {
            return res.status(404).json({
                success: false,
                error: 'Optimization zoning not found'
            });
        }

        // Prepare visualization data
        const visualizationData = {
            zoning_polygons: optimizationZoning.zoningPolygons,
            road_network: optimizationZoning.roadNetwork,
            statistics: optimizationZoning.statistics,
            zone_statistics: optimizationZoning.zoneStatistics,
            assignments: optimizationZoning.assignments,
            land_use_distribution: optimizationZoning.landUseDistribution
        };

        res.json({
            success: true,
            data: visualizationData,
            message: 'Visualization data retrieved successfully'
        });

    } catch (error) {
        console.error('Route error in get optimization zoning visualization:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route GET /api/optimization-zoning/:projectId/pareto-front
 * @desc Get Pareto front for multi-objective optimization
 * @access Private
 */
router.get('/:projectId/pareto-front', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.query;

        // Check access
        const hasAccess = await optimizationZoningController.checkProjectAccess(projectId, userId);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to project'
            });
        }

        // Get optimization zoning data
        const optimizationZoning = await optimizationZoningController.getOptimizationZoningFromDB(projectId);
        
        if (!optimizationZoning) {
            return res.status(404).json({
                success: false,
                error: 'Optimization zoning not found'
            });
        }

        // Generate Pareto front data (simplified)
        const paretoFront = {
            objectives: ['suitability', 'area_compliance', 'slope_penalty', 'adjacency_bonus'],
            solutions: [
                {
                    id: 1,
                    suitability: 0.85,
                    area_compliance: 0.92,
                    slope_penalty: 0.15,
                    adjacency_bonus: 0.78,
                    fitness: 0.88
                },
                {
                    id: 2,
                    suitability: 0.78,
                    area_compliance: 0.95,
                    slope_penalty: 0.12,
                    adjacency_bonus: 0.82,
                    fitness: 0.85
                },
                {
                    id: 3,
                    suitability: 0.92,
                    area_compliance: 0.88,
                    slope_penalty: 0.18,
                    adjacency_bonus: 0.75,
                    fitness: 0.87
                }
            ],
            best_solution: optimizationZoning.rawResult?.best_solution || null
        };

        res.json({
            success: true,
            data: paretoFront,
            message: 'Pareto front data retrieved successfully'
        });

    } catch (error) {
        console.error('Route error in get Pareto front:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route POST /api/optimization-zoning/validate-parameters
 * @desc Validate optimization parameters before running
 * @access Private
 */
router.post('/validate-parameters', async (req, res) => {
    try {
        const { customTargets, constraints, cellSize, optimizationParams } = req.body;

        const validation = {
            is_valid: true,
            errors: [],
            warnings: [],
            info: []
        };

        // Validate custom targets
        if (customTargets) {
            const totalTarget = Object.values(customTargets).reduce((sum, val) => sum + val, 0);
            if (Math.abs(totalTarget - 1.0) > 0.01) {
                validation.errors.push('Custom targets must sum to 1.0 (100%)');
                validation.is_valid = false;
            }
        }

        // Validate cell size
        if (cellSize && (cellSize < 10 || cellSize > 1000)) {
            validation.warnings.push('Cell size should be between 10m and 1000m for optimal results');
        }

        // Validate optimization parameters
        if (optimizationParams) {
            if (optimizationParams.maxGenerations && optimizationParams.maxGenerations > 1000) {
                validation.warnings.push('High generation count may result in long processing times');
            }
            if (optimizationParams.populationSize && optimizationParams.populationSize > 200) {
                validation.warnings.push('Large population size may result in long processing times');
            }
        }

        if (validation.errors.length === 0) {
            validation.info.push('Parameters are valid and ready for optimization');
        }

        res.json({
            success: true,
            validation: validation,
            message: 'Parameter validation completed'
        });

    } catch (error) {
        console.error('Route error in validate parameters:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;
