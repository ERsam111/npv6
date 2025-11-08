import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, TrendingUp, Network, Gauge, Home, User, FolderOpen, Plus, ChevronDown, Calendar, HardDrive, Trash2, MoreVertical, Pencil, Database, Filter, FolderKanban } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScenarios } from '@/contexts/ScenarioContext';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { CreateProjectDialog } from './CreateProjectDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
const navigationItems = [{
  title: 'Dashboard',
  url: '/dashboard',
  icon: Home,
  type: null
}, {
  title: 'GFA',
  url: '/gfa',
  icon: MapPin,
  type: 'gfa' as const
}, {
  title: 'Demand Forecasting',
  url: '/demand-forecasting',
  icon: TrendingUp,
  type: 'forecasting' as const
}, {
  title: 'Network Analysis',
  url: '/network',
  icon: Network,
  type: 'network' as const
}, {
  title: 'Inventory Optimization',
  url: '/inventory-optimization-v2',
  icon: Gauge,
  type: 'inventory' as const
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    projects,
    currentProject,
    setCurrentProject,
    deleteProject,
    updateProject,
    operationLoading: projectOperationLoading
  } = useProjects();
  const {
    operationLoading: scenarioOperationLoading
  } = useScenarios();
  const {
    user
  } = useAuth();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<typeof navigationItems[0] | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [scenarioCounts, setScenarioCounts] = useState<Record<string, number>>({});
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const isActive = (path: string) => location.pathname === path;
  const collapsed = state === 'collapsed';
  const handleNavClick = (item: typeof navigationItems[0]) => {
    if (item.type) {
      setSelectedTool(item);
      setCreateDialogOpen(true);
    } else {
      navigate(item.url);
    }
  };
  const handleProjectClick = (projectId: string, toolType: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
    }
    const routeMap: Record<string, string> = {
      gfa: '/gfa',
      forecasting: '/demand-forecasting',
      network: '/network',
      inventory: '/inventory-optimization-v2'
    };
    const route = routeMap[toolType] || '/dashboard';
    // Navigate with project ID in state
    navigate(route, {
      state: {
        projectId
      }
    });
  };
  useEffect(() => {
    // Update current project based on location state
    if (location.state?.projectId) {
      const project = projects.find(p => p.id === location.state.projectId);
      if (project) {
        setCurrentProject(project);
      }
    }
  }, [location.state, projects, setCurrentProject]);

  // Load scenario counts for all projects
  useEffect(() => {
    const loadScenarioCounts = async () => {
      if (!user) return;
      const counts: Record<string, number> = {};
      for (const project of projects) {
        const {
          data,
          error
        } = await (supabase as any).from('scenarios').select('id', {
          count: 'exact'
        }).eq('project_id', project.id);
        if (!error && data) {
          counts[project.id] = data.length;
        }
      }
      setScenarioCounts(counts);
    };
    loadScenarioCounts();
  }, [projects, user]);
  const handleDeleteClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };
  const handleRenameClick = (projectId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToRename(projectId);
    setNewProjectName(currentName);
    setRenameDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete);
      toast.success('Project deleted successfully');
      setProjectToDelete(null);
      setDeleteDialogOpen(false);
    }
  };
  const confirmRename = async () => {
    if (projectToRename && newProjectName.trim()) {
      await updateProject(projectToRename, {
        name: newProjectName.trim()
      });
      toast.success('Project renamed successfully');
      setProjectToRename(null);
      setNewProjectName('');
      setRenameDialogOpen(false);
    }
  };
  const getModuleTag = (toolType: string) => {
    switch (toolType) {
      case 'gfa':
        return 'GFA';
      case 'forecasting':
        return 'DP';
      case 'inventory':
        return 'IO';
      default:
        return 'NO';
    }
  };
  const getModuleTagColor = (toolType: string) => {
    switch (toolType) {
      case 'gfa':
        return 'bg-green-600 text-white';
      case 'forecasting':
        return 'bg-purple-600 text-white';
      case 'inventory':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };
  const getModuleHighlightColor = (toolType: string) => {
    switch (toolType) {
      case 'gfa':
        return 'bg-green-500/10 border-green-500/20';
      case 'forecasting':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'inventory':
        return 'bg-orange-500/10 border-orange-500/20';
      default:
        return 'bg-accent border-border';
    }
  };
  const getModuleIcon = (toolType: string) => {
    switch (toolType) {
      case 'gfa':
        return MapPin;
      case 'forecasting':
        return TrendingUp;
      case 'network':
        return Network;
      case 'inventory':
        return Gauge;
      default:
        return FolderOpen;
    }
  };

  // Filter projects based on type filter
  const filteredProjects = projects.filter(project => {
    if (typeFilter === 'all') return true;
    return project.tool_type === typeFilter;
  });
  return <>
      <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible="icon">
        <SidebarHeader className="border-b p-4">
          {!collapsed && <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">SC</span>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-sm">Supply Chain</h2>
                <p className="text-xs text-muted-foreground">Optimization Suite</p>
              </div>
            </div>}
        </SidebarHeader>

        <SidebarContent>
          {/* Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate('/dashboard')} isActive={isActive('/dashboard')}>
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate('/project-management')} isActive={isActive('/project-management')}>
                    <FolderKanban className="h-4 w-4" />
                    {!collapsed && <span>Project Management</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {navigationItems.filter(item => item.type).map(item => {
                const Icon = item.icon;
                return <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton onClick={() => handleNavClick(item)} isActive={isActive(item.url)} className="w-full">
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>;
              })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Projects with Type Filter */}
          {!collapsed && <SidebarGroup>
              <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:bg-accent/50 rounded-md px-2 py-1">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>My Projects</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${projectsOpen ? 'rotate-180' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="space-y-2">
                    {/* Type Filter */}
                    <div className="px-2 pb-2 border-b">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                              <Filter className="h-3.5 w-3.5" />
                              Type: {typeFilter === 'all' ? 'All' : typeFilter === 'gfa' ? 'GFA' : typeFilter === 'forecasting' ? 'DP' : 'IO'}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                          <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                            All Projects
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTypeFilter('gfa')}>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold mr-2 ${getModuleTagColor('gfa')}`}>
                              GFA
                            </span>
                            GFA Projects
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTypeFilter('inventory')}>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold mr-2 ${getModuleTagColor('inventory')}`}>
                              IO
                            </span>
                            Inventory Optimization
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTypeFilter('forecasting')}>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold mr-2 ${getModuleTagColor('forecasting')}`}>
                              DP
                            </span>
                            Demand Planning
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Flat Project List */}
                    {filteredProjects.length === 0 ? <div className="px-3 py-2 text-xs text-muted-foreground">
                        {typeFilter === 'all' ? 'No projects yet' : 'No projects of this type'}
                      </div> : <div className="space-y-1">
                        {filteredProjects.map(project => {
                    const isCurrentProject = currentProject?.id === project.id;
                    const scenarioCount = scenarioCounts[project.id] || 0;
                    const tag = getModuleTag(project.tool_type);
                    return <div key={project.id} className={`px-2 py-2 text-sm rounded-md cursor-pointer group flex items-center justify-between transition-all border ${isCurrentProject ? `${getModuleHighlightColor(project.tool_type)} border-l-4 font-medium` : 'hover:bg-accent border-transparent'}`} onClick={() => handleProjectClick(project.id, project.tool_type)}>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${getModuleTagColor(project.tool_type)}`}>
                                  {tag}
                                </span>
                                <span className="font-medium truncate">{project.name}</span>
                                {scenarioCount > 0 && <span className="text-xs text-muted-foreground flex-shrink-0">({scenarioCount})</span>}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-accent-foreground/10 rounded flex-shrink-0" onClick={e => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-50">
                                  <DropdownMenuItem onClick={e => handleRenameClick(project.id, project.name, e)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Rename Project
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={e => handleDeleteClick(project.id, e)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Project
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>;
                  })}
                      </div>}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>}

          {/* Database Status Indicator */}
          {!collapsed && (projectOperationLoading || scenarioOperationLoading) && <div className="px-4 py-2 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="h-3 w-3 animate-pulse" />
                <span className="animate-pulse">
                  {projectOperationLoading ? 'Saving project data...' : 'Saving scenario data...'}
                </span>
              </div>
            </div>}

          {/* Profile */}
          {!collapsed && user && <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>Profile</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4" />
                      <span>My Profile</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>}
        </SidebarContent>
      </Sidebar>

      {selectedTool && selectedTool.type && <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} toolType={selectedTool.type} toolName={selectedTool.title} redirectTo={selectedTool.url} />}

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" placeholder="Enter project name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmRename()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!newProjectName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}