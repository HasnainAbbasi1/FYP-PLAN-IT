
import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search, 
  ChevronDown, 
  MoreHorizontal, 
  Shield, 
  User,
  MapPin,
  Trash2,
  Edit,
  Eye,
  Building,
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  Lock,
  Phone,
  FileText
} from 'lucide-react';
import adminApiService from '@/services/adminApi';
import { toast } from 'sonner';
import { 
  ValidatedInput, 
  ValidatedSelect,
  ErrorMessage, 
  LoadingButton,
  ValidationSummary 
} from '../../components/validation/ValidationComponents';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Users = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation schema for add user form
  const addUserSchema = Yup.object().shape({
    name: Yup.string()
      .required('Full name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must not exceed 50 characters')
      .matches(
        /^[a-zA-Z\s'-]+$/,
        'Name can only contain letters, spaces, hyphens, and apostrophes'
      ),
    email: Yup.string()
      .email('Please enter a valid email address')
      .required('Email is required')
      .min(5, 'Email must be at least 5 characters')
      .max(100, 'Email must not exceed 100 characters')
      .matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please enter a valid email format'
      ),
    password: Yup.string()
      .required('Password is required')
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must not exceed 128 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    role: Yup.string()
      .required('Role is required')
      .oneOf(['viewer', 'planner', 'admin'], 'Please select a valid role'),
    phone: Yup.string()
      .nullable()
      .matches(
        /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
        'Please enter a valid phone number'
      ),
    bio: Yup.string()
      .nullable()
      .max(500, 'Bio must not exceed 500 characters')
  });

  const initialUserValues = {
    name: '',
    email: '',
    password: '',
    role: 'viewer',
    phone: '',
    bio: ''
  };
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm
      };

      const response = await adminApiService.getAllUsers(params);
      
      if (response.success) {
        setUsers(response.data.users);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await adminApiService.deleteUser(userId);
      if (response.success) {
        toast.success('User deleted successfully');
        fetchUsers(); // Refresh the list
      } else {
        toast.error('Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user: ' + err.message);
    }
  };

  const handleViewUserProjects = async (userId) => {
    try {
      const response = await adminApiService.getUserProjects(userId);
      if (response.success) {
        setProjects(response.data);
        setShowProjectDetails(true);
      } else {
        toast.error('Failed to fetch user projects');
      }
    } catch (err) {
      console.error('Error fetching user projects:', err);
      toast.error('Failed to fetch user projects: ' + err.message);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!confirm(`Are you sure you want to delete project "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await adminApiService.deleteProject(projectId);
      if (response.success) {
        toast.success('Project deleted successfully');
        // Refresh user projects if viewing them
        if (showProjectDetails && selectedUser) {
          handleViewUserProjects(selectedUser.id);
        }
      } else {
        toast.error('Failed to delete project');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project: ' + err.message);
    }
  };

  const handleAddUser = async (values, { setSubmitting, resetForm, setFieldError }) => {
    setIsSubmitting(true);
    try {
      const response = await adminApiService.createUser(values);
      if (response.success) {
        toast.success('User created successfully!');
        resetForm();
        setShowAddUserModal(false);
        fetchUsers(); // Refresh the user list
      } else {
        if (response.field === 'email') {
          setFieldError('email', response.message || response.error);
        } else if (response.field === 'name') {
          setFieldError('name', response.message || response.error);
        } else if (response.field === 'password') {
          setFieldError('password', response.message || response.error);
        } else {
          toast.error(response.message || response.error || 'Failed to create user');
        }
      }
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error('Failed to create user: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 p-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-base via-accent to-white81 bg-clip-text text-transparent mb-2 animate-slide-in-left">User Management</h1>
            <p className="text-muted-foreground">Manage your users and their permissions</p>
          </div>
          <Button className="bg-theme-accent text-white hover:bg-theme-accent/90" onClick={() => setShowAddUserModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Add New User
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search users..." 
              className="pl-10 bg-secondary border-accent-light-border/40 w-full md:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex items-center border-accent-light-border/40">
              Role <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" className="flex items-center border-accent-light-border/40">
              Status <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" className="flex items-center border-accent-light-border/40">
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-secondary border-0">
            <TabsTrigger value="all" className="text-white data-[state=active]:bg-theme-accent data-[state=active]:text-white">
              All Users
            </TabsTrigger>
            <TabsTrigger value="admins" className="text-white data-[state=active]:bg-theme-accent data-[state=active]:text-white">
              Admins
            </TabsTrigger>
            <TabsTrigger value="planners" className="text-white data-[state=active]:bg-theme-accent data-[state=active]:text-white">
              Planners
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-theme-accent data-[state=active]:text-white">
              Public Users
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <Card className="bg-secondary border-0">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading users...</span>
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader className="bg-theme-primary/40">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-accent-light-border/20">
                          <TableCell className="font-medium text-white">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge 
                              className={`px-2 py-1 rounded-full text-xs ${
                                user.role === 'admin' 
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : user.role === 'planner'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`px-2 py-1 rounded-full text-xs ${
                                user.isActive 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.lastLogin 
                              ? new Date(user.lastLogin).toLocaleDateString()
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                handleViewUserProjects(user.id);
                              }}
                            >
                              <Building className="h-4 w-4 mr-1" />
                              View Projects
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="font-medium">Actions</DropdownMenuLabel>
                                <DropdownMenuItem 
                                  className="flex items-center"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDetails(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>View Details</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="flex items-center"
                                  onClick={() => handleViewUserProjects(user.id)}
                                >
                                  <Building className="mr-2 h-4 w-4" />
                                  <span>View Projects</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center">
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit User</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-500 flex items-center"
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete User</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="admins" className="mt-4">
            <Card className="bg-secondary border-0">
              <CardHeader>
                <CardTitle>Administrators</CardTitle>
                <CardDescription>Users with full system access</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Filtered administrator users would appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="planners" className="mt-4">
            <Card className="bg-secondary border-0">
              <CardHeader>
                <CardTitle>Urban Planners</CardTitle>
                <CardDescription>Users with planning and design permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Filtered planner users would appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users" className="mt-4">
            <Card className="bg-secondary border-0">
              <CardHeader>
                <CardTitle>Public Users</CardTitle>
                <CardDescription>Users with limited viewing permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Filtered public users would appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_2fr]">
          <Card className="bg-secondary border-0">
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>Recent user actions and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 border border-accent-light-border/20 rounded-lg p-3">
                  <div className="flex items-center justify-center rounded-full p-2 bg-blue-500/20">
                    <UsersIcon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-white">Mark Johnson logged in</p>
                    <p className="text-xs text-muted-foreground">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border border-accent-light-border/20 rounded-lg p-3">
                  <div className="flex items-center justify-center rounded-full p-2 bg-purple-500/20">
                    <Shield className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-white">Sarah Lopez was promoted to Planner</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border border-accent-light-border/20 rounded-lg p-3">
                  <div className="flex items-center justify-center rounded-full p-2 bg-green-500/20">
                    <UserPlus className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-white">New user joined: Michael Brown</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary border-0">
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Manage user roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="border border-accent-light-border/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full p-2 bg-blue-500/20">
                        <Shield className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-medium text-white">Administrator</h4>
                        <p className="text-xs text-muted-foreground">Full system access and user management</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-sm border-accent-light-border/40">Edit Permissions</Button>
                  </div>
                </div>
                
                <div className="border border-accent-light-border/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full p-2 bg-purple-500/20">
                        <MapPin className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-medium text-white">Urban Planner</h4>
                        <p className="text-xs text-muted-foreground">Create and edit plans, run simulations</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-sm border-accent-light-border/40">Edit Permissions</Button>
                  </div>
                </div>
                
                <div className="border border-accent-light-border/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full p-2 bg-gray-500/20">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-medium text-white">Public User</h4>
                        <p className="text-xs text-muted-foreground">View plans and basic reports</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-sm border-accent-light-border/40">Edit Permissions</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Details Modal */}
        {showProjectDetails && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Projects for {selectedUser.name}
                </h2>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowProjectDetails(false);
                    setSelectedUser(null);
                    setProjects([]);
                  }}
                >
                  Close
                </Button>
              </div>
              
              {projects.length === 0 ? (
                <p className="text-gray-500">No projects found for this user.</p>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Card key={project.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <p className="text-gray-600 mt-1">{project.description}</p>
                            <div className="flex gap-4 mt-2 text-sm text-gray-500">
                              <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                              <span>Status: {project.status || 'Active'}</span>
                              <span>Type: {project.type || 'Planning'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // View project details
                                window.open(`/projects/${project.id}`, '_blank');
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteProject(project.id, project.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Details</h2>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowUserDetails(false);
                    setSelectedUser(null);
                  }}
                >
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="font-medium">Name:</label>
                  <p className="text-gray-600">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="font-medium">Email:</label>
                  <p className="text-gray-600">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="font-medium">Role:</label>
                  <p className="text-gray-600 capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <label className="font-medium">Status:</label>
                  <p className="text-gray-600">{selectedUser.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <label className="font-medium">Last Login:</label>
                  <p className="text-gray-600">
                    {selectedUser.lastLogin 
                      ? new Date(selectedUser.lastLogin).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <label className="font-medium">Created:</label>
                  <p className="text-gray-600">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedUser.phone && (
                  <div>
                    <label className="font-medium">Phone:</label>
                    <p className="text-gray-600">{selectedUser.phone}</p>
                  </div>
                )}
                {selectedUser.bio && (
                  <div>
                    <label className="font-medium">Bio:</label>
                    <p className="text-gray-600">{selectedUser.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Add New User</h2>
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <Formik
                  initialValues={initialUserValues}
                  validationSchema={addUserSchema}
                  onSubmit={handleAddUser}
                  validateOnChange={true}
                  validateOnBlur={true}
                >
                  {({ errors, touched, isSubmitting, values, setFieldValue }) => (
                    <Form className="space-y-4">
                      <ValidationSummary errors={errors} className="mb-2" />
                      
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-foreground font-medium">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Field name="name">
                          {({ field, form }) => (
                            <ValidatedInput
                              field={field}
                              form={form}
                              type="text"
                              placeholder="John Doe"
                              icon={User}
                            />
                          )}
                        </Field>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="email" className="text-foreground font-medium">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Field name="email">
                          {({ field, form }) => (
                            <ValidatedInput
                              field={field}
                              form={form}
                              type="email"
                              placeholder="john@example.com"
                              icon={Mail}
                            />
                          )}
                        </Field>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="password" className="text-foreground font-medium">
                          Password <span className="text-red-500">*</span>
                        </Label>
                        <Field name="password">
                          {({ field, form }) => (
                            <ValidatedInput
                              field={field}
                              form={form}
                              type="password"
                              autoComplete="new-password"
                              placeholder="Min. 6 characters (A-Z, a-z, 0-9)"
                              icon={Lock}
                            />
                          )}
                        </Field>
                        <p className="text-xs text-muted-foreground mt-1">
                          Must contain uppercase, lowercase, and number
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="role" className="text-foreground font-medium">
                          Role <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={values.role}
                          onValueChange={(value) => setFieldValue('role', value)}
                        >
                          <SelectTrigger className={errors.role && touched.role ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="planner">Planner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.role && touched.role && (
                          <ErrorMessage error={errors.role} />
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="phone" className="text-foreground font-medium">
                          Phone (Optional)
                        </Label>
                        <Field name="phone">
                          {({ field, form }) => (
                            <ValidatedInput
                              field={field}
                              form={form}
                              type="tel"
                              placeholder="+1234567890"
                              icon={Phone}
                            />
                          )}
                        </Field>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="bio" className="text-foreground font-medium">
                          Bio (Optional)
                        </Label>
                        <Field name="bio">
                          {({ field, form }) => (
                            <Textarea
                              {...field}
                              placeholder="Brief bio about the user"
                              rows={3}
                              className={`
                                w-full
                                ${form.touched.bio && form.errors.bio 
                                  ? 'border-destructive focus:border-destructive focus:ring-destructive' 
                                  : 'border-border'
                                }
                              `}
                            />
                          )}
                        </Field>
                        {errors.bio && touched.bio && (
                          <ErrorMessage error={errors.bio} />
                        )}
                        <div className="text-xs text-muted-foreground text-right">
                          {values.bio?.length || 0}/500 characters
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="button"
                          onClick={() => setShowAddUserModal(false)}
                          className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                          disabled={isSubmitting || isSubmitting}
                        >
                          Cancel
                        </Button>
                        <LoadingButton
                          type="submit"
                          loading={isSubmitting || isSubmitting}
                          disabled={isSubmitting || isSubmitting}
                          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Create User
                        </LoadingButton>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Users;
