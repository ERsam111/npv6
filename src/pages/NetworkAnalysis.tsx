import { useState } from "react";
import { Card } from "@/components/ui/card";
import { NetworkSidebar } from "@/components/network/NetworkSidebar";
import { NetworkTable } from "@/components/network/NetworkTable";
import { NetworkMap } from "@/components/network/NetworkMap";
import { OptimizationPanel } from "@/components/network/OptimizationPanel";
import { ResultsView } from "@/components/network/ResultsView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useProjects, Project } from "@/contexts/ProjectContext";
import { useScenarios } from "@/contexts/ScenarioContext";

export default function NetworkAnalysis() {
  const [activeTable, setActiveTable] = useState<string>("customers");
  const [activeView, setActiveView] = useState<"input" | "map" | "optimize" | "results">("input");
  const navigate = useNavigate();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { currentScenario, setCurrentScenario, loadScenariosByProject } = useScenarios();

  return (
    <NetworkProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
          <div className="max-w-[1800px] mx-auto px-6 py-2">
            <h1 className="text-lg font-semibold text-network">Network Analysis</h1>
          </div>
        </div>

        {/* Project & Scenario Navigation */}
        <ProjectScenarioNav
          currentProjectId={currentProject?.id}
          currentScenarioId={currentScenario?.id}
          moduleType="network"
          moduleName="Network Analysis"
          onProjectChange={(project) => {
            setCurrentProject(project);
            loadScenariosByProject(project.id, 'network'); // Filter by network module
          }}
          onScenarioChange={(scenario) => {
            setCurrentScenario(scenario);
          }}
        />

        <div className="max-w-[1800px] mx-auto w-full p-6 flex-1 space-y-6">

        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList>
            <TabsTrigger value="input">Input Tables</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="optimize">Optimization</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="mt-6">
            <div className="flex gap-4 h-[calc(100vh-250px)]">
              <NetworkSidebar 
                activeTable={activeTable} 
                onTableSelect={setActiveTable} 
              />
              <div className="flex-1 overflow-hidden">
                <NetworkTable tableType={activeTable} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="map" className="mt-6">
            <NetworkMap />
          </TabsContent>

          <TabsContent value="optimize" className="mt-6">
            <OptimizationPanel />
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <ResultsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </NetworkProvider>
  );
}
