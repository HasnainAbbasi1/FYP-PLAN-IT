import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Settings, 
  Shield, 
  BarChart3, 
  UserPlus, 
  Database,
  Activity,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import adminApiService from '@/services/adminApi';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        setStatsError(null);
        const response = await adminApiService.getAdminStats();

        if (response?.success && isMounted) {
          setStats(response.data);
        } else if (isMounted) {
          setStatsError('Could not load admin statistics.');
        }
      } catch (error) {
        if (isMounted) {
          setStatsError(error.message || 'Failed to load admin statistics.');
        }
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = useMemo(() => ([
    { title: 'Total Users', value: stats?.totalUsers ?? '--', icon: Users, color: 'admin-stat-icon-blue' },
    { title: 'Active Users', value: stats?.activeUsers ?? '--', icon: Shield, color: 'admin-stat-icon-emerald' },
    { title: 'Projects', value: stats?.totalProjects ?? '--', icon: Database, color: 'admin-stat-icon-green' },
    { title: 'Polygons', value: stats?.totalPolygons ?? '--', icon: Activity, color: 'admin-stat-icon-yellow' }
  ]), [stats]);
  
  const recentActivity = useMemo(() => ([
    {
      label: 'New users',
      value: stats?.recentActivity?.newUsers ?? 0,
      colorClass: 'admin-activity-dot-green',
      description: 'Joined in the last 7 days'
    },
    {
      label: 'New projects',
      value: stats?.recentActivity?.newProjects ?? 0,
      colorClass: 'admin-activity-dot-blue',
      description: 'Created in the last 7 days'
    },
    {
      label: 'Analyses run',
      value: stats?.totalAnalyses ?? 0,
      colorClass: 'admin-activity-dot-yellow',
      description: 'Terrain and suitability analyses'
    }
  ]), [stats]);

  const quickActions = [
    { title: 'Manage Users', description: 'Add, edit, or remove users', icon: Users, href: '/users' },
    { title: 'System Settings', description: 'Configure system preferences', icon: Settings, href: '/settings' },
    { title: 'User Permissions', description: 'Manage roles and permissions', icon: Shield, href: '/permissions' },
    { title: 'Analytics', description: 'View system analytics', icon: BarChart3, href: '/analytics' }
  ];

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-base bg-clip-text text-transparent mb-2">Admin Dashboard</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Manage your system and users</p>
          </div>
          <div className="flex gap-3">
            <Link to="/users">
              <Button className="bg-gradient-base text-white hover:opacity-90 shadow-button px-6 py-3 rounded-lg font-semibold flex items-center gap-2 relative overflow-hidden">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <Card className="bg-white dark:bg-slate-800 border border-accent-light-border dark:border-accent-dark-border shadow-card">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-100">Welcome back, {user?.name || 'Admin'}</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Administrator'} · {user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Member since</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Last login</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Just now'}
              </p>
            </div>
          </CardContent>
        </Card>

        {statsError && (
          <Alert variant="destructive">
            <AlertDescription>{statsError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className="bg-white dark:bg-slate-800 border border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-base"></div>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{stat.title}</p>
                  <p className="text-4xl font-extrabold bg-gradient-base bg-clip-text text-transparent mt-2 leading-none">
                    {loadingStats ? (
                      <Loader2 className="h-8 w-8 text-accent animate-spin" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${
                  stat.color === 'admin-stat-icon-blue' ? 'text-blue-500' :
                  stat.color === 'admin-stat-icon-green' ? 'text-green-500' :
                  stat.color === 'admin-stat-icon-emerald' ? 'text-emerald-500' :
                  'text-yellow-500'
                }`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.href} className="no-underline animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <Card className="bg-white dark:bg-slate-800 border border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-base opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <CardHeader className="p-6 pb-3 relative z-10">
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <action.icon className="h-5 w-5 text-accent" />
                    {action.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">{action.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent System Activity</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Live metrics from the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-accent-light/50 dark:bg-accent-dark/50">
                <div className={`h-2 w-2 rounded-full ${
                  activity.colorClass === 'admin-activity-dot-green' ? 'bg-green-500' :
                  activity.colorClass === 'admin-activity-dot-blue' ? 'bg-blue-500' :
                  'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {loadingStats ? (
                      <Loader2 className="h-4 w-4 text-yellow-500 animate-spin inline" />
                    ) : (
                      `${activity.value} ${activity.label.toLowerCase()}`
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{activity.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;