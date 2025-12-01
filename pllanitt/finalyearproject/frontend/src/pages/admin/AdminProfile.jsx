import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
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
  Shield,
  Edit,
  Save,
  X,
  Camera,
  Phone,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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

const AdminProfile = () => {
  const { user, updateUser } = useAuth();
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > AVATAR_MAX_SIZE_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please select an image smaller than ${AVATAR_MAX_SIZE_MB}MB`,
        variant: "destructive"
      });
      return;
    }

    try {
      const processedImage = await processImageForUpload(file);
      setAvatarPreview(processedImage);
      setProfileData(prev => ({ ...prev, avatar: processedImage }));
    } catch (error) {
      handleError(error, toast);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setProfileData(prev => ({ ...prev, avatar: '' }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await updateUser(profileData);
      toast({
        title: "Profile updated",
        description: "Your admin profile has been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      handleError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'A';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const getUserFirstName = () => {
    if (!user?.name) return 'Admin';
    return user.name.split(' ')[0];
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 animate-fade-in">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 p-8 bg-gradient-to-br from-accent-light to-accent-light dark:from-accent-dark dark:to-accent-dark rounded-2xl border border-accent-light-border dark:border-accent-dark-border shadow-card">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
                Admin Profile: <span className="bg-gradient-base bg-clip-text text-transparent">{getUserFirstName()}</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-medium animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
                Manage your administrator profile and account settings
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-3">
                <div className={`relative w-24 h-24 rounded-full bg-gradient-base flex items-center justify-center text-white text-3xl font-bold shadow-button border-4 border-white dark:border-slate-800 overflow-hidden animate-scale-in ${avatarPreview ? 'bg-transparent border-white/90 dark:border-slate-700/90' : ''}`}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={`${profileData.name || 'Admin'} avatar`} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name ? getUserInitials() : 'A'}</span>
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
              </div>
              <div className="mt-2">
                <Badge className="bg-gradient-base text-white font-semibold px-4 py-1.5 rounded-full shadow-button flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Administrator
                </Badge>
              </div>
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
                  {isEditing ? 'Edit Profile Information' : 'Profile Information'}
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
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          // Reset to original values
                          if (user) {
                            const nextAvatar = user.avatar || user.avatarUrl || '';
                            setProfileData({
                              name: user.name || '',
                              email: user.email || '',
                              bio: user.bio || '',
                              location: user.location || '',
                              company: user.company || '',
                              phone: user.phone || '',
                              website: user.website || '',
                              avatar: nextAvatar
                            });
                            setAvatarPreview(resolveAvatarPreview(nextAvatar));
                          }
                        }}
                        className="border-accent-light-border dark:border-accent-dark-border"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="bg-gradient-base text-white hover:opacity-90 shadow-button"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-lg border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100">
                      {profileData.name || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-lg border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100">
                      {profileData.email || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-lg border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100">
                      {profileData.phone || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </Label>
                  {isEditing ? (
                    <Input
                      id="website"
                      type="url"
                      value={profileData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-lg border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100">
                      {profileData.website || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-lg border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100">
                      {profileData.location || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Organization
                  </Label>
                  {isEditing ? (
                    <Input
                      id="company"
                      value={profileData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-lg border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100">
                      {profileData.company || 'Not set'}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-slate-700 dark:text-slate-300">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="px-3 py-2 bg-accent-light/50 dark:bg-accent-dark/50 rounded-lg border border-accent-light-border dark:border-accent-dark-border text-slate-800 dark:text-slate-100 min-h-[100px]">
                    {profileData.bio || 'No bio provided'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
