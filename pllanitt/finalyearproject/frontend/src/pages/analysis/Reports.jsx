import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Download, 
  Printer, 
  Mail, 
  FileImage, 
  FileJson, 
  Clock, 
  Filter,
  Search,
  Zap,
  Eye,
  Loader2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { reportApi } from '@/services/reportApi';
import { projectApi } from '@/services/projectApi';
import { useToast } from '@/hooks/use-toast';
import { exportReports } from '@/utils/dataExport';
import { exportReportToPDF, exportProjectToPDF } from '@/utils/pdfExport';
import { handleError } from '@/utils/errorHandler';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';

const PYTHON_API_URL = 'http://localhost:5002';

const Reports = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  
  // Report generation form state
  const [selectedProject, setSelectedProject] = useState('');
  const [reportType, setReportType] = useState('full');
  const [format, setFormat] = useState('pdf');
  const [components, setComponents] = useState({
    executive: true,
    maps: true,
    analysis: true,
    recommendations: true,
    appendix: true
  });
  
  // PDF report generation state
  const [pdfReportType, setPdfReportType] = useState('comprehensive');
  const [selectedPolygon, setSelectedPolygon] = useState('');
  const [selectedPolygons, setSelectedPolygons] = useState([]); // Multiple polygon selection
  const [polygons, setPolygons] = useState([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Fetch reports and projects on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch reports and projects in parallel
      const [reportsResponse, projectsResponse] = await Promise.all([
        reportApi.getAllReports().catch(() => ({ success: true, reports: [] })),
        projectApi.getAllProjects().catch(() => ({ projects: [] }))
      ]);

      const reportsData = reportsResponse.reports || [];
      
      // Handle different response formats from projectApi
      // Backend returns: { projects: [...], total: ..., limit: ..., offset: ... }
      let projectsData = [];
      if (Array.isArray(projectsResponse)) {
        projectsData = projectsResponse;
      } else if (projectsResponse && Array.isArray(projectsResponse.projects)) {
        projectsData = projectsResponse.projects;
      } else if (projectsResponse && projectsResponse.data) {
        if (Array.isArray(projectsResponse.data)) {
          projectsData = projectsResponse.data;
        } else if (Array.isArray(projectsResponse.data.projects)) {
          projectsData = projectsResponse.data.projects;
        }
      }
      
      console.log('📊 Projects fetched:', {
        rawResponse: projectsResponse,
        extractedProjects: projectsData,
        count: projectsData.length,
        statuses: projectsData.map(p => ({ id: p.id, title: p.title, status: p.status }))
      });

      // Filter to show projects that can have reports generated
      // Include: Planning, In Progress, and Completed (users may want reports for completed projects)
      // Exclude: Cancelled and On Hold
      // If no status, include the project by default
      const ongoingProjects = projectsData.filter(p => {
        if (!p) return false;
        if (!p.status) return true; // Include projects without status
        const status = String(p.status).trim();
        const normalizedStatus = status.toLowerCase();
        return normalizedStatus === 'in progress' || 
               normalizedStatus === 'planning' || 
               normalizedStatus === 'completed' ||
               normalizedStatus === 'active' ||
               normalizedStatus === '';
      });

      console.log('✅ Ongoing projects after filter:', {
        count: ongoingProjects.length,
        projects: ongoingProjects.map(p => ({ id: p.id, title: p.title, status: p.status }))
      });
      
      // If no ongoing projects but we have projects, log all statuses for debugging
      if (ongoingProjects.length === 0 && projectsData.length > 0) {
        const allStatuses = [...new Set(projectsData.map(p => p.status).filter(Boolean))];
        console.warn('⚠️ No ongoing projects found. Available statuses:', allStatuses);
        console.warn('All projects:', projectsData.map(p => ({ id: p.id, title: p.title, status: p.status })));
      }

      setReports(reportsData);
      setProjects(ongoingProjects);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.projectLocation?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = reportTypeFilter === 'all' || 
                       report.reportType === reportTypeFilter ||
                       (reportTypeFilter === 'env' && (report.sections?.terrainAnalysis || report.reportType === 'terrain' || report.reportType === 'land_suitability')) ||
                       (reportTypeFilter === 'urban' && (report.sections?.design || report.reportType === 'zoning' || report.reportType === 'optimization_zoning')) ||
                       (reportTypeFilter === 'financial' && report.projectBudget);
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.generatedAt) - new Date(a.generatedAt);
    } else if (sortBy === 'name') {
      return a.projectTitle.localeCompare(b.projectTitle);
    } else if (sortBy === 'type') {
      return a.reportType.localeCompare(b.reportType);
    }
    return 0;
  });

  // Fetch polygons for selected project
  useEffect(() => {
    const fetchPolygons = async () => {
      if (!selectedProject) {
        setPolygons([]);
        return;

      }
      
      try {
        const response = await fetch(`${PYTHON_API_URL}/api/polygon?project_id=${selectedProject}`);
        if (response.ok) {
          const data = await response.json();
          setPolygons(Array.isArray(data) ? data : (data.polygons || []));
        }
      } catch (err) {
        console.error('Error fetching polygons:', err);
        setPolygons([]);
      }
    };
    
    fetchPolygons();
  }, [selectedProject]);

  // Fetch all analysis data for a polygon
  const fetchAllPolygonAnalysis = async (polygonId, projectId) => {
    try {
      // The backend will fetch all analysis data when polygon_id is provided
      // We just need to pass it to the report generation endpoint
      return { polygon_id: polygonId, project_id: projectId };
    } catch (err) {
      console.error('Error preparing polygon analysis:', err);
      return null;
    }
  };
  
  // Fetch terrain analysis data for a polygon (legacy support)
  const fetchTerrainAnalysis = async (polygonId) => {
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/terrain_analysis?polygon_id=${polygonId}`);
      if (!response.ok) return null;
      const data = await response.json();
      
      // Extract analysis data from response
      if (data.terrain_analysis?.results) {
        return typeof data.terrain_analysis.results === 'string' 
          ? JSON.parse(data.terrain_analysis.results)
          : data.terrain_analysis.results;
      }
      
      // Alternative structure
      if (data.results) {
        return typeof data.results === 'string' ? JSON.parse(data.results) : data.results;
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching terrain analysis:', err);
      return null;
    }
  };

  // Generate PDF report
  const handleGeneratePDFReport = async () => {
    if (!selectedProject) {
      setError('Please select a project');
      toast({
        title: 'Error',
        description: 'Please select a project first',
        variant: 'destructive'
      });
      return;
    }

    try {
      setGeneratingPDF(true);
      setError(null);

      let demPath = 'data/dem_download.tif';
      
      // Collect polygon IDs - support both single and multiple selection
      let polygonIds = [];
      if (selectedPolygons && selectedPolygons.length > 0) {
        // Multiple polygons selected
        polygonIds = selectedPolygons.map(p => parseInt(p));
      } else if (selectedPolygon) {
        // Single polygon selected (legacy)
        polygonIds = [parseInt(selectedPolygon)];
      }

      // Get project details to include in report
      const project = projects.find(p => p.id.toString() === selectedProject.toString());
      
      // Generate PDF report with polygon_id(s) - backend will fetch all analysis data
      const result = await reportApi.generatePDFReport({
        dem_path: demPath,
        polygon_id: polygonIds.length === 1 ? polygonIds[0] : null, // Single polygon (backward compatibility)
        polygon_ids: polygonIds.length > 1 ? polygonIds : (polygonIds.length === 1 ? polygonIds : null), // Multiple polygons
        project_id: parseInt(selectedProject),
        project_title: project?.title || `Project ${selectedProject}`,
        project_location: project?.location || 'Not specified',
        project_type: project?.type || undefined, // Don't send if not available
        project_status: project?.status || 'In Progress',
        report_type: pdfReportType,
        output_filename: pdfReportType === 'comprehensive' 
          ? `FYP_Report_${project?.title ? project.title.replace(/\s+/g, '_') : 'Comprehensive'}.pdf`
          : `FYP_Report_${pdfReportType}_${Date.now()}.pdf`
      });

      toast({
        title: 'Success',
        description: `PDF report generated successfully${polygonIds.length > 0 ? ` for ${polygonIds.length} polygon(s)` : ''}!`,
      });
      
      // Refresh reports list
      await fetchData();
    } catch (err) {
      console.error('Error generating PDF report:', err);
      const errorMessage = err.message || 'Failed to generate PDF report. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedProject) {
      setError('Please select a project');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const result = await reportApi.generateReport(selectedProject, {
        reportType,
        format,
        components
      });

      // If PDF format, generate and download PDF immediately
      if (format === 'pdf') {
        try {
          const { generatePDFReport } = await import('@/utils/pdfReportGenerator');
          const reportData = result.report || result;
          await generatePDFReport(reportData);
          toast({
            title: 'Success',
            description: `PDF report generated and downloaded for ${reportData.projectTitle}`,
          });
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
          setError('Report generated but PDF creation failed. You can download as JSON.');
        }
      } else {
        // Refresh reports list for JSON format
        await fetchData();
        toast({
          title: 'Success',
          description: `Report generated successfully for ${result.report.projectTitle}`,
        });
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Download report
  const handleDownloadReport = async (projectId, projectTitle, reportType = null, reportData = null) => {
    try {
      // Try backend PDF download first
      try {
        await reportApi.downloadReportAsFile(projectId, 'pdf', projectTitle, reportType);
        toast({
          title: 'Success',
          description: 'Report downloaded successfully',
        });
      } catch (backendError) {
        // Fallback to client-side PDF generation
        console.warn('Backend PDF download failed, using client-side generation:', backendError);
        
        const project = projects.find(p => p.id.toString() === projectId.toString());
        if (project) {
          // Use report data if available, otherwise use project data
          const pdfData = reportData || {
            projectTitle: project.title,
            location: project.location,
            status: project.status,
            progress: project.progress,
            summary: {
              'Project Type': project.type || 'N/A',
              'Priority': project.priority || 'N/A',
              'Budget': project.budget ? `$${project.budget.toLocaleString()}` : 'N/A',
              'Area': project.area ? `${project.area} sq ft` : 'N/A',
              'Created': project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'
            },
            details: project.description || 'No description available.'
          };

          exportReportToPDF(pdfData, {
            title: `Report: ${projectTitle}`,
            filename: `report_${projectId}_${new Date().toISOString().split('T')[0]}.pdf`
          });

          toast({
            title: 'Success',
            description: 'PDF report generated successfully',
          });
        } else {
          throw new Error('Project not found');
        }
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive'
      });
    }
  };

  // Delete PDF report
  const handleDeleteReport = async (filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await reportApi.deleteReport(filename);
      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      });
      // Refresh reports list
      await fetchData();
    } catch (err) {
      console.error('Error deleting report:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete report',
        variant: 'destructive'
      });
    }
  };

  // Get badge color based on report type
  const getBadgeColor = (report) => {
    // Return color class names for badges
    if (report.reportType === 'terrain') return 'bg-green-500/20 text-green-400';
    if (report.reportType === 'land_suitability') return 'bg-blue-500/20 text-blue-400';
    if (report.reportType === 'zoning') return 'bg-purple-500/20 text-purple-400';
    if (report.reportType === 'optimization_zoning') return 'bg-yellow-500/20 text-yellow-400';
    if (report.sections?.terrainAnalysis) return 'bg-green-500/20 text-green-400';
    if (report.sections?.design) return 'bg-blue-500/20 text-blue-400';
    if (report.projectBudget) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-purple-500/20 text-purple-400';
  };

  // Get badge text based on report type
  const getBadgeText = (report) => {
    if (report.analysisType) return report.analysisType;
    if (report.reportType === 'terrain') return 'Terrain Analysis';
    if (report.reportType === 'land_suitability') return 'Land Suitability';
    if (report.reportType === 'zoning') return 'Zoning Analysis';
    if (report.reportType === 'optimization_zoning') return 'Optimization Zoning';
    if (report.sections?.terrainAnalysis) return 'Environmental';
    if (report.sections?.design) return 'Urban Design';
    if (report.projectBudget) return 'Financial';
    return 'Project Report';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Calculate estimated pages (rough estimate)
  const estimatePages = (report) => {
    let pages = 2; // Base pages
    if (report.sections?.executiveSummary) pages += 2;
    if (report.sections?.terrainAnalysis) pages += 5;
    if (report.sections?.design) pages += 10;
    if (report.sections?.recommendations) pages += 3;
    return pages;
  };

  const handleExportReports = (format = 'csv') => {
    try {
      const filteredReports = reports.filter(report => {
        const matchesSearch = !searchQuery || 
          report.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.analysisType?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = reportTypeFilter === 'all' || report.reportType === reportTypeFilter;
        return matchesSearch && matchesType;
      });
      
      exportReports(filteredReports, format);
      toast({
        title: 'Export Successful',
        description: `Reports exported as ${format.toUpperCase()}`,
        variant: 'default'
      });
    } catch (error) {
      handleError(error, toast, { context: 'export_reports' });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex flex-col gap-6 p-6 animate-fade-in">
          <TableSkeleton rows={8} cols={5} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">Reports & Exports</h1>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">Generate documentation and export project data</p>
        </div>
        
        <div className="flex flex-col gap-4 md:flex-row md:justify-end md:items-center">
          <div className="flex gap-2">
            {reports.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  className="border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => handleExportReports('csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => {
                    try {
                      const filteredReports = reports.filter(report => {
                        const matchesSearch = !searchQuery || 
                          report.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          report.analysisType?.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesType = reportTypeFilter === 'all' || report.reportType === reportTypeFilter;
                        return matchesSearch && matchesType;
                      });
                      
                      // Export all filtered reports as PDF
                      const { exportMultipleReportsToPDF } = require('@/utils/pdfExport');
                      const pdfReports = filteredReports.map(report => ({
                        title: report.projectTitle || 'Untitled Report',
                        summary: {
                          'Report Type': report.reportType || 'N/A',
                          'Analysis Type': report.analysisType || 'N/A',
                          'Generated': report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : 'N/A'
                        }
                      }));
                      
                      exportMultipleReportsToPDF(pdfReports, {
                        filename: `reports_${new Date().toISOString().split('T')[0]}.pdf`
                      });
                      
                      toast({
                        title: 'Success',
                        description: 'All reports exported as PDF',
                        variant: 'default'
                      });
                    } catch (error) {
                      handleError(error, toast, { context: 'export_reports_pdf' });
                    }
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              className="border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={fetchData}
            >
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input 
              type="search" 
              placeholder="Search reports..." 
              className="pl-10 bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border w-full md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
              <SelectTrigger className="w-[150px] bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border">
                <SelectValue placeholder="Report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="env">Environmental & Analysis</SelectItem>
                <SelectItem value="terrain">Terrain Analysis</SelectItem>
                <SelectItem value="land_suitability">Land Suitability</SelectItem>
                <SelectItem value="zoning">Zoning Analysis</SelectItem>
                <SelectItem value="optimization_zoning">Optimization Zoning</SelectItem>
                <SelectItem value="urban">Urban Design</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px] bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="saved" className="w-full">
          <TabsList className="bg-white dark:bg-slate-800 border border-accent-light-border dark:border-accent-dark-border">
            <TabsTrigger value="saved" className="data-[state=active]:bg-accent data-[state=active]:text-white">
              Saved Reports ({filteredReports.length})
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-accent data-[state=active]:text-white">
              Generate Report
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="saved" className="mt-4 flex flex-col gap-6">
            {filteredReports.length === 0 ? (
              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500 opacity-50" />
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">No reports found</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {projects.length === 0 
                      ? 'No projects available for report generation. Create a project first.'
                      : 'Generate a report for one of your ongoing projects to get started.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge className={`rounded-full px-2 py-1 text-xs font-medium ${
                          getBadgeColor(report) === 'reports-badge-green' ? 'bg-green-500/20 text-green-400' :
                          getBadgeColor(report) === 'reports-badge-blue' ? 'bg-blue-500/20 text-blue-400' :
                          getBadgeColor(report) === 'reports-badge-yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                          getBadgeColor(report) === 'reports-badge-red' ? 'bg-red-500/20 text-red-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {getBadgeText(report)}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownloadReport(report.projectId, report.projectTitle, report.reportType)}
                          title="View Report"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardTitle className="text-lg text-slate-800 dark:text-slate-100 mt-2">
                        {report.analysisType || report.projectTitle}
                      </CardTitle>
                      <CardDescription className="text-slate-500 dark:text-slate-400">
                        {report.analysisType 
                          ? `${report.projectTitle} • ${report.projectLocation}`
                          : `${report.projectLocation} • ${report.projectType}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Generated {formatDate(report.generatedAt)}</span>
                        </div>
                        <span>{estimatePages(report)} pages</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => handleDownloadReport(report.projectId, report.projectTitle, report.reportType)}
                            title="Download Report"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {(report.filename || report.download_url) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 border-red-500 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => handleDeleteReport(report.filename || report.download_url?.split('/').pop())}
                              title="Delete Report"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                          onClick={() => handleDownloadReport(report.projectId, report.projectTitle, report.reportType)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {projects.length > 0 && (
                  <Card className="bg-white dark:bg-slate-800 border border-dashed border-accent-light-border dark:border-accent-dark-border hover:border-blue-500 dark:hover:border-blue-400 transition-colors shadow-card">
                    <CardContent className="flex flex-col items-center justify-center h-[200px]">
                      <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-3" />
                      <p className="text-slate-600 dark:text-slate-400 mb-4 font-medium">Generate new report</p>
                      <Button 
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                        onClick={() => document.querySelector('[value="generate"]')?.click()}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Create Report
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="generate" className="mt-4 flex flex-col gap-6">
            <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-100">Generate New Report</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">Create custom reports for your ongoing projects</CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="mb-4 text-slate-800 dark:text-slate-100">No projects available for report generation.</p>
                    <p className="text-slate-500 dark:text-slate-400">Create a project with status "Planning", "In Progress", or "Completed" to generate reports.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project *</label>
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.title} ({project.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Report Type</label>
                      <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border">
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Project Report</SelectItem>
                          <SelectItem value="executive">Executive Summary</SelectItem>
                          <SelectItem value="terrain">Terrain Analysis Report</SelectItem>
                          <SelectItem value="land_suitability">Land Suitability Report</SelectItem>
                          <SelectItem value="zoning">Zoning Analysis Report</SelectItem>
                          <SelectItem value="optimization_zoning">Optimization Zoning Report</SelectItem>
                          <SelectItem value="environmental">Environmental Assessment</SelectItem>
                          <SelectItem value="financial">Financial Analysis</SelectItem>
                        </SelectContent>
                      </Select>
                      {(reportType === 'terrain' || reportType === 'land_suitability' || 
                        reportType === 'zoning' || reportType === 'optimization_zoning') && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          Note: This report requires the corresponding analysis to be completed for the selected project.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Format</label>
                      <div className="flex gap-2">
                        <Button 
                          variant={format === 'json' ? 'default' : 'outline'} 
                          className={`flex-1 ${format === 'json' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' : 'border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          onClick={() => setFormat('json')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          JSON
                        </Button>
                        <Button 
                          variant={format === 'pdf' ? 'default' : 'outline'} 
                          className={`flex-1 ${format === 'pdf' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' : 'border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          onClick={() => setFormat('pdf')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Report Components</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="executive" 
                            checked={components.executive}
                            onCheckedChange={(checked) => setComponents({...components, executive: checked})}
                          />
                          <label htmlFor="executive" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">Executive Summary</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="maps" 
                            checked={components.maps}
                            onCheckedChange={(checked) => setComponents({...components, maps: checked})}
                          />
                          <label htmlFor="maps" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">Maps & Visualizations</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="analysis" 
                            checked={components.analysis}
                            onCheckedChange={(checked) => setComponents({...components, analysis: checked})}
                          />
                          <label htmlFor="analysis" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">Data Analysis</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="recommendations" 
                            checked={components.recommendations}
                            onCheckedChange={(checked) => setComponents({...components, recommendations: checked})}
                          />
                          <label htmlFor="recommendations" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">Recommendations</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="appendix" 
                            checked={components.appendix}
                            onCheckedChange={(checked) => setComponents({...components, appendix: checked})}
                          />
                          <label htmlFor="appendix" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">Technical Appendix</label>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleGenerateReport}
                      disabled={generating || !selectedProject}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate Report
                        </>
                      )}
                    </Button>
                    
                    {/* PDF Report Generation Section */}
                    <div className="mt-8 pt-8 border-t-2 border-accent-light-border dark:border-accent-dark-border">
                      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
                        PDF Report Generation (DEM Analysis)
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Generate professional PDF reports with DEM data analysis, charts, and visualizations.
                      </p>
                      
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Report Type</label>
                        <Select value={pdfReportType} onValueChange={setPdfReportType}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border">
                            <SelectValue placeholder="Select report type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                            <SelectItem value="elevation">Elevation Analysis</SelectItem>
                            <SelectItem value="slope">Slope Analysis</SelectItem>
                            <SelectItem value="flood">Flood Risk Analysis</SelectItem>
                            <SelectItem value="erosion">Erosion Analysis</SelectItem>
                            <SelectItem value="water">Water Availability Analysis</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          {pdfReportType === 'comprehensive' 
                            ? 'Includes all available analyses: elevation, slope, flood risk, erosion, and water availability.'
                            : `Generates a focused report for ${pdfReportType.replace('_', ' ')} analysis.`}
                        </p>
                      </div>
                      
                      {polygons.length > 0 && (
                        <div className="flex flex-col gap-2 mt-4">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Select Polygon(s) (Optional)
                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                              - Select one or more polygons to include all analysis data
                            </span>
                          </label>
                          
                          {/* Single polygon selection (for backward compatibility) */}
                          <div style={{ marginBottom: '12px' }}>
                            <Select value={selectedPolygon} onValueChange={(value) => {
                              setSelectedPolygon(value);
                              if (value) {
                                setSelectedPolygons([value]);
                              } else {
                                setSelectedPolygons([]);
                              }
                            }}>
                              <SelectTrigger className="reports-form-select">
                                <SelectValue placeholder="Quick select single polygon (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {polygons.map((polygon) => (
                                  <SelectItem key={polygon.id} value={String(polygon.id)}>
                                    Polygon {polygon.id} {polygon.name ? `- ${polygon.name}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Multiple polygon selection */}
                          <div style={{ 
                            border: '1px solid #e0e0e0', 
                            borderRadius: '4px', 
                            padding: '12px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            backgroundColor: '#fafafa'
                          }}>
                            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                              Or select multiple polygons ({selectedPolygons.length} selected):
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {polygons.map((polygon) => {
                                const isSelected = selectedPolygons.includes(String(polygon.id));
                                return (
                                  <div key={polygon.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Checkbox
                                      id={`polygon-${polygon.id}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedPolygons([...selectedPolygons, String(polygon.id)]);
                                          setSelectedPolygon(String(polygon.id)); // Update single select too
                                        } else {
                                          setSelectedPolygons(selectedPolygons.filter(id => id !== String(polygon.id)));
                                          if (selectedPolygon === String(polygon.id)) {
                                            setSelectedPolygon('');
                                          }
                                        }
                                      }}
                                    />
                                    <label 
                                      htmlFor={`polygon-${polygon.id}`}
                                      style={{ 
                                        fontSize: '13px', 
                                        cursor: 'pointer',
                                        flex: 1,
                                        color: isSelected ? '#1a237e' : '#333'
                                      }}
                                    >
                                      Polygon {polygon.id} {polygon.name ? `- ${polygon.name}` : ''}
                                      {polygon.area && (
                                        <span style={{ color: '#666', marginLeft: '8px' }}>
                                          ({(polygon.area / 10000).toFixed(2)} ha)
                                        </span>
                                      )}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                            {selectedPolygons.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-accent-light-border dark:border-accent-dark-border">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPolygons([]);
                                    setSelectedPolygon('');
                                  }}
                                  className="text-xs text-slate-500 dark:text-slate-400 bg-transparent border-none cursor-pointer underline hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                  Clear selection
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {selectedPolygons.length > 0 && (
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 font-medium">
                              ✓ {selectedPolygons.length} polygon(s) selected - Report will include all available analysis data for each polygon
                            </p>
                          )}
                        </div>
                      )}
                      
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleGeneratePDFReport}
                        disabled={generatingPDF || !selectedProject}
                      >
                        {generatingPDF ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating PDF...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate PDF Report
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;

