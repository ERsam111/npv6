import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import GFA from "./pages/GFA";
import DemandForecasting from "./pages/DemandForecasting";
import Scenario2 from "./pages/Scenario2";
import Scenario3 from "./pages/Scenario3";
import ProjectManagement from "./pages/ProjectManagement";
import NetworkAnalysis from "./pages/NetworkAnalysis";
import NotFound from "./pages/NotFound";
import InventoryOptimizationV2 from "./pages/InventoryOptimizationV2";
import { AuthProvider } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { ScenarioProvider } from "./contexts/ScenarioContext";
import { DashboardLayout } from "./components/DashboardLayout";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <ScenarioProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/gfa" element={<GFA />} />
              <Route path="/demand-forecasting" element={<DemandForecasting />} />
              <Route path="/scenario2" element={<Scenario2 />} />
              <Route path="/scenario3" element={<Scenario3 />} />
              <Route path="/network" element={<NetworkAnalysis />} />
              <Route path="/inventory-optimization-v2" element={<InventoryOptimizationV2 />} />
              <Route path="/project-management" element={<ProjectManagement />} />
            </Route>
            <Route path="*" element={<NotFound />} />
            </Routes>
          </ScenarioProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
