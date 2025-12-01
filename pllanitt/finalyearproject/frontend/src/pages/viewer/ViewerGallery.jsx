import React, { useState, useMemo } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Image, 
  Search,
  Grid3X3,
  List,
  Map,
  Eye,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const ViewerGallery = () => {
  const { projects, loading } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedProject, setSelectedProject] = useState('all');

  const filteredProjects = useMemo(() => {
    let filtered = projects || [];

    if (selectedProject !== 'all') {
      filtered = filtered.filter(p => (p.id || p._id)?.toString() === selectedProject);
    }

    if (searchQuery) {
      filtered = filtered.filter(project => 
        (project.title || project.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [projects, searchQuery, selectedProject]);

  const getProjectImage = (project) => {
    // Use project thumbnail, map preview, or default
    return project.thumbnail || project.map_preview || '/placeholder-project.png';
  };

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              Project Gallery
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Visual showcase of all project progress and results
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-slate-800">
              <Filter className="w-4 h-4 mr-2" />
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
        </div>

        {/* Gallery */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">Loading gallery...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <Image className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Projects Found</h3>
              <p className="text-slate-500 dark:text-slate-400">No projects available in the gallery.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id || project._id} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden group">
                <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 overflow-hidden">
                  <img 
                    src={getProjectImage(project)} 
                    alt={project.title || project.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = '/placeholder-project.png';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-blue-600 text-white">View Only</Badge>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h3 className="text-white font-semibold text-lg mb-1">{project.title || project.name}</h3>
                    <p className="text-white/80 text-sm line-clamp-1">{project.location || 'Location not specified'}</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Card key={project.id || project._id} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 overflow-hidden flex-shrink-0">
                      <img 
                        src={getProjectImage(project)} 
                        alt={project.title || project.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-project.png';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">
                            {project.title || project.name}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                            {project.description || 'No description available'}
                          </p>
                        </div>
                        <Badge className="bg-blue-600 text-white">View Only</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        {project.location && (
                          <div className="flex items-center gap-1">
                            <Map className="w-4 h-4" />
                            <span>{project.location}</span>
                          </div>
                        )}
                        {project.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(project.created_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        {project.status && (
                          <Badge variant="outline">{project.status}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {filteredProjects.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Projects in Gallery</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{filteredProjects.length}</p>
                </div>
                <Image className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerGallery;

