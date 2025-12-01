import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import polygonApi from '@/services/polygonApi';
import MainLayout from '@/components/layout/MainLayout';
import { MapContainer, TileLayer, Polygon as LeafletPolygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  MapPin, 
  Layers, 
  Sliders, 
  Download, 
  Loader2, 
  Home, 
  Building2, 
  Trees, 
  Car, 
  Droplets,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  History,
  GitCompare,
  FileText,
  Share2,
  Palette,
  PlayCircle,
  MapPinned
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PYTHON_API_BASE_URL = import.meta.env.VITE_PYTHON_API_BASE_URL || 'http://localhost:5002';

// Phase 3: Color Schemes
const COLOR_SCHEMES = {
  default: {
    name: 'Default',
    colors: {
      residential: '#3b82f6',    // Blue
      commercial: '#8b5cf6',     // Purple
      green_space: '#22c55e',    // Green
      roads: '#6b7280',          // Gray
      industrial: '#f97316',     // Orange
      water_bodies: '#06b6d4',   // Cyan
      restricted_areas: '#ef4444' // Red
    }
  },
  professional: {
    name: 'Professional',
    colors: {
      residential: '#2563eb',
      commercial: '#7c3aed',
      green_space: '#16a34a',
      roads: '#374151',
      industrial: '#ea580c',
      water_bodies: '#0891b2',
      restricted_areas: '#dc2626'
    }
  },
  pastel: {
    name: 'Pastel',
    colors: {
      residential: '#93c5fd',
      commercial: '#c4b5fd',
      green_space: '#86efac',
      roads: '#d1d5db',
      industrial: '#fdba74',
      water_bodies: '#67e8f9',
      restricted_areas: '#fca5a5'
    }
  },
  dark: {
    name: 'Dark Mode',
    colors: {
      residential: '#1e40af',
      commercial: '#6d28d9',
      green_space: '#15803d',
      roads: '#1f2937',
      industrial: '#c2410c',
      water_bodies: '#0e7490',
      restricted_areas: '#991b1b'
    }
  },
  highContrast: {
    name: 'High Contrast',
    colors: {
      residential: '#0000ff',
      commercial: '#ff00ff',
      green_space: '#00ff00',
      roads: '#000000',
      industrial: '#ff8800',
      water_bodies: '#00ffff',
      restricted_areas: '#ff0000'
    }
  }
};

// Zoning Preset Templates
const ZONING_PRESETS = {
  'Residential Focused': {
    residential: 60,
    commercial: 15,
    green_space: 15,
    roads: 10,
    industrial: 0,
    description: 'Ideal for housing-dominant developments'
  },
  'Mixed Use': {
    residential: 40,
    commercial: 30,
    green_space: 15,
    roads: 10,
    industrial: 5,
    description: 'Balanced mix of residential and commercial'
  },
  'Commercial Hub': {
    residential: 20,
    commercial: 50,
    green_space: 10,
    roads: 15,
    industrial: 5,
    description: 'Business and retail focused development'
  },
  'Green Community': {
    residential: 40,
    commercial: 15,
    green_space: 30,
    roads: 10,
    industrial: 5,
    description: 'Eco-friendly with maximum green space'
  },
  'Industrial Park': {
    residential: 10,
    commercial: 20,
    green_space: 10,
    roads: 15,
    industrial: 45,
    description: 'Manufacturing and industrial focus'
  },
  'CDA Standard': {
    residential: 50,
    commercial: 30,
    green_space: 20,
    roads: 0,
    industrial: 0,
    description: 'Capital Development Authority guidelines'
  }
};

const ZoningGenerator = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();
  
  // State management
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Zoning percentages
  const [percentages, setPercentages] = useState({
    residential: 40,
    commercial: 20,
    green_space: 15,
    roads: 15,
    industrial: 10
  });
  
  // Layer visibility
  const [visibleLayers, setVisibleLayers] = useState({
    residential: true,
    commercial: true,
    green_space: true,
    roads: true,
    industrial: true,
    water_bodies: true,
    restricted_areas: true
  });
  
  // Generated results
  const [zoningResult, setZoningResult] = useState(null);
  const [svgData, setSvgData] = useState(null);
  const [terrainRestrictions, setTerrainRestrictions] = useState(null);
  
  // Phase 1 enhancements
  const [savedConfigurations, setSavedConfigurations] = useState([]);
  const [configName, setConfigName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  
  // Phase 2 enhancements
  const [layerOpacity, setLayerOpacity] = useState({
    residential: 100,
    commercial: 100,
    green_space: 100,
    roads: 100,
    industrial: 100,
    water_bodies: 100,
    restricted_areas: 100
  });
  const [svgZoom, setSvgZoom] = useState(1);
  const [svgPan, setSvgPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const svgContainerRef = useRef(null);
  
  // Phase 3 enhancements
  const [colorScheme, setColorScheme] = useState('default');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedPolygons, setSelectedPolygons] = useState([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [shareableLink, setShareableLink] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Phase 4 enhancements
  const [layoutMode, setLayoutMode] = useState('simple'); // 'simple' or 'society'
  const [societyLayoutType, setSocietyLayoutType] = useState('grid'); // 'grid', 'organic', 'radial', 'cluster'
  const [societyData, setSocietyData] = useState(null);

  // Load polygons from database (drawn in Data Ingestion page)
  const loadPolygons = useCallback(async () => {
    if (!currentProject?.id) {
      console.log('No project selected, skipping polygon load');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Loading polygons for project ID: ${currentProject.id}`);
      
      const data = await polygonApi.getPolygonsWithUnassigned(currentProject.id);
      const polygonsArray = Array.isArray(data) ? data : (data.polygons || data.data || []);
      
      console.log(`Loaded ${polygonsArray.length} polygons from database:`, polygonsArray);
      setPolygons(polygonsArray);
      
      if (polygonsArray.length === 0) {
        setError('No polygons found in this project. Please draw polygons in the Data Ingestion page first, then come back here to generate zoning.');
      }
    } catch (err) {
      console.error('Failed to load polygons:', err);
      setError(`Failed to load polygons: ${err.message}`);
      setPolygons([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    loadPolygons();
    loadSavedConfigurations();
    loadHistoryFromStorage();
  }, [loadPolygons]);
  
  // Validate on mount and when percentages change
  useEffect(() => {
    validateAndWarn(percentages);
  }, [percentages]);
  
  // Add mouse event listeners for panning
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, panStart]);
  
  // Load saved configurations from localStorage
  const loadSavedConfigurations = () => {
    try {
      const saved = localStorage.getItem('zoning_configurations');
      if (saved) {
        setSavedConfigurations(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load saved configurations:', err);
    }
  };
  
  // Phase 2: SVG Zoom and Pan handlers
  const handleZoomIn = () => {
    setSvgZoom(prev => Math.min(prev + 0.2, 3));
  };
  
  const handleZoomOut = () => {
    setSvgZoom(prev => Math.max(prev - 0.2, 0.5));
  };
  
  const handleResetView = () => {
    setSvgZoom(1);
    setSvgPan({ x: 0, y: 0 });
  };
  
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX - svgPan.x, y: e.clientY - svgPan.y });
    }
  };
  
  const handleMouseMove = (e) => {
    if (isPanning) {
      setSvgPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  // Phase 2: Layer opacity handler
  const handleOpacityChange = (layer, value) => {
    setLayerOpacity(prev => ({
      ...prev,
      [layer]: value
    }));
  };
  
  // Phase 2: History tracking
  const addToHistory = (result) => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      percentages: { ...percentages },
      result: result,
      polygonId: selectedPolygon?.id,
      polygonName: selectedPolygon?.name
    };
    
    // Remove any history items after current index (if we went back and generated new)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);
    
    // Keep only last 10 items
    const trimmedHistory = newHistory.slice(-10);
    
    setHistory(trimmedHistory);
    setHistoryIndex(trimmedHistory.length - 1);
    
    // Save to localStorage
    try {
      localStorage.setItem('zoning_history', JSON.stringify(trimmedHistory));
    } catch (err) {
      console.warn('Failed to save history:', err);
    }
  };
  
  const loadHistoryEntry = (index) => {
    const entry = history[index];
    if (entry) {
      setPercentages(entry.percentages);
      setZoningResult(entry.result);
      setSvgData(entry.result.svg_content);
      setHistoryIndex(index);
    }
  };
  
  const loadHistoryFromStorage = () => {
    try {
      const saved = localStorage.getItem('zoning_history');
      if (saved) {
        const parsedHistory = JSON.parse(saved);
        setHistory(parsedHistory);
        setHistoryIndex(parsedHistory.length - 1);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };
  
  // Phase 2: Get polygon bounds for mini-map
  const getPolygonBounds = (polygon) => {
    if (!polygon?.geojson) return null;
    
    try {
      const coords = polygon.geojson.type === 'Feature' 
        ? polygon.geojson.geometry.coordinates[0]
        : polygon.geojson.coordinates[0];
      
      if (!coords || coords.length === 0) return null;
      
      const lats = coords.map(c => c[1]);
      const lngs = coords.map(c => c[0]);
      
      return {
        center: [(Math.max(...lats) + Math.min(...lats)) / 2, (Math.max(...lngs) + Math.min(...lngs)) / 2],
        coords: coords.map(c => [c[1], c[0]]) // Leaflet uses [lat, lng]
      };
    } catch (err) {
      console.error('Error calculating polygon bounds:', err);
      return null;
    }
  };
  
  // Phase 2: Extract polygon info
  const getPolygonInfo = (polygon) => {
    if (!polygon) return null;
    
    try {
      const coords = polygon.geojson?.type === 'Feature' 
        ? polygon.geojson.geometry.coordinates[0]
        : polygon.geojson?.coordinates?.[0];
      
      if (!coords || coords.length === 0) return null;
      
      // Calculate area using Shoelace formula
      let area = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
      }
      area = Math.abs(area / 2);
      
      // Convert to square meters (approximate, depends on projection)
      const areaSqm = area * 111320 * 111320 * Math.cos(coords[0][1] * Math.PI / 180);
      
      return {
        vertices: coords.length - 1,
        area_sqm: areaSqm,
        area_marlas: areaSqm / 25.2929,
        area_acres: areaSqm / 4046.86,
        area_hectares: areaSqm / 10000,
        perimeter_km: calculatePerimeter(coords)
      };
    } catch (err) {
      console.error('Error extracting polygon info:', err);
      return null;
    }
  };
  
  const calculatePerimeter = (coords) => {
    let perimeter = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const lat1 = coords[i][1];
      const lon1 = coords[i][0];
      const lat2 = coords[i + 1][1];
      const lon2 = coords[i + 1][0];
      
      // Haversine formula
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      perimeter += R * c;
    }
    return perimeter;
  };
  
  // Phase 3: PDF Report Generation
  const generatePDFReport = async () => {
    if (!zoningResult || !selectedPolygon) {
      setError('Generate zoning first before creating PDF report');
      return;
    }
    
    try {
      setGeneratingPDF(true);
      const doc = new jsPDF();
      let yPos = 20;
      
      // Title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Smart Zoning Report', 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Project Info
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Project: ${currentProject?.name || 'N/A'}`, 20, yPos);
      yPos += 7;
      doc.text(`Polygon: ${selectedPolygon.name}`, 20, yPos);
      yPos += 7;
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 10;
      
      // Polygon Information
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Polygon Information', 20, yPos);
      yPos += 8;
      
      const polygonInfo = getPolygonInfo(selectedPolygon);
      if (polygonInfo) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Area: ${polygonInfo.area_sqm.toLocaleString()} sqm (${polygonInfo.area_marlas.toFixed(1)} marlas, ${polygonInfo.area_acres.toFixed(2)} acres)`, 20, yPos);
        yPos += 6;
        doc.text(`Perimeter: ${polygonInfo.perimeter_km.toFixed(2)} km`, 20, yPos);
        yPos += 6;
        doc.text(`Vertices: ${polygonInfo.vertices}`, 20, yPos);
        yPos += 10;
      }
      
      // Zoning Distribution
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Zoning Distribution', 20, yPos);
      yPos += 8;
      
      const distributionData = Object.entries(percentages).map(([zone, pct]) => [
        zone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        `${pct}%`
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Zone Type', 'Percentage']],
        body: distributionData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Statistics
      if (zoningResult.statistics) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Zone Statistics', 20, yPos);
        yPos += 8;
        
        const statsData = [];
        if (zoningResult.statistics.zones) {
          Object.entries(zoningResult.statistics.zones).forEach(([zone, data]) => {
            statsData.push([
              zone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              data.area_sqm?.toLocaleString() || 'N/A',
              data.area_marlas?.toFixed(1) || 'N/A',
              `${data.percentage}%`
            ]);
          });
        }
        
        doc.autoTable({
          startY: yPos,
          head: [['Zone', 'Area (sqm)', 'Area (marlas)', 'Percentage']],
          body: statsData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
        });
        yPos = doc.lastAutoTable.finalY + 10;
        
        // Infrastructure Needs (new page if needed)
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        const residentialArea = zoningResult.statistics.zones?.residential?.area_sqm || 0;
        const population = Math.round(residentialArea / 100 * 3.5);
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Infrastructure Requirements', 20, yPos);
        yPos += 8;
        
        const infraData = [
          ['Estimated Population', population.toLocaleString()],
          ['Schools Required', Math.ceil(population / 1000).toString()],
          ['Healthcare Facilities', Math.ceil(population / 2000).toString()],
          ['Mosques', Math.ceil(population / 500).toString()],
          ['Parks', Math.ceil(population / 750).toString()]
        ];
        
        doc.autoTable({
          startY: yPos,
          head: [['Infrastructure Type', 'Quantity']],
          body: infraData,
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] }
        });
        yPos = doc.lastAutoTable.finalY + 10;
        
        // Environmental Impact
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        const greenSpace = zoningResult.statistics.zones?.green_space?.area_sqm || 0;
        const totalArea = zoningResult.statistics.total_area_sqm;
        const greenPercentage = (greenSpace / totalArea) * 100;
        const carbonScore = Math.min(100, Math.round(greenPercentage * 3 + 25));
        const waterScore = Math.min(100, Math.round(greenPercentage * 2.5 + 30));
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Environmental Impact', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Carbon Offset Score: ${carbonScore}/100`, 20, yPos);
        yPos += 6;
        doc.text(`Water Management Score: ${waterScore}/100`, 20, yPos);
        yPos += 6;
        const sustainabilityRating = carbonScore > 70 ? 'Excellent' : carbonScore > 50 ? 'Good' : 'Fair';
        doc.text(`Sustainability Rating: ${sustainabilityRating}`, 20, yPos);
        yPos += 10;
        
        // Restrictions
        if (zoningResult.statistics.restricted_zones && zoningResult.statistics.restricted_zones.length > 0) {
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text('Terrain Restrictions', 20, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 8;
          
          const restrictionData = zoningResult.statistics.restricted_zones.map(r => [
            r.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            r.severity || 'N/A',
            r.percentage ? `${r.percentage.toFixed(1)}%` : 'N/A'
          ]);
          
          doc.autoTable({
            startY: yPos,
            head: [['Restriction Type', 'Severity', 'Area Affected']],
            body: restrictionData,
            theme: 'striped',
            headStyles: { fillColor: [220, 38, 38] }
          });
        }
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Page ${i} of ${pageCount} | Generated by Smart Zoning Generator`,
          105,
          285,
          { align: 'center' }
        );
      }
      
      // Save PDF
      const fileName = `Zoning_Report_${selectedPolygon.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      doc.save(fileName);
      
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setGeneratingPDF(false);
    }
  };
  
  // Phase 3: GeoJSON Export
  const exportGeoJSON = () => {
    if (!zoningResult || !selectedPolygon) {
      setError('Generate zoning first before exporting GeoJSON');
      return;
    }
    
    try {
      const geoJSON = {
        type: 'FeatureCollection',
        features: []
      };
      
      // Add main polygon
      geoJSON.features.push({
        type: 'Feature',
        properties: {
          name: selectedPolygon.name,
          polygon_id: selectedPolygon.id,
          project: currentProject?.name,
          generated_at: new Date().toISOString(),
          total_area_sqm: zoningResult.statistics?.total_area_sqm,
          total_area_marlas: zoningResult.statistics?.total_area_marlas
        },
        geometry: selectedPolygon.geojson.type === 'Feature' 
          ? selectedPolygon.geojson.geometry 
          : selectedPolygon.geojson
      });
      
      // Add zoning data as properties
      if (zoningResult.statistics?.zones) {
        Object.entries(zoningResult.statistics.zones).forEach(([zone, data]) => {
          geoJSON.features.push({
            type: 'Feature',
            properties: {
              zone_type: zone,
              percentage: data.percentage,
              area_sqm: data.area_sqm,
              area_marlas: data.area_marlas,
              color: COLOR_SCHEMES[colorScheme].colors[zone] || '#000000'
            },
            geometry: selectedPolygon.geojson.type === 'Feature' 
              ? selectedPolygon.geojson.geometry 
              : selectedPolygon.geojson
          });
        });
      }
      
      // Download
      const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Zoning_${selectedPolygon.name.replace(/\s+/g, '_')}_${Date.now()}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('GeoJSON export error:', err);
      setError(`Failed to export GeoJSON: ${err.message}`);
    }
  };
  
  // Phase 3: Download SVG
  const downloadSVG = () => {
    if (!svgData) return;
    
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Zoning_${selectedPolygon?.name.replace(/\s+/g, '_') || 'Map'}_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Phase 3: Download PNG
  const downloadPNG = () => {
    if (!svgData || !svgContainerRef.current) return;
    
    try {
      const svgElement = svgContainerRef.current.querySelector('svg');
      if (!svgElement) return;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Zoning_${selectedPolygon?.name.replace(/\s+/g, '_') || 'Map'}_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        });
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    } catch (err) {
      console.error('PNG export error:', err);
      setError('Failed to export PNG');
    }
  };
  
  // Phase 3: Batch Processing
  const processBatchZoning = async () => {
    if (selectedPolygons.length === 0) {
      setError('Please select polygons for batch processing');
      return;
    }
    
    try {
      setBatchProgress(0);
      const results = [];
      
      for (let i = 0; i < selectedPolygons.length; i++) {
        const polygon = selectedPolygons[i];
        
        const response = await fetch(`${PYTHON_API_BASE_URL}/api/generate_zoning_svg`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            polygon_id: polygon.id,
            percentages: percentages,
            project_id: currentProject?.id,
            user_id: user?.id,
            consider_terrain: true,
            output_format: 'svg'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          results.push({ polygon: polygon.name, success: true, data });
        } else {
          results.push({ polygon: polygon.name, success: false, error: 'Generation failed' });
        }
        
        setBatchProgress(Math.round(((i + 1) / selectedPolygons.length) * 100));
      }
      
      // Generate combined report
      alert(`Batch processing complete!\nSuccessful: ${results.filter(r => r.success).length}\nFailed: ${results.filter(r => !r.success).length}`);
      setBatchMode(false);
      setSelectedPolygons([]);
      
    } catch (err) {
      console.error('Batch processing error:', err);
      setError(`Batch processing failed: ${err.message}`);
    }
  };
  
  // Phase 3: Generate Shareable Link
  const generateShareableLink = () => {
    if (!zoningResult) {
      setError('Generate zoning first before sharing');
      return;
    }
    
    try {
      const state = {
        polygonId: selectedPolygon?.id,
        percentages,
        projectId: currentProject?.id,
        timestamp: Date.now()
      };
      
      const encoded = btoa(JSON.stringify(state));
      const baseUrl = window.location.origin + window.location.pathname;
      const link = `${baseUrl}?share=${encoded}`;
      
      setShareableLink(link);
      setShowShareDialog(true);
      
      // Copy to clipboard
      navigator.clipboard.writeText(link).then(() => {
        console.log('Link copied to clipboard');
      });
      
    } catch (err) {
      console.error('Share link generation error:', err);
      setError('Failed to generate shareable link');
    }
  };
  
  // Phase 3: Load from shareable link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    
    if (shareParam) {
      try {
        const decoded = JSON.parse(atob(shareParam));
        setPercentages(decoded.percentages);
        // Note: Would need to load polygon by ID here
      } catch (err) {
        console.error('Failed to load from share link:', err);
      }
    }
  }, []);
  
  // Phase 3: Toggle batch mode
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedPolygons([]);
  };
  
  // Phase 3: Toggle polygon selection for batch
  const togglePolygonSelection = (polygon) => {
    setSelectedPolygons(prev => {
      const exists = prev.find(p => p.id === polygon.id);
      if (exists) {
        return prev.filter(p => p.id !== polygon.id);
      } else {
        return [...prev, polygon];
      }
    });
  };
  
  // Save current configuration
  const saveConfiguration = () => {
    if (!configName.trim()) {
      setError('Please enter a configuration name');
      return;
    }
    
    const newConfig = {
      id: Date.now(),
      name: configName,
      percentages: { ...percentages },
      created: new Date().toISOString(),
      polygon_id: selectedPolygon?.id
    };
    
    const updated = [...savedConfigurations, newConfig];
    setSavedConfigurations(updated);
    localStorage.setItem('zoning_configurations', JSON.stringify(updated));
    
    setConfigName('');
    setShowSaveDialog(false);
    setError(null);
  };
  
  // Load saved configuration
  const loadConfiguration = (config) => {
    setPercentages(config.percentages);
    setError(null);
  };
  
  // Delete configuration
  const deleteConfiguration = (configId) => {
    const updated = savedConfigurations.filter(c => c.id !== configId);
    setSavedConfigurations(updated);
    localStorage.setItem('zoning_configurations', JSON.stringify(updated));
  };
  
  // Apply preset template
  const applyPreset = (presetName) => {
    const preset = ZONING_PRESETS[presetName];
    if (preset) {
      const { description, ...percentages } = preset;
      setPercentages(percentages);
      setError(null);
    }
  };

  // Generate smart suggestions based on terrain
  const generateSmartSuggestions = useCallback((terrain, area_sqm) => {
    const newSuggestions = [];
    
    if (!terrain) return;
    
    // Analyze terrain data
    const floodRisk = terrain.flood_analysis?.risk_statistics?.high_risk_area_percent || 0;
    const maxSlope = terrain.slope_analysis?.max_slope || 0;
    const erosionRisk = terrain.erosion_analysis?.annual_soil_loss?.mean || 0;
    
    // Flood-based suggestions
    if (floodRisk > 20) {
      newSuggestions.push({
        icon: '💧',
        title: 'High Flood Risk Detected',
        message: 'Recommend: Increase green space to 25% for better water management and reduce residential to 35%',
        action: () => setPercentages({ residential: 35, commercial: 20, green_space: 25, roads: 15, industrial: 5 })
      });
    } else if (floodRisk > 10) {
      newSuggestions.push({
        icon: '💧',
        title: 'Moderate Flood Risk',
        message: 'Consider: Increase green space to 20% and avoid low-lying residential areas',
        action: () => setPercentages({ ...percentages, green_space: Math.max(20, percentages.green_space) })
      });
    }
    
    // Slope-based suggestions
    if (maxSlope > 40) {
      newSuggestions.push({
        icon: '⛰️',
        title: 'Very Steep Terrain',
        message: 'Recommend: Increase green space to 30%, reduce construction zones, focus on terraced development',
        action: () => setPercentages({ residential: 30, commercial: 15, green_space: 30, roads: 15, industrial: 10 })
      });
    } else if (maxSlope > 30) {
      newSuggestions.push({
        icon: '⛰️',
        title: 'Steep Slopes Present',
        message: 'Suggest: Limit development on steep areas, increase green buffers',
        action: () => setPercentages({ ...percentages, green_space: Math.max(20, percentages.green_space) })
      });
    }
    
    // Erosion-based suggestions
    if (erosionRisk > 30) {
      newSuggestions.push({
        icon: '🌍',
        title: 'High Erosion Risk',
        message: 'Critical: Increase green space to 25%+ and implement erosion control measures',
        action: () => setPercentages({ ...percentages, green_space: 25 })
      });
    }
    
    // Area-based suggestions
    if (area_sqm < 50000) { // Less than 5 hectares
      newSuggestions.push({
        icon: '📐',
        title: 'Small Area Development',
        message: 'Recommend: Focus on residential (60%) with minimal industrial zones',
        action: () => setPercentages({ residential: 60, commercial: 15, green_space: 15, roads: 10, industrial: 0 })
      });
    } else if (area_sqm > 500000) { // More than 50 hectares
      newSuggestions.push({
        icon: '📐',
        title: 'Large Scale Development',
        message: 'Suggest: Balanced mixed-use with adequate infrastructure',
        action: () => setPercentages({ residential: 40, commercial: 30, green_space: 15, roads: 10, industrial: 5 })
      });
    }
    
    setSuggestions(newSuggestions);
  }, []);

  // Load terrain analysis for selected polygon
  const loadTerrainAnalysis = useCallback(async (polygonId) => {
    try {
      const response = await fetch(`${PYTHON_API_BASE_URL}/api/terrain_analysis?polygon_id=${polygonId}&project_id=${currentProject?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract restriction data from terrain analysis
        const restrictions = {
          water_areas: [],
          flood_risk_areas: [],
          steep_slopes: [],
          high_erosion_areas: []
        };
        
        const analysisData = data.terrain_analysis?.results || data.terrain_analysis || {};
        
        // Check for flood risk
        if (analysisData.flood_analysis?.risk_statistics?.high_risk_area_percent > 10) {
          restrictions.flood_risk_areas.push({
            severity: 'high',
            percentage: analysisData.flood_analysis.risk_statistics.high_risk_area_percent,
            message: 'High flood risk detected - limiting development in affected areas'
          });
        }
        
        // Check for steep slopes
        if (analysisData.slope_analysis?.max_slope > 30) {
          restrictions.steep_slopes.push({
            severity: 'high',
            max_slope: analysisData.slope_analysis.max_slope,
            message: 'Steep slopes detected - restricting construction in areas >30°'
          });
        }
        
        // Check for erosion risk
        if (analysisData.erosion_analysis?.annual_soil_loss?.mean > 20) {
          restrictions.high_erosion_areas.push({
            severity: 'high',
            soil_loss: analysisData.erosion_analysis.annual_soil_loss.mean,
            message: 'High erosion risk - implementing green buffers required'
          });
        }
        
        setTerrainRestrictions(restrictions);
        
        // Generate smart suggestions based on terrain
        const area = analysisData.stats?.area_sqm || 0;
        generateSmartSuggestions(analysisData, area);
      }
    } catch (err) {
      console.warn('Could not load terrain analysis:', err);
      // Continue without terrain restrictions
    }
  }, [currentProject, generateSmartSuggestions]);

  // Handle polygon selection
  const handlePolygonSelect = (polygon) => {
    setSelectedPolygon(polygon);
    setZoningResult(null);
    setSvgData(null);
    loadTerrainAnalysis(polygon.id);
  };

  // Update percentage and auto-adjust others
  const handlePercentageChange = (key, value) => {
    const newValue = Math.max(0, Math.min(100, value));
    const oldValue = percentages[key];
    const diff = newValue - oldValue;
    
    // Calculate total of other categories
    const otherKeys = Object.keys(percentages).filter(k => k !== key);
    const otherTotal = otherKeys.reduce((sum, k) => sum + percentages[k], 0);
    
    // If we can't accommodate the change, cap it
    const maxAllowed = 100 - otherTotal + oldValue;
    const finalValue = Math.min(newValue, maxAllowed);
    
    // Distribute the difference among other categories proportionally
    const newPercentages = { ...percentages, [key]: finalValue };
    
    if (diff !== 0 && otherTotal > 0) {
      const remainingTotal = 100 - finalValue;
      otherKeys.forEach(k => {
        const proportion = percentages[k] / otherTotal;
        newPercentages[k] = Math.max(0, Math.round(proportion * remainingTotal));
      });
    }
    
    setPercentages(newPercentages);
    validateAndWarn(newPercentages);
  };
  
  // Validation and warnings
  const validateAndWarn = (pct) => {
    const newWarnings = [];
    
    // Green space warnings
    if (pct.green_space < 15) {
      newWarnings.push({
        type: 'warning',
        message: `Green space (${pct.green_space}%) is below recommended minimum of 15%`,
        severity: 'medium'
      });
    }
    
    // Road coverage warnings
    if (pct.roads < 12) {
      newWarnings.push({
        type: 'warning',
        message: `Road coverage (${pct.roads}%) is below minimum 12% - may cause access issues`,
        severity: 'high'
      });
    } else if (pct.roads > 18) {
      newWarnings.push({
        type: 'info',
        message: `Road coverage (${pct.roads}%) exceeds typical 18% - consider reducing`,
        severity: 'low'
      });
    }
    
    // Mixed-use balance
    if (pct.residential > 70) {
      newWarnings.push({
        type: 'info',
        message: 'High residential percentage - consider adding commercial zones for mixed-use development',
        severity: 'low'
      });
    }
    
    if (pct.commercial > 60) {
      newWarnings.push({
        type: 'info',
        message: 'High commercial percentage - ensure adequate residential support',
        severity: 'low'
      });
    }
    
    // Green space excellence
    if (pct.green_space >= 25) {
      newWarnings.push({
        type: 'success',
        message: 'Excellent green space allocation - promotes environmental sustainability',
        severity: 'low'
      });
    }
    
    setWarnings(newWarnings);
  };
  
  // Generate zoning with SVG output
  const generateZoning = async () => {
    if (!selectedPolygon) {
      setError('Please select a polygon first');
      return;
    }
    
    // Validate percentages sum to 100
    const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 1) {
      setError(`Percentages must sum to 100%. Current total: ${total}%`);
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      const response = await fetch(`${PYTHON_API_BASE_URL}/api/generate_zoning_svg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          polygon_id: selectedPolygon.id,
          percentages: percentages,
          project_id: currentProject?.id,
          user_id: user?.id,
          consider_terrain: true,
          output_format: 'svg',
          layout_mode: layoutMode,  // Phase 4: Add layout mode
          society_layout_type: societyLayoutType  // Phase 4: Add society layout type
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate zoning');
      }
      
      const data = await response.json();
      setZoningResult(data);
      
      if (data.svg_data) {
        setSvgData(data.svg_data);
      }
      
      // Phase 4: Store society layout data if available
      if (data.society_layout) {
        setSocietyData(data.society_layout);
      }
      
      // Phase 2: Add to history
      addToHistory(data);
      
    } catch (err) {
      console.error('Zoning generation error:', err);
      setError(err.message || 'Failed to generate zoning');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle layer visibility
  const toggleLayer = (layer) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const totalPercentage = Object.values(percentages).reduce((sum, val) => sum + val, 0);
  const isValidTotal = Math.abs(totalPercentage - 100) <= 1;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="w-8 h-8" />
              Smart Zoning Generator
            </h1>
            <p className="text-muted-foreground mt-2">
              Generate intelligent zoning maps with terrain-aware placement and layer-based visualization
            </p>
          </div>
          {currentProject && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Project</p>
              <p className="font-semibold">{currentProject.title || currentProject.name}</p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Terrain Restrictions Alert */}
        {terrainRestrictions && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terrain Restrictions Detected</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {terrainRestrictions.flood_risk_areas.map((item, i) => (
                  <li key={`flood-${i}`}>{item.message}</li>
                ))}
                {terrainRestrictions.steep_slopes.map((item, i) => (
                  <li key={`slope-${i}`}>{item.message}</li>
                ))}
                {terrainRestrictions.high_erosion_areas.map((item, i) => (
                  <li key={`erosion-${i}`}>{item.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Polygon Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Select Polygon
                </CardTitle>
                <CardDescription>
                  Choose a polygon to generate zoning
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                 ) : polygons.length === 0 ? (
                  <div className="text-center py-6">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm text-muted-foreground mb-2">No polygons found</p>
                    <p className="text-xs text-muted-foreground">
                      Go to <span className="font-semibold">Data Ingestion</span> page to draw polygons first
                    </p>
                  </div>
                 ) : (
                   <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {batchMode && (
                      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs text-blue-700 dark:text-blue-400">
                        🔘 Batch Mode Active - Click polygons to select/deselect
                      </div>
                    )}
                    {polygons.map((polygon) => (
                      <button
                        key={polygon.id}
                        onClick={() => batchMode ? togglePolygonSelection(polygon) : handlePolygonSelect(polygon)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          batchMode
                            ? selectedPolygons.find(p => p.id === polygon.id)
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 shadow-md'
                              : 'border-border hover:border-purple-300'
                            : selectedPolygon?.id === polygon.id
                              ? 'border-primary bg-primary/10 shadow-md'
                              : 'border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {batchMode && (
                                <Checkbox
                                  checked={!!selectedPolygons.find(p => p.id === polygon.id)}
                                  onCheckedChange={() => togglePolygonSelection(polygon)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                              <div>
                                <div className="font-medium">{polygon.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Polygon ID: {polygon.id} • Project: {currentProject?.name || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                          {!batchMode && selectedPolygon?.id === polygon.id && (
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
                          )}
                          {batchMode && selectedPolygons.find(p => p.id === polygon.id) && (
                            <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase 2: Mini-Map Preview */}
            {selectedPolygon && getPolygonBounds(selectedPolygon) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-4 h-4" />
                    Polygon Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 rounded-lg overflow-hidden border">
                    <MapContainer
                      center={getPolygonBounds(selectedPolygon).center}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <LeafletPolygon
                        positions={getPolygonBounds(selectedPolygon).coords}
                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3 }}
                      >
                        <Popup>
                          <div className="text-xs">
                            <div className="font-semibold">{selectedPolygon.name}</div>
                            <div className="text-muted-foreground">ID: {selectedPolygon.id}</div>
                          </div>
                        </Popup>
                      </LeafletPolygon>
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase 2: Polygon Information Panel */}
            {selectedPolygon && getPolygonInfo(selectedPolygon) && (
              <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Info className="w-4 h-4" />
                    Polygon Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const info = getPolygonInfo(selectedPolygon);
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="font-semibold">{selectedPolygon.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vertices:</span>
                          <span className="font-semibold">{info.vertices}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="text-xs font-semibold mb-2">Area</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Square Meters:</span>
                              <div className="font-semibold">{info.area_sqm.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Marlas:</span>
                              <div className="font-semibold">{info.area_marlas.toFixed(1)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Acres:</span>
                              <div className="font-semibold">{info.area_acres.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hectares:</span>
                              <div className="font-semibold">{info.area_hectares.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t pt-2 flex justify-between text-xs">
                          <span className="text-muted-foreground">Perimeter:</span>
                          <span className="font-semibold">{info.perimeter_km.toFixed(2)} km</span>
                        </div>
                        {terrainRestrictions && (
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs font-semibold mb-2">Terrain Status</div>
                            <div className="space-y-1 text-xs">
                              {terrainRestrictions.flood_risk && (
                                <div className="flex items-center gap-2">
                                  <Droplets className="w-3 h-3 text-blue-600" />
                                  <span>Flood Risk: {terrainRestrictions.flood_risk}%</span>
                                </div>
                              )}
                              {terrainRestrictions.max_slope && (
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-3 h-3 text-orange-600" />
                                  <span>Max Slope: {terrainRestrictions.max_slope.toFixed(1)}°</span>
                                </div>
                              )}
                              {terrainRestrictions.total_restricted_percent && (
                                <div className="flex items-center gap-2 text-red-600">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="font-semibold">
                                    {terrainRestrictions.total_restricted_percent.toFixed(1)}% Restricted
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Phase 4: Layout Mode Toggle */}
            <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-950/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Layout Mode
                </CardTitle>
                <CardDescription>
                  Choose visualization style
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLayoutMode('simple')}
                    className={`px-3 py-2 text-sm border rounded-lg transition-all ${
                      layoutMode === 'simple'
                        ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/20 font-semibold'
                        : 'border-border hover:border-purple-300'
                    }`}
                  >
                    <div className="font-medium">Simple</div>
                    <div className="text-xs text-muted-foreground">Color zones</div>
                  </button>
                  <button
                    onClick={() => setLayoutMode('society')}
                    className={`px-3 py-2 text-sm border rounded-lg transition-all ${
                      layoutMode === 'society'
                        ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/20 font-semibold'
                        : 'border-border hover:border-purple-300'
                    }`}
                  >
                    <div className="font-medium">🏘️ Society</div>
                    <div className="text-xs text-muted-foreground">Detailed plots</div>
                  </button>
                </div>
                
                {layoutMode === 'society' && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <Label className="text-xs font-semibold">Society Pattern</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'grid', label: 'Grid', desc: 'Rectangular sectors' },
                        { value: 'organic', label: 'Organic', desc: 'Curved roads' },
                        { value: 'radial', label: 'Radial', desc: 'Central park' },
                        { value: 'cluster', label: 'Cluster', desc: 'Small groups' }
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setSocietyLayoutType(type.value)}
                          className={`px-2 py-1.5 text-xs border rounded transition-all text-left ${
                            societyLayoutType === type.value
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 font-semibold'
                              : 'border-border hover:border-purple-300'
                          }`}
                          title={type.desc}
                        >
                          <div className="font-medium">{type.label}</div>
                          <div className="text-[10px] text-muted-foreground">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 p-2 bg-white dark:bg-gray-900 rounded">
                      <div className="font-semibold mb-1">🏘️ Society Features:</div>
                      <div>✓ Sectors with plot subdivision</div>
                      <div>✓ Road network hierarchy</div>
                      <div>✓ Community amenities</div>
                      <div>✓ Plot numbering (A-1, B-2, etc.)</div>
                      <div>✓ Mosques, parks, schools</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

             {/* Preset Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Quick Presets
                </CardTitle>
                <CardDescription>
                  Apply common zoning templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ZONING_PRESETS).map(([name, preset]) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      className="px-3 py-2 text-xs border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
                      title={preset.description}
                    >
                      <div className="font-medium">{name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Percentage Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5" />
                  Zone Distribution
                </CardTitle>
                <CardDescription>
                  Set percentage for each zone type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Residential */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-blue-600" />
                      Residential
                    </Label>
                    <span className="font-semibold text-sm">{percentages.residential}%</span>
                  </div>
                  <Slider
                    value={[percentages.residential]}
                    onValueChange={([value]) => handlePercentageChange('residential', value)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    value={percentages.residential}
                    onChange={(e) => handlePercentageChange('residential', parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </div>

                {/* Commercial */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      Commercial
                    </Label>
                    <span className="font-semibold text-sm">{percentages.commercial}%</span>
                  </div>
                  <Slider
                    value={[percentages.commercial]}
                    onValueChange={([value]) => handlePercentageChange('commercial', value)}
                    max={100}
                    step={1}
                  />
                  <Input
                    type="number"
                    value={percentages.commercial}
                    onChange={(e) => handlePercentageChange('commercial', parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                </div>

                {/* Green Space */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Trees className="w-4 h-4 text-green-600" />
                      Green Space
                    </Label>
                    <span className="font-semibold text-sm">{percentages.green_space}%</span>
                  </div>
                  <Slider
                    value={[percentages.green_space]}
                    onValueChange={([value]) => handlePercentageChange('green_space', value)}
                    max={100}
                    step={1}
                  />
                  <Input
                    type="number"
                    value={percentages.green_space}
                    onChange={(e) => handlePercentageChange('green_space', parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                </div>

                {/* Roads */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-gray-600" />
                      Roads
                    </Label>
                    <span className="font-semibold text-sm">{percentages.roads}%</span>
                  </div>
                  <Slider
                    value={[percentages.roads]}
                    onValueChange={([value]) => handlePercentageChange('roads', value)}
                    max={100}
                    step={1}
                  />
                  <Input
                    type="number"
                    value={percentages.roads}
                    onChange={(e) => handlePercentageChange('roads', parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                </div>

                {/* Industrial */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-orange-600" />
                      Industrial
                    </Label>
                    <span className="font-semibold text-sm">{percentages.industrial}%</span>
                  </div>
                  <Slider
                    value={[percentages.industrial]}
                    onValueChange={([value]) => handlePercentageChange('industrial', value)}
                    max={100}
                    step={1}
                  />
                  <Input
                    type="number"
                    value={percentages.industrial}
                    onChange={(e) => handlePercentageChange('industrial', parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                </div>

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total:</span>
                    <span className={`font-bold text-lg ${isValidTotal ? 'text-green-600' : 'text-red-600'}`}>
                      {totalPercentage}%
                    </span>
                  </div>
                  {!isValidTotal && (
                    <p className="text-xs text-red-600 mt-1">Must equal 100%</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={generateZoning}
                    disabled={!selectedPolygon || !isValidTotal || generating}
                    className="w-full"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Generate Zoning
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => setShowSaveDialog(!showSaveDialog)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
                
                {/* Save Configuration Dialog */}
                {showSaveDialog && (
                  <div className="mt-3 p-3 border rounded-lg bg-muted/50">
                    <Label className="text-xs">Configuration Name</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="e.g., My Custom Plan"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        className="text-sm"
                      />
                      <Button onClick={saveConfiguration} size="sm">
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Validation Warnings */}
            {warnings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="w-4 h-4" />
                    Validation & Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {warnings.map((warning, idx) => (
                    <Alert 
                      key={idx}
                      variant={warning.type === 'warning' ? 'destructive' : warning.type === 'success' ? 'default' : 'default'}
                      className="py-2"
                    >
                      <AlertDescription className="text-xs">
                        {warning.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Smart Suggestions */}
            {suggestions.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-400">
                    💡 Smart Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{suggestion.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{suggestion.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{suggestion.message}</div>
                          {suggestion.action && (
                            <Button
                              onClick={suggestion.action}
                              variant="outline"
                              size="sm"
                              className="mt-2 text-xs h-7"
                            >
                              Apply Suggestion
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Saved Configurations */}
            {savedConfigurations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Download className="w-4 h-4" />
                    Saved Configurations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {savedConfigurations.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1 cursor-pointer" onClick={() => loadConfiguration(config)}>
                        <div className="font-medium text-sm">{config.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(config.created).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        onClick={() => deleteConfiguration(config.id)}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Phase 3: Color Scheme Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="w-4 h-4" />
                  Color Scheme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(COLOR_SCHEMES).map(([key, scheme]) => (
                    <button
                      key={key}
                      onClick={() => setColorScheme(key)}
                      className={`px-3 py-2 text-sm border rounded-lg transition-all text-left ${
                        colorScheme === key
                          ? 'border-primary bg-primary/10 font-semibold'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{scheme.name}</span>
                        {colorScheme === key && <CheckCircle2 className="w-3 h-3 text-primary" />}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {Object.entries(scheme.colors).slice(0, 5).map(([zone, color]) => (
                          <div
                            key={zone}
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color }}
                            title={zone}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Phase 3: Batch Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PlayCircle className="w-4 h-4" />
                  Batch Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    onClick={toggleBatchMode}
                    variant={batchMode ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    {batchMode ? 'Exit Batch Mode' : 'Enter Batch Mode'}
                  </Button>
                  
                  {batchMode && (
                    <>
                      <div className="text-xs text-muted-foreground">
                        Select multiple polygons to process
                      </div>
                      <div className="text-sm font-semibold">
                        Selected: {selectedPolygons.length} polygons
                      </div>
                      {selectedPolygons.length > 0 && (
                        <>
                          <Button
                            onClick={processBatchZoning}
                            className="w-full"
                            size="sm"
                          >
                            Process {selectedPolygons.length} Polygons
                          </Button>
                          {batchProgress > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                Progress: {batchProgress}%
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${batchProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Phase 3: Advanced Export */}
            {zoningResult && (
              <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4" />
                    Advanced Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={generatePDFReport}
                    disabled={generatingPDF}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {generatingPDF ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="w-3 h-3 mr-2" />
                        PDF Report
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={exportGeoJSON}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <MapPinned className="w-3 h-3 mr-2" />
                    GeoJSON Export
                  </Button>
                  
                  <Button
                    onClick={generateShareableLink}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Share2 className="w-3 h-3 mr-2" />
                    Share Link
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Phase 3: Share Dialog */}
            {showShareDialog && shareableLink && (
              <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Shareable Link
                    </span>
                    <Button
                      onClick={() => setShowShareDialog(false)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      ✕
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Share this link with your team. It includes the current zoning configuration.
                    </div>
                    <div className="p-2 bg-white dark:bg-gray-900 border rounded text-xs break-all">
                      {shareableLink}
                    </div>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(shareableLink);
                        alert('Link copied to clipboard!');
                      }}
                      size="sm"
                      className="w-full"
                    >
                      Copy Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Layer Controls */}
            {zoningResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Layer Control
                  </CardTitle>
                  <CardDescription>
                    Toggle layer visibility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Visibility Toggles */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground">Visibility</div>
                    {Object.entries(visibleLayers).map(([layer, visible]) => (
                      <div key={layer} className="flex items-center space-x-2">
                        <Checkbox
                          id={layer}
                          checked={visible}
                          onCheckedChange={() => toggleLayer(layer)}
                        />
                        <label
                          htmlFor={layer}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                        >
                          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          {layer.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {/* Phase 2: Opacity Sliders */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground">Layer Opacity</div>
                    {Object.entries(layerOpacity).map(([layer, opacity]) => (
                      <div key={layer} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize">{layer.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground">{opacity}%</span>
                        </div>
                        <Slider
                          value={[opacity]}
                          onValueChange={([value]) => handleOpacityChange(layer, value)}
                          min={0}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase 2: History Panel */}
            {history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-4 h-4" />
                    Generation History
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Last {history.length} generations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.map((entry, idx) => (
                      <button
                        key={entry.id}
                        onClick={() => loadHistoryEntry(idx)}
                        className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                          idx === historyIndex
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{entry.polygonName}</span>
                          {idx === historyIndex && <CheckCircle2 className="w-3 h-3 text-primary" />}
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {Object.entries(entry.percentages).map(([zone, pct]) => (
                            <span key={zone} className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                              {zone.charAt(0).toUpperCase()}: {pct}%
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                  {history.length >= 2 && (
                    <Button
                      onClick={() => setShowComparison(!showComparison)}
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 text-xs"
                    >
                      <GitCompare className="w-3 h-3 mr-2" />
                      {showComparison ? 'Hide' : 'Show'} Comparison
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Visualization */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Zoning Visualization
                    </CardTitle>
                    <CardDescription>
                      Interactive SVG-based zoning map
                    </CardDescription>
                  </div>
                  {svgData && (
                    <div className="flex gap-2 flex-wrap">
                      {/* Phase 2: Interactive Controls */}
                      <div className="flex gap-1 mr-2 border rounded-lg p-1">
                        <Button onClick={handleZoomIn} variant="ghost" size="sm" className="h-7 w-7 p-0" title="Zoom In">
                          <ZoomIn className="w-3 h-3" />
                        </Button>
                        <Button onClick={handleZoomOut} variant="ghost" size="sm" className="h-7 w-7 p-0" title="Zoom Out">
                          <ZoomOut className="w-3 h-3" />
                        </Button>
                        <Button onClick={handleResetView} variant="ghost" size="sm" className="h-7 w-7 p-0" title="Reset View">
                          <Maximize2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button onClick={downloadSVG} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        SVG
                      </Button>
                      <Button onClick={downloadPNG} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        PNG
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedPolygon ? (
                  <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
                    <MapPin className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select a polygon to begin</p>
                  </div>
                ) : !zoningResult ? (
                  <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
                    <Sliders className="w-16 h-16 mb-4 opacity-20" />
                    <p>Configure percentages and generate zoning</p>
                  </div>
                ) : generating ? (
                  <div className="flex flex-col items-center justify-center h-[600px]">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Generating zoning map...</p>
                  </div>
                ) : svgData ? (
                  <div className="relative">
                    {/* Phase 2: Interactive SVG with Zoom/Pan */}
                    <div 
                      ref={svgContainerRef}
                      className="w-full border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 cursor-move" 
                      style={{ maxHeight: '800px', position: 'relative' }}
                      onMouseDown={handleMouseDown}
                    >
                      <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs shadow-sm z-10">
                        Zoom: {(svgZoom * 100).toFixed(0)}%
                      </div>
                      <div 
                        className="inline-block min-w-full transition-transform"
                        style={{
                          transform: `scale(${svgZoom}) translate(${svgPan.x / svgZoom}px, ${svgPan.y / svgZoom}px)`,
                          transformOrigin: 'top left',
                          cursor: isPanning ? 'grabbing' : 'grab'
                        }}
                      >
                        <style>
                          {`
                            ${Object.entries(visibleLayers).map(([layer, visible]) => 
                              !visible ? `#layer_${layer} { display: none; }` : ''
                            ).join('\n')}
                            ${Object.entries(layerOpacity).map(([layer, opacity]) => 
                              `#layer_${layer} { opacity: ${opacity / 100}; }`
                            ).join('\n')}
                            ${Object.entries(COLOR_SCHEMES[colorScheme].colors).map(([layer, color]) => 
                              `#layer_${layer} path, #layer_${layer} polygon, #layer_${layer} rect { fill: ${color}; }`
                            ).join('\n')}
                            svg g[id^="layer_"] {
                              transition: opacity 0.3s ease, fill 0.3s ease;
                            }
                          `}
                        </style>
                        <div dangerouslySetInnerHTML={{ __html: svgData }} />
                      </div>
                    </div>
                    
                    {/* Phase 4: Society Layout Statistics */}
                    {layoutMode === 'society' && societyData && (
                      <Card className="mt-6 border-purple-200">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Society Layout Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Quick Stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                              <div className="text-xs text-muted-foreground">Total Sectors</div>
                              <div className="text-2xl font-bold text-purple-600">
                                {societyData.statistics?.total_sectors || 0}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <div className="text-xs text-muted-foreground">Total Plots</div>
                              <div className="text-2xl font-bold text-blue-600">
                                {societyData.statistics?.total_plots || 0}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                              <div className="text-xs text-muted-foreground">Amenities</div>
                              <div className="text-2xl font-bold text-green-600">
                                {societyData.amenities?.length || 0}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                              <div className="text-xs text-muted-foreground">Est. Population</div>
                              <div className="text-2xl font-bold text-orange-600">
                                {societyData.statistics?.estimated_population?.toLocaleString() || 0}
                              </div>
                            </div>
                          </div>
                          
                          {/* Plot Breakdown */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 border rounded-lg">
                              <div className="text-sm font-semibold mb-2">Plot Distribution</div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span>Residential:</span>
                                  <span className="font-semibold">{societyData.statistics?.residential_plots || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Commercial:</span>
                                  <span className="font-semibold">{societyData.statistics?.commercial_plots || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Avg. Size:</span>
                                  <span className="font-semibold">{societyData.statistics?.average_plot_size_marlas?.toFixed(1) || 0} marlas</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-3 border rounded-lg">
                              <div className="text-sm font-semibold mb-2">Infrastructure</div>
                              <div className="space-y-1 text-xs">
                                {societyData.statistics?.infrastructure && Object.entries(societyData.statistics.infrastructure).map(([key, value]) => (
                                  value > 0 && (
                                    <div key={key} className="flex justify-between">
                                      <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                                      <span className="font-semibold">{value}</span>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Density Info */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs">
                            <div className="font-semibold mb-1">Population Density</div>
                            <div className="text-muted-foreground">
                              {societyData.statistics?.population_density?.toFixed(0) || 0} people per hectare
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Enhanced Statistics Dashboard */}
                    {zoningResult.statistics && (
                      <div className="mt-6 space-y-6">
                        {/* Overview Stats */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Area Overview</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">Total Area</div>
                                <div className="text-xl font-bold mt-1">
                                  {(zoningResult.statistics.total_area_sqm / 1000).toFixed(2)}K
                                </div>
                                <div className="text-xs text-muted-foreground">sqm</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">Marlas</div>
                                <div className="text-xl font-bold mt-1">
                                  {zoningResult.statistics.total_area_marlas?.toFixed(0) || 'N/A'}
                                </div>
                                <div className="text-xs text-muted-foreground">units</div>
                              </div>
                              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">Acres</div>
                                <div className="text-xl font-bold mt-1">
                                  {(zoningResult.statistics.total_area_sqm / 4046.86).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">ac</div>
                              </div>
                              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">Hectares</div>
                                <div className="text-xl font-bold mt-1">
                                  {(zoningResult.statistics.total_area_sqm / 10000).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">ha</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Zone Breakdown with Enhanced Details */}
                        {zoningResult.statistics.zones && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Zone Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {Object.entries(zoningResult.statistics.zones).map(([zoneName, zoneData]) => {
                                  const color = {
                                    residential: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
                                    commercial: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20',
                                    green_space: 'border-green-500 bg-green-50 dark:bg-green-950/20',
                                    roads: 'border-gray-500 bg-gray-50 dark:bg-gray-950/20',
                                    industrial: 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                                  }[zoneName] || 'border-gray-300';
                                  
                                  return (
                                    <div key={zoneName} className={`rounded-lg p-4 border-l-4 ${color}`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-semibold capitalize">
                                          {zoneName.replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-2xl font-bold">{zoneData.percentage}%</div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                          <div className="text-muted-foreground">Square Meters</div>
                                          <div className="font-semibold">{zoneData.area_sqm?.toLocaleString()}</div>
                                        </div>
                                        <div>
                                          <div className="text-muted-foreground">Marlas</div>
                                          <div className="font-semibold">{zoneData.area_marlas?.toFixed(1)}</div>
                                        </div>
                                        <div>
                                          <div className="text-muted-foreground">Acres</div>
                                          <div className="font-semibold">{(zoneData.area_sqm / 4046.86).toFixed(2)}</div>
                                        </div>
                                      </div>
                                      {/* Population/Capacity Estimates */}
                                      {zoneName === 'residential' && (
                                        <div className="mt-3 pt-3 border-t text-xs">
                                          <div className="text-muted-foreground">Est. Population</div>
                                          <div className="font-semibold">
                                            ~{Math.round(zoneData.area_sqm / 100 * 3.5).toLocaleString()} people
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            (Assuming 35 ppl/hectare density)
                                          </div>
                                        </div>
                                      )}
                                      {zoneName === 'commercial' && (
                                        <div className="mt-3 pt-3 border-t text-xs">
                                          <div className="text-muted-foreground">Est. Jobs</div>
                                          <div className="font-semibold">
                                            ~{Math.round(zoneData.area_sqm / 50).toLocaleString()} jobs
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            (Assuming 1 job per 50 sqm)
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Infrastructure Needs */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Infrastructure Needs</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              const residentialArea = zoningResult.statistics.zones?.residential?.area_sqm || 0;
                              const population = Math.round(residentialArea / 100 * 3.5);
                              
                              return (
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="p-3 bg-muted rounded-lg">
                                    <div className="text-muted-foreground text-xs">Schools Needed</div>
                                    <div className="font-bold text-lg">{Math.ceil(population / 1000)}</div>
                                    <div className="text-xs text-muted-foreground">1 per 1000 people</div>
                                  </div>
                                  <div className="p-3 bg-muted rounded-lg">
                                    <div className="text-muted-foreground text-xs">Healthcare</div>
                                    <div className="font-bold text-lg">{Math.ceil(population / 2000)}</div>
                                    <div className="text-xs text-muted-foreground">1 per 2000 people</div>
                                  </div>
                                  <div className="p-3 bg-muted rounded-lg">
                                    <div className="text-muted-foreground text-xs">Mosques</div>
                                    <div className="font-bold text-lg">{Math.ceil(population / 500)}</div>
                                    <div className="text-xs text-muted-foreground">1 per 500 people</div>
                                  </div>
                                  <div className="p-3 bg-muted rounded-lg">
                                    <div className="text-muted-foreground text-xs">Parks Required</div>
                                    <div className="font-bold text-lg">{Math.ceil(population / 750)}</div>
                                    <div className="text-xs text-muted-foreground">1 per 750 people</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                        
                        {/* Compliance Check */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Compliance Status</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {(() => {
                              const checks = [];
                              const greenSpace = percentages.green_space;
                              const roads = percentages.roads;
                              
                              checks.push({
                                label: 'Minimum Green Space (15%)',
                                status: greenSpace >= 15,
                                value: `${greenSpace}%`
                              });
                              
                              checks.push({
                                label: 'Road Coverage (12-18%)',
                                status: roads >= 12 && roads <= 18,
                                value: `${roads}%`
                              });
                              
                              checks.push({
                                label: 'Mixed-Use Balance',
                                status: percentages.residential + percentages.commercial >= 50,
                                value: `${percentages.residential + percentages.commercial}%`
                              });
                              
                              return checks.map((check, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                                  <div className="flex items-center gap-2">
                                    {check.status ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                    )}
                                    <span className="text-sm">{check.label}</span>
                                  </div>
                                  <span className={`text-sm font-semibold ${check.status ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {check.value}
                                  </span>
                                </div>
                              ));
                            })()}
                          </CardContent>
                        </Card>
                        
                        {/* Environmental Impact */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Environmental Impact</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              const greenSpace = zoningResult.statistics.zones?.green_space?.area_sqm || 0;
                              const totalArea = zoningResult.statistics.total_area_sqm;
                              const greenPercentage = (greenSpace / totalArea) * 100;
                              
                              const carbonScore = Math.min(100, Math.round(greenPercentage * 3 + 25));
                              const waterScore = Math.min(100, Math.round(greenPercentage * 2.5 + 30));
                              
                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">Carbon Offset Score</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-green-500"
                                          style={{ width: `${carbonScore}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-bold">{carbonScore}/100</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">Water Management</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-blue-500"
                                          style={{ width: `${waterScore}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-bold">{waterScore}/100</span>
                                    </div>
                                  </div>
                                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-xs">
                                    <div className="font-semibold text-green-700 dark:text-green-400 mb-1">
                                      🌱 Sustainability Rating
                                    </div>
                                    <div className="text-muted-foreground">
                                      {carbonScore > 70 ? 'Excellent - Highly sustainable development' :
                                       carbonScore > 50 ? 'Good - Meets sustainability standards' :
                                       'Fair - Consider increasing green coverage'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                        
                        {/* Restrictions */}
                        {zoningResult.statistics.restricted_zones && zoningResult.statistics.restricted_zones.length > 0 && (
                          <Card className="border-red-200">
                            <CardHeader>
                              <CardTitle className="text-lg text-red-600 dark:text-red-400">
                                ⚠️ Terrain Restrictions
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {zoningResult.statistics.restricted_zones.map((restriction, idx) => (
                                <div key={idx} className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border-l-4 border-red-500">
                                  <div className="font-medium capitalize text-sm">
                                    {restriction.type.replace(/_/g, ' ')}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Severity: <span className="font-semibold">{restriction.severity}</span>
                                    {restriction.percentage && ` • ${restriction.percentage.toFixed(1)}% affected`}
                                    {restriction.max_slope && ` • Max slope: ${restriction.max_slope.toFixed(1)}°`}
                                    {restriction.soil_loss && ` • Soil loss: ${restriction.soil_loss.toFixed(1)} t/ha/yr`}
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
                    <AlertTriangle className="w-16 h-16 mb-4 opacity-20" />
                    <p>Failed to generate visualization</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase 2: Comparison Mode */}
            {showComparison && history.length >= 2 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitCompare className="w-5 h-5" />
                    History Comparison
                  </CardTitle>
                  <CardDescription>
                    Compare different zoning scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {history.slice(-2).map((entry, idx) => (
                      <div key={entry.id} className="border rounded-lg p-4">
                        <div className="mb-3">
                          <div className="font-semibold">{entry.polygonName}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </div>
                        </div>
                        
                        {/* Percentages Comparison */}
                        <div className="space-y-2 mb-4">
                          <div className="text-xs font-semibold">Distribution</div>
                          {Object.entries(entry.percentages).map(([zone, pct]) => (
                            <div key={zone} className="flex items-center justify-between text-xs">
                              <span className="capitalize">{zone.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-10 text-right font-semibold">{pct}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Key Statistics */}
                        {entry.result?.statistics && (
                          <div className="border-t pt-3">
                            <div className="text-xs font-semibold mb-2">Key Metrics</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">Total Area</div>
                                <div className="font-semibold">
                                  {(entry.result.statistics.total_area_sqm / 1000).toFixed(1)}K sqm
                                </div>
                              </div>
                              {entry.result.statistics.zones?.residential && (
                                <div>
                                  <div className="text-muted-foreground">Est. Population</div>
                                  <div className="font-semibold">
                                    ~{Math.round(entry.result.statistics.zones.residential.area_sqm / 100 * 3.5).toLocaleString()}
                                  </div>
                                </div>
                              )}
                              {entry.result.statistics.zones?.green_space && (
                                <div>
                                  <div className="text-muted-foreground">Green Space</div>
                                  <div className="font-semibold">
                                    {entry.result.statistics.zones.green_space.percentage}%
                                  </div>
                                </div>
                              )}
                              {entry.result.statistics.restricted_zones?.length > 0 && (
                                <div>
                                  <div className="text-muted-foreground">Restrictions</div>
                                  <div className="font-semibold text-red-600">
                                    {entry.result.statistics.restricted_zones.length} areas
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <Button
                          onClick={() => loadHistoryEntry(history.indexOf(entry))}
                          variant="outline"
                          size="sm"
                          className="w-full mt-3 text-xs"
                        >
                          Load This Version
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Difference Highlight */}
                  {history.length >= 2 && (() => {
                    const latest = history[history.length - 1];
                    const previous = history[history.length - 2];
                    const changes = [];
                    
                    Object.entries(latest.percentages).forEach(([zone, pct]) => {
                      const diff = pct - (previous.percentages[zone] || 0);
                      if (diff !== 0) {
                        changes.push({
                          zone,
                          change: diff,
                          direction: diff > 0 ? 'increased' : 'decreased'
                        });
                      }
                    });
                    
                    return changes.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="text-sm font-semibold mb-2">Key Changes</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {changes.map(({ zone, change, direction }) => (
                            <div key={zone} className="flex items-center gap-2">
                              <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
                                {change > 0 ? '↑' : '↓'}
                              </span>
                              <span className="capitalize">{zone.replace(/_/g, ' ')}</span>
                              <span className="font-semibold">
                                {Math.abs(change)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ZoningGenerator;

