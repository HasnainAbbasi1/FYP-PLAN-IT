import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, RefreshCw, CheckCircle, Clock } from 'lucide-react';

const BackupRestore = () => {
  const backups = [
    { id: 1, name: 'backup_2025-11-25_14-30.db', size: '245.8 MB', date: '2025-11-25 14:30:00', type: 'auto', status: 'success' },
    { id: 2, name: 'backup_2025-11-24_14-30.db', size: '242.1 MB', date: '2025-11-24 14:30:00', type: 'auto', status: 'success' },
    { id: 3, name: 'backup_manual_2025-11-23.db', size: '241.5 MB', date: '2025-11-23 10:15:00', type: 'manual', status: 'success' }
  ];

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Backup & Restore</h1>
            <p className="text-base text-slate-500 mt-1">Manage database backups and restore points</p>
          </div>
          <div className="flex gap-3">
            <button className="admin-btn admin-btn-outline">
              <RefreshCw size={18} />
              Refresh
            </button>
            <button className="admin-btn admin-btn-primary">
              <Download size={18} />
              Create Backup
            </button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] admin-grid-3">
          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
                  <Download size={24} style={{ color: '#4588AD' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>3</div>
                  <div className="admin-stat-label">Total Backups</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '0.5rem' }}>
                  <CheckCircle size={24} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>2h ago</div>
                  <div className="admin-stat-label">Last Backup</div>
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
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>Daily</div>
                  <div className="admin-stat-label">Auto Backup</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Backup History</CardTitle>
            <CardDescription>Available backup files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Backup Name</th>
                    <th>Size</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Download size={16} />
                          <strong>{backup.name}</strong>
                        </div>
                      </td>
                      <td>{backup.size}</td>
                      <td>{backup.date}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: backup.type === 'auto' ? '#eff6ff' : '#fef3c7',
                          color: backup.type === 'auto' ? '#3b82f6' : '#f59e0b',
                          borderRadius: '1rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          {backup.type}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} style={{ color: '#10b981' }} />
                          <span style={{ color: '#10b981', fontWeight: 600 }}>SUCCESS</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="admin-btn admin-btn-sm admin-btn-primary">
                            <Upload size={14} />
                            Restore
                          </button>
                          <button className="admin-btn admin-btn-sm admin-btn-outline">
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Backup Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-info-grid">
              <div className="admin-info-item">
                <span className="admin-info-label">Automatic Backups</span>
                <span className="admin-info-value">Enabled</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Frequency</span>
                <span className="admin-info-value">Daily at 14:30</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Retention Period</span>
                <span className="admin-info-value">30 days</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Backup Location</span>
                <span className="admin-info-value">/backups/db/</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default BackupRestore;

