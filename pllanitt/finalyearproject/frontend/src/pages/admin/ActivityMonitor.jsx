import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, User, FileText, Database, Activity } from 'lucide-react';

const ActivityMonitor = () => {
  const recentActivities = [
    { id: 1, user: 'Admin User', action: 'Logged in', target: 'System', time: '2 minutes ago', type: 'auth' },
    { id: 2, user: 'John Planner', action: 'Created project', target: 'Project #45', time: '15 minutes ago', type: 'create' },
    { id: 3, user: 'Admin User', action: 'Updated user permissions', target: 'User #12', time: '1 hour ago', type: 'update' },
    { id: 4, user: 'Jane Viewer', action: 'Viewed report', target: 'Report #67', time: '2 hours ago', type: 'view' },
    { id: 5, user: 'System', action: 'Automatic backup completed', target: 'Database', time: '3 hours ago', type: 'system' }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'auth':
        return <User size={16} style={{ color: '#4588AD' }} />;
      case 'create':
        return <FileText size={16} style={{ color: '#10b981' }} />;
      case 'update':
        return <Activity size={16} style={{ color: '#f59e0b' }} />;
      case 'view':
        return <Eye size={16} style={{ color: '#8b5cf6' }} />;
      case 'system':
        return <Database size={16} style={{ color: '#64748b' }} />;
      default:
        return <Activity size={16} />;
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Activity Monitor</h1>
            <p className="text-base text-slate-500 mt-1">Real-time user and system activity</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] admin-grid-4">
          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
                  <Activity size={24} style={{ color: '#4588AD' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>247</div>
                  <div className="admin-stat-label">Activities Today</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '0.5rem' }}>
                  <User size={24} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>3</div>
                  <div className="admin-stat-label">Active Users</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                  <FileText size={24} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>12</div>
                  <div className="admin-stat-label">Actions/Hour</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#f3e8ff', borderRadius: '0.5rem' }}>
                  <Eye size={24} style={{ color: '#a855f7' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>89</div>
                  <div className="admin-stat-label">Page Views</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user and system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          {getActivityIcon(activity.type)}
                          <strong>{activity.user}</strong>
                        </div>
                      </td>
                      <td>{activity.action}</td>
                      <td>{activity.target}</td>
                      <td>{activity.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ActivityMonitor;

