import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MapPin,
  Calendar,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Map,
  Clock,
  DollarSign,
  Tag,
  PlayCircle,
  Pause,
  CheckCircle,
  Upload,
  Database
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProjectWorkflowIndicator from './ProjectWorkflowIndicator';
import { getProjectWorkflowStage, getNextAction } from '../../utils/projectWorkflow';
import { getLastActivity, formatActivity } from '../../utils/projectActivity';

const ProjectCard = ({ project, onEdit, onDelete }) => {
  const { updateProjectStatus, setCurrentProject } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastActivity, setLastActivity] = useState(null);
  
  // Get workflow stage and last activity
  const workflowStage = getProjectWorkflowStage(project);
  const nextAction = getNextAction(project);
  
  // Load last activity
  React.useEffect(() => {
    if (project?.id) {
      getLastActivity(project.id).then(activity => {
        if (activity) {
          setLastActivity(formatActivity(activity));
        }
      }).catch(() => {
        // Silently handle errors
      });
    }
  }, [project?.id]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'planning': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'on hold': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setIsUpdating(true);
      await updateProjectStatus(project.id, newStatus);
    } catch (error) {
      console.error('Error updating project status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewProject = () => {
    setCurrentProject(project, `/projects/${project.id}`);
    navigate(`/projects/${project.id}`);
  };

  const handleOpenInMap = () => {
    setCurrentProject(project, '/editor');
    navigate('/editor', { state: { projectId: project.id, project: project } });
  };

  const handleDataIngestion = () => {
    setCurrentProject(project, '/data-ingestion');
    navigate('/data-ingestion', { state: { projectId: project.id, project: project } });
  };

  const handleSelectProject = () => {
    setCurrentProject(project, window.location.pathname);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatBudget = (budget) => {
    if (!budget) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(budget);
  };

  const getProgressColor = (progress) => {
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-yellow-500';
    if (progress < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <Card className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 ease-in-out h-full min-h-[550px] flex flex-col hover:-translate-y-0.5 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] animate-slide-up">
      <div className="relative h-40 min-h-40 bg-gradient-base flex items-center justify-center flex-shrink-0">
        <Map className="w-12 h-12 text-white opacity-80" />
        <div className="absolute top-4 right-4">
          <Badge className={`text-xs font-medium px-2 py-1 rounded-md ${getStatusColor(project.status)}`}>
            {project.status || 'Planning'}
          </Badge>
        </div>
      </div>

      <CardHeader className="p-4 border-b border-border flex-shrink-0">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground mb-1 leading-tight">{project.title}</CardTitle>
            <CardDescription className="text-muted-foreground text-sm leading-tight line-clamp-2">
              {project.description}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleViewProject}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenInMap}>
                <Map className="w-4 h-4 mr-2" />
                Open in Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSelectProject}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Select Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDataIngestion}>
                <Database className="w-4 h-4 mr-2" />
                Data Ingestion
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(project)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => handleStatusChange('In Progress')}
                disabled={isUpdating}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Progress
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleStatusChange('On Hold')}
                disabled={isUpdating}
              >
                <Pause className="w-4 h-4 mr-2" />
                Put On Hold
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleStatusChange('Completed')}
                disabled={isUpdating}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(project)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4 flex-1 justify-between">
        {/* Project Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-accent-light dark:bg-accent-dark border border-accent-light-border dark:border-accent-dark-border rounded-[0.625rem] mb-2 sm:grid-cols-1 sm:gap-2">
          <div className="flex items-center gap-2 text-sm py-1">
            <MapPin className="w-4 h-4 text-accent dark:text-accent flex-shrink-0" />
            <span className="text-foreground overflow-hidden text-ellipsis whitespace-nowrap font-medium">{project.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm py-1">
            <Calendar className="w-4 h-4 text-accent dark:text-accent flex-shrink-0" />
            <span className="text-foreground overflow-hidden text-ellipsis whitespace-nowrap font-medium">{formatDate(project.startDate)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm py-1">
            <Users className="w-4 h-4 text-accent dark:text-accent flex-shrink-0" />
            <span className="text-foreground overflow-hidden text-ellipsis whitespace-nowrap font-medium">{project.teamMembers?.length || 1} members</span>
          </div>
          
          {project.budget && (
            <div className="flex items-center gap-2 text-sm py-1">
              <DollarSign className="w-4 h-4 text-accent dark:text-accent flex-shrink-0" />
              <span className="text-foreground overflow-hidden text-ellipsis whitespace-nowrap font-medium">{formatBudget(project.budget)}</span>
            </div>
          )}
        </div>

        {/* Workflow Indicator */}
        <div className="p-3 bg-muted rounded-lg mb-3">
          <ProjectWorkflowIndicator project={project} showProgress={false} />
        </div>
        
        {/* Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Progress</span>
            <span className="text-sm font-semibold text-primary">{project.progress || 0}%</span>
          </div>
          <Progress 
            value={project.progress || 0} 
            className="h-2 bg-muted rounded"
          />
        </div>
        
        {/* Next Action Hint */}
        {nextAction && workflowStage.id !== 'completed' && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
            <strong>Next:</strong> {nextAction}
          </div>
        )}
        
        {/* Last Activity */}
        {lastActivity && (
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{lastActivity.displayText}</span>
          </div>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="w-3 h-3" />
            <div className="flex flex-wrap gap-1 flex-1">
              {project.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground border-border">
                  {tag}
                </Badge>
              ))}
              {project.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground border-border">
                  +{project.tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Priority and Type */}
        <div className="flex justify-between items-center gap-4 text-sm sm:flex-col sm:items-start sm:gap-2">
          {project.priority && (
            <div className="flex gap-1">
              <span className="text-muted-foreground">Priority:</span>
              <span className={`font-medium text-foreground ${getPriorityColor(project.priority)}`}>
                {project.priority}
              </span>
            </div>
          )}
          
          {project.type && (
            <div className="flex gap-1">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium text-foreground">{project.type}</span>
            </div>
          )}
        </div>

        {/* Team Members Preview */}
        {project.teamMembers && project.teamMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Team:</span>
            <div className="flex items-center -space-x-1">
              {project.teamMembers.slice(0, 4).map((member, index) => (
                <Avatar key={member.id || index} className="w-7 h-7 border-2 border-card first:ml-0">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>
                    {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.teamMembers.length > 4 && (
                <div className="flex items-center justify-center w-7 h-7 bg-muted text-muted-foreground rounded-full text-xs font-medium -ml-1 border-2 border-card">
                  +{project.teamMembers.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-border flex-shrink-0 sm:flex-col">
          <Button variant="outline" size="sm" onClick={handleViewProject} className="flex-1 text-sm">
            View Details
          </Button>
          <Button size="sm" onClick={handleDataIngestion} className="flex-1 text-sm bg-gradient-base text-white border-none transition-all duration-200 ease-in-out font-montserrat hover:bg-gradient-base-hover hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(69,136,173,0.4)] active:translate-y-0">
            <Database className="w-4 h-4 mr-1" />
            Data Ingestion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
