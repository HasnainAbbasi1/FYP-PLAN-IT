import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useProject } from '@/contexts/ProjectContext';
import { roadsApi } from '@/services/designApi';
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
import { Route, Plus, Edit, Trash2, Layers, MapPin, Zap, Download, Filter, Eye, EyeOff, RefreshCw, BarChart3, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = "http://localhost:8000";

const Roads = () => {
  const navigate = useNavigate();
  const { projects, currentProject, setCurrentProject } = useProject();
  const { toast } = useToast();
  const [roads, setRoads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [roadNetworkResult, setRoadNetworkResult] = useState(null);
  const [mapCenter, setMapCenter] = useState([33.6844, 73.0479]);
  const [mapZoom, setMapZoom] = useState(13);
  const [roadParams, setRoadParams] = useState({
    primaryWidth: 24,
    secondaryWidth: 18,
    localWidth: 12,
    maxBlockSize: 150,
    bikeLanes: true,
    sidewalks: true,
    medians: true,
    trees: true,
    gridPattern: false
  });
  const [roadVisibility, setRoadVisibility] = useState({
    primary: true,
    secondary: true,
    local: true,
    residential: true,
    pedestrian: true,
    bike: true,
    emergency: true
  });
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState('geojson');

  useEffect(() => {
    if (currentProject) {
      fetchRoads(currentProject.id);
      fetchPolygons(currentProject.id);
    } else {
      setRoads([]);
      setPolygons([]);
      setSelectedPolygon(null);
    }
  }, [currentProject]);

  // Calculate polygon area from GeoJSON (in square meters)
  const calculatePolygonArea = (polygon) => {
    if (!polygon?.geojson) return 0;
    try {
      const geom = polygon.geojson.geometry || polygon.geojson;
      if (!geom.coordinates || !geom.coordinates[0]) return 0;
      
      const coordinates = geom.coordinates[0];
      if (coordinates.length < 3) return 0;
      
      // Use geodesic area calculation for accurate results
      const R = 6371000; // Earth's radius in meters
      let area = 0;
      
      for (let i = 0; i < coordinates.length - 1; i++) {
        const [lon1, lat1] = coordinates[i];
        const [lon2, lat2] = coordinates[i + 1];
        
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        
        area += dLon * (2 + Math.sin(lat1Rad) + Math.sin(lat1Rad + dLat));
      }
      
      return Math.abs(area * R * R / 2);
    } catch (error) {
      console.error('Error calculating polygon area:', error);
      return 0;
    }
  };

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

  // Update map and load saved data when polygon changes
  useEffect(() => {
    if (selectedPolygon) {
      // Update map center from polygon bounds
      const center = calculatePolygonCenter(selectedPolygon);
      if (center) {
        setMapCenter(center);
        setMapZoom(15); // Zoom to polygon
      }
      
      // Load saved road network results for this polygon
      loadRoadNetworkForPolygon(selectedPolygon.id);
      
      // Load saved roads from database for this project
      if (currentProject) {
        fetchRoads(currentProject.id);
      }
    }
  }, [selectedPolygon, currentProject]);

  // Load road network results from Python backend for a specific polygon
  const loadRoadNetworkForPolygon = async (polygonId) => {
    if (!polygonId) return;
    
    try {
      // Try to get from Python backend results
      const response = await authenticatedFetch(`${API_BASE_URL}/api/road_network_results`);
      if (response.ok) {
        const data = await response.json();
        const roadNetworks = Array.isArray(data) ? data : (data.road_networks || []);
        const roadNetwork = roadNetworks.find(rn => rn.polygon_id === polygonId);
        
        if (roadNetwork && roadNetwork.road_network) {
          setRoadNetworkResult({
            success: true,
            polygon_id: polygonId,
            road_network: roadNetwork.road_network,
            traffic_analysis: roadNetwork.road_network.traffic_analysis,
            accessibility_analysis: roadNetwork.road_network.accessibility_analysis,
            network_statistics: roadNetwork.road_network.network_statistics,
            cost_analysis: roadNetwork.road_network.cost_analysis,
            environmental_analysis: roadNetwork.road_network.environmental_analysis,
            safety_analysis: roadNetwork.road_network.safety_analysis
          });
          
          // Convert to roads array for display
          const allRoads = [
            ...(roadNetwork.road_network.primary_roads?.features || []).map(f => ({
              ...f,
              type: 'Primary',
              length: f.properties?.length || 0
            })),
            ...(roadNetwork.road_network.secondary_roads?.features || []).map(f => ({
              ...f,
              type: 'Secondary',
              length: f.properties?.length || 0
            })),
            ...(roadNetwork.road_network.local_roads?.features || []).map(f => ({
              ...f,
              type: 'Local',
              length: f.properties?.length || 0
            })),
            ...(roadNetwork.road_network.residential_roads?.features || []).map(f => ({
              ...f,
              type: 'Residential',
              length: f.properties?.length || 0
            })),
            ...(roadNetwork.road_network.pedestrian_network?.features || []).map(f => ({
              ...f,
              type: 'Pedestrian',
              length: f.properties?.length || 0
            })),
            ...(roadNetwork.road_network.bike_network?.features || []).map(f => ({
              ...f,
              type: 'Bike',
              length: f.properties?.length || 0
            }))
          ];
          setRoads(allRoads);
          console.log(`Loaded ${allRoads.length} saved roads for polygon ${polygonId}`);
        }
      }
    } catch (error) {
      console.log('No saved road network found for polygon, will generate new one');
    }
  };

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
          // Keep the selected polygon - don't reset to avoid clearing results
          // Only update if geojson actually changed
          const hasChanged = JSON.stringify(stillExists.geojson) !== JSON.stringify(selectedPolygon.geojson);
          if (hasChanged) {
            setSelectedPolygon(stillExists);
          }
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
    }
  };

  // Poll for polygon updates (disabled during generation to avoid interference)
  useEffect(() => {
    if (!currentProject || isGenerating) return;
    
    const interval = setInterval(() => {
      fetchPolygons(currentProject.id);
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [currentProject, isGenerating]);

  const generateRoadNetwork = async () => {
    if (!selectedPolygon) {
      toast({
        title: 'Error',
        description: 'Please select a polygon first',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setIsGenerating(true);
    setGenerationProgress(10);
    try {
      // First, check if subdivision exists, if not, try to get it
      let parcelsData = null;
      setGenerationProgress(20);
      
      // Try to fetch existing subdivision results
      try {
        const subdivisionRes = await authenticatedFetch(`${API_BASE_URL}/api/subdivision_results`);
        if (subdivisionRes.ok) {
          const subdivisions = await subdivisionRes.json();
          const subdivision = Array.isArray(subdivisions) 
            ? subdivisions.find(s => s.polygon_id === selectedPolygon.id)
            : null;
          if (subdivision?.subdivision_result?.parcels) {
            parcelsData = subdivision.subdivision_result.parcels;
          }
        }
      } catch (e) {
        console.log('No existing subdivision found, will generate basic network');
      }

      // Calculate polygon area
      const polygonAreaSqm = calculatePolygonArea(selectedPolygon);
      const polygonAreaHectares = polygonAreaSqm / 10000;

      const payload = {
        polygon_id: selectedPolygon.id,
        polygon_geojson: selectedPolygon.geojson,  // Include geojson to help Python backend
        parcels: parcelsData,  // Include parcels if available
        design_parameters: {
          primary_road_width: roadParams.primaryWidth,
          secondary_road_width: roadParams.secondaryWidth,
          local_road_width: roadParams.localWidth,
          max_block_size: roadParams.maxBlockSize,
          bike_lanes: roadParams.bikeLanes,
          sidewalks: roadParams.sidewalks,
          medians: roadParams.medians,
          street_trees: roadParams.trees,
          grid_pattern: roadParams.gridPattern
        },
        polygon_area_sqm: polygonAreaSqm,
        polygon_area_hectares: polygonAreaHectares
      };

      setGenerationProgress(40);
      const response = await authenticatedFetch(`${API_BASE_URL}/api/road_network_design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setGenerationProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Road network design failed');
      }

      const result = await response.json();
      console.log('Road network result:', result);
      
      // Normalize the result structure - handle both nested and flat structures
      const normalizedResult = {
        success: result.success !== false,
        polygon_id: result.polygon_id,
        road_network: result.road_network || result,
        traffic_analysis: result.traffic_analysis || result.road_network?.traffic_analysis,
        accessibility_analysis: result.accessibility_analysis || result.road_network?.accessibility_analysis,
        network_statistics: result.network_statistics || result.road_network?.network_statistics,
        cost_analysis: result.cost_analysis || result.road_network?.cost_analysis,
        environmental_analysis: result.environmental_analysis || result.road_network?.environmental_analysis,
        safety_analysis: result.safety_analysis || result.road_network?.safety_analysis
      };
      
      // Set the normalized result
      setRoadNetworkResult(normalizedResult);

      if (result.success !== false && result.road_network) {
        // Convert road network to display format
        const allRoads = [
          ...(result.road_network?.primary_roads?.features || []).map(f => ({
            ...f, 
            type: 'Primary',
            length: f.properties?.length || 0
          })),
          ...(result.road_network?.secondary_roads?.features || []).map(f => ({
            ...f, 
            type: 'Secondary',
            length: f.properties?.length || 0
          })),
          ...(result.road_network?.local_roads?.features || []).map(f => ({
            ...f, 
            type: 'Local',
            length: f.properties?.length || 0
          })),
          ...(result.road_network?.residential_roads?.features || []).map(f => ({
            ...f, 
            type: 'Residential',
            length: f.properties?.length || 0
          })),
          ...(result.road_network?.pedestrian_network?.features || []).map(f => ({
            ...f, 
            type: 'Pedestrian',
            length: f.properties?.length || 0
          })),
          ...(result.road_network?.bike_network?.features || []).map(f => ({
            ...f, 
            type: 'Bike',
            length: f.properties?.length || 0
          }))
        ];
        setRoads(allRoads);
        
        console.log(`Generated ${allRoads.length} roads:`, {
          primary: allRoads.filter(r => r.type === 'Primary').length,
          secondary: allRoads.filter(r => r.type === 'Secondary').length,
          local: allRoads.filter(r => r.type === 'Local').length
        });

        setGenerationProgress(100);
        toast({
          title: 'Success',
          description: `Road network generated: ${allRoads.length} roads created`,
        });
        setTimeout(() => setGenerationProgress(0), 2000);
      } else if (result.error) {
        throw new Error(result.error || 'Road network design failed');
      } else {
        // Even if no explicit success, if we have road_network data, use it
        if (result.road_network) {
          const allRoads = [
            ...(result.road_network?.primary_roads?.features || []).map(f => ({...f, type: 'Primary', length: f.properties?.length || 0})),
            ...(result.road_network?.secondary_roads?.features || []).map(f => ({...f, type: 'Secondary', length: f.properties?.length || 0})),
            ...(result.road_network?.local_roads?.features || []).map(f => ({...f, type: 'Local', length: f.properties?.length || 0})),
            ...(result.road_network?.residential_roads?.features || []).map(f => ({...f, type: 'Residential', length: f.properties?.length || 0})),
            ...(result.road_network?.pedestrian_network?.features || []).map(f => ({...f, type: 'Pedestrian', length: f.properties?.length || 0})),
            ...(result.road_network?.bike_network?.features || []).map(f => ({...f, type: 'Bike', length: f.properties?.length || 0}))
          ];
          setRoads(allRoads);
          toast({
            title: 'Success',
            description: `Road network generated: ${allRoads.length} roads created`,
          });
        } else {
          throw new Error('Road network design failed - no road data returned');
        }
      }
    } catch (error) {
      console.error('Road network error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate road network. Make sure parcels are generated first.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoadStyle = (feature) => {
    const roadType = feature?.properties?.road_type || feature?.properties?.type || 'local';
    const algorithm = feature?.properties?.algorithm || 'Grid';
    
    // Color coding based on road type and algorithm
    // Primary roads (A*) = Red, Secondary roads (Dijkstra) = Blue
    const styleMap = {
      primary: { color: '#dc2626', weight: 6, opacity: 0.9 },      // Red - A* algorithm
      secondary: { color: '#2563eb', weight: 4, opacity: 0.8 },     // Blue - Dijkstra
      local: { color: '#16a34a', weight: 3, opacity: 0.7 },         // Green
      residential: { color: '#ca8a04', weight: 2, opacity: 0.6 },   // Yellow
      pedestrian: { color: '#9333ea', weight: 2, opacity: 0.5, dashArray: '5, 5' }, // Purple dashed
      bike: { color: '#0891b2', weight: 2, opacity: 0.6, dashArray: '10, 5' },      // Cyan dashed
      emergency: { color: '#ea580c', weight: 5, opacity: 0.8 }       // Orange
    };
    
    return styleMap[roadType] || { color: '#6b7280', weight: 2, opacity: 0.5 };
  };

  const onEachRoad = (feature, layer) => {
    const props = feature.properties;
    const algorithm = props.algorithm || 'Grid';
    const capacity = props.estimated_capacity || 0;
    const connectivity = props.connectivity_score || 0;
    
    const popupContent = `
      <div style="min-width: 220px;">
        <h4 style="margin: 0 0 8px 0; color: ${props.road_type === 'primary' ? '#dc2626' : props.road_type === 'secondary' ? '#2563eb' : '#16a34a'}">
          ${props.road_id || 'Road'}
        </h4>
        <p><strong>Type:</strong> ${props.road_type?.toUpperCase() || 'N/A'}</p>
        <p><strong>Algorithm:</strong> <span style="color: ${algorithm === 'A*' ? '#dc2626' : algorithm === 'Dijkstra' ? '#2563eb' : '#6b7280'}">${algorithm}</span></p>
        <p><strong>Width:</strong> ${props.width || 0} m</p>
        <p><strong>Length:</strong> ${props.length?.toFixed(2) || 0} m</p>
        ${capacity > 0 ? `<p><strong>Capacity:</strong> ${capacity.toLocaleString()} veh/hr</p>` : ''}
        ${connectivity > 0 ? `<p><strong>Connectivity:</strong> ${connectivity}%</p>` : ''}
      </div>
    `;
    layer.bindPopup(popupContent);
    
    // Add hover tooltip with algorithm info
    layer.bindTooltip(
      `${props.road_type?.toUpperCase()} - ${algorithm}`,
      { permanent: false, direction: 'top' }
    );
  };

  const fetchRoads = async (projectId) => {
    if (!projectId) return;
    try {
      setLoading(true);
      // Fetch roads from database
      const data = await roadsApi.getProjectRoads(projectId);
      const dbRoads = Array.isArray(data) ? data : [];
      
      // Convert database roads to display format
      const formattedRoads = dbRoads.map(road => ({
        type: 'Feature',
        properties: {
          road_id: road.name || `Road ${road.id}`,
          road_type: road.type?.toLowerCase() || 'local',
          width: road.width || 12,
          length: road.length || 0,
          algorithm: road.metadata?.algorithm || 'Grid',
          estimated_capacity: road.trafficFlow || 0,
          connectivity_score: 0
        },
        geometry: road.geometry
      }));
      
      // If we have saved roads from database, use them
      // Otherwise, keep the roads from Python backend results
      if (formattedRoads.length > 0 && !roadNetworkResult) {
        setRoads(formattedRoads);
        console.log(`Loaded ${formattedRoads.length} roads from database`);
      } else if (formattedRoads.length > 0) {
        // Merge with existing roads from Python backend
        setRoads(prev => [...prev, ...formattedRoads]);
      }
    } catch (error) {
      console.error('Error fetching roads:', error);
      // Don't show error toast - it's okay if no roads are saved yet
    } finally {
      setLoading(false);
    }
  };


  const handlePolygonChange = (polygonId) => {
    const polygon = polygons.find(p => p.id === parseInt(polygonId));
    if (polygon) {
      setSelectedPolygon(polygon);
      // Clear previous results
      setRoadNetworkResult(null);
      setRoads([]);
    }
  };

  const calculateStats = () => {
    // Calculate polygon area for accurate statistics
    const polygonAreaSqm = selectedPolygon ? calculatePolygonArea(selectedPolygon) : 0;
    const polygonAreaHectares = polygonAreaSqm / 10000;
    const polygonAreaKm2 = polygonAreaSqm / 1000000;
    
    // First try to use network_statistics from result (more accurate)
    if (roadNetworkResult?.network_statistics) {
      const ns = roadNetworkResult.network_statistics;
      const totalLengthKm = parseFloat(ns.total_road_length_km || 0);
      const roadDensity = polygonAreaKm2 > 0 ? (totalLengthKm / polygonAreaKm2).toFixed(2) : 0;
      
      // Calculate individual road type lengths from network stats or roads array
      const primaryLength = parseFloat(ns.primary_roads_length_km || 0);
      const secondaryLength = parseFloat(ns.secondary_roads_length_km || 0);
      const localLength = parseFloat(ns.local_roads_length_km || 0);
      
      return {
        totalLength: totalLengthKm.toFixed(2),
        primaryLength: primaryLength.toFixed(2),
        secondaryLength: secondaryLength.toFixed(2),
        localLength: localLength.toFixed(2),
        pedestrianLength: (ns.pedestrian_length_km || 0).toFixed(2),
        bikeLength: (ns.bike_length_km || 0).toFixed(2),
        roadDensity: roadDensity,
        averageBlockSize: (polygonAreaHectares / Math.max(ns.total_segments || 1, 1)).toFixed(2),
        polygonArea: polygonAreaHectares.toFixed(2)
      };
    }
    
    // Fallback to calculating from roads array
    if (roads.length === 0) {
      return {
        totalLength: 0,
        primaryLength: 0,
        secondaryLength: 0,
        localLength: 0,
        pedestrianLength: 0,
        bikeLength: 0,
        roadDensity: 0,
        averageBlockSize: 0
      };
    }

    const totalLength = roads.reduce((sum, road) => {
      const len = parseFloat(road.length) || parseFloat(road.properties?.length) || 0;
      return sum + len;
    }, 0);
    
    const primaryLength = roads.filter(r => r.type === 'Primary' || r.properties?.road_type === 'primary')
      .reduce((sum, road) => sum + (parseFloat(road.length) || parseFloat(road.properties?.length) || 0), 0);
    const secondaryLength = roads.filter(r => r.type === 'Secondary' || r.properties?.road_type === 'secondary')
      .reduce((sum, road) => sum + (parseFloat(road.length) || parseFloat(road.properties?.length) || 0), 0);
    const localLength = roads.filter(r => r.type === 'Local' || r.properties?.road_type === 'local')
      .reduce((sum, road) => sum + (parseFloat(road.length) || parseFloat(road.properties?.length) || 0), 0);
    const pedestrianLength = roads.filter(r => r.type === 'Pedestrian' || r.properties?.road_type === 'pedestrian')
      .reduce((sum, road) => sum + (parseFloat(road.length) || parseFloat(road.properties?.length) || 0), 0);
    const bikeLength = roads.filter(r => r.type === 'Bike' || r.properties?.road_type === 'bike')
      .reduce((sum, road) => sum + (parseFloat(road.length) || parseFloat(road.properties?.length) || 0), 0);

    // Use polygon area for accurate calculations (already calculated above)
    const roadDensity = polygonAreaKm2 > 0 ? (totalLength / 1000 / polygonAreaKm2).toFixed(2) : 0;
    const averageBlockSize = (polygonAreaHectares / Math.max(roads.length, 1)).toFixed(2);

    return {
      totalLength: (totalLength / 1000).toFixed(2), // Convert to km
      primaryLength: (primaryLength / 1000).toFixed(2),
      secondaryLength: (secondaryLength / 1000).toFixed(2),
      localLength: (localLength / 1000).toFixed(2),
      pedestrianLength: (pedestrianLength / 1000).toFixed(2),
      bikeLength: (bikeLength / 1000).toFixed(2),
      roadDensity: roadDensity,
      averageBlockSize: averageBlockSize,
      polygonArea: polygonAreaHectares.toFixed(2)
    };
  };

  const stats = calculateStats();
  const totalLength = parseFloat(stats.totalLength) || 0;
  const primaryPercent = totalLength > 0 ? ((parseFloat(stats.primaryLength) / totalLength) * 100).toFixed(0) : 0;
  const secondaryPercent = totalLength > 0 ? ((parseFloat(stats.secondaryLength) / totalLength) * 100).toFixed(0) : 0;
  const localPercent = totalLength > 0 ? ((parseFloat(stats.localLength) / totalLength) * 100).toFixed(0) : 0;
  const pedestrianPercent = totalLength > 0 ? ((parseFloat(stats.pedestrianLength) / totalLength) * 100).toFixed(0) : 0;

  const handleUpdateRoadNetwork = async () => {
    if (!currentProject) {
      toast({
        title: 'Error',
        description: 'Please select a project first',
        variant: 'destructive'
      });
      return;
    }

    try {
      // This would typically call an API to update road network based on parameters
      toast({
        title: 'Success',
        description: 'Road network parameters updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update road network',
        variant: 'destructive'
      });
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-6 animate-fade-in lg:p-4 sm:p-3">
        <div className="flex items-center justify-between mb-4 sm:flex-col sm:items-stretch sm:gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">Roads & Transport</h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">Design and analyze road networks for urban planning</p>
          </div>
          <div className="flex items-center gap-2">
            {currentProject && (
              <div className="px-3 py-2 bg-background border border-border rounded-md">
                Project: {currentProject.title || currentProject.name}
              </div>
            )}
            <Button 
              variant="outline" 
              className="font-medium"
              onClick={() => navigate('/parcels')}
            >
              <Layers className="w-4 h-4 mr-2" />
              Parcels
            </Button>
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
              onClick={generateRoadNetwork}
              disabled={loading || isGenerating || !selectedPolygon}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Road Network
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Interconnection Navigation */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/parcels')}
          >
            <Layers className="w-4 h-4 mr-2" />
            Land Subdivision
          </Button>
        </div>

        <Tabs defaultValue="network" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="network">Road Network</TabsTrigger>
            <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
            <TabsTrigger value="public">Public Transport</TabsTrigger>
            <TabsTrigger value="generate">Auto-Generate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="network" className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-[2fr_1fr]">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Road Network Map</CardTitle>
                  <CardDescription>
                    {roads.length} road{roads.length !== 1 ? 's' : ''} in this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px] w-full bg-muted flex items-center justify-center rounded-lg relative" style={{ height: '500px', width: '100%', position: 'relative' }}>
                    {/* Enhanced Algorithm Legend with Toggles */}
                    {roadNetworkResult?.road_network && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 1000,
                        background: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        fontSize: '12px',
                        minWidth: '220px',
                        maxWidth: '280px'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Road Network Legend</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportRoadNetwork('geojson')}
                            style={{ padding: '2px 6px', height: 'auto', fontSize: '10px' }}
                            title="Export as GeoJSON"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleRoadVisibility('primary')}>
                          <span style={{ display: 'inline-block', width: '20px', height: '4px', backgroundColor: roadVisibility.primary ? '#dc2626' : '#ccc', marginRight: '8px', verticalAlign: 'middle' }}></span>
                          <span style={{ flex: 1 }}>Primary (A*)</span>
                          {roadVisibility.primary ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </div>
                        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleRoadVisibility('secondary')}>
                          <span style={{ display: 'inline-block', width: '20px', height: '4px', backgroundColor: roadVisibility.secondary ? '#2563eb' : '#ccc', marginRight: '8px', verticalAlign: 'middle' }}></span>
                          <span style={{ flex: 1 }}>Secondary (Dijkstra)</span>
                          {roadVisibility.secondary ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </div>
                        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleRoadVisibility('local')}>
                          <span style={{ display: 'inline-block', width: '20px', height: '4px', backgroundColor: roadVisibility.local ? '#16a34a' : '#ccc', marginRight: '8px', verticalAlign: 'middle' }}></span>
                          <span style={{ flex: 1 }}>Local Roads</span>
                          {roadVisibility.local ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </div>
                        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleRoadVisibility('residential')}>
                          <span style={{ display: 'inline-block', width: '20px', height: '4px', backgroundColor: roadVisibility.residential ? '#ca8a04' : '#ccc', marginRight: '8px', verticalAlign: 'middle' }}></span>
                          <span style={{ flex: 1 }}>Residential</span>
                          {roadVisibility.residential ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </div>
                        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleRoadVisibility('pedestrian')}>
                          <span style={{ display: 'inline-block', width: '20px', height: '2px', backgroundColor: roadVisibility.pedestrian ? '#9333ea' : '#ccc', marginRight: '8px', verticalAlign: 'middle', borderTop: '2px dashed' }}></span>
                          <span style={{ flex: 1 }}>Pedestrian</span>
                          {roadVisibility.pedestrian ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </div>
                        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleRoadVisibility('bike')}>
                          <span style={{ display: 'inline-block', width: '20px', height: '2px', backgroundColor: roadVisibility.bike ? '#0891b2' : '#ccc', marginRight: '8px', verticalAlign: 'middle', borderTop: '2px dashed' }}></span>
                          <span style={{ flex: 1 }}>Bike Lanes</span>
                          {roadVisibility.bike ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </div>
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#6b7280' }}>
                          Click to toggle visibility
                        </div>
                      </div>
                    )}
                    
                    {/* Generation Progress Indicator */}
                    {isGenerating && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2000,
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                        minWidth: '300px',
                        textAlign: 'center'
                      }}>
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                        <h3 style={{ marginBottom: '12px', fontWeight: 'bold' }}>Generating Road Network</h3>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{
                            width: `${generationProgress}%`,
                            height: '100%',
                            backgroundColor: '#3b82f6',
                            transition: 'width 0.3s ease',
                            borderRadius: '4px'
                          }}></div>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>{generationProgress}% complete</p>
                      </div>
                    )}
                    
                    {selectedPolygon ? (
                      <MapContainer
                        key={`roads-map-${selectedPolygon.id}`}
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
                        {roadVisibility.primary && roadNetworkResult?.road_network?.primary_roads?.features && roadNetworkResult.road_network.primary_roads.features.length > 0 && (
                          <GeoJSON
                            key="primary-roads"
                            data={roadNetworkResult.road_network.primary_roads}
                            style={getRoadStyle}
                            onEachFeature={onEachRoad}
                          />
                        )}
                        {roadVisibility.secondary && roadNetworkResult?.road_network?.secondary_roads?.features && roadNetworkResult.road_network.secondary_roads.features.length > 0 && (
                          <GeoJSON
                            key="secondary-roads"
                            data={roadNetworkResult.road_network.secondary_roads}
                            style={getRoadStyle}
                            onEachFeature={onEachRoad}
                          />
                        )}
                        {roadVisibility.local && roadNetworkResult?.road_network?.local_roads?.features && roadNetworkResult.road_network.local_roads.features.length > 0 && (
                          <GeoJSON
                            key="local-roads"
                            data={roadNetworkResult.road_network.local_roads}
                            style={getRoadStyle}
                            onEachFeature={onEachRoad}
                          />
                        )}
                        {roadVisibility.residential && roadNetworkResult?.road_network?.residential_roads?.features && roadNetworkResult.road_network.residential_roads.features.length > 0 && (
                          <GeoJSON
                            key="residential-roads"
                            data={roadNetworkResult.road_network.residential_roads}
                            style={getRoadStyle}
                            onEachFeature={onEachRoad}
                          />
                        )}
                        {roadVisibility.pedestrian && roadNetworkResult?.road_network?.pedestrian_network?.features && roadNetworkResult.road_network.pedestrian_network.features.length > 0 && (
                          <GeoJSON
                            key="pedestrian-network"
                            data={roadNetworkResult.road_network.pedestrian_network}
                            style={getRoadStyle}
                            onEachFeature={onEachRoad}
                          />
                        )}
                        {roadVisibility.bike && roadNetworkResult?.road_network?.bike_network?.features && roadNetworkResult.road_network.bike_network.features.length > 0 && (
                          <GeoJSON
                            key="bike-network"
                            data={roadNetworkResult.road_network.bike_network}
                            style={getRoadStyle}
                            onEachFeature={onEachRoad}
                          />
                        )}
                        {roadVisibility.emergency && roadNetworkResult?.road_network?.emergency_routes?.features && roadNetworkResult.road_network.emergency_routes.features.length > 0 && (
                          <GeoJSON
                            key="emergency-routes"
                            data={roadNetworkResult.road_network.emergency_routes}
                            style={getRoadStyle}
                            onEachFeature={onEachRoad}
                          />
                        )}
                      </MapContainer>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '50px' }}>
                        <span className="text-muted-foreground">Select a polygon to generate road network</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Network Statistics</CardTitle>
                  <CardDescription>Road network metrics from pathfinding algorithms</CardDescription>
                </CardHeader>
                <CardContent>
                  {roadNetworkResult?.network_statistics ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Road Length</Label>
                        <p className="text-2xl font-bold">{parseFloat(roadNetworkResult.network_statistics.total_road_length_km || 0).toFixed(2)} km</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Pedestrian Network</Label>
                          <p className="text-lg font-semibold">{parseFloat(roadNetworkResult.network_statistics.pedestrian_length_km || 0).toFixed(2)} km</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Bike Network</Label>
                          <p className="text-lg font-semibold">{parseFloat(roadNetworkResult.network_statistics.bike_length_km || 0).toFixed(2)} km</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Segments</Label>
                        <p className="text-xl font-semibold">{roadNetworkResult.network_statistics.total_segments || 0}</p>
                      </div>
                      {roadNetworkResult.network_statistics.emergency_routes_km && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Emergency Routes</Label>
                          <p className="text-lg font-semibold">{parseFloat(roadNetworkResult.network_statistics.emergency_routes_km).toFixed(2)} km</p>
                        </div>
                      )}
                    </div>
                  ) : roadNetworkResult?.road_network ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Calculating statistics...</p>
                      <div>
                        <Label className="text-sm">Primary Roads (A*)</Label>
                        <p>{roadNetworkResult?.road_network?.primary_roads?.features?.length || 0}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Secondary Roads (Dijkstra)</Label>
                        <p>{roadNetworkResult?.road_network?.secondary_roads?.features?.length || 0}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Local Roads</Label>
                        <p>{roadNetworkResult?.road_network?.local_roads?.features?.length || 0}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Generate road network to see statistics</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Road Statistics</CardTitle>
                  <CardDescription>Key metrics and coverage analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Road Length</span>
                        <span className="font-medium">{stats.totalLength} km</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Road Density</span>
                        <span className="font-medium">{stats.roadDensity} km/km²</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Average Block Size</span>
                        <span className="font-medium">{stats.averageBlockSize} hectares</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Roads</span>
                        <span className="font-medium">{roads.length}</span>
                      </div>
                    </div>
                    
                    {totalLength > 0 && (
                      <div className="pt-2 flex flex-col gap-3">
                        <h4 className="text-sm font-medium mb-2">Road Type Distribution</h4>
                        <div className="flex flex-col gap-2">
                          {primaryPercent > 0 && (
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-xs">
                                <span>Primary Roads</span>
                                <span>{stats.primaryLength} km ({primaryPercent}%)</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full">
                                <div className="h-2 rounded-full bg-foreground" style={{ width: `${primaryPercent}%` }}></div>
                              </div>
                            </div>
                          )}
                          
                          {secondaryPercent > 0 && (
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-xs">
                                <span>Secondary Roads</span>
                                <span>{stats.secondaryLength} km ({secondaryPercent}%)</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full">
                                <div className="h-2 rounded-full bg-foreground/60" style={{ width: `${secondaryPercent}%` }}></div>
                              </div>
                            </div>
                          )}
                          
                          {localPercent > 0 && (
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-xs">
                                <span>Local Roads</span>
                                <span>{stats.localLength} km ({localPercent}%)</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full">
                                <div className="h-2 rounded-full bg-foreground/40" style={{ width: `${localPercent}%` }}></div>
                              </div>
                            </div>
                          )}
                          
                          {pedestrianPercent > 0 && (
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-xs">
                                <span>Pedestrian Paths</span>
                                <span>{stats.pedestrianLength} km ({pedestrianPercent}%)</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full">
                                <div className="h-2 rounded-full bg-foreground/30" style={{ width: `${pedestrianPercent}%` }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Road Design Parameters</CardTitle>
                <CardDescription>Adjust road network characteristics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Primary Road Width</Label>
                      <div className="flex items-center gap-2">
                        <Slider 
                          value={[roadParams.primaryWidth]} 
                          max={40} 
                          step={1} 
                          className="flex-1"
                          onValueChange={(value) => setRoadParams({...roadParams, primaryWidth: value[0]})}
                        />
                        <span className="text-sm font-medium w-12 text-right">{roadParams.primaryWidth} m</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label>Secondary Road Width</Label>
                      <div className="flex items-center gap-2">
                        <Slider 
                          value={[roadParams.secondaryWidth]} 
                          max={30} 
                          step={1} 
                          className="flex-1"
                          onValueChange={(value) => setRoadParams({...roadParams, secondaryWidth: value[0]})}
                        />
                        <span className="text-sm font-medium w-12 text-right">{roadParams.secondaryWidth} m</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label>Local Road Width</Label>
                      <div className="flex items-center gap-2">
                        <Slider 
                          value={[roadParams.localWidth]} 
                          max={20} 
                          step={1} 
                          className="flex-1"
                          onValueChange={(value) => setRoadParams({...roadParams, localWidth: value[0]})}
                        />
                        <span className="text-sm font-medium w-12 text-right">{roadParams.localWidth} m</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label>Maximum Block Size</Label>
                      <div className="flex items-center gap-2">
                        <Slider 
                          value={[roadParams.maxBlockSize]} 
                          max={300} 
                          step={10} 
                          className="flex-1"
                          onValueChange={(value) => setRoadParams({...roadParams, maxBlockSize: value[0]})}
                        />
                        <span className="text-sm font-medium w-12 text-right">{roadParams.maxBlockSize} m</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-3">Road Features</h4>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="bike-lanes" className="text-sm cursor-pointer">
                            Bike Lanes on Primary Roads
                          </Label>
                          <Switch 
                            id="bike-lanes" 
                            checked={roadParams.bikeLanes}
                            onCheckedChange={(checked) => setRoadParams({...roadParams, bikeLanes: checked})}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sidewalks" className="text-sm cursor-pointer">
                            Sidewalks on All Roads
                          </Label>
                          <Switch 
                            id="sidewalks" 
                            checked={roadParams.sidewalks}
                            onCheckedChange={(checked) => setRoadParams({...roadParams, sidewalks: checked})}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="medians" className="text-sm cursor-pointer">
                            Medians on Primary Roads
                          </Label>
                          <Switch 
                            id="medians" 
                            checked={roadParams.medians}
                            onCheckedChange={(checked) => setRoadParams({...roadParams, medians: checked})}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="trees" className="text-sm cursor-pointer">
                            Street Trees
                          </Label>
                          <Switch 
                            id="trees" 
                            checked={roadParams.trees}
                            onCheckedChange={(checked) => setRoadParams({...roadParams, trees: checked})}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="grid" className="text-sm cursor-pointer">
                            Grid Pattern Layout
                          </Label>
                          <Switch 
                            id="grid" 
                            checked={roadParams.gridPattern}
                            onCheckedChange={(checked) => setRoadParams({...roadParams, gridPattern: checked})}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 mt-auto">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold flex items-center justify-center gap-2 py-3 px-6 text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" onClick={handleUpdateRoadNetwork} disabled={isGenerating}>
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-5 h-5" />
                            Update Road Network
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Export and Actions Sidebar */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Export & Actions</CardTitle>
                <CardDescription>Download and manage road networks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roadNetworkResult?.road_network ? (
                    <>
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Export Format</Label>
                        <Select value={exportFormat} onValueChange={setExportFormat}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geojson">GeoJSON</SelectItem>
                            <SelectItem value="json">JSON (Full Data)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => exportRoadNetwork(exportFormat)}
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Road Network
                      </Button>
                      <div className="pt-4 border-t">
                        <Label className="text-sm font-semibold mb-2 block">Quick Stats</Label>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Roads:</span>
                            <span className="font-semibold">
                              {[
                                roadNetworkResult.road_network.primary_roads?.features?.length || 0,
                                roadNetworkResult.road_network.secondary_roads?.features?.length || 0,
                                roadNetworkResult.road_network.local_roads?.features?.length || 0,
                                roadNetworkResult.road_network.residential_roads?.features?.length || 0
                              ].reduce((a, b) => a + b, 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Length:</span>
                            <span className="font-semibold">
                              {roadNetworkResult.network_statistics?.total_road_length_km?.toFixed(2) || '0.00'} km
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-semibold text-green-600 flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Generated
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Generate a road network to enable export</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="traffic" className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Analysis</CardTitle>
                  <CardDescription>Traffic flow patterns and capacity analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {roadNetworkResult?.traffic_analysis ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Road Length</Label>
                        <p className="text-2xl font-bold">{roadNetworkResult.traffic_analysis.total_road_length_km || 0} km</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Estimated Capacity (veh/hr)</Label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Primary</p>
                            <p className="text-lg font-bold text-blue-600">{roadNetworkResult.traffic_analysis.estimated_capacity?.primary?.toLocaleString() || 0}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Secondary</p>
                            <p className="text-lg font-bold text-green-600">{roadNetworkResult.traffic_analysis.estimated_capacity?.secondary?.toLocaleString() || 0}</p>
                          </div>
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Local</p>
                            <p className="text-lg font-bold text-yellow-600">{roadNetworkResult.traffic_analysis.estimated_capacity?.local?.toLocaleString() || 0}</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Residential</p>
                            <p className="text-lg font-bold text-purple-600">{roadNetworkResult.traffic_analysis.estimated_capacity?.residential?.toLocaleString() || 0}</p>
                          </div>
                        </div>
                        {roadNetworkResult.traffic_analysis.estimated_capacity?.total && (
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <p className="text-xs text-muted-foreground">Total Capacity</p>
                            <p className="text-lg font-semibold">{roadNetworkResult.traffic_analysis.estimated_capacity.total.toLocaleString()} veh/hr</p>
                          </div>
                        )}
                      </div>
                      {roadNetworkResult.traffic_analysis.traffic_estimates && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Traffic Estimates</Label>
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Daily Traffic:</span>
                              <span className="font-semibold">{roadNetworkResult.traffic_analysis.traffic_estimates.daily_traffic?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Peak Hour:</span>
                              <span className="font-semibold">{roadNetworkResult.traffic_analysis.traffic_estimates.peak_hour_traffic?.toLocaleString() || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {roadNetworkResult.traffic_analysis.level_of_service && (
                        <div className="p-3 bg-indigo-50 rounded-lg">
                          <Label className="text-sm text-muted-foreground">Level of Service</Label>
                          <div className="mt-1">
                            <p className="text-2xl font-bold text-indigo-600">LOS {roadNetworkResult.traffic_analysis.level_of_service.grade}</p>
                            <p className="text-sm text-muted-foreground">{roadNetworkResult.traffic_analysis.level_of_service.description}</p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Intersections</Label>
                          <p className="text-xl font-semibold">{roadNetworkResult.traffic_analysis.intersections || 0}</p>
                        </div>
                        {roadNetworkResult.traffic_analysis.average_speed_kmh && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Avg Speed</Label>
                            <p className="text-xl font-semibold">{roadNetworkResult.traffic_analysis.average_speed_kmh} km/h</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[400px] bg-muted flex items-center justify-center rounded-lg">
                      <span className="text-muted-foreground">Generate road network to see traffic analysis</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Cost Analysis */}
              {roadNetworkResult?.cost_analysis && roadNetworkResult.cost_analysis.construction_costs && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Analysis</CardTitle>
                    <CardDescription>Construction and lifecycle costs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Construction Costs</Label>
                        <div className="mt-2 space-y-1 text-sm">
                          {roadNetworkResult.cost_analysis.construction_costs.primary_roads > 0 && (
                            <div className="flex justify-between">
                              <span>Primary:</span>
                              <span className="font-semibold">${(roadNetworkResult.cost_analysis.construction_costs.primary_roads / 1000000).toFixed(2)}M</span>
                            </div>
                          )}
                          {roadNetworkResult.cost_analysis.construction_costs.secondary_roads > 0 && (
                            <div className="flex justify-between">
                              <span>Secondary:</span>
                              <span className="font-semibold">${(roadNetworkResult.cost_analysis.construction_costs.secondary_roads / 1000000).toFixed(2)}M</span>
                            </div>
                          )}
                          {roadNetworkResult.cost_analysis.construction_costs.local_roads > 0 && (
                            <div className="flex justify-between">
                              <span>Local:</span>
                              <span className="font-semibold">${(roadNetworkResult.cost_analysis.construction_costs.local_roads / 1000000).toFixed(2)}M</span>
                            </div>
                          )}
                          <div className="pt-2 border-t flex justify-between font-bold">
                            <span>Total:</span>
                            <span className="text-lg">${(roadNetworkResult.cost_analysis.construction_costs.total / 1000000).toFixed(2)}M</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <Label className="text-sm text-muted-foreground">10-Year Lifecycle</Label>
                        <p className="text-2xl font-bold text-green-600">${(roadNetworkResult.cost_analysis.lifecycle_costs["10_year_total"] / 1000000).toFixed(2)}M</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Environmental Analysis */}
              {roadNetworkResult?.environmental_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Environmental Impact</CardTitle>
                    <CardDescription>Carbon footprint and sustainability</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {roadNetworkResult.environmental_analysis.impervious_surface && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Impervious Surface</Label>
                          <p className="text-2xl font-bold">{roadNetworkResult.environmental_analysis.impervious_surface.percentage || 0}%</p>
                        </div>
                      )}
                      {roadNetworkResult.environmental_analysis.carbon_footprint && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Carbon Footprint</Label>
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Construction:</span>
                              <span className="font-semibold">{roadNetworkResult.environmental_analysis.carbon_footprint.construction_co2_tons?.toLocaleString() || 0} tons CO₂</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Annual:</span>
                              <span className="font-semibold">{roadNetworkResult.environmental_analysis.carbon_footprint.annual_operational_co2_tons?.toLocaleString() || 0} tons CO₂</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {roadNetworkResult.environmental_analysis.environmental_score !== undefined && (
                        <div className="p-3 bg-indigo-50 rounded-lg">
                          <Label className="text-sm text-muted-foreground">Environmental Score</Label>
                          <p className="text-2xl font-bold text-indigo-600">{roadNetworkResult.environmental_analysis.environmental_score || 0}/100</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Safety Analysis */}
              {roadNetworkResult?.safety_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Safety Analysis</CardTitle>
                    <CardDescription>Road safety metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <Label className="text-sm text-muted-foreground">Safety Rating</Label>
                        <p className="text-2xl font-bold text-green-600">{roadNetworkResult.safety_analysis.safety_rating || 'N/A'}</p>
                        <p className="text-sm mt-1">Score: {roadNetworkResult.safety_analysis.safety_score || 0}/100</p>
                      </div>
                      {roadNetworkResult.safety_analysis.recommendations && Array.isArray(roadNetworkResult.safety_analysis.recommendations) && roadNetworkResult.safety_analysis.recommendations.length > 0 && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Recommendations</Label>
                          <ul className="mt-2 space-y-1 text-sm">
                            {roadNetworkResult.safety_analysis.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {roadNetworkResult?.accessibility_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Accessibility Analysis</CardTitle>
                    <CardDescription>Parcel access to road network</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Accessibility Score</Label>
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Overall Access</span>
                            <span className="text-lg font-bold">{roadNetworkResult.accessibility_analysis.accessibility_score || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                              className="bg-green-500 h-4 rounded-full transition-all"
                              style={{ width: `${Math.min(roadNetworkResult.accessibility_analysis.accessibility_score || 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Parcels with Access</p>
                          <p className="text-xl font-bold text-green-600">{roadNetworkResult.accessibility_analysis.parcels_with_access || 0}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Without Access</p>
                          <p className="text-xl font-bold text-red-600">{roadNetworkResult.accessibility_analysis.parcels_without_access || 0}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Average Distance to Road</Label>
                        <p className="text-xl font-semibold">{roadNetworkResult.accessibility_analysis.average_distance_to_road || 0} m</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Pathfinding Algorithm Visualization */}
            {roadNetworkResult?.road_network && (roadNetworkResult.road_network.primary_roads || roadNetworkResult.road_network.secondary_roads || roadNetworkResult.road_network.local_roads) && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Pathfinding Algorithm Metrics</CardTitle>
                  <CardDescription>Network connectivity and optimal path analysis (A* & Dijkstra)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Primary Roads (A*)</p>
                      <p className="text-2xl font-bold">{roadNetworkResult?.road_network?.primary_roads?.features?.length || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Optimal main arteries</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Secondary Roads (Dijkstra)</p>
                      <p className="text-2xl font-bold">{roadNetworkResult?.road_network?.secondary_roads?.features?.length || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Shortest path connections</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Network Connectivity</p>
                      <p className="text-2xl font-bold">
                        {roadNetworkResult?.network_statistics?.total_segments || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Total road segments</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Algorithm Information</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• A* algorithm used for primary road network (optimal pathfinding)</li>
                      <li>• Dijkstra's algorithm used for secondary connections (shortest paths)</li>
                      <li>• Network optimized for accessibility and traffic flow</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="public" className="mt-4 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Public Transport Network</CardTitle>
                <CardDescription>Plan and optimize public transportation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] bg-muted flex items-center justify-center rounded-lg">
                  <span className="text-muted-foreground">Public Transport Network Design</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="generate" className="mt-4 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Road Network</CardTitle>
                <CardDescription>Automatically generate optimal road layouts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
                  <div className="h-[300px] bg-muted flex items-center justify-center rounded-lg">
                    <span className="text-muted-foreground">Current Layout</span>
                  </div>
                  <div className="h-[300px] bg-muted flex items-center justify-center rounded-lg">
                    <span className="text-muted-foreground">AI-Generated Layout</span>
                  </div>
                </div>
                
                <div className="mt-6 relative">
                  <h3 className="font-medium mb-6 text-2xl text-white">Generation Parameters</h3>
                  <div className="grid grid-cols-1 gap-6 mb-8 relative md:grid-cols-2">
                    <div className="flex flex-col gap-3 relative z-20">
                      <Label>Layout Style</Label>
                      <Select defaultValue="grid">
                        <SelectTrigger className="w-full bg-background border-2 border-border text-foreground rounded-xl px-4 py-2.5 text-sm transition-all duration-300 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="Select layout style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grid">Grid Pattern</SelectItem>
                          <SelectItem value="radial">Radial Pattern</SelectItem>
                          <SelectItem value="organic">Organic Pattern</SelectItem>
                          <SelectItem value="hybrid">Hybrid Pattern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-3 relative z-20">
                      <Label>Optimization Goal</Label>
                      <Select defaultValue="balanced">
                        <SelectTrigger className="w-full bg-background border-2 border-border text-foreground rounded-xl px-4 py-2.5 text-sm transition-all duration-300 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="Select optimization goal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="traffic">Minimize Traffic Congestion</SelectItem>
                          <SelectItem value="accessibility">Maximize Accessibility</SelectItem>
                          <SelectItem value="balanced">Balanced Approach</SelectItem>
                          <SelectItem value="cost">Minimize Construction Cost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-3 relative z-20">
                      <Label>Road Density</Label>
                      <div className="flex items-center gap-2">
                        <Slider defaultValue={[60]} max={100} step={1} className="flex-1" />
                        <span className="text-sm font-medium w-12 text-right">60%</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 relative z-20">
                      <Label>Respect Terrain</Label>
                      <div className="flex items-center gap-2">
                        <Slider defaultValue={[70]} max={100} step={1} className="flex-1" />
                        <span className="text-sm font-medium w-12 text-right">70%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="py-3.5 px-7 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-500" onClick={() => setRoadNetworkResult(null)}>Reset</button>
                    <button 
                      className="py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none rounded-xl cursor-pointer" 
                      onClick={generateRoadNetwork}
                      disabled={loading || !selectedPolygon}
                    >
                      {loading ? 'Generating...' : 'Generate Road Network'}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Roads;
