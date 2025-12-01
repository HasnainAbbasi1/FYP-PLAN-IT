import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authenticatedFetch } from '@/utils/authHelper';
import { 
  Plus, 
  FolderOpen, 
  BarChart3, 
  Clock,
  MapPin,
  Building,
  Activity,
  TrendingUp,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  ArrowRight,
  Target,
  Map,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import ProjectActivityFeed from '../../components/projects/ProjectActivityFeed';
import ProjectWorkflowIndicator from '../../components/projects/ProjectWorkflowIndicator';
import { getProjectWorkflowStage } from '../../utils/projectWorkflow';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const PlannerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    projects, 
    loading: projectsLoading, 
    fetchProjects,
    currentProject,
    projectSessionState,
    setCurrentProject,
    lastVisitedRoute
  } = useProject();
  const [polygons, setPolygons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalArea: 0,
    recentProjects: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, [projects]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch polygons data
      const polygonsRes = await authenticatedFetch(`${API_BASE_URL}/api/polygon`).catch(() => ({ ok: false }));
      const polygonsData = polygonsRes.ok ? await polygonsRes.json() : [];
      const safePolygonsData = Array.isArray(polygonsData) ? polygonsData : [];
      
      setPolygons(safePolygonsData);

      // Calculate project statistics
      const totalProjects = projects.length;
      const activeProjects = projects.filter(project => project.status === 'Active' || project.status === 'In Progress').length;
      const completedProjects = projects.filter(project => project.status === 'Completed').length;
      
      // Calculate total area from polygons
      const totalArea = safePolygonsData.reduce((sum, polygon) => {
        const area = polygon.area_hectares || 0;
        return sum + area;
      }, 0);

      // Get recent projects (last 5)
      const recentProjects = projects
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        totalArea,
        recentProjects
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatus = (project) => {
    return project.status || 'Draft';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Active':
      case 'In Progress': return 'text-yellow-600 bg-yellow-100';
      case 'Draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getProjectProgress = (project) => {
    const projectPolygons = polygons.filter(polygon => polygon.project_id === project.id);
    if (projectPolygons.length === 0) return 0;
    
    // Simple progress calculation based on polygon analysis
    const analyzedPolygons = projectPolygons.filter(polygon => polygon.analysis_completed);
    return Math.round((analyzedPolygons.length / projectPolygons.length) * 100);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return CheckCircle;
      case 'In Progress': return PlayCircle;
      case 'Draft': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Get saved project state for "Continue where you left off"
  const getSavedProject = () => {
    if (!projectSessionState || !projects.length) return null;
    return projects.find(p => p.id === projectSessionState.projectId);
  };

  // Handle continue from where left off
  const handleContinueProject = () => {
    const savedProject = getSavedProject();
    if (savedProject) {
      setCurrentProject(savedProject, projectSessionState.route);
      navigate(projectSessionState.route || '/projects', { 
        state: { project: savedProject } 
      });
    }
  };

  // Get time since last session
  const getTimeSinceLastSession = () => {
    if (!projectSessionState?.timestamp) return null;
    const lastSession = new Date(projectSessionState.timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - lastSession);
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return lastSession.toLocaleDateString();
  };

  const navigateWithProject = (project, path, navState = {}) => {
    if (project) {
      setCurrentProject(project, path);
    }
    navigate(path, { state: navState });
  };

  const handleProjectClick = (project) => {
    const status = getProjectStatus(project);
    if (status === 'Draft') {
      // Navigate to terrain analysis
      navigateWithProject(project, '/terrain', { selectedPolygon: project });
    } else if (status === 'In Progress') {
      // Navigate to zoning page
      navigateWithProject(project, '/zoning', { polygonId: project.id });
    } else {
      // Navigate to zoning page to view completed project
      navigateWithProject(project, '/zoning', { polygonId: project.id });
    }
  };

  const plannerStats = [
    { 
      title: 'Total Projects', 
      value: loading ? '...' : stats.totalProjects.toString(), 
      icon: FolderOpen, 
      color: 'planner-stat-icon-blue',
      description: 'All projects'
    },
    { 
      title: 'Active Projects', 
      value: loading ? '...' : stats.activeProjects.toString(), 
      icon: Activity, 
      color: 'planner-stat-icon-yellow',
      description: 'Currently in progress'
    },
    { 
      title: 'Completed', 
      value: loading ? '...' : stats.completedProjects.toString(), 
      icon: CheckCircle, 
      color: 'planner-stat-icon-green',
      description: 'Finished projects'
    },
    { 
      title: 'Total Area', 
      value: loading ? '...' : `${stats.totalArea.toFixed(1)} ha`, 
      icon: MapPin, 
      color: 'planner-stat-icon-purple',
      description: 'Coverage area'
    }
  ];

  const planningTools = [
    { 
      title: 'Data Ingestion', 
      description: 'Upload and mark new project areas', 
      icon: Plus, 
      href: '/data-ingestion',
      gradient: 'from-blue-400/20 via-purple-400/20 to-blue-500/20',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    { 
      title: 'Terrain Analysis', 
      description: 'Analyze terrain and site conditions', 
      icon: Map, 
      href: '/terrain',
      gradient: 'from-green-400/20 via-emerald-400/20 to-green-500/20',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    { 
      title: 'Zoning Tool', 
      description: 'Create and manage zoning plans', 
      icon: Target, 
      href: '/zoning',
      gradient: 'from-purple-400/20 via-violet-400/20 to-purple-500/20',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    { 
      title: 'Suitability Analysis', 
      description: 'Assess land suitability', 
      icon: BarChart3, 
      href: '/suitability',
      gradient: 'from-orange-400/20 via-amber-400/20 to-orange-500/20',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <MainLayout>
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">🏗️ Planner Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and monitor your urban planning projects</p>
          </div>
          <Link to="/data-ingestion" className="bg-gradient-base text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:opacity-90 shadow-button transition-all duration-300 no-underline">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>

        {/* Continue Where You Left Off */}
        {projectSessionState && getSavedProject() && (
          <Card className="bg-white dark:bg-slate-800 border-2 border-accent-light-border dark:border-accent-dark-border shadow-card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-base"></div>
            <CardContent className="p-8 flex items-center justify-between gap-8">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-16 h-16 rounded-xl bg-gradient-base flex items-center justify-center shadow-button animate-pulse">
                  <RotateCcw className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold bg-gradient-base bg-clip-text text-transparent mb-2">Continue where you left off</h3>
                  <p className="text-base text-slate-600 dark:text-slate-300 mb-1">
                    You were working on <strong className="text-slate-800 dark:text-slate-100 font-bold">{projectSessionState.projectTitle}</strong>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    Last active: {getTimeSinceLastSession()}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleContinueProject}
                className="bg-gradient-base text-white hover:opacity-90 shadow-button px-6 py-3 rounded-lg font-semibold flex items-center gap-2 relative overflow-hidden"
                size="lg"
              >
                <BookOpen className="w-4 h-4" />
                Continue Project
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plannerStats.map((stat, index) => (
            <Card key={index} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.description}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${
                  stat.color === 'planner-stat-icon-blue' ? 'text-blue-500' :
                  stat.color === 'planner-stat-icon-yellow' ? 'text-yellow-500' :
                  stat.color === 'planner-stat-icon-green' ? 'text-green-500' :
                  'text-purple-500'
                }`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="bg-white dark:bg-slate-800 border border-accent-light-border dark:border-accent-dark-border shadow-card">
          <CardHeader className="p-8 pb-4 border-b border-accent-light-border dark:border-accent-dark-border">
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <Activity className="w-6 h-6 text-accent" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 mt-2">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link to="/data-ingestion" className="flex items-center gap-4 p-6 bg-white/5 dark:bg-white/5 border border-accent-light-border dark:border-accent-dark-border rounded-xl no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-accent-light-border dark:hover:border-accent-dark-border relative overflow-hidden group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-button group-hover:scale-105 transition-transform">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">New Project</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Start a new planning project</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-gradient-base group-hover:text-white group-hover:translate-x-1 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
              
              <Link to="/terrain" className="flex items-center gap-4 p-6 bg-white/5 dark:bg-white/5 border border-accent-light-border dark:border-accent-dark-border rounded-xl no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-accent-light-border dark:hover:border-accent-dark-border relative overflow-hidden group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-button group-hover:scale-105 transition-transform">
                  <Map className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Terrain Analysis</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Analyze site conditions</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-gradient-base group-hover:text-white group-hover:translate-x-1 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
              
              <Link to="/zoning" className="flex items-center gap-4 p-6 bg-white/5 dark:bg-white/5 border border-accent-light-border dark:border-accent-dark-border rounded-xl no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-accent-light-border dark:hover:border-accent-dark-border relative overflow-hidden group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-button group-hover:scale-105 transition-transform">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Zoning Tool</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Create zoning plans</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-gradient-base group-hover:text-white group-hover:translate-x-1 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
              
              <Link to="/suitability" className="flex items-center gap-4 p-6 bg-white/5 dark:bg-white/5 border border-accent-light-border dark:border-accent-dark-border rounded-xl no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-accent-light-border dark:hover:border-accent-dark-border relative overflow-hidden group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-button group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Suitability</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Assess land suitability</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-gradient-base group-hover:text-white group-hover:translate-x-1 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        {currentProject && (
          <div className="mb-6">
            <ProjectActivityFeed projectId={currentProject.id} limit={5} />
          </div>
        )}

        {/* Your Projects */}
        <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              <FolderOpen className="w-5 h-5" />
              Your Projects
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              {loading ? 'Loading projects...' : `${projects.length} total projects`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-4">Start by creating your first project</p>
                <Link to="/data-ingestion">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project, index) => {
                  const status = getProjectStatus(project);
                  const StatusIcon = getStatusIcon(status);
                  const progress = getProjectProgress(project);
                  return (
                    <div 
                      key={index} 
                      className="border border-accent-light-border dark:border-accent-dark-border rounded-lg p-4 hover:shadow-card-hover transition-all duration-300 cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                      onClick={() => handleProjectClick(project)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{project.title || `Project ${project.id}`}</h4>
                            <Badge className={getStatusColor(status)}>
                              <StatusIcon className="w-3 h-3 inline mr-1" />
                              {status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{project.description || 'No description available'}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{project.location || 'Location not set'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Created: {formatDate(project.created_at)}</span>
                            </div>
                          </div>
                          {/* Workflow Indicator */}
                          <div className="mb-2">
                            <ProjectWorkflowIndicator project={project} showProgress={false} />
                          </div>
                          
                          {progress > 0 && (
                            <div className="mb-2">
                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress indicator */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Project Progress</span>
                          <span>
                            {status === 'Draft' && '0%'}
                            {status === 'In Progress' && '50%'}
                            {status === 'Completed' && '100%'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              status === 'Draft' ? 'bg-gray-400 w-0' :
                              status === 'In Progress' ? 'bg-yellow-400 w-1/2' :
                              'bg-green-400 w-full'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planning Tools */}
        <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              <Building className="w-6 h-6 text-accent" />
              Planning Tools
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-base mt-1">Quick access to essential planning features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {planningTools.map((tool, index) => (
                <Link 
                  key={index} 
                  to={tool.href} 
                  className={`group relative bg-gradient-to-br ${tool.gradient} rounded-xl p-6 border border-white/20 dark:border-slate-700/30 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] no-underline overflow-hidden`}
                >
                  <div className="relative z-10">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${tool.iconBg} mb-4`}>
                      <tool.icon className={`w-5 h-5 ${tool.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-accent transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-2xl"></div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PlannerDashboard;