import React, { useState, useRef, useEffect } from 'react';
import { Formik, Form, Field, FieldArray } from 'formik';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, MapPin, Calendar, Users, Tag, Upload, FileText, Map, Search, Plus, Lightbulb } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { projectSchema } from '../../validation/authSchemas';
import { 
  ValidatedInput, 
  ErrorMessage, 
  LoadingButton,
  ValidationSummary 
} from '../../components/validation/ValidationComponents';

const CreateProjectModal = ({ isOpen, onClose }) => {
  const { createProject, loading } = useProject();
  const { user } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Initial values for Formik
  const initialValues = {
    title: '',
    description: '',
    location: '',
    type: undefined,
    priority: 'Medium',
    estimatedDuration: '',
    budget: '',
    tags: [],
    objectives: [''],
    teamMembers: [user?.id].filter(Boolean),
    startDate: '',
    endDate: '',
    coordinates: null,
    area: 0
  };

  const projectTypes = [
    'Residential Development',
    'Commercial Development',
    'Mixed-Use Development',
    'Infrastructure',
    'Transportation',
    'Green Spaces',
    'Urban Renewal',
    'Industrial Zone',
    'Community Facilities',
    'Other'
  ];

  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  // Initialize map when modal opens and location tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'location' && mapRef.current && !mapInstanceRef.current) {
      // Add a delay to ensure the DOM is ready and visible
      const timer = setTimeout(() => {
        console.log('Attempting to initialize map...');
        initializeMap();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  // Force map resize when tab becomes active
  useEffect(() => {
    if (activeTab === 'location' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
        console.log('Map resized');
      }, 100);
    }
  }, [activeTab]);

  // Cleanup map when modal closes
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [isOpen]);

  // Initialize Leaflet map
  const initializeMap = async () => {
    try {
      console.log('Starting map initialization...');
      
      // Check if map container exists and is visible
      if (!mapRef.current) {
        console.log('Map container not ready');
        return;
      }

      // Check if container has dimensions
      const rect = mapRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log('Map container has no dimensions, retrying...');
        setTimeout(() => initializeMap(), 500);
        return;
      }

      // Try to use global Leaflet first, then dynamic import
      let L;
      if (window.L) {
        L = window.L;
        console.log('Using global Leaflet');
      } else {
        console.log('Importing Leaflet dynamically...');
        L = (await import('leaflet')).default;
      }
      
      // Fix for default markers
      if (L.Icon.Default.prototype._getIconUrl) {
        delete L.Icon.Default.prototype._getIconUrl;
      }
      
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      console.log('Creating map instance...');

      // Initialize map with default location
      const map = L.map(mapRef.current, {
        center: [40.7128, -74.0060], // Default to NYC
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true
      });

      console.log('Adding tile layer...');

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
      }).addTo(map);

      // Add click handler for location selection - will be updated by Formik context
      // This will be handled in the Formik render function

      // Store map instance
      mapInstanceRef.current = map;
      
      // Force map to resize after initialization
      setTimeout(() => {
        map.invalidateSize();
        console.log('Map invalidated and resized');
      }, 200);

      console.log('Map initialized successfully');
      
    } catch (error) {
      console.error('Error initializing map:', error);
      console.error('Error stack:', error.stack);
      
      // Show error message in the map container
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; border-radius: 8px;">
            <p style="color: #666; margin-bottom: 10px;">Failed to load map</p>
            <button onclick="window.location.reload()" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
          </div>
        `;
      }
      
      if (typeof toast !== 'undefined') {
        toast.error('Failed to load map. Please refresh the page.');
      }
    }
  };

  // Reverse geocoding to get address from coordinates
  const reverseGeocode = async (lat, lng, setFieldValue = null) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      if (data.display_name && setFieldValue) {
        setFieldValue('location', data.display_name);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  // Search for locations
  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Add User-Agent header and handle CORS
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PLAN-it Urban Planning App'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching location:', error);
      
      // Provide fallback search results for common cities
      const fallbackResults = [
        { display_name: `${query} (Manual Entry)`, lat: "0", lon: "0" },
        { display_name: "New York, NY, USA", lat: "40.7128", lon: "-74.0060" },
        { display_name: "London, UK", lat: "51.5074", lon: "-0.1278" },
        { display_name: "Paris, France", lat: "48.8566", lon: "2.3522" },
        { display_name: "Tokyo, Japan", lat: "35.6762", lon: "139.6503" }
      ].filter(result => 
        result.display_name.toLowerCase().includes(query.toLowerCase())
      );
      
      setSearchResults(fallbackResults);
      
      if (typeof toast !== 'undefined') {
        toast.error('Location search unavailable. Using fallback results.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Handle location search input
  const handleLocationSearch = (value) => {
    setLocationSearch(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchLocation(value);
    }, 500);
    return () => clearTimeout(timeoutId);
  };


  const handleSubmit = async (values, { setSubmitting, setFieldError, resetForm: formikReset }) => {
    try {
      const projectData = {
        ...values,
        objectives: values.objectives.filter(obj => obj && obj.trim()),
        budget: values.budget ? parseFloat(values.budget) : null,
        estimatedDuration: values.estimatedDuration ? parseInt(values.estimatedDuration) : null,
        status: 'Planning',
        progress: 0,
        area: values.area || 0,
        createdBy: user?.id,
        metadata: {
          coordinates: values.coordinates,
          createdVia: 'modal'
        }
      };

      const newProject = await createProject(projectData);
      toast.success('Project created successfully!');
      formikReset();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to create project. Please try again.';
      
      if (error.response) {
        if (error.response.status === 500) {
          errorMessage = 'Server error. Please check if the backend is properly configured.';
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
          // Try to set field-specific errors
          if (error.response.data.field) {
            setFieldError(error.response.data.field, error.response.data.message);
            return;
          }
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewTag('');
    setActiveTab('basic');
    setSelectedLocation(null);
    setLocationSearch('');
    setSearchResults([]);
    
    // Clean up map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in">
      <div className="w-full max-w-[800px] max-h-[90vh] overflow-y-auto">
        <Card className="z-[1050] relative bg-white dark:bg-slate-800 border border-border shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] animate-slide-in">
          <CardHeader className="border-b border-border p-6 md:p-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Create New Project</CardTitle>
                <CardDescription>Start a new urban planning project</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 max-h-[70vh] overflow-y-auto md:p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="location">Location & Map</TabsTrigger>
                <TabsTrigger value="details">Details & Objectives</TabsTrigger>
              </TabsList>

            <Formik
              initialValues={initialValues}
              validationSchema={projectSchema}
              onSubmit={handleSubmit}
              validateOnChange={true}
              validateOnBlur={true}
            >
              {({ errors, touched, isSubmitting, values, setFieldValue, setFieldTouched }) => {
                // Update location and coordinates when search result is selected
                const selectSearchResultWithFormik = async (result) => {
                  const lat = parseFloat(result.lat);
                  const lng = parseFloat(result.lon);
                  
                  setSelectedLocation({ lat, lng });
                  setFieldValue('coordinates', { lat, lng });
                  setFieldValue('location', result.display_name);
                  setLocationSearch(result.display_name);
                  setSearchResults([]);

                  // Update map if initialized
                  if (mapInstanceRef.current) {
                    try {
                      const L = window.L || (await import('leaflet')).default;
                      mapInstanceRef.current.setView([lat, lng], 15);
                      if (markerRef.current) {
                        mapInstanceRef.current.removeLayer(markerRef.current);
                      }
                      markerRef.current = L.marker([lat, lng], {
                        title: result.display_name
                      }).addTo(mapInstanceRef.current);
                    } catch (error) {
                      console.error('Error updating map:', error);
                    }
                  }
                };

                // Set up map click handler when map is ready
                React.useEffect(() => {
                  if (mapInstanceRef.current && activeTab === 'location') {
                    const map = mapInstanceRef.current;
                    
                    // Remove existing click handlers
                    map.off('click');
                    
                    // Add new click handler with Formik integration
                    const handleMapClick = async (e) => {
                      const { lat, lng } = e.latlng;
                      console.log('Map clicked:', lat, lng);
                      
                      setSelectedLocation({ lat, lng });
                      setFieldValue('coordinates', { lat, lng });
                      setFieldValue('location', `${lat.toFixed(6)}, ${lng.toFixed(6)}`);

                      // Add or update marker
                      try {
                        const L = window.L || (await import('leaflet')).default;
                        if (markerRef.current) {
                          map.removeLayer(markerRef.current);
                        }
                        
                        markerRef.current = L.marker([lat, lng], {
                          title: 'Selected Location'
                        }).addTo(map);

                        // Reverse geocoding to get address
                        reverseGeocode(lat, lng, setFieldValue);
                      } catch (error) {
                        console.error('Error handling map click:', error);
                      }
                    };
                    
                    map.on('click', handleMapClick);
                    
                    // Cleanup
                    return () => {
                      map.off('click', handleMapClick);
                    };
                  }
                }, [activeTab]); // Only depend on activeTab, setFieldValue is stable from Formik

                return (
                  <Form className="flex flex-col gap-8">
                    <ValidationSummary errors={errors} className="mb-4" />
                    
                    <TabsContent value="basic" className="mt-6 min-h-[400px] md:min-h-[300px]">
                      {/* Basic Information */}
                      <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center mb-2">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="title">Project Title * (3-255 characters)</Label>
                            <Field name="title">
                              {({ field, form }) => (
                                <>
                                  <Input
                                    {...field}
                                    placeholder="Enter project title"
                                    className={form.touched.title && form.errors.title ? 'border-destructive focus:border-destructive focus:ring-destructive' : ''}
                                  />
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                                    {field.value?.length || 0}/255 characters
                                  </div>
                                  {form.touched.title && form.errors.title && (
                                    <ErrorMessage error={form.errors.title} />
                                  )}
                                </>
                              )}
                            </Field>
                          </div>
                  
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="type">Project Type *</Label>
                            <Select 
                              onValueChange={(value) => {
                                setFieldValue('type', value);
                                setFieldTouched('type', true);
                              }}
                              value={values.type}
                            >
                              <SelectTrigger className={errors.type && touched.type ? 'border-destructive focus:border-destructive focus:ring-destructive' : ''}>
                                <SelectValue placeholder="Select project type" />
                              </SelectTrigger>
                              <SelectContent className="z-[1100]">
                                {projectTypes.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors.type && touched.type && (
                              <ErrorMessage error={errors.type} />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="description">Description * (10-2000 characters)</Label>
                          <Field name="description">
                            {({ field, form }) => (
                              <>
                                <Textarea
                                  {...field}
                                  placeholder="Describe the project goals and scope (minimum 10 characters)"
                                  rows={4}
                                  className={form.touched.description && form.errors.description ? 'border-destructive focus:border-destructive focus:ring-destructive' : ''}
                                />
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                                  {field.value?.length || 0}/2000 characters
                                  {field.value && field.value.length < 10 && (
                                    <span className="text-orange-500 ml-2">
                                      (Need {10 - field.value.length} more)
                                    </span>
                                  )}
                                </div>
                                {form.touched.description && form.errors.description && (
                                  <ErrorMessage error={form.errors.description} />
                                )}
                              </>
                            )}
                          </Field>
                        </div>
                
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select 
                              onValueChange={(value) => setFieldValue('priority', value)}
                              value={values.priority}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent className="z-[1100]">
                                {priorities.map(priority => (
                                  <SelectItem key={priority} value={priority}>
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                      priority.toLowerCase() === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                      priority.toLowerCase() === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                      'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                    }`}>
                                      {priority}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="budget">Budget (USD)</Label>
                            <Field name="budget">
                              {({ field, form }) => (
                                <>
                                  <Input
                                    {...field}
                                    type="number"
                                    placeholder="0"
                                    className={form.touched.budget && form.errors.budget ? 'border-destructive focus:border-destructive focus:ring-destructive' : ''}
                                  />
                                  {form.touched.budget && form.errors.budget && (
                                    <ErrorMessage error={form.errors.budget} />
                                  )}
                                </>
                              )}
                            </Field>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="startDate">
                              <Calendar className="w-4 h-4 inline mr-1" />
                              Start Date *
                            </Label>
                            <Field name="startDate">
                              {({ field, form }) => (
                                <>
                                  <Input
                                    {...field}
                                    type="date"
                                    className={form.touched.startDate && form.errors.startDate ? 'border-destructive focus:border-destructive focus:ring-destructive' : ''}
                                  />
                                  {form.touched.startDate && form.errors.startDate && (
                                    <ErrorMessage error={form.errors.startDate} />
                                  )}
                                </>
                              )}
                            </Field>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Field name="endDate">
                              {({ field, form }) => (
                                <>
                                  <Input
                                    {...field}
                                    type="date"
                                    className={form.touched.endDate && form.errors.endDate ? 'border-destructive focus:border-destructive focus:ring-destructive' : ''}
                                  />
                                  {form.touched.endDate && form.errors.endDate && (
                                    <ErrorMessage error={form.errors.endDate} />
                                  )}
                                </>
                              )}
                            </Field>
                          </div>
                        </div>
              </div>
                </TabsContent>

                <TabsContent value="location" className="mt-6 min-h-[400px] md:min-h-[300px]">
                  {/* Location and Map */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center mb-2">
                      <Map className="w-4 h-4 inline mr-1" />
                      Project Location
                    </h3>
                    
                    {/* Location Search */}
                    <div className="flex flex-col gap-3 mb-4">
                      <Label htmlFor="locationSearch">Search Location</Label>
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <Input
                            id="locationSearch"
                            value={locationSearch}
                            onChange={(e) => handleLocationSearch(e.target.value)}
                            placeholder="Search for a location..."
                            className="pl-10"
                          />
                        </div>
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">Searching...</div>
                        )}
                      </div>
                      
                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="bg-card border border-border rounded-lg max-h-[200px] overflow-y-auto shadow-md z-50">
                          {searchResults.map((result, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-3 cursor-pointer transition-colors border-b border-border last:border-b-0 hover:bg-accent focus:outline-2 focus:outline-ring focus:outline-offset-2"
                              onClick={() => selectSearchResultWithFormik(result)}
                            >
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-foreground">{result.display_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Manual Location Input */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="location">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location *
                      </Label>
                      <Field name="location">
                        {({ field, form }) => (
                          <>
                            <Input
                              {...field}
                              placeholder="Enter project location or click on map"
                              className={form.touched.location && form.errors.location ? 'border-destructive focus:border-destructive focus:ring-destructive' : ''}
                            />
                            {form.touched.location && form.errors.location && (
                              <ErrorMessage error={form.errors.location} />
                            )}
                          </>
                        )}
                      </Field>
                    </div>

                    {/* Map Container */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-3 p-2 bg-muted rounded-md md:flex-col md:items-start md:gap-2">
                        <h4 className="m-0 text-sm font-medium text-foreground">Click on the map to select location</h4>
                        {selectedLocation && (
                          <Badge variant="secondary">
                            Location: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                          </Badge>
                        )}
                      </div>
                      <div className="relative border border-border rounded-lg overflow-hidden">
                        <div 
                          ref={mapRef} 
                          className="w-full z-[1] md:h-[250px]"
                          style={{ 
                            height: '300px', 
                            borderRadius: '8px',
                            backgroundColor: '#f5f5f5',
                            position: 'relative'
                          }}
                        />
                        {!mapInstanceRef.current && activeTab === 'location' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 z-10 gap-2">
                            <div className="w-4 h-4 border-2 border-transparent border-t-current animate-spin text-accent" />
                            <span className="text-sm text-muted-foreground">Loading map...</span>
                            <button 
                              type="button"
                              onClick={() => {
                                console.log('Manual map initialization triggered');
                                initializeMap();
                              }}
                              className="mt-2.5 px-4 py-2 bg-accent text-white border-none rounded cursor-pointer hover:bg-accent/90"
                            >
                              Retry Loading Map
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Map Instructions */}
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/30 rounded-md border-l-4 border-primary">
                          <Lightbulb className="w-4 h-4 inline mr-1" /> <strong>Tip:</strong> Search for a location above or click anywhere on the map to mark your project location.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                      <TabsContent value="details" className="mt-6 min-h-[400px] md:min-h-[300px]">
                        {/* Tags */}
                        <div className="flex flex-col gap-4">
                          <h3 className="text-lg font-semibold text-foreground flex items-center mb-2">
                            <Tag className="w-4 h-4 inline mr-1" />
                            Tags
                          </h3>
                          <FieldArray name="tags">
                            {({ push, remove, form }) => (
                              <>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Add tags (e.g., sustainable, residential)"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (newTag.trim() && !form.values.tags.includes(newTag.trim())) {
                                          push(newTag.trim());
                                          setNewTag('');
                                        }
                                      }
                                    }}
                                    className="flex-1"
                                  />
                                  <Button 
                                    type="button" 
                                    onClick={() => {
                                      if (newTag.trim() && !form.values.tags.includes(newTag.trim())) {
                                        push(newTag.trim());
                                        setNewTag('');
                                      }
                                    }} 
                                    size="sm"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {form.values.tags.map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm focus:outline-2 focus:outline-ring focus:outline-offset-2">
                                      {tag}
                                      <X 
                                        className="w-3 h-3 ml-1 cursor-pointer opacity-70 transition-opacity hover:opacity-100" 
                                        onClick={() => remove(index)} 
                                      />
                                    </Badge>
                                  ))}
                                </div>
                              </>
                            )}
                          </FieldArray>
                        </div>

                        {/* Objectives */}
                        <div className="flex flex-col gap-4">
                          <h3 className="text-lg font-semibold text-foreground flex items-center mb-2">
                            <FileText className="w-4 h-4 inline mr-1" />
                            Project Objectives
                          </h3>
                          <FieldArray name="objectives">
                            {({ push, remove, form }) => (
                              <div className="flex flex-col gap-3">
                                {form.values.objectives.map((objective, index) => (
                                  <div key={index} className="flex gap-2 items-center">
                                    <Field name={`objectives.${index}`}>
                                      {({ field }) => (
                                        <Input
                                          {...field}
                                          placeholder={`Objective ${index + 1}`}
                                          className="flex-1"
                                        />
                                      )}
                                    </Field>
                                    {form.values.objectives.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => remove(index)}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => push('')} 
                                  size="sm"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Objective
                                </Button>
                              </div>
                            )}
                          </FieldArray>
                        </div>

                        {/* Additional Details */}
                        <div className="flex flex-col gap-4">
                          <h3 className="text-lg font-semibold text-foreground flex items-center mb-2">Additional Details</h3>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="estimatedDuration">Estimated Duration (days)</Label>
                            <Field name="estimatedDuration">
                              {({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder="Enter estimated duration in days"
                                />
                              )}
                            </Field>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="area">Project Area (hectares)</Label>
                            <Field name="area">
                              {({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  placeholder="Enter project area"
                                />
                              )}
                            </Field>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Form Actions */}
                      <div className="flex justify-end gap-4 pt-4 border-t border-border md:flex-col-reverse">
                        <div className="flex justify-end gap-4 w-full md:flex-col-reverse md:w-full">
                          <Button type="button" variant="outline" onClick={handleClose} className="md:w-full">
                            Cancel
                          </Button>
                          <LoadingButton
                            type="submit"
                            loading={loading || isSubmitting}
                            disabled={loading || isSubmitting}
                            className="flex items-center gap-2 md:w-full"
                          >
                            Create Project
                          </LoadingButton>
                        </div>
                      </div>
                    </Form>
                  );
                }}
              </Formik>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateProjectModal;
