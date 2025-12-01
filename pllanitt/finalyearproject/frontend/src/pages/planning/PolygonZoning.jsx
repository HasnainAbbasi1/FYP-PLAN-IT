import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, GeoJSON, Polygon } from 'react-leaflet';
import { Download, Settings, Zap, Map, Home, ShoppingBag, TreeDeciduous, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { authHelper, authenticatedFetch } from '@/utils/authHelper';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


const API_BASE_URL = "http://localhost:8000";
const PYTHON_API_URL = "http://localhost:5002";

const PolygonZoning = () => {
  const { user } = useAuth();
  const { currentProject, setCurrentProject } = useProject();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State management
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [zoningData, setZoningData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Area distribution parameters (40% residential, 30% commercial, 30% green)
  const [areaDistribution, setAreaDistribution] = useState({
    residential: 40,
    commercial: 30,
    green_space: 30
  });
  
  // Subdivision method
  const [method, setMethod] = useState('intelligent_clustering');
  
  // Map state
  const [mapCenter, setMapCenter] = useState([33.6844, 73.0479]); // Islamabad
  const [mapZoom, setMapZoom] = useState(13);
  
  // Image zoom state
  const [imageZoom, setImageZoom] = useState(100); // Percentage zoom (100% = original size)

  // Load data from navigation state if available
  useEffect(() => {
    const data = location.state;
    if (data?.polygonId) {
      // Find and select the polygon from navigation state
      const polygon = polygons.find(p => p.id === data.polygonId);
      if (polygon) {
        setSelectedPolygon(polygon);
        // Update map center to polygon location
        const center = calculateMapCenter(polygon);
        setMapCenter(center);
      }
    }
    
    // Check if project is passed from navigation
    if (data?.project) {
      setCurrentProject?.(data.project);
      fetchPolygonsByProject(data.project.id);
    }
  }, [location.state, polygons]);

  // Update map center when polygon is selected
  useEffect(() => {
    if (selectedPolygon) {
      const center = calculateMapCenter(selectedPolygon);
      setMapCenter(center);
    }
  }, [selectedPolygon]);

  // Fetch polygons when project changes
  useEffect(() => {
    if (currentProject) {
      fetchPolygonsByProject(currentProject.id);
      } else {
      setPolygons([]);
      setSelectedPolygon(null);
    }
  }, [currentProject]);

  const fetchPolygonsByProject = async (projectId) => {
    try {
      // Use project_id query parameter to filter polygons by project
      const url = `${API_BASE_URL}/api/polygon?project_id=${projectId}`;
      const res = await authenticatedFetch(url);
      if (!res.ok) throw new Error(`Failed to fetch polygons (${res.status})`);
      const polygons = await res.json();
      
      setPolygons(polygons);
      
      // Select the most recent polygon if none selected
      if (!selectedPolygon && polygons.length > 0) {
        setSelectedPolygon(polygons[polygons.length - 1]);
      }
      
      console.log(`Fetched ${polygons.length} polygons for project ${projectId}`);
    } catch (e) {
      console.error("Error fetching polygons by project:", e);
      setError(`Failed to fetch polygons for project: ${e.message}`);
    }
  };

  const generateZoning = async () => {
    if (!currentProject) {
      setError("Please select a project first. Zoning analysis requires a project to be selected.");
      return;
    }
    
    if (!selectedPolygon) {
      setError("Please select a polygon first");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // Convert percentages to decimals
      const distributionDecimal = {
        residential: areaDistribution.residential / 100,
        commercial: areaDistribution.commercial / 100,
        green_space: areaDistribution.green_space / 100
      };

      const payload = {
        polygon_id: selectedPolygon.id,
        polygon_geojson: selectedPolygon.geojson,
        area_distribution: distributionDecimal,
        method: method,
        project_id: currentProject.id
      };
      
      const response = await authenticatedFetch(`${API_BASE_URL}/api/polygon_zoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Polygon zoning failed');
      }
      
      const result = await response.json();
      setZoningData(result);
      
      console.log('Comprehensive zoning result:', result); // Debug log
      
      // Update map center based on polygon bounds
      if (result.zoning_result?.features?.length > 0) {
        const firstFeature = result.zoning_result.features[0];
        if (firstFeature.geometry?.coordinates?.[0]?.[0]) {
          const coords = firstFeature.geometry.coordinates[0][0];
          setMapCenter([coords[1], coords[0]]);
        }
      }
      
      // Update project progress when zoning is completed
      if (currentProject) {
        try {
          const currentProgress = currentProject.progress || 0;
          const newProgress = Math.min(currentProgress + 25, 100); // Increment by 25%
          
          await authenticatedFetch(`${API_BASE_URL}/api/projects/${currentProject.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              progress: newProgress
            })
          });
          console.log(`Project progress updated to ${newProgress}% after zoning`);
        } catch (statusErr) {
          console.error("Failed to update project progress:", statusErr);
        }
      }
      
    } catch (err) {
      console.error('Zoning generation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runIntelligentZoning = async () => {
    if (!currentProject) {
      setError("Please select a project first. Zoning analysis requires a project to be selected.");
      return;
    }
    
    if (!selectedPolygon) {
      setError("Please select a polygon first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log('Running intelligent zoning for polygon:', selectedPolygon.id);
      
      const response = await fetch(`${PYTHON_API_URL}/api/intelligent_zoning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          polygon_id: selectedPolygon.id,
          geojson: selectedPolygon.geojson,
          project_id: currentProject.id
        }),
      });

      const data = await response.json();
      console.log('Raw intelligent zoning response:', data);

      if (data.success) {
        // Convert the intelligent zoning result to match the expected format
        // Handle the new intelligent zoning response structure
        const intelligentResult = {
          success: true,
          message: "Intelligent zoning analysis completed",
          zoning_result: {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              properties: {
                zone_type: "Mixed Development", // Default zone type for Zameen.com style layout
                confidence: 0.85, // High confidence for terrain-based analysis
                recommendation: "Professional society layout with organized blocks, roads, and plots"
              },
              geometry: selectedPolygon.geojson.geometry
            }]
          },
          analysis: {
            ...data.analysis,
            visualization: data.analysis?.visualization // Ensure visualization data is preserved
          },
          intelligent_zoning: true
        };
        
        setZoningData(intelligentResult);
        console.log('Intelligent zoning completed:', intelligentResult);
        console.log('Image URL from backend:', data.analysis?.visualization?.image_url);
        console.log('Image path from backend:', data.analysis?.visualization?.image_path);
        console.log('Full analysis object:', data.analysis);
        console.log('Visualization object:', data.analysis?.visualization);
        console.log('Stored image URL in intelligentResult:', intelligentResult.analysis?.visualization?.image_url);
        
        // Update map center based on polygon bounds
        if (selectedPolygon.geojson?.geometry?.coordinates?.[0]?.[0]) {
          const coords = selectedPolygon.geojson.geometry.coordinates[0][0];
          setMapCenter([coords[1], coords[0]]);
        }
        
        // Update project progress when intelligent zoning is completed
        if (currentProject) {
          try {
            const currentProgress = currentProject.progress || 0;
            const newProgress = Math.min(currentProgress + 30, 100); // Increment by 30% for AI zoning
            
            await authenticatedFetch(`${API_BASE_URL}/api/projects/${currentProject.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                progress: newProgress
              })
            });
            console.log(`Project progress updated to ${newProgress}% after intelligent zoning`);
          } catch (statusErr) {
            console.error("Failed to update project progress:", statusErr);
          }
        }
      } else {
        setError(data.error || 'Intelligent zoning analysis failed');
      }
    } catch (error) {
      console.error('Intelligent zoning analysis error:', error);
      setError('Failed to run intelligent zoning analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportZoning = async (format = 'geojson') => {
    if (!zoningData?.download_url) return;
    
    try {
      const response = await fetch(zoningData.download_url);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polygon_zoning_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getZoneColor = (zoneType) => {
    const colors = {
      residential: "#4A90E2",    // Blue
      commercial: "#9013FE",     // Purple
      green_space: "#4CAF50",    // Green
      industrial: "#FF9800",     // Orange
      mixed_use: "#E91E63",      // Pink
    };
    return colors[zoneType] || "#757575";
  };

  const getZoneIcon = (zoneType) => {
    switch (zoneType) {
      case 'residential': return Home;
      case 'commercial': return ShoppingBag;
      case 'green_space': return TreeDeciduous;
      default: return Map;
    }
  };

  // Map styling functions
  const getZoneStyle = (feature) => {
    const zoneType = feature.properties.zone_type;
    return {
      fillColor: getZoneColor(zoneType),
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const popupContent = `
      <div style="min-width: 200px;">
        <h4 style="margin: 0 0 8px 0; color: ${getZoneColor(props.zone_type)};">
          ${props.zone_type ? props.zone_type.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
        </h4>
        <p><strong>Area:</strong> ${props.area_hectares} ha</p>
        <p><strong>Area (m²):</strong> ${props.area_sqm.toLocaleString()} m²</p>
        <p><strong>Percentage:</strong> ${props.percentage}%</p>
        <p><strong>Target:</strong> ${props.target_percentage}%</p>
        <p><strong>Description:</strong> ${props.description}</p>
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  // Calculate map center from polygon bounds
  const calculateMapCenter = (polygon) => {
    if (!polygon || !polygon.geojson || !polygon.geojson.geometry) {
      return [33.6844, 73.0479]; // Default to Islamabad
    }

    const coordinates = polygon.geojson.geometry.coordinates[0];
    if (!coordinates || coordinates.length === 0) {
      return [33.6844, 73.0479];
    }

    // Calculate center from polygon coordinates
    let latSum = 0, lngSum = 0;
    coordinates.forEach(coord => {
      lngSum += coord[0];
      latSum += coord[1];
    });

    return [latSum / coordinates.length, lngSum / coordinates.length];
  };


  const handleDistributionChange = (zoneType, value) => {
    const newDistribution = { ...areaDistribution };
    const oldValue = newDistribution[zoneType];
    const difference = value - oldValue;
    
    // Update the changed zone
    newDistribution[zoneType] = value;
    
    // Distribute the difference among other zones proportionally
    const otherZones = Object.keys(newDistribution).filter(z => z !== zoneType);
    const totalOther = otherZones.reduce((sum, z) => sum + newDistribution[z], 0);
    
    if (totalOther > 0) {
      otherZones.forEach(zone => {
        const proportion = newDistribution[zone] / totalOther;
        newDistribution[zone] = Math.max(0, newDistribution[zone] - (difference * proportion));
      });
    }
    
    // Ensure total is 100%
    const total = Object.values(newDistribution).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      const adjustment = (100 - total) / otherZones.length;
      otherZones.forEach(zone => {
        newDistribution[zone] = Math.max(0, newDistribution[zone] + adjustment);
      });
    }
    
    setAreaDistribution(newDistribution);
  };

  return (
    <MainLayout>
      <div className="zoning-container">
        <div className="zoning-header">
          <div>
            <h1 className="zoning-title">Polygon-Based Zoning</h1>
            <p className="zoning-subtitle">Intelligent subdivision with area-based distribution</p>
          </div>
          <div className="zoning-actions">
            {zoningData && (
              <Button variant="outline" onClick={() => exportZoning('geojson')}>
                <Download className="w-4 h-4 mr-2" />
                Export GeoJSON
              </Button>
            )}
          </div>
        </div>

        {/* Current Project Overview */}
          <Card className="mb-6">
            <CardHeader>
            <CardTitle>Current Project</CardTitle>
            <CardDescription>
              {currentProject
                ? `Showing polygons for "${currentProject.title}". Change the project from the Projects page.`
                : "Select a project from the Projects page to enable zoning tools."}
            </CardDescription>
            </CardHeader>
            <CardContent>
            {currentProject ? (
              <div className="current-project-info">
                <p className="text-sm text-gray-600 mb-2">Working on: {currentProject.title}</p>
                <div className="p-4 border rounded-lg bg-gray-50 text-sm leading-relaxed">
                  <div className="mb-2">
                    <span className="font-semibold">✅ Selected Project:</span> {currentProject.title}
                    </div>
                  <div className="mb-1">
                    <span className="font-semibold">Location:</span> {currentProject.location || 'Not specified'}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Status:</span> {currentProject.status || 'In Progress'}
                  </div>
                  <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                    📌 Showing only polygons for this project. To switch projects, return to the Projects page.
              </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 space-y-3">
                <div>⚠️ No project selected. Go to the Projects page to choose a project before running zoning analysis.</div>
                <Button size="sm" variant="outline" onClick={() => navigate('/projects')}>
                  Go to Projects
                </Button>
              </div>
            )}
            </CardContent>
          </Card>

        {/* Polygon Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Polygon</CardTitle>
            <CardDescription>
              {currentProject
                ? `Choose a polygon from project "${currentProject.title}".`
                : "Select a project first to view its polygons."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!currentProject ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                ⚠️ Select a project to load polygons for zoning.
              </div>
            ) : polygons.length > 0 ? (
              <div className="polygon-selector-container">
                <Select
                  value={selectedPolygon?.id?.toString() || ""}
                  onValueChange={(value) => {
                    const poly = polygons.find((p) => p.id === parseInt(value));
                    setSelectedPolygon(poly);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a polygon" />
                  </SelectTrigger>
                  <SelectContent className="polygon-selection">
                    {polygons.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name || `Polygon ${p.id}`}
                        {p.project_id && ` (Project: ${p.project_id})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPolygon && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {selectedPolygon.name || `Polygon ${selectedPolygon.id}`}
                    {selectedPolygon.project_id && (
                      <div className="mt-1 text-xs text-blue-600">
                        Associated with Project ID: {selectedPolygon.project_id}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="no-polygons">
                <p>
                  {currentProject 
                    ? `No polygons found for project "${currentProject.title}". Please create a polygon in the Data Ingestion page first.`
                    : "No polygons found. Please create a polygon in the Data Ingestion page first."
                  }
                </p>
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/data-ingestion')}
                    className="text-blue-600 hover:underline"
                  >
                    Go to Data Ingestion
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Zoning Configuration</CardTitle>
            <CardDescription>Configure zoning analysis settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="subdivision-params">
              {/* Generate Buttons */}
              <div className="subdivision-actions space-y-3">
                <Button 
                  onClick={runIntelligentZoning} 
                  disabled={loading || !selectedPolygon}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {loading ? 'Analyzing...' : '🧠 AI Intelligent Zoning'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="error-card mb-6">
            <CardContent>
              <p className="error-text">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {zoningData && (
          <div className="zoning-results">
            {/* Intelligent Zoning Analysis Results */}
            {zoningData.intelligent_zoning && zoningData.analysis && (
              <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Zap className="w-5 h-5" />
                    🧠 AI Intelligent Zoning Analysis
                  </CardTitle>
                  <CardDescription>
                    ML-powered zoning recommendations based on terrain analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Recommendation */}
                    <div className="primary-recommendation">
                      <h4 className="font-semibold mb-3 text-lg">Primary Zone Recommendation</h4>
                      <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                          style={{ 
                            backgroundColor: zoningData.analysis.zone_recommendations?.primary_zone === 'residential' ? '#FFE4B5' :
                                           zoningData.analysis.zone_recommendations?.primary_zone === 'commercial' ? '#FFD700' :
                                           zoningData.analysis.zone_recommendations?.primary_zone === 'green' ? '#32CD32' :
                                           zoningData.analysis.zone_recommendations?.primary_zone === 'mixed_use' ? '#DDA0DD' : '#228B22'
                          }}
                        >
                          {zoningData.analysis.zone_recommendations?.primary_zone === 'residential' ? '🏠' :
                           zoningData.analysis.zone_recommendations?.primary_zone === 'commercial' ? '🏪' :
                           zoningData.analysis.zone_recommendations?.primary_zone === 'green' ? '🌳' :
                           zoningData.analysis.zone_recommendations?.primary_zone === 'mixed_use' ? '🏢' : '🛡️'}
                        </div>
                        <div>
                          <div className="font-semibold text-lg capitalize">
                            {zoningData.analysis.zone_recommendations?.primary_zone?.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-600">
                            Confidence: {Math.round((zoningData.analysis.zone_recommendations?.confidence || 0) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Zone Breakdown */}
                    <div className="zone-breakdown">
                      <h4 className="font-semibold mb-3 text-lg">Zone Probability Distribution</h4>
                      <div className="space-y-2">
                        {Object.entries(zoningData.analysis.zone_recommendations?.zone_breakdown || {}).map(([zone, probability]) => (
                          <div key={zone} className="flex items-center justify-between p-2 bg-white rounded">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ 
                                  backgroundColor: zone === 'residential' ? '#FFE4B5' :
                                                 zone === 'commercial' ? '#FFD700' :
                                                 zone === 'green' ? '#32CD32' :
                                                 zone === 'mixed_use' ? '#DDA0DD' : '#228B22'
                                }}
                              />
                              <span className="capitalize text-sm">{zone.replace('_', ' ')}</span>
                            </div>
                            <span className="font-semibold text-sm">{Math.round(probability * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Text */}
                  <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
                    <h4 className="font-semibold mb-2">AI Recommendation</h4>
                    <p className="text-gray-700">{zoningData.analysis.zone_recommendations?.recommendation}</p>
                  </div>

                  {/* Terrain Analysis Summary */}
                  {zoningData.analysis.terrain_summary && (
                    <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
                      <h4 className="font-semibold mb-3">Terrain Analysis Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(zoningData.analysis.terrain_summary).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {typeof value === 'number'
                                ? Math.round(value)
                                : typeof value === 'string'
                                  ? value
                                  : value != null
                                    ? JSON.stringify(value)
                                    : '-'}
                              {key.includes('elevation') ? 'm' : key.includes('slope') ? '°' : key.includes('risk') ? '%' : ''}
                            </div>
                            <div className="text-xs text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="results-grid">
              {/* 2D Zoning Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>2D Zoning Visualization</CardTitle>
                  <CardDescription>
                    {zoningData?.analysis?.zone_recommendations?.primary_zone 
                      ? `${zoningData.analysis.zone_recommendations.primary_zone.replace('_', ' ')} Zone (${Math.round((zoningData.analysis.zone_recommendations.confidence || 0) * 100)}% confidence)`
                      : "Intelligent zoning based on terrain analysis"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    console.log('Checking for image URL in render:', zoningData?.analysis?.visualization?.image_url);
                    console.log('Full zoningData:', zoningData);
                    return zoningData?.analysis?.visualization?.image_url;
                  }) ? (
                    <div className="zoning-image-container" style={{ textAlign: 'center', position: 'relative' }}>
                      {/* Zoom Controls */}
                      <div style={{ 
                        position: 'absolute', 
                        top: '10px', 
                        right: '10px', 
                        zIndex: 10,
                        display: 'flex',
                        gap: '8px',
                        background: 'white',
                        padding: '8px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImageZoom(prev => Math.min(prev + 25, 500))}
                          title="Zoom In"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImageZoom(prev => Math.max(prev - 25, 25))}
                          title="Zoom Out"
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImageZoom(100)}
                          title="Reset to 100%"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <span style={{ 
                          padding: '0 8px', 
                          display: 'flex', 
                          alignItems: 'center',
                          fontSize: '14px',
                          fontWeight: '500',
                          minWidth: '60px',
                          justifyContent: 'center'
                        }}>
                          {imageZoom}%
                        </span>
                      </div>
                      
                      <div style={{ 
                        overflow: 'auto',
                        maxHeight: '90vh',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        background: '#f9fafb'
                      }}>
                        <img
                          key={zoningData.analysis.visualization.image_url}
                          src={(() => {
                            const originalUrl = zoningData.analysis.visualization.image_url;
                            const finalUrl = originalUrl.startsWith('http') 
                              ? originalUrl 
                              : `http://localhost:5002${originalUrl}`;
                            const urlWithCacheBust = `${finalUrl}?t=${Date.now()}&r=${Math.random()}`;
                            
                            console.log('🖼️ IMAGE URL DEBUG:');
                            console.log('  Original URL:', originalUrl);
                            console.log('  Final URL:', finalUrl);
                            console.log('  URL with cache bust:', urlWithCacheBust);
                            console.log('  Debug info:', zoningData.analysis.visualization.debug_info);
                            console.log('  Test URL:', zoningData.analysis.visualization.test_url);
                            
                            return urlWithCacheBust;
                          })()}
                          alt="2D Zoning Visualization"
                          style={{
                            width: `${imageZoom}%`,
                            height: 'auto',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto',
                            transition: 'width 0.2s ease-in-out'
                          }}
                          onError={(e) => {
                            console.error('IMAGE LOAD ERROR:', e);
                            console.error('Failed URL:', e.target.src);
                            console.error('Original URL:', zoningData.analysis.visualization.image_url);
                            console.error('Debug info:', zoningData.analysis.visualization.debug_info);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                          onLoad={(e) => {
                            console.log('2D Zoning image loaded successfully');
                            console.log('Image URL:', zoningData.analysis.visualization.image_url);
                            console.log('Final URL:', e.target.src);
                          }}
                        />
                      </div>
                      <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', background: '#f9fafb', borderRadius: '8px' }}>
                        <Map className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-gray-500">2D visualization not available</p>
                      </div>
                    </div>
                  ) : (
                    <div className="no-polygon-selected">
                      <div className="text-center py-8">
                        <Map className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">Run zoning analysis to see 2D visualization</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Select a polygon and click "Generate Zoning" to see the 2D layout.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detailed Polygon Information */}
              {selectedPolygon && (
                <Card>
                  <CardHeader>
                    <CardTitle>Polygon Details</CardTitle>
                    <CardDescription>Comprehensive information about the selected polygon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="polygon-details-comprehensive">
                      {/* Basic Information */}
                      <div className="detail-section">
                        <h4 className="section-title">📍 Basic Information</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Name:</span>
                            <span className="detail-value">{selectedPolygon.name || `Polygon ${selectedPolygon.id}`}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">ID:</span>
                            <span className="detail-value">{selectedPolygon.id}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Created:</span>
                            <span className="detail-value">{new Date(selectedPolygon.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Updated:</span>
                            <span className="detail-value">{new Date(selectedPolygon.updated_at).toLocaleDateString()}</span>
                          </div>
                          {selectedPolygon.project_id && (
                            <div className="detail-item">
                              <span className="detail-label">Project ID:</span>
                              <span className="detail-value">{selectedPolygon.project_id}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Geographic Information */}
                      <div className="detail-section">
                        <h4 className="section-title">🗺️ Geographic Information</h4>
                        <div className="detail-grid">
                          {selectedPolygon.geojson && (
                            <>
                              <div className="detail-item">
                                <span className="detail-label">Type:</span>
                                <span className="detail-value">{selectedPolygon.geojson.type || 'Feature'}</span>
                              </div>
                              {selectedPolygon.geojson.geometry && (
                                <div className="detail-item">
                                  <span className="detail-label">Geometry Type:</span>
                                  <span className="detail-value">{selectedPolygon.geojson.geometry.type}</span>
                                </div>
                              )}
                              {selectedPolygon.geojson.properties && (
                                <div className="detail-item">
                                  <span className="detail-label">Properties:</span>
                                  <span className="detail-value">{Object.keys(selectedPolygon.geojson.properties).length} properties</span>
                                </div>
                              )}
                              {selectedPolygon.geojson.geometry && selectedPolygon.geojson.geometry.coordinates && (
                                <div className="detail-item">
                                  <span className="detail-label">Coordinates:</span>
                                  <span className="detail-value">{selectedPolygon.geojson.geometry.coordinates[0].length} points</span>
                                </div>
                              )}
                            </>
                          )}
                          {selectedPolygon.target_crs && (
                            <div className="detail-item">
                              <span className="detail-label">Coordinate System:</span>
                              <span className="detail-value">{selectedPolygon.target_crs}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Analysis Parameters */}
                      <div className="detail-section">
                        <h4 className="section-title">📊 Analysis Parameters</h4>
                        <div className="detail-grid">
                          {selectedPolygon.data_types && (
                            <div className="detail-item">
                              <span className="detail-label">Data Types:</span>
                              <span className="detail-value">{selectedPolygon.data_types.join(', ')}</span>
                            </div>
                          )}
                          {selectedPolygon.preprocessing && (
                            <div className="detail-item">
                              <span className="detail-label">Preprocessing Options:</span>
                              <span className="detail-value">{Object.keys(selectedPolygon.preprocessing).length} options</span>
                            </div>
                          )}
                          {selectedPolygon.metadata && (
                            <div className="detail-item">
                              <span className="detail-label">Metadata:</span>
                              <span className="detail-value">{Object.keys(selectedPolygon.metadata).length} entries</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Preprocessing Details */}
                      {selectedPolygon.preprocessing && (
                        <div className="detail-section">
                          <h4 className="section-title">🔧 Preprocessing Details</h4>
                          <div className="detail-grid">
                            {Object.entries(selectedPolygon.preprocessing).map(([key, value]) => (
                              <div key={key} className="detail-item">
                                <span className="detail-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                                <span className="detail-value">
                                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                                   typeof value === 'object' ? JSON.stringify(value) : 
                                   value || 'N/A'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata Details */}
                      {selectedPolygon.metadata && (
                        <div className="detail-section">
                          <h4 className="section-title">📋 Metadata</h4>
                          <div className="detail-grid">
                            {Object.entries(selectedPolygon.metadata).map(([key, value]) => (
                              <div key={key} className="detail-item">
                                <span className="detail-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                                <span className="detail-value">
                                  {typeof value === 'object' ? JSON.stringify(value) : value || 'N/A'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* GeoJSON Preview */}
                      {selectedPolygon.geojson && (
                        <div className="detail-section">
                          <h4 className="section-title">🔍 GeoJSON Preview</h4>
                          <div className="geojson-preview">
                            <pre className="geojson-code">
                              {JSON.stringify(selectedPolygon.geojson, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Zone Summary</CardTitle>
                  <CardDescription>Area distribution and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="zone-summary">
                    {/* Original Polygon Information */}
                    {zoningData.original_polygon && (
                      <div className="original-polygon-section mb-6">
                        <h4 className="font-semibold mb-3 text-blue-600">📍 Original Polygon Details</h4>
                        <div className="polygon-metrics grid grid-cols-2 gap-4">
                          <div className="metric-card p-3 bg-blue-50 rounded-lg">
                            <div className="metric-label text-sm text-gray-600">Total Area</div>
                            <div className="metric-value font-bold text-lg">
                              {zoningData.original_polygon.area_hectares?.toFixed(2)} hectares
                            </div>
                            <div className="metric-sub text-sm text-gray-500">
                              ({zoningData.original_polygon.area_acres?.toFixed(2)} acres)
                            </div>
                          </div>
                          <div className="metric-card p-3 bg-blue-50 rounded-lg">
                            <div className="metric-label text-sm text-gray-600">Area (sq meters)</div>
                            <div className="metric-value font-bold text-lg">
                              {zoningData.original_polygon.area_sqm?.toLocaleString()} m²
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Area Metrics */}
                    {zoningData.area_metrics && (
                      <div className="area-metrics-section mb-6">
                        <h4 className="font-semibold mb-3 text-green-600">📊 Area Analysis</h4>
                        <div className="metrics-grid grid grid-cols-3 gap-4">
                          <div className="metric-card p-3 bg-green-50 rounded-lg text-center">
                            <div className="metric-title text-sm text-gray-600">Coverage Efficiency</div>
                            <div className="metric-big-value text-2xl font-bold text-green-700">
                              {zoningData.area_metrics.coverage_percentage}%
                            </div>
                          </div>
                          <div className="metric-card p-3 bg-green-50 rounded-lg text-center">
                            <div className="metric-title text-sm text-gray-600">Area Utilization</div>
                            <div className="metric-big-value text-2xl font-bold text-green-700">
                              {zoningData.area_metrics.area_utilization}%
                            </div>
                          </div>
                          <div className="metric-card p-3 bg-green-50 rounded-lg text-center">
                            <div className="metric-title text-sm text-gray-600">Total Zoned Area</div>
                            <div className="metric-big-value text-2xl font-bold text-green-700">
                              {zoningData.area_metrics.total_zoned_area_hectares} ha
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Compliance Analysis */}
                    {zoningData.compliance && (
                      <div className="compliance-section mb-6">
                        <h4 className="font-semibold mb-3 text-purple-600">✅ Compliance Analysis</h4>
                        <div className="compliance-overview p-4 rounded-lg" style={{
                          backgroundColor: zoningData.compliance.overall_compliant ? '#f0f9ff' : '#fef3c7'
                        }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                              {zoningData.compliance.overall_compliant ? '✅' : '⚠️'}
                            </span>
                            <span className="font-semibold">
                              {zoningData.compliance.overall_compliant 
                                ? 'All zones within compliance' 
                                : 'Some zones exceed deviation threshold'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Deviation threshold: ±{zoningData.compliance.compliance_threshold}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Planning Insights */}
                    {zoningData.planning_insights && (
                      <div className="planning-insights-section mb-6">
                        <h4 className="font-semibold mb-3 text-orange-600">💡 Planning Insights</h4>
                        <div className="insights-grid grid grid-cols-2 gap-4">
                          <div className="insight-item p-3 bg-orange-50 rounded-lg">
                            <div className="insight-label text-sm text-gray-600">Dominant Zone</div>
                            <div className="insight-value font-semibold">{zoningData.planning_insights.dominant_zone}</div>
                          </div>
                          <div className="insight-item p-3 bg-orange-50 rounded-lg">
                            <div className="insight-label text-sm text-gray-600">Zone Diversity</div>
                            <div className="insight-value font-semibold">{zoningData.planning_insights.zone_diversity} different zones</div>
                          </div>
                          <div className="insight-item p-3 bg-orange-50 rounded-lg">
                            <div className="insight-label text-sm text-gray-600">Average Zone Size</div>
                            <div className="insight-value font-semibold">{zoningData.planning_insights.average_zone_size_hectares} hectares</div>
                          </div>
                          <div className="insight-item p-3 bg-orange-50 rounded-lg">
                            <div className="insight-label text-sm text-gray-600">Processing Time</div>
                            <div className="insight-value font-semibold">{zoningData.processing_time_ms}ms</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overall Stats */}
                    <div className="summary-stats mb-4">
                      <div className="stat-item">
                        <span>Method Used:</span>
                        <span>{zoningData.method_used ? zoningData.method_used.replace('_', ' ') : 'Standard'}</span>
                      </div>
                      <div className="stat-item">
                        <span>Total Zones:</span>
                        <span>{zoningData.total_zones}</span>
                      </div>
                      <div className="stat-item">
                        <span>Shape Preserved:</span>
                        <span>{zoningData.shape_preserved ? '✅ Yes' : '❌ No'}</span>
                      </div>
                    </div>
                    
                    {/* Comprehensive Zone Breakdown */}
                    <div className="zone-breakdown">
                      <h4 className="font-semibold mb-3 text-indigo-600">🏘️ Comprehensive Zone Details</h4>
                      {zoningData.zone_details ? (
                        <div className="zone-details-grid grid gap-4">
                          {Object.entries(zoningData.zone_details).map(([zoneType, details]) => {
                            const Icon = getZoneIcon(zoneType);
                            const compliance = zoningData.compliance?.zone_compliance?.[zoneType];
                            return (
                              <div key={zoneType} className="zone-detail-card p-4 border rounded-lg bg-gray-50">
                                <div className="zone-header flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="zone-color-indicator w-4 h-4 rounded"
                                      style={{ backgroundColor: getZoneColor(zoneType) }}
                                    ></div>
                                    <Icon className="w-5 h-5" />
                                    <h5 className="font-semibold text-lg">
                                      {zoneType ? zoneType.charAt(0).toUpperCase() + zoneType.slice(1).replace('_', ' ') : 'Unknown'}
                                    </h5>
                                  </div>
                                  <span className="zone-count bg-gray-200 px-2 py-1 rounded text-sm">
                                    {details.count} zones
                                  </span>
                                </div>
                                
                                <div className="zone-metrics grid grid-cols-2 gap-3">
                                  <div className="metric-item">
                                    <div className="metric-label text-sm text-gray-600">Total Area</div>
                                    <div className="metric-value font-semibold">
                                      {details.total_area_hectares?.toFixed(2)} ha
                                    </div>
                                    <div className="metric-sub text-xs text-gray-500">
                                      ({details.total_area_acres?.toFixed(2)} acres)
                                    </div>
                                  </div>
                                  
                                  <div className="metric-item">
                                    <div className="metric-label text-sm text-gray-600">Area (m²)</div>
                                    <div className="metric-value font-semibold">
                                      {details.total_area_sqm?.toLocaleString()} m²
                                    </div>
                                  </div>
                                  
                                  <div className="metric-item">
                                    <div className="metric-label text-sm text-gray-600">Percentage</div>
                                    <div className="metric-value font-semibold">
                                      {details.percentage_of_total?.toFixed(1)}%
                                    </div>
                                    <div className="metric-sub text-xs text-gray-500">
                                      (target: {details.target_percentage?.toFixed(1)}%)
                                    </div>
                                  </div>
                                  
                                  <div className="metric-item">
                                    <div className="metric-label text-sm text-gray-600">Compliance</div>
                                    <div className={`metric-value font-semibold ${compliance?.compliant ? 'text-green-600' : 'text-orange-600'}`}>
                                      {compliance?.status || 'Unknown'}
                                    </div>
                                    {compliance?.deviation && (
                                      <div className="metric-sub text-xs text-gray-500">
                                        ±{compliance.deviation.toFixed(1)}% deviation
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Fallback to original zone summary if zone_details not available
                        Object.entries(zoningData.zone_summary || {}).map(([zoneType, data]) => {
                          const Icon = getZoneIcon(zoneType);
                          return (
                            <div key={zoneType} className="zone-item">
                              <div className="zone-header">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="zone-color-indicator"
                                    style={{ backgroundColor: getZoneColor(zoneType) }}
                                  ></div>
                                  <Icon className="w-4 h-4" />
                                  <span className="zone-name">
                                    {zoneType ? zoneType.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                                  </span>
                                </div>
                              </div>
                              <div className="zone-stats">
                                <div className="stat-row">
                                  <span>Area:</span>
                                  <span>{data.area_hectares} ha</span>
                                </div>
                                <div className="stat-row">
                                  <span>Area (m²):</span>
                                  <span>{data.area_sqm?.toLocaleString()} m²</span>
                                </div>
                                <div className="stat-row">
                                  <span>Actual:</span>
                                  <span>{data.percentage}%</span>
                                </div>
                                <div className="stat-row">
                                  <span>Target:</span>
                                  <span>{data.target_percentage}%</span>
                                </div>
                                <div className="stat-row">
                                  <span>Difference:</span>
                                  <span className={Math.abs(data.percentage - data.target_percentage) <= 2 ? 'text-green-600' : 'text-orange-600'}>
                                    {(data.percentage - data.target_percentage).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PolygonZoning;
