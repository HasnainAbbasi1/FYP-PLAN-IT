import React, { useState, useEffect, useCallback } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { useNavigate, useLocation } from "react-router-dom";
import MapDraw from "./MapDraw";
import axios from "axios";
import MainLayout from "@/components/layout/MainLayout";
import { authHelper, authenticatedFetch } from "@/utils/authHelper";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { ValidatedInput, ErrorMessage, LoadingButton, ValidationSummary } from "../../components/validation/ValidationComponents";

// Consistent base URL for all backend calls
const API_BASE_URL = "http://localhost:8000";

// Enhanced Validation Status Component
const ValidationStatus = ({ validation, title, onRetry }) => {
  if (!validation) return null;

  return (
    <div className={`validation-panel ${validation.is_valid ? 'valid' : 'invalid'}`}>
      <div className="validation-header">
        <h4>{title} Validation</h4>
        {onRetry && (
          <button className="py-3.5 px-7 bg-gradient-base text-white border-none rounded-xl cursor-pointer text-[0.9375rem] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none-small" onClick={onRetry}>
            Retry Validation
          </button>
        )}
      </div>
      
      <div className="validation-summary">
        <span className={`status ${validation.is_valid ? 'success' : 'error'}`}>
          {validation.is_valid ? '✓ Valid' : '✗ Invalid'}
        </span>
        {validation.summary && (
          <span className="counts">
            {validation.summary.error_count > 0 && `${validation.summary.error_count} errors `}
            {validation.summary.warning_count > 0 && `${validation.summary.warning_count} warnings `}
            {validation.summary.info_count > 0 && `${validation.summary.info_count} info`}
          </span>
        )}
      </div>
      
      {validation.errors && validation.errors.length > 0 && (
        <div className="validation-messages errors">
          <strong>Errors:</strong>
          <ul>
            {validation.errors.map((error, idx) => (
              <li key={idx} className="error">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {validation.warnings && validation.warnings.length > 0 && (
        <div className="validation-messages warnings">
          <strong>Warnings:</strong>
          <ul>
            {validation.warnings.map((warning, idx) => (
              <li key={idx} className="warning">{warning}</li>
            ))}
          </ul>
        </div>
      )}
      
      {validation.info && validation.info.length > 0 && (
        <div className="validation-messages info">
          <strong>Information:</strong>
          <ul>
            {validation.info.map((info, idx) => (
              <li key={idx} className="info">{info}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


const CoordinateSystemSelector = ({ selectedCRS, onCRSChange }) => {
  const commonCRS = [
    { code: 'EPSG:4326', name: 'WGS84 (Lat/Long)', description: 'Global standard' },
    { code: 'EPSG:3857', name: 'Web Mercator', description: 'Web mapping standard' },
    { code: 'EPSG:32633', name: 'UTM Zone 33N', description: 'Europe/Africa' },
    { code: 'EPSG:2154', name: 'RGF93 Lambert-93', description: 'France' },
    { code: 'EPSG:27700', name: 'British National Grid', description: 'United Kingdom' }
  ];

  return (
    <div className="crs-selector">
      <label htmlFor="crs-select">
        <strong>Target Coordinate System:</strong>
      </label>
      <select
        id="crs-select"
        value={selectedCRS}
        onChange={(e) => onCRSChange(e.target.value)}
        className="crs-dropdown"
      >
        {commonCRS.map(crs => (
          <option key={crs.code} value={crs.code}>
            {crs.code} - {crs.name} ({crs.description})
          </option>
        ))}
      </select>
    </div>
  );
};

export default function DataIngestion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [inputMode, setInputMode] = useState("map");
  const [bounds, setBounds] = useState({ latMin: "", latMax: "", lngMin: "", lngMax: "" });

  // Validation schema for coordinate form
  const coordinateSchema = Yup.object().shape({
    latMin: Yup.number()
      .required('Latitude Min is required')
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .typeError('Latitude Min must be a valid number'),
    latMax: Yup.number()
      .required('Latitude Max is required')
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .typeError('Latitude Max must be a valid number')
      .test('greater-than-min', 'Latitude Max must be greater than Latitude Min', function(value) {
        const { latMin } = this.parent;
        return !latMin || !value || parseFloat(value) > parseFloat(latMin);
      }),
    lngMin: Yup.number()
      .required('Longitude Min is required')
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .typeError('Longitude Min must be a valid number'),
    lngMax: Yup.number()
      .required('Longitude Max is required')
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .typeError('Longitude Max must be a valid number')
      .test('greater-than-min', 'Longitude Max must be greater than Longitude Min', function(value) {
        const { lngMin } = this.parent;
        return !lngMin || !value || parseFloat(value) > parseFloat(lngMin);
      })
  });

  const initialCoordinateValues = {
    latMin: bounds.latMin || "",
    latMax: bounds.latMax || "",
    lngMin: bounds.lngMin || "",
    lngMax: bounds.lngMax || ""
  };
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [lastSavedMessage, setLastSavedMessage] = useState("");
  
  // Project integration states
  const { currentProject, projects = [], setCurrentProject, setProjects } = useProject();
  const [projectLocation, setProjectLocation] = useState(null);
  
  // Enhanced validation states
  const [validationResults, setValidationResults] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [autoValidate, setAutoValidate] = useState(true);
  
  // Data type selection
  const [selectedDataTypes, setSelectedDataTypes] = useState(['dem']);
  
  // Coordinate system selection
  const [targetCRS, setTargetCRS] = useState('EPSG:4326');
  
  // Data preprocessing options
  const [preprocessingOptions, setPreprocessingOptions] = useState({
    cleanNoData: true,
    normalizeValues: false,
    resampleResolution: '',
    fillGaps: true
  });

  // Error state management
  const [errors, setErrors] = useState([]);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  // Clear errors helper
  const clearErrors = () => setErrors([]);

  // Add error helper
  const addError = (error) => {
    setErrors(prev => [...prev, error]);
    console.error("DataIngestion Error:", error);
  };

  // ----------------- Fetch polygons from backend -----------------
  useEffect(() => {
    const fetchPolygons = async () => {
      // Only fetch polygons if a project is selected
      if (!currentProject) {
        setPolygons([]);
        setSelectedPolygon(null);
        return;
      }

      try {
        // Fetch polygons filtered by project_id
        const url = `${API_BASE_URL}/api/polygon?project_id=${currentProject.id}`;
        const res = await authenticatedFetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setPolygons(data);
        if (!selectedPolygon && data.length > 0) {
          setSelectedPolygon(data[0]);
        } else if (data.length === 0) {
          setSelectedPolygon(null);
        }
        console.log(`Fetched ${data.length} polygons for project: ${currentProject.title || currentProject.name}`);
      } catch (err) {
        console.error("Error fetching polygons:", err);
        // Only show error if it's a network error, not if it's just no polygons
        if (err.message && err.message.includes('Failed to connect')) {
          addError(err.message);
        } else if (err.message && !err.message.includes('Project selection required')) {
          console.warn("Polygon fetch error (may be normal if no polygons exist):", err.message);
          // Don't show error for empty polygon lists - that's normal
        }
      }
    };

    fetchPolygons();
    const interval = setInterval(fetchPolygons, 10000);
    return () => clearInterval(interval);
	}, [currentProject]);

  // ----------------- Fetch projects from backend -----------------
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Check authentication first
        if (!authHelper.isAuthenticated()) {
          return;
        }

        if (authHelper.isTokenExpired()) {
          authHelper.clearAuth();
          navigate('/login');
          return;
        }

        const res = await authenticatedFetch(`${API_BASE_URL}/api/projects/user/${user.id}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        // Handle both array response and object response
        const projectsData = Array.isArray(data) ? data : data.projects || [];
        setProjects(projectsData);
      } catch (err) {
        console.error("Error fetching projects:", err);
        if (err.message === 'Authentication failed') {
          addError("Please log in to access projects.");
        } else {
          addError("Failed to fetch projects. Make sure you're logged in and the server is running.");
        }
      }
    };

    fetchProjects();
  }, [navigate]);

  // ----------------- Handle project parameter from navigation -----------------
  useEffect(() => {
    // Check if we have a project passed from navigation
    if (location.state?.project) {
      const project = location.state.project;
      
      setCurrentProject?.(project);
      
      // Extract coordinates from project metadata
      if (project.metadata && project.metadata.coordinates) {
        const coords = project.metadata.coordinates;
        setProjectLocation({
          lat: coords.lat,
          lng: coords.lng,
          address: project.location
        });
      } else {
        setProjectLocation(null);
      }
    }
  }, [location.state]);

  // Auto-validation for coordinates
  useEffect(() => {
    if (autoValidate && inputMode === "coords" && 
        bounds.latMin && bounds.latMax && bounds.lngMin && bounds.lngMax) {
      validateCoordinates();
    }
  }, [bounds, autoValidate, inputMode]);

  // Coordinate validation function
  const validateCoordinates = async () => {
    if (!bounds.latMin || !bounds.latMax || !bounds.lngMin || !bounds.lngMax) return;
    
    setIsValidating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "coordinates",
          bounds: bounds
        })
      });
      
      if (response.ok) {
        const validation = await response.json();
        setValidationResults(prev => ({
          ...prev,
          coordinates: validation
        }));
        clearErrors();
      } else {
        const error = await response.text();
        addError(`Coordinate validation failed: ${error}`);
      }
    } catch (err) {
      console.error("Coordinate validation error:", err);
      addError(`Coordinate validation error: ${err.message}`);
    }
    setIsValidating(false);
  };

  // Manual validation trigger
  const triggerValidation = async (type, data) => {
    setIsValidating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...data })
      });
      
      if (response.ok) {
        const validation = await response.json();
        setValidationResults(prev => ({
          ...prev,
          [type]: validation
        }));
        clearErrors();
        return validation;
      } else {
        const error = await response.text();
        addError(`${type} validation failed: ${error}`);
      }
    } catch (err) {
      console.error(`${type} validation error:`, err);
      addError(`${type} validation error: ${err.message}`);
    }
    setIsValidating(false);
  };

  // File validation
  const validateFile = async (file) => {
    if (!file) return;
    
    // Client-side basic validation
    const clientValidation = {
      is_valid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      clientValidation.errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 100MB)`);
      clientValidation.is_valid = false;
    }

    // Check file extension
    const validExtensions = ['.tif', '.tiff', '.geotiff', '.shp', '.kml', '.kmz', '.gpx', '.geojson'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      clientValidation.errors.push(`Invalid file type: ${fileExtension}. Supported: ${validExtensions.join(', ')}`);
      clientValidation.is_valid = false;
    } else {
      clientValidation.info.push(`Valid file type: ${fileExtension}`);
    }

    clientValidation.info.push(`File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    setValidationResults(prev => ({
      ...prev,
      file: clientValidation
    }));

    return clientValidation;
  };

  // ----------------- Enhanced Save Polygon Function -----------------
  // Use useCallback to ensure we always have the latest currentProject
  const savePolygon = useCallback(async (geojsonGeometry, name = "Polygon") => {
    try {
      // Require project selection before creating polygons
      if (!currentProject) {
        addError("Please select a project before creating a polygon. Polygons must be associated with a project.");
        throw new Error("Project selection required");
      }

      // Create polygon name with project name
      const projectName = (currentProject.title || currentProject.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30); // Sanitize project name
      const polygonName = `${projectName}_${name}_${new Date().toISOString().split('T')[0]}`;
      
      const payload = { 
        geojson: geojsonGeometry, 
        name: polygonName,
        data_types: selectedDataTypes,
        target_crs: targetCRS,
        preprocessing: preprocessingOptions,
        project_id: currentProject.id,  // Always require project ID
        user_id: user?.id  // Include user ID for proper filtering
      };
      
      console.log("Saving polygon with payload:", payload);
      console.log("Polygon will be associated with project:", currentProject.title || currentProject.name, "(ID:", currentProject.id, ")");
      
      const res = await authenticatedFetch(`${API_BASE_URL}/api/polygon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const responseData = await res.json();
      console.log("Polygon saved successfully:", responseData);
      
      // Update project status from Planning to In Progress when first polygon is created
      if (currentProject.status === 'Planning') {
        try {
          await authenticatedFetch(`${API_BASE_URL}/api/projects/${currentProject.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              progress: 10, // Set initial progress to trigger status change
              status: 'In Progress'
            })
          });
          console.log("Project status updated to In Progress");
        } catch (statusErr) {
          console.error("Failed to update project status:", statusErr);
          // Don't fail polygon save if status update fails
        }
      }
      
      // Handle validation results from polygon save
      if (responseData.polygon && responseData.polygon.validation_status) {
        setValidationResults(prev => ({
          ...prev,
          polygon: responseData.polygon.validation_status
        }));
      }
      
      clearErrors();
      setLastSavedMessage(`Polygon "${polygonName}" saved for project: ${currentProject.title || currentProject.name}. View analysis on the Terrain page.`);
      return responseData.polygon;
    } catch (err) {
      console.error("Error saving polygon:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      if (err.message !== "Project selection required") {
        // Provide more helpful error messages
        if (err.message && err.message.includes('Failed to connect')) {
          addError(`Cannot save polygon: ${err.message}`);
        } else if (err.message && err.message.includes('HTTP error')) {
          const statusMatch = err.message.match(/status: (\d+)/);
          if (statusMatch) {
            const status = statusMatch[1];
            if (status === '400') {
              addError('Invalid polygon data. Please check the coordinates and try again.');
            } else if (status === '401') {
              addError('Authentication failed. Please log in again.');
            } else if (status === '500') {
              addError('Server error. Please check the backend logs and try again.');
            } else {
              addError(`Failed to save polygon: ${err.message}`);
            }
          } else {
            addError(`Failed to save polygon: ${err.message}`);
          }
        } else {
          addError(`Failed to save polygon: ${err.message || 'Unknown error'}`);
        }
      }
      throw err;
    }
  }, [currentProject, user, selectedDataTypes, targetCRS, preprocessingOptions, addError, clearErrors, setValidationResults, setLastSavedMessage]);

  // ----------------- Fixed Handle map polygon selection -----------------
  // Use useCallback to ensure we always have the latest currentProject
  const handleMapAreaSelect = useCallback(async (areaData) => {
    console.log("handleMapAreaSelect called with data:", areaData);
    console.log("handleMapAreaSelect - currentProject:", currentProject);
    console.log("handleMapAreaSelect - currentProject?.id:", currentProject?.id);
    console.log("handleMapAreaSelect - currentProject?.title:", currentProject?.title || currentProject?.name);
    
    // Check if project is selected before allowing polygon creation
    if (!currentProject) {
      console.error("No project selected when trying to create polygon!");
      console.error("Current currentProject state:", currentProject);
      addError("Please select a project from the header first. Polygons must be associated with a project.");
      return;
    }
  
  if (!areaData || typeof areaData !== 'object') {
    addError("Invalid bounds received from map: null or non-object");
    return;
  }

  let newBounds = { ...areaData };
  let drawnGeometry = null;
  const extractBoundsFromCoords = (coordinates) => {
    if (!Array.isArray(coordinates)) return null;
    const flatten = (coords) => {
      if (!Array.isArray(coords)) return [];
      if (typeof coords[0] === 'number') return [coords];
      return coords.flatMap(flatten);
    };
    const points = flatten(coordinates);
    if (!points.length) return null;
    const lngValues = points.map(coord => coord[0]);
    const latValues = points.map(coord => coord[1]);
    return {
      lngMin: Math.min(...lngValues),
      lngMax: Math.max(...lngValues),
      latMin: Math.min(...latValues),
      latMax: Math.max(...latValues)
    };
  };

  if (areaData.type === 'Feature' && areaData.geometry) {
    drawnGeometry = areaData.geometry;
    const extracted = extractBoundsFromCoords(areaData.geometry.coordinates);
    if (extracted) {
      newBounds = extracted;
      console.log("Extracted bounds from GeoJSON:", newBounds);
    }
  } else if (areaData.type === 'Polygon' && areaData.coordinates) {
    drawnGeometry = areaData;
    const extracted = extractBoundsFromCoords(areaData.coordinates);
    if (extracted) {
      newBounds = extracted;
      console.log("Extracted bounds from Polygon:", newBounds);
    }
  }

  // Ensure all required properties exist with fallback values
  const requiredProps = ['latMin', 'latMax', 'lngMin', 'lngMax'];
  const missingProps = requiredProps.filter(prop => 
    newBounds[prop] === undefined || newBounds[prop] === null || newBounds[prop] === ''
  );

  if (missingProps.length > 0) {
    console.warn("Missing bounds properties:", missingProps);
    console.warn("Received bounds object:", newBounds);
    
    // Try to extract bounds from alternative structures
    if (newBounds._southWest && newBounds._northEast) {
      // Leaflet bounds format
      newBounds = {
        latMin: newBounds._southWest.lat,
        lngMin: newBounds._southWest.lng,
        latMax: newBounds._northEast.lat,
        lngMax: newBounds._northEast.lng
      };
      console.log("Converted from Leaflet bounds:", newBounds);
    } else if (newBounds.southwest && newBounds.northeast) {
      // Google Maps bounds format
      newBounds = {
        latMin: newBounds.southwest.lat,
        lngMin: newBounds.southwest.lng,
        latMax: newBounds.northeast.lat,
        lngMax: newBounds.northeast.lng
      };
      console.log("Converted from Google Maps bounds:", newBounds);
    } else {
      addError(`Missing required bounds properties: ${missingProps.join(', ')}`);
      return;
    }
  }

  // Final validation check
  const finalMissingProps = requiredProps.filter(prop => 
    newBounds[prop] === undefined || newBounds[prop] === null || newBounds[prop] === ''
  );

  if (finalMissingProps.length > 0) {
    addError(`Unable to extract valid bounds. Missing: ${finalMissingProps.join(', ')}`);
    return;
  }

  setBounds(newBounds);
  setLoading(true);
  clearErrors();

  const fallbackGeometry = {
    type: "Polygon",
    coordinates: [[
      [newBounds.lngMin, newBounds.latMin],
      [newBounds.lngMax, newBounds.latMin],
      [newBounds.lngMax, newBounds.latMax],
      [newBounds.lngMin, newBounds.latMax],
      [newBounds.lngMin, newBounds.latMin]
    ]]
  };

  const geojson = {
    type: "Feature",
    geometry: drawnGeometry || fallbackGeometry,
    properties: {
      data_types: selectedDataTypes,
      target_crs: targetCRS,
      preprocessing: preprocessingOptions
    }
  };

  try {
    const savedPolygon = await savePolygon(geojson.geometry, "Map Selection");
    if (savedPolygon) {
      setPolygons(prev => [...prev, savedPolygon]);
      setSelectedPolygon(savedPolygon);
    }
    clearErrors();
  } catch (err) {
    console.error("Map processing error:", err);
    addError(`Map processing failed: ${err.message}`);
  }

  setLoading(false);
  }, [currentProject, selectedDataTypes, targetCRS, preprocessingOptions, addError, savePolygon, setBounds, setPolygons, setSelectedPolygon, clearErrors, setLoading]);
  
  // ----------------- Enhanced coordinate form handler -----------------
  const handleCoordsSubmit = async (values, { setSubmitting, setFieldError }) => {
    // Require project selection
    if (!currentProject) {
      addError("Please select a project from the header first. Polygons must be associated with a project.");
      setSubmitting(false);
      return;
    }
    
    // Update bounds state
    const newBounds = {
      latMin: values.latMin.toString(),
      latMax: values.latMax.toString(),
      lngMin: values.lngMin.toString(),
      lngMax: values.lngMax.toString()
    };
    setBounds(newBounds);
    
    // Validate before submission
    if (autoValidate) {
      const validation = await triggerValidation("coordinates", { bounds: newBounds });
      if (validation && !validation.is_valid) {
        addError("Please fix validation errors before submitting");
        setSubmitting(false);
        return;
      }
    }
    
    setLoading(true);
    clearErrors();

    try {
      const payload = {
        ...newBounds,
        data_types: selectedDataTypes,
        target_crs: targetCRS,
        preprocessing: preprocessingOptions
      };

      const res = await fetch(`${API_BASE_URL}/dem_from_coords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Coordinate processing failed: ${errorText}`);
      }
      
      const data = await res.json();
      
      // Handle validation results
      if (data.validation) {
        setValidationResults(prev => ({
          ...prev,
          coords_processing: data.validation
        }));
      }
      
      setResult(data);
      clearErrors();
    } catch (err) {
      console.error("Coordinate processing error:", err);
      addError(`Coordinate processing failed: ${err.message}`);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // ----------------- Enhanced file upload handler -----------------
  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    // Require project selection
    if (!currentProject) {
      addError("Please select a project from the header first. Polygons must be associated with a project.");
      return;
    }
    
    if (!uploadedFile) {
      addError("No file selected");
      return;
    }

    // Validate file before upload
    const fileValidation = await validateFile(uploadedFile);
    if (!fileValidation.is_valid) {
      addError("Please fix file validation errors before uploading");
      return;
    }

    setLoading(true);
    clearErrors();

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("data_types", JSON.stringify(selectedDataTypes));
    formData.append("target_crs", targetCRS);
    formData.append("preprocessing", JSON.stringify(preprocessingOptions));

    try {
      const res = await fetch(`${API_BASE_URL}/upload_dem`, {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`File upload failed: ${errorText}`);
      }
      
      const data = await res.json();
      
      // Handle validation results from file upload
      if (data.validation) {
        setValidationResults(prev => ({
          ...prev,
          file_upload: data.validation
        }));
      }
      
      setResult(data);
      clearErrors();
    } catch (err) {
      console.error("File upload error:", err);
      addError(`File upload failed: ${err.message}`);
    }

    setLoading(false);
  };

  // Handle file selection with validation
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    setUploadedFile(file);
    
    if (file && autoValidate) {
      await validateFile(file);
    }
  };

  // ----------------- Enhanced analysis runner -----------------
  const goToTerrain = () => navigate("/terrain");

  // Handle data type changes
  const handleDataTypeChange = (typeId, checked) => {
    setSelectedDataTypes(prev => 
      checked 
        ? [...prev, typeId]
        : prev.filter(id => id !== typeId)
    );
  };

  // Handle preprocessing option changes
  const handlePreprocessingChange = (option, value) => {
    setPreprocessingOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  // ----------------- Project Integration Functions -----------------
  // Extract coordinates from project metadata when currentProject changes
  useEffect(() => {
    if (currentProject) {
      if (currentProject.metadata && currentProject.metadata.coordinates) {
        const coords = currentProject.metadata.coordinates;
        setProjectLocation({
          lat: coords.lat,
          lng: coords.lng,
          address: currentProject.location
        });
        console.log("Project location set:", coords);
      } else {
        setProjectLocation(null);
      }
    } else {
      setProjectLocation(null);
    }
  }, [currentProject]);

  // Function to center map on project location
  const centerMapOnProject = () => {
    if (projectLocation && window.L && window.L.map) {
      // This will be called by the MapDraw component
      return {
        center: [projectLocation.lat, projectLocation.lng],
        zoom: 15
      };
    }
    return null;
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-10 font-montserrat min-h-screen animate-fade-in lg:p-4 sm:p-3">
        <div className="mb-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">Data Ingestion</h1>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">
          Integrate terrain, land use, zoning, and environmental data with automated validation and preprocessing
        </p>
        </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 text-red-600 dark:text-red-400 p-6 rounded-2xl mb-6 border-l-4 border-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.15)]">
          <h4>Errors:</h4>
          <ul>
            {errors.map((error, idx) => (
              <li key={idx} className="text-sm mb-1">{error}</li>
            ))}
          </ul>
          <button className="py-3.5 px-7 bg-gradient-base text-white border-none rounded-xl cursor-pointer text-[0.9375rem] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none-small" onClick={clearErrors}>Clear Errors</button>
        </div>
      )}

      {/* Validation Controls */}
      <div className="mb-6 p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-accent-light-border/10 dark:border-accent-dark-border/10 flex items-center gap-4">
        <label>
          <input
            type="checkbox"
            checked={autoValidate}
            onChange={(e) => setAutoValidate(e.target.checked)}
          />
          Auto-validate data
        </label>
        {isValidating && <span className="ml-4 text-accent italic font-medium flex items-center gap-2 before:content-['⏳'] before:animate-spin">Validating...</span>}
      </div>

      {/* Project Selection */}
      {projects.length > 0 && (
        <div className="mb-6 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-accent-light-border/10 dark:border-accent-dark-border/10">
          <h4>Select Project (Required)</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            <strong>⚠️ Important:</strong> You must select a project before creating polygons. All polygons will be associated with the selected project.
          </p>
          {location.state?.project && (
            <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <strong>🎯 Pre-selected Project:</strong> {location.state.project.title}
              <br />
              <span className="text-sm text-slate-500 dark:text-slate-400">📍 {location.state.project.location}</span>
            </div>
          )}
          <div className="mt-4">
            {currentProject ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <strong>✅ Current Project:</strong> {currentProject.title || currentProject.name}
                <br />
                <strong>Location:</strong> {currentProject.location}
                {projectLocation && (
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    <strong>Coordinates:</strong> {projectLocation.lat.toFixed(6)}, {projectLocation.lng.toFixed(6)}
                  </div>
                )}
                <div style={{marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '0.5rem', fontSize: '0.875rem'}}>
                  <strong>📌 Note:</strong> All polygons created will be associated with this project. Change project from the header.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl" style={{padding: '1rem', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '0.5rem'}}>
                <strong>⚠️ No Project Selected:</strong> Please select a project from the header to create polygons.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coordinate System Selection */}
      <CoordinateSystemSelector 
        selectedCRS={targetCRS}
        onCRSChange={setTargetCRS}
      />

      {/* Mode Switcher */}
      <div className="flex justify-center gap-2 mb-8 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] max-w-[800px] mx-auto">
        <label className="flex items-center gap-2 py-3 px-6 rounded-xl cursor-pointer transition-all duration-300 font-medium text-slate-500 dark:text-slate-400 relative flex-1 justify-center hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 has-[:checked]:bg-gradient-base has-[:checked]:text-white has-[:checked]:shadow-[0_4px_12px_rgba(102,126,234,0.4)]">
          <input
            type="radio"
            value="map"
            checked={inputMode === "map"}
            onChange={() => setInputMode("map")}
            disabled={!currentProject}
            className="m-0 w-[18px] h-[18px] cursor-pointer accent-accent"
          />
          <span>Select on Map</span>
          {!currentProject && <span className="text-xs text-red-500 ml-2">⚠️ Select project from header first</span>}
        </label>
        <label className="flex items-center gap-2 py-3 px-6 rounded-xl cursor-pointer transition-all duration-300 font-medium text-slate-500 dark:text-slate-400 relative flex-1 justify-center hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 has-[:checked]:bg-gradient-base has-[:checked]:text-white has-[:checked]:shadow-[0_4px_12px_rgba(102,126,234,0.4)]">
          <input
            type="radio"
            value="coords"
            checked={inputMode === "coords"}
            onChange={() => setInputMode("coords")}
            disabled={!currentProject}
            className="m-0 w-[18px] h-[18px] cursor-pointer accent-accent"
          />
          <span>Enter Coordinates</span>
          {!currentProject && <span className="text-xs text-red-500 ml-2">⚠️ Select project from header first</span>}
        </label>
        <label className="flex items-center gap-2 py-3 px-6 rounded-xl cursor-pointer transition-all duration-300 font-medium text-slate-500 dark:text-slate-400 relative flex-1 justify-center hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 has-[:checked]:bg-gradient-base has-[:checked]:text-white has-[:checked]:shadow-[0_4px_12px_rgba(102,126,234,0.4)]">
          <input
            type="radio"
            value="file"
            checked={inputMode === "file"}
            onChange={() => setInputMode("file")}
            disabled={!currentProject}
            className="m-0 w-[18px] h-[18px] cursor-pointer accent-accent"
          />
          Upload Data Files
          {!currentProject && <span style={{fontSize: '0.75rem', color: '#ef4444', marginLeft: '0.5rem'}}>⚠️ Select project from header first</span>}
        </label>
      </div>
      
      {!currentProject && (
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 text-red-600 dark:text-red-400 p-6 rounded-2xl mb-6 border-l-4 border-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.15)]" style={{marginTop: '1rem'}}>
          <strong>⚠️ Project Selection Required:</strong> Please select a project above before creating polygons. All polygons must be associated with a project.
        </div>
      )}

      {/* Polygon selector + Run analysis button */}
      {polygons.length > 0 && inputMode === "map" && (
        <div className="polygon-selector-container">
          <select
            value={selectedPolygon?.id || ""}
            onChange={(e) => {
              const poly = polygons.find((p) => p.id === parseInt(e.target.value));
              setSelectedPolygon(poly);
            }}
          >
            {polygons.map((p) => (
              <option key={p.id} value={p.id}>{p.name || `Polygon ${p.id}`}</option>
            ))}
          </select>
          <button className="py-3.5 px-7 bg-gradient-base text-white border-none rounded-xl cursor-pointer text-[0.9375rem] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none" onClick={goToTerrain} disabled={loading}>
            View Terrain Analysis
          </button>
        </div>
      )}

      {lastSavedMessage && (
        <div className="analysis-alert alert-info" style={{ marginTop: 10 }}>
          {lastSavedMessage} <button className="py-3.5 px-7 bg-gradient-base text-white border-none rounded-xl cursor-pointer text-[0.9375rem] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none-small" onClick={goToTerrain}>Open</button>
        </div>
      )}

      {/* Validation Results Display */}
      {Object.keys(validationResults).length > 0 && (
        <div className="validation-results">
          {validationResults.coordinates && (
            <ValidationStatus 
              validation={validationResults.coordinates} 
              title="Coordinates" 
              onRetry={() => triggerValidation("coordinates", { bounds })}
            />
          )}
          {validationResults.polygon && (
            <ValidationStatus validation={validationResults.polygon} title="Polygon" />
          )}
          {validationResults.file && (
            <ValidationStatus 
              validation={validationResults.file} 
              title="File" 
              onRetry={() => uploadedFile && validateFile(uploadedFile)}
            />
          )}
          {validationResults.file_upload && (
            <ValidationStatus validation={validationResults.file_upload} title="File Upload" />
          )}
          {validationResults.dem_processing && (
            <>
              {validationResults.dem_processing.geojson_validation && (
                <ValidationStatus validation={validationResults.dem_processing.geojson_validation} title="GeoJSON" />
              )}
              {validationResults.dem_processing.dem_file_validation && (
                <ValidationStatus validation={validationResults.dem_processing.dem_file_validation} title="DEM File" />
              )}
              {validationResults.dem_processing.processing_validation && (
                <ValidationStatus validation={validationResults.dem_processing.processing_validation} title="Processing Quality" />
              )}
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex justify-center items-start min-h-[400px] mb-8">
        {inputMode === "map" && (
          <MapDraw
            onAreaSelect={handleMapAreaSelect}
            projectLocation={projectLocation}
            selectedProject={currentProject}
          />
        )}

        {inputMode === "coords" && (
          <Formik
            initialValues={initialCoordinateValues}
            validationSchema={coordinateSchema}
            onSubmit={handleCoordsSubmit}
            validateOnChange={true}
            validateOnBlur={true}
            enableReinitialize={true}
          >
            {({ errors, touched, isSubmitting, values, setFieldValue }) => {
              // Sync form values with bounds state
              React.useEffect(() => {
                if (values.latMin !== bounds.latMin || values.latMax !== bounds.latMax || 
                    values.lngMin !== bounds.lngMin || values.lngMax !== bounds.lngMax) {
                  setBounds({
                    latMin: values.latMin || "",
                    latMax: values.latMax || "",
                    lngMin: values.lngMin || "",
                    lngMax: values.lngMax || ""
                  });
                }
              }, [values.latMin, values.latMax, values.lngMin, values.lngMax]);

              return (
                <Form className="flex flex-col gap-5 w-full max-w-[600px] bg-white dark:bg-slate-800 p-8 rounded-[1.25rem] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] border border-accent-light-border/10 dark:border-accent-dark-border/10 transition-all duration-300 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] hover:-translate-y-0.5">
                  <ValidationSummary errors={errors} className="mb-2" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <Field name="latMin">
                        {({ field, form }) => (
                          <input
                            {...field}
                            type="number"
                            step="any"
                            placeholder="Latitude Min"
                            className={`
                              py-3.5 px-4 border-2 rounded-xl text-[0.9375rem] transition-all duration-200 font-medium focus:outline-none focus:shadow-[0_0_0_3px_rgba(69,136,173,0.1)] placeholder:text-slate-400 dark:placeholder:text-slate-500
                              ${form.touched.latMin && form.errors.latMin
                                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 focus:border-red-500 dark:focus:border-red-400'
                                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:border-accent focus:bg-white dark:focus:bg-slate-600'
                              }
                            `}
                          />
                        )}
                      </Field>
                      {errors.latMin && touched.latMin && (
                        <ErrorMessage error={errors.latMin} />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Field name="latMax">
                        {({ field, form }) => (
                          <input
                            {...field}
                            type="number"
                            step="any"
                            placeholder="Latitude Max"
                            className={`
                              py-3.5 px-4 border-2 rounded-xl text-[0.9375rem] transition-all duration-200 font-medium focus:outline-none focus:shadow-[0_0_0_3px_rgba(69,136,173,0.1)] placeholder:text-slate-400 dark:placeholder:text-slate-500
                              ${form.touched.latMax && form.errors.latMax
                                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 focus:border-red-500 dark:focus:border-red-400'
                                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:border-accent focus:bg-white dark:focus:bg-slate-600'
                              }
                            `}
                          />
                        )}
                      </Field>
                      {errors.latMax && touched.latMax && (
                        <ErrorMessage error={errors.latMax} />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Field name="lngMin">
                        {({ field, form }) => (
                          <input
                            {...field}
                            type="number"
                            step="any"
                            placeholder="Longitude Min"
                            className={`
                              py-3.5 px-4 border-2 rounded-xl text-[0.9375rem] transition-all duration-200 font-medium focus:outline-none focus:shadow-[0_0_0_3px_rgba(69,136,173,0.1)] placeholder:text-slate-400 dark:placeholder:text-slate-500
                              ${form.touched.lngMin && form.errors.lngMin
                                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 focus:border-red-500 dark:focus:border-red-400'
                                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:border-accent focus:bg-white dark:focus:bg-slate-600'
                              }
                            `}
                          />
                        )}
                      </Field>
                      {errors.lngMin && touched.lngMin && (
                        <ErrorMessage error={errors.lngMin} />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Field name="lngMax">
                        {({ field, form }) => (
                          <input
                            {...field}
                            type="number"
                            step="any"
                            placeholder="Longitude Max"
                            className={`
                              py-3.5 px-4 border-2 rounded-xl text-[0.9375rem] transition-all duration-200 font-medium focus:outline-none focus:shadow-[0_0_0_3px_rgba(69,136,173,0.1)] placeholder:text-slate-400 dark:placeholder:text-slate-500
                              ${form.touched.lngMax && form.errors.lngMax
                                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 focus:border-red-500 dark:focus:border-red-400'
                                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:border-accent focus:bg-white dark:focus:bg-slate-600'
                              }
                            `}
                          />
                        )}
                      </Field>
                      {errors.lngMax && touched.lngMax && (
                        <ErrorMessage error={errors.lngMax} />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-2">
                    <button 
                      type="button" 
                      className="py-3.5 px-7 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer text-[0.9375rem] font-semibold transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-500" 
                      onClick={() => triggerValidation("coordinates", { bounds: {
                        latMin: values.latMin || "",
                        latMax: values.latMax || "",
                        lngMin: values.lngMin || "",
                        lngMax: values.lngMax || ""
                      }})}
                      disabled={isValidating}
                    >
                      {isValidating ? "Validating..." : "Validate Coordinates"}
                    </button>
                    <LoadingButton
                      type="submit"
                      loading={loading || isSubmitting}
                      disabled={loading || isSubmitting || (validationResults.coordinates && !validationResults.coordinates.is_valid)}
                      className="py-3.5 px-7 bg-gradient-base text-white border-none rounded-xl text-[0.9375rem] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                    >
                      Process Data
                    </LoadingButton>
                  </div>
                </Form>
              );
            }}
          </Formik>
        )}

        {inputMode === "file" && (
          <form onSubmit={handleFileUpload} className="flex flex-col gap-5 w-full max-w-[600px] bg-white dark:bg-slate-800 p-8 rounded-[1.25rem] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] border border-accent-light-border/10 dark:border-accent-dark-border/10 transition-all duration-300 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] hover:-translate-y-0.5">
            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept=".tif,.tiff,.geotiff,.shp,.kml,.kmz,.gpx,.geojson"
                onChange={handleFileSelect}
                required
                className="py-3.5 px-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-[0.9375rem] transition-all duration-200 bg-slate-50 dark:bg-slate-700 font-medium focus:outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-600 focus:shadow-[0_0_0_3px_rgba(69,136,173,0.1)]"
              />
              <div className="text-sm text-slate-500 dark:text-slate-400">
                <p>Supported formats: GeoTIFF, Shapefile, KML, GPX, GeoJSON</p>
                <p>Maximum file size: 100MB</p>
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              {uploadedFile && (
                <button 
                  type="button" 
                  className="py-3.5 px-7 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer text-[0.9375rem] font-semibold transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-500" 
                  onClick={() => validateFile(uploadedFile)}
                  disabled={isValidating}
                >
                  {isValidating ? "Validating..." : "Validate File"}
                </button>
              )}
              <button 
                type="submit" 
                className="py-3.5 px-7 bg-gradient-base text-white border-none rounded-xl cursor-pointer text-[0.9375rem] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(102,126,234,0.4)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none" 
                disabled={loading || !uploadedFile || (validationResults.file && !validationResults.file.is_valid)}
              >
                {loading ? "Processing..." : "Upload & Process"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-center text-base text-slate-600 dark:text-slate-400">Processing data... This may take a few moments.</p>
        </div>
      )}

      {/* Results removed from Data Ingestion; view them on Terrain page */}

      </div>
    </MainLayout>
  );
}

