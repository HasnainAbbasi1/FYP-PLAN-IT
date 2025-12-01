import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Activity, Zap, Clock } from 'lucide-react';

const PerformanceMetrics = () => {
  const metrics = {
    apiResponseTime: '245ms',
    databaseQueryTime: '45ms',
    pageLoadTime: '1.2s',
    throughput: '1,234 req/min'
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Performance Metrics</h1>
            <p className="text-base text-slate-500 mt-1">Real-time performance monitoring</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] admin-grid-4">
          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
                  <Zap size={24} style={{ color: '#4588AD' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>{metrics.apiResponseTime}</div>
                  <div className="admin-stat-label">API Response</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '0.5rem' }}>
                  <Activity size={24} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>{metrics.databaseQueryTime}</div>
                  <div className="admin-stat-label">DB Query Time</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                  <Clock size={24} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>{metrics.pageLoadTime}</div>
                  <div className="admin-stat-label">Page Load Time</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#f3e8ff', borderRadius: '0.5rem' }}>
                  <TrendingUp size={24} style={{ color: '#a855f7' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>{metrics.throughput}</div>
                  <div className="admin-stat-label">Throughput</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Historical performance data</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <TrendingUp size={48} style={{ marginRight: '1rem' }} />
              <div>
                <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#64748b' }}>Performance Chart Placeholder</p>
                <p style={{ fontSize: '0.875rem' }}>Connect to monitoring service for real-time metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default PerformanceMetrics;

