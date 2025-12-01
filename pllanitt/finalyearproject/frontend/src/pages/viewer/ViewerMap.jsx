import React, { useState, useMemo } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Map, 
  MapPin,
  Eye,
  Layers,
  ZoomIn,
  ZoomOut,
  Navigation,
  Search
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ViewerMap = () => {
  const { projects, currentProject, loading } = useProject();
  const [selectedProject, setSelectedProject] = useState(currentProject?.id?.toString() || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapView, setMapView] = useState('satellite');

  const filteredProjects = useMemo(() => {
    let filtered = projects || [];

    if (selectedProject !== 'all') {
      filtered = filtered.filter(p => (p.id || p._id)?.toString() === selectedProject);
    }

    if (searchQuery) {
      filtered = filtered.filter(project => 
        (project.title || project.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.location || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [projects, selectedProject, searchQuery]);

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              Map Viewer
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Explore project locations on an interactive map
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by location or project name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-slate-800">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id || project._id} value={(project.id || project._id)?.toString()}>
                  {project.title || project.name || 'Untitled'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mapView} onValueChange={setMapView}>
            <SelectTrigger className="w-[150px] bg-white dark:bg-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="satellite">Satellite</SelectItem>
              <SelectItem value="terrain">Terrain</SelectItem>
              <SelectItem value="roadmap">Roadmap</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Map Container */}
        <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-blue-600" />
                  Project Locations
                </CardTitle>
                <CardDescription>
                  {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} displayed
                </CardDescription>
              </div>
              <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                <Eye className="w-3 h-3 mr-1" />
                View Only
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative w-full h-[600px] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              {/* Placeholder Map - In production, integrate with actual map library like Leaflet or Google Maps */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Map className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Interactive Map Viewer</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Map integration coming soon
                  </p>
                </div>
              </div>

              {/* Project Markers Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {filteredProjects.map((project, index) => {
                  if (!project.location) return null;
                  // Simulated marker positions (in production, use actual coordinates)
                  const left = 20 + (index * 15) % 60;
                  const top = 20 + (index * 20) % 60;
                  return (
                    <div
                      key={project.id || project._id}
                      className="absolute pointer-events-auto"
                      style={{ left: `${left}%`, top: `${top}%` }}
                    >
                      <div className="relative group">
                        <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                            {project.title || project.name}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project List */}
        {filteredProjects.length > 0 && (
          <Card className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Projects on Map
              </CardTitle>
              <CardDescription>Projects visible in the current map view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id || project._id}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex-shrink-0">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 truncate">
                          {project.title || project.name || 'Untitled Project'}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {project.location || 'Location not specified'}
                        </p>
                        {project.status && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {project.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading map data...</p>
          </div>
        )}

        {!loading && filteredProjects.length === 0 && (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <Map className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Projects Found</h3>
              <p className="text-slate-500 dark:text-slate-400">No projects match your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerMap;

