import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Activity, Database, Zap } from 'lucide-react';

const AdminAnalytics = () => {
  const analyticsData = {
    totalRequests: 45678,
    avgResponseTime: '245ms',
    errorRate: '0.12%',
    uptime: '99.98%'
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Analytics Dashboard</h1>
            <p className="text-base text-slate-500 mt-1">System-wide analytics and insights</p>
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
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>{analyticsData.totalRequests.toLocaleString()}</div>
                  <div className="admin-stat-label">Total Requests</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '0.5rem' }}>
                  <Zap size={24} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>{analyticsData.avgResponseTime}</div>
                  <div className="admin-stat-label">Avg Response Time</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                  <TrendingUp size={24} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>{analyticsData.errorRate}</div>
                  <div className="admin-stat-label">Error Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
                  <Database size={24} style={{ color: '#22c55e' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>{analyticsData.uptime}</div>
                  <div className="admin-stat-label">System Uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Analytics</CardTitle>
            <CardDescription>Detailed performance and usage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <BarChart3 size={48} style={{ marginRight: '1rem' }} />
              <div>
                <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#64748b' }}>Analytics Chart Placeholder</p>
                <p style={{ fontSize: '0.875rem' }}>Connect to analytics service for detailed charts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;

