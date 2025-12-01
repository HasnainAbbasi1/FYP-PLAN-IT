import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Map, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus,
  Users,
  BarChart2,
  LayoutGrid,
  Clock,
  FileText,
  Building,
  TreeDeciduous,
  Route
} from "lucide-react";
import { Link } from 'react-router-dom';

const Dashboard = () => {
  // Sample data for statistics
  const stats = [
    { 
      title: "Today's Projects", 
      value: "$53,000",
      change: { value: 12, type: 'increase' },
      icon: <Map className="h-4 w-4 text-blue-400" />
    },
    { 
      title: "Active Users", 
      value: "2,300",
      change: { value: 5, type: 'increase' },
      icon: <Users className="h-4 w-4 text-blue-400" />
    },
    { 
      title: "New Clients", 
      value: "+3,052",
      change: { value: 18, type: 'increase' },
      icon: <Plus className="h-4 w-4 text-green-500" />
    },
    { 
      title: "Total Sales", 
      value: "$173,000",
      change: { value: 8, type: 'increase' },
      icon: <BarChart2 className="h-4 w-4 text-yellow-500" />
    }
  ];
  
  // Sample projects
  const recentProjects = [
    {
      id: "1",
      title: "City Center Redevelopment",
      description: "Urban renewal project for the downtown area",
      progress: 65,
      status: "active",
      budget: "$14,000",
      lastUpdated: "2 days ago",
    },
    {
      id: "2",
      title: "Riverside District Planning",
      description: "Waterfront development with mixed-use zones",
      progress: 40,
      status: "active",
      budget: "$21,500",
      lastUpdated: "5 days ago",
    },
    {
      id: "3",
      title: "Green Valley Housing",
      description: "Sustainable residential development with parks",
      progress: 80,
      status: "active",
      budget: "$35,200",
      lastUpdated: "3 days ago",
    },
    {
      id: "4",
      title: "Tech Innovation Hub",
      description: "Planning for a new technology park",
      progress: 20,
      status: "draft",
      budget: "$55,000",
      lastUpdated: "1 week ago",
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, Mark Johnson</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 hover:bg-accent-light dark:hover:bg-accent-dark">
              <FileText className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-gradient-base text-white hover:opacity-90 shadow-button">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-card-hover transition-all duration-300 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{stat.title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stat.value}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-gradient-base flex items-center justify-center shadow-button">
                    <div className="text-white">
                      {stat.icon}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {stat.change.type === 'increase' ? (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {stat.change.value}%
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600 dark:text-red-400">
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                      {stat.change.value}%
                    </div>
                  )}
                  <span className="text-slate-500 dark:text-slate-400">vs. last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {/* Welcome Card */}
          <Card className="md:col-span-2 relative overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Welcome back,</CardTitle>
              <CardDescription className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">Mark Johnson</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-slate-600 dark:text-slate-300 mb-1">Glad to see you again!</p>
              <p className="text-slate-600 dark:text-slate-300">Ask me anything.</p>
              
              <div className="mt-8">
                <Button variant="outline" className="border-accent-light-border dark:border-accent-dark-border text-accent hover:bg-accent-light dark:hover:bg-accent-dark">
                  View my tasks
                </Button>
              </div>
            </CardContent>
            <div className="absolute right-0 bottom-0 w-32 h-32 opacity-20">
              <img 
                src="/lovable-uploads/47c089d2-d46b-41f6-98f3-93cbc11cf8f8.png" 
                alt="Decorative" 
                className="object-cover w-full h-full"
              />
            </div>
          </Card>

          {/* Satisfaction Rate */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Satisfaction Rate</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">From all projects</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="none" 
                    stroke="rgba(69, 136, 173, 0.1)" 
                    strokeWidth="10" 
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="none" 
                    stroke="#4588AD" 
                    strokeWidth="10" 
                    strokeDasharray="251.2" 
                    strokeDashoffset="12.56" 
                    transform="rotate(-90 50 50)" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">95%</div>
                </div>
              </div>
              <div className="text-center mt-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">Satisfaction score</div>
                <div className="text-lg font-medium text-slate-800 dark:text-slate-100 mt-1">95 / 100</div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Tracking */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Referral Tracking</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Invited</div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">145 people</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Bonus</div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">1,465</div>
                </div>
                <Separator className="bg-accent-light-border dark:bg-accent-dark-border my-2" />
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="rgba(69, 136, 173, 0.1)" 
                      strokeWidth="10" 
                    />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="#2B4D5F" 
                      strokeWidth="10" 
                      strokeDasharray="251.2" 
                      strokeDashoffset="50.24" 
                      transform="rotate(-90 50 50)" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">9.3</div>
                  </div>
                </div>
                <div className="text-center text-sm text-slate-500 dark:text-slate-400">Total Score</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Tab */}
        <Tabs defaultValue="recent" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <TabsList className="bg-white dark:bg-slate-800 border-accent-light-border dark:border-accent-dark-border">
              <TabsTrigger value="recent" className="data-[state=active]:bg-gradient-base data-[state=active]:text-white">
                Recent Projects
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-gradient-base data-[state=active]:text-white">
                All Projects
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 hover:bg-accent-light dark:hover:bg-accent-dark">
                Filter
              </Button>
              <Button variant="outline" size="sm" className="border-accent-light-border dark:border-accent-dark-border text-slate-700 dark:text-slate-200 hover:bg-accent-light dark:hover:bg-accent-dark">
                Sort
              </Button>
            </div>
          </div>

          <TabsContent value="recent" className="mt-0 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-card-hover transition-all duration-300">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-base font-medium text-slate-800 dark:text-slate-100">{project.title}</CardTitle>
                      <Badge 
                        variant={project.status === 'active' ? 'default' : 'outline'}
                        className={`text-xs ${
                          project.status === 'active' 
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' 
                            : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        {project.status === 'active' ? 'Active' : 'Draft'}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                      {project.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Progress</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-1" />
                    </div>
                    <div className="flex justify-between items-center text-sm pt-4 mt-4 border-t border-accent-light-border dark:border-accent-dark-border">
                      <div className="flex items-center text-slate-500 dark:text-slate-400">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{project.lastUpdated}</span>
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{project.budget}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Link to="/projects" className="no-underline">
              <Button variant="outline" className="w-full border-dashed border-accent-light-border dark:border-accent-dark-border bg-accent-light/50 dark:bg-accent-dark/50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-accent-light dark:hover:bg-accent-dark">
                <Plus className="h-4 w-4 mr-2" />
                View All Projects
              </Button>
            </Link>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-slate-800 dark:text-slate-100">All Projects</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">Manage all your urban planning projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="flex flex-col gap-4">
                    {[...recentProjects, ...recentProjects].map((project, index) => (
                      <div key={`${project.id}-${index}`} className="flex justify-between items-center p-3 rounded-lg border border-accent-light-border dark:border-accent-dark-border hover:bg-accent-light dark:hover:bg-accent-dark transition-all duration-300">
                        <div className="flex items-start gap-3">
                          <div className="rounded-md bg-gradient-base p-2 mt-0.5">
                            <Map className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">{project.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{project.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="outline"
                                className="text-xs bg-accent-light/10 dark:bg-accent-dark/10 border-accent-light-border dark:border-accent-dark-border text-accent"
                              >
                                Urban
                              </Badge>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{project.lastUpdated}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 block">{project.budget}</span>
                          <div className="text-xs text-green-600 dark:text-green-400">{project.progress}% complete</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Recent Activity</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Your most recent actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4 rounded-lg border border-accent-light-border dark:border-accent-dark-border p-3">
                  <div className="rounded-full p-2 bg-blue-500/20">
                    <Map className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">You updated "City Center Redevelopment"</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Added new road network layout</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-lg border border-accent-light-border dark:border-accent-dark-border p-3">
                  <div className="rounded-full p-2 bg-green-500/20">
                    <Building className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">You created "Green Valley Housing"</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Started a new residential project</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">5 days ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-lg border border-accent-light-border dark:border-accent-dark-border p-3">
                  <div className="rounded-full p-2 bg-purple-500/20">
                    <TreeDeciduous className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Added green spaces to "Riverside District"</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Updated environmental balance</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">1 week ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Project Stats</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Key metrics across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 rounded-lg border border-accent-light-border dark:border-accent-dark-border p-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-accent" />
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">Buildings</h4>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">1,284</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Across all projects</p>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border border-accent-light-border dark:border-accent-dark-border p-4">
                  <div className="flex items-center gap-2">
                    <TreeDeciduous className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">Green Areas</h4>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">324</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Hectares planned</p>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border border-accent-light-border dark:border-accent-dark-border p-4">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">Roads</h4>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">567</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Kilometers planned</p>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border border-accent-light-border dark:border-accent-dark-border p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">Population</h4>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">125K</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Estimated capacity</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">AI Optimization Score</h4>
                  <Badge className="bg-accent-light/20 dark:bg-accent-dark/20 border-accent-light-border dark:border-accent-dark-border text-accent">Good</Badge>
                </div>
                <Progress value={78} className="h-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Your projects are well optimized. Consider running AI analysis on "Tech Innovation Hub" to improve its score.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
