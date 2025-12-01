import React, { useState, useEffect } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download,
  Eye,
  Calendar,
  FileDown,
  Search,
  Filter,
  MapPin
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reportApi } from '@/services/reportApi';
import { useToast } from '@/hooks/use-toast';
import { getProjectWorkflowStage } from '../../utils/projectWorkflow';

const ViewerReports = () => {
  const { projects, loading } = useProject();
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loadingReports, setLoadingReports] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoadingReports(true);
        const response = await reportApi.getAllReports();
        if (response.success) {
          setReports(response.reports || []);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        // For viewers, we'll show project-based reports even if API fails
        setReports([]);
      } finally {
        setLoadingReports(false);
      }
    };

    if (projects && projects.length > 0) {
      fetchReports();
    }
  }, [projects]);

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchQuery || 
      (report.projectTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.reportType || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (report.status || 'available').toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Generate project-based reports for display
  const projectReports = projects?.map(project => {
    const workflowStage = getProjectWorkflowStage(project);
    return {
      id: project.id || project._id,
      projectId: project.id || project._id,
      projectTitle: project.title || project.name || 'Untitled Project',
      reportType: 'Project Summary',
      status: 'available',
      createdAt: project.created_at || project.createdAt,
      updatedAt: project.updated_at || project.updatedAt,
      location: project.location,
      progress: project.progress || 0,
      workflowStage: workflowStage?.label || project.status,
      description: project.description || `Summary report for ${project.title || project.name}`,
      type: project.type,
      priority: project.priority
    };
  }) || [];

  const allReports = [...reports, ...projectReports];

  const handleViewReport = (report) => {
    // For viewers, we can show a modal or navigate to a read-only report view
    toast({
      title: 'View Report',
      description: `Viewing report: ${report.projectTitle}`,
    });
  };

  const handleDownloadReport = async (report) => {
    try {
      if (report.projectId) {
        await reportApi.downloadReportAsFile(report.projectId, 'json', report.projectTitle);
        toast({
          title: 'Success',
          description: 'Report downloaded successfully',
        });
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive'
      });
    }
  };

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              Project Reports
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Browse and download available project reports
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Reports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports List */}
        {loadingReports || loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading reports...</p>
          </div>
        ) : allReports.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Reports Available</h3>
              <p className="text-slate-500 dark:text-slate-400">No reports are available to view at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {allReports.map((report, index) => (
              <Card key={report.id || index} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {report.projectTitle}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {report.reportType || 'Project Report'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                        {report.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{report.location}</span>
                          </span>
                        )}
                        {report.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Created: {new Date(report.createdAt).toLocaleDateString()}</span>
                          </span>
                        )}
                        {report.progress !== undefined && (
                          <Badge variant="outline">
                            Progress: {report.progress}%
                          </Badge>
                        )}
                        {report.workflowStage && (
                          <Badge variant="outline">
                            Stage: {report.workflowStage}
                          </Badge>
                        )}
                        {report.type && (
                          <Badge variant="outline">
                            {report.type}
                          </Badge>
                        )}
                      </div>
                      {report.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                          {report.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                        <Eye className="w-3 h-3 mr-1" />
                        View Only
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                        className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      {report.projectId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(report)}
                          className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {allReports.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Reports Available</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{allReports.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerReports;

