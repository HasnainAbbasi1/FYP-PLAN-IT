import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

const ServerStatus = () => {
  const servers = [
    { name: 'Node.js Backend', url: 'http://localhost:8000', status: 'running', uptime: '5d 12h', cpu: 45, memory: 38 },
    { name: 'Python Backend', url: 'http://localhost:5002', status: 'running', uptime: '5d 12h', cpu: 32, memory: 52 },
    { name: 'Database Server', url: 'localhost:5432', status: 'running', uptime: '15d 8h', cpu: 15, memory: 28 },
    { name: 'Frontend (Vite)', url: 'http://localhost:5173', status: 'running', uptime: '2h 34m', cpu: 8, memory: 12 }
  ];

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Server Status</h1>
            <p className="text-base text-slate-500 mt-1">Monitor all server instances</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">
              <Zap size={18} />
              Restart All
            </button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          {servers.map((server, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Server size={20} />
                    {server.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {server.status === 'running' ? (
                      <CheckCircle size={20} style={{ color: '#10b981' }} />
                    ) : (
                      <XCircle size={20} style={{ color: '#ef4444' }} />
                    )}
                    <span style={{ 
                      color: server.status === 'running' ? '#10b981' : '#ef4444',
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}>
                      {server.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <CardDescription>{server.url}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uptime</span>
                    <span className="text-base font-semibold text-slate-800">{server.uptime}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CPU Usage</span>
                    <span className="text-base font-semibold text-slate-800">{server.cpu}%</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Memory</span>
                    <span className="text-base font-semibold text-slate-800">{server.memory}%</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
                    <span className="text-base font-semibold" style={{ color: '#10b981' }}>Healthy</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 flex-1">
                    Restart
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 flex-1">
                    View Logs
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ServerStatus;

