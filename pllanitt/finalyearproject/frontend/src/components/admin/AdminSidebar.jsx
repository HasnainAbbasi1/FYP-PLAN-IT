import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  Shield,
  Database,
  Activity,
  FileText,
  Settings,
  Bell,
  BarChart3,
  Server,
  Lock,
  AlertTriangle,
  Download,
  Upload,
  Eye,
  UserPlus,
  TrendingUp,
  User,
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

const AdminSidebar = ({ onItemClick, className = '' }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const adminMenuItems = [
    {
      section: "Admin",
      items: [
        {
          title: "Admin Dashboard",
          href: "/admin-dashboard",
          icon: <LayoutDashboard />,
        },
        {
          title: "Admin Profile",
          href: "/admin/profile",
          icon: <User />,
        },
        {
          title: "Analytics",
          href: "/admin/analytics",
          icon: <BarChart3 />,
        }
      ]
    },
    {
      section: "User Management",
      items: [
        {
          title: "All Users",
          href: "/users",
          icon: <Users />,
        },
        {
          title: "User Analytics",
          href: "/admin/user-analytics",
          icon: <TrendingUp />,
        },
        {
          title: "User Permissions",
          href: "/admin/permissions",
          icon: <Lock />,
        },
        {
          title: "Invite Users",
          href: "/admin/invite",
          icon: <UserPlus />,
        }
      ]
    },
    {
      section: "System Management",
      items: [
        {
          title: "System Health",
          href: "/admin/system-health",
          icon: <Activity />,
        },
        {
          title: "Database Status",
          href: "/admin/database",
          icon: <Database />,
        },
        {
          title: "System Logs",
          href: "/admin/logs",
          icon: <FileText />,
        },
        {
          title: "Server Status",
          href: "/admin/server-status",
          icon: <Server />,
        }
      ]
    },
    {
      section: "Monitoring",
      items: [
        {
          title: "Performance Metrics",
          href: "/admin/performance",
          icon: <TrendingUp />,
        },
        {
          title: "Alerts & Notifications",
          href: "/admin/alerts",
          icon: <Bell />,
        },
        {
          title: "Activity Monitor",
          href: "/admin/activity",
          icon: <Eye />,
        },
        {
          title: "Error Tracking",
          href: "/admin/errors",
          icon: <AlertTriangle />,
        }
      ]
    },
    {
      section: "Data Management",
      items: [
        {
          title: "Backup & Restore",
          href: "/admin/backup",
          icon: <Download />,
        },
        {
          title: "Data Export",
          href: "/admin/export",
          icon: <Upload />,
        }
      ]
    },
    {
      section: "Configuration",
      items: [
        {
          title: "System Settings",
          href: "/admin/settings",
          icon: <Settings />,
        },
        {
          title: "Security Settings",
          href: "/admin/security",
          icon: <Shield />,
        }
      ]
    }
  ];

  return (
    <div className={`w-sidebar xl:w-sidebar-lg 2xl:w-sidebar-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#1e293b] dark:to-[#0f172a] text-slate-800 dark:text-slate-100 border-r border-accent-light-border dark:border-accent-dark-border shadow-[4px_0_20px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_20px_rgba(0,0,0,0.1)] relative overflow-hidden transition-all duration-300 ${className} ${
      className.includes('mobile-open') 
        ? 'block fixed left-0 top-0 bottom-0 z-50 transform translate-x-0 max-w-[85vw] shadow-[4px_0_30px_rgba(0,0,0,0.3)]' 
        : 'hidden lg:block lg:relative lg:z-auto fixed left-0 top-0 bottom-0 z-50 transform -translate-x-full lg:translate-x-0 max-w-[85vw] lg:max-w-none'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto overflow-x-visible py-4 px-3 relative z-[2] scrollbar-hide md:py-3 md:px-2.5">
          {/* Logo Section */}
          <div className="mb-6 px-2">
            <div className="flex items-center gap-3 p-3">
              <Shield className="h-6 w-6 text-accent dark:text-accent flex-shrink-0" />
              <span className="text-xl font-extrabold tracking-tight" style={{
                background: 'linear-gradient(135deg, #2B4D5F 0%, #4588AD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                PLAN-it Admin
              </span>
            </div>
          </div>

          {/* Admin Menu Items */}
          <div className="flex flex-col gap-6 py-3">
            {adminMenuItems.map((section, sectionIndex) => (
              <div key={sectionIndex} className="flex flex-col gap-3">
                {section.section && (
                  <h3 className="px-2 uppercase text-[0.625rem] font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2 mt-1 transition-colors duration-300 text-left">
                    {section.section}
                  </h3>
                )}
                
                <div className="flex flex-col gap-1.5 w-full">
                  {section.items.map((item, itemIndex) => (
                    <Link
                      key={itemIndex}
                      to={item.href}
                      className={`flex items-center justify-start py-2.5 px-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-300 relative overflow-visible gap-2.5 w-full text-left group ${
                        pathname === item.href
                          ? 'bg-gradient-to-br from-accent-light to-accent-light dark:from-accent-dark dark:to-accent-dark text-slate-800 dark:text-slate-100 border-l-4 border-accent shadow-[0_4px_12px_rgba(102,126,234,0.3)] font-semibold before:scale-y-100'
                          : 'hover:bg-accent-light dark:hover:bg-accent-dark hover:text-slate-800 dark:hover:text-slate-100 hover:shadow-[0_2px_8px_rgba(69,136,173,0.15)] before:scale-y-0 hover:before:scale-y-100'
                      } before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-base before:to-accent before:transition-transform before:duration-300`}
                      onClick={onItemClick}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-start text-left">
                        <div className="[&>svg]:h-4 [&>svg]:w-4 text-slate-500 dark:text-slate-400 transition-all duration-200 flex-shrink-0 ml-0 self-start mt-0.5 group-hover:text-accent group-hover:[&>svg]:scale-110">
                          {item.icon}
                        </div>
                        <span className="flex-1 whitespace-normal overflow-visible text-clip text-sm break-words leading-snug text-left">{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold bg-gradient-base text-white shadow-[0_2px_8px_rgba(102,126,234,0.4)] uppercase tracking-wider min-w-6 h-6 flex-shrink-0 ml-auto">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-3 mt-auto border-t border-accent-light-border dark:border-accent-dark-border relative z-[2] transition-colors duration-300">
          <div className="mb-4">
            <ThemeToggle size="default" showLabel={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;


