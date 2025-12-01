import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ProjectRequiredRoute from "./components/auth/ProjectRequiredRoute";
import RouteTracker from "./components/common/RouteTracker";
import ErrorBoundary from "./components/common/ErrorBoundary";

import Index from "./pages/core/Index.jsx";
import NotFound from "./pages/core/NotFound.jsx";
import Editor from "./pages/planning/Editor.jsx";
import Analysis from "./pages/analysis/Analysis.jsx";
import Zoning from "./pages/planning/Zoning.jsx";
import PolygonZoning from "./pages/planning/PolygonZoning.jsx";
import ZoningGenerator from "./pages/planning/ZoningGenerator.jsx";
import Roads from "./pages/design/Roads.jsx";
import Settings from "./pages/admin/Settings.jsx";
import Projects from "./pages/planning/Projects.jsx";

// New pages
import Users from "./pages/admin/Users.jsx";
import DataIngestion from "./pages/planning/DataIngestion.jsx";
import Terrain from "./pages/planning/Terrain.jsx";
import Suitability from "./pages/planning/Suitability.jsx";
import Parcels from "./pages/planning/Parcels.jsx";
import AIOptimization from "./pages/analysis/AIOptimization.jsx";
import OptimizationZoning from "./pages/planning/OptimizationZoning.jsx";
import ZoningSubdivision from "./pages/planning/ZoningSubdivision.jsx";
import Analytics from "./pages/analysis/Analytics.jsx";
import Reports from "./pages/analysis/Reports.jsx";

// Landing and Auth pages
import Landing from "./pages/core/Landing.jsx";
import Login from "./pages/auth/Login.jsx";
import Signup from "./pages/auth/Signup.jsx";
import UserProfile from "./pages/profile/UserProfile.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";
import Unauthorized from "./pages/core/Unauthorized.jsx";

// Role-specific dashboards
import AdminDashboard from "./pages/dashboards/AdminDashboard.jsx";
import PlannerDashboard from "./pages/dashboards/PlannerDashboard.jsx";
import ViewerDashboard from "./pages/dashboards/ViewerDashboard.jsx";

// Admin Panel Pages
import SystemHealth from "./pages/admin/SystemHealth.jsx";
import DatabaseStatus from "./pages/admin/DatabaseStatus.jsx";
import SystemLogs from "./pages/admin/SystemLogs.jsx";
import UserAnalytics from "./pages/admin/UserAnalytics.jsx";
import UserPermissions from "./pages/admin/UserPermissions.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import InviteUsers from "./pages/admin/InviteUsers.jsx";
import ServerStatus from "./pages/admin/ServerStatus.jsx";
import PerformanceMetrics from "./pages/admin/PerformanceMetrics.jsx";
import AlertsNotifications from "./pages/admin/AlertsNotifications.jsx";
import ActivityMonitor from "./pages/admin/ActivityMonitor.jsx";
import ErrorTracking from "./pages/admin/ErrorTracking.jsx";
import BackupRestore from "./pages/admin/BackupRestore.jsx";
import DataExport from "./pages/admin/DataExport.jsx";
import SecuritySettings from "./pages/admin/SecuritySettings.jsx";
import AdminProfile from "./pages/admin/AdminProfile.jsx";

// Viewer Pages
import ViewerProfile from "./pages/viewer/ViewerProfile.jsx";
import ViewerProjects from "./pages/viewer/ViewerProjects.jsx";
import ViewerGallery from "./pages/viewer/ViewerGallery.jsx";
import ViewerAnalytics from "./pages/viewer/ViewerAnalytics.jsx";
import ViewerReports from "./pages/viewer/ViewerReports.jsx";
import ViewerProgress from "./pages/viewer/ViewerProgress.jsx";
import ViewerMap from "./pages/viewer/ViewerMap.jsx";
import ViewerPresentations from "./pages/viewer/ViewerPresentations.jsx";
import ViewerDocs from "./pages/viewer/ViewerDocs.jsx";
import ViewerProjectDetail from "./pages/viewer/ViewerProjectDetail.jsx";


const queryClient = new QueryClient();

// Component to handle login page access for already authenticated users
const LoginRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="protected-route-spinner"></div>
      </div>
    );
  }
  
  // If already authenticated, redirect to dashboard (never landing page)
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Login />;
};

// Component to handle signup page access for already authenticated users
const SignupRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="protected-route-spinner"></div>
      </div>
    );
  }
  
  // If already authenticated, redirect to dashboard (never landing page)
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Signup />;
};

// Component to handle default redirect based on authentication
const DefaultRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="protected-route-spinner"></div>
      </div>
    );
  }
  
  // If authenticated, go to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If not authenticated, go to landing page
  return <Navigate to="/landing" replace />;
};

// Component to handle role-based dashboard redirects
const DashboardRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="protected-route-spinner"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect based on user role
  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin-dashboard" replace />;
    case 'planner':
      return <Navigate to="/planner-dashboard" replace />;
    case 'viewer':
      return <Navigate to="/viewer-dashboard" replace />;
    default:
      return <Index />;
  }
};

const AppRoutes = () => {
  // Track routes for project state management
  return (
    <>
      <RouteTracker />
      <Routes>
    {/* Landing page - accessible to everyone */}
    <Route path="/landing" element={<Landing />} />
    
    {/* Auth routes - redirect if already authenticated */}
    <Route path="/login" element={<LoginRedirect />} />
    <Route path="/signup" element={<SignupRedirect />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    
    {/* Role-specific dashboards */}
    <Route path="/admin-dashboard" element={
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    } />
    <Route path="/planner-dashboard" element={
      <ProtectedRoute requiredRole="planner">
        <PlannerDashboard />
      </ProtectedRoute>
    } />
    <Route path="/viewer-dashboard" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerDashboard />
      </ProtectedRoute>
    } />
    
    {/* Viewer Pages */}
    <Route path="/viewer/profile" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerProfile />
      </ProtectedRoute>
    } />
    <Route path="/viewer/projects" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerProjects />
      </ProtectedRoute>
    } />
    <Route path="/viewer/projects/:id" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerProjectDetail />
      </ProtectedRoute>
    } />
    <Route path="/viewer/gallery" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerGallery />
      </ProtectedRoute>
    } />
    <Route path="/viewer/analytics" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerAnalytics />
      </ProtectedRoute>
    } />
    <Route path="/viewer/reports" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerReports />
      </ProtectedRoute>
    } />
    <Route path="/viewer/progress" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerProgress />
      </ProtectedRoute>
    } />
    <Route path="/viewer/map" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerMap />
      </ProtectedRoute>
    } />
    <Route path="/viewer/presentations" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerPresentations />
      </ProtectedRoute>
    } />
    <Route path="/viewer/docs" element={
      <ProtectedRoute requiredRole="viewer">
        <ViewerDocs />
      </ProtectedRoute>
    } />
    
    {/* Main dashboard - redirects based on role */}
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <DashboardRedirect />
      </ProtectedRoute>
    } />
    
    {/* User management */}
    <Route path="/profile" element={<Navigate to="/user-profile" replace />} />
    <Route path="/user-profile" element={
      <ProtectedRoute>
        <UserProfile />
      </ProtectedRoute>
    } />
    <Route path="/users" element={
      <ProtectedRoute requiredRole="admin">
        <Users />
      </ProtectedRoute>
    } />
    <Route path="/settings" element={
      <ProtectedRoute requiredPermission="manage_settings">
        <Settings />
      </ProtectedRoute>
    } />
    
    {/* Project management */}
    <Route path="/projects" element={
      <ProtectedRoute>
        <Projects />
      </ProtectedRoute>
    } />
    
    {/* Data and Analysis - Require Project Selection */}
    <Route path="/data-ingestion" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <DataIngestion />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/terrain" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <Terrain />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/analysis" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <Analysis />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/suitability" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <Suitability />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    
    {/* Planning and Design - Require Project Selection */}
    <Route path="/editor" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <Editor />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/zoning" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <PolygonZoning />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/zoning-legacy" element={
      <ProtectedRoute requiredPermission="edit">
        <ProjectRequiredRoute>
          <Zoning />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/zoning-subdivision" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <ZoningSubdivision />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/zoning-generator" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <ZoningGenerator />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/roads" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <Roads />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/parcels" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <Parcels />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    
    {/* Simulation and Optimization - Require Project Selection */}
    <Route path="/ai-optimization" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <AIOptimization />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/optimization-zoning" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <OptimizationZoning />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    
    {/* Analytics and Reporting - Require Project Selection */}
    <Route path="/analytics" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <Analytics />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    <Route path="/reports" element={
      <ProtectedRoute>
        <ProjectRequiredRoute>
          <Reports />
        </ProjectRequiredRoute>
      </ProtectedRoute>
    } />
    
    {/* Admin Panel Routes - Overview */}
    <Route path="/admin/profile" element={
      <ProtectedRoute requiredRole="admin">
        <AdminProfile />
      </ProtectedRoute>
    } />
    <Route path="/admin/analytics" element={
      <ProtectedRoute requiredRole="admin">
        <AdminAnalytics />
      </ProtectedRoute>
    } />
    
    {/* Admin Panel Routes - User Management */}
    <Route path="/admin/user-analytics" element={
      <ProtectedRoute requiredRole="admin">
        <UserAnalytics />
      </ProtectedRoute>
    } />
    <Route path="/admin/permissions" element={
      <ProtectedRoute requiredRole="admin">
        <UserPermissions />
      </ProtectedRoute>
    } />
    <Route path="/admin/invite" element={
      <ProtectedRoute requiredRole="admin">
        <InviteUsers />
      </ProtectedRoute>
    } />
    
    {/* Admin Panel Routes - System Management */}
    <Route path="/admin/system-health" element={
      <ProtectedRoute requiredRole="admin">
        <SystemHealth />
      </ProtectedRoute>
    } />
    <Route path="/admin/database" element={
      <ProtectedRoute requiredRole="admin">
        <DatabaseStatus />
      </ProtectedRoute>
    } />
    <Route path="/admin/logs" element={
      <ProtectedRoute requiredRole="admin">
        <SystemLogs />
      </ProtectedRoute>
    } />
    <Route path="/admin/server-status" element={
      <ProtectedRoute requiredRole="admin">
        <ServerStatus />
      </ProtectedRoute>
    } />
    
    {/* Admin Panel Routes - Monitoring */}
    <Route path="/admin/performance" element={
      <ProtectedRoute requiredRole="admin">
        <PerformanceMetrics />
      </ProtectedRoute>
    } />
    <Route path="/admin/alerts" element={
      <ProtectedRoute requiredRole="admin">
        <AlertsNotifications />
      </ProtectedRoute>
    } />
    <Route path="/admin/activity" element={
      <ProtectedRoute requiredRole="admin">
        <ActivityMonitor />
      </ProtectedRoute>
    } />
    <Route path="/admin/errors" element={
      <ProtectedRoute requiredRole="admin">
        <ErrorTracking />
      </ProtectedRoute>
    } />
    
    {/* Admin Panel Routes - Data Management */}
    <Route path="/admin/backup" element={
      <ProtectedRoute requiredRole="admin">
        <BackupRestore />
      </ProtectedRoute>
    } />
    <Route path="/admin/export" element={
      <ProtectedRoute requiredRole="admin">
        <DataExport />
      </ProtectedRoute>
    } />
    
    {/* Admin Panel Routes - Configuration */}
    <Route path="/admin/settings" element={
      <ProtectedRoute requiredRole="admin">
        <Settings />
      </ProtectedRoute>
    } />
    <Route path="/admin/security" element={
      <ProtectedRoute requiredRole="admin">
        <SecuritySettings />
      </ProtectedRoute>
    } />
    
    {/* Default redirect - landing for unauthenticated, dashboard for authenticated */}
    <Route path="/" element={<DefaultRedirect />} />
    
    {/* 404 page */}
    <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <ErrorBoundary showDetails={import.meta.env.DEV}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <ProjectProvider>
              <NotificationProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </NotificationProvider>
            </ProjectProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;