import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Play, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HistoricalDataUpload } from "@/components/forecasting/HistoricalDataUpload";
import { ModelSelector } from "@/components/forecasting/ModelSelector";
import { DataAnalytics } from "@/components/forecasting/DataAnalytics";
import { ForecastResults } from "@/components/forecasting/ForecastResults";
import { OutlierDetection } from "@/components/forecasting/OutlierDetection";
import { TimeFilterPanel } from "@/components/forecasting/TimeFilterPanel";
import { HistoricalDataPoint, ForecastResult } from "@/types/forecasting";
import { generateForecasts } from "@/utils/forecastingModels";
import { useToast } from "@/hooks/use-toast";
import { saveScenario1Results, getScenario1Results } from "@/utils/scenarioStorage";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useProjects, Project } from "@/contexts/ProjectContext";
import { useScenarios } from "@/contexts/ScenarioContext";

const DemandForecasting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { currentScenario, setCurrentScenario, loadScenariosByProject } = useScenarios();
  const [rawHistoricalData, setRawHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(["moving_average", "exponential_smoothing"]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [forecastPeriods, setForecastPeriods] = useState<number>(6);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [forecastResults, setForecastResults] = useState<ForecastResult[]>([]);
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [modelParams, setModelParams] = useState<Record<string, any>>({
    moving_average: { window: 3 },
    exponential_smoothing: { alpha: 0.3 },
    weighted_moving_average: { window: 3 },
    seasonal_naive: { seasonLength: 12 },
    holt_winters: { alpha: 0.3, beta: 0.1, gamma: 0.1, seasonLength: 12 },
    random_forest: { nTrees: 10, windowSize: 5 },
    arima: { p: 2, d: 1, q: 2 }
  });
  
  // Collapsible section states
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [isModelOpen, setIsModelOpen] = useState(true);
  
  // Load saved data on mount
  useEffect(() => {
    const saved = getScenario1Results();
    if (saved) {
      // Restore forecast results
      setForecastResults(saved.results);
      setSelectedProduct(saved.product);
      if (saved.granularity === "daily" || saved.granularity === "weekly" || saved.granularity === "monthly") {
        setGranularity(saved.granularity);
      }
    }
  }, []);

  // Update default parameters when granularity changes
  const handleGranularityChange = (newGranularity: string) => {
    const validGranularity = newGranularity as "daily" | "weekly" | "monthly";
    setGranularity(validGranularity);
    
    // Adjust default parameters based on granularity
    const defaultParams = {
      daily: {
        moving_average: { window: 7 },
        exponential_smoothing: { alpha: 0.3 },
        weighted_moving_average: { window: 7 },
        seasonal_naive: { seasonLength: 7 },
        holt_winters: { alpha: 0.3, beta: 0.1, gamma: 0.1, seasonLength: 7 },
        random_forest: { nTrees: 10, windowSize: 7 },
        arima: { p: 2, d: 1, q: 2 }
      },
      weekly: {
        moving_average: { window: 4 },
        exponential_smoothing: { alpha: 0.3 },
        weighted_moving_average: { window: 4 },
        seasonal_naive: { seasonLength: 4 },
        holt_winters: { alpha: 0.3, beta: 0.1, gamma: 0.1, seasonLength: 4 },
        random_forest: { nTrees: 10, windowSize: 4 },
        arima: { p: 2, d: 1, q: 2 }
      },
      monthly: {
        moving_average: { window: 3 },
        exponential_smoothing: { alpha: 0.3 },
        weighted_moving_average: { window: 3 },
        seasonal_naive: { seasonLength: 12 },
        holt_winters: { alpha: 0.3, beta: 0.1, gamma: 0.1, seasonLength: 12 },
        random_forest: { nTrees: 10, windowSize: 5 },
        arima: { p: 2, d: 1, q: 2 }
      }
    };
    
    setModelParams(defaultParams[validGranularity]);
    
    // Adjust forecast periods
    if (validGranularity === "daily") {
      setForecastPeriods(30);
    } else if (validGranularity === "weekly") {
      setForecastPeriods(12);
    } else {
      setForecastPeriods(6);
    }
  };

  const handleDataUpload = (data: HistoricalDataPoint[]) => {
    setRawHistoricalData(data);
    setHistoricalData(data);
    setForecastResults([]);
    setFilterStartDate(null);
    setFilterEndDate(null);
    
    // Auto-select first product if none selected
    if (!selectedProduct && data.length > 0) {
      const firstProduct = data[0].product;
      setSelectedProduct(firstProduct);
    }
  };

  const handleRemoveOutliers = (outlierIndices: number[]) => {
    const filteredData = historicalData.filter((_, idx) => !outlierIndices.includes(idx));
    setHistoricalData(filteredData);
    setForecastResults([]);
    
    toast({
      title: "Outliers removed",
      description: `Removed ${outlierIndices.length} outlier data points`
    });
  };

  const handleTimeFilter = (startDate: Date | null, endDate: Date | null) => {
    setFilterStartDate(startDate);
    setFilterEndDate(endDate);
    
    let filtered = [...rawHistoricalData];
    
    if (startDate) {
      filtered = filtered.filter(d => d.date >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(d => d.date <= endDate);
    }
    
    setHistoricalData(filtered);
    setForecastResults([]);
    
    toast({
      title: "Filter applied",
      description: `Showing ${filtered.length} data points`
    });
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleParamChange = (modelId: string, paramName: string, value: number) => {
    setModelParams(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [paramName]: value
      }
    }));
  };

  const runForecasting = () => {
    if (historicalData.length === 0) {
      toast({
        title: "No data available",
        description: "Please upload historical data first",
        variant: "destructive"
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "No models selected",
        description: "Please select at least one forecasting model",
        variant: "destructive"
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        title: "No product selected",
        description: "Please select a product to forecast",
        variant: "destructive"
      });
      return;
    }

    // Filter data by product and customer
    let filteredData = historicalData.filter(d => d.product === selectedProduct);
    
    if (selectedCustomer !== "all") {
      filteredData = filteredData.filter(d => d.customer === selectedCustomer);
    }

    if (filteredData.length < 3) {
      toast({
        title: "Insufficient data",
        description: "Need at least 3 data points for forecasting",
        variant: "destructive"
      });
      return;
    }

    // Generate forecasts
    const results = generateForecasts(filteredData, forecastPeriods, selectedModels, modelParams, granularity);
    setForecastResults(results);

    // Save results for Scenario 2
    saveScenario1Results(results, selectedProduct, granularity);

    toast({
      title: "Forecast generated",
      description: `Generated forecasts using ${selectedModels.length} model(s). Results saved for Scenario 2.`
    });
  };

  // Get unique products and customers for filters
  const uniqueProducts = Array.from(new Set(historicalData.map(d => d.product)));
  const uniqueCustomers = Array.from(new Set(historicalData.map(d => d.customer)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-forecasting/5 to-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-forecasting/10 to-forecasting/5 backdrop-blur border-b border-forecasting/20">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-forecasting">Demand Forecasting</h1>
          <Button
            onClick={() => navigate("/scenario2")}
            size="sm"
            className="gap-2"
            style={{ background: 'var(--gradient-forecasting)' }}
          >
            Next: Scenario 2
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </div>

      {/* Project & Scenario Navigation */}
      <div className="border-b border-forecasting/20 bg-gradient-to-r from-forecasting-light to-transparent">
        <ProjectScenarioNav
          currentProjectId={currentProject?.id}
          currentScenarioId={currentScenario?.id}
          moduleType="forecasting"
          moduleName="Demand Forecasting"
          onProjectChange={(project) => {
            setCurrentProject(project);
            loadScenariosByProject(project.id, 'forecasting'); // Filter by forecasting module
          }}
          onScenarioChange={(scenario) => {
            setCurrentScenario(scenario);
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 flex-1">

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            <Collapsible open={true} defaultOpen>
              <Card className="shadow-lg">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle>Data Upload</CardTitle>
                      <ChevronDown className="h-4 w-4 transition-transform" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <HistoricalDataUpload onDataUpload={handleDataUpload} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
            
            {historicalData.length > 0 && (
              <>
                <Collapsible defaultOpen>
                  <Card className="shadow-lg">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle>Time Filter</CardTitle>
                          <ChevronDown className="h-4 w-4 transition-transform" />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <TimeFilterPanel
                          startDate={filterStartDate}
                          endDate={filterEndDate}
                          onFilterChange={handleTimeFilter}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <Collapsible defaultOpen>
                  <Card className="shadow-lg">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle>Outlier Detection</CardTitle>
                          <ChevronDown className="h-4 w-4 transition-transforms" />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <OutlierDetection
                          data={historicalData}
                          onRemoveOutliers={handleRemoveOutliers}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                  <Card className="shadow-lg">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Forecast Configuration</CardTitle>
                            <CardDescription>
                              Select product and forecast parameters (Sum aggregation)
                            </CardDescription>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Product</Label>
                          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {uniqueProducts.map(product => (
                                <SelectItem key={product} value={product}>
                                  {product}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Customer (Optional)</Label>
                          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Customers</SelectItem>
                              {uniqueCustomers.map(customer => (
                                <SelectItem key={customer} value={customer}>
                                  {customer}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Forecast Granularity</Label>
                          <Select value={granularity} onValueChange={handleGranularityChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Forecast Horizon ({granularity === "daily" ? "Days" : granularity === "weekly" ? "Weeks" : "Months"})
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max={granularity === "daily" ? 365 : granularity === "weekly" ? 52 : 24}
                            value={forecastPeriods}
                            onChange={(e) => setForecastPeriods(Number(e.target.value))}
                          />
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <Collapsible open={isModelOpen} onOpenChange={setIsModelOpen}>
                  <Card className="shadow-lg">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle>Model Selection</CardTitle>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isModelOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <ModelSelector
                          selectedModels={selectedModels}
                          onModelToggle={handleModelToggle}
                          modelParams={modelParams}
                          onParamChange={handleParamChange}
                          granularity={granularity}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <Button
                  onClick={runForecasting}
                  className="w-full"
                  size="lg"
                  disabled={selectedModels.length === 0 || !selectedProduct}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Generate Forecast
                </Button>
              </>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {historicalData.length > 0 && (
              <DataAnalytics data={historicalData} />
            )}

            {forecastResults.length > 0 && (
              <ForecastResults
                results={forecastResults}
                historicalData={historicalData.filter(d => 
                  d.product === selectedProduct &&
                  (selectedCustomer === "all" || d.customer === selectedCustomer)
                )}
                product={selectedProduct}
                granularity={granularity}
              />
            )}

            {historicalData.length === 0 && (
              <Card className="shadow-lg">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Upload historical data to begin forecasting
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandForecasting;
