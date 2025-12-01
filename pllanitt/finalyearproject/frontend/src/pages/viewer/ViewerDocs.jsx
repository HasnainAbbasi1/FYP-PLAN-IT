import React, { useState, useMemo } from 'react';
import ViewerLayout from '@/components/viewer/ViewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  FileText,
  Download,
  Eye,
  Calendar,
  Search,
  Filter,
  File,
  Folder,
  ExternalLink
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ViewerDocs = () => {
  const { projects, loading } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Generate documentation from projects
  const documentation = useMemo(() => {
    if (!projects) return [];

    const docs = [];
    
    projects.forEach(project => {
      // Project documentation
      docs.push({
        id: `doc-${project.id || project._id}`,
        projectId: project.id || project._id,
        title: `${project.title || project.name || 'Untitled'} - Documentation`,
        category: 'Project Documentation',
        type: 'PDF',
        size: '2.4 MB',
        createdAt: project.created_at || project.createdAt,
        description: `Complete documentation for ${project.title || project.name} project`,
        projectTitle: project.title || project.name
      });

      // Technical documentation
      if (project.description) {
        docs.push({
          id: `tech-${project.id || project._id}`,
          projectId: project.id || project._id,
          title: `${project.title || project.name || 'Untitled'} - Technical Specs`,
          category: 'Technical Documentation',
          type: 'PDF',
          size: '1.8 MB',
          createdAt: project.created_at || project.createdAt,
          description: `Technical specifications and requirements`,
          projectTitle: project.title || project.name
        });
      }
    });

    return docs;
  }, [projects]);

  const filteredDocs = useMemo(() => {
    return documentation.filter(doc => {
      const matchesSearch = !searchQuery || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || 
        doc.category.toLowerCase() === filterCategory.toLowerCase();
      
      return matchesSearch && matchesCategory;
    });
  }, [documentation, searchQuery, filterCategory]);

  const categories = useMemo(() => {
    const cats = new Set(documentation.map(doc => doc.category));
    return Array.from(cats);
  }, [documentation]);

  const handleViewDoc = (doc) => {
    console.log('View document:', doc);
  };

  const handleDownloadDoc = (doc) => {
    console.log('Download document:', doc);
  };

  return (
    <ViewerLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 mb-4 sm:flex-col sm:items-stretch">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">
              Documentation
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Access project documentation, guides, and technical specifications
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[220px] bg-white dark:bg-slate-800">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat.toLowerCase()}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Documentation List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading documentation...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No Documentation Available</h3>
              <p className="text-slate-500 dark:text-slate-400">No documentation is available to view at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDocs.map((doc) => (
              <Card key={doc.id} className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border shadow-card hover:shadow-card-hover transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex-shrink-0">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {doc.title}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {doc.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                          {doc.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Folder className="w-3 h-3" />
                            <span>{doc.category}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <File className="w-3 h-3" />
                            <span>{doc.size}</span>
                          </div>
                          {doc.createdAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                        <Eye className="w-3 h-3 mr-1" />
                        View Only
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDoc(doc)}
                        className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDoc(doc)}
                        className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {filteredDocs.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Total Documents</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{filteredDocs.length}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Categories</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{categories.length}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Total Size</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                    {(filteredDocs.length * 2.1).toFixed(1)} MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ViewerLayout>
  );
};

export default ViewerDocs;

