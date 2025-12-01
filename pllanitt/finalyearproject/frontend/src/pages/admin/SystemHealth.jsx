import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Cpu, HardDrive, Server, Zap, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import adminPanelApi from '@/services/adminPanelApi';
import { toast } from 'sonner';

const SystemHealth = () => {
  const [systemStats, setSystemStats] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const response = await adminPanelApi.getSystemHealth();
      if (response.success) {
        const data = response.data;
        setSystemStats({
          cpu: { 
            usage: parseFloat(data.cpu.usage), 
            status: parseFloat(data.cpu.usage) < 70 ? 'healthy' : parseFloat(data.cpu.usage) < 90 ? 'warning' : 'critical'
          },
          memory: { 
            used: parseFloat(data.memory.used), 
            total: parseFloat(data.memory.total),
            free: parseFloat(data.memory.free),
            status: parseFloat(data.memory.usage) < 70 ? 'healthy' : parseFloat(data.memory.usage) < 90 ? 'warning' : 'critical'
          },
          disk: { used: 128, total: 512, status: 'healthy' }, // Placeholder
          uptime: data.uptime,
          platform: data.platform,
          arch: data.arch,
          hostname: data.hostname,
          nodeVersion: data.nodeVersion,
          activeConnections: 47,
          requestsPerMinute: 312
        });
        setServices(data.services);
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      toast.error('Failed to load system health data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
      case 'stopped':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'running' || status === 'healthy') {
      return <CheckCircle size={20} style={{ color: getStatusColor(status) }} />;
    }
    return <AlertCircle size={20} style={{ color: getStatusColor(status) }} />;
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">System Health</h1>
            <p className="text-base text-slate-500 mt-1">Monitor system performance and resource usage</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">
              <Clock size={18} />
              View History
            </button>
          </div>
        </div>

        {/* Resource Usage Cards */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 className="animate-spin" size={48} style={{ color: '#3b82f6' }} />
          </div>
        ) : systemStats && (
          <>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu size={20} className="text-blue-500" />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 mb-2">{systemStats.cpu.usage}%</div>
              <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                <div 
                  className="h-full rounded transition-all duration-300"
                  style={{ width: `${systemStats.cpu.usage}%`, background: getStatusColor(systemStats.cpu.status) }}
                />
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2" style={{ color: getStatusColor(systemStats.cpu.status) }}>
                {systemStats.cpu.status.toUpperCase()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive size={20} className="text-purple-500" />
                Memory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 mb-2">
                {systemStats.memory.used}GB / {systemStats.memory.total}GB
              </div>
              <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                <div 
                  className="h-full rounded transition-all duration-300"
                  style={{ 
                    width: `${(systemStats.memory.used / systemStats.memory.total) * 100}%`,
                    background: getStatusColor(systemStats.memory.status)
                  }}
                />
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2" style={{ color: getStatusColor(systemStats.memory.status) }}>
                {systemStats.memory.status.toUpperCase()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server size={20} className="text-green-500" />
                Disk Space
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 mb-2">
                {systemStats.disk.used}GB / {systemStats.disk.total}GB
              </div>
              <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                <div 
                  className="h-full rounded transition-all duration-300"
                  style={{ 
                    width: `${(systemStats.disk.used / systemStats.disk.total) * 100}%`,
                    background: getStatusColor(systemStats.disk.status)
                  }}
                />
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2" style={{ color: getStatusColor(systemStats.disk.status) }}>
                {systemStats.disk.status.toUpperCase()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={20} className="text-orange-500" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 mb-2">{systemStats.requestsPerMinute}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Requests/min</div>
              <div className="text-sm text-slate-400 mt-1">
                {systemStats.activeConnections} active connections
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Status */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Services Status</CardTitle>
            <CardDescription>Monitor all running services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-300">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Port</th>
                    <th>Uptime</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, index) => (
                    <tr key={index}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Server size={18} />
                          {service.name}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(service.status)}
                          <span style={{ color: getStatusColor(service.status), fontWeight: 600 }}>
                            {service.status.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td>{service.port}</td>
                      <td>{service.uptime}</td>
                      <td>
                        <div className="flex gap-2">
                          {service.status === 'running' ? (
                            <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all duration-200">Stop</button>
                          ) : (
                            <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all duration-200">Start</button>
                          )}
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">Restart</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OS</span>
                  <span className="text-base font-semibold text-slate-800">Windows 10</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Node Version</span>
                  <span className="text-base font-semibold text-slate-800">v18.17.0</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Python Version</span>
                  <span className="text-base font-semibold text-slate-800">3.10.4</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database</span>
                  <span className="text-base font-semibold text-slate-800">SQLite 3.42</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uptime</span>
                  <span className="text-base font-semibold text-slate-800">{systemStats.uptime}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Environment</span>
                  <span className="text-base font-semibold text-slate-800">Development</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                <button className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-800 hover:-translate-y-0.5 hover:shadow-md">
                  <Zap size={20} />
                  <span>Restart All Services</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-800 hover:-translate-y-0.5 hover:shadow-md">
                  <Activity size={20} />
                  <span>Clear Cache</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-800 hover:-translate-y-0.5 hover:shadow-md">
                  <Server size={20} />
                  <span>Run Health Check</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-800 hover:-translate-y-0.5 hover:shadow-md">
                  <AlertCircle size={20} />
                  <span>View Logs</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
        </>
        )}
      </div>
    </AdminLayout>
  );
};

export default SystemHealth;

