import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Building2, 
  Store, 
  TreePine, 
  Brain, 
  RefreshCw, 
  Download,
  Info,
  TrendingUp,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import ZoningVisualization2D from '@/components/zoning/ZoningVisualization2D';

const Zoning = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState('analysis');
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [zoningData, setZoningData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  // API URLs
  const API_BASE_URL = "http://localhost:8000"; // Node.js backend
  const PYTHON_API_URL = "http://localhost:5002"; // Python backend

  // Fetch polygons when project is selected
  useEffect(() => {
    if (currentProject) {
      fetchPolygons();
    } else {
      setPolygons([]);
      setSelectedPolygon(null);
    }
  }, [currentProject]);

  // Fetch saved zoning results when polygon is selected
  useEffect(() => {
    if (selectedPolygon?.id) {
      fetchSavedZoningResult(selectedPolygon.id);
    } else {
      setZoningData(null);
    }
  }, [selectedPolygon?.id]);

  const fetchPolygons = async () => {
    try {
      // Use project_id query parameter to filter polygons by project
      let url = `${API_BASE_URL}/api/polygon`;
      if (currentProject) {
        url += `?project_id=${currentProject.id}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Handle both array and object responses
        const polygonsArray = Array.isArray(data) ? data : (data.polygons || []);
        setPolygons(polygonsArray);
        console.log(`Fetched ${polygonsArray.length} polygons${currentProject ? ` for project ${currentProject.id}` : ''}`);
      }
    } catch (error) {
      console.error('Error fetching polygons:', error);
    }
  };

  const fetchSavedZoningResult = async (polygonId) => {
    try {
      console.log('Fetching saved zoning result for polygon:', polygonId);
      
      const response = await fetch(`${PYTHON_API_URL}/api/zoning_results/${polygonId}`);
      const data = await response.json();
      
      if (data.success && data.result) {
        // Handle different response formats:
        // - Database format: data.result.zoning_result contains the full result object
        // - Memory format: data.result contains the result directly
        let savedResult = null;
        
        if (data.result.zoning_result) {
          // Database format - zoning_result contains the full result object
          savedResult = data.result.zoning_result;
        } else if (data.result.analysis || data.result.zoning_result) {
          // Memory format - result is the full object
          savedResult = data.result;
        }
        
        if (savedResult && (savedResult.analysis || savedResult.success)) {
          // The saved result should have the same structure as runIntelligentZoning response
          setZoningData(savedResult);
          console.log('✅ Restored saved zoning result for polygon:', polygonId);
        } else {
          setZoningData(null);
          console.log('No valid saved zoning result found for polygon:', polygonId);
        }
      } else {
        // No saved result found, clear zoning data
        setZoningData(null);
        console.log('No saved zoning result found for polygon:', polygonId);
      }
    } catch (error) {
      console.error('Error fetching saved zoning result:', error);
      // Don't set error state here, just log it - it's okay if there's no saved result
      setZoningData(null);
    }
  };

  const runIntelligentZoning = async () => {
    if (!selectedPolygon) {
      setError('Please select a polygon first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('Running intelligent zoning for polygon:', selectedPolygon.id);
      
      const response = await fetch(`${PYTHON_API_URL}/api/intelligent_zoning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          polygon_id: selectedPolygon.id,
          geojson: selectedPolygon.geojson
        }),
      });

      const data = await response.json();

      if (data.success) {
        setZoningData(data);
        setAnalysisHistory(prev => [data, ...prev.slice(0, 4)]); // Keep last 5 analyses
        console.log('Intelligent zoning completed:', data);
      } else {
        setError(data.error || 'Zoning analysis failed');
      }
    } catch (error) {
      console.error('Zoning analysis error:', error);
      setError('Failed to run zoning analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefresh = () => {
    if (selectedPolygon) {
      runIntelligentZoning();
    }
  };

  const handleDownloadReport = () => {
    if (zoningData?.analysis?.visualization?.image_url) {
      const link = document.createElement('a');
      link.href = zoningData.analysis.visualization.image_url;
      link.download = `zoning_report_${selectedPolygon?.id || 'polygon'}.png`;
      link.click();
    }
  };

  // Zone configuration for display
  const zoneConfig = {
    residential: {
      name: 'Residential',
      icon: Building2,
      color: '#FFE4B5',
      description: 'Housing and residential areas'
    },
    commercial: {
      name: 'Commercial',
      icon: Store,
      color: '#FFD700',
      description: 'Business and retail zones'
    },
    green: {
      name: 'Green Space',
      icon: TreePine,
      color: '#32CD32',
      description: 'Parks and recreational areas'
    },
    mixed_use: {
      name: 'Mixed Use',
      icon: MapPin,
      color: '#DDA0DD',
      description: 'Combined residential and commercial'
    },
    conservation: {
      name: 'Conservation',
      icon: Shield,
      color: '#228B22',
      description: 'Protected natural areas'
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900 p-6 md:p-4">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-block mb-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-2xl">
            <Brain className="h-12 w-12 text-white animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-4xl font-extrabold mb-4 m-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
            Intelligent Zoning Analysis
          </h1>
          <p className="text-xl md:text-lg text-slate-700 dark:text-slate-300 font-semibold m-0 max-w-3xl mx-auto">
            AI-powered zoning recommendations based on terrain analysis and DEM data
          </p>
        </div>

        {/* Selection Controls */}
        <Card className="bg-gradient-to-br from-white/95 to-blue-50/95 dark:from-slate-800/95 dark:to-blue-900/95 border-2 border-blue-300 dark:border-blue-700 rounded-3xl shadow-2xl mb-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-3xl animate-fade-in">
                  <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-blue-900 dark:text-blue-100">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              Select Analysis Area
            </CardTitle>
            <CardDescription className="text-base text-blue-700 dark:text-blue-300 mt-2">
              Choose a project and polygon to analyze for intelligent zoning
            </CardDescription>
                  </CardHeader>
                  <CardContent>
            <div className="flex flex-col gap-6 md:gap-5">
              {/* Project Display */}
              {currentProject && (
                <div className="flex flex-col gap-3">
                  <label className="font-bold text-blue-900 dark:text-blue-100 text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Project
                  </label>
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 border-2 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 rounded-2xl px-6 py-4 text-lg font-semibold transition-all duration-300 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl hover:scale-105">
                    {currentProject.title || currentProject.name || `Project ${currentProject.id}`}
                  </div>
                </div>
              )}
            
              {/* Polygon Selection */}
              <div className="flex flex-col gap-3">
                <label className="font-bold text-purple-900 dark:text-purple-100 text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Polygon
                </label>
                <Select 
                  value={selectedPolygon?.id?.toString()} 
                  onValueChange={(value) => {
                    const polygon = polygons.find(p => p.id.toString() === value);
                    setSelectedPolygon(polygon);
                    // Don't clear zoningData here - let the useEffect handle fetching saved results
                  }}
                  disabled={!currentProject}
                >
                  <SelectTrigger className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border-2 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100 rounded-2xl px-6 py-4 text-lg font-semibold transition-all duration-300 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    <SelectValue placeholder="Select a polygon" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-700 rounded-2xl shadow-2xl max-h-[400px] overflow-y-auto">
                    {polygons.map((polygon) => (
                      <SelectItem key={polygon.id} value={polygon.id.toString()} className="text-lg py-3 hover:bg-purple-100 dark:hover:bg-purple-900 cursor-pointer rounded-xl transition-all">
                        {polygon.name || `Polygon ${polygon.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                    </div>
                    
              {/* Analysis Button */}
              <div className="flex justify-center mt-6">
                <Button
                  onClick={runIntelligentZoning}
                  disabled={!selectedPolygon || isAnalyzing}
                  className="w-full max-w-[400px] py-6 px-8 bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 text-white border-none rounded-2xl text-lg font-bold cursor-pointer transition-all duration-300 shadow-2xl relative overflow-hidden hover:-translate-y-1 hover:shadow-3xl hover:from-green-600 hover:via-teal-600 hover:to-blue-600 disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                      Analyzing Terrain...
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5 mr-3" />
                      Run Intelligent Zoning
                    </>
                  )}
                </Button>
                      </div>
                    </div>
                    
            {/* Selected Area Info */}
            {currentProject && selectedPolygon && (
              <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-6 mt-6 shadow-xl">
                <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Selected Area Information
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                    <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="text-emerald-800 dark:text-emerald-200 text-sm font-medium">Project:</span>
                      <p className="text-emerald-900 dark:text-emerald-100 text-base font-bold">{currentProject.title || currentProject.name || `Project ${currentProject.id}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                    <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <div>
                      <span className="text-teal-800 dark:text-teal-200 text-sm font-medium">Polygon:</span>
                      <p className="text-teal-900 dark:text-teal-100 text-base font-bold">{selectedPolygon.name || `Polygon ${selectedPolygon.id}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">Area:</span>
                      <p className="text-blue-900 dark:text-blue-100 text-base font-bold">{selectedPolygon.area ? `${selectedPolygon.area.toFixed(2)} m² (${(selectedPolygon.area / 10000).toFixed(2)} ha)` : 'Calculating...'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900 dark:to-pink-900 text-red-900 dark:text-red-100 border-2 border-red-400 dark:border-red-700 rounded-2xl mb-8 shadow-xl p-5">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-base font-semibold ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-3 shadow-2xl gap-2">
            <TabsTrigger value="analysis" className="rounded-2xl px-6 py-3 text-base font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:scale-105">
              2D Analysis
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="rounded-2xl px-6 py-3 text-base font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:scale-105">
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-2xl px-6 py-3 text-base font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:scale-105">
              History
            </TabsTrigger>
          </TabsList>

          {/* 2D Analysis Tab */}
          <TabsContent value="analysis" className="mt-6">
            <ZoningVisualization2D
              polygonId={selectedPolygon?.id}
              zoningData={zoningData}
              onRefresh={handleRefresh}
              isLoading={isAnalyzing}
              selectedPolygon={selectedPolygon}
            />
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="mt-8">
            {zoningData ? (
              <div className="flex flex-col gap-8">
                {/* Primary Recommendation */}
                <Card className="bg-gradient-to-br from-green-50/95 to-teal-50/95 dark:from-slate-800/95 dark:to-teal-900/95 border-2 border-green-300 dark:border-green-700 rounded-3xl shadow-2xl backdrop-blur-xl animate-fade-in hover:-translate-y-1 transition-all duration-300">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold text-green-900 dark:text-green-100">
                      <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      Primary Zoning Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 mb-6 md:flex-col md:text-center md:gap-4">
                      {(() => {
                        const primaryZone = zoningData.analysis?.zone_recommendations?.primary_zone;
                        const config = zoneConfig[primaryZone] || zoneConfig.mixed_use;
                        const Icon = config.icon;
                        
                        return (
                          <>
                            <div 
                              className="w-20 h-20 rounded-[20px] flex items-center justify-center text-white shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)]"
                              style={{ backgroundColor: config.color }}
                            >
                              <Icon className="h-8 w-8" />
                      </div>
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-foreground m-0 mb-2">{config.name}</h3>
                              <p className="text-muted-foreground text-base m-0 mb-3">{config.description}</p>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-foreground">Confidence:</span>
                                <Badge variant="secondary" className="text-[0.9rem] px-3 py-1">
                                  {Math.round((zoningData.analysis?.zone_recommendations?.confidence || 0) * 100)}%
                                </Badge>
                        </div>
                      </div>
                        </>
                        );
                      })()}
                    </div>
                    
                    <div className="bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl p-5 border-l-4 border-l-primary">
                      <h4 className="text-foreground font-semibold m-0 mb-3">Analysis Summary:</h4>
                      <p className="text-muted-foreground leading-relaxed m-0">{zoningData.analysis?.zone_recommendations?.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          
                {/* Zone Breakdown */}
                <Card className="bg-gradient-to-br from-blue-50/95 to-indigo-50/95 dark:from-slate-800/95 dark:to-indigo-900/95 border-2 border-blue-300 dark:border-blue-700 rounded-3xl shadow-2xl backdrop-blur-xl animate-fade-in hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold text-blue-900 dark:text-blue-100">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                      Zone Distribution
                    </CardTitle>
                    <CardDescription className="text-base text-blue-700 dark:text-blue-300 mt-2">Probability breakdown for different zone types</CardDescription>
              </CardHeader>
              <CardContent>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4 md:grid-cols-1">
                      {Object.entries(zoningData.analysis?.zone_recommendations?.zone_breakdown || {}).map(([zone, probability]) => {
                        const config = zoneConfig[zone] || zoneConfig.mixed_use;
                        const percentage = Math.round(probability * 100);
                        
                        return (
                          <div key={zone} className="bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/8 dark:hover:bg-white/8 hover:border-primary/30 hover:-translate-y-0.5">
                            <div className="flex items-center gap-3 mb-3">
                              <div 
                                className="w-4 h-4 rounded-full border-2 border-white/30 dark:border-white/30 shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                                style={{ backgroundColor: config.color }}
                              />
                              <span className="font-semibold text-foreground flex-1">{config.name}</span>
                              <Badge variant="secondary">{percentage}%</Badge>
                          </div>
                            <div className="h-2 bg-white/10 dark:bg-white/10 rounded overflow-hidden">
                              <div 
                                className="h-full rounded transition-[width] duration-300"
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: config.color 
                                }}
                              />
                          </div>
                        </div>
                        );
                      })}
                          </div>
                  </CardContent>
                </Card>

                {/* Terrain Analysis Summary */}
                <Card className="bg-gradient-to-br from-purple-50/95 to-pink-50/95 dark:from-slate-800/95 dark:to-purple-900/95 border-2 border-purple-300 dark:border-purple-700 rounded-3xl shadow-2xl backdrop-blur-xl animate-fade-in hover:-translate-y-1 transition-all duration-300">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold text-purple-900 dark:text-purple-100">
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
                        <Info className="h-6 w-6 text-white" />
                      </div>
                      Terrain Analysis Summary
                    </CardTitle>
                    <CardDescription className="text-base text-purple-700 dark:text-purple-300 mt-2">Key terrain factors influencing zoning decisions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 md:grid-cols-2 sm:grid-cols-1">
                      {Object.entries(zoningData.analysis?.terrain_summary || {}).map(([key, value]) => (
                        <div key={key} className="bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl p-5 text-center transition-all duration-300 hover:bg-white/8 dark:hover:bg-white/8 hover:border-primary/30 hover:-translate-y-0.5">
                          <div className="text-muted-foreground text-[0.9rem] font-medium mb-2">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {typeof value === 'number'
                              ? Math.round(value)
                              : typeof value === 'string'
                                ? value
                                : value != null
                                  ? JSON.stringify(value)
                                  : '-'}
                            {key.includes('elevation') ? 'm' : key.includes('slope') ? '°' : key.includes('risk') ? '%' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                          </div>
            ) : (
              <Card className="bg-gradient-to-br from-amber-50/95 to-orange-50/95 dark:from-slate-800/95 dark:to-orange-900/95 border-2 border-amber-300 dark:border-amber-700 rounded-3xl shadow-2xl backdrop-blur-xl animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-20 px-8 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl mb-6 animate-pulse">
                    <Brain className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-amber-900 dark:text-amber-100">No Analysis Available</h3>
                  <p className="text-amber-800 dark:text-amber-200 text-lg max-w-md">
                    Run intelligent zoning analysis to see detailed recommendations and zone distribution.
                  </p>
              </CardContent>
            </Card>
            )}
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="mt-8">
            <Card className="bg-gradient-to-br from-indigo-50/95 to-purple-50/95 dark:from-slate-800/95 dark:to-indigo-900/95 border-2 border-indigo-300 dark:border-indigo-700 rounded-3xl shadow-2xl backdrop-blur-xl">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <RefreshCw className="h-6 w-6 text-white" />
                  </div>
                  Analysis History
                </CardTitle>
                <CardDescription className="text-base text-indigo-700 dark:text-indigo-300 mt-2">Previous zoning analyses for this session</CardDescription>
              </CardHeader>
              <CardContent>
                {analysisHistory.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {analysisHistory.map((analysis, index) => (
                      <div key={index} className="bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/8 dark:hover:bg-white/8 hover:border-primary/30">
                        <div className="flex justify-between items-center mb-2 md:flex-col md:items-start md:gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground">
                              Polygon {selectedPolygon?.id || 'Unknown'}
                            </span>
                            <span className="text-[0.85rem] text-muted-foreground">
                              {new Date().toLocaleTimeString()}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {analysis.analysis?.zone_recommendations?.primary_zone || 'Unknown'}
                          </Badge>
                    </div>
                        <div className="text-muted-foreground text-[0.9rem] leading-snug">
                          {analysis.analysis?.zone_recommendations?.recommendation}
                    </div>
                  </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center items-center py-10">
                    <p className="text-muted-foreground">No analysis history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Zoning;
