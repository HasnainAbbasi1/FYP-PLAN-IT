import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  MapPin, 
  Building, 
  Zap, 
  Settings, 
  Download,
  RefreshCw,
  TrendingUp,
  Target,
  CheckCircle,
  AlertCircle,
  Layers,
  Grid3X3,
  BarChart3,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { MapContainer, TileLayer, GeoJSON, Polygon as LeafletPolygon, Popup } from 'react-leaflet';
import optimizationZoningApiService from '../../services/optimizationZoningApi';
import polygonApi from '../../services/polygonApi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const OptimizationZoning = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('setup');

  // Helper function to create smooth zone polygons from assignments
  const createZonePolygons = (assignments) => {
    if (!assignments || assignments.length === 0) return [];
    
    // If zones are provided in result, use them directly
    if (optimizationResults.zones && optimizationResults.zones.length > 0) {
      return optimizationResults.zones.map(zone => ({
        landUse: zone.land_use,
        coords: zone.coordinates ? zone.coordinates.map(coord => [coord[1], coord[0]]) : [], // Convert lon,lat to lat,lon
        cellCount: zone.cell_count,
        zoneId: zone.zone_id,
        subZone: zone.sub_zone,
        area_m2: zone.area_m2,
        area_acres: zone.area_acres,
        area_hectares: zone.area_hectares,
        cell_polygons: zone.cell_polygons, // Individual cell squares
        avgFitness: zone.cells ? zone.cells.reduce((sum, c) => sum + (c.fitness || 0), 0) / zone.cells.length : 0.75
      }));
    }
    
    // Fallback: compute convex hull from cells
    const landUseGroups = {};
    assignments.forEach(cell => {
      if (!landUseGroups[cell.land_use]) {
        landUseGroups[cell.land_use] = [];
      }
      landUseGroups[cell.land_use].push(cell);
    });
    
    // Create smooth polygons for each land use zone
    const zonePolygons = [];
    Object.entries(landUseGroups).forEach(([landUse, cells]) => {
      if (cells.length < 3) return;
      
      // Calculate centroid
      const centroid = {
        lat: cells.reduce((sum, c) => sum + c.lat, 0) / cells.length,
        lon: cells.reduce((sum, c) => sum + c.lon, 0) / cells.length
      };
      
      // Sort cells by angle from centroid (creates convex-like boundary)
      const sortedCells = cells.sort((a, b) => {
        const angleA = Math.atan2(a.lat - centroid.lat, a.lon - centroid.lon);
        const angleB = Math.atan2(b.lat - centroid.lat, b.lon - centroid.lon);
        return angleA - angleB;
      });
      
      // Create smooth polygon coordinates
      const coords = sortedCells.map(cell => [cell.lat, cell.lon]);
      
      zonePolygons.push({
        landUse,
        coords,
        cellCount: cells.length,
        avgFitness: cells.reduce((sum, c) => sum + (c.fitness || 0), 0) / cells.length
      });
    });
    
    return zonePolygons;
  };

  // Calculate polygon area from GeoJSON coordinates using Shoelace formula
  const calculatePolygonArea = (geojson) => {
    if (!geojson || !geojson.coordinates || !geojson.coordinates[0]) {
      console.warn('Invalid GeoJSON structure for area calculation');
      return 0;
    }

    const coordinates = geojson.coordinates[0];
    if (coordinates.length < 3) {
      console.warn('Insufficient coordinates for area calculation');
      return 0;
    }

    // Use geodesic area calculation for accurate results
    const toRadians = (deg) => deg * Math.PI / 180;
    const R = 6371000; // Earth's radius in meters

    let area = 0;
    const n = coordinates.length - 1; // Exclude last point if it's same as first

    for (let i = 0; i < n; i++) {
      const [lon1, lat1] = coordinates[i];
      const [lon2, lat2] = coordinates[(i + 1) % n];
      
      const lat1Rad = toRadians(lat1);
      const lat2Rad = toRadians(lat2);
      const lon1Rad = toRadians(lon1);
      const lon2Rad = toRadians(lon2);
      
      area += (lon2Rad - lon1Rad) * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
    }
    
    const calculatedArea = Math.abs(area * R * R / 2);
    console.log('Calculated polygon area:', calculatedArea, 'm²');
    return calculatedArea;
  };
  
  // Polygon management
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [calculatedArea, setCalculatedArea] = useState(null);
  
  // Calculate area when polygon is selected
  useEffect(() => {
    if (selectedPolygon && selectedPolygon.geojson) {
      const area = calculatePolygonArea(selectedPolygon.geojson);
      setCalculatedArea(area);
      console.log('Selected polygon area:', area, 'm²');
    } else {
      setCalculatedArea(null);
    }
  }, [selectedPolygon]);
  
  // Optimization parameters
  const [parameters, setParameters] = useState({
    gridSize: 100,
    maxGenerations: 100,
    populationSize: 50,
    objectives: {
      suitability: 0.4,
      areaRatio: 0.3,
      connectivity: 0.2,
      environmental: 0.1
    },
    constraints: {
      maxSlope: 15,
      minGreenSpace: 0.2,
      maxDensity: 0.8
    },
    areaTargets: {
      residential: 0.5,
      commercial: 0.2,
      industrial: 0.1,
      greenSpace: 0.2
    }
  });
  
  // Optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [optimizationHistory, setOptimizationHistory] = useState([]);
  
  // Error handling
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch polygons when project is selected
  useEffect(() => {
    if (currentProject) {
      fetchPolygons();
    } else {
      setPolygons([]);
      setSelectedPolygon(null);
    }
  }, [currentProject]);

  const fetchPolygons = async () => {
    if (!currentProject) return;
    
    try {
      console.log('Fetching polygons for project:', currentProject.id);
      const polygonsArray = await polygonApi.getPolygonsWithUnassigned(currentProject.id);
      setPolygons(polygonsArray);
      console.log('Polygons loaded:', polygonsArray.length, 'polygons');
    } catch (err) {
      console.error('Error fetching polygons:', err);
      setError(`Failed to load polygons: ${err.message}`);
      
      // Add mock data for testing if API fails
      const mockPolygons = [
        {
          id: 1,
          name: 'Test Polygon 1',
          project_id: currentProject.id,
          geojson: {
            type: 'Polygon',
            coordinates: [[[73.0479, 33.6844], [73.0579, 33.6844], [73.0579, 33.6944], [73.0479, 33.6944], [73.0479, 33.6844]]]
          },
          dem_url: '/uploads/polygons/test_dem_1.tif',
          area: 1000000
        },
        {
          id: 2,
          name: 'Test Polygon 2',
          project_id: currentProject.id,
          geojson: {
            type: 'Polygon',
            coordinates: [[[73.0679, 33.7044], [73.0779, 33.7044], [73.0779, 33.7144], [73.0679, 33.7144], [73.0679, 33.7044]]]
          },
          dem_url: null,
          area: 500000
        }
      ];
      
      console.log('Using mock polygons for testing');
      setPolygons(mockPolygons);
      setError(null); // Clear the error since we have mock data
    }
  };

  const handleParameterChange = (category, key, value) => {
    setParameters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleObjectiveWeightChange = (objective, value) => {
    setParameters(prev => ({
      ...prev,
      objectives: {
        ...prev.objectives,
        [objective]: value / 100
      }
    }));
  };

  const handleAreaTargetChange = (zoneType, value) => {
    setParameters(prev => ({
      ...prev,
      areaTargets: {
        ...prev.areaTargets,
        [zoneType]: value / 100
      }
    }));
  };

  const runOptimization = async () => {
    if (!currentProject || !selectedPolygon) {
      setError('Please select both a project and polygon');
      return;
    }

    // Validate polygon has required data
    if (!selectedPolygon.geojson) {
      setError('Selected polygon is missing boundary data (GeoJSON). Please select a different polygon.');
      return;
    }

    if (!selectedPolygon.dem_url) {
      setError('Selected polygon is missing DEM data. Please select a polygon with terrain data.');
      return;
    }

    setIsOptimizing(true);
    setOptimizationProgress(0);
    setError(null);
    setSuccess(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 1000);

      // Fetch terrain data from database if available
      let terrainData = null;
      try {
        const terrainResponse = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/terrain_analysis?polygon_id=${selectedPolygon.id}&project_id=${currentProject.id}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (terrainResponse.ok) {
          const terrainResult = await terrainResponse.json();
          if (terrainResult.terrain_analysis) {
            terrainData = terrainResult.terrain_analysis;
            console.log('Fetched terrain data from database');
          }
        }
      } catch (terrainErr) {
        console.warn('Could not fetch terrain data:', terrainErr.message);
      }

      // Also try to get terrain data from zoning results
      if (!terrainData) {
        try {
          const zoningResponse = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/zoning/${selectedPolygon.id}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          
          if (zoningResponse.ok) {
            const zoningResult = await zoningResponse.json();
            if (zoningResult.result?.terrain_summary) {
              const terrainSummary = zoningResult.result.terrain_summary;
              terrainData = {
                stats: terrainSummary,
                slope_analysis: terrainSummary.slope_analysis || {},
                flood_analysis: terrainSummary.flood_analysis || {},
                erosion_analysis: terrainSummary.erosion_analysis || {},
                terrain_summary: terrainSummary
              };
              console.log('Fetched terrain data from zoning results');
            }
          }
        } catch (zoningErr) {
          console.warn('Could not fetch terrain data from zoning:', zoningErr.message);
        }
      }

      // Prepare the data that the backend expects
      const userId = localStorage.getItem('userId') || user?.id;
      const optimizationData = {
        projectId: currentProject.id,
        userId: userId, // Explicitly include userId
        polygonId: selectedPolygon.id,
        demFile: selectedPolygon.dem_url, // DEM file path from polygon
        polygonBoundary: selectedPolygon.geojson, // GeoJSON boundary from polygon
        terrainData: terrainData, // Include terrain data if available
        cellSize: parameters.gridSize,
        customTargets: parameters.areaTargets,
        constraints: parameters.constraints,
        optimizationParams: {
          maxGenerations: parameters.maxGenerations,
          populationSize: parameters.populationSize,
          objectives: parameters.objectives
        }
      };

      console.log('🚀 Starting optimization with data:', {
        projectId: optimizationData.projectId,
        userId: optimizationData.userId,
        polygonId: optimizationData.polygonId,
        hasDemFile: !!optimizationData.demFile,
        hasPolygonBoundary: !!optimizationData.polygonBoundary,
        cellSize: optimizationData.cellSize,
        parameters: optimizationData.optimizationParams
      });

      // The API service expects a single data object, not separate arguments
      const result = await optimizationZoningApiService.generateOptimizationZoning(optimizationData);

      clearInterval(progressInterval);
      setOptimizationProgress(100);
      
      // Extract the data from the API response
      const resultData = result.data || result;
      console.log('Optimization result data:', resultData);
      
      setOptimizationResults(resultData);
      setSuccess('Optimization completed successfully!');
      
      // Add to history
      setOptimizationHistory(prev => [resultData, ...prev.slice(0, 9)]);
      
    } catch (err) {
      console.error('Optimization error:', err);
      const errorMessage = err.message || 'Optimization failed';
      setError(errorMessage);
      setSuccess(null);
      
      // Show error toast
      toast({
        title: "❌ Optimization Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const downloadResults = () => {
    if (!optimizationResults) return;
    
    const dataStr = JSON.stringify(optimizationResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optimization_results_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fetchRealDEMData = async () => {
    if (!selectedPolygon) {
      setError('Please select a polygon first');
      return;
    }

    try {
      console.log('🌍 Fetching real DEM data for polygon:', selectedPolygon.id);
      setError(null);
      setSuccess('Fetching DEM data... This may take a few minutes.');
      
      // Call the backend to fetch DEM data
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/polygon/${selectedPolygon.id}/fetch-dem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        if (result.message === 'Polygon already has DEM data') {
          setSuccess('Polygon already has DEM data! You can now run optimization.');
        } else {
          setSuccess(`Real DEM data fetched successfully! Resolution: ${result.resolution}, Area: ${result.area?.toFixed(2)} km²`);
          
          // Update the selected polygon with the new DEM URL
          setSelectedPolygon(prev => ({
            ...prev,
            dem_url: result.dem_url
          }));
        }
        console.log('Real DEM data fetched:', result);
      } else {
        throw new Error(result.message || 'Failed to fetch DEM data');
      }
    } catch (error) {
      console.error('Error fetching real DEM data:', error);
      setError(`Failed to fetch DEM data: ${error.message}`);
      setSuccess(null);
    }
  };

  const resetOptimization = () => {
    setOptimizationResults(null);
    setOptimizationProgress(0);
    setError(null);
    setSuccess(null);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        <div className="flex items-center justify-between mb-4 sm:flex-col sm:items-stretch sm:gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">AI-Powered Zoning Optimization</h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Use multi-objective optimization to create optimal land use patterns
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {optimizationResults && (
              <Button variant="outline" onClick={downloadResults}>
                <Download className="mr-2 h-4 w-4" />
                Download Results
              </Button>
            )}
            <Button 
              onClick={runOptimization} 
              disabled={!currentProject || !selectedPolygon || isOptimizing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold flex items-center gap-2 py-3 px-6 text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Zap className="w-5 h-5" />
              {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-br from-white/5 to-white/2 border-2 border-white/10 rounded-2xl p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            <TabsTrigger value="setup" className="data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300">
              <Settings className="mr-2 h-4 w-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="parameters" className="data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300">
              <Brain className="mr-2 h-4 w-4" />
              Parameters
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300">
              <BarChart3 className="mr-2 h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300">
              <FileText className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground mb-2">Project & Polygon Selection</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    {currentProject ? `Working on: ${currentProject.title || currentProject.name}` : 'Select a project from the header to get started'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {currentProject && (
                    <div className="mb-4 last:mb-0">
                      <Label htmlFor="project-display" className="text-sm font-semibold text-foreground block mb-2">
                        Current Project
                      </Label>
                      <div className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm transition-all duration-300 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" style={{ padding: '8px 12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        {currentProject.title || currentProject.name || `Project ${currentProject.id}`}
                      </div>
                    </div>
                  )}

                  <div className="mb-4 last:mb-0">
                    <Label htmlFor="polygon-select" className="text-sm font-semibold text-foreground block mb-2">
                      Polygon
                    </Label>
                    <Select 
                      value={selectedPolygon?.id?.toString() || ''} 
                      onValueChange={(value) => {
                        const polygon = polygons.find(p => p.id.toString() === value);
                        setSelectedPolygon(polygon);
                        setOptimizationResults(null);
                      }}
                      disabled={!currentProject}
                    >
                      <SelectTrigger className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm transition-all duration-300 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select a polygon" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(polygons) && polygons.map(polygon => (
                          <SelectItem key={polygon.id} value={polygon.id.toString()}>
                            {polygon.name || `Polygon ${polygon.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPolygon && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2 last:mb-0 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-accent" />
                        <span>Area: {(calculatedArea || selectedPolygon.area || 0).toLocaleString()} m²</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2 last:mb-0 text-sm text-muted-foreground">
                        <Grid3X3 className="w-4 h-4 text-accent" />
                        <span>Grid Cells: {Math.ceil((calculatedArea || selectedPolygon.area || 0) / (parameters.gridSize * parameters.gridSize))}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]" style={{ gridColumn: '1 / -1' }}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground mb-2">Optimization Preview</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    Preview the selected polygon area for optimization
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedPolygon && selectedPolygon.geojson ? (
                    <div className="space-y-4">
                      {/* Polygon Info */}
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {selectedPolygon.name || `Polygon ${selectedPolygon.id}`}
                            </h3>
                            <div className="flex gap-3 mt-2">
                              <Badge variant={selectedPolygon.geojson ? 'default' : 'destructive'}>
                                GeoJSON: {selectedPolygon.geojson ? '✓' : '✗'}
                              </Badge>
                              <Badge variant={selectedPolygon.dem_url ? 'default' : 'destructive'}>
                                DEM Data: {selectedPolygon.dem_url ? '✓' : '✗'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Area Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <span className="text-sm text-muted-foreground">Area (m²)</span>
                            <p className="font-bold text-lg">{
                              (calculatedArea || selectedPolygon.area || 0).toLocaleString()
                            }</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Hectares</span>
                            <p className="font-bold text-lg">{
                              ((calculatedArea || selectedPolygon.area || 0) / 10000).toFixed(2)
                            } ha</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Acres</span>
                            <p className="font-bold text-lg">{
                              ((calculatedArea || selectedPolygon.area || 0) / 4046.86).toFixed(2)
                            } ac</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Square Kilometers</span>
                            <p className="font-bold text-lg">{
                              ((calculatedArea || selectedPolygon.area || 0) / 1000000).toFixed(4)
                            } km²</p>
                          </div>
                        </div>

                        {/* DEM Warning */}
                        {!selectedPolygon.dem_url && (
                          <Alert className="mt-4 border-yellow-300 bg-yellow-50">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800">
                              ⚠️ This polygon needs DEM data for optimization.
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  onClick={fetchRealDEMData}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  🌍 Fetch Real DEM Data
                                </Button>
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Map Preview */}
                      <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                        <MapContainer
                          center={(() => {
                            try {
                              const coords = selectedPolygon.geojson.coordinates[0][0];
                              return [coords[1], coords[0]]; // [lat, lon]
                            } catch (e) {
                              return [33.6844, 73.0479]; // Default Islamabad coordinates
                            }
                          })()}
                          zoom={13}
                          style={{ height: '100%', width: '100%' }}
                          key={selectedPolygon.id} // Force remount when polygon changes
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          <GeoJSON
                            data={selectedPolygon.geojson}
                            style={{
                              color: '#4588AD',
                              weight: 3,
                              fillColor: '#4588AD',
                              fillOpacity: 0.2
                            }}
                          >
                            <Popup>
                              <div style={{ padding: '8px' }}>
                                <strong>{selectedPolygon.name || `Polygon ${selectedPolygon.id}`}</strong>
                                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                                  <div><strong>Area:</strong> {
                                    ((calculatedArea || selectedPolygon.area || 0) / 10000).toFixed(2)
                                  } ha</div>
                                  <div><strong>Grid Size:</strong> {parameters.gridSize}m</div>
                                </div>
                              </div>
                            </Popup>
                          </GeoJSON>
                        </MapContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Layers className="flex flex-col items-center justify-center py-12 text-center-icon" />
                      <p>Select a polygon to preview optimization area</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 mb-4-success">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="parameters" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground mb-2">Algorithm Parameters</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    Configure the optimization algorithm settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-4 last:mb-0">
                    <Label htmlFor="grid-size" className="text-sm font-semibold text-foreground block mb-2">
                      Grid Size (meters)
                    </Label>
                    <Input
                      id="grid-size"
                      type="number"
                      value={parameters.gridSize}
                      onChange={(e) => handleParameterChange('', 'gridSize', parseInt(e.target.value))}
                      min="50"
                      max="500"
                      step="25"
                    />
                    <p className="text-sm text-muted-foreground mb-4">
                      Size of each grid cell for optimization
                    </p>
                  </div>

                  <div className="mb-4 last:mb-0">
                    <Label htmlFor="max-generations" className="text-sm font-semibold text-foreground block mb-2">
                      Max Generations
                    </Label>
                    <Input
                      id="max-generations"
                      type="number"
                      value={parameters.maxGenerations}
                      onChange={(e) => handleParameterChange('', 'maxGenerations', parseInt(e.target.value))}
                      min="50"
                      max="500"
                      step="25"
                    />
                  </div>

                  <div className="mb-4 last:mb-0">
                    <Label htmlFor="population-size" className="text-sm font-semibold text-foreground block mb-2">
                      Population Size
                    </Label>
                    <Input
                      id="population-size"
                      type="number"
                      value={parameters.populationSize}
                      onChange={(e) => handleParameterChange('', 'populationSize', parseInt(e.target.value))}
                      min="20"
                      max="200"
                      step="10"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground mb-2">Objective Weights</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    Balance different optimization objectives
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {Object.entries(parameters.objectives).map(([objective, weight]) => (
                    <div key={objective} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm font-semibold text-foreground block mb-2">
                          {objective.charAt(0).toUpperCase() + objective.slice(1)}
                        </Label>
                        <span className="text-sm font-semibold text-foreground">
                          {Math.round(weight * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[weight * 100]}
                        onValueChange={([value]) => handleObjectiveWeightChange(objective, value)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground mb-2">Area Targets</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    Define target area ratios for each land use type
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {Object.entries(parameters.areaTargets).map(([zoneType, target]) => (
                    <div key={zoneType} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm font-semibold text-foreground block mb-2">
                          {zoneType.charAt(0).toUpperCase() + zoneType.slice(1)}
                        </Label>
                        <span className="text-sm font-semibold text-foreground">
                          {Math.round(target * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[target * 100]}
                        onValueChange={([value]) => handleAreaTargetChange(zoneType, value)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground mb-2">Constraints</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    Set optimization constraints
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-4 last:mb-0">
                    <Label htmlFor="max-slope" className="text-sm font-semibold text-foreground block mb-2">
                      Max Slope (degrees)
                    </Label>
                    <Input
                      id="max-slope"
                      type="number"
                      value={parameters.constraints.maxSlope}
                      onChange={(e) => handleParameterChange('constraints', 'maxSlope', parseFloat(e.target.value))}
                      min="5"
                      max="45"
                      step="5"
                    />
                  </div>

                  <div className="mb-4 last:mb-0">
                    <Label htmlFor="min-green-space" className="text-sm font-semibold text-foreground block mb-2">
                      Min Green Space (%)
                    </Label>
                    <Input
                      id="min-green-space"
                      type="number"
                      value={parameters.constraints.minGreenSpace * 100}
                      onChange={(e) => handleParameterChange('constraints', 'minGreenSpace', parseFloat(e.target.value) / 100)}
                      min="0"
                      max="50"
                      step="5"
                    />
                  </div>

                  <div className="mb-4 last:mb-0">
                    <Label htmlFor="max-density" className="text-sm font-semibold text-foreground block mb-2">
                      Max Density (%)
                    </Label>
                    <Input
                      id="max-density"
                      type="number"
                      value={parameters.constraints.maxDensity * 100}
                      onChange={(e) => handleParameterChange('constraints', 'maxDensity', parseFloat(e.target.value) / 100)}
                      min="50"
                      max="100"
                      step="5"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            {optimizationResults ? (
              <div className="mt-6">
                <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] mt-6-card">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground mb-2">Optimization Results</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                      Results from the multi-objective optimization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="p-4 border rounded-lg">
                      <h3>Optimization Results</h3>
                      {optimizationResults ? (
                        <div>
                          <p>Fitness Score: {optimizationResults.fitness_score?.toFixed(2) || 'N/A'}</p>
                          <p>Generations: {optimizationResults.generations || 'N/A'}</p>
                        </div>
                      ) : (
                        <p>No results available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-foreground mb-2">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                          <div className="p-4 bg-muted/50 rounded-lg border border-border/50-header">
                            <TrendingUp className="p-4 bg-muted/50 rounded-lg border border-border/50-icon" />
                            <span className="p-4 bg-muted/50 rounded-lg border border-border/50-title">Overall Score</span>
                          </div>
                          <span className="p-4 bg-muted/50 rounded-lg border border-border/50-value">
                            {optimizationResults.fitness_score?.toFixed(2) || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                          <div className="p-4 bg-muted/50 rounded-lg border border-border/50-header">
                            <Target className="p-4 bg-muted/50 rounded-lg border border-border/50-icon" />
                            <span className="p-4 bg-muted/50 rounded-lg border border-border/50-title">Generations</span>
                          </div>
                          <span className="p-4 bg-muted/50 rounded-lg border border-border/50-value">
                            {optimizationResults.generations || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                          <div className="p-4 bg-muted/50 rounded-lg border border-border/50-header">
                            <Building className="p-4 bg-muted/50 rounded-lg border border-border/50-icon" />
                            <span className="p-4 bg-muted/50 rounded-lg border border-border/50-title">Convergence</span>
                          </div>
                          <span className="p-4 bg-muted/50 rounded-lg border border-border/50-value">
                            {optimizationResults.convergence_info?.toFixed(2) || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-foreground mb-2">Zone Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="optimization-zoning-zone-stats">
                        {Object.entries(optimizationResults.zone_statistics || {}).map(([zone, stats]) => (
                          <div key={zone} className="optimization-zoning-zone-stat">
                            <div className="optimization-zoning-zone-stat-header">
                              <span className="optimization-zoning-zone-stat-label">
                                {zone.charAt(0).toUpperCase() + zone.slice(1)}
                              </span>
                              <Badge variant="outline">
                                {stats.percentage?.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="optimization-zoning-zone-stat-bar">
                              <div 
                                className="optimization-zoning-zone-stat-fill"
                                style={{ width: `${stats.percentage || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Zoning Map Visualization */}
                  <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]" style={{ gridColumn: '1 / -1' }}>
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-foreground mb-2">Zoning Map Visualization</CardTitle>
                      <CardDescription>Visual representation of optimized land use zones</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div style={{ height: '500px', width: '100%' }}>
                        {optimizationResults.assignments && optimizationResults.assignments.length > 0 ? (
                          <MapContainer
                            center={selectedPolygon?.geojson?.coordinates?.[0]?.[0]?.slice().reverse() || [33.6844, 73.0479]}
                            zoom={14}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            
                            {/* Draw original polygon boundary */}
                            {selectedPolygon?.geojson && (
                              <GeoJSON
                                data={selectedPolygon.geojson}
                                style={{
                                  color: '#000000',
                                  weight: 4,
                                  fillOpacity: 0,
                                  dashArray: '10, 10'
                                }}
                              />
                            )}

                            {/* Draw road network */}
                            {optimizationResults?.road_network?.road_network_geojson && (
                              <GeoJSON
                                data={optimizationResults.road_network.road_network_geojson}
                                style={(feature) => {
                                  const roadType = feature.properties.road_type;
                                  const roadStyles = {
                                    arterial: { color: '#E74C3C', weight: 6, opacity: 0.8 },
                                    collector: { color: '#F39C12', weight: 4, opacity: 0.7 },
                                    local: { color: '#3498DB', weight: 3, opacity: 0.6 },
                                    access: { color: '#95A5A6', weight: 2, opacity: 0.5 }
                                  };
                                  return roadStyles[roadType] || { color: '#95A5A6', weight: 2, opacity: 0.5 };
                                }}
                                onEachFeature={(feature, layer) => {
                                  const props = feature.properties;
                                  layer.bindPopup(`
                                    <div style="padding: 8px;">
                                      <strong style="color: #2C3E50; text-transform: uppercase;">
                                        ${props.road_type} Road
                                      </strong>
                                      <hr style="margin: 6px 0; border: 1px solid #BDC3C7;">
                                      <div style="font-size: 13px; line-height: 1.4;">
                                        <div><strong>Length:</strong> ${props.length?.toFixed(1) || 'N/A'} m</div>
                                        <div><strong>Width:</strong> ${props.width || 'N/A'} m</div>
                                        <div><strong>Avg Slope:</strong> ${props.avg_slope?.toFixed(1) || 'N/A'}°</div>
                                        <div><strong>Cost:</strong> ${props.cost?.toFixed(1) || 'N/A'}</div>
                                      </div>
                                    </div>
                                  `);
                                }}
                              />
                            )}
                            
                            {/* Draw non-overlapping grid-based zones */}
                            {(() => {
                              const colors = {
                                residential: '#FFB84D',      // Warm orange-gold
                                commercial: '#E74C3C',       // Strong red
                                industrial: '#3498DB',       // Professional blue
                                green_space: '#2ECC71',      // Vibrant green
                                mixed_use: '#9B59B6',        // Purple
                                conservation: '#27AE60'      // Forest green
                              };
                              
                              const zonePolygons = createZonePolygons(optimizationResults.assignments);
                              
                              return zonePolygons.map((zone, idx) => {
                                const zoneColor = colors[zone.landUse] || '#95A5A6';
                                const fitness = zone.avgFitness || 0.75;
                                const opacity = 0.6 + (fitness * 0.3); // Higher fitness = more opaque
                                
                                // Render individual cell squares for this zone
                                return zone.cell_polygons ? zone.cell_polygons.map((cellPolygon, cellIdx) => (
                                  <LeafletPolygon
                                    key={`zone-${idx}-cell-${cellIdx}`}
                                    positions={cellPolygon.map(coord => [coord[1], coord[0]])} // Convert lon,lat to lat,lon
                                    pathOptions={{
                                      color: '#2C3E50',      // Dark gray-blue border
                                      weight: 1,
                                      fillColor: zoneColor,
                                      fillOpacity: opacity,
                                      opacity: 0.8,
                                      lineJoin: 'round',
                                      lineCap: 'round'
                                    }}
                                    eventHandlers={{
                                      mouseover: (e) => {
                                        const layer = e.target;
                                        layer.setStyle({
                                          weight: 2,
                                          fillOpacity: Math.min(opacity + 0.2, 1),
                                          color: '#000000'
                                        });
                                      },
                                      mouseout: (e) => {
                                        const layer = e.target;
                                        layer.setStyle({
                                          weight: 1,
                                          fillOpacity: opacity,
                                          color: '#2C3E50'
                                        });
                                      }
                                    }}
                                  >
                                    <Popup maxWidth={300}>
                                      <div style={{ padding: '10px' }}>
                                        <strong style={{ 
                                          fontSize: '16px', 
                                          color: zoneColor,
                                          textTransform: 'uppercase',
                                          letterSpacing: '1px',
                                          display: 'block',
                                          marginBottom: '6px'
                                        }}>
                                          {zone.landUse?.replace('_', ' ')} ZONE
                                        </strong>
                                        <hr style={{ margin: '8px 0', border: `1px solid ${zoneColor}` }} />
                                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong>📏 Total Area:</strong>
                                            <span style={{ fontWeight: 'bold', color: zoneColor }}>
                                              {zone.area_hectares 
                                                ? `${zone.area_hectares.toFixed(2)} hectares`
                                                : zone.area_acres
                                                ? `${zone.area_acres.toFixed(2)} acres`
                                                : `${(zone.cellCount * 10000).toLocaleString()} m²`
                                              }
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong>📊 Cells:</strong>
                                            <span>{zone.cellCount}</span>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong>✨ Fitness:</strong>
                                            <span>{((zone.avgFitness || 0.75) * 100).toFixed(1)}%</span>
                                          </div>
                                        </div>
                                        <div style={{ 
                                          marginTop: '8px', 
                                          padding: '6px',
                                          backgroundColor: '#f8f9fa',
                                          borderRadius: '4px',
                                          fontSize: '12px', 
                                          color: '#6c757d',
                                          fontStyle: 'italic'
                                        }}>
                                          ✓ Non-overlapping grid subdivision
                                        </div>
                                      </div>
                                    </Popup>
                                  </LeafletPolygon>
                                )) : null;
                              }).flat().filter(Boolean);
                            })()}
                            
                            {/* Cell centers hidden - zones show complete coverage */}
                          </MapContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">No zoning data to display</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Enhanced Legend */}
                      <div className="mt-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-lg text-gray-800">🗺️ Zone & Road Legend</h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            AI-Optimized
                          </span>
                        </div>
                        
                        {/* Zone Types */}
                        <div className="mb-4">
                          <h5 className="font-semibold text-sm text-gray-700 mb-2">🏘️ Land Use Zones</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                              <div className="w-6 h-6 rounded-lg shadow-md" style={{backgroundColor: '#FFB84D'}}></div>
                              <span className="text-sm font-medium">Residential</span>
                            </div>
                          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                            <div className="w-6 h-6 rounded-lg shadow-md" style={{backgroundColor: '#E74C3C'}}></div>
                            <span className="text-sm font-medium">Commercial</span>
                          </div>
                          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                            <div className="w-6 h-6 rounded-lg shadow-md" style={{backgroundColor: '#3498DB'}}></div>
                            <span className="text-sm font-medium">Industrial</span>
                          </div>
                          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                            <div className="w-6 h-6 rounded-lg shadow-md" style={{backgroundColor: '#2ECC71'}}></div>
                            <span className="text-sm font-medium">Green Space</span>
                          </div>
                          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                            <div className="w-6 h-6 rounded-lg shadow-md" style={{backgroundColor: '#9B59B6'}}></div>
                            <span className="text-sm font-medium">Mixed Use</span>
                          </div>
                          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                            <div className="w-6 h-6 rounded-lg shadow-md" style={{backgroundColor: '#27AE60'}}></div>
                            <span className="text-sm font-medium">Conservation</span>
                          </div>
                        </div>
                        </div>
                        
                        {/* Road Types */}
                        {optimizationResults?.road_network && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-sm text-gray-700 mb-2">🛣️ Road Network</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                                <div className="w-8 h-1 rounded" style={{backgroundColor: '#E74C3C'}}></div>
                                <span className="text-sm font-medium">Arterial</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                                <div className="w-8 h-1 rounded" style={{backgroundColor: '#F39C12'}}></div>
                                <span className="text-sm font-medium">Collector</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                                <div className="w-8 h-1 rounded" style={{backgroundColor: '#3498DB'}}></div>
                                <span className="text-sm font-medium">Local</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                                <div className="w-8 h-1 rounded" style={{backgroundColor: '#95A5A6'}}></div>
                                <span className="text-sm font-medium">Access</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Optimization Info */}
                        <div className="mt-4 pt-3 border-t border-gray-300">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-0.5 bg-gray-700"></div>
                              <span className="text-gray-600">Zone Boundary</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-0.5 bg-gray-700" style={{backgroundImage: 'linear-gradient(to right, #000 50%, transparent 50%)', backgroundSize: '8px 1px'}}></div>
                              <span className="text-gray-600">Project Border</span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 italic">
                            💡 Hover over zones and roads for details • Opacity indicates terrain fitness
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="flex flex-col items-center justify-center py-12 text-center-icon" />
                    <p>Run optimization to view results</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground mb-2">Optimization History</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Previous optimization runs and their results
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]-content">
                {optimizationHistory.length > 0 ? (
                  <div className="optimization-zoning-history">
                    {optimizationHistory.map((result, index) => (
                      <div key={result.id || index} className="optimization-zoning-history-item">
                        <div className="optimization-zoning-history-header">
                          <div className="optimization-zoning-history-info">
                            <span className="optimization-zoning-history-title">
                              Optimization #{index + 1}
                            </span>
                            <span className="optimization-zoning-history-date">
                              {new Date(result.timestamp || Date.now()).toLocaleString()}
                            </span>
                          </div>
                          <Badge variant="outline">
                            Score: {result.fitness_score?.toFixed(2) || 'N/A'}
                          </Badge>
                        </div>
                        <div className="optimization-zoning-history-metrics">
                          <span>Generations: {result.generations || 'N/A'}</span>
                          <span>Convergence: {result.convergence_info?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setOptimizationResults(result)}
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="flex flex-col items-center justify-center py-12 text-center-icon" />
                    <p>No optimization history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isOptimizing && (
          <div className="optimization-zoning-progress-overlay">
            <Card className="optimization-zoning-progress-card">
              <CardContent className="optimization-zoning-progress-content">
                <div className="optimization-zoning-progress-header">
                  <RefreshCw className="optimization-zoning-progress-icon animate-spin" />
                  <h3>Optimizing Zoning...</h3>
                </div>
                <Progress value={optimizationProgress} className="optimization-zoning-progress-bar" />
                <p className="optimization-zoning-progress-text">
                  {optimizationProgress < 30 && 'Initializing optimization...'}
                  {optimizationProgress >= 30 && optimizationProgress < 60 && 'Running NSGA-II algorithm...'}
                  {optimizationProgress >= 60 && optimizationProgress < 90 && 'Evaluating solutions...'}
                  {optimizationProgress >= 90 && 'Finalizing results...'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default OptimizationZoning;