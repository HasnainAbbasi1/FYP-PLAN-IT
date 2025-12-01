import React, { useState, useMemo } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Presentation, 
  Eye,
  Download,
  Calendar,
  FileText,
  Search,
  Filter,
  Play,
  Image
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ViewerPresentations = () => {
  const { projects, loading } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Generate presentation data from projects
  const presentations = useMemo(() => {
    if (!projects) return [];
    
    return projects.map(project => ({
      id: project.id || project._id,
      projectId: project.id || project._id,
      title: `${project.title || project.name || 'Untitled'} - Presentation`,
      projectTitle: project.title || project.name || 'Untitled Project',
      type: 'Project Overview',
      format: 'PDF',
      createdAt: project.created_at || project.createdAt,
      updatedAt: project.updated_at || project.updatedAt,
      thumbnail: project.thumbnail || '/placeholder-presentation.png',
      description: `Presentation for ${project.title || project.name} project`,
      location: project.location
    }));
  }, [projects]);

  const filteredPresentations = useMemo(() => {
    return presentations.filter(pres => {
      const matchesSearch = !searchQuery || 
        pres.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pres.projectTitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || pres.type.toLowerCase() === filterType.toLowerCase();
      
      return matchesSearch && matchesType;
    });
  }, [presentations, searchQuery, filterType]);

  const handleViewPresentation = (presentation) => {
    // In production, open presentation viewer or navigate to presentation page
    console.log('View presentation:', presentation);
  };

  const handleDownloadPresentation = (presentation) => {
    // In production, download presentation file
    console.log('Download presentation:', presentation);
  };

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              Presentations
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Browse and view project presentations and overviews
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search presentations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="project overview">Project Overview</SelectItem>
              <SelectItem value="progress report">Progress Report</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Presentations Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading presentations...</p>
          </div>
        ) : filteredPresentations.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <Presentation className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Presentations Available</h3>
              <p className="text-slate-500 dark:text-slate-400">No presentations are available to view at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPresentations.map((presentation) => (
              <Card key={presentation.id} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Presentation className="h-16 w-16 text-blue-400 dark:text-blue-500" />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-blue-600 text-white">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Badge>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white text-sm font-medium">{presentation.format}</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {presentation.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {presentation.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {presentation.createdAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(presentation.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    <Badge variant="outline">{presentation.type}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPresentation(presentation)}
                      className="flex-1 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPresentation(presentation)}
                      className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {filteredPresentations.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Presentations</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{filteredPresentations.length}</p>
                </div>
                <Presentation className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerPresentations;

