import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import ScrollToTop from '../common/ScrollToTop';
import ViewerSidebar from './ViewerSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Eye } from 'lucide-react';

const ViewerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isViewer } = useAuth();

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

  return (
    <div className="flex flex-col min-h-screen bg-theme-dark relative">
      {/* Viewer Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white py-2 px-4 text-center text-sm font-medium shadow-md relative z-10">
        <div className="flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          <span>Viewer Mode - Read-only access to explore project progress and results</span>
        </div>
      </div>

      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1 relative overflow-hidden">
        {(
          <>
            {/* Mobile sidebar overlay */}
            <div 
              className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={handleOverlayClick}
            />
            <ViewerSidebar 
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

export default ViewerLayout;

