import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  Building, 
  LayoutGrid, 
  Map, 
  Trees, 
  Activity, 
  Lightbulb,
  ArrowRight,
  RefreshCw,
  MapPin,
  AlertCircle,
  CheckCircle,
  Info,
  Brain,
  Cpu,
  Sparkles
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import aiOptimizationApi from '../../services/aiOptimizationApi';
import polygonApi from '../../services/polygonApi';

const AIOptimization = () => {
  const { currentProject } = useProject();
  
  // State management
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [optimizationFocus, setOptimizationFocus] = useState('efficiency');
  const [analysisDepth, setAnalysisDepth] = useState(75);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch polygons when project is selected
  useEffect(() => {
    if (currentProject) {
      fetchPolygons();
    } else {
      setPolygons([]);
      setSelectedPolygon(null);
    }
  }, [currentProject]);

  const fetchPolygons = async () => {
    if (!currentProject) return;
    
    try {
      const polygonsArray = await polygonApi.getPolygonsWithUnassigned(currentProject.id);
      setPolygons(polygonsArray);
      if (polygonsArray.length > 0 && !selectedPolygon) {
        setSelectedPolygon(polygonsArray[0]);
      }
    } catch (err) {
      console.error('Error fetching polygons:', err);
      setError('Failed to load polygons');
    }
  };

  const getAnalysisDepthLabel = (value) => {
    if (value <= 25) return 'Basic';
    if (value <= 50) return 'Standard';
    if (value <= 75) return 'Comprehensive';
    return 'Deep';
  };

  const runOptimization = async () => {
    if (!currentProject) {
      setError('Please select a project first');
      return;
    }

    if (!selectedPolygon) {
      setError('Please select a polygon to optimize');
      return;
    }

    setIsOptimizing(true);
    setOptimizationProgress(0);
    setError(null);
    setSuccess(null);
    setOptimizationResults(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Get polygon geojson if available
      let geojson = null;
      if (selectedPolygon.geojson) {
        geojson = typeof selectedPolygon.geojson === 'string' 
          ? JSON.parse(selectedPolygon.geojson) 
          : selectedPolygon.geojson;
      }

      const result = await aiOptimizationApi.runOptimization({
        projectId: currentProject.id,
        polygonId: selectedPolygon.id,
        optimizationFocus,
        analysisDepth,
        geojson
      });

      clearInterval(progressInterval);
      setOptimizationProgress(100);
      
      // Ensure we have the response data
      if (result && result.success !== false) {
        setOptimizationResults(result);
        const recCount = result.recommendations?.length || 0;
        setSuccess(`Optimization completed! Generated ${recCount} AI recommendation${recCount !== 1 ? 's' : ''} based on terrain analysis.`);
      } else {
        throw new Error(result?.error || 'Optimization failed');
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Optimization error:', err);
      setError(err.message || 'Failed to run optimization');
    } finally {
      setIsOptimizing(false);
      setTimeout(() => setOptimizationProgress(0), 2000);
    }
  };

  const getMetricIcon = (metricName) => {
    const icons = {
      landUseEfficiency: Building,
      connectivityIndex: Map,
      greenSpaceCoverage: Trees,
      trafficFlowEfficiency: Activity,
      energyEfficiency: Zap,
      walkabilityScore: Activity
    };
    return icons[metricName] || Building;
  };

  const formatMetricName = (name) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
              <Brain className="h-10 w-10 text-purple-600" />
              AI Optimization
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Powered by real AI/ML models: OpenAI GPT-4 & Custom ML Optimizer
            </p>
          </div>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
            onClick={() => {
              setOptimizationResults(null);
              setError(null);
              setSuccess(null);
            }}
          >
            <Zap className="mr-2 h-5 w-5" />
            New Optimization
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6 shadow-md">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-base">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-300 border-2 shadow-md">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="shadow-lg hover:shadow-xl transition-shadow border-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Optimization Parameters</CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-400">Configure AI optimization settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* Project Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project</label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                      {currentProject ? (
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white text-lg">{currentProject.title || currentProject.name}</div>
                          {currentProject.location && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {currentProject.location}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">No project selected</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Select a project from the header</p>
                  </div>

                  {/* Polygon Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Polygon</label>
                    <Select 
                      value={selectedPolygon?.id?.toString() || ''} 
                      onValueChange={(value) => {
                        const polygon = polygons.find(p => p.id.toString() === value);
                        setSelectedPolygon(polygon);
                        setOptimizationResults(null);
                      }}
                      disabled={!currentProject || polygons.length === 0}
                    >
                      <SelectTrigger className="h-12 border-2">
                        <SelectValue placeholder={polygons.length === 0 ? "No polygons available" : "Select polygon"} />
                      </SelectTrigger>
                      <SelectContent>
                        {polygons.map((polygon) => (
                          <SelectItem key={polygon.id} value={polygon.id.toString()}>
                            {polygon.name || `Polygon ${polygon.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {polygons.length === 0 
                        ? "Create polygons in the Data Ingestion page" 
                        : "Target polygon for AI optimization"}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Optimization Focus</label>
                    <Select value={optimizationFocus} onValueChange={setOptimizationFocus}>
                      <SelectTrigger className="h-12 border-2">
                        <SelectValue placeholder="Select optimization focus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efficiency">Transportation Efficiency</SelectItem>
                        <SelectItem value="sustainability">Environmental Sustainability</SelectItem>
                        <SelectItem value="livability">Community Livability</SelectItem>
                        <SelectItem value="economic">Economic Development</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Primary goal for the AI optimization</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Analysis Depth</label>
                      <Badge variant="outline" className="text-sm font-medium">
                        {getAnalysisDepthLabel(analysisDepth)}
                      </Badge>
                    </div>
                    <Slider 
                      value={[analysisDepth]} 
                      onValueChange={(value) => setAnalysisDepth(value[0])}
                      max={100} 
                      step={25}
                      disabled={isOptimizing}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Determines the complexity and depth of AI analysis</p>
                  </div>
                  
                  {/* AI Model Info */}
                  <div className="p-5 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-purple-900/30 rounded-xl border-2 border-purple-200 dark:border-purple-700 shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 rounded-lg">
                        <Brain className="h-6 w-6 text-white flex-shrink-0" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-base text-purple-900 dark:text-purple-200 mb-2">
                          AI/ML Optimization Engine
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                          This system uses <strong>real AI models</strong> to analyze terrain data (DEM, slope, elevation, flood risk) and generate intelligent recommendations.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                            <Brain className="h-4 w-4 text-purple-600" />
                            <span className="text-sm text-gray-800 dark:text-gray-200">
                              <strong>Primary:</strong> OpenAI GPT-4
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                            <Cpu className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-gray-800 dark:text-gray-200">
                              <strong>Fallback:</strong> Custom ML Optimizer
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                            <Lightbulb className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-gray-800 dark:text-gray-200">
                              <strong>Emergency:</strong> Rule-based
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                    onClick={runOptimization}
                    disabled={isOptimizing || !currentProject || !selectedPolygon}
                  >
                    {isOptimizing ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Running AI Analysis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Run AI Optimization
                      </>
                    )}
                  </Button>

                  {isOptimizing && (
                    <div className="space-y-3">
                      <Progress value={optimizationProgress} className="w-full h-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">
                        Analyzing terrain data... {optimizationProgress}%
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Performance Metrics - Only show if data exists */}
            {optimizationResults && optimizationResults.currentMetrics && Object.keys(optimizationResults.currentMetrics).length > 0 && (
              <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-6 w-6 text-blue-600" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-400">Comparing current and optimized designs</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(optimizationResults.currentMetrics || {}).map(([metricName, currentValue]) => {
                        if (metricName === 'areaSqm') return null;
                        
                        const MetricIcon = getMetricIcon(metricName);
                        const optimizedValue = optimizationResults.optimizedMetrics?.[metricName] || currentValue;
                        const improvement = optimizationResults.improvements?.[metricName] || 0;
                        const isPositive = improvement > 0;

                        return (
                          <div key={metricName} className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <MetricIcon className="h-5 w-5 text-blue-600" />
                                </div>
                                <h5 className="font-bold text-lg text-gray-900 dark:text-white">{formatMetricName(metricName)}</h5>
                              </div>
                              <Badge className={`text-base px-3 py-1 ${isPositive ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                                {isPositive ? '+' : ''}{improvement.toFixed(1)}%
                              </Badge>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current</span>
                                  <span className="text-lg font-bold text-gray-900 dark:text-white">{currentValue.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${currentValue}%` }}></div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Optimized</span>
                                  <span className="text-lg font-bold text-green-600 dark:text-green-400">{optimizedValue.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all shadow-md" style={{ width: `${optimizedValue}%` }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* AI Recommendations - Text Format */}
            {optimizationResults && (
              <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-purple-500" />
                    AI-Powered Recommendations
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                    {optimizationResults.recommendations && optimizationResults.recommendations.length > 0
                      ? `AI-generated recommendations using terrain analysis, DEM data, and ML optimization for polygon: ${selectedPolygon?.name || `Polygon ${selectedPolygon?.id}`}`
                      : `Optimization results for polygon: ${selectedPolygon?.name || `Polygon ${selectedPolygon?.id}`}`}
                  </CardDescription>
                  
                  {/* AI Model Badge */}
                  {optimizationResults.recommendations && optimizationResults.recommendations.length > 0 && (
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-700">
                        {optimizationResults.recommendations[0]?.ml_confidence ? (
                          <>
                            <Cpu className="h-4 w-4" />
                            <span>ML Optimizer</span>
                          </>
                        ) : optimizationResults.recommendations[0]?.terrain_insight ? (
                          <>
                            <Brain className="h-4 w-4" />
                            <span>AI-Powered</span>
                          </>
                        ) : (
                          <>
                            <Lightbulb className="h-4 w-4" />
                            <span>Rule-Based</span>
                          </>
                        )}
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {optimizationResults.recommendations.length} recommendations generated
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  {optimizationResults.recommendations && optimizationResults.recommendations.length > 0 ? (
                    <div className="space-y-6">
                      {optimizationResults.recommendations.map((rec, index) => (
                        <div key={rec.id || index} className="border-l-4 border-purple-500 pl-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-r-lg shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-bold">
                                {index + 1}
                              </span>
                              {rec.title}
                            </h4>
                            <div className="flex gap-2 flex-wrap justify-end">
                              <Badge className={rec.impact === 'High' ? 'bg-red-500' : rec.impact === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}>
                                {rec.impact} Impact
                              </Badge>
                              {rec.estimatedImprovement && (
                                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                                  {rec.estimatedImprovement}
                                </Badge>
                              )}
                              {rec.ml_confidence && (
                                <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700">
                                  <Cpu className="h-3 w-3 mr-1" />
                                  {(rec.ml_confidence * 100).toFixed(0)}% confidence
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {rec.description}
                            </p>
                            
                            {rec.terrain_insight && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-2">
                                  <Map className="h-4 w-4" />
                                  Terrain & DEM Analysis Insight:
                                </p>
                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                  {rec.terrain_insight}
                                </p>
                              </div>
                            )}
                            
                            {rec.category && (
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Category: {rec.category}
                                </Badge>
                                {rec.priority && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700">
                                    Priority: {rec.priority}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 mb-2">
                        No AI recommendations available at this time.
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        This may occur if terrain analysis data is not available for the selected polygon. Please ensure terrain analysis has been completed for this polygon.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Implementation Plan - Only show if available */}
            {optimizationResults && optimizationResults.implementationPlan && optimizationResults.implementationPlan.totalPhases > 0 && (
              <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ArrowRight className="h-6 w-6 text-blue-600" />
                    Implementation Roadmap
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                    {optimizationResults.implementationPlan.implementationApproach || 'Phased approach to implementing AI recommendations'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Duration</p>
                        <p className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                          {optimizationResults.implementationPlan.estimatedTotalDuration}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Implementation Phases</p>
                        <p className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                          {optimizationResults.implementationPlan.totalPhases} Phases
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Recommendations</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-300">
                          {optimizationResults.implementationPlan.totalRecommendations || optimizationResults.recommendations?.length || 0}
                        </p>
                      </div>
                    </div>
                    
                    {/* Phases */}
                    <div className="space-y-4">
                      {Object.entries(optimizationResults.implementationPlan.phases || {}).map(([phaseKey, phase], index) => {
                        if (!phase.recommendations || phase.recommendations.length === 0) return null;
                        
                        const priorityColors = {
                          'High': 'border-red-500 bg-red-50 dark:bg-red-900/20',
                          'Medium': 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
                          'Low': 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        };
                        
                        const priorityColor = priorityColors[phase.priority] || 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
                        
                        return (
                          <div key={phaseKey} className={`p-4 border-l-4 rounded-r-lg ${priorityColor}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900 dark:text-gray-100">{phase.name}</h5>
                                  <p className="text-xs text-muted-foreground">Duration: {phase.duration}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className={
                                phase.priority === 'High' ? 'border-red-500 text-red-700 dark:text-red-300' :
                                phase.priority === 'Medium' ? 'border-yellow-500 text-yellow-700 dark:text-yellow-300' :
                                'border-green-500 text-green-700 dark:text-green-300'
                              }>
                                {phase.priority || 'Medium'} Priority
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                              {phase.description}
                            </p>
                            
                            {phase.recommendationTitles && phase.recommendationTitles.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                  Key Recommendations:
                                </p>
                                <ul className="space-y-1">
                                  {phase.recommendationTitles.map((title, idx) => (
                                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                      <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                      <span>{title}</span>
                                    </li>
                                  ))}
                                  {phase.recommendations.length > phase.recommendationTitles.length && (
                                    <li className="text-xs text-muted-foreground italic">
                                      ...and {phase.recommendations.length - phase.recommendationTitles.length} more
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AIOptimization;
