import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SuitabilityMap = ({ polygon, heatmapUrl, suitabilityData, warnings }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonLayerRef = useRef(null);
  const heatmapLayerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [0, 0],
        zoom: 10,
        zoomControl: true,
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing layers
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
    }
    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
    }

    // Add polygon if available
    if (polygon && polygon.geojson) {
      const geoJson = typeof polygon.geojson === 'string' 
        ? JSON.parse(polygon.geojson) 
        : polygon.geojson;
      
      const geometry = geoJson.geometry || geoJson;
      const coordinates = geometry.coordinates || [];

      if (coordinates.length > 0) {
        // Convert coordinates to Leaflet format [lat, lng]
        const latLngs = coordinates[0].map(coord => [coord[1], coord[0]]);
        
        const polygonLayer = L.polygon(latLngs, {
          color: '#3388ff',
          weight: 3,
          fillColor: '#3388ff',
          fillOpacity: 0.2,
        }).addTo(map);

        // Add popup with polygon info
        polygonLayer.bindPopup(`
          <div style="padding: 10px;">
            <h4 style="margin: 0 0 10px 0;">${polygon.name || 'Polygon'}</h4>
            <p style="margin: 5px 0;"><strong>Area:</strong> Analyzing...</p>
            ${suitabilityData ? `
              <p style="margin: 5px 0;"><strong>Suitability:</strong> ${suitabilityData.classification || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Score:</strong> ${(suitabilityData.score || 0).toFixed(2)}</p>
            ` : ''}
          </div>
        `);

        polygonLayerRef.current = polygonLayer;

        // Fit map to polygon bounds
        map.fitBounds(polygonLayer.getBounds(), { padding: [50, 50] });
      }
    }

    // Add heatmap overlay if available
    if (heatmapUrl && polygon && polygon.geojson) {
      const geoJson = typeof polygon.geojson === 'string' 
        ? JSON.parse(polygon.geojson) 
        : polygon.geojson;
      
      const geometry = geoJson.geometry || geoJson;
      const coordinates = geometry.coordinates || [];

      if (coordinates.length > 0) {
        const latLngs = coordinates[0].map(coord => [coord[1], coord[0]]);
        const bounds = L.latLngBounds(latLngs);

        const imageOverlay = L.imageOverlay(heatmapUrl, bounds, {
          opacity: 0.7,
          interactive: true,
        }).addTo(map);

        heatmapLayerRef.current = imageOverlay;
      }
    }

    // Add warning markers if available
    if (warnings && warnings.length > 0) {
      warnings.forEach((warning, index) => {
        if (warning.location && warning.location.lat && warning.location.lng) {
          const icon = L.divIcon({
            className: 'warning-marker',
            html: `<div style="
              background-color: ${warning.severity === 'high' ? '#dc2626' : warning.severity === 'medium' ? '#f59e0b' : '#3b82f6'};
              color: white;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">⚠️</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          L.marker([warning.location.lat, warning.location.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="padding: 10px; max-width: 250px;">
                <h4 style="margin: 0 0 10px 0; color: ${warning.severity === 'high' ? '#dc2626' : warning.severity === 'medium' ? '#f59e0b' : '#3b82f6'};">
                  ${warning.severity === 'high' ? '🚨 High Risk' : warning.severity === 'medium' ? '⚠️ Medium Risk' : 'ℹ️ Warning'}
                </h4>
                <p style="margin: 5px 0;"><strong>${warning.type}:</strong></p>
                <p style="margin: 5px 0;">${warning.message}</p>
                ${warning.recommendation ? `<p style="margin: 10px 0 0 0; font-style: italic; color: #666;">💡 ${warning.recommendation}</p>` : ''}
              </div>
            `);
        }
      });
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [polygon, heatmapUrl, suitabilityData, warnings]);

  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />
      {!polygon && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#666',
          zIndex: 1000,
        }}>
          <p>Select a polygon to view suitability analysis</p>
        </div>
      )}
    </div>
  );
};

export default SuitabilityMap;

