import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, RefreshCw, Search, Filter, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

const SystemLogs = () => {
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [logs, setLogs] = useState([
    { id: 1, timestamp: '2025-11-25 16:45:23', level: 'info', source: 'API', message: 'User login successful: admin@planit.com', details: 'IP: 192.168.1.100' },
    { id: 2, timestamp: '2025-11-25 16:44:12', level: 'success', source: 'Database', message: 'Backup completed successfully', details: 'Size: 245.8 MB' },
    { id: 3, timestamp: '2025-11-25 16:42:05', level: 'warning', source: 'System', message: 'High CPU usage detected', details: 'CPU: 85%' },
    { id: 4, timestamp: '2025-11-25 16:40:33', level: 'error', source: 'Python Backend', message: 'Failed to process terrain analysis', details: 'Project ID: 567' },
    { id: 5, timestamp: '2025-11-25 16:38:18', level: 'info', source: 'API', message: 'New project created', details: 'Project: Urban Development Phase 2' },
    { id: 6, timestamp: '2025-11-25 16:35:42', level: 'info', source: 'System', message: 'Cache cleared successfully', details: 'Items cleared: 1,234' },
    { id: 7, timestamp: '2025-11-25 16:30:00', level: 'success', source: 'Database', message: 'Automatic backup started', details: 'Scheduled backup' },
    { id: 8, timestamp: '2025-11-25 16:28:15', level: 'warning', source: 'API', message: 'Rate limit exceeded for user', details: 'User: user@example.com' },
    { id: 9, timestamp: '2025-11-25 16:25:03', level: 'error', source: 'Node.js', message: 'Database connection timeout', details: 'Retrying connection...' },
    { id: 10, timestamp: '2025-11-25 16:22:48', level: 'info', source: 'System', message: 'Service restart completed', details: 'Service: Python Backend' }
  ]);

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <XCircle size={18} style={{ color: '#ef4444' }} />;
      case 'warning':
        return <AlertCircle size={18} style={{ color: '#f59e0b' }} />;
      case 'success':
        return <CheckCircle size={18} style={{ color: '#10b981' }} />;
      case 'info':
      default:
        return <Info size={18} style={{ color: '#4588AD' }} />;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
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

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">System Logs</h1>
            <p className="text-base text-slate-500 mt-1">Monitor system events and errors</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">
              <RefreshCw size={18} />
              Refresh
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">
              <Download size={18} />
              Export Logs
            </button>
          </div>
        </div>

        {/* Log Statistics */}
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
                  <Info size={24} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>2,847</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Info Logs</div>
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
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>1,234</div>
                  <div className="admin-stat-label">Success</div>
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
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>56</div>
                  <div className="admin-stat-label">Warnings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem' }}>
                  <XCircle size={24} style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <div className="admin-stat-value" style={{ fontSize: '1.5rem' }}>12</div>
                  <div className="admin-stat-label">Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Log Filters */}
        <Card className="mt-6">
          <CardContent style={{ paddingTop: '1.5rem' }}>
            <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '250px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 3rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filterLevel === 'all' 
                      ? 'bg-accent text-white hover:bg-base hover:-translate-y-px hover:shadow-lg' 
                      : 'border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                  onClick={() => setFilterLevel('all')}
                >
                  All
                </button>
                <button 
                  className={`admin-btn ${filterLevel === 'info' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                  onClick={() => setFilterLevel('info')}
                >
                  Info
                </button>
                <button 
                  className={`admin-btn ${filterLevel === 'success' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                  onClick={() => setFilterLevel('success')}
                >
                  Success
                </button>
                <button 
                  className={`admin-btn ${filterLevel === 'warning' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                  onClick={() => setFilterLevel('warning')}
                >
                  Warnings
                </button>
                <button 
                  className={`admin-btn ${filterLevel === 'error' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                  onClick={() => setFilterLevel('error')}
                >
                  Errors
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Logs ({filteredLogs.length})</CardTitle>
            <CardDescription>Real-time system event logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  style={{
                    padding: '1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${getLevelColor(log.level)}`,
                    borderRadius: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  className="log-item"
                >
                  <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
                    {getLevelIcon(log.level)}
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: getLevelColor(log.level),
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {log.level}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                      {log.source}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>
                      {log.timestamp}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500, marginBottom: '0.25rem' }}>
                    {log.message}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {log.details}
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

export default SystemLogs;

