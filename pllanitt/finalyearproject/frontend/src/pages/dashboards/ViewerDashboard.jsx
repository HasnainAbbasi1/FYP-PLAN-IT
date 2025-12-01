import React from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Map, 
  FileText, 
  Download,
  Search,
  Calendar,
  MapPin,
  BarChart3,
  TrendingUp,
  Image,
  Presentation
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';

const ViewerDashboard = () => {
  const { projects, loading } = useProject();
  const { user } = useAuth();

  const viewerStats = [
    { title: 'Available Projects', value: projects?.length || 0, icon: Map, color: 'text-blue-500' },
    { title: 'Reports Viewed', value: '0', icon: FileText, color: 'text-green-500' },
    { title: 'Analytics Explored', value: '0', icon: BarChart3, color: 'text-purple-500' },
    { title: 'Last Access', value: 'Today', icon: Calendar, color: 'text-yellow-500' }
  ];

  const quickAccess = [
    { title: 'View Projects', description: 'Browse all available projects', icon: Eye, href: '/viewer/projects', color: 'from-blue-500 to-blue-600' },
    { title: 'Project Gallery', description: 'Visual showcase of projects', icon: Image, href: '/viewer/gallery', color: 'from-purple-500 to-purple-600' },
    { title: 'Analytics', description: 'Explore project analytics', icon: BarChart3, href: '/viewer/analytics', color: 'from-green-500 to-green-600' },
    { title: 'Reports', description: 'View project reports', icon: FileText, href: '/viewer/reports', color: 'from-orange-500 to-orange-600' },
    { title: 'Map Viewer', description: 'Interactive map exploration', icon: MapPin, href: '/viewer/map', color: 'from-indigo-500 to-indigo-600' },
    { title: 'Presentations', description: 'Project presentations', icon: Presentation, href: '/viewer/presentations', color: 'from-pink-500 to-pink-600' }
  ];

  const recentProjects = projects?.slice(0, 3) || [];

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              Viewer Dashboard
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Explore and discover project progress and results
            </p>
          </div>
          <Link 
            to="/viewer/projects" 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold flex items-center gap-2 py-3 px-6 text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 no-underline rounded-xl"
          >
            <Eye className="w-5 h-5" />
            Browse All Projects
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {viewerStats.map((stat, index) => (
            <Card key={index} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Access */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickAccess.map((item, index) => (
              <Link key={index} to={item.href} className="no-underline group">
                <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden relative">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`}></div>
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} text-white`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-sm text-slate-500 dark:text-slate-400">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Recent Projects</h2>
            <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">Available Projects</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">Projects you can explore and view</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {recentProjects.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                        <Map className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-slate-100">{project.title || project.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {project.type || 'Project'} • {project.status || 'Active'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                        View Only
                      </Badge>
                      <Link 
                        to={`/viewer/projects/${project.id || project._id}`}
                        className="border border-blue-300 dark:border-blue-700 bg-transparent text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-300 no-underline"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">Loading projects...</p>
          </div>
        )}

        {!loading && recentProjects.length === 0 && (
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardContent className="p-12 text-center">
              <Eye className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Projects Available</h3>
              <p className="text-slate-500 dark:text-slate-400">
                There are no projects available to view at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerDashboard;