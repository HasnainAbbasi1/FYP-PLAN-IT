import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, XCircle, AlertCircle, Activity } from 'lucide-react';

const ErrorTracking = () => {
  const errors = [
    { id: 1, type: 'critical', message: 'Database connection timeout', count: 3, lastOccurred: '5 minutes ago', status: 'active' },
    { id: 2, type: 'error', message: 'API request failed: 500 Internal Server Error', count: 12, lastOccurred: '15 minutes ago', status: 'active' },
    { id: 3, type: 'warning', message: 'High memory usage detected', count: 5, lastOccurred: '1 hour ago', status: 'resolved' },
    { id: 4, type: 'error', message: 'Failed to process terrain analysis', count: 2, lastOccurred: '2 hours ago', status: 'investigating' }
  ];

  const getErrorIcon = (type) => {
    switch (type) {
      case 'critical':
        return <XCircle size={18} style={{ color: '#ef4444' }} />;
      case 'error':
        return <AlertCircle size={18} style={{ color: '#f59e0b' }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: '#eab308' }} />;
      default:
        return <Activity size={18} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#ef4444';
      case 'investigating':
        return '#f59e0b';
      case 'resolved':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Error Tracking</h1>
            <p className="text-base text-slate-500 mt-1">Monitor and track system errors</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem' }}>
                  <XCircle size={24} style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>3</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Critical Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: '0.5rem' }}>
                  <AlertCircle size={24} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>14</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Total Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fefce8', borderRadius: '0.5rem' }}>
                  <AlertTriangle size={24} style={{ color: '#eab308' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>5</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Warnings</div>
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
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>8</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Resolved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>Track and manage system errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-300">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Error Message</th>
                    <th>Count</th>
                    <th>Last Occurred</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((error) => (
                    <tr key={error.id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm text-slate-500 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          {getErrorIcon(error.type)}
                          <span style={{ 
                            fontWeight: 600, 
                            textTransform: 'uppercase', 
                            fontSize: '0.75rem',
                            color: error.type === 'critical' ? '#ef4444' : error.type === 'error' ? '#f59e0b' : '#eab308'
                          }}>
                            {error.type}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-500 border-b border-slate-100" style={{ maxWidth: '300px' }}>
                        <strong>{error.message}</strong>
                      </td>
                      <td className="p-4 text-sm text-slate-500 border-b border-slate-100">
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: '#f1f5f9',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: 600
                        }}>
                          {error.count}x
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 border-b border-slate-100">{error.lastOccurred}</td>
                      <td className="p-4 text-sm text-slate-500 border-b border-slate-100">
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: `${getStatusColor(error.status)}15`,
                          color: getStatusColor(error.status),
                          borderRadius: '1rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          {error.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">View</button>
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all duration-200">Resolve</button>
                        </div>
                      </td>
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

export default ErrorTracking;

