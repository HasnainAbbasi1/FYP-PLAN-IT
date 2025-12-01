import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import { Download, Settings, Zap, Map, BarChart3, FileText } from 'lucide-react';
import { authenticatedFetch } from '@/utils/authHelper';

const API_BASE_URL = "http://localhost:8000";

const ZoningSubdivision = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State management
  const [zoningData, setZoningData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState('subdivision');
  
  // Subdivision parameters
  const [method, setMethod] = useState('kmeans');
  const [nZones, setNZones] = useState(4);
  const [customWeights, setCustomWeights] = useState({
    suitability: 0.4,
    slope: 0.3,
    flood_risk: 0.2,
    accessibility: 0.1
  });
  
  // Map state
  const [mapCenter, setMapCenter] = useState([33.6844, 73.0479]); // Islamabad
  const [mapZoom, setMapZoom] = useState(13);

  // Load data from navigation state
  useEffect(() => {
    const data = location.state;
    if (data?.suitability && data?.terrain) {
      // Auto-generate zoning if we have the required data
      generateZoning(data);
    }
  }, [location.state]);

  const generateZoning = async (inputData = null) => {
    setLoading(true);
    setError("");
    
    try {
      const data = inputData || location.state;
      
      if (!data?.suitability || !data?.terrain) {
        throw new Error("Missing terrain or suitability data. Please run analysis first.");
      }
      
      // Get polygon data
      const polygonRes = await authenticatedFetch(`${API_BASE_URL}/api/polygon`);
      if (!polygonRes.ok) throw new Error("Failed to fetch polygon data");
      const polygons = await polygonRes.json();
      
      const selectedPolygon = polygons.find(p => p.id === data.polygonId) || polygons[polygons.length - 1];
      if (!selectedPolygon) {
        throw new Error("No polygon found for zoning");
      }
      
      // Prepare payload for zoning subdivision
      const payload = {
        polygon_geojson: selectedPolygon.geojson,
        terrain_data: data.terrain || {},
        suitability_data: data.suitability || {},
        method: method,
        n_zones: nZones,
        custom_weights: customWeights
      };
      
      // Call zoning subdivision API
      const response = await authenticatedFetch(`${API_BASE_URL}/api/zoning_subdivision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Zoning subdivision failed');
      }
      
      const result = await response.json();
      setZoningData(result);
      
      // Update map center based on polygon bounds
      if (result.zoning_result?.features?.length > 0) {
        const firstFeature = result.zoning_result.features[0];
        if (firstFeature.geometry?.coordinates?.[0]?.[0]) {
          const coords = firstFeature.geometry.coordinates[0][0];
          setMapCenter([coords[1], coords[0]]);
        }
      }
      
    } catch (err) {
      console.error('Zoning generation error:', err);
      setError(err.message);
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
      a.download = `zoning_subdivision_${Date.now()}.${format}`;
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
      residential: "#4A90E2",
      commercial: "#9013FE", 
      industrial: "#FF9800",
      green_space: "#4CAF50",
      mixed_use: "#E91E63",
      institutional: "#795548",
      restricted: "#F44336"
    };
    return colors[zoneType] || "#757575";
  };

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
          ${props.zone_type.replace('_', ' ').toUpperCase()}
        </h4>
        <p><strong>Area:</strong> ${props.area_hectares} ha (${props.area_sqm} m²)</p>
        <p><strong>Suitability:</strong> ${(props.suitability_score * 100).toFixed(1)}%</p>
        <p><strong>Slope:</strong> ${props.slope_degrees}°</p>
        <p><strong>Flood Risk:</strong> ${(props.flood_risk * 100).toFixed(1)}%</p>
        <p><strong>CDA Compliant:</strong> ${props.cda_compliant ? '✅ Yes' : '❌ No'}</p>
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  const SubdivisionTab = () => (
    <div className="subdivision-container">
      <div className="subdivision-controls">
        <Card>
          <CardHeader>
            <CardTitle>Subdivision Parameters</CardTitle>
            <CardDescription>Configure intelligent zoning subdivision</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="subdivision-params">
              <div className="param-group">
                <Label>Clustering Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kmeans">K-Means Clustering</SelectItem>
                    <SelectItem value="dbscan">DBSCAN (Density-based)</SelectItem>
                    <SelectItem value="spectral">Spectral Clustering</SelectItem>
                    <SelectItem value="voronoi">Voronoi Diagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="param-group">
                <Label>Number of Zones: {nZones}</Label>
                <Slider
                  value={[nZones]}
                  onValueChange={(value) => setNZones(value[0])}
                  max={12}
                  min={2}
                  step={1}
                  className="subdivision-slider"
                />
              </div>
              
              <div className="param-group">
                <Label>Custom Weights</Label>
                <div className="weights-grid">
                  <div className="weight-item">
                    <span>Suitability: {customWeights.suitability}</span>
                    <Slider
                      value={[customWeights.suitability]}
                      onValueChange={(value) => setCustomWeights({...customWeights, suitability: value[0]})}
                      max={1}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="weight-item">
                    <span>Slope: {customWeights.slope}</span>
                    <Slider
                      value={[customWeights.slope]}
                      onValueChange={(value) => setCustomWeights({...customWeights, slope: value[0]})}
                      max={1}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="weight-item">
                    <span>Flood Risk: {customWeights.flood_risk}</span>
                    <Slider
                      value={[customWeights.flood_risk]}
                      onValueChange={(value) => setCustomWeights({...customWeights, flood_risk: value[0]})}
                      max={1}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="weight-item">
                    <span>Accessibility: {customWeights.accessibility}</span>
                    <Slider
                      value={[customWeights.accessibility]}
                      onValueChange={(value) => setCustomWeights({...customWeights, accessibility: value[0]})}
                      max={1}
                      min={0}
                      step={0.1}
                    />
                  </div>
                </div>
              </div>
              
              <div className="subdivision-actions">
                <Button onClick={() => generateZoning()} disabled={loading}>
                  <Zap className="w-4 h-4 mr-2" />
                  {loading ? 'Generating...' : 'Generate Zoning'}
                </Button>
                {zoningData && (
                  <Button variant="outline" onClick={() => exportZoning('geojson')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export GeoJSON
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="error-card">
          <CardContent>
            <p className="error-text">{error}</p>
          </CardContent>
        </Card>
      )}

      {zoningData && (
        <div className="zoning-results">
          <div className="results-grid">
            <Card>
              <CardHeader>
                <CardTitle>Zoning Map</CardTitle>
                <CardDescription>Interactive subdivision visualization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="map-container" style={{ height: '500px', width: '100%' }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    {zoningData.zoning_result && (
                      <GeoJSON
                        data={zoningData.zoning_result}
                        style={getZoneStyle}
                        onEachFeature={onEachFeature}
                      />
                    )}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zone Summary</CardTitle>
                <CardDescription>Distribution and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="zone-summary">
                  <div className="summary-stats">
                    <div className="stat-item">
                      <span>Total Zones:</span>
                      <span>{zoningData.total_zones}</span>
                    </div>
                    <div className="stat-item">
                      <span>Method Used:</span>
                      <span>{zoningData.method_used}</span>
                    </div>
                    <div className="stat-item">
                      <span>CDA Compliant:</span>
                      <span>{zoningData.cda_compliant ? '✅ Yes' : '❌ No'}</span>
                    </div>
                  </div>
                  
                  <div className="zone-breakdown">
                    {Object.entries(zoningData.zone_summary || {}).map(([zoneType, data]) => (
                      <div key={zoneType} className="zone-item">
                        <div className="zone-header">
                          <div 
                            className="zone-color-indicator"
                            style={{ backgroundColor: getZoneColor(zoneType) }}
                          ></div>
                          <span className="zone-name">
                            {zoneType.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="zone-stats">
                          <span>{data.count} zones</span>
                          <span>{data.percentage}%</span>
                          <span>{data.total_area.toFixed(2)} ha</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );

  const RegulationsTab = () => (
    <div className="regulations-container">
      <Card>
        <CardHeader>
          <CardTitle>Pakistan CDA Zoning Regulations</CardTitle>
          <CardDescription>Capital Development Authority compliance standards</CardDescription>
        </CardHeader>
        <CardContent>
          {zoningData?.zoning_result?.features ? (
            <div className="regulations-grid">
              {Object.entries(zoningData.zone_summary || {}).map(([zoneType, data]) => (
                <div key={zoneType} className="regulation-card">
                  <div className="regulation-header">
                    <div 
                      className="zone-color-indicator"
                      style={{ backgroundColor: getZoneColor(zoneType) }}
                    ></div>
                    <h4>{zoneType.replace('_', ' ').toUpperCase()}</h4>
                  </div>
                  
                  <div className="regulation-details">
                    {zoneType === 'residential' && (
                      <>
                        <div className="reg-item"><span>Max Height:</span><span>12m (3 floors)</span></div>
                        <div className="reg-item"><span>FAR:</span><span>1.5</span></div>
                        <div className="reg-item"><span>Lot Coverage:</span><span>60%</span></div>
                        <div className="reg-item"><span>Front Setback:</span><span>3m</span></div>
                        <div className="reg-item"><span>Density:</span><span>25 units/ha</span></div>
                      </>
                    )}
                    {zoneType === 'commercial' && (
                      <>
                        <div className="reg-item"><span>Max Height:</span><span>24m (6 floors)</span></div>
                        <div className="reg-item"><span>FAR:</span><span>3.0</span></div>
                        <div className="reg-item"><span>Lot Coverage:</span><span>80%</span></div>
                        <div className="reg-item"><span>Front Setback:</span><span>5m</span></div>
                        <div className="reg-item"><span>Parking:</span><span>2 spaces/unit</span></div>
                      </>
                    )}
                    {zoneType === 'industrial' && (
                      <>
                        <div className="reg-item"><span>Max Height:</span><span>15m (2 floors)</span></div>
                        <div className="reg-item"><span>FAR:</span><span>1.0</span></div>
                        <div className="reg-item"><span>Lot Coverage:</span><span>70%</span></div>
                        <div className="reg-item"><span>Buffer Zone:</span><span>20m</span></div>
                        <div className="reg-item"><span>Setback:</span><span>10m all sides</span></div>
                      </>
                    )}
                    {zoneType === 'green_space' && (
                      <>
                        <div className="reg-item"><span>Max Height:</span><span>6m (1 floor)</span></div>
                        <div className="reg-item"><span>FAR:</span><span>0.1</span></div>
                        <div className="reg-item"><span>Lot Coverage:</span><span>10%</span></div>
                        <div className="reg-item"><span>Protected:</span><span>Yes</span></div>
                        <div className="reg-item"><span>Min Area:</span><span>0.1 ha</span></div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>Generate zoning subdivision to view regulations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <MainLayout>
      <div className="zoning-container">
        <div className="zoning-header">
          <div>
            <h1 className="zoning-title">Intelligent Zoning & Land Subdivision</h1>
            <p className="zoning-subtitle">AI-powered zoning with Pakistan CDA compliance</p>
          </div>
          <div className="zoning-actions">
            {zoningData && (
              <>
                <Button variant="outline" onClick={() => exportZoning('geojson')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" onClick={() => navigate('/reports')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="zoning-tabs">
          <TabsList className="zoning-tabs-list">
            <TabsTrigger value="subdivision">Subdivision</TabsTrigger>
            <TabsTrigger value="regulations">CDA Regulations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="subdivision" className="zoning-tabs-content">
            <SubdivisionTab />
          </TabsContent>
          
          <TabsContent value="regulations" className="zoning-tabs-content">
            <RegulationsTab />
          </TabsContent>
          
          <TabsContent value="analytics" className="zoning-tabs-content">
            <Card>
              <CardHeader>
                <CardTitle>Zoning Analytics</CardTitle>
                <CardDescription>Performance metrics and optimization insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="analytics-placeholder">
                  <BarChart3 className="w-16 h-16 text-gray-400" />
                  <p>Advanced analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ZoningSubdivision;
