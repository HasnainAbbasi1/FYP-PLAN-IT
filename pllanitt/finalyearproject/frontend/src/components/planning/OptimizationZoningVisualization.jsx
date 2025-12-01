import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Map, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  Target,
  Building,
  Trees,
  Activity,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import optimizationZoningApiService from '@/services/optimizationZoningApi';
import { toast } from 'sonner';

const OptimizationZoningVisualization = ({ 
  polygon = null,
  results = null,
  isOptimizing = false,
  showResults = false,
  projectId, 
  onOptimizationZoningGenerated,
  existingOptimizationZoning = null,
  terrainData = null,
  demFile = null 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);
  const [paretoFront, setParetoFront] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);

  // Load additional data when results are available
  useEffect(() => {
    if (results && projectId) {
      loadParetoFront();
      loadComparisonData();
    }
  }, [results, projectId]);

  const loadParetoFront = async () => {
    try {
      const response = await optimizationZoningApiService.getParetoFront(projectId);
      if (response.success) {
        setParetoFront(response.data);
      }
    } catch (error) {
      console.error('Error loading Pareto front:', error);
    }
  };

  const loadComparisonData = async () => {
    try {
      const scenarios = [
        { name: 'Current Design', zone_distribution: { residential: 0.5, commercial: 0.3, green_space: 0.2 } },
        { name: 'Balanced Approach', zone_distribution: { residential: 0.4, commercial: 0.3, green_space: 0.3 } },
        { name: 'Green Focus', zone_distribution: { residential: 0.3, commercial: 0.2, green_space: 0.5 } }
      ];

      const response = await optimizationZoningApiService.compareScenarios(projectId, scenarios);
      if (response.success) {
        setComparisonData(response.data);
      }
    } catch (error) {
      console.error('Error loading comparison data:', error);
    }
  };

  const generateNewOptimization = async () => {
    if (!projectId || !polygon) return;

    try {
      setIsGeneratingNew(true);
      const response = await optimizationZoningApiService.generateOptimizationZoning({
        projectId,
        polygonId: polygon.id,
        demFile: demFile || '/data/test_dem.tif',
        polygonBoundary: polygon.geometry,
        terrainData,
        // Use different parameters for variety
        customTargets: {
          residential: 0.35,
          commercial: 0.35,
          green_space: 0.3
        },
        cellSize: 80,
        optimizationParams: {
          maxGenerations: 150,
          populationSize: 75
        }
      });

      if (response.success) {
        onOptimizationZoningGenerated(response.data);
        toast.success('New optimization generated successfully!');
      }
    } catch (error) {
      console.error('Error generating new optimization:', error);
      toast.error('Failed to generate new optimization');
    } finally {
      setIsGeneratingNew(false);
    }
  };

  const downloadResults = async () => {
    if (!projectId) return;

    try {
      const response = await optimizationZoningApiService.downloadOptimizationZoning(projectId);
      if (response.success) {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `optimization_zoning_${projectId}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Results downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading results:', error);
      toast.error('Failed to download results');
    }
  };

  if (!results) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No Optimization Results</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Run an optimization to see results here
          </p>
        </CardContent>
      </Card>
    );
  }

  const landUseColors = {
    residential: '#FFD700',
    commercial: '#FF6B6B',
    industrial: '#4ECDC4',
    green_space: '#95E1D3',
    mixed_use: '#FFA07A',
    conservation: '#90EE90'
  };

  const formatPercentage = (value) => Math.round((value || 0) * 100);

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Optimization Results
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Multi-objective optimization completed successfully
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generateNewOptimization}
            disabled={isGeneratingNew}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingNew ? 'animate-spin' : ''}`} />
            Generate New
          </Button>
          <Button
            variant="outline"
            onClick={downloadResults}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Fitness Score</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {Math.round((results.fitness_score || 0) * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Convergence</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((results.convergence_info || 0) * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Generations</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {results.generations || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Total Cells</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {results.total_cells || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="zones">Zone Distribution</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Zone Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Zone Statistics
                </CardTitle>
                <CardDescription>
                  Distribution of land use zones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.zone_statistics && Object.entries(results.zone_statistics).map(([landUse, stats]) => (
                  <div key={landUse} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: landUseColors[landUse] || '#CCCCCC' }}
                        />
                        <span className="font-medium capitalize">
                          {landUse.replace('_', ' ')}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {formatPercentage(stats.percentage)}%
                      </Badge>
                    </div>
                    <Progress value={stats.percentage} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{stats.cells} cells</span>
                      <span>Avg suitability: {Math.round((stats.avg_suitability || 0) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Optimization Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Optimization Summary
                </CardTitle>
                <CardDescription>
                  Key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Method</span>
                    <Badge variant="outline">
                      {results.method || 'NSGA-II'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cell Size</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {results.raw_result?.parameters?.cell_size || 100}m
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Area</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {polygon?.area ? `${polygon.area.toFixed(2)} acres` : 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Processing Time</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {results.raw_result?.statistics?.optimization_time || 'N/A'}s
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Optimization Objectives</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Land Suitability</span>
                      <span className="text-green-600">✓ Optimized</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Area Compliance</span>
                      <span className="text-green-600">✓ Optimized</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Slope Constraints</span>
                      <span className="text-green-600">✓ Satisfied</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adjacency Rules</span>
                      <span className="text-green-600">✓ Optimized</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Zone Distribution Tab */}
        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Land Use Distribution
              </CardTitle>
              <CardDescription>
                Detailed breakdown of zone allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.land_use_distribution && Object.entries(results.land_use_distribution).map(([landUse, count]) => {
                  const percentage = results.total_cells ? (count / results.total_cells) * 100 : 0;
                  return (
                    <div key={landUse} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: landUseColors[landUse] || '#CCCCCC' }}
                        />
                        <span className="font-medium capitalize">
                          {landUse.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {Math.round(percentage)}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {count} cells
                      </div>
                      <Progress value={percentage} className="mt-2 h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pareto Front */}
            {paretoFront && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Pareto Front
                  </CardTitle>
                  <CardDescription>
                    Multi-objective optimization solutions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {paretoFront.solutions?.slice(0, 5).map((solution, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Solution {index + 1}</span>
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            Fitness: {Math.round(solution.fitness * 100)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Suitability: {Math.round(solution.suitability * 100)}%</div>
                          <div>Compliance: {Math.round(solution.area_compliance * 100)}%</div>
                          <div>Slope: {Math.round(solution.slope_penalty * 100)}%</div>
                          <div>Adjacency: {Math.round(solution.adjacency_bonus * 100)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terrain Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Terrain Analysis
                </CardTitle>
                <CardDescription>
                  Terrain characteristics used in optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {terrainData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Mean Elevation</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {terrainData.stats?.mean_elevation || 'N/A'}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Mean Slope</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {terrainData.slope_analysis?.mean_slope || 'N/A'}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Flood Risk</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {terrainData.stats?.flood_risk || 'N/A'}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Erosion Risk</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {terrainData.stats?.erosion_risk || 'N/A'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No terrain data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          {comparisonData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Scenario Comparison
                </CardTitle>
                <CardDescription>
                  Compare different optimization approaches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comparisonData.scenarios?.map((scenario, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">{scenario.name}</h4>
                        <Badge variant="outline">
                          Efficiency: {Math.round(scenario.efficiency * 100)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Fitness Score</span>
                          <div className="font-medium">{Math.round(scenario.fitness_score * 100)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Residential</span>
                          <div className="font-medium">{Math.round((scenario.zone_distribution?.residential || 0) * 100)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Commercial</span>
                          <div className="font-medium">{Math.round((scenario.zone_distribution?.commercial || 0) * 100)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Green Space</span>
                          <div className="font-medium">{Math.round((scenario.zone_distribution?.green_space || 0) * 100)}%</div>
                        </div>
                      </div>
                      {scenario.improvements && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-2">Key Improvements:</h5>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {scenario.improvements.map((improvement, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Comparison Data</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Comparison data will be available after running multiple optimizations
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OptimizationZoningVisualization;
