const express = require('express');
const router = express.Router();
const ZoningResult = require('../models/ZoningResult');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware
router.use(verifyToken);

/**
 * GET /api/zoning/:polygon_id
 * Get zoning result for a specific polygon
 */
router.get('/:polygon_id', async (req, res) => {
  try {
    const { polygon_id } = req.params;
    const userId = req.user.id;

    if (!polygon_id) {
      return res.status(400).json({
        success: false,
        error: 'Polygon ID is required'
      });
    }

    // Find the latest zoning result for this polygon
    const zoningResult = await ZoningResult.findOne({
      where: {
        polygon_id: parseInt(polygon_id),
        user_id: userId
      },
      order: [['created_at', 'DESC']]
    });

    if (!zoningResult) {
      return res.status(404).json({
        success: false,
        error: 'No zoning result found for this polygon'
      });
    }

    // Extract data - prefer separate fields, fallback to JSON
    const marlaSummary = zoningResult.marla_summary || 
      (zoningResult.zoning_result?.analysis?.zoning_data?.marla_summary) ||
      (zoningResult.zoning_result?.analysis?.marla_summary);

    const imageUrl = zoningResult.image_url ||
      (zoningResult.zoning_result?.analysis?.visualization?.image_url);

    const greenSpaceStatistics = zoningResult.green_space_statistics ||
      (zoningResult.zoning_result?.analysis?.visualization?.green_space_statistics);

    const terrainSummary = zoningResult.terrain_summary ||
      (zoningResult.zoning_result?.analysis?.terrain_summary);

    // Return structured response
    res.json({
      success: true,
      result: {
        polygon_id: parseInt(polygon_id),
        zoning_result: {
          analysis: {
            visualization: {
              image_url: imageUrl,
              green_space_statistics: greenSpaceStatistics
            },
            terrain_summary: terrainSummary,
            zoning_data: {
              marla_summary: marlaSummary
            }
          }
        },
        marla_summary: marlaSummary,
        image_url: imageUrl,
        green_space_statistics: greenSpaceStatistics,
        terrain_summary: terrainSummary,
        created_at: zoningResult.created_at,
        updated_at: zoningResult.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching zoning result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch zoning result',
      message: error.message
    });
  }
});

/**
 * GET /api/zoning/:polygon_id/green-space-stats
 * Get green space statistics for a polygon
 */
router.get('/:polygon_id/green-space-stats', async (req, res) => {
  try {
    const { polygon_id } = req.params;
    const userId = req.user.id;

    const zoningResult = await ZoningResult.findOne({
      where: {
        polygon_id: parseInt(polygon_id),
        user_id: userId
      },
      order: [['created_at', 'DESC']]
    });

    if (!zoningResult) {
      return res.status(404).json({
        success: false,
        error: 'No zoning result found'
      });
    }

    const greenSpaceStats = zoningResult.green_space_statistics ||
      (zoningResult.zoning_result?.analysis?.visualization?.green_space_statistics);

    const marlaSummary = zoningResult.marla_summary ||
      (zoningResult.zoning_result?.analysis?.zoning_data?.marla_summary);

    res.json({
      success: true,
      green_space_statistics: greenSpaceStats,
      marla_summary: marlaSummary
    });
  } catch (error) {
    console.error('Error fetching green space stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch green space statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/zoning/:polygon_id/image
 * Get zoning visualization image URL
 */
router.get('/:polygon_id/image', async (req, res) => {
  try {
    const { polygon_id } = req.params;
    const userId = req.user.id;

    const zoningResult = await ZoningResult.findOne({
      where: {
        polygon_id: parseInt(polygon_id),
        user_id: userId
      },
      order: [['created_at', 'DESC']],
      attributes: ['image_url', 'zoning_result']
    });

    if (!zoningResult) {
      return res.status(404).json({
        success: false,
        error: 'No zoning result found'
      });
    }

    const imageUrl = zoningResult.image_url ||
      (zoningResult.zoning_result?.analysis?.visualization?.image_url);

    if (!imageUrl) {
      return res.status(404).json({
        success: false,
        error: 'No image URL found for this polygon'
      });
    }

    res.json({
      success: true,
      image_url: imageUrl
    });
  } catch (error) {
    console.error('Error fetching zoning image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch zoning image',
      message: error.message
    });
  }
});

module.exports = router;








