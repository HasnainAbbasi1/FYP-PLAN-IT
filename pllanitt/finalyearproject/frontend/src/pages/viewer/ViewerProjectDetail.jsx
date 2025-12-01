import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Map,
  Calendar,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  MapPin,
  FileText,
  BarChart3,
  TrendingUp,
  Download,
  Mountain,
  Layers,
  Route,
  Building,
  Zap,
  Activity
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { getProjectWorkflowStage, getWorkflowProgress } from '../../utils/projectWorkflow';
import api from '../../services/api';

const ViewerProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, loading } = useProject();
  const [project, setProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [terrainData, setTerrainData] = useState(null);
  const [suitabilityData, setSuitabilityData] = useState(null);
  const [zoningData, setZoningData] = useState(null);

  useEffect(() => {
    if (projects && id) {
      const found = projects.find(p => 
        (p.id || p._id)?.toString() === id.toString()
      );
      setProject(found || null);
    }
  }, [projects, id]);

  // Fetch detailed project data
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!id) return;
      
      try {
        setLoadingDetails(true);
        // Fetch project details
        try {
          const projectResponse = await api.get(`/api/projects/${id}`);
          const projectData = projectResponse.data;
          setProjectDetails(projectData);
          setProject(projectData);
        } catch (err) {
          // Fallback to using project from context
          console.log('Could not fetch detailed project data, using context data');
        }

        // Try to fetch related analysis data
        try {
          // Fetch terrain analysis if available
          const terrainResponse = await api.get(`/api/terrain-analysis/polygon/${id}`);
          if (terrainResponse.data?.success) {
            setTerrainData(terrainResponse.data.data);
          }
        } catch (err) {
          console.log('No terrain data available');
        }

        try {
          // Fetch suitability analysis
          const suitabilityResponse = await api.get(`/api/land-suitability/polygon/${id}`);
          if (suitabilityResponse.data?.success) {
            setSuitabilityData(suitabilityResponse.data.data);
          }
        } catch (err) {
          console.log('No suitability data available');
        }

        try {
          // Fetch zoning results
          const zoningResponse = await api.get(`/api/zoning/${id}`);
          if (zoningResponse.data?.success) {
            setZoningData(zoningResponse.data.data);
          }
        } catch (err) {
          console.log('No zoning data available');
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };

    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <ViewerLayout>
        <div className="p-8 max-w-[1400px] mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading project details...</p>
          </div>
        </div>
      </ViewerLayout>
    );
  }

  if (!project) {
    return (
      <ViewerLayout>
        <div className="p-8 max-w-[1400px] mx-auto">
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Project Not Found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => navigate('/viewer/projects')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </ViewerLayout>
    );
  }

  const getStatusIcon = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('completed')) return CheckCircle;
    if (statusLower.includes('progress') || statusLower.includes('active')) return Clock;
    return AlertCircle;
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('completed')) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (statusLower.includes('progress') || statusLower.includes('active')) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    if (statusLower.includes('planning')) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/30';
  };

  const StatusIcon = getStatusIcon(project.status);
  const workflowStage = project ? getProjectWorkflowStage(project) : null;
  const workflowProgress = project ? getWorkflowProgress(project) : 0;

  // Calculate days since creation
  const daysSinceCreation = project?.created_at 
    ? Math.floor((new Date() - new Date(project.created_at)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Back Button */}
        <Link 
          to="/viewer/projects" 
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Back to Projects</span>
        </Link>

        {/* Header */}
        <div className="flex justify-between items-start gap-6 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Map className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2">
                  {project.title || project.name || 'Untitled Project'}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {project.status && (
                    <Badge className={`${getStatusColor(project.status)} flex items-center gap-1.5 px-3 py-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {project.status}
                    </Badge>
                  )}
                  <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                    <Eye className="w-3 h-3 mr-1" />
                    View Only
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              {project.description || 'No description available for this project.'}
            </p>
          </div>
        </div>

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Progress</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.progress || 0}%</p>
                </div>
              </div>
              <Progress value={project.progress || 0} className="h-2" />
            </CardContent>
          </Card>

          {project.location && (
            <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Location</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{project.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {project.created_at && (
            <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Created</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {project.type && (
            <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Type</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{project.type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Workflow Progress */}
        {workflowStage && (
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Project Workflow
              </CardTitle>
              <CardDescription>Current stage: {workflowStage.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Workflow Progress</span>
                    <span className="text-slate-500 dark:text-slate-400">{workflowProgress}%</span>
                  </div>
                  <Progress value={workflowProgress} className="h-3" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Draft</span>
                  <span>→ Terrain</span>
                  <span>→ Suitability</span>
                  <span>→ Zoning</span>
                  <span>→ Completed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {project.description || 'No description available for this project.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {project.priority && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</p>
                    <Badge variant="outline">{project.priority}</Badge>
                  </div>
                )}
                {project.type && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</p>
                    <Badge variant="outline">{project.type}</Badge>
                  </div>
                )}
                {project.budget && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Budget</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      ${project.budget.toLocaleString()}
                    </p>
                  </div>
                )}
                {project.area && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Area</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {project.area} {project.area_unit || 'sq ft'}
                    </p>
                  </div>
                )}
              </div>
              {project.updated_at && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Updated</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(project.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
              {daysSinceCreation > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Days Active</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {daysSinceCreation} {daysSinceCreation === 1 ? 'day' : 'days'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => navigate(`/viewer/analytics?project=${id}`)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => navigate(`/viewer/reports?project=${id}`)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => navigate(`/viewer/map?project=${id}`)}
                >
                  <Map className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Terrain Analysis */}
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mountain className="w-5 h-5 text-blue-600" />
                Terrain Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDetails ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : terrainData ? (
                <div className="space-y-2">
                  {terrainData.elevation_mean && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Avg Elevation</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {terrainData.elevation_mean.toFixed(1)}m
                      </span>
                    </div>
                  )}
                  {terrainData.slope_mean && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Avg Slope</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {terrainData.slope_mean.toFixed(1)}°
                      </span>
                    </div>
                  )}
                  <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 mt-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Available
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No terrain analysis data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Land Suitability */}
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="w-5 h-5 text-blue-600" />
                Land Suitability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDetails ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : suitabilityData ? (
                <div className="space-y-2">
                  {suitabilityData.suitability_scores && (
                    <div className="space-y-1">
                      {Object.entries(suitabilityData.suitability_scores).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400 capitalize">{key.replace('_', ' ')}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {typeof value === 'number' ? value.toFixed(1) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 mt-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Available
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No suitability data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zoning Results */}
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building className="w-5 h-5 text-blue-600" />
                Zoning Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDetails ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : zoningData ? (
                <div className="space-y-2">
                  {zoningData.marla_summary && (
                    <div className="space-y-1">
                      {Object.entries(zoningData.marla_summary).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400 capitalize">{key}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 mt-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Available
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No zoning data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Read-Only Notice */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">View-Only Mode</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You are viewing this project in read-only mode. You can explore all project details, analytics, and reports, but cannot make any changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ViewerLayout>
  );
};

export default ViewerProjectDetail;

