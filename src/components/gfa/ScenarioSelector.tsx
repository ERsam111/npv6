import { useState, useEffect } from 'react';
import { useProjects, Project } from '@/contexts/ProjectContext';
import { useScenarios } from '@/contexts/ScenarioContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface ScenarioSelectorProps {
  toolType: 'gfa' | 'forecasting' | 'network' | 'inventory';
  onScenarioReady: (scenarioId: string, projectId: string) => void;
}

export const ScenarioSelector = ({ toolType, onScenarioReady }: ScenarioSelectorProps) => {
  const { projects, createProject } = useProjects();
  const { scenarios, loadScenariosByProject, createScenario, currentScenario, setCurrentScenario } = useScenarios();
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDialogOpen, setNewScenarioDialogOpen] = useState(false);

  // Filter projects by tool type
  const filteredProjects = projects.filter(p => p.tool_type === toolType);

  useEffect(() => {
    if (selectedProject) {
      loadScenariosByProject(selectedProject.id);
    }
  }, [selectedProject]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    const project = await createProject({
      name: newProjectName,
      description: null,
      tool_type: toolType,
      input_data: null,
      results_data: null,
      size_mb: 0,
    });

    if (project) {
      setSelectedProject(project);
      setNewProjectDialogOpen(false);
      setNewProjectName('');
      toast.success('Project created successfully');
    } else {
      toast.error('Failed to create project');
    }
  };

  const handleCreateScenario = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    const scenarioName = newScenarioName.trim() || `Scenario ${scenarios.length + 1}`;

    const scenario = await createScenario({
      project_id: selectedProject.id,
      name: scenarioName,
      description: null,
      module_type: toolType,
      status: 'pending',
    });

    if (scenario) {
      setCurrentScenario(scenario);
      setNewScenarioDialogOpen(false);
      setNewScenarioName('');
      toast.success('Scenario created successfully');
      onScenarioReady(scenario.id, selectedProject.id);
    } else {
      toast.error('Failed to create scenario');
    }
  };

  const handleSelectScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario && selectedProject) {
      setCurrentScenario(scenario);
      onScenarioReady(scenario.id, selectedProject.id);
    }
  };

  if (currentScenario && selectedProject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Project: {selectedProject.name}</div>
              <div>Scenario: {currentScenario.name}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentScenario(null)}>
              Change Scenario
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select or Create Scenario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Selection */}
        <div className="space-y-2">
          <Label>Project</Label>
          <div className="flex gap-2">
            <Select
              value={selectedProject?.id}
              onValueChange={(id) => {
                const project = filteredProjects.find(p => p.id === id);
                setSelectedProject(project || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {filteredProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  <Button onClick={handleCreateProject} className="w-full">
                    Create Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Scenario Selection */}
        {selectedProject && (
          <div className="space-y-2">
            <Label>Scenario</Label>
            <div className="flex gap-2">
              <Select
                value={currentScenario?.id}
                onValueChange={handleSelectScenario}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or create a scenario" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map(scenario => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={newScenarioDialogOpen} onOpenChange={setNewScenarioDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Scenario</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="scenario-name">Scenario Name (optional)</Label>
                      <Input
                        id="scenario-name"
                        value={newScenarioName}
                        onChange={(e) => setNewScenarioName(e.target.value)}
                        placeholder={`Scenario ${scenarios.length + 1}`}
                      />
                      <p className="text-sm text-muted-foreground">
                        Leave empty to auto-generate name
                      </p>
                    </div>
                    <Button onClick={handleCreateScenario} className="w-full">
                      Create Scenario
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {!selectedProject && (
          <div className="text-center text-muted-foreground py-8">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select or create a project to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
