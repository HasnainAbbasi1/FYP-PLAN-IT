const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Report routes
router.get('/', reportController.getAllReports);                           // GET /api/reports
router.post('/generate/:projectId', reportController.generateReport);      // POST /api/reports/generate/:projectId
router.get('/download/:projectId', reportController.downloadReport);       // GET /api/reports/download/:projectId
router.post('/pdf/generate', reportController.generatePDFReport);          // POST /api/reports/pdf/generate
router.get('/pdf/list', reportController.listPDFReports);                  // GET /api/reports/pdf/list
router.delete('/pdf/:filename', reportController.deletePDFReport);         // DELETE /api/reports/pdf/:filename
router.post('/export/:projectId', reportController.exportReport);          // POST /api/reports/export/:projectId
router.get('/templates', reportController.getReportTemplates);             // GET /api/reports/templates

module.exports = router;

