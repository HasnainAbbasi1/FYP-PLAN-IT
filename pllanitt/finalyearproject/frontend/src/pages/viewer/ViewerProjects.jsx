import React, { useState, useMemo } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Map, 
  Search,
  Filter,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProjectWorkflowStage, getWorkflowProgress } from '../../utils/projectWorkflow';
import { Progress } from '@/components/ui/progress';

const ViewerProjects = () => {
  const { projects, loading } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const filteredProjects = useMemo(() => {
    let filtered = projects || [];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(project => 
        (project.title || project.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => 
        (project.status || '').toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Sort
    if (sortBy === 'recent') {
      filtered = [...filtered].sort((a, b) => 
        new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
      );
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => 
        (a.title || a.name || '').localeCompare(b.title || b.name || '')
      );
    }

    return filtered;
  }, [projects, searchQuery, statusFilter, sortBy]);

  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('completed')) {
      return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    } else if (statusLower.includes('progress') || statusLower.includes('active')) {
      return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
    } else if (statusLower.includes('planning')) {
      return <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"><AlertCircle className="w-3 h-3 mr-1" />Planning</Badge>;
    }
    return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  };

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              View Projects
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Explore all available urban planning projects
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <Map className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Projects Found</h3>
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No projects match your search criteria.' : 'No projects available to view.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Link
                key={project.id || project._id}
                to={`/viewer/projects/${project.id || project._id}`}
                className="no-underline group"
              >
                <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden relative h-full">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                        <Map className="h-5 w-5 text-white" />
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                    <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                      {project.title || project.name || 'Untitled Project'}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {project.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-3">
                      {/* Progress */}
                      {project.progress !== undefined && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500 dark:text-slate-400">Progress</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-1.5" />
                        </div>
                      )}
                      
                      {/* Project Info */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        {project.location && (
                          <div className="flex items-center gap-1">
                            <Map className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{project.location}</span>
                          </div>
                        )}
                        {project.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(project.created_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Workflow Stage */}
                      {(() => {
                        const workflowStage = getProjectWorkflowStage(project);
                        return workflowStage ? (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Stage</p>
                            <Badge variant="outline" className="text-xs">
                              {workflowStage.label}
                            </Badge>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                      <span className="text-xs text-slate-500 dark:text-slate-400">View Details</span>
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Stats */}
        {filteredProjects.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Projects</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{filteredProjects.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerProjects;

