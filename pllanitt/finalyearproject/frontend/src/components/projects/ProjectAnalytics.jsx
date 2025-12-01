import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Target, Clock } from 'lucide-react';
import { getProjectWorkflowStage, getWorkflowProgress } from '@/utils/projectWorkflow';

const ProjectAnalytics = ({ project, polygons = [], activities = [] }) => {
  if (!project) return null;
  
  const workflowStage = getProjectWorkflowStage(project);
  const workflowProgress = getWorkflowProgress(project);
  const projectProgress = project.progress || 0;
  
  // Calculate statistics
  const totalPolygons = polygons.length;
  const analyzedPolygons = polygons.filter(p => p.analysis_completed).length;
  const recentActivities = activities.length;
  
  // Calculate time metrics
  const createdDate = new Date(project.createdAt || project.created_at);
  const daysSinceCreation = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
  
  const stats = [
    {
      label: 'Workflow Progress',
      value: `${workflowProgress}%`,
      icon: Target,
      color: 'blue',
      description: `Currently at ${workflowStage.label} stage`
    },
    {
      label: 'Project Progress',
      value: `${projectProgress}%`,
      icon: TrendingUp,
      color: 'green',
      description: 'Overall completion'
    },
    {
      label: 'Polygons',
      value: `${analyzedPolygons}/${totalPolygons}`,
      icon: BarChart3,
      color: 'purple',
      description: totalPolygons > 0 ? `${Math.round((analyzedPolygons / totalPolygons) * 100)}% analyzed` : 'No polygons'
    },
    {
      label: 'Days Active',
      value: daysSinceCreation,
      icon: Clock,
      color: 'orange',
      description: 'Since creation'
    }
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Project Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600',
              green: 'bg-green-100 text-green-600',
              purple: 'bg-purple-100 text-purple-600',
              orange: 'bg-orange-100 text-orange-600'
            };
            return (
              <div key={index} className="analytics-stat">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${colorClasses[stat.color] || colorClasses.blue}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">{stat.label}</div>
                    <div className="text-lg font-semibold">{stat.value}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">{stat.description}</div>
                {stat.label === 'Workflow Progress' && (
                  <Progress value={workflowProgress} className="mt-2 h-2" />
                )}
                {stat.label === 'Project Progress' && (
                  <Progress value={projectProgress} className="mt-2 h-2" />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Workflow Stage Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-1">
            Current Stage: {workflowStage.label}
          </div>
          <div className="text-xs text-gray-500">
            {workflowStage.description}
          </div>
          {workflowStage.nextStage && (
            <div className="text-xs text-blue-600 mt-1">
              Next: {workflowStage.nextStage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectAnalytics;

