import React from "react";
import InvIndex from "../../Simlation based invenrotu optimzation/inventoryoptimizationtool-main/src/pages/Index";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from "react";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useProjects, Project } from "@/contexts/ProjectContext";
import { useScenarios } from "@/contexts/ScenarioContext";

export default function InventoryOptimizationV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects } = useProjects();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { currentScenario, setCurrentScenario, loadScenariosByProject, updateScenario, saveScenarioOutput, saveScenarioInput, loadScenarioOutput } = useScenarios();

  // Load project from route state if available
  useEffect(() => {
    const projectId = location.state?.projectId;
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentProject(project);
        loadScenariosByProject(project.id, 'inventory'); // Filter by inventory module
      }
    }
  }, [location.state, projects]);

  const handleProjectChange = (project: Project) => {
    setCurrentProject(project);
    setCurrentScenario(null); // Clear scenario when project changes
    loadScenariosByProject(project.id, 'inventory'); // Filter by inventory module
  };

  const handleScenarioChange = (scenario: any) => {
    setCurrentScenario(scenario);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Project & Scenario Navigation */}
      <div className="border-b border-inventory/20 bg-gradient-to-r from-inventory-light to-transparent">
        <ProjectScenarioNav
          currentProjectId={currentProject?.id}
          currentScenarioId={currentScenario?.id}
          moduleType="inventory"
          moduleName="Simulation-based Inventory Optimization"
          onProjectChange={handleProjectChange}
          onScenarioChange={handleScenarioChange}
        />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <InvIndex
          currentScenario={currentScenario}
          updateScenario={updateScenario}
          saveScenarioOutput={saveScenarioOutput}
          saveScenarioInput={saveScenarioInput}
          loadScenarioOutput={loadScenarioOutput}
        />
      </div>
    </div>
  );
}
