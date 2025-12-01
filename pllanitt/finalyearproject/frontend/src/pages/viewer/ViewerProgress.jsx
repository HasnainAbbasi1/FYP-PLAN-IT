import React, { useMemo } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  BarChart3,
  Eye
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { Link } from 'react-router-dom';
import { getProjectWorkflowStage, getWorkflowProgress } from '../../utils/projectWorkflow';

const ViewerProgress = () => {
  const { projects, loading } = useProject();

  const progressData = useMemo(() => {
    if (!projects || projects.length === 0) return null;

    const total = projects.length;
    const completed = projects.filter(p => (p.status || '').toLowerCase().includes('completed')).length;
    const inProgress = projects.filter(p => 
      (p.status || '').toLowerCase().includes('progress') || 
      (p.status || '').toLowerCase().includes('active')
    ).length;
    const planning = projects.filter(p => (p.status || '').toLowerCase().includes('planning')).length;
    const onHold = projects.filter(p => (p.status || '').toLowerCase().includes('hold')).length;

    const avgProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0) / total;
    
    const projectsByMonth = projects.reduce((acc, p) => {
      if (p.created_at || p.createdAt) {
        const date = new Date(p.created_at || p.createdAt);
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      total,
      completed,
      inProgress,
      planning,
      onHold,
      avgProgress: Math.round(avgProgress),
      projectsByMonth,
      recentProjects: projects
        .sort((a, b) => new Date(b.updated_at || b.updatedAt || 0) - new Date(a.updated_at || a.updatedAt || 0))
        .slice(0, 5)
    };
  }, [projects]);

  const getStatusIcon = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('completed')) return CheckCircle;
    if (statusLower.includes('progress') || statusLower.includes('active')) return Clock;
    if (statusLower.includes('planning')) return AlertCircle;
    return Target;
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('completed')) return 'text-green-600 dark:text-green-400';
    if (statusLower.includes('progress') || statusLower.includes('active')) return 'text-blue-600 dark:text-blue-400';
    if (statusLower.includes('planning')) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              Progress Overview
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Track and monitor project progress across all initiatives
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading progress data...</p>
          </div>
        ) : !progressData ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Progress Data</h3>
              <p className="text-slate-500 dark:text-slate-400">No project data available to display progress.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Total Projects</p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{progressData.total}</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {progressData.completed}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Completed</p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                    {Math.round((progressData.completed / progressData.total) * 100)}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                      {progressData.inProgress}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                    {Math.round((progressData.inProgress / progressData.total) * 100)}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {progressData.avgProgress}%
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Avg. Progress</p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{progressData.avgProgress}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Status Breakdown
                </CardTitle>
                <CardDescription>Distribution of projects by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Completed
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {progressData.completed} ({Math.round((progressData.completed / progressData.total) * 100)}%)
                      </span>
                    </div>
                    <Progress value={(progressData.completed / progressData.total) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        In Progress
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {progressData.inProgress} ({Math.round((progressData.inProgress / progressData.total) * 100)}%)
                      </span>
                    </div>
                    <Progress value={(progressData.inProgress / progressData.total) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        Planning
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {progressData.planning} ({Math.round((progressData.planning / progressData.total) * 100)}%)
                      </span>
                    </div>
                    <Progress value={(progressData.planning / progressData.total) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Projects Progress */}
            {progressData.recentProjects.length > 0 && (
              <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Recent Project Updates
                  </CardTitle>
                  <CardDescription>Latest project progress updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progressData.recentProjects.map((project) => {
                      const StatusIcon = getStatusIcon(project.status);
                      const statusColor = getStatusColor(project.status);
                      const workflowStage = getProjectWorkflowStage(project);
                      const workflowProgress = getWorkflowProgress(project);
                      return (
                        <Link
                          key={project.id || project._id}
                          to={`/viewer/projects/${project.id || project._id}`}
                          className="block no-underline"
                        >
                          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                                <div>
                                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                                    {project.title || project.name || 'Untitled Project'}
                                  </h4>
                                  {workflowStage && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      Stage: {workflowStage.label}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Badge>
                            </div>
                            <div className="mt-3 space-y-2">
                              <div>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-slate-500 dark:text-slate-400">Project Progress</span>
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {project.progress || 0}%
                                  </span>
                                </div>
                                <Progress value={project.progress || 0} className="h-2" />
                              </div>
                              {workflowProgress > 0 && (
                                <div>
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-slate-500 dark:text-slate-400">Workflow Progress</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                      {workflowProgress}%
                                    </span>
                                  </div>
                                  <Progress value={workflowProgress} className="h-2" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                              {project.location && (
                                <span className="truncate max-w-[150px]">{project.location}</span>
                              )}
                              {project.updated_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Updated: {new Date(project.updated_at).toLocaleDateString()}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerProgress;

