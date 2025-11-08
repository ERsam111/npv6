import { useState, useEffect } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useScenarios } from '@/contexts/ScenarioContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, Trash2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProjectWithDetails {
  id: string;
  name: string;
  description: string | null;
  tool_type: string;
  created_at: string;
  user_id: string;
  owner_email?: string;
  scenarios: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
  }>;
  collaborators: Array<{
    id: string;
    user_id: string;
    email?: string;
  }>;
  isOwner: boolean;
}

export default function ProjectManagement() {
  const { projects } = useProjects();
  const { user } = useAuth();
  const [projectsWithDetails, setProjectsWithDetails] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const getModuleColor = (toolType: string) => {
    switch (toolType?.toLowerCase()) {
      case 'gfa':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'inventory':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'forecasting':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'network':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getModuleLabel = (toolType: string) => {
    switch (toolType?.toLowerCase()) {
      case 'gfa':
        return 'GFA';
      case 'inventory':
        return 'IO';
      case 'forecasting':
        return 'DP';
      case 'network':
        return 'NO';
      default:
        return toolType;
    }
  };

  useEffect(() => {
    loadProjectDetails();
  }, [projects]);

  const loadProjectDetails = async () => {
    setLoading(true);
    const details = await Promise.all(
      projects.map(async (project) => {
        // Fetch scenarios
        const { data: scenarios } = await (supabase as any)
          .from('scenarios')
          .select('id, name, description, status')
          .eq('project_id', project.id);

        // Fetch collaborators
        const { data: collaborators } = await (supabase as any)
          .from('project_collaborators')
          .select('id, user_id')
          .eq('project_id', project.id);

        // Fetch owner email from profiles
        const { data: ownerProfile } = await (supabase as any)
          .from('profiles')
          .select('email')
          .eq('id', project.user_id)
          .single();

        // Fetch collaborator emails
        const collaboratorsWithEmails = await Promise.all(
          (collaborators || []).map(async (collab: any) => {
            const { data: profile } = await (supabase as any)
              .from('profiles')
              .select('email')
              .eq('id', collab.user_id)
              .single();
            return {
              ...collab,
              email: profile?.email || '',
            };
          })
        );

        return {
          ...project,
          owner_email: ownerProfile?.email || '',
          scenarios: scenarios || [],
          collaborators: collaboratorsWithEmails,
          isOwner: project.user_id === user?.id,
        };
      })
    );
    setProjectsWithDetails(details);
    setLoading(false);
  };

  const handleInvite = async (projectId: string) => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setInviting(true);
    try {
      // Get user by email using secure function
      const { data: userId, error: lookupError } = await (supabase as any)
        .rpc('get_user_id_by_email', { _email: inviteEmail.trim() });

      if (lookupError || !userId) {
        toast.error('User not found. Please check the email address.');
        setInviting(false);
        return;
      }

      // Add collaborator
      const { error } = await (supabase as any)
        .from('project_collaborators')
        .insert({
          project_id: projectId,
          user_id: userId,
          granted_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User already has access to this project');
        } else {
          toast.error('Failed to invite user');
        }
      } else {
        toast.success('User invited successfully');
        setInviteEmail('');
        setSelectedProject(null);
        loadProjectDetails();
      }
    } catch (error) {
      toast.error('An error occurred');
    }
    setInviting(false);
  };

  const handleRemoveCollaborator = async (projectId: string, collaboratorId: string) => {
    const { error } = await (supabase as any)
      .from('project_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) {
      toast.error('Failed to remove collaborator');
    } else {
      toast.success('Collaborator removed');
      loadProjectDetails();
    }
  };

  return (
    <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Project Management</h1>
          <p className="text-muted-foreground">
            Manage your projects, scenarios, and collaborators
          </p>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Scenarios</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : projectsWithDetails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                projectsWithDetails.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {project.isOwner && <Crown className="w-4 h-4 text-yellow-500" />}
                        {project.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {project.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getModuleColor(project.tool_type)} variant="outline">
                        {getModuleLabel(project.tool_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {project.owner_email || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {project.scenarios.length} scenario(s)
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Scenarios for {project.name}</DialogTitle>
                            <DialogDescription>
                              View all scenarios in this project
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {project.scenarios.map((scenario) => (
                              <div
                                key={scenario.id}
                                className="p-3 rounded-lg border bg-card space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-medium">{scenario.name}</p>
                                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                    scenario.status === 'completed' 
                                      ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {scenario.status}
                                  </span>
                                </div>
                                {scenario.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {scenario.description}
                                  </p>
                                )}
                              </div>
                            ))}
                            {project.scenarios.length === 0 && (
                              <p className="text-center text-muted-foreground py-4">
                                No scenarios yet
                              </p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      {format(new Date(project.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {project.isOwner && (
                        <Dialog open={selectedProject === project.id} onOpenChange={(open) => setSelectedProject(open ? project.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserPlus className="w-4 h-4 mr-2" />
                              Grant Access
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Grant Project Access</DialogTitle>
                              <DialogDescription>
                                Invite users to access {project.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="email">User Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="user@example.com"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  User must have an account to receive access
                                </p>
                              </div>
                              <Button
                                onClick={() => handleInvite(project.id)}
                                disabled={inviting}
                                className="w-full"
                              >
                                {inviting ? 'Inviting...' : 'Send Invite'}
                              </Button>

                              {project.collaborators.length > 0 && (
                                <div className="space-y-2 mt-6">
                                  <Label>Current Collaborators</Label>
                                  {project.collaborators.map((collab) => (
                                    <div
                                      key={collab.id}
                                      className="flex items-center justify-between p-2 rounded-md border"
                                    >
                                      <span className="text-sm">{collab.email}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveCollaborator(project.id, collab.id)}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {!project.isOwner && (
                        <Badge variant="secondary">Collaborator</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  );
}
