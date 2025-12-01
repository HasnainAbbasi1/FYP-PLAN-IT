import React, { useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

// Format time helper (replacing date-fns dependency)
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
};

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center w-10 h-10 min-w-10 min-h-10 max-w-10 max-h-10 p-0 rounded-lg bg-transparent border border-transparent text-slate-500 dark:text-slate-300 transition-all duration-200 hover:text-accent hover:bg-accent-light dark:hover:bg-accent-dark hover:border-accent-light-border dark:hover:border-accent-dark-border"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-[1.125rem] h-[1.125rem] min-w-[1.125rem] min-h-[1.125rem] bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full text-[0.625rem] font-bold border-2 border-white dark:border-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-[calc(100%+8px)] right-[-16px] w-[calc(100vw-32px)] max-w-[400px] max-h-[600px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1e293b] dark:to-[#0f172a] border border-accent-light-border dark:border-accent-dark-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-50 flex flex-col overflow-hidden sm:right-0 sm:w-[400px]">
            <div className="flex items-center justify-between p-4 border-b border-accent-light-border dark:border-accent-dark-border bg-transparent">
              <h3 className="m-0 text-lg font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="bg-transparent border-none cursor-pointer p-1 rounded text-current transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="bg-transparent border-none cursor-pointer p-1 rounded text-current transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="py-10 text-center text-slate-500 dark:text-slate-400">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-500 dark:text-slate-400">
                  <Bell className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`flex items-start px-4 py-3 border-b border-accent-light-border dark:border-accent-dark-border cursor-pointer transition-all duration-200 bg-transparent ${
                      !notification.read 
                        ? 'bg-accent-light dark:bg-accent-dark border-l-4 border-l-accent' 
                        : 'hover:bg-accent-light dark:hover:bg-accent-dark'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-100">
                        {notification.title}
                      </div>
                      <div className="text-[0.8125rem] text-slate-500 dark:text-slate-300 mb-1 leading-snug">
                        {notification.message}
                      </div>
                      <div className="text-[0.6875rem] text-slate-400 dark:text-slate-400">
                        {formatTimeAgo(notification.created_at)}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="bg-transparent border-none cursor-pointer p-1 rounded text-slate-500 dark:text-slate-400 transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-slate-100"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="bg-transparent border-none cursor-pointer p-1 rounded text-slate-500 dark:text-slate-400 transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-slate-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;

