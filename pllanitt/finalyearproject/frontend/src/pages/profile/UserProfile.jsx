import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Building, 
  Activity,
  Edit,
  Save,
  X,
  Plus,
  FolderOpen,
  CheckCircle,
  Clock,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  Settings,
  Camera,
  Phone,
  Globe,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { processImageForUpload } from '../../utils/imageUtils';
import { handleError } from '../../utils/errorHandler';

const AVATAR_MAX_SIZE_MB = 2;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const resolveAvatarPreview = (value) => {
  if (!value) return '';
  if (value.startsWith('data:image')) return value;
  if (value.startsWith('http')) return value;
  if (value.startsWith('/uploads/')) {
    return `${API_BASE_URL}${value}`;
  }
  return value;
};

const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const { projects = [], loading: projectsLoading } = useProject();
  const navigate = useNavigate();
  const { toast } = useToast();
  const avatarInputRef = useRef(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    location: '',
    company: '',
    role: '',
    phone: '',
    website: '',
    avatar: ''
  });
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (user) {
      const nextAvatar = user.avatar || user.avatarUrl || '';
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        location: user.location || '',
        company: user.company || '',
        role: user.role || '',
        phone: user.phone || '',
        website: user.website || '',
        avatar: nextAvatar
      });
      setAvatarPreview(resolveAvatarPreview(nextAvatar));
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!profileData.name || !profileData.email) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in your name and email address',
          variant: 'destructive'
        });
        return;
      }
      
      // Update user profile
      const updatedUser = await updateUser(profileData);
      setAvatarPreview(resolveAvatarPreview(updatedUser?.avatar || ''));
      
      toast({
        title: 'Profile Updated!',
        description: `Great job, ${getUserFirstName()}! Your profile has been successfully updated.`,
        variant: 'default'
      });
      
      setIsEditing(false);
    } catch (error) {
      handleError(error, toast, { context: 'profile_update' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    const resetAvatar = user?.avatar || user?.avatarUrl || '';
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      location: user?.location || '',
      company: user?.company || '',
      role: user?.role || '',
      phone: user?.phone || '',
      website: user?.website || '',
      avatar: resetAvatar
    });
    setAvatarPreview(resolveAvatarPreview(resetAvatar));
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
    setIsEditing(false);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      // Process and optimize image
      const processed = await processImageForUpload(file);
      
      setAvatarPreview(processed.base64);
      setProfileData(prev => ({
        ...prev,
        avatar: processed.base64
      }));
      
      toast({
        title: 'Image processed',
        description: `Image optimized from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(processed.size / 1024 / 1024).toFixed(2)}MB`,
        variant: 'default'
      });
    } catch (error) {
      handleError(error, toast, { context: 'avatar_upload' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setProfileData(prev => ({
      ...prev,
      avatar: ''
    }));
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const getProjectStatus = (project) => {
    return project.status || 'Draft';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Active':
      case 'In Progress': return 'text-yellow-600 bg-yellow-100';
      case 'Draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return CheckCircle;
      case 'In Progress': return Clock;
      case 'Draft': return Activity;
      default: return Activity;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get user's first name for personalization
  const getUserFirstName = () => {
    if (!user?.name) return 'User';
    return user.name.split(' ')[0];
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6 animate-fade-in">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 p-8 bg-gradient-to-br from-accent-light to-accent-light dark:from-accent-dark dark:to-accent-dark rounded-2xl border border-accent-light-border dark:border-accent-dark-border shadow-card">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
                Welcome back, <span className="bg-gradient-base bg-clip-text text-transparent">{getUserFirstName()}!</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-medium animate-slide-in-left" style={{ animationDelay: '0.1s' }}>Manage your profile, track your progress, and view your projects</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-3">
                <div className={`relative w-24 h-24 rounded-full bg-gradient-base flex items-center justify-center text-white text-3xl font-bold shadow-button border-4 border-white dark:border-slate-800 overflow-hidden animate-scale-in ${avatarPreview ? 'bg-transparent border-white/90 dark:border-slate-700/90' : ''}`}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={`${profileData.name || 'User'} avatar`} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name ? getUserInitials() : 'U'}</span>
                  )}
                </div>
                {isEditing && (
                  <div className="flex gap-2 flex-wrap justify-center">
                    <label htmlFor="avatar-upload" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-accent-light-border dark:border-accent-dark-border bg-white/10 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-accent-light dark:hover:bg-accent-dark cursor-pointer transition-all duration-200 hover:-translate-y-0.5">
                      <Camera className="w-4 h-4" />
                      {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    <input
                      id="avatar-upload"
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    {avatarPreview && (
                      <button 
                        type="button" 
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                        onClick={handleRemoveAvatar}
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  {isEditing 
                    ? `Recommended square image • Max ${AVATAR_MAX_SIZE_MB}MB`
                    : 'Click "Edit Profile" to update your photo'}
                </p>
              </div>
              <div className="mt-2">
                <Badge className="bg-gradient-base text-white font-semibold px-4 py-1.5 rounded-full shadow-button">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4 mt-6 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-sm text-slate-700 dark:text-slate-200">
              <FolderOpen className="w-4 h-4 text-accent" />
              <span><span className="font-bold text-accent">{projects.length}</span> Projects</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-sm text-slate-700 dark:text-slate-200">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span><span className="font-bold text-accent">
                {projects.filter(p => p.status === 'In Progress' || p.status === 'Active').length}
              </span> Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-sm text-slate-700 dark:text-slate-200">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span><span className="font-bold text-accent">
                {projects.filter(p => p.status === 'Completed').length}
              </span> Completed</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Profile Information */}
          <Card className="hover:shadow-card-hover transition-all duration-300 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-base"></div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  <User className="w-5 h-5 text-accent" />
                  {isEditing ? 'Edit Profile Information' : `${getUserFirstName()}'s Profile`}
                </CardTitle>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button 
                        size="sm" 
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="bg-gradient-base text-white hover:opacity-90 shadow-button"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleCancelEdit}
                        className="border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 hover:bg-accent-light dark:hover:bg-accent-dark"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setIsEditing(true)}
                      className="bg-gradient-base text-white hover:opacity-90 shadow-button border-none"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {isEditing 
                  ? 'Update your personal information and preferences' 
                  : `Complete your profile to help others know more about ${getUserFirstName()}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <User className="w-4 h-4" />
                      Full Name
                    </Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        className="bg-accent-light/50 dark:bg-accent-dark/50 border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gradient-to-br from-accent-light to-accent-light dark:from-accent-dark dark:to-accent-dark rounded-xl border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 font-semibold">
                        {profileData.name || 'Not provided'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        className="bg-accent-light/50 dark:bg-accent-dark/50 border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-accent" />
                        {profileData.email || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="company" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <Briefcase className="w-4 h-4" />
                      Company / Organization
                    </Label>
                    {isEditing ? (
                      <Input
                        id="company"
                        value={profileData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        placeholder="Enter your company or organization"
                        className="bg-accent-light/50 dark:bg-accent-dark/50 border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 flex items-center">
                        <Briefcase className="w-4 h-4 mr-2 text-accent" />
                        {profileData.company || 'Not provided'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="role" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <Award className="w-4 h-4" />
                      Professional Role
                    </Label>
                    {isEditing ? (
                      <Input
                        id="role"
                        value={profileData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        placeholder="Enter your professional role"
                        className="bg-accent-light/50 dark:bg-accent-dark/50 border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 flex items-center">
                        <Award className="w-4 h-4 mr-2 text-accent" />
                        {profileData.role || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="location" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <MapPin className="w-4 h-4" />
                      Location
                    </Label>
                    {isEditing ? (
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Enter your location"
                        className="bg-accent-light/50 dark:bg-accent-dark/50 border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-accent" />
                        {profileData.location || 'Not provided'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="phone" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        className="bg-accent-light/50 dark:bg-accent-dark/50 border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-accent" />
                        {profileData.phone || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="bio" className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Bio</Label>
                  {isEditing ? (
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell us about yourself"
                      rows={3}
                      className="bg-accent-light/50 dark:bg-accent-dark/50 border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200">{profileData.bio || 'No bio provided'}</div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="website" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <Globe className="w-4 h-4" />
                    Website / Portfolio
                  </Label>
                  {isEditing ? (
                    <Input
                      id="website"
                      value={profileData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="Enter your website URL"
                      className="bg-accent-light/50 dark:bg-accent-dark/50 border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200">
                      {profileData.website ? (
                        <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center">
                          <Globe className="w-4 h-4 mr-2" />
                          {profileData.website}
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">Not provided</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Statistics */}
          <Card className="relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-base"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                <BarChart3 className="w-5 h-5 text-accent" />
                {getUserFirstName()}'s Statistics
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Overview of your projects, activity, and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center gap-4 p-6 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border hover:bg-accent-light dark:hover:bg-accent-dark hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-base opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-base flex items-center justify-center text-white shadow-button group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">{projects.length}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Total Projects</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-6 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border hover:bg-accent-light dark:hover:bg-accent-dark hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-base opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-base flex items-center justify-center text-white shadow-button group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                      {projects.filter(p => p.status === 'In Progress' || p.status === 'Active').length}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Active Projects</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-6 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border hover:bg-accent-light dark:hover:bg-accent-dark hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-base opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-base flex items-center justify-center text-white shadow-button group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                      {projects.filter(p => p.status === 'Completed').length}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Completed</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-6 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border hover:bg-accent-light dark:hover:bg-accent-dark hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-base opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-base flex items-center justify-center text-white shadow-button group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                      {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Member Since</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Projects */}
          <Card className="relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-base"></div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                    <Building className="w-5 h-5 text-accent" />
                    {getUserFirstName()}'s Projects
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    {projectsLoading ? 'Loading projects...' : `${projects.length} total ${projects.length === 1 ? 'project' : 'projects'}`}
                  </CardDescription>
                </div>
                <Button onClick={() => navigate('/data-ingestion')} className="bg-gradient-base text-white hover:opacity-90 shadow-button">
                  <Plus className="w-4 h-4 mr-1" />
                  New Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                  <span className="ml-2 text-slate-600 dark:text-slate-400">Loading projects...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">No projects yet</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">Start by creating your first project</p>
                  <Button onClick={() => navigate('/data-ingestion')} className="bg-gradient-base text-white hover:opacity-90 shadow-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project, index) => {
                    const status = getProjectStatus(project);
                    const StatusIcon = getStatusIcon(status);
                    return (
                      <div key={index} className="p-6 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border hover:bg-accent-light dark:hover:bg-accent-dark hover:shadow-card-hover transition-all duration-300 relative overflow-hidden cursor-pointer group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-base opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{project.title || `Project ${project.id}`}</h4>
                          <Badge className={`${getStatusColor(status)} text-xs`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{project.description || 'No description available'}</p>
                        <div className="flex flex-col gap-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <MapPin className="w-4 h-4" />
                            <span>{project.location || 'Location not set'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="w-4 h-4" />
                            <span>Created: {formatDate(project.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate('/data-ingestion', { state: { project } })}
                            className="border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 hover:bg-accent-light dark:hover:bg-accent-dark"
                          >
                            <Target className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default UserProfile;
