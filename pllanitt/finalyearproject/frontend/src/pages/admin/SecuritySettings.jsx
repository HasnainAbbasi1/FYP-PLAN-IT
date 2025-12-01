import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Key, AlertTriangle, CheckCircle } from 'lucide-react';

const SecuritySettings = () => {
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAttempts: 5,
    requireStrongPassword: true,
    allowApiAccess: true
  });

  const securityAudits = [
    { date: '2025-11-25', event: 'Password policy updated', status: 'success' },
    { date: '2025-11-20', event: 'Security scan completed', status: 'success' },
    { date: '2025-11-15', event: '3 failed login attempts detected', status: 'warning' }
  ];

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Security Settings</h1>
            <p className="text-base text-slate-500 mt-1">Configure system security and authentication</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-base hover:-translate-y-px hover:shadow-lg transition-all duration-200">
              Save Changes
            </button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                Authentication Settings
              </CardTitle>
              <CardDescription>Configure login and authentication options</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      Two-Factor Authentication
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Require 2FA for all users
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                    <input
                      type="checkbox"
                      checked={settings.twoFactorAuth}
                      onChange={(e) => setSettings({...settings, twoFactorAuth: e.target.checked})}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: settings.twoFactorAuth ? '#3b82f6' : '#cbd5e1',
                      transition: '0.4s',
                      borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '18px',
                        width: '18px',
                        left: settings.twoFactorAuth ? '26px' : '3px',
                        bottom: '3px',
                        background: 'white',
                        transition: '0.4s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={settings.loginAttempts}
                    onChange={(e) => setSettings({...settings, loginAttempts: parseInt(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock size={20} />
                Password Policy
              </CardTitle>
              <CardDescription>Configure password requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      Require Strong Passwords
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Uppercase, lowercase, number required
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                    <input
                      type="checkbox"
                      checked={settings.requireStrongPassword}
                      onChange={(e) => setSettings({...settings, requireStrongPassword: e.target.checked})}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: settings.requireStrongPassword ? '#3b82f6' : '#cbd5e1',
                      transition: '0.4s',
                      borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '18px',
                        width: '18px',
                        left: settings.requireStrongPassword ? '26px' : '3px',
                        bottom: '3px',
                        background: 'white',
                        transition: '0.4s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>
                    Password Expiry (days)
                  </label>
                  <input
                    type="number"
                    value={settings.passwordExpiry}
                    onChange={(e) => setSettings({...settings, passwordExpiry: parseInt(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>
                    <Key size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    <strong>Current Requirements:</strong>
                    <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                      <li>Minimum 6 characters</li>
                      <li>At least 1 uppercase letter</li>
                      <li>At least 1 lowercase letter</li>
                      <li>At least 1 number</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Security Audit Log</CardTitle>
            <CardDescription>Recent security events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-300">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {securityAudits.map((audit, index) => (
                    <tr key={index}>
                      <td>{audit.date}</td>
                      <td>{audit.event}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {audit.status === 'success' ? (
                            <CheckCircle size={16} style={{ color: '#10b981' }} />
                          ) : (
                            <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                          )}
                          <span style={{ 
                            color: audit.status === 'success' ? '#10b981' : '#f59e0b',
                            fontWeight: 600
                          }}>
                            {audit.status.toUpperCase()}
                          </span>
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

export default SecuritySettings;

