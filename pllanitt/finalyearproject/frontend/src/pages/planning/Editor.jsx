
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Map as MapIcon,
  Layers,
  ZoomIn,
  ZoomOut, 
  Building,
  Route,
  TreeDeciduous,
  MapPin,
  School,
  CircleCheck,
  CircleX,
  Pencil,
  Trash,
  Image as ImageIcon,
  X
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ImageCustomizationEditor from '@/components/planning/ImageCustomizationEditor';
import polygonApi from '@/services/polygonApi';
import { projectApi } from '@/services/projectApi';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';

const MapEditor = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [activeTool, setActiveTool] = useState('');
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'image'
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState(null);
  
  // Polygon management
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load polygons when project is selected
  const loadPolygons = useCallback(async (projectId) => {
    try {
      setLoading(true);
      setError(null);
      console.log('📦 Loading polygons for project:', projectId);
      const data = await polygonApi.getPolygonsWithUnassigned(projectId);
      console.log('📦 Polygons API response:', data);
      const polygonsArray = Array.isArray(data) ? data : (data.polygons || data.data || []);
      console.log('Loaded polygons:', polygonsArray.length);
      setPolygons(polygonsArray);
      setSelectedPolygon(null);
      if (polygonsArray.length === 0) {
        setError('No polygons found in this project. Create polygons first.');
      }
    } catch (error) {
      console.error('Failed to load polygons:', error);
      setError(`Failed to load polygons: ${error.message}`);
      setPolygons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentProject?.id) {
      loadPolygons(currentProject.id);
    } else {
      setPolygons([]);
      setSelectedPolygon(null);
    }
  }, [currentProject, loadPolygons]);

  // Load available images for a polygon
  const loadAvailableImages = useCallback(async (polygonId) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Searching for images for polygon ${polygonId}...`);
      
      // Method 1: Check Python backend output directory (most reliable for zameen_style images)
      try {
        const response = await fetch(`http://localhost:5002/api/list_polygon_images/${polygonId}`);
        console.log(`📡 Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📦 Image list data:`, data);
          
          if (data.files && data.files.length > 0) {
            // Files are already sorted by modification time (most recent first)
            // Just use the first (latest) image
            const latestFile = data.files[0];
            const imageUrl = `http://localhost:5002/output/${latestFile}`;
            console.log(`Found ${data.files.length} images, loading latest: ${latestFile}`);
            
            setSelectedImageUrl(imageUrl);
            setSelectedPolygonId(polygonId);
            setViewMode('image');
            setLoading(false);
            return;
          } else {
            console.log(`No files found for polygon ${polygonId}`);
          }
        } else {
          console.log(`API returned status ${response.status}`);
        }
      } catch (e) {
        console.log('Method 1 failed:', e.message);
      }
      
      // Method 2: Check Python API
      try {
        const response = await fetch(`http://localhost:5002/api/zoning_results/${polygonId}`);
        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.analysis?.visualization?.image_url || data.result?.analysis?.visualization?.image_url;
          if (imageUrl) {
            const fullUrl = imageUrl.startsWith('http') ? imageUrl : `http://localhost:5002${imageUrl}`;
            setSelectedImageUrl(fullUrl);
            setSelectedPolygonId(polygonId);
            setViewMode('image');
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.log('Method 2 failed:', e);
      }
      
      // Method 3: Check Node.js backend
      try {
        const response = await fetch(`http://localhost:8000/api/polygon-images/${polygonId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.images && data.images.length > 0) {
            const imageUrl = data.images[0].url || data.images[0];
            const fullUrl = imageUrl.startsWith('http') ? imageUrl : `http://localhost:5002${imageUrl}`;
            setSelectedImageUrl(fullUrl);
            setSelectedPolygonId(polygonId);
            setViewMode('image');
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.log('Method 3 failed:', e);
      }
      
      setError(`No 2D visualization images found for polygon ${polygonId}. Please generate one first from the Zoning page.`);
    } catch (error) {
      console.error('Failed to load images:', error);
      setError(`Failed to load images: ${error.message}. Please ensure backends are running.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load specific image (wrapper function)
  const loadZoningImage = useCallback(async (polygonId) => {
    await loadAvailableImages(polygonId);
  }, [loadAvailableImages]);


  // Handle save customization
  const handleSaveCustomization = useCallback(async (customizationData) => {
    try {
      const response = await fetch('http://localhost:8000/api/customized-zoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customizationData)
      });
      if (response.ok) {
        alert('Customization saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save customization.');
    }
  }, []);

  // Close image editor
  const handleCloseImageEditor = useCallback(() => {
    setViewMode('map');
    setSelectedImageUrl(null);
  }, []);

  // Handle polygon selection
  const handlePolygonSelect = useCallback((value) => {
    const polygon = polygons.find(p => p.id.toString() === value);
    setSelectedPolygon(polygon);
  }, [polygons]);

  // Memoize polygon options to prevent unnecessary re-renders
  const polygonOptions = useMemo(() => {
    return polygons.map((polygon) => (
      <SelectItem key={polygon.id} value={polygon.id.toString()}>
        {polygon.name || `Polygon ${polygon.id}`}
      </SelectItem>
    ));
  }, [polygons]);

  // If in image customization mode, show the image editor
  if (viewMode === 'image' && selectedImageUrl) {
    return (
      <MainLayout showSidebar={false}>
        <div className="p-4 bg-gray-50 min-h-screen">
          <div className="mb-4 flex items-center justify-between bg-white p-4 rounded-lg shadow">
            <div>
              <h2 className="text-xl font-bold">2D Visualization Editor</h2>
              <p className="text-sm text-gray-600">Polygon ID: {selectedPolygonId}</p>
            </div>
            <Button onClick={handleCloseImageEditor} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Back to Map
            </Button>
          </div>
          <ImageCustomizationEditor
            imageUrl={selectedImageUrl}
            polygonId={selectedPolygonId}
            onSave={handleSaveCustomization}
            onClose={handleCloseImageEditor}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSidebar={false}>
      <div className="h-[calc(100vh-4rem)] relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex font-montserrat md:flex-col">
        {/* Left sidebar for tools */}
        <div className="w-14 bg-white dark:bg-slate-800 border-r border-accent-light-border dark:border-accent-dark-border flex flex-col items-center pt-4 pb-4 gap-6 shadow-[2px_0_10px_rgba(0,0,0,0.05)] md:w-full md:h-auto md:flex-row md:px-3 md:border-r-0 md:border-b md:gap-3 sm:px-2 sm:gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:min-w-10 md:h-10 sm:min-w-9 sm:h-9" onClick={() => setActiveTool('select')}>
                  <CircleCheck className={`h-5 w-5 ${activeTool === 'select' ? 'text-accent' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Select</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:min-w-10 md:h-10 sm:min-w-9 sm:h-9" onClick={() => setActiveTool('draw')}>
                  <Pencil className={`h-5 w-5 ${activeTool === 'draw' ? 'text-accent' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Draw</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:min-w-10 md:h-10 sm:min-w-9 sm:h-9" onClick={() => setActiveTool('zone')}>
                  <Layers className={`h-5 w-5 ${activeTool === 'zone' ? 'text-accent' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Zone Areas</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:min-w-10 md:h-10 sm:min-w-9 sm:h-9" onClick={() => setActiveTool('road')}>
                  <Route className={`h-5 w-5 ${activeTool === 'road' ? 'text-accent' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Add Roads</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:min-w-10 md:h-10 sm:min-w-9 sm:h-9" onClick={() => setActiveTool('building')}>
                  <Building className={`h-5 w-5 ${activeTool === 'building' ? 'text-accent' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Place Buildings</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:min-w-10 md:h-10 sm:min-w-9 sm:h-9" onClick={() => setActiveTool('park')}>
                  <TreeDeciduous className={`h-5 w-5 ${activeTool === 'park' ? 'text-accent' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Add Green Areas</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:min-w-10 md:h-10 sm:min-w-9 sm:h-9" onClick={() => setActiveTool('service')}>
                  <School className={`h-5 w-5 ${activeTool === 'service' ? 'text-accent' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Add Services</p>
              </TooltipContent>
            </Tooltip>
            
            <Separator className="my-2" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:min-w-10 md:h-10 sm:min-w-9 sm:h-9" onClick={() => setActiveTool('delete')}>
                  <Trash className={`h-5 w-5 ${activeTool === 'delete' ? 'text-destructive' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Map view area */}
        <div className="flex-1 relative md:h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)]">
          {/* Polygon Selection - Top Left */}
          {currentProject && (
            <Card className="absolute top-4 left-20 z-10 w-64 shadow-lg">
              <div className="p-3">
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-700">
                    Project: <span className="font-semibold">{currentProject.title || currentProject.name || `Project ${currentProject.id}`}</span>
                  </div>

                  {polygons.length > 0 ? (
                    <div>
                      <label className="text-xs font-medium mb-1 block text-gray-700">Polygon</label>
                      <Select
                        value={selectedPolygon?.id?.toString() || ''}
                        onValueChange={(value) => {
                          const polygon = polygons.find(p => p.id.toString() === value);
                          setSelectedPolygon(polygon);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select polygon" />
                        </SelectTrigger>
                        <SelectContent>
                          {polygonOptions}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : currentProject && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      {loading ? 'Loading polygons...' : 'No polygons in this project'}
                    </div>
                  )}

                  {selectedPolygon && (
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
                      onClick={() => loadZoningImage(selectedPolygon.id)}
                      disabled={loading}
                    >
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {loading ? 'Loading...' : 'Load & Customize Image'}
                    </Button>
                  )}

                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Placeholder for the map */}
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              {selectedPolygon ? (
                <div className="text-center max-w-md mx-auto">
                  <MapPin className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <p className="mb-2 text-lg font-semibold text-gray-800">
                    {selectedPolygon.name || `Polygon ${selectedPolygon.id}`}
                  </p>
                  <p className="mb-4 text-sm text-gray-600">
                    Ready to load 2D visualization image
                  </p>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => loadZoningImage(selectedPolygon.id)}
                    disabled={loading}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {loading ? 'Loading Image...' : 'Load & Customize Image'}
                  </Button>
                  {error && (
                    <p className="text-xs text-red-600 mt-3">{error}</p>
                  )}
                </div>
              ) : currentProject ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-2">Project: {currentProject.title || currentProject.name || `Project ${currentProject.id}`}</p>
                  <p className="text-sm text-gray-500">
                    {loading ? 'Loading polygons...' : 'Select a polygon from the dropdown above'}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-2">Welcome to the Map Editor</p>
                  <p className="text-sm text-gray-500">
                    Select a project from the header to get started
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Map controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button variant="secondary" size="icon" className="w-8 h-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="w-8 h-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          
          {/* Tool options based on active tool */}
          {activeTool && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] border border-accent-light-border dark:border-accent-dark-border transition-all duration-300 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)]">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium">
                  {activeTool === 'select' && 'Selection Mode'}
                  {activeTool === 'draw' && 'Drawing Mode'}
                  {activeTool === 'zone' && 'Zoning Mode'}
                  {activeTool === 'road' && 'Road Placement'}
                  {activeTool === 'building' && 'Building Placement'}
                  {activeTool === 'park' && 'Green Space'}
                  {activeTool === 'service' && 'Services Placement'}
                  {activeTool === 'delete' && 'Delete Mode'}
                </div>
                
                {/* Tool-specific controls */}
                {activeTool === 'zone' && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-sm bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700">Residential</Button>
                    <Button size="sm" variant="outline" className="text-sm bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700">Commercial</Button>
                    <Button size="sm" variant="outline" className="text-sm bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700">Industrial</Button>
                  </div>
                )}
                
                {activeTool === 'road' && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-sm bg-gray-800 dark:bg-gray-700 text-white">Primary</Button>
                    <Button size="sm" variant="outline" className="text-sm bg-gray-400 dark:bg-gray-600">Secondary</Button>
                    <Button size="sm" variant="outline" className="text-sm bg-white dark:bg-slate-800">Local</Button>
                  </div>
                )}
                
                {activeTool === 'building' && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-sm">Residential</Button>
                    <Button size="sm" variant="outline" className="text-sm">Commercial</Button>
                    <Button size="sm" variant="outline" className="text-sm">Mixed-Use</Button>
                  </div>
                )}
                
                {activeTool === 'service' && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-sm">School</Button>
                    <Button size="sm" variant="outline" className="text-sm">Hospital</Button>
                    <Button size="sm" variant="outline" className="text-sm">Police</Button>
                    <Button size="sm" variant="outline" className="text-sm">Fire Station</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right panel for properties */}
        <div className="w-72 bg-white dark:bg-slate-800 border-l border-accent-light-border dark:border-accent-dark-border overflow-y-auto shadow-[-2px_0_10px_rgba(0,0,0,0.05)]">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">Properties</h3>
              <div className="flex flex-col gap-4">
                {currentProject && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Project Name</label>
                      <Input 
                        type="text" 
                        placeholder="Enter project name" 
                        value={currentProject.title || currentProject.name || ''} 
                        className="w-full"
                        readOnly
                      />
                    </div>
                    
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                      <textarea 
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm resize-none h-20"
                        placeholder="Add a description"
                        value={currentProject.description || ''}
                        readOnly
                      ></textarea>
                    </div>
                  </>
                )}
                
                <Separator className="my-1" />
                
                {!currentProject && (
                  <div className="flex flex-col">
                    <p className="text-sm text-gray-500">Please select a project from the header</p>
                  </div>
                )}

                {currentProject && (
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Select Polygon</label>
                    {loading ? (
                      <div className="text-sm text-gray-500 py-2">Loading polygons...</div>
                    ) : polygons.length > 0 ? (
                      <Select
                        value={selectedPolygon?.id?.toString() || ''}
                        onValueChange={handlePolygonSelect}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select polygon" />
                        </SelectTrigger>
                        <SelectContent>
                          {polygonOptions}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500 py-2">
                          No polygons in this project
                        </div>
                        <div className="text-xs text-gray-400 mb-2">Or enter Polygon ID directly:</div>
                        <Input
                          type="number"
                          placeholder="Enter Polygon ID (e.g., 130)"
                          className="text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const polygonId = parseInt(e.target.value);
                              if (polygonId) {
                                setSelectedPolygon({ id: polygonId, name: `Polygon ${polygonId}` });
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Direct Polygon ID Input - Always Available */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Or Load by Polygon ID</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Polygon ID (e.g., 130)"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const polygonId = parseInt(e.target.value);
                          if (polygonId) {
                            loadZoningImage(polygonId);
                          }
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Polygon ID (e.g., 130)"]');
                        const polygonId = parseInt(input?.value);
                        if (polygonId) {
                          loadZoningImage(polygonId);
                        } else {
                          alert('Please enter a valid Polygon ID');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Load
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter polygon ID to load its 2D visualization image directly
                  </p>
                </div>

                {selectedPolygon && (
                  <div className="map-editor-property">
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => loadZoningImage(selectedPolygon.id)}
                      disabled={loading}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {loading ? 'Loading Image...' : 'Load & Customize Image'}
                    </Button>
                    {error && (
                      <p className="text-xs text-red-600 mt-2">{error}</p>
                    )}
                  </div>
                )}
                
                <Separator className="my-1" />
                
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Current Selection</label>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedPolygon ? (selectedPolygon.name || `Polygon ${selectedPolygon.id}`) : 'No item selected'}
                  </div>
                </div>
              
              <Separator className="my-1" />
              
              <div className="pt-2">
                <Button className="w-full bg-gradient-base text-white border-none py-3.5 px-7 rounded-xl font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full">Generate AI Recommendations</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MapEditor;
