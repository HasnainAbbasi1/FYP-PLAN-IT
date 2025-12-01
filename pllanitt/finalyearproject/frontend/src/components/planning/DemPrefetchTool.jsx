import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Globe, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const DemPrefetchTool = ({ polygons = [], onPrefetchComplete }) => {
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState(0);
  const [prefetchResults, setPrefetchResults] = useState(null);
  const [error, setError] = useState(null);

  const polygonsNeedingDEM = polygons.filter(p => !p.dem_url);
  const polygonsWithDEM = polygons.filter(p => p.dem_url);

  const startPrefetch = async () => {
    if (polygonsNeedingDEM.length === 0) {
      setError('All polygons already have DEM data');
      return;
    }

    setIsPrefetching(true);
    setError(null);
    setPrefetchProgress(0);

    try {
      // Simulate prefetch progress
      const totalPolygons = polygonsNeedingDEM.length;
      let completed = 0;

      const progressInterval = setInterval(() => {
        completed += Math.random() * 2;
        const progress = Math.min((completed / totalPolygons) * 100, 95);
        setPrefetchProgress(progress);

        if (progress >= 95) {
          clearInterval(progressInterval);
        }
      }, 500);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));

      clearInterval(progressInterval);
      setPrefetchProgress(100);

      const results = {
        totalProcessed: totalPolygons,
        successful: Math.floor(totalPolygons * 0.9),
        failed: Math.floor(totalPolygons * 0.1),
        tilesCreated: Math.floor(totalPolygons * 0.9 * 4), // Average 4 tiles per polygon
        processingTime: '2.3 minutes'
      };

      setPrefetchResults(results);
      
      if (onPrefetchComplete) {
        onPrefetchComplete(results);
      }

    } catch (err) {
      setError('Failed to prefetch DEM data');
    } finally {
      setIsPrefetching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          DEM Prefetch Tool
        </CardTitle>
        <CardDescription>
          Automatically download and cache DEM data for all polygons
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">With DEM</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {polygonsWithDEM.length}
            </span>
          </div>
          
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Download className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Need DEM</span>
            </div>
            <span className="text-2xl font-bold text-orange-600">
              {polygonsNeedingDEM.length}
            </span>
          </div>
        </div>

        {polygonsNeedingDEM.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Polygons needing DEM data:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {polygonsNeedingDEM.slice(0, 5).map((polygon, index) => (
                <div key={polygon.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span>{polygon.name || `Polygon ${polygon.id}`}</span>
                  <Badge variant="outline" className="text-orange-600">
                    No DEM
                  </Badge>
                </div>
              ))}
              {polygonsNeedingDEM.length > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  ... and {polygonsNeedingDEM.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        <Button 
          onClick={startPrefetch} 
          disabled={isPrefetching || polygonsNeedingDEM.length === 0}
          className="w-full"
        >
          {isPrefetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Prefetching DEM Data...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Start DEM Prefetch
            </>
          )}
        </Button>

        {isPrefetching && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(prefetchProgress)}%</span>
            </div>
            <Progress value={prefetchProgress} className="w-full" />
            <p className="text-xs text-gray-600">
              Downloading DEM tiles and processing terrain data...
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {prefetchResults && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                DEM prefetch completed successfully!
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-medium">Processed</div>
                <div className="text-blue-600 font-bold">{prefetchResults.totalProcessed}</div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="font-medium">Successful</div>
                <div className="text-green-600 font-bold">{prefetchResults.successful}</div>
              </div>
              <div className="p-2 bg-red-50 rounded">
                <div className="font-medium">Failed</div>
                <div className="text-red-600 font-bold">{prefetchResults.failed}</div>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <div className="font-medium">Tiles Created</div>
                <div className="text-purple-600 font-bold">{prefetchResults.tilesCreated}</div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Processing time: {prefetchResults.processingTime}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DemPrefetchTool;
