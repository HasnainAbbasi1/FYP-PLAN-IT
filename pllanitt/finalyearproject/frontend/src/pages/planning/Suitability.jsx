import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Home, ShoppingBag, Factory, TreeDeciduous, Map, Zap, Clock, AlertTriangle, XCircle, FileText, TrendingUp, Lightbulb, DollarSign, Shield } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authHelper, authenticatedFetch } from '@/utils/authHelper';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import SuitabilityMap from '@/components/planning/SuitabilityMap';

const API_BASE_URL = "http://localhost:8000";

const Suitability = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [heatmapUrl, setHeatmapUrl] = useState(null);
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [suitabilityClassification, setSuitabilityClassification] = useState(null);
  const [chartsUrl, setChartsUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [classifiedUrl, setClassifiedUrl] = useState(null);
  const [tifUrl, setTifUrl] = useState(null);
  const [jsonUrl, setJsonUrl] = useState(null);
  const [residentialSuitability, setResidentialSuitability] = useState(null);
  const [commercialSuitability, setCommercialSuitability] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  
  // NEW: Enhanced analysis features
  const [developmentType, setDevelopmentType] = useState('residential');
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [enhancedWarnings, setEnhancedWarnings] = useState([]);
  const [factorContributions, setFactorContributions] = useState(null);

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

  // Load saved land suitability analysis when polygon is selected
  useEffect(() => {
    const loadSavedAnalysis = async () => {
      if (!selectedPolygon || !currentProject) {
        // Clear analysis data if no polygon selected
        setAnalysisData(null);
        setHeatmapUrl(null);
        setSummary(null);
        setStats(null);
        setSuggestions([]);
        setWarnings([]);
        setRestrictions([]);
        setSuitabilityClassification(null);
        setChartsUrl(null);
        setPreviewUrl(null);
        setClassifiedUrl(null);
        setTifUrl(null);
        setJsonUrl(null);
        setResidentialSuitability(null);
        setCommercialSuitability(null);
        setAiRecommendations([]);
        return;
      }

      try {
        console.log('Checking for saved land suitability analysis for polygon:', selectedPolygon.id);
        const url = `${API_BASE_URL}/api/land_suitability?polygon_id=${selectedPolygon.id}&project_id=${currentProject.id}`;
        const res = await authenticatedFetch(url);
        
        if (res.ok) {
          const data = await res.json();
          
          if (data.status === 'success' && data.land_suitability) {
            const savedAnalysis = data.land_suitability;
            console.log('Found saved land suitability analysis:', savedAnalysis.id);
            
            // Parse results if needed
            const results = typeof savedAnalysis.results === 'string' 
              ? JSON.parse(savedAnalysis.results) 
              : (savedAnalysis.results || {});
            
            // Restore all analysis data
            if (savedAnalysis.analysis_summary || results.analysis_summary) {
              const summary = savedAnalysis.analysis_summary || results.analysis_summary;
              setSummary({
                mean_score: summary.scores?.mean_score || summary.confidence || 0,
                max_score: summary.scores?.max_score || 95.0,
                min_score: summary.scores?.min_score || 75.0,
                suitability_class: summary.suitability_class,
                suitability_label: summary.suitability_label,
                confidence: summary.confidence,
                probabilities: summary.probabilities
              });
            }
            
            if (results || savedAnalysis.results) {
              setStats({
                percentages: (savedAnalysis.analysis_summary || results.analysis_summary)?.suitability_percentages || results.suitability_percentages || {},
                terrain_features: (savedAnalysis.analysis_summary || results.analysis_summary)?.terrain_features || results.terrain_features || {},
                water_availability: results.water_availability || {},
                flood_analysis: results.flood_analysis || {},
                erosion_analysis: results.erosion_analysis || {},
                hydrology_summary: (savedAnalysis.hydrology || results.hydrology)?.summary || null
              });
            }
            
            setSuggestions(savedAnalysis.recommendations || results.recommendations || []);
            setWarnings(savedAnalysis.warnings || results.warnings || []);
            setRestrictions(savedAnalysis.restrictions || results.restrictions || []);
            setSuitabilityClassification(savedAnalysis.suitability_classification || results.suitability_classification || null);
            setResidentialSuitability(savedAnalysis.residential_suitability || results.residential_suitability || null);
            setCommercialSuitability(savedAnalysis.commercial_suitability || results.commercial_suitability || null);
            setAiRecommendations(savedAnalysis.ai_recommendations || results.ai_recommendations || []);
            
            // Restore visualization URLs
            if (savedAnalysis.heatmap_url || results.heatmap_url) setHeatmapUrl(savedAnalysis.heatmap_url || results.heatmap_url);
            if (savedAnalysis.charts_url || results.charts_url) setChartsUrl(savedAnalysis.charts_url || results.charts_url);
            if (savedAnalysis.preview_url || results.preview_url) setPreviewUrl(savedAnalysis.preview_url || results.preview_url);
            if (savedAnalysis.classified_url || results.classified_url) setClassifiedUrl(savedAnalysis.classified_url || results.classified_url);
            if (savedAnalysis.tif_url || results.tif_url) setTifUrl(savedAnalysis.tif_url || results.tif_url);
            if (savedAnalysis.json_url || results.json_url) setJsonUrl(savedAnalysis.json_url || results.json_url);
            
            // Set analysis data for reference
            setAnalysisData({ ...results, loaded_from_saved: true, saved_at: savedAnalysis.created_at });
            
            toast({
              title: "📊 Analysis Restored",
              description: `Previous analysis from ${new Date(savedAnalysis.created_at).toLocaleDateString()} has been loaded`,
              duration: 4000
            });
          } else {
            console.log('ℹ️ No saved land suitability analysis found for this polygon');
            // Clear any previous analysis data
            setAnalysisData(null);
            setHeatmapUrl(null);
            setSummary(null);
            setStats(null);
            setSuggestions([]);
          }
        } else {
          console.log('ℹ️ No saved land suitability analysis found (response not ok)');
          setAnalysisData(null);
        }
      } catch (error) {
        console.warn('Failed to load saved land suitability analysis:', error.message);
        // Clear analysis data on error
        setAnalysisData(null);
      }
    };

    loadSavedAnalysis();
	}, [selectedPolygon?.id, currentProject?.id]); // Only depend on IDs to avoid unnecessary re-runs

  // If navigated from Terrain with ready results, hydrate the UI
  useEffect(() => {
    const payload = location.state?.suitability;
    if (payload) {
      setHeatmapUrl(payload.heatmap_url || payload.heatmap || null);
      if (payload.stats) setStats(payload.stats);
      if (payload.suggestions) setSuggestions(payload.suggestions);
      if (payload.summary) setSummary(payload.summary); // from legacy node route
      else if (payload.stats && payload.stats.percentages) {
        const perc = payload.stats.percentages;
        setSummary({
          mean_score: ((perc.high * 2 + perc.medium * 1 + perc.low * 0) / 100),
          max_score: Math.max(perc.low, perc.medium, perc.high),
          min_score: Math.min(perc.low, perc.medium, perc.high)
        });
      }
    }
  }, [location.state]);


  // Handle polygon selection
  const handlePolygonSelection = (polygonId) => {
    const polygon = polygons.find(p => p.id === parseInt(polygonId));
    const previousPolygonId = selectedPolygon?.id;
    setSelectedPolygon(polygon);
    
    // Only clear analysis if selecting a different polygon
    // The useEffect will load saved analysis for the new polygon
    if (previousPolygonId !== polygon?.id) {
      setAnalysisData(null);
      setHeatmapUrl(null);
      setSummary(null);
      setStats(null);
      setSuggestions([]);
      setWarnings([]);
      setRestrictions([]);
      setSuitabilityClassification(null);
      setChartsUrl(null);
      setPreviewUrl(null);
      setClassifiedUrl(null);
      setTifUrl(null);
      setJsonUrl(null);
      setResidentialSuitability(null);
      setCommercialSuitability(null);
      setAiRecommendations([]);
    }
  };

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
    setSummary(null);
    setStats(null);
    setSuggestions([]);
    setWarnings([]);
    setRestrictions([]);
    setSuitabilityClassification(null);
    setChartsUrl(null);
    setPreviewUrl(null);
    setClassifiedUrl(null);
    setTifUrl(null);
    setJsonUrl(null);
    setResidentialSuitability(null);
    setCommercialSuitability(null);
    setAiRecommendations([]);
    setHeatmapUrl(null);
    
    try {
      const payload = {
        geojson: selectedPolygon.geojson,
        polygon_id: selectedPolygon.id,
        user_id: user?.id,
        project_id: currentProject?.id,
        development_type: developmentType, // NEW: Include development type
        analysis_depth: 'comprehensive' // NEW: Request comprehensive analysis
      };
      
      // Show real-time analysis progress
      toast({
        title: "🔄 Professional Analysis Started",
        description: `Analyzing for ${developmentType} development with multi-criteria evaluation...`,
        duration: 3000
      });
      
      // Use the enhanced land suitability endpoint (processes DEM in real-time)
      // This goes through Node.js backend which proxies to Python backend
      let res;
      try {
        res = await authenticatedFetch(`${API_BASE_URL}/api/land_suitability_enhanced`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (networkError) {
        // If connection refused, the Node.js backend might not be running
        if (networkError.message.includes('Failed to fetch') || networkError.message.includes('ERR_CONNECTION_REFUSED')) {
          throw new Error('Cannot connect to backend server. Please ensure:\n1. Node.js backend is running on port 8000\n2. Python backend is running on port 5002\n\nStart them with:\n- Node.js: cd backend && npm start\n- Python: cd backend && py -m uvicorn main:app --host 127.0.0.1 --port 5002');
        }
        throw networkError;
      }
      
      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch (jsonError) {
          // If JSON parsing fails, try to get text
          const errorText = await res.text();
          errorData = { error: errorText };
        }
        const errorMessage = errorData.error || errorData.message || 'Analysis failed';
        const errorDetails = errorData.details || '';
        throw new Error(`${errorMessage}${errorDetails ? '\n' + errorDetails : ''}`);
      }
      
      const data = await res.json();
      
      // CRITICAL: Check for water body restriction FIRST
      if (data.error === "WATER AREA SELECTED" && data.restriction) {
        const restriction = data.restriction;
        setError(restriction.message);
        setAnalysisData({
          ...data,
          is_water_body: true,
          restriction: restriction
        });
        
        // Show critical warning
        toast({
          title: "🚫 WATER BODY DETECTED",
          description: restriction.message,
          variant: "destructive",
          duration: 10000
        });
        
        // Set summary to show water body status
        setSummary({
          mean_score: 0,
          max_score: 0,
          min_score: 0,
          suitability_class: "WATER_BODY",
          suitability_label: "Water Body - Development Restricted",
          confidence: 1.0,
          probabilities: { low: 1.0, medium: 0, high: 0 }
        });
        
        // Set zoning to show water body
        setSuitabilityClassification({
          zoning_stats: data.zoning_analysis?.zoning_stats || {
            1: { name: "Water Body", area_percentage: restriction.details.water_area_percentage, pixel_count: restriction.details.water_pixels },
            2: { name: "Suitable for Development", area_percentage: 0, pixel_count: 0 },
            3: { name: "Limited Development", area_percentage: 0, pixel_count: 0 },
            4: { name: "Conservation Area", area_percentage: 0, pixel_count: 0 },
            5: { name: "High-Risk (Avoid)", area_percentage: 0, pixel_count: 0 }
          }
        });
        
        setWarnings([{
          type: "WATER_BODY",
          severity: "CRITICAL",
          message: restriction.message,
          details: restriction.details
        }]);
        setRestrictions(restriction.restrictions || []);
        setSuggestions(restriction.recommendations || []);
        return; // Don't process further
      }
      
      setAnalysisData(data);
      
      // Show success message with real data info
      if (data.analysis_summary) {
        toast({
          title: "✅ Real-Time Analysis Complete",
          description: `Using REAL terrain data: Elevation ${data.analysis_summary.terrain_features?.mean_elevation?.toFixed(0) || 'N/A'}m, Slope ${data.analysis_summary.terrain_features?.mean_slope?.toFixed(1) || 'N/A'}°`,
          duration: 5000
        });
      }
      
      // Check for water body warnings
      if (data.water_info?.is_water_body || data.water_info?.water_area_percentage > 50) {
        toast({
          title: "⚠️ WATER BODY DETECTED",
          description: `${data.water_info.water_area_percentage.toFixed(1)}% of area is water - Development restricted`,
          variant: "destructive",
          duration: 8000
        });
      }
      
      // Process the enhanced results
      if (data.analysis_summary) {
        const analysisSummary = data.analysis_summary;
        const terrainData = data.terrain_data;
        
        // Set heatmap URL from response
        console.log('Land suitability response data:', data);
        console.log('Heatmap URL from data:', data.heatmap_url);
        console.log('Terrain data:', terrainData);
        
        if (data.heatmap_url) {
          console.log('Setting heatmap URL from data.heatmap_url:', data.heatmap_url);
          setHeatmapUrl(data.heatmap_url);
        } else if (terrainData && terrainData.heatmap_url) {
          console.log('Setting heatmap URL from terrainData.heatmap_url:', terrainData.heatmap_url);
          setHeatmapUrl(terrainData.heatmap_url);
        } else {
          console.log('No heatmap URL found in response');
        }
        
        // Set summary with ML model results in the format from the image
        setSummary({
          mean_score: analysisSummary.scores?.mean_score || analysisSummary.confidence,
          max_score: analysisSummary.scores?.max_score || 95.0,
          min_score: analysisSummary.scores?.min_score || 75.0,
          suitability_class: analysisSummary.suitability_class,
          suitability_label: analysisSummary.suitability_label,
          confidence: analysisSummary.confidence,
          probabilities: analysisSummary.probabilities
        });
        
        // Set stats with suitability percentages and terrain features
        setStats({
          percentages: analysisSummary.suitability_percentages,
          terrain_features: analysisSummary.terrain_features || data.terrain_data?.stats,
          water_availability: data.terrain_data?.stats?.water_availability || data.terrain_data?.water_availability,
          flood_analysis: data.terrain_data?.stats?.flood_analysis || data.terrain_data?.flood_analysis,
          erosion_analysis: data.terrain_data?.stats?.erosion_analysis || data.terrain_data?.erosion_analysis,
          hydrology_summary:
            data.terrain_data?.stats?.hydrology_summary ||
            data.terrain_data?.hydrology?.summary ||
            data.hydrology?.summary ||
            null
        });
        
        // Set recommendations
        setSuggestions(data.recommendations || []);
        
        // Set warnings and restrictions
        setWarnings(data.warnings || []);
        setRestrictions(data.restrictions || []);
        setSuitabilityClassification(data.suitability_classification || null);
        setChartsUrl(data.charts_url || null);
        setPreviewUrl(data.preview_url || null);
        setClassifiedUrl(data.classified_url || null);
        setTifUrl(data.tif_url || null);
        setJsonUrl(data.json_url || null);
        console.log('Preview URL from data:', data.preview_url);
        setResidentialSuitability(data.residential_suitability || null);
        setCommercialSuitability(data.commercial_suitability || null);
        setAiRecommendations(data.ai_recommendations || []);
        
        // NEW: Handle enhanced analysis features
        if (data.confidence_level !== undefined) {
          setConfidenceScore(data.confidence_level);
        }
        if (data.opportunities && Array.isArray(data.opportunities)) {
          setOpportunities(data.opportunities);
        }
        if (data.factor_contributions) {
          setFactorContributions(data.factor_contributions);
        }
        // Enhanced warnings with severity levels, mitigation, and costs
        if (data.warnings && Array.isArray(data.warnings)) {
          const formattedWarnings = data.warnings.map(w => ({
            ...w,
            severity: w.severity || 'MODERATE',
            category: w.category || w.type || 'General',
            mitigation: w.mitigation || null,
            cost_estimate: w.cost_estimate || null,
            confidence: w.confidence || 0.85
          }));
          setEnhancedWarnings(formattedWarnings);
        }
      }
      
      // Update project progress when analysis is completed
      if (currentProject) {
        try {
          const currentProgress = currentProject.progress || 0;
          const newProgress = Math.min(currentProgress + 15, 100); // Increment by 15%
          
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
        }
      }
      
      // Show notification that report is available
      if (data.status === 'success' || data.analysis_summary) {
        toast({
          title: "📊 Land Suitability Analysis Complete",
          description: "Report has been generated and is available in the Reports page",
          duration: 5000,
          variant: "success",
          action: {
            label: "View Report",
            onClick: () => navigate('/reports')
          }
        });
      }
    } catch (e) {
      console.error("Suitability analysis error:", e);
      const errorMessage = e.message || "Failed to run suitability analysis";
      setError(errorMessage);
      toast({
        title: "❌ Analysis Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const generateZoning = () => {
    // Navigate to zoning page with current data
    const zoningData = {
      suitability: location.state?.suitability,
      terrain: location.state?.terrain,
      polygonId: location.state?.polygonId
    };
    navigate('/zoning', { state: zoningData });
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 p-6 bg-theme-dark text-white animate-fade-in">
        <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2 animate-slide-in-left">Land Suitability</h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">AI-powered land use optimization</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold flex items-center gap-2 py-3 px-6 text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
              onClick={runAnalysis} 
              disabled={loading || !selectedPolygon}
            >
              <Zap className="w-5 h-5" />
              {loading ? 'Analyzing...' : 'Run AI Analysis'}
            </Button>
            {(heatmapUrl || stats || analysisData) && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/reports')}
                  title="View generated report"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Report
                </Button>
                <Button variant="outline" onClick={generateZoning}>
                  Generate Zoning →
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Project Display */}
        {currentProject && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Current Project</CardTitle>
              <CardDescription>Working on: {currentProject.title || currentProject.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-2 text-sm text-gray-600">
                <strong>✅ Selected Project:</strong> {currentProject.title || currentProject.name}
                <br />
                <strong>Location:</strong> {currentProject.location}
                <br />
                <strong>Status:</strong> {currentProject.status}
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                  📌 Showing only polygons for this project. Change project from the header.
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {!currentProject && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>⚠️ No Project Selected</CardTitle>
              <CardDescription>Please select a project from the header to view polygons</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Polygon Selection */}
        {polygons.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Polygon</CardTitle>
              <CardDescription>Choose a polygon to analyze land suitability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="polygon-selection-container">
                <Select
                  value={selectedPolygon?.id?.toString() || ""}
                  onValueChange={handlePolygonSelection}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a polygon" />
                  </SelectTrigger>
                  <SelectContent>
                    {polygons.map((polygon) => (
                      <SelectItem key={polygon.id} value={polygon.id.toString()}>
                        {polygon.name || `Polygon ${polygon.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPolygon && (
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>Selected Polygon:</strong> {selectedPolygon.name || `Polygon ${selectedPolygon.id}`}
                    <br />
                    <strong>Created:</strong> {new Date(selectedPolygon.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Controls */}
        {selectedPolygon && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Land Suitability Analysis</CardTitle>
              <CardDescription>Run professional multi-criteria land suitability analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {/* NEW: Development Type Selector */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">
                  Development Type
                </Label>
                <Select
                  value={developmentType}
                  onValueChange={setDevelopmentType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select development type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Residential - Houses & Apartments
                      </div>
                    </SelectItem>
                    <SelectItem value="commercial">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        Commercial - Retail & Offices
                      </div>
                    </SelectItem>
                    <SelectItem value="industrial">
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4" />
                        Industrial - Manufacturing & Warehouses
                      </div>
                    </SelectItem>
                    <SelectItem value="agriculture">
                      <div className="flex items-center gap-2">
                        <Map className="w-4 h-4" />
                        Agriculture - Farming & Cultivation
                      </div>
                    </SelectItem>
                    <SelectItem value="green_space">
                      <div className="flex items-center gap-2">
                        <TreeDeciduous className="w-4 h-4" />
                        Green Space - Parks & Conservation
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Analysis weights are optimized for the selected development type
                </p>
              </div>
              
              <Button 
                onClick={runAnalysis} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Running Analysis..." : "Run Land Suitability Analysis"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Running land suitability analysis...</p>
          </div>
        )}

        {/* Water Body Detection - Critical Alert */}
        {analysisData?.is_water_body && analysisData?.restriction && (
          <Card className="mb-6 border-red-600 bg-red-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800 text-xl">
                <XCircle className="w-6 h-6" />
                🚫 WATER AREA SELECTED - DEVELOPMENT RESTRICTED
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-red-600 bg-red-200">
                  <AlertTriangle className="w-6 h-6 text-red-800" />
                  <AlertDescription className="text-red-900 font-bold text-lg">
                    {analysisData.restriction.message}
                  </AlertDescription>
                </Alert>
                
                <div className="bg-white p-4 rounded border-2 border-red-500">
                  <h4 className="font-bold text-red-800 mb-3">Water Body Details:</h4>
                  <ul className="list-disc list-inside space-y-2 text-red-900">
                    <li><strong>Water Area:</strong> {analysisData.restriction.details.water_area_percentage.toFixed(1)}%</li>
                    <li><strong>Water Pixels:</strong> {analysisData.restriction.details.water_pixels.toLocaleString()}</li>
                    <li><strong>Total Pixels:</strong> {analysisData.restriction.details.total_pixels.toLocaleString()}</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 p-4 rounded border border-red-300">
                  <h4 className="font-bold text-red-800 mb-3">🚫 Development Restrictions:</h4>
                  <ul className="space-y-2">
                    {analysisData.restriction.restrictions.map((restriction, idx) => (
                      <li key={idx} className="text-red-900 flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>{restriction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-blue-50 p-4 rounded border border-blue-300">
                  <h4 className="font-bold text-blue-800 mb-3">💡 Recommendations:</h4>
                  <ul className="space-y-2">
                    {analysisData.restriction.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-blue-900 flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Warnings and Restrictions */}
        {warnings.length > 0 && (
          <Card className="mb-6 border-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Warnings ({warnings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {warnings.map((warning, index) => (
                  <Alert key={index} className={warning.severity === 'high' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}>
                    <AlertTriangle className={`w-4 h-4 ${warning.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}`} />
                    <AlertDescription>
                      <strong>{warning.type}:</strong> {warning.message}
                      {warning.recommendation && (
                        <div className="mt-2 text-sm italic text-gray-600">
                          💡 {warning.recommendation}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {restrictions.length > 0 && (
          <Card className="mb-6 border-red-500 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Development Restrictions ({restrictions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {restrictions.map((restriction, index) => (
                  <div key={index} className="p-3 bg-white rounded border border-red-200">
                    <p className="text-red-800 font-medium">🚫 {restriction}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-red-100 rounded border border-red-300">
                <p className="text-red-900 font-bold">
                  ⚠️ This land may not be suitable for development without significant improvements or special permits.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NEW: Confidence Score Display */}
        {confidenceScore !== null && (
          <Card className="mb-6 border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Analysis Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${
                        confidenceScore >= 0.8 ? 'bg-green-500' : 
                        confidenceScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${confidenceScore * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {(confidenceScore * 100).toFixed(0)}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Based on data quality, completeness, and analysis consistency
              </p>
            </CardContent>
          </Card>
        )}

        {/* NEW: Enhanced Warnings with Mitigation Strategies */}
        {enhancedWarnings.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Professional Analysis Warnings ({enhancedWarnings.length})
              </CardTitle>
              <CardDescription>
                Detailed constraints with actionable mitigation strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enhancedWarnings.map((warning, index) => {
                  const getSeverityColor = (sev) => {
                    switch(sev) {
                      case 'CRITICAL': return 'border-red-600 bg-red-50';
                      case 'HIGH_RISK': return 'border-orange-500 bg-orange-50';
                      case 'MODERATE': return 'border-yellow-500 bg-yellow-50';
                      default: return 'border-blue-500 bg-blue-50';
                    }
                  };
                  
                  const getSeverityIcon = (sev) => {
                    switch(sev) {
                      case 'CRITICAL': return '🚫';
                      case 'HIGH_RISK': return '⚠️';
                      case 'MODERATE': return 'ℹ️';
                      default: return '📌';
                    }
                  };
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border-2 ${getSeverityColor(warning.severity)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          <span>{getSeverityIcon(warning.severity)}</span>
                          {warning.category}
                        </h4>
                        <Badge variant={warning.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                          {warning.severity}
                        </Badge>
                      </div>
                      
                      <p className="mb-2"><strong>Issue:</strong> {warning.message}</p>
                      <p className="mb-3 text-sm text-gray-700"><strong>Impact:</strong> {warning.impact}</p>
                      
                      {warning.mitigation && (
                        <div className="bg-white p-3 rounded border mt-3">
                          <h5 className="font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Mitigation Strategy:
                          </h5>
                          <p className="text-sm mb-2">{warning.mitigation.method}</p>
                          {warning.mitigation.cost_range && (
                            <p className="text-sm flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <strong>Cost:</strong> {warning.mitigation.cost_range}
                            </p>
                          )}
                          {warning.cost_estimate && (
                            <p className="text-sm text-blue-600 mt-1">
                              <strong>Total Estimate:</strong> {warning.cost_estimate}
                            </p>
                          )}
                          {warning.mitigation.specialists && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Specialists Required:</strong> {warning.mitigation.specialists.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Confidence: {(warning.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* NEW: Opportunities Display */}
        {opportunities.length > 0 && (
          <Card className="mb-6 border-green-500 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <TrendingUp className="w-5 h-5" />
                Development Opportunities ({opportunities.length})
              </CardTitle>
              <CardDescription>
                Potential benefits and value-add features of this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {opportunities.map((opp, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border-2 border-green-300">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                      ✨ {opp.type}
                    </h4>
                    <p className="text-sm mb-2">{opp.message}</p>
                    {opp.benefit && (
                      <p className="text-sm text-green-700">
                        <strong>Benefit:</strong> {opp.benefit}
                      </p>
                    )}
                    {opp.potential_savings && (
                      <p className="text-sm text-green-700">
                        <strong>Value:</strong> {opp.potential_savings}
                      </p>
                    )}
                    {opp.estimated_savings && (
                      <p className="text-sm text-green-700">
                        <strong>Savings:</strong> {opp.estimated_savings}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suitability Classification */}
        {suitabilityClassification && (
          <Card className={`mb-6 ${suitabilityClassification.is_suitable ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <CardHeader>
              <CardTitle className={suitabilityClassification.is_suitable ? 'text-green-700' : 'text-red-700'}>
                {suitabilityClassification.is_suitable ? '✅ Suitable for Development' : '❌ Not Recommended for Development'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Classification:</strong> {suitabilityClassification.label}</p>
                <p><strong>Suitability Score:</strong> {(suitabilityClassification.score * 100).toFixed(1)}%</p>
                {!suitabilityClassification.is_suitable && (
                  <p className="text-red-800 font-medium mt-2">
                    This land has significant constraints that make development challenging or not recommended.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
          {/* Interactive Map with Polygon and Heatmap */}
          <Card className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/20 overflow-hidden backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 relative animate-fade-in-up hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:border-blue-500/30 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/50 before:to-transparent">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white mb-2">Interactive Suitability Map</CardTitle>
              <CardDescription className="text-sm text-white/70 leading-relaxed">
                Real terrain data analysis with polygon overlay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SuitabilityMap 
                polygon={selectedPolygon}
                heatmapUrl={heatmapUrl ? (heatmapUrl.startsWith('http') ? heatmapUrl : `http://localhost:5002${heatmapUrl.replace('/download/', '/')}`) : null}
                suitabilityData={suitabilityClassification}
                warnings={warnings}
              />
              {!heatmapUrl && selectedPolygon && (
                <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    💡 Run analysis to see suitability heatmap overlay on the polygon
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          {(summary || stats) && (
            <Card className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/20 overflow-hidden backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 relative animate-fade-in-up hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:border-blue-500/30 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/50 before:to-transparent">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white mb-2">Suitability Summary</CardTitle>
                <CardDescription className="text-sm text-white/70 leading-relaxed">
                  Key stats from the AI model
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                      <span className="text-sm text-white/80 font-medium">📊 Mean Score:</span>
                      <span className="text-sm text-white font-bold">{summary.mean_score?.toFixed?.(3)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                      <span className="text-sm text-white/80 font-medium">⬆️ Max Score:</span>
                      <span className="text-sm text-white font-bold">{summary.max_score?.toFixed?.(3)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                      <span className="text-sm text-white/80 font-medium">⬇️ Min Score:</span>
                      <span className="text-sm text-white font-bold">{summary.min_score?.toFixed?.(3)}</span>
                    </div>
                  </div>
                )}
                {stats?.percentages && (
                  <div className="flex flex-col gap-2">
                    <h4 className="percentages-title">Suitability Percentages:</h4>
                    <div className="percentage-item">
                      <span className="percentage-label">Low suitability:</span>
                      <span className="percentage-value">
                        {typeof stats.percentages.low === 'number'
                          ? `${stats.percentages.low.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="percentage-item">
                      <span className="percentage-label">Medium suitability:</span>
                      <span className="percentage-value">
                        {typeof stats.percentages.medium === 'number'
                          ? `${stats.percentages.medium.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="percentage-item">
                      <span className="percentage-label">High suitability:</span>
                      <span className="percentage-value">
                        {typeof stats.percentages.high === 'number'
                          ? `${stats.percentages.high.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
                {stats?.water_availability && (
                  <div className="flex flex-col gap-2" style={{marginTop: '20px'}}>
                    <h4 className="percentages-title">💧 Water Availability:</h4>
                    <div className="percentage-item">
                      <span className="percentage-label">Availability Score:</span>
                      <span className="percentage-value">
                        {stats.water_availability.water_availability_score?.mean?.toFixed(3) || 'N/A'}
                      </span>
                    </div>
                    {stats.water_availability.water_availability_score?.classification && (
                      <div className="percentage-item">
                        <span className="percentage-label">Classification:</span>
                        <span className="percentage-value">
                          {stats.water_availability.water_availability_score.classification}
                        </span>
                      </div>
                    )}
                    {typeof stats.water_availability.topographic_wetness_index?.mean === 'number' && (
                      <div className="percentage-item">
                        <span className="percentage-label">TWI (Mean):</span>
                        <span className="percentage-value">
                          {stats.water_availability.topographic_wetness_index.mean.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {stats?.hydrology_summary && (
                  <div className="flex flex-col gap-2" style={{marginTop: '20px'}}>
                    <h4 className="percentages-title">🌊 Hydrology Overview:</h4>
                    <div className="percentage-item">
                      <span className="percentage-label">Waterways detected:</span>
                      <span className="percentage-value">{stats.hydrology_summary.waterway_count ?? 0}</span>
                    </div>
                    <div className="percentage-item">
                      <span className="percentage-label">Water bodies detected:</span>
                      <span className="percentage-value">{stats.hydrology_summary.water_body_count ?? 0}</span>
                    </div>
                    {stats.hydrology_summary.estimated_waterway_length_km && (
                      <div className="percentage-item">
                        <span className="percentage-label">Waterway length:</span>
                        <span className="percentage-value">
                          {stats.hydrology_summary.estimated_waterway_length_km} km
                        </span>
                      </div>
                    )}
                    {stats.hydrology_summary.sample_names && (
                      <div className="percentage-item">
                        <span className="percentage-label">Named features:</span>
                        <span className="percentage-value">
                          {stats.hydrology_summary.sample_names.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {suggestions?.length > 0 && (
                  <div className="suggestions-section">
                    <h4 className="suggestions-title">Suggestions</h4>
                    <ul className="suggestions-list">
                      {suggestions.map((s, i) => (<li key={i}>{s}</li>))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 4-Panel Terrain Visualization - Similar to Terrain Analysis Page */}
        {previewUrl && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Terrain Analysis Preview
              </CardTitle>
              <CardDescription>Comprehensive terrain analysis visualization with 4-panel layout</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
                <img 
                  src={previewUrl.startsWith('http') ? previewUrl : `http://localhost:5002${previewUrl.replace('/download/', '/')}`} 
                  alt="Terrain Analysis Preview" 
                  className="max-w-full h-auto rounded-lg shadow-lg border-2 border-gray-200"
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const url = previewUrl.startsWith('http') ? previewUrl : `http://localhost:5002${previewUrl.replace('/download/', '/')}`;
                    window.open(url, '_blank');
                  }}
                  className="flex items-center gap-2"
                >
                  <Map className="w-4 h-4" />
                  View Full Size
                </Button>
                {tifUrl && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const url = tifUrl.startsWith('http') ? tifUrl : `http://localhost:5002${tifUrl.replace('/download/', '/')}`;
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'dem_clipped.tif';
                      link.click();
                    }}
                    className="flex items-center gap-2"
                  >
                    Download Clipped DEM (.tif)
                  </Button>
                )}
                {classifiedUrl && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const url = classifiedUrl.startsWith('http') ? classifiedUrl : `http://localhost:5002${classifiedUrl.replace('/download/', '/')}`;
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'terrain_classified.png';
                      link.click();
                    }}
                    className="flex items-center gap-2"
                  >
                    Download Classified PNG
                  </Button>
                )}
                {jsonUrl && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const url = jsonUrl.startsWith('http') ? jsonUrl : `http://localhost:5002${jsonUrl.replace('/download/', '/')}`;
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'terrain_stats.json';
                      link.click();
                    }}
                    className="flex items-center gap-2"
                  >
                    Download Stats (.json)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Factor Analysis Charts - Outside Map */}
        {chartsUrl && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Terrain Factor Analysis</CardTitle>
              <CardDescription>Detailed breakdown of suitability factors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <img 
                  src={chartsUrl.startsWith('http') ? chartsUrl : `http://localhost:5002${chartsUrl.replace('/download/', '/')}`} 
                  alt="Factor Analysis Charts" 
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Recommendation Cards */}
        <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-3">
          <Card className="suitability-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white mb-2">Residential Suitability</CardTitle>
              <CardDescription className="text-sm text-white/70 leading-relaxed">
                {residentialSuitability && typeof residentialSuitability.percentage === 'number'
                  ? `Based on real terrain analysis: ${residentialSuitability.percentage.toFixed(1)}% suitability`
                  : 'Areas ideal for residential development'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {residentialSuitability ? (
                <div className="bg-primary rounded-lg p-4 mb-4 last:mb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-full w-8 h-8 flex items-center justify-center residential">
                      <Home className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex items-center gap-3 mb-3-content">
                      <h4 className="text-sm font-semibold text-white m-0 mb-1">Overall Residential Suitability</h4>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-2-text ${residentialSuitability.rating?.toLowerCase() || 'medium'}`}>
                          {residentialSuitability.rating || 'N/A'} Suitability
                        </span>
                        <div className={`flex items-center gap-2-bar ${residentialSuitability.rating?.toLowerCase() || 'medium'}`} 
                             style={{width: `${typeof residentialSuitability.percentage === 'number' ? residentialSuitability.percentage : 0}%`}}></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white/70 mt-2 leading-relaxed">
                    {residentialSuitability.rating === 'High' 
                      ? 'Excellent conditions for residential development. Gentle slopes, good water availability, and low flood risk make this ideal for housing.'
                      : residentialSuitability.rating === 'Medium'
                      ? 'Moderate suitability for residential development. Some site preparation and engineering may be required.'
                      : 'Limited suitability for residential development. Significant site preparation and specialized engineering required.'}
                  </p>
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Suitability Score:</strong> {typeof residentialSuitability.percentage === 'number'
                      ? `${residentialSuitability.percentage.toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="bg-primary rounded-lg p-4 mb-4 last:mb-0">
                  <p className="text-gray-500">Run analysis to see residential suitability assessment</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="suitability-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white mb-2">Commercial Suitability</CardTitle>
              <CardDescription className="text-sm text-white/70 leading-relaxed">
                {commercialSuitability && typeof commercialSuitability.percentage === 'number'
                  ? `Based on real terrain analysis: ${commercialSuitability.percentage.toFixed(1)}% suitability`
                  : 'Optimal areas for commercial development'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commercialSuitability ? (
                <div className="bg-primary rounded-lg p-4 mb-4 last:mb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-full w-8 h-8 flex items-center justify-center commercial">
                      <ShoppingBag className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex items-center gap-3 mb-3-content">
                      <h4 className="text-sm font-semibold text-white m-0 mb-1">Overall Commercial Suitability</h4>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-2-text ${commercialSuitability.rating?.toLowerCase() || 'medium'}`}>
                          {commercialSuitability.rating || 'N/A'} Suitability
                        </span>
                        <div className={`flex items-center gap-2-bar ${commercialSuitability.rating?.toLowerCase() || 'medium'}`}
                             style={{width: `${typeof commercialSuitability.percentage === 'number' ? commercialSuitability.percentage : 0}%`}}></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white/70 mt-2 leading-relaxed">
                    {commercialSuitability.rating === 'High'
                      ? 'Excellent conditions for commercial development. Flat terrain, good accessibility, and suitable for retail, office, and commercial zones.'
                      : commercialSuitability.rating === 'Medium'
                      ? 'Moderate suitability for commercial development. Some site preparation may be needed for optimal commercial use.'
                      : 'Limited suitability for commercial development. Significant site preparation and infrastructure investment required.'}
                  </p>
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Suitability Score:</strong> {typeof commercialSuitability.percentage === 'number'
                      ? `${commercialSuitability.percentage.toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="bg-primary rounded-lg p-4 mb-4 last:mb-0">
                  <p className="text-gray-500">Run analysis to see commercial suitability assessment</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="suitability-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white mb-2">AI Recommendations</CardTitle>
              <CardDescription className="text-sm text-white/70 leading-relaxed">
                {aiRecommendations.length > 0 
                  ? 'Machine learning insights based on real terrain data'
                  : 'Machine learning insights'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {aiRecommendations.length > 0 ? (
                  aiRecommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10-header">
                        <Zap className="p-3 bg-white/5 rounded-lg border border-white/10-icon" />
                        <h4 className="p-3 bg-white/5 rounded-lg border border-white/10-title">{rec.title}</h4>
                      </div>
                      <p className="p-3 bg-white/5 rounded-lg border border-white/10-text">{rec.description}</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10-header">
                        <Zap className="p-3 bg-white/5 rounded-lg border border-white/10-icon" />
                        <h4 className="p-3 bg-white/5 rounded-lg border border-white/10-title">Run Analysis</h4>
                      </div>
                      <p className="p-3 bg-white/5 rounded-lg border border-white/10-text">
                        Run the suitability analysis to get AI-powered recommendations based on your terrain data.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Clock className="flex items-center gap-2 text-xs text-white/60-icon" />
                    <span>Last analyzed: {new Date().toLocaleString()}</span>
                  </div>
                  <Button variant="outline" className="text-xs">
                    View Full Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Suitability;    