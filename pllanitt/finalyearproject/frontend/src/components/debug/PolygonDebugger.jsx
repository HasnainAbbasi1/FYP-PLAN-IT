import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bug, Database, MapPin, FileText, AlertCircle } from 'lucide-react';

const PolygonDebugger = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runDebugCheck = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate debug check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockDebugInfo = {
        totalPolygons: 15,
        polygonsWithGeoJSON: 12,
        polygonsWithDEM: 8,
        polygonsWithoutData: 3,
        lastUpdated: new Date().toISOString(),
        issues: [
          {
            type: 'missing_geojson',
            count: 3,
            message: '3 polygons missing GeoJSON boundary data'
          },
          {
            type: 'missing_dem',
            count: 7,
            message: '7 polygons missing DEM terrain data'
          }
        ]
      };
      
      setDebugInfo(mockDebugInfo);
    } catch (err) {
      setError('Failed to run debug check');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Polygon Debug Tool
        </CardTitle>
        <CardDescription>
          Check polygon data integrity and identify issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDebugCheck} 
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? 'Running Debug Check...' : 'Run Debug Check'}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {debugInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Total Polygons</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {debugInfo.totalPolygons}
                </span>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">With GeoJSON</span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {debugInfo.polygonsWithGeoJSON}
                </span>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">With DEM</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">
                  {debugInfo.polygonsWithDEM}
                </span>
              </div>
              
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Issues</span>
                </div>
                <span className="text-2xl font-bold text-red-600">
                  {debugInfo.polygonsWithoutData}
                </span>
              </div>
            </div>

            {debugInfo.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Issues Found:</h4>
                {debugInfo.issues.map((issue, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded border">
                    <span className="text-sm">{issue.message}</span>
                    <Badge variant="outline" className="text-yellow-700">
                      {issue.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-gray-500">
              Last checked: {new Date(debugInfo.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PolygonDebugger;
