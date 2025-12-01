/**
 * PDF Export Utilities
 * Generates PDF documents from data with charts and visualizations
 */

import jsPDF from 'jspdf';
// Note: jspdf-autotable extends jsPDF automatically when imported
// We just need to import it for side effects
import 'jspdf-autotable';

/**
 * Export report data to PDF
 */
export const exportReportToPDF = (reportData, options = {}) => {
  try {
    const {
      title = 'Report',
      filename = `report_${new Date().toISOString().split('T')[0]}.pdf`,
      orientation = 'portrait',
      includeCharts = false,
      charts = []
    } = options;

    // Create PDF document
    const doc = new jsPDF(orientation, 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Add date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Add project information if available
    if (reportData.projectTitle) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Project Information', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Project: ${reportData.projectTitle}`, margin, yPosition);
      yPosition += 7;

      if (reportData.location) {
        doc.text(`Location: ${reportData.location}`, margin, yPosition);
        yPosition += 7;
      }

      if (reportData.status) {
        doc.text(`Status: ${reportData.status}`, margin, yPosition);
        yPosition += 7;
      }

      if (reportData.progress !== undefined) {
        doc.text(`Progress: ${reportData.progress}%`, margin, yPosition);
        yPosition += 7;
      }

      yPosition += 10;
    }

    // Add summary statistics if available
    if (reportData.summary) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      if (typeof reportData.summary === 'object') {
        Object.entries(reportData.summary).forEach(([key, value]) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(`${key}: ${value}`, margin, yPosition);
          yPosition += 7;
        });
      } else {
        doc.text(reportData.summary, margin, yPosition, { maxWidth: pageWidth - 2 * margin });
        yPosition += 10;
      }
      yPosition += 10;
    }

    // Add tables if available
    if (reportData.tables && Array.isArray(reportData.tables)) {
      reportData.tables.forEach((table, index) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(table.title || `Table ${index + 1}`, margin, yPosition);
        yPosition += 10;

        if (table.headers && table.rows) {
          doc.autoTable({
            startY: yPosition,
            head: [table.headers],
            body: table.rows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
            headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] }
          });

          yPosition = doc.lastAutoTable.finalY + 10;
        }
      });
    }

    // Add charts if available and includeCharts is true
    if (includeCharts && charts.length > 0) {
      charts.forEach((chart, index) => {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(chart.title || `Chart ${index + 1}`, margin, yPosition);
        yPosition += 10;

        // Note: For actual chart images, you would need to convert canvas to image
        // This is a placeholder - in production, use html2canvas or similar
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Chart visualization would appear here', margin, yPosition);
        yPosition += 15;
      });
    }

    // Add detailed data if available
    if (reportData.details) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Information', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const detailsText = typeof reportData.details === 'string' 
        ? reportData.details 
        : JSON.stringify(reportData.details, null, 2);
      
      const splitDetails = doc.splitTextToSize(detailsText, pageWidth - 2 * margin);
      splitDetails.forEach((line) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });
    }

    // Add footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(filename);
    return { success: true, filename };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

/**
 * Export project data to PDF
 */
export const exportProjectToPDF = (project, options = {}) => {
  const reportData = {
    projectTitle: project.title,
    location: project.location,
    status: project.status,
    progress: project.progress,
    summary: {
      'Project Type': project.type || 'N/A',
      'Priority': project.priority || 'N/A',
      'Budget': project.budget ? `$${project.budget.toLocaleString()}` : 'N/A',
      'Area': project.area ? `${project.area} sq ft` : 'N/A',
      'Created': project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A',
      'Last Updated': project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'
    },
    details: project.description || 'No description available.'
  };

  if (project.objectives) {
    reportData.tables = [{
      title: 'Project Objectives',
      headers: ['Objective'],
      rows: Array.isArray(project.objectives) 
        ? project.objectives.map(obj => [obj])
        : [[project.objectives]]
    }];
  }

  return exportReportToPDF(reportData, {
    title: `Project Report: ${project.title}`,
    filename: `project_${project.id}_${new Date().toISOString().split('T')[0]}.pdf`,
    ...options
  });
};

/**
 * Export multiple reports to a single PDF
 */
export const exportMultipleReportsToPDF = (reports, options = {}) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Add cover page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Reports Collection', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated on: ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    pageHeight / 2,
    { align: 'center' }
  );
  doc.text(
    `Total Reports: ${reports.length}`,
    pageWidth / 2,
    pageHeight / 2 + 10,
    { align: 'center' }
  );

  // Add each report
  reports.forEach((report, index) => {
    doc.addPage();
    yPosition = margin;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Report ${index + 1}: ${report.title || 'Untitled'}`, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (report.summary) {
      const summaryText = typeof report.summary === 'string' 
        ? report.summary 
        : JSON.stringify(report.summary, null, 2);
      const splitText = doc.splitTextToSize(summaryText, pageWidth - 2 * margin);
      splitText.forEach((line) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });
    }
  });

  // Add footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const filename = options.filename || `reports_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return { success: true, filename };
};

export default {
  exportReportToPDF,
  exportProjectToPDF,
  exportMultipleReportsToPDF
};

