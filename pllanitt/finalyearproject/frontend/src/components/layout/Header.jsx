import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  HelpCircle,
  Menu,
  LogOut,
  AlertCircle
} from "lucide-react";
import { Link } from 'react-router-dom';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '../../contexts/AuthContext'; // Update this path to match your file structure
import ThemeToggle from '../ui/ThemeToggle';
import NotificationCenter from '../notifications/NotificationCenter';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const resolveAvatarUrl = (value) => {
  if (!value) return null;
  if (value.startsWith('data:image') || value.startsWith('http')) {
    return value;
  }
  if (value.startsWith('/uploads/')) {
    return `${API_BASE_URL}${value}`;
  }
  return value;
};

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleLogout = async () => {
    try {
      // Use the logout method from AuthContext
      logout();
      
      // Clear any additional browser storage
      sessionStorage.clear();
      
      // Clear browser history and navigate to login
      window.history.replaceState(null, '', '/login');
      
      // Navigate with replace to prevent back navigation
      navigate('/login', { replace: true });
      
      // Close the confirmation modal
      setShowLogoutConfirmation(false);
      
      // Optional: Force page reload to ensure complete cleanup
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if there's an error
      window.location.href = '/login';
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return 'U';
    const names = user.name?.split(' ') || ['User'];
    return names.length > 1 
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    return user?.name || user?.email || 'User';
  };

  const avatarSrc = resolveAvatarUrl(user?.avatar);

  return (
    <div className="border-b border-accent-light-border dark:border-accent-dark-border bg-gradient-to-b from-white to-slate-50 dark:bg-gradient-to-b dark:from-[#1e293b] dark:to-[#0f172a] backdrop-blur-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.1)] relative z-10 transition-all duration-300 w-full max-w-full overflow-hidden box-border hover:shadow-[0_4px_15px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
      <div className="flex h-14 items-center justify-between px-4 relative z-[2] gap-4 w-full max-w-full mx-auto box-border md:px-6 lg:px-8">
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden flex-shrink">
          {onMenuClick && (
            <button 
              className="flex items-center justify-center w-10 h-10 min-w-10 min-h-10 max-w-10 max-h-10 rounded-lg bg-transparent border border-transparent text-slate-500 dark:text-slate-300 cursor-pointer transition-all duration-200 flex-shrink-0 hover:text-accent hover:bg-accent-light dark:hover:bg-accent-dark hover:border-accent-light-border dark:hover:border-accent-dark-border lg:hidden"
              onClick={onMenuClick}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3 transition-transform duration-200 flex-shrink-0 hover:scale-105">
            <Link 
              to="/" 
              className="text-2xl md:text-[1.75rem] font-extrabold tracking-tight no-underline leading-none transition-all duration-300 whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #2B4D5F 0%, #4588AD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              PLAN-it
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 overflow-visible md:gap-2.5 sm:gap-1.5">
          <div className="relative hidden md:flex">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400 pointer-events-none z-[1]" />
            <Input
              type="search"
              placeholder="Search projects..."
              className="w-56 lg:w-48 md:w-40 pl-10 bg-accent-light dark:bg-accent-dark border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 rounded-xl transition-all duration-200 h-10 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:bg-accent-light dark:focus-visible:bg-accent-dark focus-visible:shadow-[0_0_0_3px_rgba(69,136,173,0.1)] placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
          </div>
          
          <NotificationCenter />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 min-w-10 min-h-10 max-w-10 max-h-10 p-0 rounded-lg bg-transparent border border-transparent text-slate-500 dark:text-slate-300 transition-all duration-200 flex items-center justify-center hover:text-accent hover:bg-accent-light dark:hover:bg-accent-dark hover:border-accent-light-border dark:hover:border-accent-dark-border active:bg-accent-light dark:active:bg-accent-dark active:scale-95"
          >
            <HelpCircle className="h-[1.375rem] w-[1.375rem] flex-shrink-0" />
          </Button>
          
          <ThemeToggle size="small" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-slate-800 dark:text-slate-300 flex items-center gap-2.5 transition-all duration-200 py-1.5 px-2.5 rounded-lg h-10 min-h-10 min-w-auto w-auto bg-transparent border border-transparent hover:text-slate-800 dark:hover:text-slate-100 hover:bg-accent-light dark:hover:bg-accent-dark hover:border-accent-light-border dark:hover:border-accent-dark-border">
                <Avatar className="h-7 w-7 border border-accent-light-border dark:border-accent-dark-border">
                  <AvatarImage src={avatarSrc || "/avatars/user.png"} alt="User" />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline text-sm font-medium max-w-32 overflow-hidden text-ellipsis whitespace-nowrap">{getDisplayName()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{getDisplayName()}</span>
                  {user?.role && (
                    <span className="text-sm text-muted-foreground capitalize">
                      {user.role}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/user-profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogoutConfirmation(true)}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Logout Confirmation Modal - Rendered via Portal */}
      {showLogoutConfirmation && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center animate-in fade-in-0 duration-200"
          onClick={() => setShowLogoutConfirmation(false)}
          style={{ zIndex: 99999 }}
        >
          <div 
            className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 sm:p-8 rounded-xl text-left shadow-[0_20px_60px_rgba(0,0,0,0.4)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-2 border-slate-600 dark:border-slate-600 max-w-lg w-[90%] sm:w-[500px] text-slate-100 relative overflow-hidden animate-in zoom-in-95 fade-in-0 duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 100000 }}
          >
            {/* Decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-base via-accent to-base" />
            
            {/* Content with icon */}
            <div className="flex items-start gap-4">
              {/* Information icon */}
              <div className="flex-shrink-0 mt-1">
                <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center border-2 border-accent/50 shadow-lg">
                  <AlertCircle className="w-6 h-6 text-accent" strokeWidth={2.5} />
                </div>
              </div>
              
              {/* Text content */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Confirm Logout
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Are you sure you want to log out? You'll need to sign in again to access your account.
                  </p>
                </div>

                {/* User info */}
                {user && (
                  <div className="p-4 rounded-lg bg-slate-700/70 border border-slate-600/70 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-slate-500">
                        <AvatarImage src={avatarSrc || "/avatars/user.png"} alt="User" />
                        <AvatarFallback className="bg-accent text-white text-sm font-semibold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {getDisplayName()}
                        </p>
                        {user?.email && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowLogoutConfirmation(false)}
                    className="flex-1 h-11 rounded-lg border-2 border-slate-600 bg-slate-700/80 hover:bg-slate-600 hover:border-slate-500 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    className="flex-1 h-11 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group"
                  >
                    <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    Log Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Header;