import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getProjectWorkflowStage, getWorkflowProgress } from '@/utils/projectWorkflow';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';

const ProjectWorkflowIndicator = ({ project, showProgress = true }) => {
  const stage = getProjectWorkflowStage(project);
  const progress = getWorkflowProgress(project);
  
  const stages = [
    { id: 'draft', label: 'Draft', icon: '📝' },
    { id: 'terrain', label: 'Terrain', icon: '⛰️' },
    { id: 'suitability', label: 'Suitability', icon: '🗺️' },
    { id: 'zoning', label: 'Zoning', icon: '🏗️' },
    { id: 'completed', label: 'Completed', icon: '✅' }
  ];
  
  const currentIndex = stages.findIndex(s => s.id === stage.id);
  
  return (
    <div className="project-workflow-indicator">
      {showProgress && (
        <div className="workflow-progress-header mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Workflow Progress</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      <div className="workflow-stages flex items-center gap-2 flex-wrap">
        {stages.map((s, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;
          
          return (
            <React.Fragment key={s.id}>
              <div className={`workflow-stage flex items-center gap-1 ${
                isCompleted ? 'completed' : 
                isCurrent ? 'current' : 
                'upcoming'
              }`}>
                <div className={`stage-icon flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                  isCompleted ? 'bg-green-100 text-green-700' :
                  isCurrent ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : s.icon}
                </div>
                <span className={`text-xs font-medium ${
                  isCompleted ? 'text-green-700' :
                  isCurrent ? 'text-blue-700 font-semibold' :
                  'text-gray-400'
                }`}>
                  {s.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <ArrowRight className="w-3 h-3 text-gray-300" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {currentIndex >= 0 && (
        <div className="mt-2 text-xs text-blue-600">
          Current stage: {stage.label} - {stage.description}
        </div>
      )}
    </div>
  );
};

export default ProjectWorkflowIndicator;

