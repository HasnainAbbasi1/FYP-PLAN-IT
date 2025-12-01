import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Eye,
  FileText,
  BarChart3,
  Map,
  Presentation,
  BookOpen,
  TrendingUp,
  Image,
  Settings,
  User,
  Calendar,
  Download
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

const ViewerSidebar = ({ onItemClick, className = '' }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const viewerMenuItems = [
    {
      title: "Dashboard",
      href: "/viewer-dashboard",
      icon: <LayoutDashboard />,
    },
    {
      title: "My Profile",
      href: "/viewer/profile",
      icon: <User />,
    },
    {
      section: "PROJECTS",
      items: [
        {
          title: "View Projects",
          href: "/viewer/projects",
          icon: <Eye />,
        },
        {
          title: "Project Gallery",
          href: "/viewer/gallery",
          icon: <Image />,
        },
      ]
    },
    {
      section: "ANALYTICS & REPORTS",
      items: [
        {
          title: "Project Analytics",
          href: "/viewer/analytics",
          icon: <BarChart3 />,
        },
        {
          title: "Reports",
          href: "/viewer/reports",
          icon: <FileText />,
        },
        {
          title: "Progress Overview",
          href: "/viewer/progress",
          icon: <TrendingUp />,
        },
      ]
    },
    {
      section: "EXPLORE",
      items: [
        {
          title: "Map Viewer",
          href: "/viewer/map",
          icon: <Map />,
        },
        {
          title: "Presentations",
          href: "/viewer/presentations",
          icon: <Presentation />,
        },
        {
          title: "Documentation",
          href: "/viewer/docs",
          icon: <BookOpen />,
        },
      ]
    },
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
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight" style={{
                  background: 'linear-gradient(135deg, #2B4D5F 0%, #4588AD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  PLAN-it
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Viewer Mode</p>
              </div>
            </div>
          </div>

          {/* Viewer Banner */}
          <div className="mb-4 px-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Read-Only Access</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-tight">
                Browse and explore project progress
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col gap-6 py-3">
            {viewerMenuItems.map((item, index) => (
              <div key={index} className="flex flex-col gap-3">
                {item.section && (
                  <h3 className="px-2 uppercase text-[0.625rem] font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2 mt-1 transition-colors duration-300 text-left">
                    {item.section}
                  </h3>
                )}
                <div className="flex flex-col gap-1.5 w-full">
                  {item.items ? (
                    item.items.map((subItem, subIndex) => (
                      <Link
                        key={subIndex}
                        to={subItem.href}
                        className={`flex items-center justify-start py-2.5 px-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-300 relative overflow-visible gap-2.5 w-full text-left group ${
                          pathname === subItem.href
                            ? 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-800 dark:text-blue-200 border-l-4 border-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.2)] font-semibold before:scale-y-100'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-800 dark:hover:text-blue-200 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] before:scale-y-0 hover:before:scale-y-100'
                        } before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-blue-500 before:to-blue-600 before:transition-transform before:duration-300`}
                        onClick={onItemClick}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-start text-left">
                          <div className="[&>svg]:h-4 [&>svg]:w-4 text-slate-500 dark:text-slate-400 transition-all duration-200 flex-shrink-0 ml-0 self-start mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:[&>svg]:scale-110">
                            {subItem.icon}
                          </div>
                          <span className="flex-1 whitespace-normal overflow-visible text-clip text-sm break-words leading-snug text-left">{subItem.title}</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <Link
                      to={item.href}
                      className={`flex items-center justify-start py-2.5 px-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-300 relative overflow-visible gap-2.5 w-full text-left group ${
                        pathname === item.href
                          ? 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-800 dark:text-blue-200 border-l-4 border-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.2)] font-semibold before:scale-y-100'
                          : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-800 dark:hover:text-blue-200 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] before:scale-y-0 hover:before:scale-y-100'
                      } before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-blue-500 before:to-blue-600 before:transition-transform before:duration-300`}
                      onClick={onItemClick}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-start text-left">
                        <div className="[&>svg]:h-4 [&>svg]:w-4 text-slate-500 dark:text-slate-400 transition-all duration-200 flex-shrink-0 ml-0 self-start mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:[&>svg]:scale-110">
                          {item.icon}
                        </div>
                        <span className="flex-1 whitespace-normal overflow-visible text-clip text-sm break-words leading-snug text-left">{item.title}</span>
                      </div>
                    </Link>
                  )}
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

export default ViewerSidebar;

