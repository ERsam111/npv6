import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProjects } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolType: 'gfa' | 'forecasting' | 'network' | 'inventory' | 'transportation' | 'production';
  toolName: string;
  redirectTo: string;
}

export function CreateProjectDialog({ 
  open, 
  onOpenChange, 
  toolType, 
  toolName,
  redirectTo 
}: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { createProject } = useProjects();
  const navigate = useNavigate();

  const { projects } = useProjects();

  const getModuleColors = () => {
    switch (toolType) {
      case 'gfa':
        return {
          gradient: 'from-gfa via-gfa/80 to-gfa/60',
          text: 'text-gfa',
          button: 'bg-gfa hover:bg-gfa/90',
        };
      case 'forecasting':
        return {
          gradient: 'from-forecasting via-forecasting/80 to-forecasting/60',
          text: 'text-forecasting',
          button: 'bg-forecasting hover:bg-forecasting/90',
        };
      case 'inventory':
        return {
          gradient: 'from-inventory via-inventory/80 to-inventory/60',
          text: 'text-inventory',
          button: 'bg-inventory hover:bg-inventory/90',
        };
      case 'network':
        return {
          gradient: 'from-network via-network/80 to-network/60',
          text: 'text-network',
          button: 'bg-network hover:bg-network/90',
        };
      case 'transportation':
        return {
          gradient: 'from-transportation via-transportation/80 to-transportation/60',
          text: 'text-transportation',
          button: 'bg-transportation hover:bg-transportation/90',
        };
      case 'production':
        return {
          gradient: 'from-production via-production/80 to-production/60',
          text: 'text-production',
          button: 'bg-production hover:bg-production/90',
        };
      default:
        return {
          gradient: 'from-primary via-primary/80 to-primary/60',
          text: 'text-primary',
          button: 'bg-primary hover:bg-primary/90',
        };
    }
  };

  const colors = getModuleColors();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    // Check for duplicate project name
    const duplicateProject = projects.find(
      p => p.name.toLowerCase() === name.trim().toLowerCase() && p.tool_type === toolType
    );
    
    if (duplicateProject) {
      toast.error('A project with this name already exists. Please choose a different name.');
      return;
    }

    setLoading(true);
    
    const project = await createProject({
      name: name.trim(),
      description: description.trim() || null,
      tool_type: toolType,
      input_data: {},
      results_data: {},
      size_mb: 0,
    });

    if (project) {
      toast.success('Project created successfully!');
      setName('');
      setDescription('');
      onOpenChange(false);
      navigate(redirectTo);
    } else {
      toast.error('Failed to create project');
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className={cn("bg-gradient-to-r rounded-t-lg p-6 -mt-6 -mx-6 mb-2", colors.gradient)}>
          <DialogTitle className="text-white text-xl">Create New Project</DialogTitle>
          <DialogDescription className="text-white/90">
            Create a new project for {toolName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="Enter project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description (Optional)</Label>
            <Textarea
              id="project-description"
              placeholder="Enter project description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading} className={cn(colors.button, "text-white")}>
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}