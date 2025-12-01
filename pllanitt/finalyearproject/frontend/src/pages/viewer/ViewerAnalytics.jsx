import React, { useState, useEffect, useMemo } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Target,
  Clock,
  Map,
  PieChart,
  Activity,
  Eye,
  Mountain,
  Route
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/services/api';

const ViewerAnalytics = () => {
  const { projects, loading } = useProject();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedProject, setSelectedProject] = useState('all');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        const params = selectedProject !== 'all' ? { projectId: selectedProject } : {};
        const response = await api.get('/api/analytics/data', { params });
        if (response.data?.success) {
          setAnalyticsData(response.data.data);
        } else if (response.data) {
          // Handle case where response.data is the analytics data directly
          setAnalyticsData(response.data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Don't set error state, just use project-based stats
      } finally {
        setLoadingAnalytics(false);
      }
    };

    if (projects && projects.length > 0) {
      fetchAnalytics();
    }
  }, [selectedProject, projects]);

  const projectStats = useMemo(() => {
    if (!projects) return null;
    
    const total = projects.length;
    const byStatus = projects.reduce((acc, p) => {
      const status = (p.status || 'Unknown').toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const byType = projects.reduce((acc, p) => {
      const type = p.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const completed = projects.filter(p => (p.status || '').toLowerCase().includes('completed')).length;
    const inProgress = projects.filter(p => (p.status || '').toLowerCase().includes('progress') || (p.status || '').toLowerCase().includes('active')).length;
    const planning = projects.filter(p => (p.status || '').toLowerCase().includes('planning')).length;

    return {
      total,
      byStatus: { completed, inProgress, planning, other: total - completed - inProgress - planning },
      byType,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [projects]);

  const statsCards = [
    {
      title: 'Total Projects',
      value: projectStats?.total || 0,
      icon: Map,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      title: 'Completed',
      value: projectStats?.byStatus?.completed || 0,
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      title: 'In Progress',
      value: projectStats?.byStatus?.inProgress || 0,
      icon: Activity,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    {
      title: 'Completion Rate',
      value: `${projectStats?.completionRate || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    }
  ];

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              Project Analytics
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Explore comprehensive analytics and insights from all projects
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px] bg-white dark:bg-slate-800">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id || project._id} value={(project.id || project._id)?.toString()}>
                    {project.title || project.name || 'Untitled'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <Card key={index} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Project Status Distribution */}
        {projectStats && (
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                Project Status Distribution
              </CardTitle>
              <CardDescription>Overview of projects by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(projectStats.byStatus).map(([status, count]) => (
                  <div key={status} className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Types */}
        {projectStats?.byType && Object.keys(projectStats.byType).length > 0 && (
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Projects by Type
              </CardTitle>
              <CardDescription>Distribution of projects across different types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(projectStats.byType).map(([type, count]) => {
                  const percentage = projectStats.total > 0 ? Math.round((count / projectStats.total) * 100) : 0;
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{type}</span>
                        <span className="text-slate-500 dark:text-slate-400">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Data from API */}
        {analyticsData && (
          <>
            {analyticsData.projectTrends && analyticsData.projectTrends.length > 0 && (
              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Project Trends
                  </CardTitle>
                  <CardDescription>Project creation and completion trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(analyticsData.projectTrends) && analyticsData.projectTrends.slice(0, 6).map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{trend.name || trend.month || `Period ${index + 1}`}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Created: {trend.created || 0}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Completed: {trend.completed || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {analyticsData.landUseDistribution && Array.isArray(analyticsData.landUseDistribution) && analyticsData.landUseDistribution.length > 0 && (
              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-blue-600" />
                    Land Use Distribution
                  </CardTitle>
                  <CardDescription>Distribution of land use types across projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analyticsData.landUseDistribution.slice(0, 8).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name || item.type || `Type ${index + 1}`}</span>
                        <Badge variant="outline">{item.value || 0}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {analyticsData.terrainStats && (
              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mountain className="w-5 h-5 text-blue-600" />
                    Terrain Statistics
                  </CardTitle>
                  <CardDescription>Summary of terrain analysis across projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analyticsData.terrainStats).slice(0, 8).map(([key, value]) => (
                      <div key={key} className="text-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                          {typeof value === 'number' ? value.toFixed(1) : value}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {analyticsData.roadNetworkStats && (
              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-blue-600" />
                    Road Network Statistics
                  </CardTitle>
                  <CardDescription>Road network analysis summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analyticsData.roadNetworkStats).slice(0, 8).map(([key, value]) => (
                      <div key={key} className="text-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {loadingAnalytics && (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400">Loading analytics data...</p>
            </CardContent>
          </Card>
        )}

        {!loading && (!projects || projects.length === 0) && (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Analytics Available</h3>
              <p className="text-slate-500 dark:text-slate-400">No project data available to display analytics.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerAnalytics;

