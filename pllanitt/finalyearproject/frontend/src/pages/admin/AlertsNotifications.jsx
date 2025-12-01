import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

const AlertsNotifications = () => {
  const [alerts] = useState([
    { id: 1, type: 'warning', title: 'High CPU Usage', message: 'CPU usage exceeded 85%', time: '5 minutes ago', read: false },
    { id: 2, type: 'error', title: 'Database Connection Failed', message: 'Failed to connect to database server', time: '15 minutes ago', read: false },
    { id: 3, type: 'success', title: 'Backup Completed', message: 'Daily backup completed successfully', time: '1 hour ago', read: true },
    { id: 4, type: 'info', title: 'System Update Available', message: 'New system update is available', time: '2 hours ago', read: true }
  ]);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return <XCircle size={20} style={{ color: '#ef4444' }} />;
      case 'warning':
        return <AlertCircle size={20} style={{ color: '#f59e0b' }} />;
      case 'success':
        return <CheckCircle size={20} style={{ color: '#10b981' }} />;
      case 'info':
      default:
        return <Info size={20} style={{ color: '#4588AD' }} />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'success':
        return '#10b981';
      case 'info':
      default:
        return '#4588AD';
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Alerts & Notifications</h1>
            <p className="text-base text-slate-500 mt-1">System alerts and notifications</p>
          </div>
          <div className="flex gap-3">
            <button className="admin-btn admin-btn-outline">
              Mark All as Read
            </button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] admin-grid-4">
          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem' }}>
                  <XCircle size={24} style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>1</div>
                  <div className="admin-stat-label">Critical Errors</div>
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
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>1</div>
                  <div className="admin-stat-label">Warnings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
                  <Info size={24} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>1</div>
                  <div className="admin-stat-label">Info</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                  <Bell size={24} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>2</div>
                  <div className="admin-stat-label">Unread</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Latest system alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '1rem',
                    background: alert.read ? '#f8fafc' : '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${getAlertColor(alert.type)}`,
                    borderRadius: '0.5rem',
                    opacity: alert.read ? 0.7 : 1
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3" style={{ flex: 1 }}>
                      {getAlertIcon(alert.type)}
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: 600, 
                          color: '#1e293b',
                          marginBottom: '0.25rem'
                        }}>
                          {alert.title}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                          {alert.message}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {alert.time}
                        </div>
                      </div>
                    </div>
                    {!alert.read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        flexShrink: 0
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AlertsNotifications;

