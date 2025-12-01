import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { searchLocations, reverseGeocode } from '../../services/geocodingService';

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
  const searchTimeoutRef = useRef(null);
  const searchAbortControllerRef = useRef(null);
  const reverseGeocodeAbortControllerRef = useRef(null);
  const mapInitRetryCountRef = useRef(0);
  const isInitializingRef = useRef(false);
  const MAX_MAP_INIT_RETRIES = 5;

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
    startDate: null, // Use null instead of empty string for date fields
    endDate: null, // Use null instead of empty string for date fields
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

  // Initialize Leaflet map
  const initializeMap = useCallback(async () => {
    // Prevent concurrent initializations
    if (isInitializingRef.current) {
      console.log('Map initialization already in progress, skipping...');
      return;
    }

    // Check if map is already initialized
    if (mapInstanceRef.current) {
      console.log('Map already initialized');
      return;
    }

    // Check if container already has a Leaflet map instance
    if (mapRef.current && mapRef.current._leaflet_id) {
      console.log('Map container already has a Leaflet instance');
      return;
    }

    try {
      isInitializingRef.current = true;
      console.log('Starting map initialization...');
      
      // Check if map container exists and is visible
      if (!mapRef.current) {
        console.log('Map container not ready');
        isInitializingRef.current = false;
        return;
      }

      // Check if container has dimensions
      const rect = mapRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        mapInitRetryCountRef.current += 1;
        if (mapInitRetryCountRef.current >= MAX_MAP_INIT_RETRIES) {
          console.error('Map initialization failed: container has no dimensions after', MAX_MAP_INIT_RETRIES, 'retries');
          isInitializingRef.current = false;
          if (mapRef.current) {
            mapRef.current.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; border-radius: 8px;">
                <p style="color: #666; margin-bottom: 10px;">Failed to load map. Please try refreshing the page.</p>
                <button onclick="window.location.reload()" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
              </div>
            `;
          }
          return;
        }
        console.log('Map container has no dimensions, retrying... (attempt', mapInitRetryCountRef.current, 'of', MAX_MAP_INIT_RETRIES, ')');
        isInitializingRef.current = false;
        setTimeout(() => initializeMap(), 300); // Reduced from 500ms
        return;
      }
      
      // Reset retry count on successful dimension check
      mapInitRetryCountRef.current = 0;

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

      // Store map instance
      mapInstanceRef.current = map;
      isInitializingRef.current = false;
      
      // Force map to resize after initialization (reduced delay)
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          console.log('Map invalidated and resized');
        }
      }, 100); // Reduced from 200ms

      console.log('Map initialized successfully');
      
    } catch (error) {
      isInitializingRef.current = false;
      console.error('Error initializing map:', error);
      
      // If error is "already initialized", try to get existing instance
      if (error.message && error.message.includes('already initialized')) {
        console.log('Map was already initialized, attempting to recover...');
        if (mapRef.current && mapRef.current._leaflet_id) {
          // Try to find the existing map instance
          const existingMap = (window.L || {}).map?.get?.(mapRef.current._leaflet_id);
          if (existingMap) {
            mapInstanceRef.current = existingMap;
            console.log('Recovered existing map instance');
            return;
          }
        }
      }
      
      // Show error message in the map container
      if (mapRef.current && !mapInstanceRef.current) {
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
  }, []);

  // Initialize map when modal opens and location tab is active - optimized for faster rendering
  useEffect(() => {
    if (isOpen && activeTab === 'location' && mapRef.current && !mapInstanceRef.current && !isInitializingRef.current) {
      // Reset retry count when starting fresh
      mapInitRetryCountRef.current = 0;
      // Reduced delay for faster initialization
      const timer = setTimeout(() => {
        if (!mapInstanceRef.current && !isInitializingRef.current) {
          console.log('Attempting to initialize map...');
          initializeMap();
        }
      }, 100); // Reduced from 300ms for faster rendering
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, initializeMap]);

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
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.log('Error removing map:', e);
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
      mapInitRetryCountRef.current = 0;
      isInitializingRef.current = false;
    }
    
    // Cleanup on unmount or close
    return () => {
      // Cancel pending search requests
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
        searchAbortControllerRef.current = null;
      }
      
      // Cancel pending reverse geocoding requests
      if (reverseGeocodeAbortControllerRef.current) {
        reverseGeocodeAbortControllerRef.current.abort();
        reverseGeocodeAbortControllerRef.current = null;
      }
      
      // Clear search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Reverse geocoding to get address from coordinates - using optimized service
  const handleReverseGeocode = useCallback(async (lat, lng, setFieldValue = null) => {
    // Cancel previous reverse geocoding request
    if (reverseGeocodeAbortControllerRef.current) {
      reverseGeocodeAbortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const controller = new AbortController();
    reverseGeocodeAbortControllerRef.current = controller;
    
    try {
      const address = await reverseGeocode(lat, lng, controller.signal);
      
      if (address && setFieldValue) {
        setFieldValue('location', address);
      }
      
      return address;
    } catch (error) {
      if (error.name === 'AbortError') {
        return null; // Request was cancelled, ignore
      }
      console.error('Error reverse geocoding:', error);
      return null;
    } finally {
      if (reverseGeocodeAbortControllerRef.current === controller) {
        reverseGeocodeAbortControllerRef.current = null;
      }
    }
  }, []);

  // Search for locations - using optimized geocoding service
  const searchLocation = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      setSearchResults([]);
      return;
    }

    // Minimum 2 characters for search
    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Cancel previous search request
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;
    
    setIsSearching(true);
    
    try {
      const results = await searchLocations(trimmedQuery, controller.signal);
      
      // Only update if this request hasn't been cancelled
      if (!controller.signal.aborted) {
        setSearchResults(results || []);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }
      
      console.error('Error searching location:', error);
      
      // Provide fallback search results for common cities only on real errors
      const fallbackResults = [
        { display_name: `${trimmedQuery} (Manual Entry)`, lat: "0", lon: "0" },
        { display_name: "New York, NY, USA", lat: "40.7128", lon: "-74.0060" },
        { display_name: "London, UK", lat: "51.5074", lon: "-0.1278" },
        { display_name: "Paris, France", lat: "48.8566", lon: "2.3522" },
        { display_name: "Tokyo, Japan", lat: "35.6762", lon: "139.6503" }
      ].filter(result => 
        result.display_name.toLowerCase().includes(trimmedQuery.toLowerCase())
      );
      
      if (!controller.signal.aborted) {
        setSearchResults(fallbackResults);
        toast.error('Location search unavailable. Using fallback results.');
      }
    } finally {
      if (searchAbortControllerRef.current === controller) {
        searchAbortControllerRef.current = null;
      }
      setIsSearching(false);
    }
  }, []);

  // Handle location search input - optimized for faster response
  const handleLocationSearch = useCallback((value) => {
    setLocationSearch(value);
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Debounce search with shorter delay for faster response
    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocation(value);
      }, 300); // Reduced from 500ms for faster search
    } else {
      setSearchResults([]);
    }
  }, [searchLocation]);


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
                  
                  if (isNaN(lat) || isNaN(lng)) {
                    console.error('Invalid coordinates:', result);
                    toast.error('Invalid location coordinates');
                    return;
                  }
                  
                  setSelectedLocation({ lat, lng });
                  setFieldValue('coordinates', { lat, lng });
                  setFieldValue('location', result.display_name);
                  setLocationSearch(result.display_name);
                  setSearchResults([]);

                  // Update map - ensure it's initialized first if needed
                  const updateMapWithLocation = async () => {
                    try {
                      const L = window.L || (await import('leaflet')).default;
                      
                      // If map is not initialized, initialize it first
                      if (!mapInstanceRef.current) {
                        // Switch to location tab if not already there
                        if (activeTab !== 'location') {
                          setActiveTab('location');
                        }
                        // Wait a bit for the tab to render, then initialize
                        setTimeout(async () => {
                          if (!mapInstanceRef.current && mapRef.current) {
                            await initializeMap();
                            // Wait for map to be ready
                            setTimeout(() => updateMapWithLocation(), 200);
                          }
                        }, 100);
                        return;
                      }

                      const map = mapInstanceRef.current;
                      
                      // Remove existing marker
                      if (markerRef.current) {
                        map.removeLayer(markerRef.current);
                        markerRef.current = null;
                      }
                      
                      // Center and zoom to the location with smooth animation
                      map.setView([lat, lng], 15, {
                        animate: true,
                        duration: 0.5
                      });
                      
                      // Add marker with popup
                      markerRef.current = L.marker([lat, lng], {
                        title: result.display_name,
                        draggable: false
                      }).addTo(map);
                      
                      // Add popup with location name
                      markerRef.current.bindPopup(result.display_name, {
                        closeButton: true,
                        autoClose: false,
                        autoPan: true
                      }).openPopup();
                      
                      // Ensure map is properly sized
                      setTimeout(() => {
                        map.invalidateSize();
                      }, 100);
                      
                      console.log('Map updated with location:', result.display_name);
                    } catch (error) {
                      console.error('Error updating map:', error);
                      toast.error('Failed to update map with location');
                    }
                  };
                  
                  // Update map immediately if available, or wait for initialization
                  updateMapWithLocation();
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
                        
                        // Remove existing marker
                        if (markerRef.current) {
                          map.removeLayer(markerRef.current);
                          markerRef.current = null;
                        }
                        
                        // Add new marker with popup
                        markerRef.current = L.marker([lat, lng], {
                          title: 'Selected Location',
                          draggable: false
                        }).addTo(map);
                        
                        // Add temporary popup while reverse geocoding
                        const tempPopup = markerRef.current.bindPopup('Loading address...', {
                          closeButton: true,
                          autoClose: false,
                          autoPan: true
                        }).openPopup();

                        // Reverse geocoding to get address using optimized service
                        handleReverseGeocode(lat, lng, setFieldValue).then((address) => {
                          // Update popup with address if available
                          if (markerRef.current && address) {
                            markerRef.current.setPopupContent(address);
                          } else if (markerRef.current) {
                            markerRef.current.setPopupContent(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                          }
                        }).catch(() => {
                          // Keep coordinates if reverse geocoding fails
                          if (markerRef.current) {
                            markerRef.current.setPopupContent(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                          }
                        });
                      } catch (error) {
                        console.error('Error handling map click:', error);
                      }
                    };
                    
                    map.on('click', handleMapClick);
                    
                    // Cleanup
                    return () => {
                      if (map && map.off) {
                        map.off('click', handleMapClick);
                      }
                    };
                  }
                }, [activeTab, setFieldValue]); // Include setFieldValue in dependencies

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
                                    value={field.value || ''} // Convert null to empty string for date input
                                    onChange={(e) => {
                                      const value = e.target.value || null; // Convert empty string to null
                                      form.setFieldValue('startDate', value);
                                    }}
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
                                    value={field.value || ''} // Convert null to empty string for date input
                                    onChange={(e) => {
                                      const value = e.target.value || null; // Convert empty string to null
                                      form.setFieldValue('endDate', value);
                                    }}
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
                        {!mapInstanceRef.current && activeTab === 'location' && !mapRef.current?._leaflet_id && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 z-10 gap-2">
                            <div className="w-4 h-4 border-2 border-transparent border-t-current animate-spin text-accent" />
                            <span className="text-sm text-muted-foreground">Loading map...</span>
                            <button 
                              type="button"
                              onClick={() => {
                                // Triple check: ref, initialization flag, and Leaflet instance
                                if (!isInitializingRef.current && 
                                    !mapInstanceRef.current && 
                                    !mapRef.current?._leaflet_id) {
                                  console.log('Manual map initialization triggered');
                                  mapInitRetryCountRef.current = 0;
                                  initializeMap();
                                } else {
                                  console.log('Map already initialized or initializing, skipping...');
                                }
                              }}
                              disabled={isInitializingRef.current || !!mapInstanceRef.current || !!mapRef.current?._leaflet_id}
                              className="mt-2.5 px-4 py-2 bg-accent text-white border-none rounded cursor-pointer hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isInitializingRef.current ? 'Initializing...' : 'Retry Loading Map'}
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
