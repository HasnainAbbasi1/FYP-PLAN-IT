
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import ScrollToTop from '../common/ScrollToTop';
import { useProject } from '../../contexts/ProjectContext';

const MainLayout = ({ children, showSidebar = true }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentProject } = useProject();

  // Close sidebar when clicking overlay
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Automatically show sidebar when a project is selected
  useEffect(() => {
    if (currentProject && currentProject.id) {
      // On mobile, automatically open sidebar when project is selected
      if (window.innerWidth < 1024) {
        setSidebarOpen(true);
      }
      // On desktop, sidebar is always visible via CSS
    }
  }, [currentProject]);

  return (
    <div className="flex flex-col min-h-screen bg-theme-dark relative">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative overflow-hidden">
        {showSidebar && (
          <>
            {/* Mobile sidebar overlay */}
            <div 
              className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={handleOverlayClick}
            />
            <Sidebar 
              onItemClick={() => setSidebarOpen(false)} 
              className={sidebarOpen ? 'mobile-open' : ''}
            />
          </>
        )}
        <main className="flex-1 overflow-auto w-full transition-all duration-300 lg:ml-0 p-2 sm:p-4 lg:p-6 relative">
          {children}
          <ScrollToTop />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
