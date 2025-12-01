import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw/dist/leaflet.draw.js";
import { ImageOverlay } from "react-leaflet";

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Patch for readableArea bug in leaflet.draw
if (L.GeometryUtil && !L.GeometryUtil._patched) {
  L.GeometryUtil.readableArea = function (area, isMetric, precision = 2) {
    let units;
    let value = area;

    if (isMetric) {
      units = "m²";
      if (area >= 1000000) {
        units = "km²";
        value = area / 1000000;
      }
    } else {
      units = "yd²";
      if (area >= 3097600) {
        units = "mi²";
        value = area / 3097600;
      }
    }

    return `${value.toFixed(precision)} ${units}`;
  };

  L.GeometryUtil._patched = true;
}

// Validation helper function
const validatePolygonGeometry = (layer) => {
  const validation = {
    is_valid: true,
    errors: [],
    warnings: [],
    info: []
  };

  try {
    const geoJSON = layer.toGeoJSON();
    const geometry = geoJSON.geometry;
    
    if (geometry.type !== 'Polygon') {
      validation.errors.push(`Invalid geometry type: ${geometry.type}, expected Polygon`);
      validation.is_valid = false;
      return validation;
    }

    const coordinates = geometry.coordinates[0];
    
    if (coordinates.length < 4) {
      validation.errors.push(`Insufficient coordinates: ${coordinates.length}, minimum 4 required`);
      validation.is_valid = false;
    }

    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      validation.errors.push('Polygon is not properly closed');
      validation.is_valid = false;
    }

    const bounds = layer.getBounds();
    const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
    
    validation.info.push(`Area: ${L.GeometryUtil.readableArea(area, true)}`);
    validation.info.push(`Bounds: ${bounds.toBBoxString()}`);

    if (area < 1000) {
      validation.warnings.push('Very small area selected - results may have limited detail');
    } else if (area > 1000000000) {
      validation.warnings.push('Large area selected - processing may take longer');
    }

    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    if (south < -90 || north > 90) {
      validation.errors.push('Latitude values outside valid range [-90, 90]');
      validation.is_valid = false;
    }

    if (west < -180 || east > 180) {
      validation.errors.push('Longitude values outside valid range [-180, 180]');
      validation.is_valid = false;
    }

    const latSpan = north - south;
    const lngSpan = east - west;
    
    if (latSpan < 0.001 || lngSpan < 0.001) {
      validation.warnings.push('Very small geographic extent - consider zooming in for better precision');
    }

    validation.info.push(`Coordinate span: ${latSpan.toFixed(6)}° lat, ${lngSpan.toFixed(6)}° lng`);
    validation.info.push(`Vertices: ${coordinates.length - 1}`);

  } catch (error) {
    validation.errors.push(`Geometry validation error: ${error.message}`);
    validation.is_valid = false;
  }

  return validation;
};

const validateAndPreviewPolygon = async (geojson) => {
  try {
    const response = await fetch("http://localhost:8000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geojson)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const error = await response.json();
      return { success: false, error };
    }
  } catch (err) {
    console.error("Validation request failed:", err);
    return { success: false, error: { message: err.message } };
  }
};

function MapDraw({ onAreaSelect, demUrl, projectLocation, selectedProject }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const styleRef = useRef(null);
  const initializedRef = useRef(false);
  const baseLayersRef = useRef({});
  const selectedProjectRef = useRef(selectedProject);
  const onAreaSelectRef = useRef(onAreaSelect);
  
  const [validationResults, setValidationResults] = useState([]);
  const [showValidation, setShowValidation] = useState(true);
  const [validationMode, setValidationMode] = useState('normal');

  const showValidationPopup = useCallback((layer, validation) => {
    let popupContent = '<div class="validation-popup">';
    
    if (validation.is_valid) {
      popupContent += '<h4 style="color: #4CAF50;">✓ Valid Polygon</h4>';
    } else {
      popupContent += '<h4 style="color: #f44336;">✗ Invalid Polygon</h4>';
    }

    if (validation.errors && validation.errors.length > 0) {
      popupContent += '<div class="popup-errors"><strong>Errors:</strong><ul>';
      validation.errors.forEach(error => {
        popupContent += `<li style="color: #f44336;">• ${error}</li>`;
      });
      popupContent += '</ul></div>';
    }

    if (validation.warnings && validation.warnings.length > 0) {
      popupContent += '<div class="popup-warnings"><strong>Warnings:</strong><ul>';
      validation.warnings.forEach(warning => {
        popupContent += `<li style="color: #FF9800;">• ${warning}</li>`;
      });
      popupContent += '</ul></div>';
    }

    if (validation.info && validation.info.length > 0) {
      popupContent += '<div class="popup-info"><strong>Info:</strong><ul>';
      validation.info.forEach(info => {
        popupContent += `<li style="color: #2196F3;">• ${info}</li>`;
      });
      popupContent += '</ul></div>';
    }

    popupContent += '</div>';

    layer.bindPopup(popupContent, {
      maxWidth: 350,
      className: validation.is_valid ? 'valid-popup' : 'invalid-popup'
    }).openPopup();
  }, []);

  // Initialize map only once when component mounts
  useEffect(() => {
    // Check if already initialized
    if (initializedRef.current || !mapContainerRef.current) {
      return;
    }

    console.log('Initializing map...');
    initializedRef.current = true;

    // Check if container already has a map
    if (mapContainerRef.current._leaflet_id) {
      console.log('Map container already initialized, skipping...');
      return;
    }

    try {
      // Determine initial center and zoom based on project location
      let initialCenter = [20, 0];
      let initialZoom = 2;
      
      if (projectLocation) {
        initialCenter = [projectLocation.lat, projectLocation.lng];
        initialZoom = 15;
        console.log("Centering map on project location:", projectLocation);
      }

      // Create map instance
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: true,
        preferCanvas: true
      });

      mapRef.current = map;

      // Define base layers
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      });

      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      });

      const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
        maxZoom: 17
      });

      // Add OpenStreetMap as default
      osmLayer.addTo(map);

      // Store layers for layer control
      baseLayersRef.current = {
        "OpenStreetMap": osmLayer,
        "Satellite": satelliteLayer,
        "Terrain": terrainLayer
      };

      // Create feature group
      const drawnItems = new L.FeatureGroup();
      drawnItemsRef.current = drawnItems;
      map.addLayer(drawnItems);

      // Configure draw control
      const drawControl = new L.Control.Draw({
        draw: {
          marker: false,
          circle: false,
          circlemarker: false,
          polyline: false,
          rectangle: {
            shapeOptions: {
              color: '#3388ff',
              weight: 2,
              fillOpacity: 0.2
            }
          },
          polygon: {
            shapeOptions: {
              color: '#3388ff',
              weight: 2,
              fillOpacity: 0.2
            },
            allowIntersection: false
          }
        },
        edit: {
          featureGroup: drawnItems,
          remove: true
        }
      });

      map.addControl(drawControl);

      // Add layer control to map
      L.control.layers(baseLayersRef.current, null, {
        position: 'topright',
        collapsed: true
      }).addTo(map);

      // Add project location marker if available
      if (projectLocation) {
        const projectMarker = L.marker([projectLocation.lat, projectLocation.lng], {
          icon: L.divIcon({
            className: 'project-location-marker',
            html: '<div style="background: #ff6b35; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">P</div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map);
        
        projectMarker.bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #ff6b35;">${selectedProject?.title || 'Project Location'}</h4>
            <p style="margin: 0 0 4px 0;"><strong>Location:</strong> ${projectLocation.address || 'Unknown'}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">
              <strong>Coordinates:</strong> ${projectLocation.lat.toFixed(6)}, ${projectLocation.lng.toFixed(6)}
            </p>
          </div>
        `).openPopup();
      }

      // Handle draw events
      map.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        
        // Store current view to prevent auto-zoom
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        
        const validation = validatePolygonGeometry(layer);
        
        let processValidation = { ...validation };
        if (validationMode === 'permissive') {
          processValidation.warnings = [...(processValidation.warnings || []), ...(processValidation.errors || [])];
          processValidation.errors = [];
          processValidation.is_valid = true;
        } else if (validationMode === 'normal' && validation.warnings && validation.warnings.length > 0 && validation.errors.length === 0) {
          processValidation.is_valid = true;
        }
        
        setValidationResults(prev => [...prev, {
          id: Date.now(),
          layer: layer,
          validation: processValidation,
          timestamp: new Date().toISOString()
        }]);

        // Style layer
        layer.setStyle({
          color: processValidation.is_valid ? '#4CAF50' : '#f44336',
          weight: 3,
          fillOpacity: 0.2,
          dashArray: processValidation.is_valid ? null : '5, 5'
        });

        // Add to feature group WITHOUT auto-fitting
        drawnItems.addLayer(layer);
        
        // Restore original view
        map.setView(currentCenter, currentZoom);

        if (showValidation) {
          showValidationPopup(layer, processValidation);
        }

        // Extract bounds
        const bounds = layer.getBounds();
        const areaBounds = {
          latMin: bounds.getSouth(),
          latMax: bounds.getNorth(), 
          lngMin: bounds.getWest(),
          lngMax: bounds.getEast()
        };

        // Call parent callback - use refs to get latest values
        const currentProject = selectedProjectRef.current;
        const currentOnAreaSelect = onAreaSelectRef.current;
        
        console.log("MapDraw: Polygon created - currentProject from ref:", currentProject?.title || "null", "ID:", currentProject?.id || "null");
        
        if (currentOnAreaSelect) {
          // Check if project is selected before calling handler
          if (!currentProject) {
            console.warn("Cannot save polygon: No project selected (ref is null)");
            layer.bindPopup(`
              <div style="text-align: center; padding: 10px;">
                <h4 style="color: #f44336; margin: 0 0 10px 0;">⚠️ Project Required</h4>
                <p style="margin: 0; color: #666;">Please select a project before creating polygons.</p>
              </div>
            `).openPopup();
            return;
          }
          
          const geojson = layer.toGeoJSON();
          console.log("MapDraw: Calling onAreaSelect with project:", currentProject?.title, "ID:", currentProject?.id);
          currentOnAreaSelect(geojson).catch(error => {
            console.error("onAreaSelect failed:", error);
            layer.bindPopup(`
              <div style="text-align: center; padding: 10px;">
                <h4 style="color: #f44336; margin: 0 0 10px 0;">❌ Error</h4>
                <p style="margin: 0; color: #666;">${error.message || 'Failed to save polygon'}</p>
              </div>
            `).openPopup();
          });
        }

      });

      // Handle edit events
      map.on(L.Draw.Event.EDITED, (event) => {
        event.layers.eachLayer((layer) => {
          const validation = validatePolygonGeometry(layer);
          
          let processValidation = { ...validation };
          if (validationMode === 'permissive') {
            processValidation.warnings = [...(processValidation.warnings || []), ...(processValidation.errors || [])];
            processValidation.errors = [];
            processValidation.is_valid = true;
          } else if (validationMode === 'normal' && validation.warnings && validation.warnings.length > 0 && validation.errors.length === 0) {
            processValidation.is_valid = true;
          }
          
          setValidationResults(prev => prev.map(result => 
            result.layer === layer 
              ? { ...result, validation: processValidation, timestamp: new Date().toISOString() }
              : result
          ));

          layer.setStyle({
            color: processValidation.is_valid ? '#4CAF50' : '#f44336',
            weight: 3,
            fillOpacity: 0.2,
            dashArray: processValidation.is_valid ? null : '5, 5'
          });

          if (showValidation) {
            showValidationPopup(layer, processValidation);
          }
        });
      });

      // Handle delete events
      map.on(L.Draw.Event.DELETED, (event) => {
        event.layers.eachLayer((layer) => {
          setValidationResults(prev => prev.filter(result => result.layer !== layer));
        });
      });

      // Add CSS styles
      const style = document.createElement('style');
      style.textContent = `
        .map-validation-panel {
          background: white;
          border-top: 1px solid #ddd;
          padding: 15px;
          max-height: 300px;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .validation-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .validation-panel-header h4 {
          margin: 0;
          font-size: 16px;
          color: #333;
        }
        .validation-mode-indicator {
          font-size: 12px;
          color: #666;
        }
        .mode-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 10px;
        }
        .mode-strict { background: #ffebee; color: #d32f2f; }
        .mode-normal { background: #e3f2fd; color: #1976d2; }
        .mode-permissive { background: #f3e5f5; color: #7b1fa2; }
        .validation-summary {
          margin-bottom: 15px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .summary-stats {
          display: flex;
          gap: 15px;
          font-size: 12px;
        }
        .validation-item {
          border-left: 4px solid;
          padding: 10px;
          margin-bottom: 10px;
          background: #fafafa;
          border-radius: 4px;
        }
        .validation-item.valid { border-left-color: #4CAF50; }
        .validation-item.invalid { border-left-color: #f44336; }
        
        /* Leaflet control styles */
        .leaflet-draw-toolbar {
          margin-top: 10px !important;
        }
        .leaflet-draw-actions {
          background: white !important;
          border: 1px solid #ccc !important;
        }
        
        /* Layer control styles */
        .leaflet-control-layers {
          background: white !important;
          border-radius: 5px !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        .leaflet-control-layers-toggle {
          background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTIgMTdMMTIgMjJMMjIgMTciIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTIgMTJMMTIgMTdMMjIgMTIiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+') !important;
        }
        .leaflet-control-layers-list label {
          font-size: 12px !important;
          margin-bottom: 5px !important;
        }
        .leaflet-control-layers-expanded {
          padding: 10px !important;
          min-width: 150px !important;
        }
      `;
      document.head.appendChild(style);
      styleRef.current = style;

    } catch (error) {
      console.error('Error initializing map:', error);
      initializedRef.current = false;
    }

    // Cleanup function - only runs when component unmounts
    return () => {
      console.log('Cleaning up map...');
      
      if (mapRef.current) {
        try {
          // Remove the map properly
          mapRef.current.remove();
          mapRef.current = null;
        } catch (error) {
          console.warn('Error removing map:', error);
        }
      }
      
      // Remove style element
      if (styleRef.current && styleRef.current.parentNode) {
        styleRef.current.parentNode.removeChild(styleRef.current);
        styleRef.current = null;
      }
      
      initializedRef.current = false;
    };
  }, []); // Empty dependency array - runs only on mount/unmount

  // Keep refs in sync with props
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
    onAreaSelectRef.current = onAreaSelect;
    console.log("MapDraw: Updated refs - selectedProject:", selectedProject?.title || "null");
  }, [selectedProject, onAreaSelect]);

  // Effect for validation controls - runs when validation settings change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing validation control if any
    const existingControl = mapRef.current._validationControl;
    if (existingControl) {
      mapRef.current.removeControl(existingControl);
    }

    // Add new validation control
    const ValidationControl = L.Control.extend({
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.innerHTML = `
          <div style="padding: 10px; background: white; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); min-width: 180px; margin-bottom: 10px;">
            <h4 style="margin: 0 0 8px 0; font-size: 12px;">Validation Settings</h4>
            <label style="display: block; margin-bottom: 5px; font-size: 11px;">
              <input type="checkbox" ${showValidation ? 'checked' : ''}> Show Validation
            </label>
            <select style="width: 100%; font-size: 11px; padding: 2px;">
              <option value="strict" ${validationMode === 'strict' ? 'selected' : ''}>Strict</option>
              <option value="normal" ${validationMode === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="permissive" ${validationMode === 'permissive' ? 'selected' : ''}>Permissive</option>
            </select>
          </div>
        `;

        // Add event listeners
        const checkbox = container.querySelector('input[type="checkbox"]');
        const select = container.querySelector('select');
        
        checkbox.addEventListener('change', (e) => setShowValidation(e.target.checked));
        select.addEventListener('change', (e) => setValidationMode(e.target.value));

        L.DomEvent.disableClickPropagation(container);
        return container;
      }
    });

    const validationControl = new ValidationControl({ position: 'topright' });
    mapRef.current.addControl(validationControl);
    mapRef.current._validationControl = validationControl;

  }, [showValidation, validationMode]);

  // Effect to handle project location changes
  useEffect(() => {
    if (!mapRef.current || !projectLocation) return;

    // Center map on project location
    mapRef.current.setView([projectLocation.lat, projectLocation.lng], 15);
    
    // Add or update project marker
    const existingMarker = mapRef.current._projectMarker;
    if (existingMarker) {
      mapRef.current.removeLayer(existingMarker);
    }

    const projectMarker = L.marker([projectLocation.lat, projectLocation.lng], {
      icon: L.divIcon({
        className: 'project-location-marker',
        html: '<div style="background: #ff6b35; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">P</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(mapRef.current);
    
    projectMarker.bindPopup(`
      <div style="min-width: 200px;">
        <h4 style="margin: 0 0 8px 0; color: #ff6b35;">${selectedProject?.title || 'Project Location'}</h4>
        <p style="margin: 0 0 4px 0;"><strong>Location:</strong> ${projectLocation.address || 'Unknown'}</p>
        <p style="margin: 0; font-size: 12px; color: #666;">
          <strong>Coordinates:</strong> ${projectLocation.lat.toFixed(6)}, ${projectLocation.lng.toFixed(6)}
        </p>
      </div>
    `);

    // Store reference for cleanup
    mapRef.current._projectMarker = projectMarker;

    console.log("Map centered on project location:", projectLocation);
  }, [projectLocation, selectedProject]);

  const [mapReady, setMapReady] = useState(false);


  return (
    <div className="w-full h-[500px] border-2 border-primary/20 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 hover:border-primary/40 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)]">
      <div ref={mapContainerRef} id="map" style={{ height: "70vh", width: "100%" }} />
       {/* DEM overlay */}
      {mapReady && demUrl && demBounds && (
        <ImageOverlay
          url={demUrl}
          bounds={[[demBounds.getSouth(), demBounds.getWest()], [demBounds.getNorth(), demBounds.getEast()]]}
          opacity={0.6}
        />
      )}
      {showValidation && validationResults.length > 0 && (
        <div className="border-2 rounded-2xl p-6 bg-white dark:bg-slate-800 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:right-0 before:w-[100px] before:h-[100px] before:opacity-10 before:rounded-full before:translate-x-[30%] before:-translate-y-[30%]">
          <div className="flex items-center justify-between mb-4">
            <h4>Polygon Validation Results</h4>
            <div className="validation-mode-indicator">
              Mode: <span className={`mode-badge mode-${validationMode}`}>{validationMode}</span>
            </div>
          </div>
          
          <div className="validation-summary">
            <div className="summary-stats">
              <span className="total-count">Total: {validationResults.length}</span>
              <span className="valid-count">Valid: {validationResults.filter(r => r.validation.is_valid).length}</span>
              <span className="invalid-count">Invalid: {validationResults.filter(r => !r.validation.is_valid).length}</span>
            </div>
          </div>
       
          <div className="validation-list">
            {validationResults.slice(-3).map((result) => (
              <div key={result.id} className={`validation-item ${result.validation.is_valid ? 'valid' : 'invalid'}`}>
                <div className="validation-header">
                  <span className={`status-indicator ${result.validation.is_valid ? 'success' : 'error'}`}>
                    {result.validation.is_valid ? '✓' : '✗'} Polygon
                  </span>
                  <span className="timestamp">{new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
                
                {result.validation.errors && result.validation.errors.length > 0 && (
                  <div className="validation-details">
                    <div className="error-list">
                      {result.validation.errors.map((error, i) => (
                        <div key={i} className="error-item">• {error}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.validation.warnings && result.validation.warnings.length > 0 && (
                  <div className="validation-details">
                    <div className="warning-list">
                      {result.validation.warnings.map((warning, i) => (
                        <div key={i} className="warning-item">• {warning}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MapDraw;






