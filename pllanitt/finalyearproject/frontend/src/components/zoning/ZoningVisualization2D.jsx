import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  TrendingUp, 
  Shield, 
  TreePine, 
  Building2, 
  Store,
  Download,
  RefreshCw,
  Info
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

    ctx.restore();

    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.stroke(polygonPath);
  };

  useEffect(() => {
    drawPolygonVisualization();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygonCoordinates, zoneBreakdownData]);

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

  if (!zoningData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zoning Visualization</CardTitle>
          <CardDescription>
            Select a polygon to generate intelligent zoning analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              No zoning data available. Please run zoning analysis first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-background rounded-2xl border-2 border-accent-light-border dark:border-accent-dark-border animate-fade-in">
      {/* Simple Image Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                2D Zoning Visualization
              </CardTitle>
              <CardDescription>
                {primaryZone ? `${zoneConfig[primaryZone]?.name || 'Mixed Use'} Zone (${Math.round(confidence * 100)}% confidence)` : 'Intelligent zoning based on terrain analysis'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!visualization.image_url && !selectedPolygon}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 relative">
            <canvas
              ref={canvasRef}
              className="border-3 border-accent-light-border dark:border-accent-dark-border rounded-xl shadow-card cursor-crosshair bg-white dark:bg-slate-800 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
              aria-label="2D zoning visualization"
            />

            {!selectedPolygon && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/50 rounded-xl">
                <MapPin className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground">Select a polygon to preview zoning layout</p>
              </div>
            )}
          </div>

          {visualization.image_url && (
            <div className="mt-4 p-4 bg-accent-light/50 dark:bg-accent-dark/50 rounded-xl border border-accent-light-border dark:border-accent-dark-border">
              <p className="text-sm font-semibold text-foreground mb-2">Server generated layout</p>
              <img
                src={visualization.image_url.startsWith('http') 
                  ? visualization.image_url 
                  : `http://localhost:5002${visualization.image_url}`}
                alt="Generated zoning report"
                className="w-full h-auto rounded-lg border border-accent-light-border dark:border-accent-dark-border shadow-sm"
              />
            </div>
          )}

          {zoneAreaDetails.length > 0 && (
            <div className="mt-6 p-4 bg-card border border-accent-light-border dark:border-accent-dark-border rounded-xl shadow-sm">
              <h4 className="text-lg font-bold text-foreground mb-4 text-center">Area Allocation (Total {polygonAreaSqm ? `${(polygonAreaSqm / 10000).toFixed(2)} ha` : 'N/A'})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {zoneAreaDetails.map((zone) => (
                  <div key={zone.zone} className="flex items-center gap-3 p-3 bg-muted rounded-lg transition-all duration-300 hover:bg-accent hover:translate-x-1">
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <div
                        className="w-4 h-4 rounded border border-accent-light-border dark:border-accent-dark-border shadow-sm"
                        style={{ backgroundColor: zone.config.color }}
                      />
                      <span className="font-semibold text-foreground text-sm">{zone.config.name}</span>
                      <Badge variant="secondary">{zone.percentage.toFixed(1)}%</Badge>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span>{zone.areaSqm.toLocaleString(undefined, { maximumFractionDigits: 0 })} m²</span>
                      <span>{zone.areaHectares.toFixed(2)} ha</span>
                      <span>{zone.areaAcres.toFixed(2)} ac</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ZoningVisualization2D;
