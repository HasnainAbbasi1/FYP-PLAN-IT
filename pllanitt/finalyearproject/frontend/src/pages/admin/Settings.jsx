
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

const Settings = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const Layout = isAdmin ? AdminLayout : MainLayout;

  return (
    <Layout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Settings2 className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-bold text-accent">Settings</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue="urbanplanner" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="planner@example.com" />
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive project updates via email</p>
                </div>
                <Switch id="notifications" defaultChecked />
              </div>
              <Button className="w-full">Save Changes</Button>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>Customize your planning experience</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex justify-between items-center py-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="dark-mode">Theme</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                  <p className="text-sm text-muted-foreground">Current theme: {isDark ? 'Dark' : 'Light'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch 
                    id="dark-mode" 
                    checked={isDark}
                    onCheckedChange={toggleTheme}
                  />
                  <ThemeToggle showLabel />
                </div>
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="auto-save">Auto Save</Label>
                  <p className="text-sm text-muted-foreground">Automatically save your changes</p>
                </div>
                <Switch id="auto-save" defaultChecked />
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="analytics">Analytics</Label>
                  <p className="text-sm text-muted-foreground">Help improve the platform with usage data</p>
                </div>
                <Switch id="analytics" defaultChecked />
              </div>
              <Separator className="my-4" />
              <div className="flex flex-col gap-2">
                <Label htmlFor="units">Measurement Units</Label>
                <select id="units" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="metric">Metric (meters, kilometers)</option>
                  <option value="imperial">Imperial (feet, miles)</option>
                </select>
              </div>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle>API Integration</CardTitle>
              <CardDescription>Connect with external data sources and services</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input id="api-key" type="password" defaultValue="••••••••••••••••" />
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="maps-api">Maps API Integration</Label>
                  <p className="text-sm text-muted-foreground">Connect to external mapping services</p>
                </div>
                <Switch id="maps-api" defaultChecked />
              </div>
              <Button variant="outline" className="w-full">Regenerate API Key</Button>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Customize technical aspects of the application</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cache">Cache Size (MB)</Label>
                <Input id="cache" type="number" defaultValue="500" />
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="debug-mode">Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">Enable detailed logging and diagnostics</p>
                </div>
                <Switch id="debug-mode" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="language">Language</Label>
                <select id="language" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </select>
              </div>
              <Button variant="destructive" className="w-full">Reset All Settings</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
