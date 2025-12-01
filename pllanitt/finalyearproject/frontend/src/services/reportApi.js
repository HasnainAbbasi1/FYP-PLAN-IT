// Report API Service
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Report API endpoints
export const reportApi = {
  // Get all reports for user's ongoing projects
  getAllReports: async () => {
    try {
      const response = await api.get('/api/reports');
      return response.data;
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  // Generate report for a specific project
  generateReport: async (projectId, options = {}) => {
    try {
      const { reportType = 'full', format = 'json', components = {} } = options;
      const response = await api.post(`/api/reports/generate/${projectId}`, {
        reportType,
        format,
        components
      });
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  // Download report
  downloadReport: async (projectId, format = 'json') => {
    try {
      const response = await api.get(`/api/reports/download/${projectId}`, {
        params: { format },
        responseType: format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },

  // Helper function to download report as file
  downloadReportAsFile: async (projectId, format = 'json', projectTitle = 'report', reportType = null) => {
    try {
      const params = { format };
      if (reportType) {
        params.reportType = reportType;
      }
      
      const response = await api.get(`/api/reports/download/${projectId}`, {
        params: params,
        responseType: 'json'
      });
      
      const reportData = response.data.report || response.data;

      if (format === 'pdf') {
        // Use PDF generator for PDF format
        const { generatePDFReport } = await import('@/utils/pdfReportGenerator');
        await generatePDFReport(reportData, null);
        return { success: true, filename: `${projectTitle.replace(/[^a-z0-9]/gi, '_')}_report.pdf` };
      } else {
        // Create blob and download for JSON
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const reportTypeSuffix = reportType ? `_${reportType}` : '';
        const filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}${reportTypeSuffix}_report_${Date.now()}.json`;
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true, filename };
      }
    } catch (error) {
      console.error('Error downloading report file:', error);
      throw error;
    }
  },

  // Generate PDF report using the new backend endpoint
  generatePDFReport: async (options = {}) => {
    try {
      const PYTHON_API_URL = 'http://localhost:5002';
      const {
        dem_path = 'data/dem_download.tif',
        analysis_data = null,
        analysis_data_path = null,
        polygon_id = null,
        polygon_ids = null, // Support multiple polygons
        project_id = null, // Project ID for filtering
        report_type = 'comprehensive',
        output_filename = null
      } = options;

      const response = await fetch(`${PYTHON_API_URL}/api/generate_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dem_path,
          analysis_data,
          analysis_data_path,
          polygon_id,
          polygon_ids, // Include multiple polygon IDs
          project_id, // Include project ID
          report_type,
          output_filename
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF report' }));
        throw new Error(errorData.error || 'Failed to generate PDF report');
      }

      const result = await response.json();
      
      // Download the PDF file
      if (result.download_url || result.report_path || result.absolute_path) {
        // Prefer download_url if available, otherwise construct from path
        let pdfUrl;
        if (result.download_url) {
          pdfUrl = result.download_url.startsWith('http') 
            ? result.download_url 
            : `${PYTHON_API_URL}${result.download_url}`;
        } else {
          const reportPath = result.absolute_path || result.report_path;
          const filename = result.filename || reportPath.split('/').pop();
          pdfUrl = `${PYTHON_API_URL}/output/reports/${filename}`;
        }
        
        const filename = result.filename || 'FYP_Report.pdf';
        
        try {
          // Fetch and download the PDF file
          const pdfResponse = await fetch(pdfUrl);
          if (!pdfResponse.ok) {
            // Try alternative path if first attempt fails
            const altUrl = `${PYTHON_API_URL}/output/${filename}`;
            const altResponse = await fetch(altUrl);
            if (!altResponse.ok) {
              throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
            }
            
            const blob = await altResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            return result;
          }
          
          const blob = await pdfResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (downloadError) {
          console.error('Error downloading PDF:', downloadError);
          throw new Error(`PDF generated but download failed: ${downloadError.message}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw error;
    }
  },

  // Delete a generated PDF report
  deleteReport: async (filename) => {
    try {
      const PYTHON_API_URL = 'http://localhost:5002';
      const response = await fetch(`${PYTHON_API_URL}/api/reports/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete report' }));
        throw new Error(errorData.error || 'Failed to delete report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // List all generated reports
  listReports: async () => {
    try {
      const PYTHON_API_URL = 'http://localhost:5002';
      const response = await fetch(`${PYTHON_API_URL}/api/reports/list`);

      if (!response.ok) {
        throw new Error('Failed to list reports');
      }

      return await response.json();
    } catch (error) {
      console.error('Error listing reports:', error);
      throw error;
    }
  },

  // Export report to Excel/CSV
  exportReport: async (projectId, format = 'excel', reportType = 'full') => {
    try {
      const response = await api.post(`/api/reports/export/${projectId}`, {
        format,
        reportType
      }, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : format === 'csv' 
            ? 'text/csv' 
            : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  },

  // Get report templates
  getReportTemplates: async () => {
    try {
      const response = await api.get('/api/reports/templates');
      return response.data;
    } catch (error) {
      console.error('Error fetching report templates:', error);
      throw error;
    }
  },

  // List PDF reports
  listPDFReports: async () => {
    try {
      const response = await api.get('/api/reports/pdf/list');
      return response.data;
    } catch (error) {
      console.error('Error listing PDF reports:', error);
      return { reports: [] };
    }
  },

  // Delete PDF report via Node.js backend
  deletePDFReport: async (filename) => {
    try {
      const response = await api.delete(`/api/reports/pdf/${encodeURIComponent(filename)}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting PDF report:', error);
      throw error;
    }
  }
};

export default reportApi;

