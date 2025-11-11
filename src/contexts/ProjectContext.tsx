import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tool_type: 'gfa' | 'forecasting' | 'network' | 'inventory' | 'transportation' | 'production';
  input_data: any;
  results_data: any;
  size_mb: number;
  created_at: string;
  updated_at: string;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  operationLoading: boolean;
  createProject: (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const { user } = useAuth();

  const fetchProjects = async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data as Project[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const createProject = async (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    setOperationLoading(true);
    const { data, error } = await (supabase as any)
      .from('projects')
      .insert([{ ...project, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      setProjects([data as Project, ...projects]);
      setOperationLoading(false);
      return data as Project;
    }
    setOperationLoading(false);
    return null;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    setOperationLoading(true);
    const { error } = await (supabase as any)
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await fetchProjects();
    }
    setOperationLoading(false);
  };

  const deleteProject = async (id: string) => {
    setOperationLoading(true);
    const { error } = await (supabase as any)
      .from('projects')
      .delete()
      .eq('id', id);

    if (!error) {
      setProjects(projects.filter(p => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
    }
    setOperationLoading(false);
  };

  return (
    <ProjectContext.Provider value={{ 
      projects,
      currentProject,
      loading,
      operationLoading,
      createProject, 
      updateProject, 
      deleteProject,
      refreshProjects: fetchProjects,
      setCurrentProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};