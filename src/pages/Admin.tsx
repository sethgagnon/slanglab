import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  User,
  LogOut,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SourceManagement } from '@/components/admin/SourceManagement';
import { APISourceManagement } from '@/components/admin/APISourceManagement';
import { ContentModeration } from '@/components/admin/ContentModeration';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { ProtectedFeature } from '@/components/ProtectedFeature';

const Admin = () => {
  const { signOut } = useAuth();

  return (
    <ProtectedFeature config={{ requiresAdmin: true }} showCard={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">SlangLab</span>
              <Badge variant="destructive" className="ml-2">Admin</Badge>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/lookup" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Lookup
              </Link>
              <Link to="/slang-lab" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Creator
              </Link>
              <Link to="/history" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                History
              </Link>
            </nav>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/account">
                  <User className="h-4 w-4 mr-1" />
                  Account
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Manage content, sources, and system configuration
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="moderation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="moderation">Content Moderation</TabsTrigger>
              <TabsTrigger value="sources">Source Management</TabsTrigger>
              <TabsTrigger value="api">API Configuration</TabsTrigger>
              <TabsTrigger value="system">System Health</TabsTrigger>
            </TabsList>

            {/* Content Moderation Tab */}
            <TabsContent value="moderation" className="space-y-4">
              <ContentModeration />
            </TabsContent>

            {/* Source Management Tab */}
            <TabsContent value="sources" className="space-y-4">
              <SourceManagement />
            </TabsContent>

            {/* API Configuration Tab */}
            <TabsContent value="api" className="space-y-4">
              <APISourceManagement />
            </TabsContent>

            {/* System Health Tab */}
            <TabsContent value="system" className="space-y-4">
              <SystemHealth />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedFeature>
  );
};

export default Admin;