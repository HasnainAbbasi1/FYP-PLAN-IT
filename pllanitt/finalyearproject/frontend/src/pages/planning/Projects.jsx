import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  SortAsc, 
  SortDesc,
  RefreshCw,
  AlertCircle,
  Info,
  CheckCircle,
  Upload
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import ProjectCard from '../../components/projects/ProjectCard';
import CreateProjectModal from '../../components/projects/CreateProjectModal';
import CSVImportModal from '../../components/admin/CSVImportModal';
import { getLastActivity, formatActivity } from '../../utils/projectActivity';
import { RotateCcw, BookOpen, ArrowRight } from 'lucide-react';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { handleError } from '../../utils/errorHandler';
import Pagination from '../../components/common/Pagination';
import AdvancedSearch from '../../components/search/AdvancedSearch';
import { exportProjects } from '../../utils/dataExport';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initAccessibility } from '../../utils/accessibility';

const Projects = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    projects, 
    loading, 
    error, 
    stats,
    createProject,
    currentProject,
    projectSessionState,
    fetchProjects, 
    deleteProject,
    searchProjects,
    getProjectsByStatus,
    clearError,
    setCurrentProject
  } = useProject();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [recentProject, setRecentProject] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [savedSearchPresets, setSavedSearchPresets] = useState([]);
  const [advancedSearchCriteria, setAdvancedSearchCriteria] = useState(null);
  
  // Initialize accessibility on mount
  useEffect(() => {
    initAccessibility();
  }, []);
  
  // Check if user was redirected here because they need to select a project
  const requireProjectMessage = location.state?.requireProject;
  const redirectFrom = location.state?.from;
  
  // Get recent project for "Continue where you left off"
  useEffect(() => {
    if (projectSessionState?.projectId && projects.length > 0) {
      const savedProject = projects.find(p => p.id === projectSessionState.projectId);
      if (savedProject) {
        getLastActivity(savedProject.id).then(activity => {
          setRecentProject({
            project: savedProject,
            activity: activity ? formatActivity(activity) : null,
            route: projectSessionState.route
          });
        }).catch(() => {
          // Silently handle errors
          setRecentProject({
            project: savedProject,
            activity: null,
            route: projectSessionState.route
          });
        });
      }
    }
  }, [projectSessionState, projects]);
  
  // Load saved search presets
  useEffect(() => {
    const presets = JSON.parse(localStorage.getItem('searchPresets') || '[]');
    setSavedSearchPresets(presets);
  }, []);

  // Filter and sort projects
  useEffect(() => {
    let filtered = projects || [];
    
    // Apply advanced search criteria if available
    if (advancedSearchCriteria) {
      // Apply query
      if (advancedSearchCriteria.query) {
        filtered = searchProjects(advancedSearchCriteria.query);
      }
      
      // Apply status filters
      if (advancedSearchCriteria.status && advancedSearchCriteria.status.length > 0) {
        filtered = filtered.filter(project => 
          advancedSearchCriteria.status.includes(project.status)
        );
      }
      
      // Apply date range
      if (advancedSearchCriteria.dateRange?.start || advancedSearchCriteria.dateRange?.end) {
        filtered = filtered.filter(project => {
          const projectDate = new Date(project.createdAt || 0);
          const start = advancedSearchCriteria.dateRange.start 
            ? new Date(advancedSearchCriteria.dateRange.start) 
            : null;
          const end = advancedSearchCriteria.dateRange.end 
            ? new Date(advancedSearchCriteria.dateRange.end) 
            : null;
          
          if (start && projectDate < start) return false;
          if (end && projectDate > end) return false;
          return true;
        });
      }
      
      // Apply progress range
      if (advancedSearchCriteria.progressRange) {
        filtered = filtered.filter(project => {
          const progress = project.progress || 0;
          return progress >= advancedSearchCriteria.progressRange.min &&
                 progress <= advancedSearchCriteria.progressRange.max;
        });
      }
    } else {
      // Apply basic search
      if (searchQuery) {
        filtered = searchProjects(searchQuery);
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(project => 
          project.status?.toLowerCase() === statusFilter.toLowerCase()
        );
      }
      
      // Apply type filter
      if (typeFilter !== 'all') {
        filtered = filtered.filter(project => 
          project.type?.toLowerCase() === typeFilter.toLowerCase()
        );
      }
      
      // Apply priority filter
      if (priorityFilter !== 'all') {
        filtered = filtered.filter(project => 
          project.priority?.toLowerCase() === priorityFilter.toLowerCase()
        );
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'created':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'updated':
          aValue = new Date(a.updatedAt || a.createdAt || 0);
          bValue = new Date(b.updatedAt || b.createdAt || 0);
          break;
        case 'progress':
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
        case 'priority':
          const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredProjects(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [projects, searchQuery, statusFilter, typeFilter, priorityFilter, sortBy, sortOrder, searchProjects, advancedSearchCriteria]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredProjects.length / itemsPerPage);
  }, [filteredProjects.length, itemsPerPage]);
  
  // Calculate paginated projects
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProjects.slice(startIndex, endIndex);
  }, [filteredProjects, currentPage, itemsPerPage]);
  
  const handleDeleteProject = async (project) => {
    if (window.confirm(`Are you sure you want to delete "${project.title}"? This action cannot be undone.`)) {
      try {
        await deleteProject(project.id);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };
  
  const handleEditProject = (project) => {
    setSelectedProject(project);
    setIsCreateModalOpen(true);
  };

  const handleRefresh = () => {
    fetchProjects();
  };

  // Handle project selection - make it the current project
  const handleSelectProject = (project) => {
    setCurrentProject(project);
    // If user was redirected here, navigate back to where they came from
    if (redirectFrom) {
      navigate(redirectFrom.pathname || '/dashboard', { replace: true });
    }
  };
  
  // Handle continue from where left off
  const handleContinueProject = () => {
    if (recentProject) {
      setCurrentProject(recentProject.project, recentProject.route);
      navigate(recentProject.route || '/dashboard', { 
        state: { project: recentProject.project } 
      });
    }
  };
  
  const getUniqueTypes = () => {
    if (!projects || !Array.isArray(projects)) return [];
    const types = [...new Set(projects.map(p => p.type).filter(Boolean))];
    return types.sort();
  };
  
  const getStatusCounts = () => {
    const counts = {};
    if (!projects || !Array.isArray(projects)) return counts;
    projects.forEach(project => {
      const status = project.status || 'Planning';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  // Compute status counts for display
  const statusCounts = useMemo(() => getStatusCounts(), [projects]);
  const inProgressCount = useMemo(() => statusCounts['In Progress'] || 0, [statusCounts]);
  const completedCount = useMemo(() => statusCounts['Completed'] || 0, [statusCounts]);
  const planningCount = useMemo(() => statusCounts['Planning'] || 0, [statusCounts]);

  const handleExportProjects = (format = 'csv') => {
    try {
      exportProjects(filteredProjects, format);
      toast({
        title: 'Export Successful',
        description: `Projects exported as ${format.toUpperCase()}`,
        variant: 'default'
      });
    } catch (error) {
      handleError(error, toast, { context: 'export_projects' });
    }
  };

  const handleAdvancedSearch = (criteria) => {
    setAdvancedSearchCriteria(criteria);
  };

  const handleSaveSearchPreset = (name, criteria) => {
    const preset = { name, criteria, createdAt: new Date().toISOString() };
    const presets = [...savedSearchPresets, preset];
    setSavedSearchPresets(presets);
    localStorage.setItem('searchPresets', JSON.stringify(presets));
    toast({
      title: 'Preset Saved',
      description: `Search preset "${name}" saved successfully`,
      variant: 'default'
    });
  };

  const handleLoadSearchPreset = (preset) => {
    setAdvancedSearchCriteria(preset.criteria);
    toast({
      title: 'Preset Loaded',
      description: `Search preset "${preset.name}" loaded`,
      variant: 'default'
    });
  };

  const handleBulkImport = useCallback(async (projectsData) => {
    if (!projectsData || projectsData.length === 0) {
      toast({
        title: 'Import Failed',
        description: 'No valid projects to import',
        variant: 'destructive'
      });
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Import projects one by one
      for (const projectData of projectsData) {
        try {
          await createProject(projectData);
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push({
            title: projectData.title || 'Unknown Project',
            error: error.message || 'Failed to import'
          });
          console.error('Error importing project:', error);
        }
      }

      // Refresh projects list
      await fetchProjects();

      // Show results
      if (successCount > 0) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${successCount} project(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
          variant: 'default'
        });
      }

      if (errorCount > 0) {
        toast({
          title: 'Some Imports Failed',
          description: `${errorCount} project(s) failed to import. Check console for details.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      handleError(error, toast, { context: 'bulk_import' });
    }
  }, [createProject, fetchProjects, toast]);

  return (
    <MainLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">Projects</h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">Manage your urban planning projects</p>
          </div>
          <div className="flex gap-3 flex-shrink-0 sm:justify-stretch sm:flex-col">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {filteredProjects.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleExportProjects('csv')}
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              disabled={loading}
              className="bg-gradient-base text-white border-none py-3.5 px-7 rounded-xl font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(69,136,173,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(69,136,173,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6 mb-4 sm:grid-cols-2 xs:grid-cols-1">
          <Card className="p-8 text-center animate-fade-in-up sm:p-4" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-0">
              <div className="text-5xl font-extrabold text-slate-800 dark:text-slate-100 leading-none mb-3 hover:text-accent transition-colors sm:text-3xl">{stats.totalProjects || projects.length}</div>
              <div className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Projects</div>
            </CardContent>
          </Card>
          <Card className="p-8 text-center animate-fade-in-up sm:p-4" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-0">
              <div className="text-5xl font-extrabold text-slate-800 dark:text-slate-100 leading-none mb-3 hover:text-accent transition-colors sm:text-3xl">{inProgressCount}</div>
              <div className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">In Progress</div>
            </CardContent>
          </Card>
          <Card className="p-8 text-center animate-fade-in-up sm:p-4" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-0">
              <div className="text-5xl font-extrabold text-slate-800 dark:text-slate-100 leading-none mb-3 hover:text-accent transition-colors sm:text-3xl">{completedCount}</div>
              <div className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Completed</div>
            </CardContent>
          </Card>
          <Card className="p-8 text-center animate-fade-in-up sm:p-4" style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-0">
              <div className="text-5xl font-extrabold text-slate-800 dark:text-slate-100 leading-none mb-3 hover:text-accent transition-colors sm:text-3xl">{planningCount}</div>
              <div className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Planning</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="flex flex-col gap-6 p-6 animate-fade-in-up sm:gap-4" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-4 flex-1 sm:flex-col sm:gap-3">
            <div className="relative min-w-[300px] sm:min-w-0 sm:w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAdvancedSearchCriteria(null); // Clear advanced search when using basic search
                }}
                className="pl-10 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 font-medium focus:outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-800 focus:shadow-[0_0_0_3px_rgba(69,136,173,0.1)]"
                aria-label="Search projects"
              />
            </div>
            
            <AdvancedSearch
              onSearch={handleAdvancedSearch}
              onSavePreset={handleSaveSearchPreset}
              savedPresets={savedSearchPresets}
              onLoadPreset={handleLoadSearchPreset}
            />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-w-[140px] focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(var(--ring-rgb),0.1)]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in progress">In Progress</SelectItem>
                <SelectItem value="on hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="min-w-[140px] focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(var(--ring-rgb),0.1)]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {getUniqueTypes().map(type => (
                  <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="min-w-[140px] focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(var(--ring-rgb),0.1)]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 sm:flex-row sm:justify-between">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="min-w-[140px] focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(var(--ring-rgb),0.1)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="updated">Updated Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
            
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none border-none border-r border-border first:border-r"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Continue Where You Left Off */}
        {recentProject && !requireProjectMessage && (
          <Alert className="mb-6 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
            <RotateCcw className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-900 dark:text-purple-100">
              Continue where you left off
            </AlertTitle>
            <AlertDescription className="text-purple-800 dark:text-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <strong>{recentProject.project.title}</strong>
                  {recentProject.activity && (
                    <div className="text-xs mt-1">
                      Last activity: {recentProject.activity.displayText}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleContinueProject}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Project Selection Required Message */}
        {requireProjectMessage && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">
              Project Selection Required
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              {location.state?.message || 'Please select a project to access this feature. Click on a project below to select it.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Project Indicator */}
        {currentProject && !requireProjectMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900 dark:text-green-100">
              Current Project: {currentProject.title}
            </AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">
              You can now access all project-related features. To switch projects, select a different one below.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Projects Grid/List */}
        {loading ? (
          <CardSkeleton count={6} />
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
              <Plus className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No projects found</h3>
            <p className="text-muted-foreground max-w-[500px] leading-relaxed mb-6">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No projects match your current filters. Try adjusting your search criteria.'
                : 'Get started by creating your first urban planning project.'}
            </p>
            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-[repeat(auto-fill,minmax(550px,1fr))] gap-8 animate-fade-in items-stretch [&>*]:animate-fade-in-up [&>*]:h-full [&>*]:flex [&>*:nth-child(1)]:[animation-delay:0.1s] [&>*:nth-child(2)]:[animation-delay:0.2s] [&>*:nth-child(3)]:[animation-delay:0.3s] [&>*:nth-child(4)]:[animation-delay:0.4s] [&>*:nth-child(5)]:[animation-delay:0.5s] [&>*:nth-child(6)]:[animation-delay:0.6s] lg:grid-cols-[repeat(auto-fill,minmax(480px,1fr))] sm:grid-cols-1"
              : "flex flex-col gap-4"
            }>
              {paginatedProjects.map(project => (
              <div key={project.id} className="relative flex w-full h-full">
                <ProjectCard
                  project={project}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                />
                {/* Add Select Project button if not current project */}
                {currentProject?.id?.toString() !== project.id?.toString() && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg opacity-0 transition-opacity duration-300 z-10 hover:opacity-100">
                    <Button 
                      onClick={() => handleSelectProject(project)}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none py-3 px-6 rounded-lg font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(16,185,129,0.5)]"
                      size="lg"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Select This Project
                    </Button>
                  </div>
                )}
                {/* Show selected indicator */}
                {currentProject?.id?.toString() === project.id?.toString() && (
                  <div className="absolute top-4 right-4 z-[5] animate-fade-in">
                    <Badge className="bg-green-600 text-white px-3 py-2 text-sm font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Currently Selected
                    </Badge>
                  </div>
                )}
              </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredProjects.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
        
        {/* Create/Edit Project Modal */}
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
        />
        
        {/* CSV Import Modal */}
        <CSVImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleBulkImport}
        />
      </div>
    </MainLayout>
  );
};

export default Projects;