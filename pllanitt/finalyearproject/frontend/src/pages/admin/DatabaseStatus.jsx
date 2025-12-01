import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Download, Upload, RefreshCw, Trash2, CheckCircle, AlertCircle, Activity, Settings } from 'lucide-react';

const DatabaseStatus = () => {
  const [dbStats, setDbStats] = useState({
    size: '245.8 MB',
    tables: 12,
    records: 15847,
    lastBackup: '2 hours ago',
    status: 'healthy'
  });

  const [tables, setTables] = useState([
    { name: 'users', records: 150, size: '2.4 MB', lastModified: '10 min ago' },
    { name: 'projects', records: 324, size: '8.7 MB', lastModified: '25 min ago' },
    { name: 'polygons', records: 1289, size: '45.3 MB', lastModified: '1 hour ago' },
    { name: 'terrain_analysis', records: 567, size: '78.9 MB', lastModified: '2 hours ago' },
    { name: 'zoning_results', records: 892, size: '34.2 MB', lastModified: '3 hours ago' },
    { name: 'roads', records: 445, size: '12.1 MB', lastModified: '4 hours ago' },
    { name: 'parcels', records: 2340, size: '23.5 MB', lastModified: '5 hours ago' },
    { name: 'buildings', records: 1789, size: '18.7 MB', lastModified: '6 hours ago' }
  ]);

  const [backups, setBackups] = useState([
    { name: 'backup_2025-11-25_14-30.db', size: '244.1 MB', date: '2025-11-25 14:30:00', status: 'success' },
    { name: 'backup_2025-11-24_14-30.db', size: '242.8 MB', date: '2025-11-24 14:30:00', status: 'success' },
    { name: 'backup_2025-11-23_14-30.db', size: '241.2 MB', date: '2025-11-23 14:30:00', status: 'success' },
    { name: 'backup_2025-11-22_14-30.db', size: '239.7 MB', date: '2025-11-22 14:30:00', status: 'success' }
  ]);

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Database Status</h1>
            <p className="text-base text-slate-500 mt-1">Manage database, backups and maintenance</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">
              <RefreshCw size={18} />
              Refresh
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-base hover:-translate-y-px hover:shadow-lg transition-all duration-200">
              <Download size={18} />
              Create Backup
            </button>
          </div>
        </div>

        {/* Database Overview */}
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={20} className="text-blue-500" />
                Database Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 mb-2">{dbStats.size}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Total Size</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-500" />
                Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 mb-2">{dbStats.tables}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Active Tables</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={20} className="text-purple-500" />
                Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 mb-2">{dbStats.records.toLocaleString()}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Total Records</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download size={20} className="text-orange-500" />
                Last Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>{dbStats.lastBackup}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Automatic Backups: Daily</div>
            </CardContent>
          </Card>
        </div>

        {/* Database Tables */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
            <CardDescription>Overview of all tables in the database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-300">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>Table Name</th>
                    <th>Records</th>
                    <th>Size</th>
                    <th>Last Modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table, index) => (
                    <tr key={index}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Database size={16} />
                          <strong>{table.name}</strong>
                        </div>
                      </td>
                      <td>{table.records.toLocaleString()}</td>
                      <td>{table.size}</td>
                      <td>{table.lastModified}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">
                            <Download size={14} />
                            Export
                          </button>
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">
                            <RefreshCw size={14} />
                            Optimize
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

        {/* Backup History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Backup History</CardTitle>
            <CardDescription>Recent database backups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-300">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>Backup Name</th>
                    <th>Size</th>
                    <th>Date Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup, index) => (
                    <tr key={index}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Download size={16} />
                          {backup.name}
                        </div>
                      </td>
                      <td>{backup.size}</td>
                      <td>{backup.date}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} style={{ color: '#10b981' }} />
                          <span style={{ color: '#10b981', fontWeight: 600 }}>SUCCESS</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-base hover:-translate-y-px hover:shadow-lg transition-all duration-200">
                            <Upload size={14} />
                            Restore
                          </button>
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">
                            <Download size={14} />
                            Download
                          </button>
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all duration-200">
                            <Trash2 size={14} />
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

        {/* Maintenance Actions */}
        <div className="admin-grid admin-grid-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="admin-actions-grid">
                <button className="admin-action-btn">
                  <RefreshCw size={20} />
                  <span>Optimize Database</span>
                </button>
                <button className="admin-action-btn">
                  <Trash2 size={20} />
                  <span>Clean Old Records</span>
                </button>
                <button className="admin-action-btn">
                  <Database size={20} />
                  <span>Rebuild Indexes</span>
                </button>
                <button className="admin-action-btn">
                  <CheckCircle size={20} />
                  <span>Run Health Check</span>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backup Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Automatic Backups</span>
                  <span className="text-base font-semibold text-slate-800">Enabled</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Frequency</span>
                  <span className="text-base font-semibold text-slate-800">Daily at 14:30</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retention</span>
                  <span className="text-base font-semibold text-slate-800">30 days</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backup Location</span>
                  <span className="text-base font-semibold text-slate-800">/backups/db/</span>
                </div>
              </div>
              <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 mt-4 w-full">
                <Settings size={18} />
                Configure Settings
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DatabaseStatus;

