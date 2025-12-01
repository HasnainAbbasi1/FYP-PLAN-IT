import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Shield, Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

const UserPermissions = () => {
  const [permissions, setPermissions] = useState({
    admin: {
      users: { view: true, create: true, edit: true, delete: true },
      projects: { view: true, create: true, edit: true, delete: true },
      terrain: { view: true, create: true, edit: true, delete: true },
      zoning: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: true, edit: true, delete: true },
      settings: { view: true, create: true, edit: true, delete: true }
    },
    planner: {
      users: { view: true, create: false, edit: false, delete: false },
      projects: { view: true, create: true, edit: true, delete: true },
      terrain: { view: true, create: true, edit: true, delete: false },
      zoning: { view: true, create: true, edit: true, delete: false },
      reports: { view: true, create: true, edit: false, delete: false },
      settings: { view: true, create: false, edit: false, delete: false }
    },
    viewer: {
      users: { view: false, create: false, edit: false, delete: false },
      projects: { view: true, create: false, edit: false, delete: false },
      terrain: { view: true, create: false, edit: false, delete: false },
      zoning: { view: true, create: false, edit: false, delete: false },
      reports: { view: true, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false }
    }
  });

  const resources = [
    { name: 'users', label: 'User Management' },
    { name: 'projects', label: 'Projects' },
    { name: 'terrain', label: 'Terrain Analysis' },
    { name: 'zoning', label: 'Zoning' },
    { name: 'reports', label: 'Reports' },
    { name: 'settings', label: 'System Settings' }
  ];

  const actions = [
    { key: 'view', label: 'View', icon: Eye, color: '#4588AD' },
    { key: 'create', label: 'Create', icon: Edit, color: '#10b981' },
    { key: 'edit', label: 'Edit', icon: Edit, color: '#f59e0b' },
    { key: 'delete', label: 'Delete', icon: Trash2, color: '#ef4444' }
  ];

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#ef4444';
      case 'planner':
        return '#3b82f6';
      case 'viewer':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  const togglePermission = (role, resource, action) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [resource]: {
          ...prev[role][resource],
          [action]: !prev[role][resource][action]
        }
      }
    }));
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">User Permissions</h1>
            <p className="text-base text-slate-500 mt-1">Manage roles and permissions</p>
          </div>
          <div className="flex gap-3">
            <button className="admin-btn admin-btn-outline">
              <Shield size={18} />
              Reset to Default
            </button>
            <button className="admin-btn admin-btn-primary">
              Save Changes
            </button>
          </div>
        </div>

        {/* Role Overview Cards */}
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] admin-grid-3">
          {['admin', 'planner', 'viewer'].map((role) => {
            const totalPerms = Object.values(permissions[role]).reduce((acc, resource) => 
              acc + Object.values(resource).filter(Boolean).length, 0
            );
            return (
              <Card key={role}>
                <CardContent style={{ paddingTop: '1.5rem' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ padding: '0.75rem', background: `${getRoleColor(role)}15`, borderRadius: '0.5rem' }}>
                      <Shield size={24} style={{ color: getRoleColor(role) }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', textTransform: 'capitalize' }}>
                        {role}
                      </div>
                      <div className="admin-stat-label">{totalPerms} permissions granted</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Permissions Matrix */}
        {['admin', 'planner', 'viewer'].map((role) => (
          <Card key={role} className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2" style={{ textTransform: 'capitalize' }}>
                    <Shield size={20} style={{ color: getRoleColor(role) }} />
                    {role} Permissions
                  </CardTitle>
                  <CardDescription>Configure what {role}s can do</CardDescription>
                </div>
                <span style={{
                  padding: '0.5rem 1rem',
                  background: `${getRoleColor(role)}15`,
                  color: getRoleColor(role),
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}>
                  {role.toUpperCase()}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '200px' }}>Resource</th>
                      {actions.map((action) => (
                        <th key={action.key} style={{ textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-2">
                            <action.icon size={14} style={{ color: action.color }} />
                            {action.label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((resource) => (
                      <tr key={resource.name}>
                        <td>
                          <strong>{resource.label}</strong>
                        </td>
                        {actions.map((action) => {
                          const hasPermission = permissions[role][resource.name][action.key];
                          return (
                            <td key={action.key} style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => togglePermission(role, resource.name, action.key)}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '0.5rem',
                                  border: 'none',
                                  background: hasPermission ? action.color : '#f1f5f9',
                                  color: hasPermission ? '#ffffff' : '#94a3b8',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {hasPermission ? <CheckCircle size={18} /> : <XCircle size={18} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Permission Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Permission Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] admin-grid-4">
              {actions.map((action) => (
                <div key={action.key} className="flex items-center gap-3">
                  <div style={{ 
                    padding: '0.5rem', 
                    background: `${action.color}15`, 
                    borderRadius: '0.5rem' 
                  }}>
                    <action.icon size={18} style={{ color: action.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {action.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {action.key === 'view' && 'Can view and read'}
                      {action.key === 'create' && 'Can create new items'}
                      {action.key === 'edit' && 'Can modify existing'}
                      {action.key === 'delete' && 'Can permanently remove'}
                    </div>
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

export default UserPermissions;

