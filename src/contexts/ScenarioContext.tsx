import { createContext, useContext, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface Scenario {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  module_type: 'gfa' | 'forecasting' | 'network' | 'inventory';
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ScenarioInput {
  id: string;
  scenario_id: string;
  input_data: any;
  created_at: string;
}

export interface ScenarioOutput {
  id: string;
  scenario_id: string;
  output_data: any;
  created_at: string;
}

interface ScenarioContextType {
  scenarios: Scenario[];
  currentScenario: Scenario | null;
  loading: boolean;
  operationLoading: boolean;
  loadScenariosByProject: (projectId: string, moduleType?: string) => Promise<void>;
  createScenario: (scenario: Omit<Scenario, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Scenario | null>;
  updateScenario: (id: string, updates: Partial<Scenario>) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
  setCurrentScenario: (scenario: Scenario | null) => void;
  saveScenarioInput: (scenarioId: string, inputData: any, background?: boolean) => Promise<void>;
  saveScenarioOutput: (scenarioId: string, outputData: any, background?: boolean) => Promise<void>;
  loadScenarioInput: (scenarioId: string) => Promise<any>;
  loadScenarioOutput: (scenarioId: string) => Promise<any>;
}

const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined);

export const ScenarioProvider = ({ children }: { children: React.ReactNode }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const { user } = useAuth();

  const loadScenariosByProject = async (projectId: string, moduleType?: string) => {
    if (!user) return;

    setLoading(true);
    let query = (supabase as any)
      .from('scenarios')
      .select('*')
      .eq('project_id', projectId);
    
    // Filter by module type if provided
    if (moduleType) {
      query = query.eq('module_type', moduleType);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setScenarios(data as Scenario[]);
    }
    setLoading(false);
  };

  const createScenario = async (scenario: Omit<Scenario, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const { data, error } = await (supabase as any)
      .from('scenarios')
      .insert([{ ...scenario, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      setScenarios([data as Scenario, ...scenarios]);
      return data as Scenario;
    }
    return null;
  };

  const updateScenario = async (id: string, updates: Partial<Scenario>) => {
    const { error } = await (supabase as any)
      .from('scenarios')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setScenarios(scenarios.map(s => s.id === id ? { ...s, ...updates } : s));
      if (currentScenario?.id === id) {
        setCurrentScenario({ ...currentScenario, ...updates });
      }
    }
  };

  const deleteScenario = async (id: string) => {
    const { error } = await (supabase as any)
      .from('scenarios')
      .delete()
      .eq('id', id);

    if (!error) {
      setScenarios(scenarios.filter(s => s.id !== id));
      if (currentScenario?.id === id) {
        setCurrentScenario(null);
      }
    }
  };

  const saveScenarioInput = async (scenarioId: string, inputData: any, background: boolean = false) => {
    if (!background) {
      setOperationLoading(true);
    }
    
    try {
      // Use upsert to replace existing data instead of creating duplicates
      const { data: existing } = await (supabase as any)
        .from('scenario_inputs')
        .select('id')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        // Update existing record
        await (supabase as any)
          .from('scenario_inputs')
          .update({ input_data: inputData })
          .eq('id', existing.id);
      } else {
        // Insert new record
        await (supabase as any)
          .from('scenario_inputs')
          .insert([{ scenario_id: scenarioId, input_data: inputData }]);
      }
    } catch (error) {
      console.error('Error saving scenario input:', error);
    } finally {
      if (!background) {
        setOperationLoading(false);
      }
    }
  };

  const saveScenarioOutput = async (scenarioId: string, outputData: any, background: boolean = false) => {
    if (!background) {
      setOperationLoading(true);
    }
    
    try {
      // Use upsert to replace existing data instead of creating duplicates
      const { data: existing } = await (supabase as any)
        .from('scenario_outputs')
        .select('id')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        // Update existing record
        await (supabase as any)
          .from('scenario_outputs')
          .update({ output_data: outputData })
          .eq('id', existing.id);
      } else {
        // Insert new record
        await (supabase as any)
          .from('scenario_outputs')
          .insert([{ scenario_id: scenarioId, output_data: outputData }]);
      }
    } catch (error) {
      console.error('Error saving scenario output:', error);
      throw error; // Re-throw for caller to handle
    } finally {
      if (!background) {
        setOperationLoading(false);
      }
    }
  };

  const loadScenarioInput = async (scenarioId: string) => {
    setOperationLoading(true);
    const { data, error } = await (supabase as any)
      .from('scenario_inputs')
      .select('input_data')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setOperationLoading(false);
    if (!error && data) {
      return data.input_data;
    }
    return null;
  };

  const loadScenarioOutput = async (scenarioId: string) => {
    setOperationLoading(true);
    const { data, error } = await (supabase as any)
      .from('scenario_outputs')
      .select('output_data')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setOperationLoading(false);
    if (!error && data) {
      return data.output_data;
    }
    return null;
  };

  return (
    <ScenarioContext.Provider value={{
      scenarios,
      currentScenario,
      loading,
      operationLoading,
      loadScenariosByProject,
      createScenario,
      updateScenario,
      deleteScenario,
      setCurrentScenario,
      saveScenarioInput,
      saveScenarioOutput,
      loadScenarioInput,
      loadScenarioOutput,
    }}>
      {children}
    </ScenarioContext.Provider>
  );
};

export const useScenarios = () => {
  const context = useContext(ScenarioContext);
  if (context === undefined) {
    throw new Error('useScenarios must be used within a ScenarioProvider');
  }
  return context;
};
