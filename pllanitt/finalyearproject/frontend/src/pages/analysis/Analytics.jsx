
import React, { useState, useEffect, useMemo, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, TrendingUp, BarChart3, PieChart as PieChartIcon, 
  AlertCircle, Target, Activity, CheckCircle, Clock, 
  MapPin, Layers, Zap, Award, TrendingDown, Building2,
  Calendar, GitCompare
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { exportAnalyticsData } from "@/utils/analyticsExport";
import { handleError } from "@/utils/errorHandler";
import { Download } from "lucide-react";

const COLORS = ["#4588AD", "#2B4D5F", "#9b87f5", "#ffcc00", "#ff6b6b", "#4ecdc4", "#f97316", "#06b6d4"];

// Loading skeleton component
const ChartSkeleton = ({ height = 300 }) => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded" style={{ height: `${height}px`, width: '100%' }} />
  </div>
);

// Card skeleton component
const CardSkeleton = () => (
  <Card className="h-full">
    <CardHeader>
      <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
    </CardHeader>
    <CardContent>
      <ChartSkeleton />
    </CardContent>
  </Card>
);

// KPI Card Component
const KPICard = ({ icon: Icon, title, value, subtitle, trend, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    cyan: "from-cyan-500 to-cyan-600"
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-bold mb-1">{value}</h3>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center mt-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                <span>{Math.abs(trend)}% from last month</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} bg-opacity-10`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchProjectsList = useCallback(async () => {
    try {
      const response = await api.get('/api/analytics/projects');
      if (response.data.success) {
        setProjectsList(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching projects list:', err);
    }
  }, []);

  const fetchAnalyticsData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const params = selectedProject !== "all" ? { projectId: selectedProject } : {};
      const response = await api.get('/api/analytics/data', { params });
      
      if (response.data.success) {
        setAnalyticsData(response.data.data);
        if (showRefreshing) {
          toast({
            title: 'Success',
            description: 'Analytics data refreshed successfully',
            duration: 2000
          });
        }
      } else {
        throw new Error('Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, selectedProject]);

  useEffect(() => {
    fetchProjectsList();
  }, [fetchProjectsList]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Memoized data transformations for performance
  const projectTrendsData = useMemo(() => {
    if (!analyticsData?.projectTrends) return [];
    return analyticsData.projectTrends.map(item => ({
      name: item.name,
      value: Math.round(item.value || 0),
      created: item.created || 0,
      completed: item.completed || 0
    }));
  }, [analyticsData?.projectTrends]);

  const landUseData = useMemo(() => {
    if (!analyticsData?.landUseDistribution) return [];
    return analyticsData.landUseDistribution.map(item => ({
      name: item.name,
      value: item.value || 0
    }));
  }, [analyticsData?.landUseDistribution]);

  const developmentData = useMemo(() => {
    if (!analyticsData?.developmentByLocation) return [];
    return analyticsData.developmentByLocation.map(item => ({
      name: item.name,
      value: Math.round(item.value || 0),
      projects: item.projects || 0
    }));
  }, [analyticsData?.developmentByLocation]);

  const optimizationFitnessTrend = useMemo(() => {
    if (!analyticsData?.optimizationStats?.fitnessScoreTrend) return [];
    return analyticsData.optimizationStats.fitnessScoreTrend;
  }, [analyticsData?.optimizationStats]);

  const performanceMetrics = useMemo(() => {
    if (!analyticsData?.performanceMetrics) return null;
    return analyticsData.performanceMetrics;
  }, [analyticsData?.performanceMetrics]);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive text-lg font-semibold">Error: {error}</p>
              <Button onClick={() => fetchAnalyticsData()} className="mt-4">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-foreground">Analytics Dashboard</h1>
              <p className="text-lg text-muted-foreground">
                Comprehensive overview of urban planning metrics and performance indicators
              </p>
            </div>
            <div className="flex items-center gap-2">
              {analyticsData && (
                <Button
                  onClick={() => {
                    try {
                      exportAnalyticsData(analyticsData, 'csv');
                      toast({
                        title: 'Export Successful',
                        description: 'Analytics data exported as CSV',
                        variant: 'default'
                      });
                    } catch (error) {
                      handleError(error, toast, { context: 'export_analytics' });
                    }
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
              <Button
                onClick={() => fetchAnalyticsData(true)}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium">Filter by Project:</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projectsList.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProject !== "all" && (
              <Badge variant="secondary">
                Filtered View
              </Badge>
            )}
          </div>
        </div>

        {/* KPI Cards Section */}
        {performanceMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              icon={Building2}
              title="Total Projects"
              value={analyticsData?.projectStats?.total || 0}
              subtitle={`${performanceMetrics.activeProjects} active`}
              color="blue"
            />
            <KPICard
              icon={CheckCircle}
              title="Completion Rate"
              value={`${performanceMetrics.completionRate}%`}
              subtitle={`${performanceMetrics.completedProjects} completed`}
              color="green"
            />
            <KPICard
              icon={Activity}
              title="Average Progress"
              value={`${performanceMetrics.averageProgress}%`}
              subtitle="Across all projects"
              color="purple"
            />
            <KPICard
              icon={Zap}
              title="Total Analyses"
              value={performanceMetrics.totalAnalyses}
              subtitle={`${analyticsData?.terrainStats?.totalAnalyses || 0} terrain, ${analyticsData?.suitabilityStats?.totalAnalyses || 0} suitability`}
              color="orange"
            />
          </div>
        )}

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="timeseries">Time Series</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Project Growth Trend */}
              <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Project Growth Trend
                  </CardTitle>
                  <CardDescription>Monthly project creation and completion trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {projectTrendsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={projectTrendsData}>
                        <defs>
                          <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4588AD" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4588AD" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2B4D5F" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#2B4D5F" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="created" 
                          stroke="#3f7af5" 
                          fillOpacity={1}
                          fill="url(#colorCreated)"
                          name="Projects Created"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="completed" 
                          stroke="#2B4D5F" 
                          fillOpacity={1}
                          fill="url(#colorCompleted)"
                          name="Projects Completed"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No project data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Project Status Distribution */}
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    Project Status
                  </CardTitle>
                  <CardDescription>Distribution by status</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.projectStats?.byStatus && Object.keys(analyticsData.projectStats.byStatus).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(analyticsData.projectStats.byStatus).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {Object.entries(analyticsData.projectStats.byStatus).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>No status data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Land Use Distribution */}
              <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-green-500" />
                    Land Use Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of land usage across projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {landUseData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={landUseData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" fill="#4588AD" radius={[0, 8, 8, 0]}>
                          {landUseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No land use data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Development by Location */}
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    Top Locations
                  </CardTitle>
                  <CardDescription>Development by area</CardDescription>
                </CardHeader>
                <CardContent>
                  {developmentData.length > 0 ? (
                    <div className="space-y-3">
                      {developmentData.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${index === 0 ? 'from-yellow-400 to-yellow-600' : index === 1 ? 'from-gray-300 to-gray-500' : index === 2 ? 'from-orange-400 to-orange-600' : 'from-blue-400 to-blue-600'} flex items-center justify-center text-white font-bold text-sm`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.projects} projects</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{item.value}</p>
                            <p className="text-xs text-muted-foreground">acres</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>No location data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Type Distribution */}
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-500" />
                    Project Types
                  </CardTitle>
                  <CardDescription>Distribution by project type</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.projectStats?.byType && Object.keys(analyticsData.projectStats.byType).length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={Object.entries(analyticsData.projectStats.byType).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {Object.entries(analyticsData.projectStats.byType).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                      <p>No project type data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Priority Distribution */}
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Project Priorities
                  </CardTitle>
                  <CardDescription>Distribution by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.projectStats?.byPriority && Object.keys(analyticsData.projectStats.byPriority).length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={Object.entries(analyticsData.projectStats.byPriority).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" fill="#ff6b6b" radius={[8, 8, 0, 0]}>
                          {Object.entries(analyticsData.projectStats.byPriority).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                      <p>No priority data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Terrain Analysis Summary */}
              {analyticsData?.terrainStats && analyticsData.terrainStats.totalAnalyses > 0 && (
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      Terrain Analysis
                    </CardTitle>
                    <CardDescription>{analyticsData.terrainStats.totalAnalyses} total analyses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Average Elevation</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {Math.round(analyticsData.terrainStats.averageElevation || 0)} m
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-teal-50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Average Slope</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                          {(analyticsData.terrainStats.averageSlope || 0).toFixed(1)}°
                        </p>
                      </div>
                      {analyticsData.terrainStats.floodRiskDistribution && Object.keys(analyticsData.terrainStats.floodRiskDistribution).length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold mb-2 text-gray-700">Flood Risk Distribution</p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">High:</span>
                              <Badge variant="destructive">{analyticsData.terrainStats.floodRiskDistribution.high || 0}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Medium:</span>
                              <Badge className="bg-yellow-500">{analyticsData.terrainStats.floodRiskDistribution.medium || 0}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Low:</span>
                              <Badge className="bg-green-500">{analyticsData.terrainStats.floodRiskDistribution.low || 0}</Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Land Suitability Summary */}
              {analyticsData?.suitabilityStats && analyticsData.suitabilityStats.totalAnalyses > 0 && (
                <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-green-500" />
                      Land Suitability Analysis
                    </CardTitle>
                    <CardDescription>{analyticsData.suitabilityStats.totalAnalyses} total analyses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Residential Suitability */}
                      <div className="space-y-3">
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Residential Suitability</p>
                          <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {Math.round(analyticsData.suitabilityStats.residentialSuitability?.average || 0)}%
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold mb-3 text-gray-700">Distribution</p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">High Suitability:</span>
                              <Badge className="bg-green-500">{analyticsData.suitabilityStats.residentialSuitability?.high || 0}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Medium Suitability:</span>
                              <Badge className="bg-yellow-500">{analyticsData.suitabilityStats.residentialSuitability?.medium || 0}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Low Suitability:</span>
                              <Badge variant="destructive">{analyticsData.suitabilityStats.residentialSuitability?.low || 0}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Commercial Suitability */}
                      <div className="space-y-3">
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Commercial Suitability</p>
                          <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {Math.round(analyticsData.suitabilityStats.commercialSuitability?.average || 0)}%
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold mb-3 text-gray-700">Distribution</p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">High Suitability:</span>
                              <Badge className="bg-green-500">{analyticsData.suitabilityStats.commercialSuitability?.high || 0}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Medium Suitability:</span>
                              <Badge className="bg-yellow-500">{analyticsData.suitabilityStats.commercialSuitability?.medium || 0}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Low Suitability:</span>
                              <Badge variant="destructive">{analyticsData.suitabilityStats.commercialSuitability?.low || 0}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Optimization Stats Summary */}
              {analyticsData?.optimizationStats && analyticsData.optimizationStats.total > 0 ? (
                <>
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Optimization Summary
                      </CardTitle>
                      <CardDescription>{analyticsData.optimizationStats.total} completed optimizations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Average Fitness Score</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                            {analyticsData.optimizationStats.averageFitnessScore}
                          </p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Average Generations</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            {analyticsData.optimizationStats.averageGenerations}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fitness Score Trend */}
                  <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        Fitness Score Trend
                      </CardTitle>
                      <CardDescription>Recent optimization performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {optimizationFitnessTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={optimizationFitnessTrend}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }} 
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="score" 
                              stroke="#3f7af5" 
                              strokeWidth={3} 
                              dot={{ r: 5 }} 
                              name="Fitness Score"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          <p>No fitness trend data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Optimization Methods */}
                  {analyticsData.optimizationStats.byMethod && Object.keys(analyticsData.optimizationStats.byMethod).length > 0 && (
                    <Card className="hover:shadow-lg transition-shadow duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-cyan-500" />
                          Optimization Methods
                        </CardTitle>
                        <CardDescription>Distribution by method</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={Object.entries(analyticsData.optimizationStats.byMethod).map(([name, value]) => ({ name, value }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {Object.entries(analyticsData.optimizationStats.byMethod).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Land Use Breakdown from Optimization */}
                  {analyticsData.optimizationStats.landUseBreakdown && Object.keys(analyticsData.optimizationStats.landUseBreakdown).length > 0 && (
                    <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-green-500" />
                          Optimized Land Use Distribution
                        </CardTitle>
                        <CardDescription>From optimization results</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={Object.entries(analyticsData.optimizationStats.landUseBreakdown).map(([name, value]) => ({ name, value }))}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }} 
                            />
                            <Bar dataKey="value" fill="#47ecbb" radius={[8, 8, 0, 0]}>
                              {Object.entries(analyticsData.optimizationStats.landUseBreakdown).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="lg:col-span-3">
                  <CardContent className="flex items-center justify-center h-[400px]">
                    <div className="text-center text-muted-foreground">
                      <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-semibold">No optimization data available</p>
                      <p className="text-sm mt-2">Run optimizations to see analytics here</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          {/* Design Tab */}
          <TabsContent value="design" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Design Elements Summary */}
              {analyticsData?.designElements && (
                <>
                  {/* Buildings */}
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-500" />
                        Buildings
                      </CardTitle>
                      <CardDescription>{analyticsData.designElements.buildings?.total || 0} total buildings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Total Area</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            {(analyticsData.designElements.buildings?.totalArea || 0).toFixed(2)} m²
                          </p>
                        </div>
                        {analyticsData.designElements.buildings?.byType && Object.keys(analyticsData.designElements.buildings.byType).length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-semibold mb-3 text-gray-700">By Type</p>
                            <div className="space-y-2">
                              {Object.entries(analyticsData.designElements.buildings.byType).map(([type, count]) => (
                                <div key={type} className="flex justify-between items-center">
                                  <span className="text-sm capitalize">{type}:</span>
                                  <Badge>{count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Roads */}
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-orange-500" />
                        Road Network
                      </CardTitle>
                      <CardDescription>{analyticsData.designElements.roads?.total || 0} total segments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Total Length</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                            {(analyticsData.designElements.roads?.totalLength || 0).toFixed(2)} km
                          </p>
                        </div>
                        {analyticsData.roadNetworkStats && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-semibold mb-3 text-gray-700">Network Statistics</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Total Networks:</span>
                                <Badge>{analyticsData.roadNetworkStats.totalNetworks}</Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Total Segments:</span>
                                <Badge>{analyticsData.roadNetworkStats.totalSegments}</Badge>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Parcels */}
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-purple-500" />
                        Parcels
                      </CardTitle>
                      <CardDescription>{analyticsData.designElements.parcels?.total || 0} total parcels</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Total Area</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {(analyticsData.designElements.parcels?.totalArea || 0).toFixed(2)} m²
                          </p>
                        </div>
                        {analyticsData.designElements.parcels?.byZoning && Object.keys(analyticsData.designElements.parcels.byZoning).length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-semibold mb-3 text-gray-700">By Zoning</p>
                            <div className="space-y-2">
                              {Object.entries(analyticsData.designElements.parcels.byZoning).slice(0, 5).map(([zoning, count]) => (
                                <div key={zoning} className="flex justify-between items-center">
                                  <span className="text-sm capitalize">{zoning}:</span>
                                  <Badge>{count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Green Spaces */}
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-500" />
                        Green Spaces
                      </CardTitle>
                      <CardDescription>{analyticsData.designElements.greenSpaces?.total || 0} total green spaces</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Total Area</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {(analyticsData.designElements.greenSpaces?.totalArea || 0).toFixed(2)} m²
                          </p>
                        </div>
                        {analyticsData.designElements.greenSpaces?.byType && Object.keys(analyticsData.designElements.greenSpaces.byType).length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-semibold mb-3 text-gray-700">By Type</p>
                            <div className="space-y-2">
                              {Object.entries(analyticsData.designElements.greenSpaces.byType).map(([type, count]) => (
                                <div key={type} className="flex justify-between items-center">
                                  <span className="text-sm capitalize">{type}:</span>
                                  <Badge className="bg-green-500">{count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Infrastructure */}
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-cyan-500" />
                        Infrastructure
                      </CardTitle>
                      <CardDescription>{analyticsData.designElements.infrastructure?.total || 0} total facilities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analyticsData.designElements.infrastructure?.byType && Object.keys(analyticsData.designElements.infrastructure.byType).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(analyticsData.designElements.infrastructure.byType).map(([type, count]) => (
                            <div key={type} className="p-3 bg-cyan-50 rounded-lg flex justify-between items-center">
                              <span className="text-sm font-medium capitalize">{type}:</span>
                              <Badge className="bg-cyan-600">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                          <p>No infrastructure data</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Subdivision Statistics */}
                  {analyticsData?.subdivisionStats && analyticsData.subdivisionStats.totalSubdivisions > 0 && (
                    <Card className="hover:shadow-lg transition-shadow duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-indigo-500" />
                          Subdivisions
                        </CardTitle>
                        <CardDescription>{analyticsData.subdivisionStats.totalSubdivisions} total subdivisions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Total Parcels</p>
                            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                              {analyticsData.subdivisionStats.totalParcels}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-semibold mb-2 text-gray-700">Average per Subdivision</p>
                            <p className="text-2xl font-bold">{analyticsData.subdivisionStats.averageParcelsPerSubdivision.toFixed(1)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Time Series Analysis Tab */}
          <TabsContent value="timeseries" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Trends Over Time */}
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Project Trends (Last 12 Months)
                  </CardTitle>
                  <CardDescription>Projects created, completed, and in progress over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.timeSeriesData?.projects && analyticsData.timeSeriesData.projects.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={analyticsData.timeSeriesData.projects}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="created" stackId="1" stroke="#3f7af5" fill="#3f7af5" fillOpacity={0.6} name="Created" />
                        <Area type="monotone" dataKey="completed" stackId="1" stroke="#47ecbb" fill="#47ecbb" fillOpacity={0.6} name="Completed" />
                        <Area type="monotone" dataKey="inProgress" stackId="1" stroke="#ffcc00" fill="#ffcc00" fillOpacity={0.6} name="In Progress" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                      <p>No time-series data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analysis Trends Over Time */}
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Analysis Trends (Last 12 Months)
                  </CardTitle>
                  <CardDescription>Terrain and suitability analyses performed over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.timeSeriesData?.analyses && analyticsData.timeSeriesData.analyses.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={analyticsData.timeSeriesData.analyses}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="terrain" stroke="#3f7af5" strokeWidth={2} name="Terrain Analysis" />
                        <Line type="monotone" dataKey="suitability" stroke="#47ecbb" strokeWidth={2} name="Suitability Analysis" />
                        <Line type="monotone" dataKey="total" stroke="#9b87f5" strokeWidth={2} name="Total Analyses" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                      <p>No analysis trends data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Total Projects Over Time */}
              <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    Total Projects Growth
                  </CardTitle>
                  <CardDescription>Cumulative project count over the last 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.timeSeriesData?.projects && analyticsData.timeSeriesData.projects.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.timeSeriesData.projects}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#3f7af5" strokeWidth={3} name="Total Projects" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>No growth data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comparison View Tab */}
          <TabsContent value="comparison" className="space-y-6">
            {analyticsData?.comparisonData?.available ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Projects by Priority Comparison */}
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitCompare className="h-5 w-5 text-orange-500" />
                      Priority Distribution
                    </CardTitle>
                    <CardDescription>Projects grouped by priority level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.comparisonData.byPriority ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={Object.entries(analyticsData.comparisonData.byPriority).map(([name, value]) => ({ name, value }))}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3f7af5" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <p>No priority data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Projects by Status Comparison */}
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Status Distribution
                    </CardTitle>
                    <CardDescription>Projects grouped by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.comparisonData.byStatus ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(analyticsData.comparisonData.byStatus).map(([name, value]) => ({ name, value }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {Object.entries(analyticsData.comparisonData.byStatus).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <p>No status data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Projects by Progress */}
                <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      Top Projects by Progress
                    </CardTitle>
                    <CardDescription>Projects with highest completion progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.comparisonData.byProgress && analyticsData.comparisonData.byProgress.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.comparisonData.byProgress} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <YAxis dataKey="title" type="category" width={150} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="progress" fill="#3f7af5" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <p>No progress data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary Statistics */}
                <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-cyan-500" />
                      Comparison Summary
                    </CardTitle>
                    <CardDescription>Key metrics comparison across all projects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Projects</p>
                        <p className="text-2xl font-bold text-blue-600">{analyticsData.comparisonData.totalProjects}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Active Projects</p>
                        <p className="text-2xl font-bold text-green-600">{analyticsData.comparisonData.activeProjects}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Completed</p>
                        <p className="text-2xl font-bold text-purple-600">{analyticsData.comparisonData.completedProjects}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Avg Progress</p>
                        <p className="text-2xl font-bold text-orange-600">{analyticsData.comparisonData.averageProgress}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">
                      {analyticsData?.comparisonData?.message || 'Need at least 2 projects for comparison'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Analytics;
