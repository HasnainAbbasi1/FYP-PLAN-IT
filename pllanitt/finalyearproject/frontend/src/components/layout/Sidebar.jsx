
import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Map,
  Layers,
  Route,
  Grid as GridIcon,
  MapPin,
  Settings,
  Home,
  Users,
  User,
  Upload,
  BarChart2,
  Mountain,
  Zap,
  FileText,
  FolderOpen,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import AIAssistant from '../ai/AIAssistant';
import ThemeToggle from '../ui/ThemeToggle';

const DASHBOARD_ROUTES = {
  admin: "/admin-dashboard",
  planner: "/planner-dashboard",
  viewer: "/viewer-dashboard"
};

const PROFILE_CONFIG = {
  admin: { path: "/user-profile", label: "Profile" },
  planner: { path: "/user-profile", label: "My Profile" },
  viewer: { path: "/user-profile", label: "My Profile" }
};

const buildSidebarItems = (role = 'viewer', hasProject = false, project = null) => {
  const dashboardPath = DASHBOARD_ROUTES[role] || "/dashboard";
  const profileConfig = PROFILE_CONFIG[role] || PROFILE_CONFIG.viewer;

  const baseItems = [
    {
      title: "Dashboard",
      href: dashboardPath,
      icon: <Home />,
      badge: role === 'admin' ? "Admin" : undefined
    },
    ...(role === 'admin'
      ? [
          {
            title: "User Management",
            href: "/users",
            icon: <Users  />,
            badge: "Admin"
          }
        ]
      : []),
    {
      title: profileConfig.label,
      href: profileConfig.path,
      icon: <User  />,
    },
    {
      section: "Projects",
      items: [
        {
          title: "Projects",
          href: "/projects",
          icon: <Map  />,
        },
      ]
    },
  ];

  // Show all project-dependent items when any project is selected
  // No filtering based on project workflow stage - show all items for all projects
  const projectDependentItems = hasProject ? [
    {
      section: "Planning",
      items: [
        {
          title: "Data Ingestion",
          href: "/data-ingestion",
          icon: <Upload  />,
        },
        {
          title: "Terrain Analysis",
          href: "/terrain",
          icon: <Mountain  />,
        },
        {
          title: "Land Suitability",
          href: "/suitability",
          icon: <MapPin  />,
        }
      ]
    },
    {
      section: "Design",
      items: [
        {
          title: "Zoning",
          href: "/zoning",
          icon: <GridIcon  />,
        },
        {
          title: "Smart Zoning Generator",
          href: "/zoning-generator",
          icon: <Layers  />,
        },
        {
          title: "Roads & Transport",
          href: "/roads",
          icon: <Route  />,
        },
        {
          title: "Land Subdivision",
          href: "/parcels",
          icon: <Layers  />,
        },
      ]
    },
    {
      section: "Analysis",
      items: [
        {
          title: "Map Editor",
          href: "/editor",
          icon: <Layers  />,
        },
        {
          title: "AI Optimization",
          href: "/ai-optimization",
          icon: <Zap  />,
        },
        {
          title: "Optimization Zoning",
          href: "/optimization-zoning",
          icon: <Zap  />,
        },
        {
          title: "Analytics",
          href: "/analytics",
          icon: <BarChart2  />,
        },
        {
          title: "Reports",
          href: "/reports",
          icon: <FileText  />,
        }
      ]
    },
  ] : [];

  // Settings - always visible
  const settingsItem = {
      title: "Settings",
      href: "/settings",
      icon: <Settings  />,
      badge: role === 'admin' ? "Admin" : undefined
  };

  return [...baseItems, ...projectDependentItems, settingsItem];
};

const Sidebar = ({ onItemClick, className = '' }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const { user } = useAuth();
  const { currentProject } = useProject();
  const role = user?.role || 'viewer';
  // Only show project-dependent items if a project is explicitly selected
  // When user first logs in, currentProject is null, so only base items show
  // After user explicitly selects a project, currentProject is set and all items show
  // Check for both id and _id to handle different API response formats
  const hasProject = !!(currentProject && (currentProject.id || currentProject._id));
  const sidebarItems = useMemo(() => {
    // Ensure we have a valid project with an id
    const project = currentProject && (currentProject.id || currentProject._id) ? currentProject : null;
    return buildSidebarItems(role, hasProject, project);
  }, [role, hasProject, currentProject]);

  const handleOpenAI = () => {
    setIsAIAssistantOpen(true);
  };

  const handleCloseAI = () => {
    setIsAIAssistantOpen(false);
  };

  return (
    <>
      <div className={`w-sidebar xl:w-sidebar-lg 2xl:w-sidebar-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#1e293b] dark:to-[#0f172a] text-slate-800 dark:text-slate-100 border-r border-accent-light-border dark:border-accent-dark-border shadow-[4px_0_20px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_20px_rgba(0,0,0,0.1)] relative overflow-hidden transition-all duration-300 ${className} ${
        className.includes('mobile-open') 
          ? 'block fixed left-0 top-0 bottom-0 z-50 transform translate-x-0 max-w-[85vw] shadow-[4px_0_30px_rgba(0,0,0,0.3)]' 
          : 'hidden lg:block lg:relative lg:z-auto fixed left-0 top-0 bottom-0 z-50 transform -translate-x-full lg:translate-x-0 max-w-[85vw] lg:max-w-none'
      }`}>
        <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto overflow-x-visible py-4 px-3 relative z-[2] scrollbar-hide md:py-3 md:px-2.5">
          {/* Project Info Section */}
          {currentProject && (currentProject.id || currentProject._id) && (
            <div className="mb-6 p-3 rounded-xl bg-gradient-to-br from-accent-light to-accent-light dark:from-accent-dark dark:to-accent-dark border border-accent-light-border dark:border-accent-dark-border transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="h-5 w-5 text-accent dark:text-accent flex-shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">Current Project</h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words">
                  {currentProject.title || currentProject.name || 'Untitled Project'}
                </div>
                {currentProject.description && (
                  <div className="text-[0.8125rem] text-slate-500 dark:text-slate-300 leading-snug break-words">
                    {currentProject.description.length > 60 
                      ? `${currentProject.description.substring(0, 60)}...`
                      : currentProject.description}
                  </div>
                )}
                <div className="flex flex-col gap-2 mt-1">
                  {currentProject.status && (
                    <div className="flex items-center gap-2 text-[0.8125rem]">
                      <span className={`inline-block text-[0.6875rem] font-semibold px-2 py-1 rounded-md capitalize ${
                        (currentProject.status || '').toLowerCase().replace(/\s+/g, '-') === 'planning'
                          ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 text-blue-300 dark:text-blue-300'
                          : (currentProject.status || '').toLowerCase().replace(/\s+/g, '-') === 'in-progress'
                          ? 'bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 text-green-300 dark:text-green-300'
                          : (currentProject.status || '').toLowerCase().replace(/\s+/g, '-') === 'completed'
                          ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-emerald-300 dark:text-emerald-300'
                          : (currentProject.status || '').toLowerCase().replace(/\s+/g, '-') === 'on-hold'
                          ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 dark:text-yellow-300'
                          : (currentProject.status || '').toLowerCase().replace(/\s+/g, '-') === 'cancelled'
                          ? 'bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 text-red-300 dark:text-red-300'
                          : 'bg-gradient-to-br from-accent-light to-accent-light dark:from-accent-dark dark:to-accent-dark border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100'
                      }`}>
                        {currentProject.status}
                      </span>
                    </div>
                  )}
                  {currentProject.progress !== undefined && (
                    <div className="flex items-center gap-2 text-[0.8125rem]">
                      <TrendingUp className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500 dark:text-slate-300">{currentProject.progress}%</span>
                    </div>
                  )}
                  {currentProject.location && (
                    <div className="flex items-center gap-2 text-[0.8125rem]">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500 dark:text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{currentProject.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-6 py-3">
            {sidebarItems.map((section, sectionIndex) => (
              <div key={sectionIndex} className="flex flex-col gap-3">
                {section.section && (
                  <h3 className="px-2 uppercase text-[0.625rem] font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2 mt-1 transition-colors duration-300 text-left">
                    {section.section}
                  </h3>
                )}
                
                <div className="flex flex-col gap-1.5 w-full">
                  {section.items ? (
                    section.items.map((item, itemIndex) => (
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
                          <div className="[&>svg]:h-4 [&>svg]:w-4 text-slate-500 dark:text-slate-400 transition-all duration-200 flex-shrink-0 ml-0 self-start mt-0.5 group-hover:text-accent group-hover:[&>svg]:scale-110 [&.sidebar-item-active]:text-accent [&.sidebar-item-active]:[&>svg]:scale-110">
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
                    ))
                  ) : (
                    <Link
                      to={section.href}
                      className={`flex items-center justify-start py-2.5 px-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-300 relative overflow-visible gap-2.5 w-full text-left group ${
                        pathname === section.href
                          ? 'bg-gradient-to-br from-accent-light to-accent-light dark:from-accent-dark dark:to-accent-dark text-slate-800 dark:text-slate-100 border-l-4 border-accent shadow-[0_4px_12px_rgba(102,126,234,0.3)] font-semibold before:scale-y-100'
                          : 'hover:bg-accent-light dark:hover:bg-accent-dark hover:text-slate-800 dark:hover:text-slate-100 hover:shadow-[0_2px_8px_rgba(69,136,173,0.15)] before:scale-y-0 hover:before:scale-y-100'
                      } before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-base before:to-accent before:transition-transform before:duration-300`}
                      onClick={onItemClick}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-start text-left">
                        <div className="[&>svg]:h-4 [&>svg]:w-4 text-slate-500 dark:text-slate-400 transition-all duration-200 flex-shrink-0 ml-0 self-start mt-0.5 group-hover:text-accent group-hover:[&>svg]:scale-110 [&.sidebar-item-active]:text-accent [&.sidebar-item-active]:[&>svg]:scale-110">
                          {section.icon}
                        </div>
                        <span className="flex-1 whitespace-normal overflow-visible text-clip text-sm break-words leading-snug text-left">{section.title}</span>
                      </div>
                      {section.badge && (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold bg-gradient-base text-white shadow-[0_2px_8px_rgba(102,126,234,0.4)] uppercase tracking-wider min-w-6 h-6 flex-shrink-0 ml-auto">
                          {section.badge}
                        </span>
                      )}
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
          <div className="p-3 rounded-xl border border-accent-light-border dark:border-accent-dark-border bg-gradient-to-br from-accent-light to-accent-light dark:from-accent-dark dark:to-accent-dark shadow-[0_2px_8px_rgba(69,136,173,0.15)] transition-all duration-300 hover:border-accent-light-border dark:hover:border-accent-dark-border hover:shadow-[0_4px_12px_rgba(102,126,234,0.2)] hover:-translate-y-0.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center justify-center p-1.5 rounded-full bg-gradient-base shadow-[0_2px_8px_rgba(102,126,234,0.3)] transition-all duration-300 flex-shrink-0 group-hover:scale-105 group-hover:shadow-[0_4px_12px_rgba(102,126,234,0.4)]">
                <Zap className="h-3 w-3 text-white" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-[0.75rem] font-semibold text-slate-800 dark:text-slate-100 m-0 leading-tight transition-colors duration-300">AI Assistant</p>
                <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-0.5 mb-0 leading-tight hidden">Get planning help</p>
              </div>
            </div>
            <button 
              className="w-full flex items-center justify-center py-1.5 px-2.5 mt-1.5 rounded-lg text-[0.6875rem] font-semibold bg-gradient-base text-white border-none cursor-pointer transition-all duration-300 shadow-[0_2px_8px_rgba(102,126,234,0.3)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(102,126,234,0.4)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full"
              onClick={handleOpenAI}
            >
              Ask AI
            </button>
          </div>
        </div>
        </div>
      </div>
    
    <AIAssistant isOpen={isAIAssistantOpen} onClose={handleCloseAI} />
    </>
  );
};

export default Sidebar;