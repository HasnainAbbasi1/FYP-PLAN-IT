/**
 * Analytics data export utilities
 */

import { exportToCSV, exportToJSON } from './dataExport';

/**
 * Export analytics data to CSV/JSON
 */
export const exportAnalyticsData = (analyticsData, format = 'csv') => {
  if (!analyticsData) {
    throw new Error('No analytics data to export');
  }

  const exportData = [];

  // Project trends
  if (analyticsData.projectTrends) {
    analyticsData.projectTrends.forEach(trend => {
      exportData.push({
        'Category': 'Project Trend',
        'Name': trend.name,
        'Value': trend.value || 0,
        'Created': trend.created || 0,
        'Completed': trend.completed || 0
      });
    });
  }

  // Land use distribution
  if (analyticsData.landUseDistribution) {
    analyticsData.landUseDistribution.forEach(item => {
      exportData.push({
        'Category': 'Land Use',
        'Type': item.name,
        'Value': item.value || 0,
        'Percentage': item.percentage || 0
      });
    });
  }

  // Development by location
  if (analyticsData.developmentByLocation) {
    analyticsData.developmentByLocation.forEach(location => {
      exportData.push({
        'Category': 'Development by Location',
        'Location': location.name,
        'Value': location.value || 0,
        'Projects': location.projects || 0
      });
    });
  }

  // Performance metrics
  if (analyticsData.performanceMetrics) {
    const metrics = analyticsData.performanceMetrics;
    exportData.push({
      'Category': 'Performance',
      'Metric': 'Average Response Time',
      'Value': metrics.avgResponseTime || 0,
      'Unit': 'ms'
    });
    exportData.push({
      'Category': 'Performance',
      'Metric': 'Total Requests',
      'Value': metrics.totalRequests || 0,
      'Unit': 'count'
    });
  }

  const filename = `analytics_${new Date().toISOString().split('T')[0]}`;

  if (format === 'json') {
    exportToJSON(exportData, `${filename}.json`);
  } else {
    exportToCSV(exportData, `${filename}.csv`);
  }
};

export default {
  exportAnalyticsData
};

