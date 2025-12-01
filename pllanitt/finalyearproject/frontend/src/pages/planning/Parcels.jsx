
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useProject } from '@/contexts/ProjectContext';
import { parcelsApi } from '@/services/designApi';
import { useToast } from '@/hooks/use-toast';
import { authenticatedFetch } from '@/utils/authHelper';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Component to update map center when it changes
function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}
import { 
  Layers, 
  GridIcon, 
  Maximize, 
  Minimize, 
  Check, 
  X, 
  Route, 
  Move, 
  Map,
  Zap
} from 'lucide-react';

const API_BASE_URL = "http://localhost:8000";

const Parcels = () => {
  const navigate = useNavigate();
  const { projects, currentProject, setCurrentProject } = useProject();
  const { toast } = useToast();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [subdivisionResult, setSubdivisionResult] = useState(null);
  const [subdivisionConfig, setSubdivisionConfig] = useState({
    method: 'grid',
    target_parcel_area: 400,
    min_area: 200,
    max_area: 5000,
    parcel_type: 'residential', // residential, commercial, industrial, mixed
    lot_size: 'medium', // small, medium, large, estate
    road_access: 100, // percentage
    corner_lot_ratio: 25, // percentage
    orientation: 'grid' // 'grid' or 'optimize'
  });
  const [polygonArea, setPolygonArea] = useState(0);
  const [mapCenter, setMapCenter] = useState([33.6844, 73.0479]);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [efficiencyAnalysis, setEfficiencyAnalysis] = useState(null);

  useEffect(() => {
    if (currentProject) {
      setSelectedProjectId(currentProject.id);
      fetchParcels(currentProject.id);
      fetchPolygons(currentProject.id);
    } else if (projects.length > 0) {
      setSelectedProjectId(projects[0].id);
      setCurrentProject(projects[0]);
      fetchParcels(projects[0].id);
      fetchPolygons(projects[0].id);
    }
  }, [currentProject, projects]);

  // Calculate center from polygon bounds
  const calculatePolygonCenter = (polygon) => {
    if (!polygon?.geojson) return null;
    const geom = polygon.geojson.geometry || polygon.geojson;
    if (!geom.coordinates || !geom.coordinates[0]) return null;
    
    // Get all coordinates
    const coords = geom.coordinates[0];
    if (coords.length === 0) return null;
    
    // Calculate center from bounds
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    coords.forEach(coord => {
      const [lng, lat] = coord;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    
    return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
  };

  // Calculate polygon area from GeoJSON
  const calculatePolygonArea = (polygon) => {
    if (!polygon?.geojson) return 0;
    try {
      const geom = polygon.geojson.geometry || polygon.geojson;
      if (!geom.coordinates || !geom.coordinates[0]) return 0;
      
      // Simple area calculation using shoelace formula (approximate for small areas)
      const coords = geom.coordinates[0];
      let area = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        const [lng1, lat1] = coords[i];
        const [lng2, lat2] = coords[i + 1];
        area += (lng1 * lat2 - lng2 * lat1);
      }
      // Convert to square meters (rough approximation)
      // For more accuracy, we'd need proper geodesic calculations
      const areaSqM = Math.abs(area) * 111000 * 111000 / 2; // Rough conversion
      return areaSqM;
    } catch (error) {
      console.error('Error calculating polygon area:', error);
      return 0;
    }
  };

  // Track previous polygon ID to detect actual changes
  const prevPolygonIdRef = React.useRef(null);

  // Update map and clear results when polygon changes
  useEffect(() => {
    if (selectedPolygon) {
      const currentPolygonId = selectedPolygon.id;
      
      // Only clear results if the polygon actually changed (different ID)
      const polygonChanged = prevPolygonIdRef.current !== null && prevPolygonIdRef.current !== currentPolygonId;
      
      // Update map center from polygon bounds
      const center = calculatePolygonCenter(selectedPolygon);
      if (center) {
        setMapCenter(center);
        setMapZoom(15); // Zoom to polygon
      }
      // Calculate and set polygon area
      const area = calculatePolygonArea(selectedPolygon);
      setPolygonArea(area);
      
      // Auto-adjust target parcel area based on polygon size and lot size (only if polygon changed or area is 0)
      if (area > 0 && (polygonChanged || polygonArea === 0)) {
        // Map lot sizes to area in square meters
        const lotSizeMap = {
          small: 125,   // 5 Marla ≈ 125 sqm
          medium: 250,  // 10 Marla ≈ 250 sqm
          large: 500,   // 1 Kanal ≈ 500 sqm
          estate: 1000  // 2+ Kanal ≈ 1000+ sqm
        };
        
        const baseArea = lotSizeMap[subdivisionConfig.lot_size] || 250;
        let suggestedArea = baseArea;
        
        if (area < 5000) {
          suggestedArea = Math.max(125, area / 10);
        } else if (area < 50000) {
          suggestedArea = baseArea;
        } else {
          suggestedArea = baseArea * 2;
        }
        setSubdivisionConfig(prev => ({
          ...prev,
          target_parcel_area: Math.round(suggestedArea)
        }));
      }
      
      // Only clear previous subdivision results when polygon actually changes
      if (polygonChanged) {
        setSubdivisionResult(null);
        setParcels([]);
      }
      
      // Update the ref to track current polygon ID
      prevPolygonIdRef.current = currentPolygonId;
    } else {
      // If no polygon selected, reset the ref
      prevPolygonIdRef.current = null;
    }
  }, [selectedPolygon]);

  const fetchPolygons = async (projectId) => {
    if (!projectId) return;
    try {
      const url = `${API_BASE_URL}/api/polygon?project_id=${projectId}`;
      const res = await authenticatedFetch(url);
      if (!res.ok) throw new Error(`Failed to fetch polygons (${res.status})`);
      const data = await res.json();
      const newPolygons = Array.isArray(data) ? data : [];
      // Sort polygons by ID to maintain consistent order
      newPolygons.sort((a, b) => a.id - b.id);
      setPolygons(newPolygons);
      
      // Update selected polygon if it still exists, otherwise select the latest
      // But preserve the selected polygon if it still exists (don't change it unnecessarily)
      if (selectedPolygon) {
        const stillExists = newPolygons.find(p => p.id === selectedPolygon.id);
        if (stillExists) {
          // Only update if the polygon data actually changed (e.g., geojson updated)
          // Don't set state if it's the same object to avoid triggering useEffect
          const hasChanged = JSON.stringify(stillExists.geojson) !== JSON.stringify(selectedPolygon.geojson);
          if (hasChanged) {
            setSelectedPolygon(stillExists);
          }
          // Otherwise, keep the existing selectedPolygon to avoid clearing parcels
        } else if (newPolygons.length > 0) {
          // Only change if the polygon no longer exists
          setSelectedPolygon(newPolygons[newPolygons.length - 1]);
        }
      } else if (newPolygons.length > 0) {
        // Only set if no polygon is currently selected
        setSelectedPolygon(newPolygons[newPolygons.length - 1]);
      } else {
        setSelectedPolygon(null);
      }
    } catch (error) {
      console.error('Error fetching polygons:', error);
      
      // Provide clearer error messages
      let errorMessage = 'Failed to fetch polygons';
      if (error.message && error.message.includes('Failed to connect')) {
        errorMessage = 'Backend server is not running. Please start the backend server on port 8000.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      });
    }
  };

  // Poll for polygon updates (but don't clear parcels if polygon hasn't changed)
  // Disabled during generation to prevent interference
  useEffect(() => {
    if (!selectedProjectId || loading) return;
    
    const interval = setInterval(() => {
      fetchPolygons(selectedProjectId);
    }, 10000); // Poll every 10 seconds (reduced frequency to avoid unnecessary updates)
    
    return () => clearInterval(interval);
  }, [selectedProjectId, loading]);

  const fetchParcels = async (projectId) => {
    if (!projectId) return;
    try {
      setLoading(true);
      // Fetch parcels from database
      const data = await parcelsApi.getProjectParcels(projectId);
      const dbParcels = Array.isArray(data) ? data : [];
      
      // Convert database parcels to GeoJSON format for display
      const formattedParcels = dbParcels.map(parcel => ({
        type: 'Feature',
        properties: {
          parcel_id: parcel.parcelNumber || `P${parcel.id}`,
          area: parcel.area || 0,
          zone_type: parcel.type || 'Residential',
          road_access: parcel.roadAccess || true,
          corner_lot: parcel.cornerLot || false
        },
        geometry: parcel.geometry
      }));
      
      // Only update parcels from database if we don't have parcels from subdivision
      // This prevents overwriting freshly generated parcels
      if (formattedParcels.length > 0) {
        if (!subdivisionResult && parcels.length === 0) {
          // Only load from database if we have no subdivision result and no current parcels
          setParcels(formattedParcels);
          console.log(`Loaded ${formattedParcels.length} parcels from database`);
        } else if (subdivisionResult && parcels.length > 0) {
          // If we have subdivision results, don't overwrite them with database parcels
          // Only merge if there are new parcels not in the current list
          setParcels(prev => {
            const existingIds = new Set(prev.map(p => p.properties?.parcel_id || p.parcelNumber));
            const newParcels = formattedParcels.filter(p => {
              const parcelId = p.properties?.parcel_id || p.parcelNumber;
              return !existingIds.has(parcelId);
            });
            if (newParcels.length > 0) {
              console.log(`Merging ${newParcels.length} new parcels from database`);
              return [...prev, ...newParcels];
            }
            return prev; // Keep existing parcels
          });
        }
      }
    } catch (error) {
      console.error('Error fetching parcels:', error);
      // Don't show error toast - it's okay if no parcels are saved yet
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === parseInt(projectId));
    if (project) {
      setSelectedProjectId(project.id);
      setCurrentProject(project);
      fetchParcels(project.id);
      fetchPolygons(project.id);
      // Clear results when project changes
      setSubdivisionResult(null);
      setSelectedPolygon(null);
    }
  };

  const handlePolygonChange = (polygonId) => {
    const polygon = polygons.find(p => p.id === parseInt(polygonId));
    if (polygon) {
      setSelectedPolygon(polygon);
      // Clear previous results
      setSubdivisionResult(null);
      setParcels([]);
    }
  };

  const getParcelsByType = (type) => {
    return parcels.filter(p => p.type === type);
  };

  // Calculate efficiency analysis from subdivision results
  const calculateEfficiencyAnalysis = (result, parcelObjects) => {
    if (!result || !parcelObjects || parcelObjects.length === 0) {
      setEfficiencyAnalysis(null);
      return;
    }

    const stats = result.statistics || {};
    const polygonArea = result.polygon_area || stats.total_area || 0;
    const totalParcelArea = stats.total_parcel_area || 0;
    const efficiency = stats.efficiency || 0;
    const avgArea = stats.parcel_area_avg || 0;
    const minArea = stats.parcel_area_min || 0;
    const maxArea = stats.parcel_area_max || 0;

    // Calculate land utilization percentage
    const landUtilization = efficiency;

    // Determine utilization rating
    let utilizationRating = 'Poor';
    let utilizationBadge = 'bg-red-500/20 text-red-400';
    if (landUtilization >= 90) {
      utilizationRating = 'Excellent';
      utilizationBadge = 'bg-green-500/20 text-green-400';
    } else if (landUtilization >= 75) {
      utilizationRating = 'Good';
      utilizationBadge = 'bg-blue-500/20 text-blue-400';
    } else if (landUtilization >= 60) {
      utilizationRating = 'Fair';
      utilizationBadge = 'bg-yellow-500/20 text-yellow-400';
    }

    // Check regulatory compliance
    const complianceChecks = {
      minLotSize: minArea >= subdivisionConfig.min_area,
      maxLotSize: maxArea <= subdivisionConfig.max_area,
      avgLotSize: avgArea >= subdivisionConfig.min_area * 0.8 && avgArea <= subdivisionConfig.max_area * 1.2,
      efficiency: efficiency >= 85
    };

    // Calculate corner lot ratio
    const cornerLots = parcelObjects.filter(p => p.corner_lot).length;
    const actualCornerLotRatio = parcelObjects.length > 0 ? (cornerLots / parcelObjects.length) * 100 : 0;
    const cornerLotCompliant = Math.abs(actualCornerLotRatio - subdivisionConfig.corner_lot_ratio) <= 10;

    // Calculate road access percentage
    const parcelsWithRoadAccess = parcelObjects.filter(p => p.road_access !== false).length;
    const actualRoadAccess = parcelObjects.length > 0 ? (parcelsWithRoadAccess / parcelObjects.length) * 100 : 0;
    const roadAccessCompliant = actualRoadAccess >= subdivisionConfig.road_access * 0.9;

    // Generate AI recommendations based on analysis
    const recommendations = [];
    if (landUtilization < 85) {
      recommendations.push(`Land utilization is ${landUtilization.toFixed(1)}%. Consider adjusting parcel sizes to improve efficiency.`);
    }
    if (!cornerLotCompliant) {
      recommendations.push(`Corner lot ratio is ${actualCornerLotRatio.toFixed(1)}% (target: ${subdivisionConfig.corner_lot_ratio}%). Adjust subdivision pattern to meet target.`);
    }
    if (!roadAccessCompliant) {
      recommendations.push(`Road access is ${actualRoadAccess.toFixed(1)}% (target: ${subdivisionConfig.road_access}%). Review road network design.`);
    }
    if (maxArea / minArea > 5) {
      recommendations.push('Large variation in parcel sizes detected. Consider standardizing parcel dimensions for better marketability.');
    }
    if (efficiency < 80) {
      recommendations.push('Subdivision efficiency is below optimal. Consider using optimized orientation or adjusting target parcel area.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Subdivision meets all optimization criteria. Excellent layout!');
    }

    setEfficiencyAnalysis({
      landUtilization,
      utilizationRating,
      utilizationBadge,
      complianceChecks,
      cornerLotRatio: actualCornerLotRatio,
      cornerLotCompliant,
      roadAccess: actualRoadAccess,
      roadAccessCompliant,
      recommendations,
      stats: {
        totalParcels: parcelObjects.length,
        polygonArea,
        totalParcelArea,
        efficiency,
        avgArea,
        minArea,
        maxArea
      }
    });
  };

  const generateParcels = async () => {
    if (!selectedPolygon) {
      toast({
        title: 'Error',
        description: 'Please select a polygon first',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        polygon_id: selectedPolygon.id,
        polygon_geojson: selectedPolygon.geojson,
        subdivision_config: subdivisionConfig
      };

      // Create abort controller for timeout (2 minutes for large subdivisions)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
      
      const response = await authenticatedFetch(`${API_BASE_URL}/api/land_subdivision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, use status text
          errorData = { error: `Server error (${response.status}): ${response.statusText || 'Unknown error'}` };
        }
        
        const errorMessage = errorData.error || errorData.message || 'Subdivision failed';
        
        // Check if it's a terrain validation error
        if (errorData.validation_details) {
          toast({
            title: 'Terrain Validation Failed',
            description: errorMessage,
            variant: 'destructive',
            duration: 5000
          });
          throw new Error(errorMessage);
        }
        
        // Check if it's a connection error (503 Service Unavailable)
        if (response.status === 503) {
          throw new Error(errorMessage);
        }
        
        // For other errors, throw with the actual error message
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('📦 Subdivision result:', result);
      setSubdivisionResult(result);

      if (result.success) {
        // Check if parcels exist and have features
        if (result.parcels && result.parcels.features && result.parcels.features.length > 0) {
          // Convert GeoJSON features to parcel objects for display
          const zoneTypeMap = {
            'residential': 'Residential',
            'commercial': 'Commercial',
            'industrial': 'Industrial',
            'mixed_use': 'Mixed-Use',
            'mixed': 'Mixed-Use'
          };
          const parcelObjects = result.parcels.features.map((feature, idx) => ({
            id: idx + 1,
            parcelNumber: feature.properties.parcel_id,
            area: feature.properties.area,
            type: zoneTypeMap[feature.properties.zone_type] || 'Residential',
            status: 'Available',
            geometry: feature.geometry,
            ...feature.properties
          }));
          setParcels(parcelObjects);
          
          // Calculate efficiency analysis from real data
          calculateEfficiencyAnalysis(result, parcelObjects);

          toast({
            title: 'Success',
            description: `Generated ${result.total_parcels} parcels successfully`,
          });
        } else {
          // Subdivision succeeded but no parcels were generated
          console.warn('⚠️ Subdivision succeeded but no parcels were generated', result);
          setParcels([]);
          toast({
            title: 'Warning',
            description: `Subdivision completed but no parcels were generated. The polygon may be too small or the configuration may need adjustment.`,
            variant: 'destructive',
            duration: 6000
          });
        }
      } else {
        throw new Error(result.error || 'Subdivision failed');
      }
    } catch (error) {
      // Clear timeout in case of error (timeoutId might not be defined if error occurs early)
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId);
      }
      console.error('Subdivision error:', error);
      
      // Provide clearer error messages based on error type
      let errorMessage = error.message || 'Failed to generate parcels';
      
      // Check if it's a timeout/abort error
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        errorMessage = 'Request timed out. The subdivision is taking too long. Try increasing the target parcel area to generate fewer parcels, or the polygon may be too large.';
      }
      // Check if it's a connection error
      else if (error.message && error.message.includes('Failed to connect')) {
        if (error.message.includes('port 5002')) {
          errorMessage = 'Python backend is not running. The Node.js backend is running but cannot connect to the Python backend on port 5002. Please ensure both backends are started.';
        } else if (error.message.includes('port 8000')) {
          errorMessage = 'Backend server is not running. Please start the backend server on port 8000.';
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 6000
      });
    } finally {
      setLoading(false);
    }
  };

  const getParcelStyle = (feature) => {
    const zoneType = feature.properties.zone_type || 'residential';
    const colors = {
      residential: '#4A90E2',
      commercial: '#9013FE',
      mixed_use: '#E91E63',
      mixed: '#E91E63',
      industrial: '#FF9800',
      green_space: '#4CAF50'
    };
    return {
      fillColor: colors[zoneType] || '#757575',
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.6
    };
  };

  const onEachParcel = (feature, layer) => {
    const props = feature.properties;
    const popupContent = `
      <div style="min-width: 200px;">
        <h4 style="margin: 0 0 8px 0;">${props.parcel_id || 'Parcel'}</h4>
        <p><strong>Area:</strong> ${props.area?.toFixed(2) || 0} m²</p>
        <p><strong>Zone:</strong> ${props.zone_type || 'N/A'}</p>
        <p><strong>Corner Lot:</strong> ${props.corner_lot ? 'Yes' : 'No'}</p>
        <p><strong>Road Access:</strong> ${props.road_access ? 'Yes' : 'No'}</p>
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        <div className="flex flex-col justify-between gap-6 mb-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">Land Subdivision & Parceling</h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Divide land into optimized parcels for development
            </p>
          </div>
          <div className="flex gap-2">
            <Select 
              value={selectedProjectId?.toString() || ''} 
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={selectedPolygon?.id?.toString() || ''} 
              onValueChange={handlePolygonChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select polygon" />
              </SelectTrigger>
              <SelectContent>
                {polygons.map(polygon => (
                  <SelectItem key={polygon.id} value={polygon.id.toString()}>
                    Polygon {polygon.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold flex items-center gap-2 py-3 px-6 text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              onClick={generateParcels}
              disabled={loading || !selectedPolygon}
            >
              <Zap className="w-5 h-5" />
              {loading ? 'Generating...' : 'Generate Parcels'}
            </Button>
          </div>
        </div>

        {/* Interconnection Navigation */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/roads')}>
            <Route className="w-4 h-4 mr-2" />
            Roads & Transport
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_3fr]">
          <div className="flex flex-col gap-6">
            <Card className="bg-white dark:bg-slate-800 border border-border rounded-[1.25rem] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-base before:to-accent hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(69,136,173,0.3)] hover:border-primary">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-card-foreground mb-2">Parcel Settings</CardTitle>
                <CardDescription className="text-muted-foreground text-sm leading-relaxed">Configure land subdivision parameters</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 last:mb-0">
                  <Label className="text-sm font-semibold text-foreground block mb-2">Parcel Type</Label>
                  <Select 
                    value={subdivisionConfig.parcel_type}
                    onValueChange={(value) => {
                      setSubdivisionConfig(prev => ({ ...prev, parcel_type: value }));
                      // Clear previous results when parcel type changes
                      setSubdivisionResult(null);
                      setParcels([]);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background border-2 border-border text-foreground rounded-xl px-4 py-2.5 text-sm transition-all duration-300 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential Lots</SelectItem>
                      <SelectItem value="commercial">Commercial Parcels</SelectItem>
                      <SelectItem value="industrial">Industrial Plots</SelectItem>
                      <SelectItem value="mixed">Mixed-Use Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4 last:mb-0">
                  <Label className="text-sm font-semibold text-foreground block mb-2">
                    {subdivisionConfig.parcel_type === 'commercial' ? 'Commercial Parcel Size' :
                     subdivisionConfig.parcel_type === 'industrial' ? 'Industrial Plot Size' :
                     subdivisionConfig.parcel_type === 'mixed' ? 'Mixed-Use Parcel Size' :
                     'Residential Lot Size'}
                  </Label>
                  <Select 
                    value={subdivisionConfig.lot_size}
                    onValueChange={(value) => {
                      // Map lot sizes to area in square meters
                      const lotSizeMap = {
                        small: 125,   // 5 Marla ≈ 125 sqm
                        medium: 250,  // 10 Marla ≈ 250 sqm
                        large: 500,   // 1 Kanal ≈ 500 sqm
                        estate: 1000  // 2+ Kanal ≈ 1000+ sqm
                      };
                      const newArea = lotSizeMap[value] || 250;
                      setSubdivisionConfig(prev => ({ 
                        ...prev, 
                        lot_size: value,
                        target_parcel_area: newArea
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-background border-2 border-border text-foreground rounded-xl px-4 py-2.5 text-sm transition-all duration-300 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (5 Marla)</SelectItem>
                      <SelectItem value="medium">Medium (10 Marla)</SelectItem>
                      <SelectItem value="large">Large (1 Kanal)</SelectItem>
                      <SelectItem value="estate">Estate (2+ Kanal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4 last:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-semibold text-foreground block">Road Access</Label>
                    <span className="text-sm font-semibold text-foreground">{subdivisionConfig.road_access}%</span>
                  </div>
                  <Slider 
                    value={[subdivisionConfig.road_access]} 
                    max={100} 
                    step={1}
                    onValueChange={(value) => {
                      setSubdivisionConfig(prev => ({ ...prev, road_access: value[0] }));
                    }}
                  />
                </div>
                
                <div className="mb-4 last:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-semibold text-foreground block">Corner Lot Ratio</Label>
                    <span className="text-sm font-semibold text-foreground">{subdivisionConfig.corner_lot_ratio}%</span>
                  </div>
                  <Slider 
                    value={[subdivisionConfig.corner_lot_ratio]} 
                    max={50} 
                    step={1}
                    onValueChange={(value) => {
                      setSubdivisionConfig(prev => ({ ...prev, corner_lot_ratio: value[0] }));
                    }}
                  />
                </div>
                
                <div className="mb-4 last:mb-0">
                  <Label className="text-sm font-semibold text-foreground block mb-2">Parcel Orientation</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button 
                      variant="outline" 
                      className={`border-border/40 ${subdivisionConfig.orientation === 'optimize' ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => {
                        setSubdivisionConfig(prev => ({ ...prev, orientation: 'optimize', method: 'optimized' }));
                      }}
                    >
                      <Move className="mr-2 h-4 w-4" />
                      Optimize
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`border-border/40 ${subdivisionConfig.orientation === 'grid' ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => {
                        setSubdivisionConfig(prev => ({ ...prev, orientation: 'grid', method: 'grid' }));
                      }}
                    >
                      <GridIcon className="mr-2 h-4 w-4" />
                      Grid
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={() => {
                      if (!selectedPolygon) {
                        toast({
                          title: 'Error',
                          description: 'Please select a polygon first',
                          variant: 'destructive'
                        });
                        return;
                      }
                      generateParcels();
                    }}
                    disabled={loading || !selectedPolygon}
                  >
                    {loading ? 'Applying...' : 'Apply Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-slate-800 border border-border rounded-[1.25rem] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-base before:to-accent hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(69,136,173,0.3)] hover:border-primary">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-card-foreground mb-2">Advanced Options</CardTitle>
                <CardDescription className="text-muted-foreground text-sm leading-relaxed">Fine-tune parcel generation</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 last:mb-0">
                  <Label className="text-sm font-semibold text-foreground block mb-2">Polygon Information</Label>
                  <div className="p-2 bg-muted rounded-md mt-1">
                    <p className="my-1 text-sm">
                      <strong>Total Area:</strong> {polygonArea > 0 ? `${polygonArea.toFixed(2)} m² (${(polygonArea / 4046.86).toFixed(2)} acres)` : 'Calculating...'}
                    </p>
                    {polygonArea > 0 && (
                      <p className="my-1 text-sm">
                        <strong>Estimated Parcels:</strong> ~{Math.round(polygonArea / subdivisionConfig.target_parcel_area)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mb-4 last:mb-0">
                  <Label className="text-sm font-semibold text-foreground block mb-2">Subdivision Algorithm</Label>
                  <Select 
                    value={subdivisionConfig.method}
                    onValueChange={(value) => setSubdivisionConfig({...subdivisionConfig, method: value})}
                  >
                    <SelectTrigger className="w-full bg-background border-2 border-border text-foreground rounded-xl px-4 py-2.5 text-sm transition-all duration-300 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid Pattern</SelectItem>
                      <SelectItem value="voronoi">Voronoi Diagram</SelectItem>
                      <SelectItem value="optimized">Terrain Optimized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4 last:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-semibold text-foreground block">Target Parcel Area (m²)</Label>
                    <span className="text-sm font-semibold text-foreground">{subdivisionConfig.target_parcel_area} m²</span>
                  </div>
                  <Slider 
                    value={[subdivisionConfig.target_parcel_area]} 
                    min={200} 
                    max={Math.max(2000, Math.round(polygonArea / 5))} 
                    step={50}
                    onValueChange={(value) => setSubdivisionConfig({...subdivisionConfig, target_parcel_area: value[0]})}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="setbacks" className="rounded" defaultChecked />
                    <Label htmlFor="setbacks" className="text-foreground">Apply Regulatory Setbacks</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="terrain" className="rounded" defaultChecked />
                    <Label htmlFor="terrain" className="text-foreground">Adapt to Terrain</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="utilities" className="rounded" defaultChecked />
                    <Label htmlFor="utilities" className="text-foreground">Optimize for Utility Access</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="equal-area" className="rounded" defaultChecked />
                    <Label htmlFor="equal-area" className="text-foreground">Maintain Equal Area</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-white dark:bg-slate-800 border border-border rounded-[1.25rem] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-base before:to-accent hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-card-foreground mb-2">Parcel Map</CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed">Interactive map for subdivision planning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-2xl border-2 border-border shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]" style={{ height: '500px', width: '100%' }}>
                {selectedPolygon ? (
                  <MapContainer
                    key={`parcels-map-${selectedPolygon.id}`}
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapCenterUpdater center={mapCenter} zoom={mapZoom} />
                    {selectedPolygon.geojson && (
                      <GeoJSON
                        data={selectedPolygon.geojson}
                        style={{ color: '#3b82f6', weight: 3, fillOpacity: 0.1 }}
                      />
                    )}
                    {subdivisionResult?.parcels && (
                      <GeoJSON
                        data={subdivisionResult.parcels}
                        style={getParcelStyle}
                        onEachFeature={onEachParcel}
                      />
                    )}
                  </MapContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Map className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">Select a polygon to generate parcels</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="outline" size="sm" className="border-border/40 text-sm">
                  <Maximize className="mr-2 h-4 w-4" />
                  Zoom In
                </Button>
                <Button variant="outline" size="sm" className="border-border/40 text-sm">
                  <Minimize className="mr-2 h-4 w-4" />
                  Zoom Out
                </Button>
                <Button variant="outline" size="sm" className="border-border/40 text-sm">
                  <Layers className="mr-2 h-4 w-4" />
                  Toggle Layers
                </Button>
                <Button variant="outline" size="sm" className="border-border/40 text-sm">
                  <Route className="mr-2 h-4 w-4" />
                  Show Roads
                </Button>
              </div>
              
              <div className="mt-6">
                <Tabs defaultValue="residential" className="w-full">
                  <TabsList className="bg-primary border-0">
                    <TabsTrigger value="residential" className="data-[state=active]:bg-accent data-[state=active]:text-white">
                      Residential
                    </TabsTrigger>
                    <TabsTrigger value="commercial" className="data-[state=active]:bg-accent data-[state=active]:text-white">
                      Commercial
                    </TabsTrigger>
                    <TabsTrigger value="industrial" className="data-[state=active]:bg-accent data-[state=active]:text-white">
                      Industrial
                    </TabsTrigger>
                    <TabsTrigger value="mixed" className="data-[state=active]:bg-accent data-[state=active]:text-white">
                      Mixed-Use
                    </TabsTrigger>
                    <TabsTrigger value="public" className="data-[state=active]:bg-accent data-[state=active]:text-white">
                      Public Spaces
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="residential" className="mt-4 flex flex-col gap-4">
                    {loading ? (
                      <div className="text-center py-8">Loading parcels...</div>
                    ) : getParcelsByType('Residential').length === 0 ? (
                      <div className="flex justify-center items-center p-4">
                        <p className="text-muted-foreground">No residential parcels yet. Generate parcels to get started.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          {getParcelsByType('Residential').slice(0, 3).map(parcel => {
                            const area = parseFloat(parcel.area) || 0;
                            const lotSize = parcel.lotSize || 'Custom';
                            return (
                              <div 
                                key={parcel.id} 
                                className={`border rounded-xl p-4 bg-gradient-to-br from-accent-light/5 to-accent-light/5 dark:from-accent-dark/5 dark:to-accent-dark/5 transition-all duration-300 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(102,126,234,0.2)] ${
                                  selectedParcel?.id === parcel.id ? 'border-primary/80 bg-gradient-to-br from-accent-light/15 to-accent-light/15 dark:from-accent-dark/15 dark:to-accent-dark/15 shadow-[0_4px_12px_rgba(102,126,234,0.3)]' : 'border-accent-light-border/20 dark:border-accent-dark-border/20'
                                }`}
                                onClick={() => setSelectedParcel(parcel)}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-medium text-foreground">{lotSize} Lot</h4>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-foreground">{parcel.parcelNumber || 'N/A'}</span>
                                    <span className="text-xs text-muted-foreground">parcel</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Area:</span>
                                    <span className="text-xs text-foreground">{area.toFixed(2)} m²</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Status:</span>
                                    <span className="text-xs text-foreground">{parcel.status || 'Available'}</span>
                                  </div>
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full border-border/40 bg-primary text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedParcel(parcel);
                                    }}
                                  >
                                    <Check className="mr-2 h-3 w-3 text-green-400" />
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div>
                            <h4 className="text-sm font-medium text-foreground">Residential Summary</h4>
                            <p className="text-xs text-muted-foreground">
                              {getParcelsByType('Residential').length} total parcels
                            </p>
                          </div>
                          <Button size="sm" className="bg-gradient-base text-white text-sm border-none py-3 px-6 rounded-xl font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full">
                            Optimize Layout
                          </Button>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="commercial" className="mt-4 flex flex-col gap-4">
                    {loading ? (
                      <div className="text-center py-8">Loading parcels...</div>
                    ) : getParcelsByType('Commercial').length === 0 ? (
                      <div className="flex justify-center items-center p-4">
                        <p>No commercial parcels yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {getParcelsByType('Commercial').map(parcel => (
                          <div 
                            key={parcel.id} 
                            className={`border rounded-xl p-4 bg-gradient-to-br from-accent-light/5 to-accent-light/5 dark:from-accent-dark/5 dark:to-accent-dark/5 transition-all duration-300 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(102,126,234,0.2)] ${selectedParcel?.id === parcel.id ? 'border-primary/80 bg-gradient-to-br from-accent-light/15 to-accent-light/15 dark:from-accent-dark/15 dark:to-accent-dark/15 shadow-[0_4px_12px_rgba(102,126,234,0.3)]' : 'border-accent-light-border/20 dark:border-accent-dark-border/20'}`}
                            onClick={() => setSelectedParcel(parcel)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-medium text-foreground">{parcel.parcelNumber || 'Commercial Parcel'}</h4>
                              <div className="flex items-center gap-1">
                                <span className="flex items-center gap-1-value">{parseFloat(parcel.area || 0).toFixed(0)}</span>
                                <span className="flex items-center gap-1-label">m²</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="flex justify-between items-center-label">Status:</span>
                                <span className="flex justify-between items-center-value">{parcel.status || 'Available'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="industrial" className="mt-4 flex flex-col gap-4">
                    {loading ? (
                      <div className="text-center py-8">Loading parcels...</div>
                    ) : getParcelsByType('Industrial').length === 0 ? (
                      <div className="flex justify-center items-center p-4">
                        <p>No industrial parcels yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {getParcelsByType('Industrial').map(parcel => (
                          <div 
                            key={parcel.id} 
                            className={`border rounded-xl p-4 bg-gradient-to-br from-accent-light/5 to-accent-light/5 dark:from-accent-dark/5 dark:to-accent-dark/5 transition-all duration-300 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(102,126,234,0.2)] ${selectedParcel?.id === parcel.id ? 'border-primary/80 bg-gradient-to-br from-accent-light/15 to-accent-light/15 dark:from-accent-dark/15 dark:to-accent-dark/15 shadow-[0_4px_12px_rgba(102,126,234,0.3)]' : 'border-accent-light-border/20 dark:border-accent-dark-border/20'}`}
                            onClick={() => setSelectedParcel(parcel)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-medium text-foreground">{parcel.parcelNumber || 'Industrial Plot'}</h4>
                              <div className="flex items-center gap-1">
                                <span className="flex items-center gap-1-value">{parseFloat(parcel.area || 0).toFixed(0)}</span>
                                <span className="flex items-center gap-1-label">m²</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="flex justify-between items-center-label">Status:</span>
                                <span className="flex justify-between items-center-value">{parcel.status || 'Available'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="mixed" className="mt-4 flex flex-col gap-4">
                    {loading ? (
                      <div className="text-center py-8">Loading parcels...</div>
                    ) : getParcelsByType('Mixed-Use').length === 0 ? (
                      <div className="flex justify-center items-center p-4">
                        <p>No mixed-use parcels yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {getParcelsByType('Mixed-Use').map(parcel => (
                          <div 
                            key={parcel.id} 
                            className={`border rounded-xl p-4 bg-gradient-to-br from-accent-light/5 to-accent-light/5 dark:from-accent-dark/5 dark:to-accent-dark/5 transition-all duration-300 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(102,126,234,0.2)] ${selectedParcel?.id === parcel.id ? 'border-primary/80 bg-gradient-to-br from-accent-light/15 to-accent-light/15 dark:from-accent-dark/15 dark:to-accent-dark/15 shadow-[0_4px_12px_rgba(102,126,234,0.3)]' : 'border-accent-light-border/20 dark:border-accent-dark-border/20'}`}
                            onClick={() => setSelectedParcel(parcel)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-medium text-foreground">{parcel.parcelNumber || 'Mixed-Use Parcel'}</h4>
                              <div className="flex items-center gap-1">
                                <span className="flex items-center gap-1-value">{parseFloat(parcel.area || 0).toFixed(0)}</span>
                                <span className="flex items-center gap-1-label">m²</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="flex justify-between items-center-label">Status:</span>
                                <span className="flex justify-between items-center-value">{parcel.status || 'Available'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="public" className="mt-4 flex flex-col gap-4">
                    {loading ? (
                      <div className="text-center py-8">Loading parcels...</div>
                    ) : getParcelsByType('Public').length === 0 ? (
                      <div className="flex justify-center items-center p-4">
                        <p>No public space parcels yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {getParcelsByType('Public').map(parcel => (
                          <div key={parcel.id} className="border rounded-xl p-4 bg-gradient-to-br from-accent-light/5 to-accent-light/5 dark:from-accent-dark/5 dark:to-accent-dark/5 transition-all duration-300 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(102,126,234,0.2)] border-accent-light-border/20 dark:border-accent-dark-border/20">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-medium text-foreground">{parcel.parcelNumber || 'Public Parcel'}</h4>
                              <div className="flex items-center gap-1">
                                <span className="flex items-center gap-1-value">{parseFloat(parcel.area || 0).toFixed(0)}</span>
                                <span className="flex items-center gap-1-label">m²</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="flex justify-between items-center-label">Status:</span>
                                <span className="flex justify-between items-center-value">{parcel.status || 'Available'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="bg-secondary border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-card-foreground mb-2">Parcel Information</CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed">Specifications for selected parcels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  {subdivisionResult ? (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Total Parcels:</strong> {subdivisionResult.total_parcels || 0}
                      </div>
                      {subdivisionResult.statistics && (
                        <div style={{ marginTop: '10px', fontSize: '0.875rem', color: 'var(--muted-foreground)', lineHeight: '1.6' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <div>
                              <strong>Polygon Area:</strong><br />
                              {subdivisionResult.polygon_area?.toFixed(2) || subdivisionResult.statistics.total_area?.toFixed(2) || 0} m²
                            </div>
                            <div>
                              <strong>Parcel Area:</strong><br />
                              {subdivisionResult.statistics.total_parcel_area?.toFixed(2) || 0} m²
                            </div>
                            <div>
                              <strong>Avg Parcel:</strong><br />
                              {subdivisionResult.statistics.parcel_area_avg?.toFixed(2) || 0} m²
                            </div>
                            <div>
                              <strong>Efficiency:</strong><br />
                              {subdivisionResult.statistics.efficiency?.toFixed(1) || 0}%
                            </div>
                          </div>
                          <div style={{ marginTop: '8px', padding: '8px', background: 'var(--muted)', borderRadius: '4px' }}>
                            <strong>Size Range:</strong> {subdivisionResult.statistics.parcel_area_min?.toFixed(2) || 0} - {subdivisionResult.statistics.parcel_area_max?.toFixed(2) || 0} m²
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <p>No Parcels Generated</p>
                      {polygonArea > 0 && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '8px' }}>
                          Polygon Area: {polygonArea.toFixed(2)} m² ({(polygonArea / 4046.86).toFixed(2)} acres)
                        </p>
                      )}
                    </div>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-3 gap-y-4">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs text-muted-foreground">Parcel Type</h4>
                    <p className="text-sm text-foreground font-medium">
                      {selectedParcel 
                        ? `${selectedParcel.type || 'Residential'} (${subdivisionConfig.lot_size === 'small' ? 'Small' : subdivisionConfig.lot_size === 'medium' ? 'Medium' : subdivisionConfig.lot_size === 'large' ? 'Large' : 'Estate'})`
                        : `${subdivisionConfig.parcel_type === 'residential' ? 'Residential' : subdivisionConfig.parcel_type === 'commercial' ? 'Commercial' : subdivisionConfig.parcel_type === 'industrial' ? 'Industrial' : 'Mixed-Use'} (${subdivisionConfig.lot_size === 'small' ? 'Small' : subdivisionConfig.lot_size === 'medium' ? 'Medium' : subdivisionConfig.lot_size === 'large' ? 'Large' : 'Estate'})`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs text-muted-foreground">Area</h4>
                    <p className="text-sm text-foreground font-medium">
                      {selectedParcel 
                        ? `${(selectedParcel.area || 0).toFixed(2)} m² (${((selectedParcel.area || 0) / 4046.86).toFixed(2)} acres)`
                        : `${subdivisionConfig.target_parcel_area} m² (${(subdivisionConfig.target_parcel_area / 4046.86).toFixed(2)} acres)`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs text-muted-foreground">Road Access</h4>
                    <p className="text-sm text-foreground font-medium">
                      {selectedParcel 
                        ? selectedParcel.road_access ? 'Yes' : 'No'
                        : `${subdivisionConfig.road_access}%`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs text-muted-foreground">Corner Lot</h4>
                    <p className="text-sm text-foreground font-medium">
                      {selectedParcel 
                        ? selectedParcel.corner_lot ? 'Yes' : 'No'
                        : `${subdivisionConfig.corner_lot_ratio}% target`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs text-muted-foreground">Dimensions</h4>
                    <p className="text-sm text-foreground font-medium">
                      {selectedParcel && selectedParcel.perimeter
                        ? `Perimeter: ${selectedParcel.perimeter.toFixed(2)} m`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs text-muted-foreground">Status</h4>
                    <p className="text-sm text-foreground font-medium">{selectedParcel?.status || 'Available'}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-xs text-muted-foreground mb-1">Utilities Access</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Water</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Electricity</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Sewage</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Internet</span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-border/40 text-sm"
                    onClick={() => {
                      if (selectedParcel) {
                        toast({
                          title: 'Edit Parcel',
                          description: `Editing parcel ${selectedParcel.parcelNumber}. Feature coming soon!`,
                        });
                      } else {
                        toast({
                          title: 'No Parcel Selected',
                          description: 'Please select a parcel from the map or list to edit.',
                          variant: 'destructive'
                        });
                      }
                    }}
                    disabled={!selectedParcel}
                  >
                    Edit Parcel
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-accent text-white text-sm"
                    onClick={() => {
                      if (selectedParcel && selectedParcel.geometry) {
                        const coords = selectedParcel.geometry.coordinates[0];
                        if (coords && coords.length > 0) {
                          const center = coords.reduce((acc, coord) => {
                            return [acc[0] + coord[1], acc[1] + coord[0]];
                          }, [0, 0]);
                          center[0] /= coords.length;
                          center[1] /= coords.length;
                          setMapCenter(center);
                          setMapZoom(18);
                          toast({
                            title: 'Parcel Located',
                            description: `Zoomed to parcel ${selectedParcel.parcelNumber}`,
                          });
                        }
                      } else {
                        toast({
                          title: 'No Parcel Selected',
                          description: 'Please select a parcel from the map or list.',
                          variant: 'destructive'
                        });
                      }
                    }}
                    disabled={!selectedParcel}
                  >
                    Show on Map
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-card-foreground mb-2">Land Efficiency Analysis</CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed">Optimization metrics for subdivision</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="border border-border/20 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-foreground">Land Utilization</h4>
                    {efficiencyAnalysis ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${efficiencyAnalysis.utilizationBadge}`}>
                        {efficiencyAnalysis.utilizationRating}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Excellent</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 bg-accent rounded-full flex-grow transition-[width] duration-300" 
                      style={{ width: `${efficiencyAnalysis?.landUtilization || 92}%` }}
                    ></div>
                    <span className="text-xs text-foreground">
                      {efficiencyAnalysis?.landUtilization?.toFixed(1) || 92}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {efficiencyAnalysis 
                      ? efficiencyAnalysis.landUtilization >= 90 
                        ? 'High efficiency with minimal wasted space. Road layout and parcel shapes are well optimized.'
                        : efficiencyAnalysis.landUtilization >= 75
                        ? 'Good efficiency. Some optimization opportunities may exist.'
                        : 'Efficiency could be improved. Consider adjusting parcel sizes or layout.'
                      : 'High efficiency with minimal wasted space. Road layout and parcel shapes are well optimized.'}
                  </p>
                </div>
                
                <div className="border border-border/20 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-foreground">Regulatory Compliance</h4>
                    {efficiencyAnalysis ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        efficiencyAnalysis.complianceChecks.minLotSize && 
                        efficiencyAnalysis.complianceChecks.maxLotSize && 
                        efficiencyAnalysis.complianceChecks.avgLotSize &&
                        efficiencyAnalysis.cornerLotCompliant &&
                        efficiencyAnalysis.roadAccessCompliant
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {efficiencyAnalysis.complianceChecks.minLotSize && 
                         efficiencyAnalysis.complianceChecks.maxLotSize && 
                         efficiencyAnalysis.complianceChecks.avgLotSize &&
                         efficiencyAnalysis.cornerLotCompliant &&
                         efficiencyAnalysis.roadAccessCompliant
                          ? 'Compliant' 
                          : 'Needs Review'}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Compliant</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {efficiencyAnalysis?.complianceChecks?.minLotSize ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-xs text-foreground">Minimum lot size requirements met</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {efficiencyAnalysis?.complianceChecks?.maxLotSize ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-xs text-foreground">Maximum lot size requirements met</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {efficiencyAnalysis?.roadAccessCompliant ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-xs text-foreground">
                        Road access standards met ({efficiencyAnalysis?.roadAccess?.toFixed(1) || 0}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {efficiencyAnalysis?.cornerLotCompliant ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-xs text-foreground">
                        Corner lot ratio target met ({efficiencyAnalysis?.cornerLotRatio?.toFixed(1) || 0}%)
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border border-border/20 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-foreground">AI Recommendations</h4>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {efficiencyAnalysis?.recommendations && efficiencyAnalysis.recommendations.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {efficiencyAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} style={{ marginBottom: '8px' }}>{rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No recommendations at this time. Subdivision meets optimization criteria.</p>
                    )}
                  </div>
                  <Button 
                    className="w-full bg-gradient-base text-white border-none py-3.5 px-7 rounded-xl font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full"
                    onClick={() => {
                      if (efficiencyAnalysis?.recommendations && efficiencyAnalysis.recommendations.length > 0) {
                        // Apply recommendations by adjusting config
                        const rec = efficiencyAnalysis.recommendations[0];
                        if (rec.includes('parcel sizes')) {
                          // Adjust target parcel area
                          const newArea = subdivisionConfig.target_parcel_area * 1.1;
                          setSubdivisionConfig(prev => ({ ...prev, target_parcel_area: Math.round(newArea) }));
                          toast({
                            title: 'AI Suggestion Applied',
                            description: 'Adjusted target parcel area to improve efficiency',
                          });
                        } else if (rec.includes('orientation')) {
                          // Switch to optimized method
                          setSubdivisionConfig(prev => ({ ...prev, method: 'optimized', orientation: 'optimize' }));
                          toast({
                            title: 'AI Suggestion Applied',
                            description: 'Switched to optimized orientation method',
                          });
                        } else {
                          toast({
                            title: 'AI Suggestion',
                            description: 'Review the recommendations and adjust settings manually',
                          });
                        }
                      } else {
                        toast({
                          title: 'No Suggestions',
                          description: 'Current subdivision already meets optimization criteria',
                        });
                      }
                    }}
                  >
                    Apply AI Suggestions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Parcels;
