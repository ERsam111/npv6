
-- Migration: 20251105134546

-- Migration: 20251104105808

-- Migration: 20251103074553

-- Migration: 20251103054852
-- Create enums for scenario management
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.module_type AS ENUM ('gfa', 'inventory', 'forecasting', 'network');
CREATE TYPE public.scenario_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Create scenarios table
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  module_type module_type NOT NULL,
  status scenario_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

-- Create scenario_inputs table
CREATE TABLE public.scenario_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_inputs ENABLE ROW LEVEL SECURITY;

-- Create scenario_outputs table
CREATE TABLE public.scenario_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  output_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_outputs ENABLE ROW LEVEL SECURITY;

-- Create computation_logs table
CREATE TABLE public.computation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  cpu_type TEXT NOT NULL,
  ram_size TEXT NOT NULL,
  execution_time_seconds FLOAT,
  cpu_usage_percent FLOAT,
  memory_usage_mb FLOAT,
  cost_usd FLOAT,
  aws_task_arn TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.computation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for scenarios
CREATE POLICY "Users can view their own scenarios"
  ON public.scenarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scenarios"
  ON public.scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON public.scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON public.scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for scenario_inputs
CREATE POLICY "Users can view inputs for their scenarios"
  ON public.scenario_inputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = scenario_inputs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inputs for their scenarios"
  ON public.scenario_inputs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = scenario_inputs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

-- RLS Policies for scenario_outputs
CREATE POLICY "Users can view outputs for their scenarios"
  ON public.scenario_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = scenario_outputs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create outputs for their scenarios"
  ON public.scenario_outputs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = scenario_outputs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

-- RLS Policies for computation_logs
CREATE POLICY "Users can view logs for their scenarios"
  ON public.computation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = computation_logs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create logs for their scenarios"
  ON public.computation_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = computation_logs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-update updated_at on scenarios
CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for scenarios table
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.computation_logs;

-- Migration: 20251103062302
-- Create projects table for storing user projects
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  tool_type text NOT NULL,
  input_data jsonb,
  results_data jsonb,
  size_mb numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Migration: 20251103062331
-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Migration: 20251103062856
-- Add project_id to scenarios table to link scenarios to projects
ALTER TABLE public.scenarios
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update RLS policies to check project ownership through scenarios
DROP POLICY IF EXISTS "Users can view inputs for their scenarios" ON public.scenario_inputs;
DROP POLICY IF EXISTS "Users can create inputs for their scenarios" ON public.scenario_inputs;
DROP POLICY IF EXISTS "Users can view outputs for their scenarios" ON public.scenario_outputs;
DROP POLICY IF EXISTS "Users can create outputs for their scenarios" ON public.scenario_outputs;

-- Recreate policies with project ownership check
CREATE POLICY "Users can view inputs for their scenarios"
  ON public.scenario_inputs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_inputs.scenario_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create inputs for their scenarios"
  ON public.scenario_inputs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_inputs.scenario_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can view outputs for their scenarios"
  ON public.scenario_outputs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_outputs.scenario_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create outputs for their scenarios"
  ON public.scenario_outputs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_outputs.scenario_id
    AND p.user_id = auth.uid()
  ));


-- Migration: 20251104045022
-- Create scenario_results table for storing multiple results per scenario
CREATE TABLE IF NOT EXISTS public.scenario_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Result 1',
  result_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scenario_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view results for their scenarios"
ON public.scenario_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    WHERE s.id = scenario_results.scenario_id
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create results for their scenarios"
ON public.scenario_results
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios s
    WHERE s.id = scenario_results.scenario_id
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update results for their scenarios"
ON public.scenario_results
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    WHERE s.id = scenario_results.scenario_id
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete results for their scenarios"
ON public.scenario_results
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM scenarios s
    WHERE s.id = scenario_results.scenario_id
    AND s.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_scenario_results_updated_at
BEFORE UPDATE ON public.scenario_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20251104110331
-- Add unique constraint for project names per user
ALTER TABLE public.projects
ADD CONSTRAINT unique_project_name_per_user UNIQUE (user_id, name);

-- Add unique constraint for scenario names per project
ALTER TABLE public.scenarios
ADD CONSTRAINT unique_scenario_name_per_project UNIQUE (project_id, name);

-- Migration: 20251104170005
-- Add UPDATE policies for scenario_inputs and scenario_outputs
-- This allows users to update their existing scenario data

-- Policy for scenario_inputs UPDATE
CREATE POLICY "Users can update inputs for their scenarios"
ON public.scenario_inputs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_inputs.scenario_id
    AND p.user_id = auth.uid()
  )
);

-- Policy for scenario_outputs UPDATE
CREATE POLICY "Users can update outputs for their scenarios"
ON public.scenario_outputs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_outputs.scenario_id
    AND p.user_id = auth.uid()
  )
);


-- Migration: 20251106053631
-- Create project_collaborators table for sharing projects
CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Policies for project_collaborators
CREATE POLICY "Project owners can manage collaborators"
  ON public.project_collaborators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view collaborators for their shared projects"
  ON public.project_collaborators
  FOR SELECT
  USING (user_id = auth.uid());

-- Update projects policies to include shared access
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own or shared projects"
  ON public.projects
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators
      WHERE project_collaborators.project_id = projects.id
      AND project_collaborators.user_id = auth.uid()
    )
  );

-- Update scenarios policies to respect project sharing
DROP POLICY IF EXISTS "Users can view their own scenarios" ON public.scenarios;
CREATE POLICY "Users can view scenarios for accessible projects"
  ON public.scenarios
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators pc
      WHERE pc.project_id = scenarios.project_id
      AND pc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own scenarios" ON public.scenarios;
CREATE POLICY "Users can create scenarios for accessible projects"
  ON public.scenarios
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = scenarios.project_id
        AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_collaborators pc
        WHERE pc.project_id = scenarios.project_id
        AND pc.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own scenarios" ON public.scenarios;
CREATE POLICY "Users can update scenarios for accessible projects"
  ON public.scenarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = scenarios.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_collaborators pc
          WHERE pc.project_id = p.id
          AND pc.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own scenarios" ON public.scenarios;
CREATE POLICY "Users can delete scenarios for accessible projects"
  ON public.scenarios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = scenarios.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_collaborators pc
          WHERE pc.project_id = p.id
          AND pc.user_id = auth.uid()
        )
      )
    )
  );

-- Migration: 20251106054031
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their own or shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create scenarios for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Users can update scenarios for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Users can delete scenarios for accessible projects" ON public.scenarios;

-- Create a security definer function to check project access
CREATE OR REPLACE FUNCTION public.user_has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id
    AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = _project_id
    AND user_id = _user_id
  )
$$;

-- Recreate the projects SELECT policy using the function
CREATE POLICY "Users can view their own or shared projects"
  ON public.projects
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR public.user_has_project_access(auth.uid(), id)
  );

-- Update scenarios policies to use the function
CREATE POLICY "Users can create scenarios for accessible projects"
  ON public.scenarios
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can update scenarios for accessible projects"
  ON public.scenarios
  FOR UPDATE
  USING (
    public.user_has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can delete scenarios for accessible projects"
  ON public.scenarios
  FOR DELETE
  USING (
    public.user_has_project_access(auth.uid(), project_id)
  );

-- Migration: 20251106054105
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their own or shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create scenarios for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Users can update scenarios for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Users can delete scenarios for accessible projects" ON public.scenarios;

-- Create a security definer function to check project access
CREATE OR REPLACE FUNCTION public.user_has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id
    AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = _project_id
    AND user_id = _user_id
  )
$$;

-- Recreate the projects SELECT policy using the function
CREATE POLICY "Users can view their own or shared projects"
  ON public.projects
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR public.user_has_project_access(auth.uid(), id)
  );

-- Update scenarios policies to use the function
CREATE POLICY "Users can create scenarios for accessible projects"
  ON public.scenarios
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can update scenarios for accessible projects"
  ON public.scenarios
  FOR UPDATE
  USING (
    public.user_has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can delete scenarios for accessible projects"
  ON public.scenarios
  FOR DELETE
  USING (
    public.user_has_project_access(auth.uid(), project_id)
  );

-- Migration: 20251106055953
-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20251106060017
-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20251106060046
-- Backfill profiles for existing users who don't have one
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email)
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Migration: 20251106060435
-- Create a secure function to look up user ID by email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE LOWER(email) = LOWER(_email)
  LIMIT 1
$$;

-- Migration: 20251107060723
-- Create table for storing data support chat messages
CREATE TABLE IF NOT EXISTS public.data_support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_support_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for data support messages
CREATE POLICY "Users can view their own data support messages"
ON public.data_support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios
    WHERE scenarios.id = data_support_messages.scenario_id
    AND scenarios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own data support messages"
ON public.data_support_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios
    WHERE scenarios.id = data_support_messages.scenario_id
    AND scenarios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own data support messages"
ON public.data_support_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios
    WHERE scenarios.id = data_support_messages.scenario_id
    AND scenarios.user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_data_support_messages_scenario_id ON public.data_support_messages(scenario_id);
CREATE INDEX idx_data_support_messages_created_at ON public.data_support_messages(created_at);
