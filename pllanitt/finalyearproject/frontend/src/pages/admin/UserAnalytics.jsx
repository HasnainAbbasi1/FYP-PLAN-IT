import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Activity, Clock, UserPlus, UserMinus } from 'lucide-react';

const UserAnalytics = () => {
  const userStats = {
    total: 3,
    active: 3,
    newThisWeek: 2,
    avgSessionTime: '24m 15s',
    byRole: {
      admin: 1,
      planner: 1,
      viewer: 1
    }
  };

  const recentActivity = [
    { name: 'hasnain', email: 'hasnain.abbasi@nea ano.services', role: 'planner', lastLogin: '11/25/2025, 12:43 PM', status: 'active' },
    { name: 'hasn', email: 'kashfa12@gmail.com', role: 'planner', lastLogin: '11/25/2025, 12:42 PM', status: 'active' },
    { name: 'Admin User', email: 'admin@local.test', role: 'admin', lastLogin: '11/25/2025, 12:42 PM', status: 'active' }
  ];

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">User Analytics</h1>
            <p className="admin-page-subtitle">Comprehensive user behavior and system insights</p>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="admin-grid admin-grid-4">
          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
                  <Users size={24} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>{userStats.total}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Total Users</div>
                  <div className="text-sm text-slate-400 mt-1" style={{ color: '#10b981' }}>+12% this month</div>
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
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>{userStats.active}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Active Users</div>
                  <div className="text-sm text-slate-400 mt-1" style={{ color: '#64748b' }}>+5% today</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                  <UserPlus size={24} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>{userStats.newThisWeek}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">New This Week</div>
                  <div className="text-sm text-slate-400 mt-1" style={{ color: '#64748b' }}>+8% this week</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: '#f3e8ff', borderRadius: '0.5rem' }}>
                  <Clock size={24} style={{ color: '#a855f7' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 mb-2" style={{ fontSize: '1.5rem' }}>{userStats.avgSessionTime}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Avg Session</div>
                  <div className="text-sm text-slate-400 mt-1" style={{ color: '#64748b' }}>-2m from last week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Role Distribution */}
        <div className="admin-grid admin-grid-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Role Distribution</CardTitle>
              <CardDescription>Breakdown of users by role</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Admin</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>{userStats.byRole.admin}</span>
                  </div>
                  <div className="admin-progress-bar">
                    <div className="admin-progress-fill" style={{ width: '33%', background: '#ef4444' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Planner</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>{userStats.byRole.planner}</span>
                  </div>
                  <div className="admin-progress-bar">
                    <div className="admin-progress-fill" style={{ width: '33%', background: '#3b82f6' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Viewer</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>{userStats.byRole.viewer}</span>
                  </div>
                  <div className="admin-progress-bar">
                    <div className="admin-progress-fill" style={{ width: '33%', background: '#10b981' }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
              <CardDescription>User engagement over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="admin-info-grid">
                <div className="admin-info-item">
                  <span className="admin-info-label">Total Logins</span>
                  <span className="admin-info-value">3</span>
                </div>
                <div className="admin-info-item">
                  <span className="admin-info-label">This Week</span>
                  <span className="admin-info-value">+8%</span>
                </div>
                <div className="admin-info-item">
                  <span className="admin-info-label">Projects Created</span>
                  <span className="admin-info-value">2</span>
                </div>
                <div className="admin-info-item">
                  <span className="admin-info-label">Analyses Run</span>
                  <span className="admin-info-value">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent User Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent User Activity</CardTitle>
            <CardDescription>Latest user actions and logins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Last Login</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((user, index) => (
                    <tr key={index}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2B4D5F 0%, #4588AD 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{user.name}</strong>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: user.role === 'admin' ? '#fef2f2' : user.role === 'planner' ? '#eff6ff' : '#f0fdf4',
                          color: user.role === 'admin' ? '#ef4444' : user.role === 'planner' ? '#3b82f6' : '#10b981',
                          borderRadius: '1rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user.lastLogin}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#10b981'
                          }} />
                          <span style={{ color: '#10b981', fontWeight: 600 }}>ACTIVE</span>
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

export default UserAnalytics;

