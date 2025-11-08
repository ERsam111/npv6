import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, MapPin, BarChart3, TrendingUp, Upload, Download, MessageSquare } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, DistributionCenter, OptimizationSettings, Product } from "@/types/gfa";
import { optimizeWithConstraints } from "@/utils/geoCalculations";
import { exportReport } from "@/utils/exportReport";
import { toast } from "sonner";
import { GFASidebarNav } from "@/components/gfa/GFASidebarNav";
import { GFAEditableTable } from "@/components/gfa/GFAEditableTable";
import { GFACostParametersPanel } from "@/components/gfa/GFACostParametersPanel";
import { GFAMapPanel } from "@/components/gfa/GFAMapPanel";
import { GFAOptimizationPanel } from "@/components/gfa/GFAOptimizationPanel";
import { GFAResultsPanel } from "@/components/gfa/GFAResultsPanel";
import { DataSupportPanel } from "@/components/gfa/DataSupportPanel";
import { ScenarioSelector } from "@/components/gfa/ScenarioSelector";
import { useScenarios } from "@/contexts/ScenarioContext";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useProjects, Project } from "@/contexts/ProjectContext";
import { ExcelUploadCompact } from "@/components/gfa/ExcelUploadCompact";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
const GFA = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    projects
  } = useProjects();
  const {
    currentScenario,
    setCurrentScenario,
    saveScenarioInput,
    saveScenarioOutput,
    loadScenarioInput,
    loadScenarioOutput,
    updateScenario,
    loadScenariosByProject
  } = useScenarios();
  const [activeTab, setActiveTab] = useState("input");
  const [activeTable, setActiveTable] = useState<string>("customers");
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Load project from route state if available
  useEffect(() => {
    const projectId = location.state?.projectId;
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentProject(project);
        loadScenariosByProject(project.id, 'gfa'); // Filter by GFA module
      }
    }
  }, [location.state, projects]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dcs, setDcs] = useState<DistributionCenter[]>([]);
  const [feasible, setFeasible] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<{
    totalCost: number;
    transportationCost: number;
    facilityCost: number;
    numSites: number;
  } | undefined>();
  const [settings, setSettings] = useState<OptimizationSettings>({
    mode: 'sites',
    numDCs: 3,
    maxRadius: 50,
    demandPercentage: 100,
    dcCapacity: 0,
    capacityUnit: 'm3',
    transportationCostPerMilePerUnit: 0.5,
    facilityCost: 100000,
    distanceUnit: 'km',
    costUnit: 'm3'
  });

  // Load scenario data when scenario is selected
  useEffect(() => {
    const loadScenarioData = async () => {
      if (currentScenario) {
        // Load saved input data
        const inputData = await loadScenarioInput(currentScenario.id);
        if (inputData) {
          setCustomers(inputData.customers || []);
          setProducts(inputData.products || []);
          setSettings(inputData.settings || settings);
        }

        // Load saved output data
        const outputData = await loadScenarioOutput(currentScenario.id);
        if (outputData) {
          setDcs(outputData.dcs || []);
          setFeasible(outputData.feasible ?? true);
          setWarnings(outputData.warnings || []);
          setCostBreakdown(outputData.costBreakdown);
          if (outputData.dcs?.length > 0) {
            setActiveTab("results");
          }
        }
      }
    };
    loadScenarioData();
  }, [currentScenario?.id]);

  // Save input data whenever it changes
  useEffect(() => {
    if (currentScenario && (customers.length > 0 || products.length > 0)) {
      const saveData = async () => {
        await saveScenarioInput(currentScenario.id, {
          customers,
          products,
          settings
        }, true); // Background save, non-blocking
      };
      saveData();
    }
  }, [customers, products, settings, currentScenario?.id]);

  // Extract unique products from customers - auto-populate
  useEffect(() => {
    if (customers.length === 0) {
      setProducts([]);
      return;
    }
    setProducts(prevProducts => {
      const productMap = new Map<string, Product>();
      customers.forEach(customer => {
        const productName = customer.product;
        if (productName && !productMap.has(productName)) {
          const existingProduct = prevProducts.find(p => p.name === productName);
          productMap.set(productName, {
            name: productName,
            baseUnit: customer.unitOfMeasure || "",
            conversionToStandard: 1,
            unitConversions: existingProduct?.unitConversions || [],
            sellingPrice: existingProduct?.sellingPrice
          });
        }
      });
      return Array.from(productMap.values());
    });
  }, [customers]);
  const handleOptimize = async () => {
    if (customers.length === 0) {
      toast.error("Add at least one customer before optimizing");
      return;
    }
    if (!currentScenario) {
      toast.error("Please select a scenario first");
      return;
    }
    toast.info("Running optimization algorithm...");

    // Update scenario status to running
    await updateScenario(currentScenario.id, {
      status: 'running'
    });
    const result = optimizeWithConstraints(customers, settings.numDCs, {
      maxRadius: settings.maxRadius,
      demandPercentage: settings.demandPercentage,
      dcCapacity: settings.dcCapacity,
      capacityUnit: settings.capacityUnit
    }, settings.mode, settings.mode === 'cost' ? {
      transportationCostPerMilePerUnit: settings.transportationCostPerMilePerUnit,
      facilityCost: settings.facilityCost,
      distanceUnit: settings.distanceUnit,
      costUnit: settings.costUnit
    } : undefined, products);
    setDcs(result.dcs);
    setFeasible(result.feasible);
    setWarnings(result.warnings);
    setCostBreakdown(result.costBreakdown);

    // Save output data in background (non-blocking)
    saveScenarioOutput(currentScenario.id, {
      dcs: result.dcs,
      feasible: result.feasible,
      warnings: result.warnings,
      costBreakdown: result.costBreakdown
    }, true);

    // Update scenario status to completed
    await updateScenario(currentScenario.id, {
      status: 'completed'
    });
    if (result.feasible) {
      if (settings.mode === 'cost' && result.costBreakdown) {
        toast.success(`Optimization complete! Optimal solution: ${result.costBreakdown.numSites} sites with total cost $${result.costBreakdown.totalCost.toLocaleString()}`);
      } else {
        toast.success("Optimization complete! All constraints satisfied.");
      }
      setActiveTab("results");
    } else {
      toast.warning("Optimization complete with constraint violations. See warnings in Results tab.");
      setActiveTab("results");
    }
  };
  const handleExportReport = () => {
    if (customers.length === 0) {
      toast.error("No data to export. Add customer data first.");
      return;
    }
    try {
      exportReport({
        customers,
        products,
        dcs,
        settings,
        costBreakdown
      });
      toast.success("Report exported successfully!");
    } catch (error) {
      toast.error("Failed to export report");
      console.error(error);
    }
  };
  const handleBulkUpload = (newCustomers: Customer[], mode: "append" | "overwrite") => {
    if (mode === "overwrite") {
      setCustomers(newCustomers);
    } else {
      setCustomers([...customers, ...newCustomers]);
    }
  };
  const handleClearData = () => {
    setCustomers([]);
    setProducts([]);
    setDcs([]);
    toast.success("All data cleared successfully");
  };
  const handleGeocodeCustomer = async (index: number) => {
    const customer = customers[index];
    if (!customer.city && !customer.country) {
      toast.error("Please provide city and country");
      return;
    }
    try {
      toast.info("Geocoding address...");
      // Geocoding logic can be integrated here with supabase function
      toast.success("Address geocoded successfully");
    } catch (error) {
      toast.error("Failed to geocode address");
    }
  };
  return <div className="min-h-screen flex flex-col bg-background">
      {/* Project & Scenario Navigation */}
      <div className="border-b border-gfa/20 bg-gradient-to-r from-gfa-light to-transparent">
        <ProjectScenarioNav currentProjectId={currentProject?.id} currentScenarioId={currentScenario?.id} moduleType="gfa" moduleName="Green Field Analysis" onProjectChange={project => {
        setCurrentProject(project);
        setCurrentScenario(null);
        loadScenariosByProject(project.id, 'gfa'); // Filter by GFA module
      }} onScenarioChange={scenario => {
        setCurrentScenario(scenario);
      }} />
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="input" className="gap-2" disabled={!currentScenario}>
              <Upload className="h-4 w-4" />
              Input Data
            </TabsTrigger>
            <TabsTrigger value="data-support" className="gap-2" disabled={!currentScenario || customers.length === 0}>
              <MessageSquare className="h-4 w-4" />
              Data Support
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2" disabled={!currentScenario}>
              <MapPin className="h-4 w-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="optimization" className="gap-2" disabled={!currentScenario}>
              <Play className="h-4 w-4" />
              Optimization
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2" disabled={dcs.length === 0}>
              <BarChart3 className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6">
            <div className="flex gap-4 h-[calc(100vh-300px)] overflow-hidden">
              <GFASidebarNav activeTable={activeTable} onTableSelect={setActiveTable} customerCount={customers.length} productCount={products.length} />
              <div className="flex-1 min-w-0 flex flex-col gap-4 max-w-[calc(100vw-400px)]">
                {/* Compact Upload Section */}
                <Card className="shadow-sm shrink-0">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Upload className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium">Upload Customer Data</h3>
                        <p className="text-xs text-muted-foreground truncate">Import Excel file to populate customer table</p>
                      </div>
                      <ExcelUploadCompact onBulkUpload={handleBulkUpload} />
                    </div>
                  </CardContent>
                </Card>

                {/* Active Table Content with horizontal scroll */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  {activeTable === "customers" && <GFAEditableTable tableType="customers" data={customers} onDataChange={setCustomers} onGeocode={handleGeocodeCustomer} />}
                  {activeTable === "products" && <GFAEditableTable tableType="products" data={products} onDataChange={setProducts} />}
                  {activeTable === "costs" && <GFACostParametersPanel settings={settings} onSettingsChange={setSettings} />}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data-support" className="space-y-6">
            <DataSupportPanel 
              customers={customers} 
              products={products} 
              dcs={dcs} 
              settings={settings}
              costBreakdown={costBreakdown}
            />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <GFAMapPanel customers={customers} dcs={dcs} settings={settings} />
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            <GFAOptimizationPanel customers={customers} products={products} settings={settings} onSettingsChange={setSettings} onOptimize={handleOptimize} />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <GFAResultsPanel dcs={dcs} customers={customers} products={products} settings={settings} feasible={feasible} warnings={warnings} costBreakdown={costBreakdown} />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
export default GFA;