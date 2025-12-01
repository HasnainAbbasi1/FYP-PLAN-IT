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
      <div className="min-h-screen bg-background p-6 md:p-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-3xl font-extrabold mb-2 m-0 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Intelligent Zoning Analysis
          </h1>
          <p className="text-lg md:text-base text-muted-foreground font-medium m-0">
            AI-powered zoning recommendations based on terrain analysis and DEM data
          </p>
        </div>

        {/* Selection Controls */}
        <Card className="bg-gradient-to-br from-white/10 to-white/5 dark:from-white/10 dark:to-white/5 border border-white/20 dark:border-white/20 rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] mb-6 backdrop-blur-[10px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] animate-fade-in">
                  <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Select Analysis Area
            </CardTitle>
            <CardDescription>
              Choose a project and polygon to analyze for intelligent zoning
            </CardDescription>
                  </CardHeader>
                  <CardContent>
            <div className="flex flex-col gap-5 md:gap-4">
              {/* Project Display */}
              {currentProject && (
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-foreground text-[0.95rem]">Project</label>
                  <div className="bg-background border-2 border-border text-foreground rounded-xl px-4 py-3 text-base transition-all duration-300 hover:border-primary hover:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(59,130,246,0.2)]">
                    {currentProject.title || currentProject.name || `Project ${currentProject.id}`}
                  </div>
                </div>
              )}
            
              {/* Polygon Selection */}
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-foreground text-[0.95rem]">Polygon</label>
                <Select 
                  value={selectedPolygon?.id?.toString()} 
                  onValueChange={(value) => {
                    const polygon = polygons.find(p => p.id.toString() === value);
                    setSelectedPolygon(polygon);
                    // Don't clear zoningData here - let the useEffect handle fetching saved results
                  }}
                  disabled={!currentProject}
                >
                  <SelectTrigger className="bg-background border-2 border-border text-foreground rounded-xl px-4 py-3 text-base transition-all duration-300 hover:border-primary hover:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(59,130,246,0.2)]">
                    <SelectValue placeholder="Select a polygon" />
                  </SelectTrigger>
                  <SelectContent className="bg-gradient-base border border-accent rounded-xl shadow-[0_10px_15px_-3px_rgba(69,136,173,0.4)] max-h-[400px] overflow-y-auto">
                    {polygons.map((polygon) => (
                      <SelectItem key={polygon.id} value={polygon.id.toString()}>
                        {polygon.name || `Polygon ${polygon.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                    </div>
                    
              {/* Analysis Button */}
              <div className="flex justify-center mt-4">
                <Button
                  onClick={runIntelligentZoning}
                  disabled={!selectedPolygon || isAnalyzing}
                  className="w-full max-w-[300px] py-4 px-6 bg-primary text-primary-foreground border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_10px_15px_-3px_rgba(69,136,173,0.4)] hover:bg-accent hover:text-accent-foreground disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-[left] before:duration-500 hover:before:left-full"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Run Intelligent Zoning
                    </>
                  )}
                </Button>
                      </div>
                    </div>
                    
            {/* Selected Area Info */}
            {currentProject && selectedPolygon && (
              <div className="bg-gradient-base border border-accent rounded-xl p-4 mt-5 shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3)]">
                <div className="text-white mb-2 text-[0.95rem] last:mb-0">
                  <strong className="font-semibold mr-2">Project:</strong> {currentProject.title || currentProject.name || `Project ${currentProject.id}`}
                      </div>
                <div className="text-white mb-2 text-[0.95rem] last:mb-0">
                  <strong className="font-semibold mr-2">Polygon:</strong> {selectedPolygon.name || `Polygon ${selectedPolygon.id}`}
                        </div>
                <div className="text-white mb-2 text-[0.95rem] last:mb-0">
                  <strong className="font-semibold mr-2">Area:</strong> {selectedPolygon.area ? `${selectedPolygon.area.toFixed(2)} m²` : 'Calculating...'}
                        </div>
                      </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="bg-destructive text-destructive-foreground border border-destructive rounded-xl mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="bg-muted border-2 border-border rounded-2xl p-2 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
            <TabsTrigger value="analysis">2D Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
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
          <TabsContent value="recommendations" className="mt-6">
            {zoningData ? (
              <div className="flex flex-col gap-6">
                {/* Primary Recommendation */}
                <Card className="bg-gradient-to-br from-white/10 to-white/5 dark:from-white/10 dark:to-white/5 border border-white/20 dark:border-white/20 rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] backdrop-blur-[10px] animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
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
                <Card className="bg-gradient-to-br from-white/10 to-white/5 dark:from-white/10 dark:to-white/5 border border-white/20 dark:border-white/20 rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] backdrop-blur-[10px] animate-fade-in">
              <CardHeader>
                    <CardTitle>Zone Distribution</CardTitle>
                    <CardDescription>Probability breakdown for different zone types</CardDescription>
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
                <Card className="bg-gradient-to-br from-white/10 to-white/5 dark:from-white/10 dark:to-white/5 border border-white/20 dark:border-white/20 rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] backdrop-blur-[10px] animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Terrain Analysis Summary
                    </CardTitle>
                    <CardDescription>Key terrain factors influencing zoning decisions</CardDescription>
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
              <Card className="bg-gradient-to-br from-white/10 to-white/5 dark:from-white/10 dark:to-white/5 border border-white/20 dark:border-white/20 rounded-[20px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] backdrop-blur-[10px] animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-[60px] px-5 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Analysis Available</h3>
                  <p className="text-muted-foreground text-center">
                    Run intelligent zoning analysis to see detailed recommendations and zone distribution.
                  </p>
              </CardContent>
            </Card>
            )}
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis History</CardTitle>
                <CardDescription>Previous zoning analyses for this session</CardDescription>
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
