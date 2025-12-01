import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TerrainAnalysisPanel from "../analysis/TerrainAnalysisPanel";
import MainLayout from "@/components/layout/MainLayout";
import { authHelper, authenticatedFetch } from "@/utils/authHelper";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from "react-leaflet";
import { toast } from "sonner";
import { FileText, Mountain, FolderOpen, MapPin, Microscope, RefreshCw, Rocket, Map, AlertTriangle, Droplet } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
	iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const API_BASE_URL = "http://localhost:8000"; // Node.js backend for auth/projects
const PYTHON_API_URL = "http://localhost:5002"; // Python backend for terrain analysis

// Helper function to validate a single coordinate
const isValidCoordinate = (coord) => {
	if (!Array.isArray(coord) || coord.length < 2) return false;
	const [lon, lat] = coord;
	if (typeof lon !== 'number' || typeof lat !== 'number') return false;
	if (lon === undefined || lat === undefined || lon === null || lat === null) return false;
	if (isNaN(lon) || isNaN(lat)) return false;
	if (!isFinite(lon) || !isFinite(lat)) return false;
	return true;
};

// Helper function to clean coordinates by filtering out invalid ones
const cleanCoordinates = (coords, geometryType) => {
	if (!Array.isArray(coords)) return coords;
	
	if (geometryType === "Point") {
		return isValidCoordinate(coords) ? coords : null;
	} else if (geometryType === "LineString") {
		const cleaned = coords.filter(coord => isValidCoordinate(coord));
		return cleaned.length >= 2 ? cleaned : null;
	} else if (geometryType === "Polygon") {
		const cleaned = coords.map(ring => {
			if (!Array.isArray(ring)) return null;
			const cleanedRing = ring.filter(coord => isValidCoordinate(coord));
			return cleanedRing.length >= 3 ? cleanedRing : null;
		}).filter(ring => ring !== null);
		return cleaned.length > 0 ? cleaned : null;
	} else if (geometryType === "MultiLineString") {
		const cleaned = coords.map(lineString => {
			if (!Array.isArray(lineString)) return null;
			const cleanedLine = lineString.filter(coord => isValidCoordinate(coord));
			return cleanedLine.length >= 2 ? cleanedLine : null;
		}).filter(line => line !== null);
		return cleaned.length > 0 ? cleaned : null;
	} else if (geometryType === "MultiPolygon") {
		const cleaned = coords.map(polygon => {
			if (!Array.isArray(polygon)) return null;
			const cleanedPoly = polygon.map(ring => {
				if (!Array.isArray(ring)) return null;
				const cleanedRing = ring.filter(coord => isValidCoordinate(coord));
				return cleanedRing.length >= 3 ? cleanedRing : null;
			}).filter(ring => ring !== null);
			return cleanedPoly.length > 0 ? cleanedPoly : null;
		}).filter(poly => poly !== null);
		return cleaned.length > 0 ? cleaned : null;
	}
	
	return coords;
};

// Helper function to clean and validate GeoJSON
const cleanGeoJSON = (geojson) => {
	if (!geojson) return null;
	
	try {
		if (geojson.type === "Feature") {
			const cleanedCoords = cleanCoordinates(geojson.geometry?.coordinates, geojson.geometry?.type);
			if (!cleanedCoords) return null;
			return {
				...geojson,
				geometry: {
					...geojson.geometry,
					coordinates: cleanedCoords
				}
			};
		} else if (geojson.type === "FeatureCollection") {
			if (!geojson.features || !Array.isArray(geojson.features)) return null;
			const cleanedFeatures = geojson.features
				.map(feature => {
					if (!feature.geometry) return null;
					const cleanedCoords = cleanCoordinates(feature.geometry.coordinates, feature.geometry.type);
					if (!cleanedCoords) return null;
					return {
						...feature,
						geometry: {
							...feature.geometry,
							coordinates: cleanedCoords
						}
					};
				})
				.filter(feature => feature !== null);
			
			if (cleanedFeatures.length === 0) return null;
			return {
				...geojson,
				features: cleanedFeatures
			};
		} else if (geojson.type === "Polygon" || geojson.type === "LineString" || geojson.type === "Point" || 
		           geojson.type === "MultiLineString" || geojson.type === "MultiPolygon") {
			const cleanedCoords = cleanCoordinates(geojson.coordinates, geojson.type);
			if (!cleanedCoords) return null;
			return {
				...geojson,
				coordinates: cleanedCoords
			};
		}
		
		return null;
	} catch (error) {
		console.error("GeoJSON cleaning error:", error);
		return null;
	}
};

// Helper function to validate GeoJSON coordinates
const isValidGeoJSON = (geojson) => {
	if (!geojson) return false;
	
	try {
		// Handle Feature, FeatureCollection, or Geometry
		let geometries = [];
		if (geojson.type === "Feature") {
			if (geojson.geometry) geometries.push(geojson.geometry);
		} else if (geojson.type === "FeatureCollection") {
			// For FeatureCollection, validate ALL features
			if (!geojson.features || !Array.isArray(geojson.features) || geojson.features.length === 0) return false;
			geometries = geojson.features.map(f => f.geometry).filter(g => g);
		} else if (geojson.type === "Polygon" || geojson.type === "LineString" || geojson.type === "Point" ||
		           geojson.type === "MultiLineString" || geojson.type === "MultiPolygon") {
			geometries.push(geojson);
		} else {
			return false;
		}
		
		if (geometries.length === 0) return false;
		
		// Validate all geometries
		for (const geometry of geometries) {
			if (!geometry || !geometry.coordinates) return false;
			
			// Validate coordinates based on geometry type
			if (geometry.type === "Polygon") {
				if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) return false;
				const firstRing = geometry.coordinates[0];
				if (!Array.isArray(firstRing) || firstRing.length < 3) return false;
				
				// Check each coordinate is valid
				for (const coord of firstRing) {
					if (!isValidCoordinate(coord)) return false;
				}
			} else if (geometry.type === "LineString") {
				if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return false;
				for (const coord of geometry.coordinates) {
					if (!isValidCoordinate(coord)) return false;
				}
			} else if (geometry.type === "Point") {
				if (!isValidCoordinate(geometry.coordinates)) return false;
			} else if (geometry.type === "MultiLineString") {
				if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) return false;
				for (const lineString of geometry.coordinates) {
					if (!Array.isArray(lineString) || lineString.length < 2) return false;
					for (const coord of lineString) {
						if (!isValidCoordinate(coord)) return false;
					}
				}
			} else if (geometry.type === "MultiPolygon") {
				if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) return false;
				for (const polygon of geometry.coordinates) {
					if (!Array.isArray(polygon) || polygon.length === 0) return false;
					const firstRing = polygon[0];
					if (!Array.isArray(firstRing) || firstRing.length < 3) return false;
					for (const coord of firstRing) {
						if (!isValidCoordinate(coord)) return false;
					}
				}
			}
		}
		
		return true;
	} catch (error) {
		console.error("GeoJSON validation error:", error);
		return false;
	}
};

export default function Terrain() {
	const { user } = useAuth();
	const { currentProject } = useProject();
	const [polygons, setPolygons] = useState([]);
	const [selectedPolygon, setSelectedPolygon] = useState(null);
	const [analysisData, setAnalysisData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [waterBodiesGeoJSON, setWaterBodiesGeoJSON] = useState(null);
	const [floodRiskGeoJSON, setFloodRiskGeoJSON] = useState(null);
	const [hydrologyGeoJSON, setHydrologyGeoJSON] = useState(null);
	const [hydrologyData, setHydrologyData] = useState(null);
	const [showWaterBodies, setShowWaterBodies] = useState(true);
	const [showFloodRisk, setShowFloodRisk] = useState(true);
	const [showHydrology, setShowHydrology] = useState(true);
	const [mapCenter, setMapCenter] = useState([33.7, 73.1]);
	const [mapZoom, setMapZoom] = useState(13);
    const navigate = useNavigate();
	
	// Clean and validate GeoJSON data using useMemo to avoid re-computation
	const cleanedSelectedPolygonGeoJSON = useMemo(() => {
		if (!selectedPolygon?.geojson) return null;
		const cleaned = cleanGeoJSON(selectedPolygon.geojson);
		return cleaned && isValidGeoJSON(cleaned) ? cleaned : null;
	}, [selectedPolygon?.geojson]);
	
	const cleanedWaterBodiesGeoJSON = useMemo(() => {
		if (!waterBodiesGeoJSON) return null;
		const cleaned = cleanGeoJSON(waterBodiesGeoJSON);
		return cleaned && isValidGeoJSON(cleaned) ? cleaned : null;
	}, [waterBodiesGeoJSON]);
	
	const cleanedFloodRiskGeoJSON = useMemo(() => {
		if (!floodRiskGeoJSON) return null;
		const cleaned = cleanGeoJSON(floodRiskGeoJSON);
		return cleaned && isValidGeoJSON(cleaned) ? cleaned : null;
	}, [floodRiskGeoJSON]);
	
	const cleanedHydrologyGeoJSON = useMemo(() => {
		if (!hydrologyGeoJSON) return null;
		const cleaned = cleanGeoJSON(hydrologyGeoJSON);
		return cleaned && isValidGeoJSON(cleaned) ? cleaned : null;
	}, [hydrologyGeoJSON]);

	// Fetch polygons based on selected project
	useEffect(() => {
		const fetchPolygons = async () => {
			// Only fetch polygons if a project is selected
			if (!currentProject) {
				setPolygons([]);
				setSelectedPolygon(null);
				return;
			}

			try {
				// Always filter by project_id in analysis phase
				const url = `${API_BASE_URL}/api/polygon?project_id=${currentProject.id}`;
				const res = await authenticatedFetch(url);
				if (!res.ok) throw new Error(`Failed to fetch polygons (${res.status})`);
				const polygons = await res.json();
				
				setPolygons(polygons);
				console.log(`Fetched ${polygons.length} polygons for project: ${currentProject.title} (ID: ${currentProject.id})`);
			} catch (e) {
				setError(e.message);
			}
		};
		fetchPolygons();
	}, [currentProject]);

	// Load saved terrain analysis when polygon is selected
	useEffect(() => {
		const loadSavedAnalysis = async () => {
			if (!selectedPolygon || !currentProject) {
				// Clear analysis data if no polygon selected
				setAnalysisData(null);
				setWaterBodiesGeoJSON(null);
				setFloodRiskGeoJSON(null);
				setHydrologyGeoJSON(null);
				setHydrologyData(null);
				return;
			}

			try {
				console.log('Checking for saved terrain analysis for polygon:', selectedPolygon.id, 'project_id:', currentProject.id);
				const url = `${API_BASE_URL}/api/terrain_analysis?polygon_id=${selectedPolygon.id}&project_id=${currentProject.id}`;
				const res = await authenticatedFetch(url);
				
				if (res.ok) {
					const data = await res.json();
					console.log('📥 Backend response:', { status: data.status, has_terrain_analysis: !!data.terrain_analysis, keys: Object.keys(data) });
					
					if (data.status === 'success' && data.terrain_analysis) {
						const savedAnalysis = data.terrain_analysis;
						console.log('Found saved terrain analysis:', savedAnalysis.id);
						
						// Parse results if needed
						const results = typeof savedAnalysis.results === 'string' 
							? JSON.parse(savedAnalysis.results) 
							: (savedAnalysis.results || {});
						
						// Transform saved data to match the format expected by the UI
						const transformedData = {
							stats: savedAnalysis.stats || results.stats || {},
							validation: {},
							preview_url: savedAnalysis.preview_url || results.preview_url || null,
							tif_url: savedAnalysis.tif_url || results.tif_url || null,
							classified_url: savedAnalysis.classified_url || results.classified_url || null,
							json_url: savedAnalysis.json_url || results.json_url || null,
							slope_analysis: savedAnalysis.slope_analysis || results.slope_analysis || null,
							flood_analysis: savedAnalysis.flood_analysis || results.flood_risk_analysis || results.flood_analysis || null,
							erosion_analysis: savedAnalysis.erosion_analysis || results.erosion_analysis || null,
							water_availability: savedAnalysis.water_availability || results.water_availability || null,
							terrain_ruggedness: savedAnalysis.terrain_ruggedness || results.terrain_ruggedness || null,
							flow_accumulation_stats: savedAnalysis.flow_accumulation_stats || results.flow_accumulation_stats || null,
							parameters: results.parameters || {},
							// Mark as loaded from saved data
							loaded_from_saved: true,
							saved_at: savedAnalysis.created_at
						};
						
						setAnalysisData(transformedData);
						
						// Load GeoJSON layers if available (with validation and cleaning)
						const waterBodies = savedAnalysis.water_bodies_geojson || results.water_bodies_geojson;
						if (waterBodies) {
							const cleaned = cleanGeoJSON(waterBodies);
							if (cleaned && isValidGeoJSON(cleaned)) {
								setWaterBodiesGeoJSON(cleaned);
							} else {
								console.warn('Water bodies GeoJSON failed validation or cleaning');
								setWaterBodiesGeoJSON(null);
							}
						} else {
							setWaterBodiesGeoJSON(null);
						}
						
						const floodRisk = savedAnalysis.flood_risk_geojson || results.flood_risk_geojson;
						if (floodRisk) {
							const cleaned = cleanGeoJSON(floodRisk);
							if (cleaned && isValidGeoJSON(cleaned)) {
								setFloodRiskGeoJSON(cleaned);
							} else {
								console.warn('Flood risk GeoJSON failed validation or cleaning');
								setFloodRiskGeoJSON(null);
							}
						} else {
							setFloodRiskGeoJSON(null);
						}
						
						const savedHydrology = savedAnalysis.hydrology || results.hydrology;
						if (savedHydrology?.geojson) {
							// Clean and validate the GeoJSON before setting it
							const cleaned = cleanGeoJSON(savedHydrology.geojson);
							if (cleaned && isValidGeoJSON(cleaned)) {
								setHydrologyGeoJSON(cleaned);
							} else {
								console.warn('Hydrology GeoJSON failed validation or cleaning');
								setHydrologyGeoJSON(null);
							}
						} else {
							setHydrologyGeoJSON(null);
						}
						setHydrologyData(savedHydrology?.summary || null);
						
						// Update map center to polygon center
						if (selectedPolygon?.geojson) {
							const geom = selectedPolygon.geojson.geometry || selectedPolygon.geojson;
							if (geom.type === 'Polygon' && geom.coordinates?.[0]?.[0]) {
								const coords = geom.coordinates[0];
								const lats = coords.map(c => c[1]);
								const lons = coords.map(c => c[0]);
								const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
								const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
								setMapCenter([centerLat, centerLon]);
							}
						}
						
						// Show notification that saved analysis was loaded
						toast("📊 Analysis Restored", {
							description: `Previous terrain analysis from ${new Date(savedAnalysis.created_at).toLocaleDateString()} has been loaded`,
							duration: 4000
						});
					} else {
						console.log('ℹ️ No saved terrain analysis found for this polygon');
						// Clear any previous analysis data
						setAnalysisData(null);
						setWaterBodiesGeoJSON(null);
						setFloodRiskGeoJSON(null);
						setHydrologyGeoJSON(null);
						setHydrologyData(null);
					}
				} else {
					console.log('ℹ️ No saved terrain analysis found (response not ok)');
					setAnalysisData(null);
					setWaterBodiesGeoJSON(null);
					setFloodRiskGeoJSON(null);
					setHydrologyGeoJSON(null);
					setHydrologyData(null);
				}
			} catch (error) {
				console.warn('Failed to load saved terrain analysis:', error.message);
				// Clear analysis data on error
				setAnalysisData(null);
				setWaterBodiesGeoJSON(null);
				setFloodRiskGeoJSON(null);
				setHydrologyGeoJSON(null);
				setHydrologyData(null);
			}
		};

		loadSavedAnalysis();
	}, [selectedPolygon?.id, currentProject?.id]); // Only depend on IDs to avoid unnecessary re-runs




	// Manual analysis trigger
	const runAnalysis = async () => {
		if (!selectedPolygon) {
			setError("Please select a polygon first");
			return;
		}
		
		// Check if analysis already exists - ask user if they want to re-run
		if (analysisData && analysisData.loaded_from_saved) {
			const confirmReRun = window.confirm(
				`A saved analysis exists from ${new Date(analysisData.saved_at).toLocaleDateString()}.\n\n` +
				`Do you want to run a new analysis? This will overwrite the existing analysis.`
			);
			if (!confirmReRun) {
				return; // User cancelled, keep existing analysis
			}
		}
		
		setLoading(true);
		setError("");
		// Clear existing analysis data when starting new analysis
		setAnalysisData(null);
		setWaterBodiesGeoJSON(null);
		setFloodRiskGeoJSON(null);
		setHydrologyGeoJSON(null);
		setHydrologyData(null);
		
		try {
			// Check what we actually have in selectedPolygon.geojson
			console.log("Raw selectedPolygon.geojson:", selectedPolygon.geojson);
			console.log("Full selectedPolygon object:", selectedPolygon);
			
			// Handle different possible formats of selectedPolygon.geojson
			let geometry;
			if (selectedPolygon.geojson && selectedPolygon.geojson.type === "Feature") {
				// Already a Feature, use its geometry
				geometry = selectedPolygon.geojson.geometry;
				console.log("Using geometry from Feature:", geometry);
			} else if (selectedPolygon.geojson && selectedPolygon.geojson.type === "Polygon") {
				// Just geometry, use it directly
				geometry = selectedPolygon.geojson;
				console.log("Using geometry directly:", geometry);
			} else if (selectedPolygon.geojson && selectedPolygon.geojson.coordinates) {
				// Has coordinates but might be missing type
				geometry = {
					type: "Polygon",
					coordinates: selectedPolygon.geojson.coordinates
				};
				console.log("Reconstructed geometry:", geometry);
			} else {
				// Fallback - try to use the whole geojson as geometry
				geometry = selectedPolygon.geojson;
				console.log("Using fallback geometry:", geometry);
			}
			
			// Validate geometry before creating Feature
			if (!geometry) {
				throw new Error("No geometry data found in selected polygon");
			}
			
			if (!geometry.type) {
				throw new Error("Geometry missing type field");
			}
			
			if (!geometry.coordinates) {
				throw new Error("Geometry missing coordinates field");
			}
			
			if (geometry.type !== "Polygon") {
				throw new Error(`Invalid geometry type: expected Polygon, got ${geometry.type}`);
			}
			
			if (!Array.isArray(geometry.coordinates)) {
				throw new Error("Geometry coordinates must be an array");
			}
			
			if (geometry.coordinates.length === 0) {
				throw new Error("Geometry coordinates array is empty");
			}
			
			// Validate the first ring of coordinates
			const firstRing = geometry.coordinates[0];
			if (!Array.isArray(firstRing) || firstRing.length < 3) {
				throw new Error("Polygon must have at least 3 coordinate points");
			}
			
			// Validate coordinate format
			for (let i = 0; i < Math.min(firstRing.length, 3); i++) {
				const coord = firstRing[i];
				if (!Array.isArray(coord) || coord.length < 2) {
					throw new Error(`Invalid coordinate format at index ${i}: ${JSON.stringify(coord)}`);
				}
				if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
					throw new Error(`Invalid coordinate values at index ${i}: [${coord[0]}, ${coord[1]}]`);
				}
			}
			
			// Send just the geometry (not a Feature) as the backend expects
			const payload = {
				geojson: geometry,  // Send geometry directly, not as Feature
				confirmed: true,
				data_types: ['dem'],
				target_crs: 'EPSG:4326',
				preprocessing: {}
			};
			
			console.log("Sending polygon data for DEM processing:", {
				polygon_id: selectedPolygon.id,
				polygon_name: selectedPolygon.name,
				geometry_type: geometry.type,
				coordinates_count: geometry.coordinates?.[0]?.length || 0,
				payload_keys: Object.keys(payload)
			});
			
			// Debug: Log the actual GeoJSON being sent
			console.log("Full GeoJSON being sent:", JSON.stringify(geometry, null, 2));
			
			// Call the Node.js backend which proxies to Python backend
			console.log("Sending request to:", `${API_BASE_URL}/api/process_dem`);
			console.log("Request payload:", JSON.stringify(payload, null, 2));
			
			const res = await authenticatedFetch(`${API_BASE_URL}/api/process_dem`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			
			console.log("Response status:", res.status);
			console.log("Response headers:", Object.fromEntries(res.headers.entries()));
			
			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(`DEM processing failed: ${errorText}`);
			}
			
			const data = await res.json();
			console.log("DEM processing result:", data);
			
			// Check if we got real data or error
			if (data.error) {
				// Show detailed validation error if available
				if (data.validation) {
					console.error("Validation details:", JSON.stringify(data.validation, null, 2));
					console.error("Full error response:", JSON.stringify(data, null, 2));
					throw new Error(`GeoJSON validation failed: ${data.error}. Check console for details.`);
				} else {
					throw new Error(`Backend error: ${data.error}`);
				}
			}
			
			if (!data.stats && !data.preview_url) {
				console.warn("No real terrain data received, check if Python backend is running");
			}
			
			// Use the REAL data from Python backend, don't override with dummy data
			const transformedData = {
				// Use real stats from Python backend
				stats: data.stats || {
					mean_elevation: 0,
					min_elevation: 0,
					max_elevation: 0,
					target_crs: payload.target_crs,
					data_types_processed: payload.data_types,
					processing_timestamp: new Date().toISOString()
				},
				// Use real validation results
				validation: data.validation || {},
				// Use real download URLs from Python backend
				preview_url: data.preview_url || null,
				tif_url: data.tif_url || null,
				classified_url: data.classified_url || null,
				json_url: data.json_url || null,
				// Use real analysis data from Python backend if available
				slope_analysis: data.slope_analysis || null,
				flood_analysis: data.flood_analysis || null,
				erosion_analysis: data.erosion_analysis || null,
				zoning_analysis: data.zoning_analysis || null,
				hydrology_summary: data.hydrology?.summary || null,
				parameters: {
					data_types: payload.data_types,
					target_crs: payload.target_crs,
					preprocessing: payload.preprocessing
				}
			};
			
			setAnalysisData(transformedData);
			
			// Extract GeoJSON layers for map visualization (with validation)
			if (data.water_bodies_geojson && isValidGeoJSON(data.water_bodies_geojson)) {
				setWaterBodiesGeoJSON(data.water_bodies_geojson);
			} else {
				setWaterBodiesGeoJSON(null);
			}
			
			if (data.flood_risk_geojson && isValidGeoJSON(data.flood_risk_geojson)) {
				setFloodRiskGeoJSON(data.flood_risk_geojson);
			} else {
				setFloodRiskGeoJSON(null);
			}
			
			if (data.hydrology?.geojson && isValidGeoJSON(data.hydrology.geojson)) {
				setHydrologyGeoJSON(data.hydrology.geojson);
			} else {
				setHydrologyGeoJSON(null);
			}
			setHydrologyData(data.hydrology?.summary || null);
			
			// Check if this is a water body based on water pixels percentage
			const waterPixels = data.stats?.water_pixels || 0;
			const totalPixels = data.stats?.total_pixels || 1;
			const waterAreaPercentage = (waterPixels / totalPixels) * 100;
			const isWaterBody = waterAreaPercentage > 50 || (waterAreaPercentage > 30 && (data.stats?.mean_elevation || 1000) < 15);
			
			if (isWaterBody) {
				transformedData.is_water_body = true;
				transformedData.water_area_percentage = waterAreaPercentage;
				setError(`🚫 WATER BODY DETECTED: ${waterAreaPercentage.toFixed(1)}% of area is water. Development is NOT ALLOWED on water bodies.`);
			}
			
			// Update map center to polygon center if polygon is selected
			if (selectedPolygon?.geojson) {
				const geom = selectedPolygon.geojson.geometry || selectedPolygon.geojson;
				if (geom.type === 'Polygon' && geom.coordinates?.[0]?.[0]) {
					const coords = geom.coordinates[0];
					const lats = coords.map(c => c[1]);
					const lons = coords.map(c => c[0]);
					const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
					const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
					setMapCenter([centerLat, centerLon]);
				}
			}
			
			// Save terrain analysis data to backend (optional - don't break flow if it fails)
			try {
				// Prepare complete results for report generation - include ALL data from Python backend
				const completeResults = {
					// Core stats
					stats: data.stats || transformedData.stats || {},
					elevation_stats: data.elevation_stats || transformedData.stats || {},
					// Analysis components
					slope_analysis: data.slope_analysis || transformedData.slope_analysis || {},
					aspect_analysis: data.aspect_analysis || transformedData.aspect_analysis || {},
					flood_risk_analysis: data.flood_risk_analysis || data.flood_analysis || transformedData.flood_analysis || {},
					erosion_analysis: data.erosion_analysis || transformedData.erosion_analysis || {},
					water_availability: data.water_availability || transformedData.water_availability || {},
					terrain_ruggedness: data.terrain_ruggedness || transformedData.terrain_ruggedness || {},
					flow_accumulation_stats: data.flow_accumulation_stats || transformedData.flow_accumulation_stats || {},
					// GeoJSON layers for visualization
					water_bodies_geojson: data.water_bodies_geojson || null,
					flood_risk_geojson: data.flood_risk_geojson || null,
					// Download URLs
					preview_url: data.preview_url || transformedData.preview_url || null,
					tif_url: data.tif_url || transformedData.tif_url || null,
					classified_url: data.classified_url || transformedData.classified_url || null,
					json_url: data.json_url || transformedData.json_url || null,
					// Include all other data from response
					...data,
					...transformedData
				};
				
				// Save to Node.js backend (port 8000) - this endpoint exists in server.js
				const saveResponse = await authenticatedFetch(`${API_BASE_URL}/api/terrain_analysis/save`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						polygon_id: selectedPolygon.id,
						user_id: user?.id,
						project_id: currentProject?.id,
						analysis_data: transformedData,
						results: completeResults
					})
				});
				
				if (saveResponse.ok) {
					const saveData = await saveResponse.json();
					console.log("Terrain analysis data saved successfully", saveData);
					// Show notification that report is available
					toast("📊 Terrain Analysis Complete", {
						description: "Report has been generated and is available in Reports page",
						duration: 5000,
						action: {
							label: "View Report",
							onClick: () => navigate('/reports')
						}
					});
				}
			} catch (saveError) {
				// Don't break the flow - saving is optional
				console.warn("Failed to save terrain analysis (non-critical):", saveError.message);
				// Analysis still works even if save fails
			}
				
				// Update project progress when analysis is completed
				if (currentProject) {
					try {
						const currentProgress = currentProject.progress || 0;
						const newProgress = Math.min(currentProgress + 20, 100); // Increment by 20%
						
						await authenticatedFetch(`${API_BASE_URL}/api/projects/${currentProject.id}`, {
							method: 'PUT',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								progress: newProgress
							})
						});
						console.log(`Project progress updated to ${newProgress}%`);
					} catch (statusErr) {
						console.error("Failed to update project progress:", statusErr);
					// Don't throw - this is optional
				}
			}
		} catch (e) {
			console.error("Terrain analysis error:", e);
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};


	// Handle polygon selection
	const handlePolygonSelection = (polygonId) => {
		const polygon = polygons.find(p => p.id === parseInt(polygonId));
		const previousPolygonId = selectedPolygon?.id;
		setSelectedPolygon(polygon);
		
		// Only clear analysis if selecting a different polygon
		// The useEffect will load saved analysis for the new polygon
		if (previousPolygonId !== polygon?.id) {
			setAnalysisData(null);
			setWaterBodiesGeoJSON(null);
			setFloodRiskGeoJSON(null);
		}
	};

	const handleLayerToggle = () => {};

	const runSuitability = async () => {
		if (!selectedPolygon) return;
		try {
			const payload = {
				geojson: selectedPolygon.geojson,
				polygon_id: selectedPolygon.id,
				user_id: user?.id,
				project_id: currentProject?.id,
				parameters: {}
			};
			const res = await authenticatedFetch(`${API_BASE_URL}/api/land_suitability`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			navigate("/suitability", { state: { suitability: data, terrain: analysisData, polygonId: selectedPolygon.id } });
		} catch (e) {
			setError(typeof e === "string" ? e : e.message);
		}
	};

	const generateZoning = async () => {
		if (!selectedPolygon) return;
		try {
			// Navigate to polygon zoning with selected polygon
			navigate("/zoning", { 
				state: { 
					polygonId: selectedPolygon.id 
				} 
			});
		} catch (e) {
			setError(typeof e === "string" ? e : e.message);
		}
	};

	return (
		<MainLayout>
			<div className="min-h-screen bg-background p-6 animate-fade-in">
				<div className="max-w-[1400px] mx-auto flex flex-col gap-6">
					<div className="mb-8">
						<h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">Terrain Analysis</h1>
						<p className="text-slate-500 text-lg font-medium leading-relaxed">Analyze terrain characteristics and generate insights for urban planning</p>
					</div>

				{/* Project Display */}
				{currentProject && (
					<Card className="bg-white dark:bg-slate-800 border border-border rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden relative animate-fade-in-up">
						<CardHeader className="p-6 border-b border-border">
							<CardTitle className="text-xl font-bold text-card-foreground mb-2"><FolderOpen className="w-5 h-5 inline mr-2" />Current Project</CardTitle>
							<CardDescription className="text-sm text-muted-foreground leading-relaxed">Working on: {currentProject.title || currentProject.name}</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<div className="project-info">
								<p><strong>Title:</strong> {currentProject.title || currentProject.name}</p>
								<p><strong>Location:</strong> {currentProject.location}</p>
								<p><strong>Status:</strong> {currentProject.status}</p>
								<div className="mt-2 p-2 bg-blue-50 rounded text-xs flex items-center gap-2">
									<MapPin className="w-4 h-4" />
									Showing only polygons for this project. Change project from the header.
								</div>
							</div>
						</CardContent>
					</Card>
				)}
				
				{!currentProject && (
					<Card className="bg-white dark:bg-slate-800 border border-border rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden relative animate-fade-in-up">
						<CardHeader className="p-6 border-b border-border">
							<CardTitle className="text-xl font-bold text-card-foreground mb-2"><AlertTriangle className="w-5 h-5 inline mr-2" />No Project Selected</CardTitle>
							<CardDescription className="text-sm text-muted-foreground leading-relaxed">Please select a project from the header to view polygons</CardDescription>
						</CardHeader>
					</Card>
				)}

				{/* Polygon Selection */}
				{polygons.length > 0 && (
					<Card className="bg-white dark:bg-slate-800 border border-border rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden relative animate-fade-in-up">
						<CardHeader className="p-6 border-b border-border">
							<CardTitle className="text-xl font-bold text-card-foreground mb-2"><MapPin className="w-5 h-5 inline mr-2" />Select Polygon</CardTitle>
							<CardDescription className="text-sm text-muted-foreground leading-relaxed">Choose a polygon to analyze terrain data</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<div className="polygon-selection">
								<Select
									value={selectedPolygon?.id?.toString() || ""}
									onValueChange={handlePolygonSelection}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select a polygon" />
									</SelectTrigger>
									<SelectContent>
										{polygons.map((polygon) => (
											<SelectItem 
												key={polygon.id} 
												value={polygon.id.toString()}
											>
												{polygon.name || `Polygon ${polygon.id}`}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedPolygon && (
									<div className="polygon-info">
										<h4>Selected Polygon</h4>
										<p><strong>Name:</strong> {selectedPolygon.name || `Polygon ${selectedPolygon.id}`}</p>
										<p><strong>Created:</strong> {new Date(selectedPolygon.created_at).toLocaleDateString()}</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Analysis Controls */}
				{selectedPolygon && (
					<Card className="bg-white dark:bg-slate-800 border border-border rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden relative animate-fade-in-up">
						<CardHeader className="p-6 border-b border-border">
							<CardTitle className="text-xl font-bold text-card-foreground mb-2"><Microscope className="w-5 h-5 inline mr-2" />Terrain Analysis</CardTitle>
							<CardDescription className="text-sm text-muted-foreground leading-relaxed">Run comprehensive terrain analysis on the selected polygon</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<div className="analysis-controls" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
								<Button 
									onClick={runAnalysis} 
									disabled={loading}
									className="analysis-button"
								>
									{loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Running Analysis...</> : <><Rocket className="w-4 h-4 mr-2" />Run Terrain Analysis</>}
								</Button>
								{analysisData && (
									<Button 
										variant="outline"
										onClick={() => navigate('/reports')}
										className="view-report-button"
									>
										<FileText className="w-4 h-4 mr-2" />
										View Report
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Error Display */}
				{error && (
					<div className="error-container fade-in">
						<p className="error-message"><AlertTriangle className="w-5 h-5 inline mr-2" />{error}</p>
					</div>
				)}

				{/* Loading Indicator */}
				{loading && (
					<div className="loading-container fade-in">
						<div className="loading-spinner"></div>
						<p className="loading-text"><RefreshCw className="w-5 h-5 inline mr-2 animate-spin" />Running terrain analysis...</p>
					</div>
				)}

				{/* Analysis Results */}
				{analysisData && (
					<>
						<TerrainAnalysisPanel analysisData={analysisData} onLayerToggle={handleLayerToggle} />
						
						{/* Map Visualization with Flood Risk and Water Bodies */}
						{(waterBodiesGeoJSON || floodRiskGeoJSON || selectedPolygon) && (
							<Card className="bg-white dark:bg-slate-800 border border-border rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden relative animate-fade-in-up">
								<CardHeader className="p-6 border-b border-border">
									<CardTitle className="text-xl font-bold text-card-foreground mb-2"><Map className="w-5 h-5 inline mr-2" />Terrain Analysis Map</CardTitle>
									<CardDescription className="text-sm text-muted-foreground leading-relaxed">
										Visualize flood risk zones and water bodies identified from DEM analysis
									</CardDescription>
								</CardHeader>
								<CardContent className="p-6">
									{/* Layer Controls */}
									<div className="map-layer-controls" style={{ marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
										<Button
											variant={showWaterBodies ? "default" : "outline"}
											size="sm"
											onClick={() => setShowWaterBodies(!showWaterBodies)}
										>
											<Droplet className="w-4 h-4 mr-1" />
											Water Bodies
										</Button>
										<Button
											variant={showFloodRisk ? "default" : "outline"}
											size="sm"
											onClick={() => setShowFloodRisk(!showFloodRisk)}
										>
											<AlertTriangle className="w-4 h-4 mr-1" />
											Flood Risk
										</Button>
										<Button
											variant={showHydrology ? "default" : "outline"}
											size="sm"
											onClick={() => setShowHydrology(!showHydrology)}
										>
											{showHydrology ? "✓" : ""} 🌊 Rivers & Lakes
										</Button>
									</div>
									
									{/* Map Container */}
									<div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
										<MapContainer
											center={mapCenter}
											zoom={mapZoom}
											style={{ height: '100%', width: '100%' }}
										>
											<TileLayer
												attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
												url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
											/>
											
											{/* Selected Polygon */}
											{cleanedSelectedPolygonGeoJSON && (
												<GeoJSON
													data={cleanedSelectedPolygonGeoJSON}
													style={{ color: '#3b82f6', weight: 3, fillOpacity: 0.1, fillColor: '#3b82f6' }}
												>
													<Popup>
														<div>
															<strong>Analysis Area</strong><br/>
															{selectedPolygon.name || `Polygon ${selectedPolygon.id}`}
														</div>
													</Popup>
												</GeoJSON>
											)}
											
											{/* Water Bodies Layer */}
											{showWaterBodies && cleanedWaterBodiesGeoJSON && (
												<GeoJSON
													key={`waterbodies-${JSON.stringify(cleanedWaterBodiesGeoJSON).substring(0, 50)}`}
													data={cleanedWaterBodiesGeoJSON}
													style={(feature) => ({
														color: '#0066cc',
														weight: 2,
														fillColor: '#0066cc',
														fillOpacity: 0.6
													})}
													onEachFeature={(feature, layer) => {
														layer.bindPopup(`
															<div>
																<strong>💧 Water Body</strong><br/>
																${feature.properties?.description || 'Identified water body from DEM analysis'}
															</div>
														`);
													}}
												/>
											)}
											
											{/* Flood Risk Layer - Only show if NOT a water body */}
											{showFloodRisk && cleanedFloodRiskGeoJSON && !analysisData?.is_water_body && (
												<GeoJSON
													key={`floodrisk-${JSON.stringify(cleanedFloodRiskGeoJSON).substring(0, 50)}`}
													data={cleanedFloodRiskGeoJSON}
													style={(feature) => {
														const riskLevel = feature.properties?.risk_level || 1;
														const colors = {
															1: '#90EE90', // Low - Light green
															2: '#FFD700', // Medium - Gold
															3: '#FF6347'  // High - Red
														};
														const opacities = {
															1: 0.4,
															2: 0.5,
															3: 0.6
														};
														return {
															color: colors[riskLevel] || '#FF6347',
															weight: 2,
															fillColor: colors[riskLevel] || '#FF6347',
															fillOpacity: opacities[riskLevel] || 0.6
														};
													}}
													onEachFeature={(feature, layer) => {
														const riskLabel = feature.properties?.risk_label || 'Unknown';
														layer.bindPopup(`
															<div>
																<strong>⚠️ Flood Risk: ${riskLabel}</strong><br/>
																${feature.properties?.description || 'Flood risk area identified from DEM analysis'}
															</div>
														`);
													}}
												/>
											)}

											{/* Hydrology Layer */}
											{showHydrology && cleanedHydrologyGeoJSON && (
												<GeoJSON
													key={`hydrology-${JSON.stringify(cleanedHydrologyGeoJSON).substring(0, 50)}`}
													data={cleanedHydrologyGeoJSON}
													style={(feature) => {
														const featureType = feature.properties?.feature_type || "";
														const isWaterPolygon = ["lake", "pond", "reservoir", "lagoon", "water"].includes(featureType.toLowerCase());
														return {
															color: isWaterPolygon ? "#00a2ff" : "#00bcd4",
															weight: isWaterPolygon ? 2 : 3,
															dashArray: isWaterPolygon ? "4,4" : "6,2",
															fillColor: isWaterPolygon ? "#00a2ff" : "#00bcd4",
															fillOpacity: isWaterPolygon ? 0.35 : 0
														};
													}}
													onEachFeature={(feature, layer) => {
														const props = feature.properties || {};
														layer.bindPopup(`
															<div>
																<strong>🌊 ${props.name || props.feature_type || 'Hydrology Feature'}</strong><br/>
																${props.waterway ? `Type: ${props.waterway}<br/>` : ""}
																${props.water ? `Water: ${props.water}<br/>` : ""}
																Source: OpenStreetMap
															</div>
														`);
													}}
												/>
											)}
											
											{/* Water Body Warning Overlay - Show when water is detected */}
											{analysisData?.is_water_body && cleanedSelectedPolygonGeoJSON && (
												<GeoJSON
													data={cleanedSelectedPolygonGeoJSON}
													style={{
														color: '#FF0000',
														weight: 4,
														fillColor: '#0066cc',
														fillOpacity: 0.7,
														dashArray: '10, 5'
													}}
													onEachFeature={(feature, layer) => {
														const waterPct = analysisData?.restriction?.details?.water_area_percentage || 0;
														layer.bindPopup(`
															<div style="text-align: center; padding: 10px;">
																<strong style="color: #FF0000; font-size: 16px;">🚫 WATER BODY DETECTED</strong><br/>
																<div style="margin-top: 10px; padding: 8px; background: #FFE5E5; border-radius: 4px;">
																	<strong>Water Area: ${waterPct.toFixed(1)}%</strong><br/>
																	<span style="color: #CC0000;">Development is NOT ALLOWED on water bodies</span>
																</div>
																<div style="margin-top: 8px; font-size: 12px; color: #666;">
																	Select a different polygon on land for development analysis
																</div>
															</div>
														`);
													}}
												/>
											)}
										</MapContainer>
									</div>
									
									{/* Legend */}
									<div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
										<div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
												<div style={{ width: '20px', height: '20px', backgroundColor: '#0066cc', borderRadius: '2px' }}></div>
												<span>Water Bodies</span>
											</div>
											<div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
												<div style={{ width: '20px', height: '20px', backgroundColor: '#90EE90', borderRadius: '2px' }}></div>
												<span>Low Flood Risk</span>
											</div>
											<div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
												<div style={{ width: '20px', height: '20px', backgroundColor: '#FFD700', borderRadius: '2px' }}></div>
												<span>Medium Flood Risk</span>
											</div>
											<div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
												<div style={{ width: '20px', height: '20px', backgroundColor: '#FF6347', borderRadius: '2px' }}></div>
												<span>High Flood Risk</span>
											</div>
											{hydrologyGeoJSON && (
												<div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
													<div style={{ width: '20px', height: '20px', borderRadius: '2px', border: '2px dashed #00bcd4' }}></div>
													<span>Rivers & Lakes (OSM)</span>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Hydrology Summary */}
						{hydrologyData && (
							<Card className="bg-white dark:bg-slate-800 border border-border rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden relative animate-fade-in-up">
								<CardHeader className="p-6 border-b border-border">
									<CardTitle className="text-xl font-bold text-card-foreground mb-2">🌊 Hydrology Insights (OpenStreetMap)</CardTitle>
									<CardDescription className="text-sm text-muted-foreground leading-relaxed">
										Rivers, lakes, and reservoirs detected within the analysis area
									</CardDescription>
								</CardHeader>
								<CardContent className="p-6">
									<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
										<div style={{ background: '#f4faff', padding: '12px', borderRadius: '8px' }}>
											<span style={{ fontSize: '12px', color: '#1d4ed8' }}>Waterways</span>
											<strong style={{ display: 'block', fontSize: '20px', marginTop: '4px' }}>{hydrologyData.waterway_count ?? 0}</strong>
										</div>
										<div style={{ background: '#f4faff', padding: '12px', borderRadius: '8px' }}>
											<span style={{ fontSize: '12px', color: '#1d4ed8' }}>Water Bodies</span>
											<strong style={{ display: 'block', fontSize: '20px', marginTop: '4px' }}>{hydrologyData.water_body_count ?? 0}</strong>
										</div>
										<div style={{ background: '#f4faff', padding: '12px', borderRadius: '8px' }}>
											<span style={{ fontSize: '12px', color: '#1d4ed8' }}>Named Features</span>
											<strong style={{ display: 'block', fontSize: '20px', marginTop: '4px' }}>{hydrologyData.named_features ?? 0}</strong>
										</div>
										<div style={{ background: '#f4faff', padding: '12px', borderRadius: '8px' }}>
											<span style={{ fontSize: '12px', color: '#1d4ed8' }}>Waterway Length</span>
											<strong style={{ display: 'block', fontSize: '20px', marginTop: '4px' }}>
												{hydrologyData.estimated_waterway_length_km
													? `${hydrologyData.estimated_waterway_length_km} km`
													: 'N/A'}
											</strong>
										</div>
									</div>
									
									{hydrologyData.sample_names && (
										<div style={{ fontSize: '14px', color: '#0f172a' }}>
											<strong>Named Water Features:</strong>
											<ul style={{ marginLeft: '18px', marginTop: '6px' }}>
												{hydrologyData.sample_names.map((name) => (
													<li key={name}>{name}</li>
												))}
											</ul>
										</div>
									)}
									
									<p style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
										Bounding box: {hydrologyData.bounding_box
											? `${hydrologyData.bounding_box.south.toFixed(2)}°–${hydrologyData.bounding_box.north.toFixed(2)}° latitude`
											: 'N/A'}
									</p>
								</CardContent>
							</Card>
						)}
						
						<div className="action-buttons fade-in">
							<Button onClick={runSuitability} className="action-button primary">
								🌱 Run Suitability Model →
							</Button>
							<Button onClick={generateZoning} className="action-button secondary">
								🏗️ Generate Zoning →
							</Button>
						</div>
					</>
				)}
				</div>
			</div>
		</MainLayout>
	);
}

