import { useState, useEffect } from "react";
import { ChevronDown, FolderOpen, GitBranch, Plus, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjects, Project } from "@/contexts/ProjectContext";
import { useScenarios, Scenario } from "@/contexts/ScenarioContext";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ProjectScenarioNavProps {
  currentProjectId?: string;
  currentScenarioId?: string;
  moduleType: 'gfa' | 'forecasting' | 'network' | 'inventory';
  moduleName: string;
  onProjectChange?: (project: Project) => void;
  onScenarioChange?: (scenario: Scenario) => void;
}

export const ProjectScenarioNav = ({
  currentProjectId,
  currentScenarioId,
  moduleType,
  moduleName,
  onProjectChange,
  onScenarioChange,
}: ProjectScenarioNavProps) => {
  const { projects, currentProject, setCurrentProject } = useProjects();
  const { scenarios, loadScenariosByProject, createScenario, deleteScenario, updateScenario, setCurrentScenario, currentScenario } = useScenarios();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Sync selectedProject with global currentProject from context
  useEffect(() => {
    if (currentProject && currentProject.tool_type === moduleType) {
      setSelectedProject(currentProject);
    }
  }, [currentProject, moduleType]);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createScenarioOpen, setCreateScenarioOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [scenarioToRename, setScenarioToRename] = useState<string | null>(null);
  const [newScenarioName, setNewScenarioName] = useState('');

  // Filter projects by module type
  const moduleProjects = projects.filter(p => p.tool_type === moduleType);

  // Load project and scenarios on mount or when IDs change
  useEffect(() => {
    if (currentProjectId) {
      const project = projects.find(p => p.id === currentProjectId);
      if (project) {
        setSelectedProject(project);
        loadScenariosByProject(project.id);
      }
    }
  }, [currentProjectId, projects]);

  useEffect(() => {
    if (currentScenarioId && scenarios.length > 0) {
      const scenario = scenarios.find(s => s.id === currentScenarioId);
      if (scenario) {
        setCurrentScenario(scenario);
      }
    }
  }, [currentScenarioId, scenarios]);

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setCurrentProject(project); // Update global context so sidebar highlights
    setCurrentScenario(null);
    loadScenariosByProject(project.id);
    onProjectChange?.(project);
  };

  const handleDeleteScenario = async () => {
    if (scenarioToDelete) {
      await deleteScenario(scenarioToDelete);
      toast.success("Scenario deleted successfully");
      if (currentScenario?.id === scenarioToDelete) {
        setCurrentScenario(null);
      }
      setScenarioToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleRenameScenario = async () => {
    if (scenarioToRename && newScenarioName.trim()) {
      await updateScenario(scenarioToRename, { name: newScenarioName.trim() });
      toast.success("Scenario renamed successfully");
      setScenarioToRename(null);
      setNewScenarioName('');
      setRenameDialogOpen(false);
    }
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    onScenarioChange?.(scenario);
  };

  const handleCreateScenario = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }

    if (!scenarioName.trim()) {
      toast.error("Please enter a scenario name");
      return;
    }

    // Check for duplicate scenario name within the project
    const duplicateScenario = scenarios.find(
      s => s.name.toLowerCase() === scenarioName.trim().toLowerCase()
    );
    
    if (duplicateScenario) {
      toast.error('A scenario with this name already exists in this project. Please choose a different name.');
      return;
    }

    const newScenario = await createScenario({
      name: scenarioName,
      description: scenarioDescription || null,
      project_id: selectedProject.id,
      module_type: moduleType,
      status: 'pending',
    });

    if (newScenario) {
      toast.success("Scenario created successfully");
      setCreateScenarioOpen(false);
      setScenarioName("");
      setScenarioDescription("");
      handleScenarioSelect(newScenario);
    } else {
      toast.error("Failed to create scenario");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'running': return 'bg-warning text-warning-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-border">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
          <span className="text-sm font-medium text-muted-foreground">{moduleName}</span>
        </div>

        {/* Project Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-background hover:bg-accent">
              <FolderOpen className="h-4 w-4" />
              <span className="font-semibold">
                {selectedProject ? selectedProject.name : "Select Project"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Projects</div>
            <DropdownMenuSeparator />
            {moduleProjects.length > 0 ? (
              moduleProjects.map(project => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className={selectedProject?.id === project.id ? "bg-accent" : ""}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{project.name}</span>
                    {project.description && (
                      <span className="text-xs text-muted-foreground truncate">{project.description}</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No projects found
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreateProjectOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Scenario Selector */}
        {selectedProject && (
          <>
            <div className="text-muted-foreground">/</div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-background hover:bg-accent">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-semibold">
                    {currentScenario ? currentScenario.name : "Select Scenario"}
                  </span>
                  {currentScenario && (
                    <Badge variant="secondary" className={getStatusColor(currentScenario.status)}>
                      {currentScenario.status}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Scenarios</div>
                <DropdownMenuSeparator />
                {scenarios.length > 0 ? (
                  scenarios.map(scenario => (
                    <DropdownMenuItem
                      key={scenario.id}
                      onClick={() => handleScenarioSelect(scenario)}
                      className={currentScenario?.id === scenario.id ? "bg-accent" : ""}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="font-medium truncate">{scenario.name}</span>
                          {scenario.description && (
                            <span className="text-xs text-muted-foreground truncate">{scenario.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className={`${getStatusColor(scenario.status)} text-xs`}>
                            {scenario.status}
                          </Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setScenarioToRename(scenario.id);
                              setNewScenarioName(scenario.name);
                              setRenameDialogOpen(true);
                            }}
                            className="p-1 hover:bg-accent rounded"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setScenarioToDelete(scenario.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="p-1 hover:bg-destructive/10 rounded"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No scenarios found
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCreateScenarioOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Scenario
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        toolType={moduleType}
        toolName={moduleName}
        redirectTo={`/${moduleType}`}
      />

      <Dialog open={createScenarioOpen} onOpenChange={setCreateScenarioOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Create New Scenario</DialogTitle>
            <DialogDescription>
              Create a new scenario for {selectedProject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-name">Scenario Name</Label>
              <Input
                id="scenario-name"
                placeholder="e.g., Baseline Analysis, What-if Scenario"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenario-description">Description (Optional)</Label>
              <Textarea
                id="scenario-description"
                placeholder="Describe what this scenario analyzes..."
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateScenarioOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateScenario}>
              Create Scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Scenario Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Rename Scenario</DialogTitle>
            <DialogDescription>
              Enter a new name for this scenario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-rename">Scenario Name</Label>
              <Input
                id="scenario-rename"
                placeholder="Enter scenario name"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameScenario()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameScenario} disabled={!newScenarioName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Scenario Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scenario? This action cannot be undone and will delete all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScenario} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Scenario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
