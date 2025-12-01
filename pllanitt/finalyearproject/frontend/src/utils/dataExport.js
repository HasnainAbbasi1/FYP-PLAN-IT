/**
 * Data export utilities for CSV, Excel, and JSON formats
 */

/**
 * Convert array of objects to CSV string
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to JSON file
 */
export const exportToJSON = (data, filename = 'export.json') => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export projects to CSV
 */
export const exportProjects = (projects, format = 'csv') => {
  const data = projects.map(project => ({
    'ID': project.id,
    'Title': project.title || '',
    'Description': project.description || '',
    'Location': project.location || '',
    'Type': project.type || '',
    'Status': project.status || '',
    'Priority': project.priority || '',
    'Progress': project.progress || 0,
    'Budget': project.budget || '',
    'Start Date': project.start_date || '',
    'End Date': project.end_date || '',
    'Created At': project.createdAt || '',
    'Updated At': project.updatedAt || ''
  }));

  if (format === 'json') {
    exportToJSON(data, `projects_${new Date().toISOString().split('T')[0]}.json`);
  } else {
    exportToCSV(data, `projects_${new Date().toISOString().split('T')[0]}.csv`);
  }
};

/**
 * Export reports to CSV
 */
export const exportReports = (reports, format = 'csv') => {
  const data = reports.map(report => ({
    'ID': report.id,
    'Report Type': report.reportType || '',
    'Analysis Type': report.analysisType || '',
    'Project ID': report.projectId || '',
    'Project Title': report.projectTitle || '',
    'Generated At': report.generatedAt || '',
    'Status': report.summary?.status || ''
  }));

  if (format === 'json') {
    exportToJSON(data, `reports_${new Date().toISOString().split('T')[0]}.json`);
  } else {
    exportToCSV(data, `reports_${new Date().toISOString().split('T')[0]}.csv`);
  }
};

/**
 * Export activities to CSV
 */
export const exportActivities = (activities, format = 'csv') => {
  const data = activities.map(activity => ({
    'ID': activity.id,
    'Project ID': activity.project_id || '',
    'User ID': activity.user_id || '',
    'Activity Type': activity.activity_type || '',
    'Description': activity.description || '',
    'Created At': activity.created_at || ''
  }));

  if (format === 'json') {
    exportToJSON(data, `activities_${new Date().toISOString().split('T')[0]}.json`);
  } else {
    exportToCSV(data, `activities_${new Date().toISOString().split('T')[0]}.csv`);
  }
};

export default {
  exportToCSV,
  exportToJSON,
  exportProjects,
  exportReports,
  exportActivities
};

