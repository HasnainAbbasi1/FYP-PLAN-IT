import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  TrendingUp, 
  Shield, 
  TreePine, 
  Building2, 
  Store,
  Download,
  RefreshCw,
  Info,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';

const EARTH_RADIUS_METERS = 6371000;

const normalizeZoneBreakdown = (zoneBreakdown = {}, zoneConfig) => {
  const entries = Object.entries(zoneBreakdown).filter(([_, value]) => typeof value === 'number' && value > 0);
  if (entries.length === 0) return [];

  const sum = entries.reduce((acc, [, value]) => acc + value, 0);
  const multiplier = sum <= 1.5 ? 100 : 1; // treat decimals as ratios

  return entries
    .map(([zone, value]) => ({
      zone,
      percentage: value * multiplier,
      config: zoneConfig[zone] || {
        name: zone.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        color: '#cbd5f5',
        description: 'No description available',
        benefits: []
      }
    }))
    .sort((a, b) => b.percentage - a.percentage);
};

const extractGeometry = (polygon) => {
  if (!polygon) return null;
  const geo = polygon.geojson || polygon;
  if (!geo) return null;
  if (geo.type === 'Feature') return geo.geometry;
  if (geo.type === 'Polygon' || geo.type === 'MultiPolygon') return geo;
  if (geo.geometry) return geo.geometry;
  return null;
};

const extractPolygonCoordinates = (polygon) => {
  const geometry = extractGeometry(polygon);
  if (!geometry) return null;

  if (geometry.type === 'Polygon') {
    return geometry.coordinates?.[0] || null;
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates?.[0]?.[0] || null;
  }

  return null;
};

const calculatePolygonArea = (polygon) => {
  const geometry = extractGeometry(polygon);
  if (!geometry || !geometry.coordinates) return 0;

  const coordinates =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates[0]?.[0]
      : geometry.coordinates[0];

  if (!coordinates || coordinates.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    area += dLon * (2 + Math.sin(lat1Rad) + Math.sin(lat1Rad + dLat));
  }

  return Math.abs((area * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
};

const createPolygonPath = (coords, canvasSize) => {
  if (!coords || coords.length < 3) return null;

  const xs = coords.map(([x]) => x);
  const ys = coords.map(([, y]) => y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = Math.max(maxX - minX, 0.0001);
  const height = Math.max(maxY - minY, 0.0001);

  const padding = 24;
  const drawableWidth = canvasSize - padding * 2;
  const drawableHeight = canvasSize - padding * 2;
  const scale = Math.min(drawableWidth / width, drawableHeight / height);

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = (canvasSize - scaledWidth) / 2;
  const offsetY = (canvasSize - scaledHeight) / 2;

  const project = ([x, y]) => {
    const px = offsetX + (x - minX) * scale;
    const py = offsetY + (maxY - y) * scale;
    return [px, py];
  };

  const path = new Path2D();
  coords.forEach((point, index) => {
    const [px, py] = project(point);
    if (index === 0) {
      path.moveTo(px, py);
    } else {
      path.lineTo(px, py);
    }
  });
  path.closePath();

  return { 
    path, 
    project,
    bounds: { minX, maxX, minY, maxY },
    canvasBounds: {
      offsetX,
      offsetY,
      width: scaledWidth,
      height: scaledHeight
    }
  };
};

const ZoningVisualization2D = ({ 
  polygonId, 
  zoningData, 
  onRefresh, 
  isLoading = false,
  selectedPolygon
}) => {
  const [selectedZone, setSelectedZone] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const canvasRef = useRef(null);
  
  // Layer visibility controls
  const [layers, setLayers] = useState({
    zoneColors: true,
    zoneDividers: true,
    polygonBoundary: true,
    labels: false,
    grid: false
  });

  const toggleLayer = (layerName) => {
    setLayers(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));
  };

  // Zone configuration
  const zoneConfig = {
    residential: {
      name: 'Residential',
      icon: Building2,
      color: '#FFE4B5',
      description: 'Housing and residential areas',
      benefits: ['Community living', 'Family-friendly', 'Quiet environment']
    },
    commercial: {
      name: 'Commercial',
      icon: Store,
      color: '#FFD700',
      description: 'Business and retail zones',
      benefits: ['Economic activity', 'Job creation', 'Urban vibrancy']
    },
    green: {
      name: 'Green Space',
      icon: TreePine,
      color: '#32CD32',
      description: 'Parks and recreational areas',
      benefits: ['Environmental health', 'Recreation', 'Air quality']
    },
    mixed_use: {
      name: 'Mixed Use',
      icon: MapPin,
      color: '#DDA0DD',
      description: 'Combined residential and commercial',
      benefits: ['Walkability', 'Diverse amenities', 'Efficient land use']
    },
    conservation: {
      name: 'Conservation',
      icon: Shield,
      color: '#228B22',
      description: 'Protected natural areas',
      benefits: ['Biodiversity', 'Ecosystem protection', 'Climate resilience']
    }
  };

  const polygonCoordinates = useMemo(() => extractPolygonCoordinates(selectedPolygon), [selectedPolygon]);

  const polygonAreaSqm = useMemo(() => {
    if (selectedPolygon?.area) return selectedPolygon.area;
    return calculatePolygonArea(selectedPolygon);
  }, [selectedPolygon]);

  const zoneBreakdownData = useMemo(
    () => normalizeZoneBreakdown(zoningData?.analysis?.zone_recommendations?.zone_breakdown, zoneConfig),
    [zoningData, zoneConfig]
  );

  const zoneAreaDetails = useMemo(() => {
    if (!polygonAreaSqm || !zoneBreakdownData.length) return [];
    return zoneBreakdownData.map((zone) => ({
      ...zone,
      areaSqm: (polygonAreaSqm * zone.percentage) / 100,
      areaHectares: (polygonAreaSqm * zone.percentage) / 1000000,
      areaAcres: (polygonAreaSqm * zone.percentage) / 4046.86
    }));
  }, [polygonAreaSqm, zoneBreakdownData]);

  const drawPolygonVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const canvasSize = 600;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw grid if enabled
    if (layers.grid) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const gridSpacing = 50;
      for (let x = 0; x <= canvasSize; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize);
        ctx.stroke();
      }
      for (let y = 0; y <= canvasSize; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize, y);
        ctx.stroke();
      }
    }

    const polygonPathData = polygonCoordinates ? createPolygonPath(polygonCoordinates, canvasSize) : null;
    if (!polygonPathData || zoneBreakdownData.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('Select a polygon and run zoning analysis to visualize results.', 40, canvasSize / 2);
      return;
    }

    const polygonPath = polygonPathData.path;

    ctx.save();
    ctx.clip(polygonPath);

    const totalPercent = zoneBreakdownData.reduce((sum, zone) => sum + zone.percentage, 0) || 1;
    const { canvasBounds } = polygonPathData;
    const drawAlongX = canvasBounds.width >= canvasBounds.height;
    let cursor = 0;

    // Draw zone colors if enabled
    if (layers.zoneColors) {
      zoneBreakdownData.forEach((zone) => {
        const proportion = zone.percentage / totalPercent;
        ctx.fillStyle = zone.config?.color || '#cbd5f5';

        if (drawAlongX) {
          const segmentWidth = canvasBounds.width * proportion;
          const rectX = canvasBounds.offsetX + cursor;
          ctx.fillRect(rectX, canvasBounds.offsetY, segmentWidth, canvasBounds.height);
          cursor += segmentWidth;
        } else {
          const segmentHeight = canvasBounds.height * proportion;
          const rectY = canvasBounds.offsetY + cursor;
          ctx.fillRect(canvasBounds.offsetX, rectY, canvasBounds.width, segmentHeight);
          cursor += segmentHeight;
        }
      });
    }

    // Draw zone dividers if enabled
    if (layers.zoneDividers && layers.zoneColors) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      cursor = 0;
      zoneBreakdownData.slice(0, -1).forEach((zone) => {
        const proportion = zone.percentage / totalPercent;
        if (drawAlongX) {
          cursor += canvasBounds.width * proportion;
          ctx.beginPath();
          ctx.moveTo(canvasBounds.offsetX + cursor, canvasBounds.offsetY);
          ctx.lineTo(canvasBounds.offsetX + cursor, canvasBounds.offsetY + canvasBounds.height);
          ctx.stroke();
        } else {
          cursor += canvasBounds.height * proportion;
          ctx.beginPath();
          ctx.moveTo(canvasBounds.offsetX, canvasBounds.offsetY + cursor);
          ctx.lineTo(canvasBounds.offsetX + canvasBounds.width, canvasBounds.offsetY + cursor);
          ctx.stroke();
        }
      });
    }

    // Draw labels if enabled
    if (layers.labels && layers.zoneColors) {
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      cursor = 0;
      
      zoneBreakdownData.forEach((zone) => {
        const proportion = zone.percentage / totalPercent;
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;

        if (drawAlongX) {
          const segmentWidth = canvasBounds.width * proportion;
          const textX = canvasBounds.offsetX + cursor + segmentWidth / 2;
          const textY = canvasBounds.offsetY + canvasBounds.height / 2;
          
          if (segmentWidth > 60) { // Only draw label if segment is wide enough
            const label = `${zone.config.name}\n${zone.percentage.toFixed(0)}%`;
            ctx.strokeText(label, textX, textY);
            ctx.fillText(label, textX, textY);
          }
          cursor += segmentWidth;
        } else {
          const segmentHeight = canvasBounds.height * proportion;
          const textX = canvasBounds.offsetX + canvasBounds.width / 2;
          const textY = canvasBounds.offsetY + cursor + segmentHeight / 2;
          
          if (segmentHeight > 60) { // Only draw label if segment is tall enough
            const label = `${zone.config.name}\n${zone.percentage.toFixed(0)}%`;
            ctx.strokeText(label, textX, textY);
            ctx.fillText(label, textX, textY);
          }
          cursor += segmentHeight;
        }
      });
    }

    ctx.restore();

    // Draw polygon boundary if enabled
    if (layers.polygonBoundary) {
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 3;
      ctx.stroke(polygonPath);
    }
  };

  useEffect(() => {
    drawPolygonVisualization();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygonCoordinates, zoneBreakdownData, layers]);

  // Extract data from zoning analysis
  const analysis = zoningData?.analysis || {};
  const zoningPrediction = analysis.zoning_prediction || {};
  const terrainSummary = analysis.terrain_summary || {};
  const zoneRecommendations = analysis.zone_recommendations || {};
  const visualization = analysis.visualization || {};
  

  const primaryZone = zoneRecommendations.primary_zone || 'mixed_use';
  const confidence = zoneRecommendations.confidence || 0;
  const zoneBreakdown = zoneRecommendations.zone_breakdown || {};
  const recommendation = zoneRecommendations.recommendation || '';

  // Calculate zone percentages for display
  const zonePercentages = Object.entries(zoneBreakdown).map(([zone, probability]) => ({
    zone,
    percentage: Math.round(probability * 100),
    probability,
    config: zoneConfig[zone] || zoneConfig.mixed_use
  })).sort((a, b) => b.percentage - a.percentage);

  const handleZoneClick = (zone) => {
    setSelectedZone(zone === selectedZone ? null : zone);
    setShowDetails(true);
  };

  const handleDownload = () => {
    if (visualization.image_url) {
      const link = document.createElement('a');
      const fullUrl = visualization.image_url.startsWith('http') 
        ? visualization.image_url 
        : `http://localhost:5002${visualization.image_url}`;
      link.href = fullUrl;
      link.download = `zoning_analysis_${polygonId || 'polygon'}.png`;
      link.click();
      return;
    }

    if (canvasRef.current) {
      const link = document.createElement('a');
      link.href = canvasRef.current.toDataURL('image/png');
      link.download = `zoning_visualization_${polygonId || 'polygon'}.png`;
      link.click();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Analyzing Zoning...
          </CardTitle>
          <CardDescription>
            Processing terrain data and generating intelligent zoning recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            <p className="text-muted-foreground">Creating 2D zoning visualization...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Legend and Layers Controls Row - Always Visible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Legend Card */}
        <Card className="bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-slate-800/80 dark:to-slate-900/80 border-2 border-blue-200 dark:border-blue-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-900 dark:text-blue-100">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Zone Legend
            </CardTitle>
            <CardDescription className="text-sm text-blue-700 dark:text-blue-300">
              Available zone types and their colors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {Object.entries(zoneConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div 
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-700/50 hover:scale-105 hover:shadow-md border border-transparent hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    <div 
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-lg flex items-center justify-center transform transition-transform duration-300 hover:rotate-12"
                      style={{ backgroundColor: config.color }}
                    >
                      <Icon className="h-4 w-4 text-white drop-shadow-lg" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground text-sm">{config.name}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Layers Control Card */}
        <Card className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-slate-900/80 dark:to-purple-900/80 border-2 border-purple-200 dark:border-purple-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-purple-900 dark:text-purple-100">
              <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Layer Controls
            </CardTitle>
            <CardDescription className="text-sm text-purple-700 dark:text-purple-300">
              Toggle visibility of visualization elements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md">
                <div className="flex items-center gap-3">
                  {layers.zoneColors ? <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
                  <Label htmlFor="layer-colors" className="text-sm font-semibold cursor-pointer text-foreground">
                    Zone Colors
                  </Label>
                </div>
                <Switch 
                  id="layer-colors"
                  checked={layers.zoneColors}
                  onCheckedChange={() => toggleLayer('zoneColors')}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md">
                <div className="flex items-center gap-3">
                  {layers.zoneDividers ? <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
                  <Label htmlFor="layer-dividers" className="text-sm font-semibold cursor-pointer text-foreground">
                    Zone Dividers
                  </Label>
                </div>
                <Switch 
                  id="layer-dividers"
                  checked={layers.zoneDividers}
                  onCheckedChange={() => toggleLayer('zoneDividers')}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md">
                <div className="flex items-center gap-3">
                  {layers.polygonBoundary ? <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
                  <Label htmlFor="layer-boundary" className="text-sm font-semibold cursor-pointer text-foreground">
                    Polygon Boundary
                  </Label>
                </div>
                <Switch 
                  id="layer-boundary"
                  checked={layers.polygonBoundary}
                  onCheckedChange={() => toggleLayer('polygonBoundary')}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md">
                <div className="flex items-center gap-3">
                  {layers.labels ? <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
                  <Label htmlFor="layer-labels" className="text-sm font-semibold cursor-pointer text-foreground">
                    Zone Labels
                  </Label>
                </div>
                <Switch 
                  id="layer-labels"
                  checked={layers.labels}
                  onCheckedChange={() => toggleLayer('labels')}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md">
                <div className="flex items-center gap-3">
                  {layers.grid ? <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
                  <Label htmlFor="layer-grid" className="text-sm font-semibold cursor-pointer text-foreground">
                    Background Grid
                  </Label>
                </div>
                <Switch 
                  id="layer-grid"
                  checked={layers.grid}
                  onCheckedChange={() => toggleLayer('grid')}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zoning Visualization Card */}
      {!zoningData ? (
        <Card className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-slate-800/80 dark:to-slate-900/80 border-2 border-amber-200 dark:border-amber-800 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Zoning Visualization
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              Select a polygon and run analysis to visualize intelligent zoning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <MapPin className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground">No Zoning Data Available</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Please select a polygon and click "Run Intelligent Zoning" to generate terrain-based zoning recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-green-50/80 to-teal-50/80 dark:from-slate-800/80 dark:to-slate-900/80 border-2 border-green-200 dark:border-green-800 rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                  <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
                  2D Zoning Visualization
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300 mt-2">
                  {primaryZone ? `${zoneConfig[primaryZone]?.name || 'Mixed Use'} Zone (${Math.round(confidence * 100)}% confidence)` : 'Intelligent zoning based on terrain analysis'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="border-2 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900 hover:border-green-400 dark:hover:border-green-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!visualization.image_url && !selectedPolygon}
                  className="border-2 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900 hover:border-green-400 dark:hover:border-green-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-full max-w-[650px]">
                <canvas
                  ref={canvasRef}
                  className="w-full border-4 border-green-300 dark:border-green-700 rounded-2xl shadow-2xl cursor-crosshair bg-white dark:bg-slate-800 transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]"
                  aria-label="2D zoning visualization"
                />
                {selectedPolygon && !visualization.image_url && (
                  <div className="absolute bottom-4 left-4 right-4 bg-yellow-100 dark:bg-yellow-900/50 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-3 shadow-lg backdrop-blur-sm">
                    <p className="text-sm text-yellow-900 dark:text-yellow-200 text-center font-medium flex items-center justify-center gap-2">
                      <Info className="h-4 w-4" />
                      Simple visualization - Run full analysis for detailed society plan
                    </p>
                  </div>
                )}
              </div>

              {visualization.image_url && (
                <div className="w-full mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-900 rounded-2xl border-2 border-blue-300 dark:border-blue-700 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        Professional Society Layout
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        Generated with terrain-aware intelligent zoning
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100 font-semibold px-4 py-2">
                      SVG Format
                    </Badge>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 shadow-inner">
                    <img
                      src={visualization.image_url.startsWith('http') 
                        ? visualization.image_url 
                        : `http://localhost:5002${visualization.image_url}`}
                      alt="Generated zoning report"
                      className="w-full h-auto rounded-lg"
                      style={{ maxHeight: '800px', objectFit: 'contain' }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                    <span className="flex items-center gap-2 font-medium">
                      <Info className="h-4 w-4" />
                      Red dashed line shows polygon boundary
                    </span>
                    <span className="font-medium">
                      All elements clipped to boundary
                    </span>
                  </div>
                </div>
              )}

              {zoneAreaDetails.length > 0 && (
                <div className="w-full mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-purple-900 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700 shadow-xl">
                  <h4 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-6 text-center flex items-center justify-center gap-2">
                    <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    Area Allocation (Total: {polygonAreaSqm ? `${(polygonAreaSqm / 10000).toFixed(2)} ha` : 'N/A'})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {zoneAreaDetails.map((zone) => (
                      <div key={zone.zone} className="flex items-center gap-4 p-4 bg-white/80 dark:bg-slate-800/80 rounded-xl transition-all duration-300 hover:bg-white dark:hover:bg-slate-700 hover:scale-105 hover:shadow-lg border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-6 h-6 rounded-lg border-2 border-white shadow-lg"
                            style={{ backgroundColor: zone.config.color }}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{zone.config.name}</span>
                            <Badge variant="secondary" className="w-fit mt-1">{zone.percentage.toFixed(1)}%</Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">
                          <span className="font-semibold">{zone.areaSqm.toLocaleString(undefined, { maximumFractionDigits: 0 })} m²</span>
                          <span>{zone.areaHectares.toFixed(2)} ha</span>
                          <span>{zone.areaAcres.toFixed(2)} ac</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ZoningVisualization2D;
