import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from './AdminSidebar';
import Header from '../layout/Header';
import ScrollToTop from '../common/ScrollToTop';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/planner-dashboard');
    }
  }, [user, navigate]);

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

  if (user && user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-theme-dark relative">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile sidebar overlay */}
        <div 
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleOverlayClick}
        />
        <AdminSidebar 
          onItemClick={() => setSidebarOpen(false)} 
          className={sidebarOpen ? 'mobile-open' : ''}
        />
        <main className="flex-1 overflow-auto w-full transition-all duration-300 lg:ml-0 p-2 sm:p-4 lg:p-6 relative">
          {children}
          <ScrollToTop />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

