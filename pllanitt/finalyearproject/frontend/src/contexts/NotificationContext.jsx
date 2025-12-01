import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { authenticatedFetch } from '../utils/authHelper';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      const url = `${API_BASE_URL}/api/notifications?limit=50&unreadOnly=${unreadOnly}`;
      const response = await authenticatedFetch(url);

      if (!response.ok) {
        // Silently handle 500 errors (backend issues)
        if (response.status === 500) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      // Only log non-500 errors (backend issues should be silent)
      if (err.message && !err.message.includes('500')) {
        console.warn('Error fetching notifications:', err.message);
      }
      setError(null); // Don't set error for backend issues
      // Set empty arrays to prevent crashes if notifications fail to load
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: 'PUT'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {
          method: 'PUT'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/notifications/${notificationId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  // Poll for new notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Fetch immediately
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications(true); // Only fetch unread
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

