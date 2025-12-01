
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, PieChart } from 'lucide-react';

const Analysis = () => {
  return (
    <MainLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">Land Analysis</h1>
          <Button className="bg-primary hover:bg-primary/90">Generate Report</Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-[28rem] grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="environmental">Environmental</TabsTrigger>
            <TabsTrigger value="economic">Economic</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="flex flex-col gap-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Land Usage</CardTitle>
                  <CardDescription>Distribution by category</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="flex h-40 w-40 items-center justify-center rounded-full bg-muted">
                    <PieChart className="h-20 w-20 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Density Analysis</CardTitle>
                  <CardDescription>Population per area</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="flex h-40 w-40 items-center justify-center rounded-full bg-muted">
                    <BarChart className="h-20 w-20 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Growth Trends</CardTitle>
                  <CardDescription>5-year projection</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="flex h-40 w-40 items-center justify-center rounded-full bg-muted">
                    <LineChart className="h-20 w-20 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Land Suitability Analysis</CardTitle>
                <CardDescription>
                  Comprehensive evaluation of land characteristics for various development purposes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium">Residential</div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className="h-full rounded-full bg-green-500" style={{width: '67%'}} />
                      </div>
                      <div className="text-xs text-muted-foreground">67% suitable</div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium">Commercial</div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className="h-full rounded-full bg-yellow-500" style={{width: '45%'}} />
                      </div>
                      <div className="text-xs text-muted-foreground">45% suitable</div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium">Industrial</div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className="h-full rounded-full bg-red-500" style={{width: '30%'}} />
                      </div>
                      <div className="text-xs text-muted-foreground">30% suitable</div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium">Agricultural</div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className="h-full rounded-full bg-green-600" style={{width: '82%'}} />
                      </div>
                      <div className="text-xs text-muted-foreground">82% suitable</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="environmental" className="flex flex-col gap-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Environmental Impact Assessment</CardTitle>
                <CardDescription>Analysis of environmental factors and potential impacts</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Environmental analysis content will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="economic" className="flex flex-col gap-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Economic Viability Analysis</CardTitle>
                <CardDescription>Cost-benefit analysis and economic projections</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Economic analysis content will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Analysis;
