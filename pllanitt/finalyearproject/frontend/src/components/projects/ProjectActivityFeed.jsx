import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Activity } from 'lucide-react';
import { getProjectActivities, formatActivity } from '@/utils/projectActivity';

const ProjectActivityFeed = ({ projectId, limit = 5 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (projectId) {
      const fetchActivities = async () => {
        try {
          setLoading(true);
          const projectActivities = await getProjectActivities(projectId, limit);
          // Ensure projectActivities is an array
          const activitiesArray = Array.isArray(projectActivities) ? projectActivities : [];
          const formatted = activitiesArray.map(formatActivity).filter(Boolean);
          setActivities(formatted);
        } catch (error) {
          console.error('Error fetching project activities:', error);
          setActivities([]);
        } finally {
          setLoading(false);
        }
      };
      fetchActivities();
    } else {
      setActivities([]);
      setLoading(false);
    }
  }, [projectId, limit]);
  
  if (!projectId) return null;
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading activities...</div>
        </CardContent>
      </Card>
    );
  }
  
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">No recent activity</div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={index} className="activity-item flex items-start gap-3 pb-3 border-b last:border-0">
              <div className="activity-icon flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="activity-content flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {activity.userName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {activity.action}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-xs text-gray-600 mb-1">{activity.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{activity.timeAgo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectActivityFeed;


