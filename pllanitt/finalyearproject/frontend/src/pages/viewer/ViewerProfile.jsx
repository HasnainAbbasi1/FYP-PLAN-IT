import React, { useState, useEffect } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Eye,
  Shield,
  Camera,
  Phone,
  Globe,
  Building,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ViewerProfile = () => {
  const { user } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (user?.avatar || user?.avatarUrl) {
      const avatar = user.avatar || user.avatarUrl;
      if (avatar.startsWith('data:image') || avatar.startsWith('http')) {
        setAvatarPreview(avatar);
      } else if (avatar.startsWith('/uploads/')) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        setAvatarPreview(`${API_BASE_URL}${avatar}`);
      }
    }
  }, [user]);

  const getUserInitials = () => {
    if (!user?.name) return 'V';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const getUserFirstName = () => {
    if (!user?.name) return 'Viewer';
    return user.name.split(' ')[0];
  };

  return (
    <ViewerLayout>
      <div className="max-w-7xl mx-auto p-6 animate-fade-in">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
                Viewer Profile: <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{getUserFirstName()}</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-medium animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
                Your read-only account for exploring project progress
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white dark:border-slate-800 overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={`${user?.name || 'Viewer'} avatar`} className="w-full h-full object-cover" />
                ) : (
                  <span>{getUserInitials()}</span>
                )}
              </div>
              <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Viewer Account
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Profile Information */}
          <Card className="hover:shadow-card-hover transition-all duration-300 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                <User className="w-5 h-5 text-blue-600" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                    {user?.name || 'Not set'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                    {user?.email || 'Not set'}
                  </div>
                </div>

                {user?.phone && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </label>
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                      {user.phone}
                    </div>
                  </div>
                )}

                {user?.location && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </label>
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                      {user.location}
                    </div>
                  </div>
                )}
              </div>

              {user?.bio && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 min-h-[100px]">
                    {user.bio}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Type Info */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                <Shield className="w-5 h-5 text-blue-600" />
                Account Type
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Your viewer account permissions and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">View-Only Access</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      You can browse and explore all projects, analytics, and reports in read-only mode.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Restricted Actions</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Creating, editing, or deleting projects is not available in viewer mode.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ViewerLayout>
  );
};

export default ViewerProfile;

