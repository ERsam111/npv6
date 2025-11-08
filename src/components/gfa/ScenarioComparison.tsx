import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Trash2, GitCompare, Filter } from "lucide-react";
import { Customer, DistributionCenter, OptimizationSettings } from "@/types/gfa";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SavedScenario {
  id: string;
  name: string;
  timestamp: string;
  numSites: number;
  totalCost: number;
  transportationCost: number;
  facilityCost: number;
  avgDistance: number;
  demandCoverage: number;
  customers: number;
  costPerUnit: number;
  costPerCustomer: number;
  settings: OptimizationSettings;
}

interface KPIFilter {
  numSites: boolean;
  totalCost: boolean;
  transportationCost: boolean;
  facilityCost: boolean;
  avgDistance: boolean;
  demandCoverage: boolean;
  costPerUnit: boolean;
  costPerCustomer: boolean;
}

interface ScenarioComparisonProps {
  dcs: DistributionCenter[];
  customers: Customer[];
  settings: OptimizationSettings;
  costBreakdown?: { totalCost: number; transportationCost: number; facilityCost: number; numSites: number };
  projectId?: string;
}

export function ScenarioComparison({
  dcs,
  customers,
  settings,
  costBreakdown,
  projectId: propProjectId,
}: ScenarioComparisonProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [availableScenarios, setAvailableScenarios] = useState<Array<{id: string; name: string}>>([]);
  const [coverageRadius, setCoverageRadius] = useState<number>(10);
  const { toast } = useToast();
  const { projectId: urlProjectId } = useParams();
  const projectId = propProjectId || urlProjectId;

  const [kpiFilters, setKpiFilters] = useState<KPIFilter>({
    numSites: true,
    totalCost: true,
    transportationCost: true,
    facilityCost: true,
    avgDistance: true,
    demandCoverage: true,
    costPerUnit: true,
    costPerCustomer: true,
  });

  const [aggregationType, setAggregationType] = useState<'none' | 'min' | 'max' | 'mean' | 'sum'>('none');

  // Load available scenarios and results
  useEffect(() => {
    loadAvailableScenarios();
    loadScenarios();
  }, [projectId]);

  const loadAvailableScenarios = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('scenarios')
        .select('id, name, status')
        .eq('project_id', projectId)
        .eq('module_type', 'gfa')
        .eq('status', 'completed')
        .order('created_at', { ascending: false});

      if (error) throw error;

      setAvailableScenarios(data?.map((s: any) => ({ id: s.id, name: s.name })) || []);
    } catch (error) {
      console.error('Error loading available scenarios:', error);
    }
  };

  const loadScenarios = async () => {
    if (!projectId || selectedScenarios.size === 0) {
      setScenarios([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const scenarioIds = Array.from(selectedScenarios);
      
      // Load scenario outputs for selected scenarios
      const { data: outputsData, error: outputError } = await (supabase as any)
        .from('scenario_outputs')
        .select('scenario_id, output_data')
        .in('scenario_id', scenarioIds);

      if (outputError) throw outputError;

      // Load scenario inputs to get customers and settings
      const { data: inputsData, error: inputError } = await (supabase as any)
        .from('scenario_inputs')
        .select('scenario_id, input_data')
        .in('scenario_id', scenarioIds);

      if (inputError) throw inputError;

      // Get scenario metadata
      const { data: scenariosData } = await (supabase as any)
        .from('scenarios')
        .select('id, name, created_at')
        .in('id', scenarioIds);

      const scenarioMap = new Map(scenariosData?.map((s: any) => [s.id, s]) || []);
      const inputMap = new Map(inputsData?.map((i: any) => [i.scenario_id, i.input_data]) || []);
      const outputMap = new Map(outputsData?.map((o: any) => [o.scenario_id, o.output_data]) || []);

      const loadedScenarios: SavedScenario[] = scenarioIds.map((id) => {
        const scenario = scenarioMap.get(id);
        const inputData = inputMap.get(id) as any;
        const outputData = outputMap.get(id) as any;
        
        if (!scenario || !inputData || !outputData) return null;
        
        // Get data from input and output
        const customersData = inputData.customers || [];
        const dcs = outputData.dcs || [];
        const scenarioSettings = inputData.settings || settings;
        
        // Calculate total demand
        const totalDemand = customersData.reduce((sum: number, c: any) => 
          sum + (c.demand * (c.conversionFactor || 1)), 0
        );
        
        // Calculate transportation cost and average distance
        let transportationCost = 0;
        let totalDistance = 0;
        let customerCount = 0;
        let coveredCustomers = 0;
        
        dcs.forEach((dc: any) => {
          if (dc.assignedCustomers && dc.assignedCustomers.length > 0) {
            dc.assignedCustomers.forEach((customer: any) => {
              const distance = getDistance(
                customer.latitude,
                customer.longitude,
                dc.latitude,
                dc.longitude
              );
              
              totalDistance += distance;
              customerCount++;
              
              // Calculate transport cost: distance * demand * cost per unit
              const customerDemand = customer.demand * (customer.conversionFactor || 1);
              transportationCost += distance * customerDemand * (scenarioSettings.transportationCostPerMilePerUnit || 0);
              
              // Check coverage based on radius
              if (distance <= coverageRadius) {
                coveredCustomers++;
              }
            });
          }
        });
        
        // Calculate facility cost
        const facilityCost = dcs.length * (scenarioSettings.facilityCost || 0);
        
        // Total cost = transportation cost + facility cost
        const totalCost = transportationCost + facilityCost;
        
        // Calculate average distance
        const avgDistance = customerCount > 0 ? totalDistance / customerCount : 0;
        
        // Calculate demand coverage based on custom radius
        const demandCoverage = customersData.length > 0 ? (coveredCustomers / customersData.length) * 100 : 0;

        return {
          id,
          name: (scenario as any)?.name || 'Unnamed Scenario',
          timestamp: (scenario as any)?.created_at || new Date().toISOString(),
          numSites: dcs.length || 0,
          totalCost,
          transportationCost,
          facilityCost,
          avgDistance,
          demandCoverage,
          customers: customersData.length,
          costPerUnit: totalDemand > 0 ? totalCost / totalDemand : 0,
          costPerCustomer: customersData.length > 0 ? totalCost / customersData.length : 0,
          settings: scenarioSettings,
        };
      }).filter(Boolean) as SavedScenario[];

      setScenarios(loadedScenarios);
    } catch (error) {
      console.error('Error loading scenarios:', error);
      toast({
        title: "Error",
        description: "Failed to load scenario data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const calculateMetrics = () => {
    if (customers.length === 0 || dcs.length === 0) {
      return { avgDistance: 0, demandCoverage: 0, totalCost: 0, transportationCost: 0, facilityCost: 0, costPerUnit: 0, costPerCustomer: 0 };
    }

    let totalDistance = 0;
    let coveredCustomers = 0; // Count customers within radius, not demand
    let transportationCost = 0;
    let customerCount = 0;

    const totalDemand = customers.reduce((sum, c) => sum + c.demand * c.conversionFactor, 0);

    dcs.forEach((dc) => {
      if (dc.assignedCustomers && dc.assignedCustomers.length > 0) {
        dc.assignedCustomers.forEach((customer) => {
          const distance = getDistance(
            customer.latitude,
            customer.longitude,
            dc.latitude,
            dc.longitude
          );
          
          totalDistance += distance;
          customerCount++;
          
          // Check coverage based on user-selected radius (count customers, not demand)
          if (distance <= coverageRadius) {
            coveredCustomers++;
          }
          
          // Calculate transportation cost
          const customerDemand = customer.demand * customer.conversionFactor;
          transportationCost += distance * customerDemand * settings.transportationCostPerMilePerUnit;
        });
      }
    });

    const facilityCost = dcs.length * settings.facilityCost;
    const totalCost = transportationCost + facilityCost;

    return {
      avgDistance: customerCount > 0 ? totalDistance / customerCount : 0,
      demandCoverage: customers.length > 0 ? (coveredCustomers / customers.length) * 100 : 0,
      totalCost,
      transportationCost,
      facilityCost,
      costPerUnit: totalDemand > 0 ? totalCost / totalDemand : 0,
      costPerCustomer: customers.length > 0 ? totalCost / customers.length : 0,
    };
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return settings.distanceUnit === 'mile' ? distance * 0.621371 : distance;
  };

  // Load scenarios when selection changes or coverage radius changes
  useEffect(() => {
    loadScenarios();
  }, [selectedScenarios, coverageRadius]);

  const handleScenarioSelect = (scenarioIds: string[]) => {
    setSelectedScenarios(new Set(scenarioIds));
  };

  const toggleKPIFilter = (kpi: keyof KPIFilter) => {
    setKpiFilters((prev) => ({ ...prev, [kpi]: !prev[kpi] }));
  };

  const getDifference = (current: number, previous: number) => {
    const diff = current - previous;
    const percentage = previous !== 0 ? (diff / previous) * 100 : 0;
    return { diff, percentage };
  };

  const currentMetrics = calculateMetrics();
  const totalDemand = customers.reduce((sum, c) => sum + c.demand * c.conversionFactor, 0);
  const currentData = costBreakdown || currentMetrics.totalCost > 0
    ? {
        numSites: costBreakdown?.numSites || dcs.length,
        totalCost: costBreakdown?.totalCost || currentMetrics.totalCost,
        transportationCost: costBreakdown?.transportationCost || currentMetrics.transportationCost,
        facilityCost: costBreakdown?.facilityCost || currentMetrics.facilityCost,
        avgDistance: currentMetrics.avgDistance,
        demandCoverage: currentMetrics.demandCoverage,
        costPerUnit: currentMetrics.costPerUnit,
        costPerCustomer: currentMetrics.costPerCustomer,
      }
    : null;

  const displayedScenarios = selectedScenarios.size > 0
    ? scenarios.filter((s) => selectedScenarios.has(s.id))
    : scenarios;

  const getAggregatedValue = (key: keyof SavedScenario, scenarios: SavedScenario[]) => {
    if (scenarios.length === 0) return 0;
    const values = scenarios.map(s => s[key] as number).filter(v => typeof v === 'number');
    
    switch (aggregationType) {
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'mean':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      default:
        return null;
    }
  };

  const formatAggregatedLabel = () => {
    switch (aggregationType) {
      case 'min': return 'Min';
      case 'max': return 'Max';
      case 'mean': return 'Mean';
      case 'sum': return 'Sum';
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Scenario Comparison
            </CardTitle>
            <CardDescription>
              {availableScenarios.length} completed scenario{availableScenarios.length !== 1 ? 's' : ''} •{' '}
              {selectedScenarios.size > 0
                ? `${selectedScenarios.size} selected for comparison`
                : 'Select scenarios to compare'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="default" className="gap-2">
                  <GitCompare className="h-4 w-4" />
                  Select Scenarios ({selectedScenarios.size})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Select Scenarios to Compare</h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {availableScenarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No completed scenarios available</p>
                    ) : (
                      availableScenarios.map((scenario) => (
                        <div key={scenario.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={scenario.id}
                            checked={selectedScenarios.has(scenario.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedScenarios);
                              if (checked) {
                                newSet.add(scenario.id);
                              } else {
                                newSet.delete(scenario.id);
                              }
                              handleScenarioSelect(Array.from(newSet));
                            }}
                          />
                          <label
                            htmlFor={scenario.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {scenario.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedScenarios.size > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setSelectedScenarios(new Set())}
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Select value={aggregationType} onValueChange={(v: any) => setAggregationType(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Aggregation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Aggregation</SelectItem>
                <SelectItem value="min">Minimum</SelectItem>
                <SelectItem value="max">Maximum</SelectItem>
                <SelectItem value="mean">Mean (Average)</SelectItem>
                <SelectItem value="sum">Sum</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter KPIs
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Select KPIs to Display</h4>
                  {Object.entries(kpiFilters).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={() => toggleKPIFilter(key as keyof KPIFilter)}
                      />
                      <label
                        htmlFor={key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-muted-foreground">Recalculating scenarios...</p>
              </div>
            </div>
            {/* Show skeleton while loading */}
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded"></div>
              ))}
            </div>
          </div>
        ) : selectedScenarios.size === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select scenarios to compare using the "Select Scenarios" button above.</p>
            {availableScenarios.length > 0 && (
              <p className="mt-2 text-sm">{availableScenarios.length} completed scenario{availableScenarios.length !== 1 ? 's' : ''} available</p>
            )}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              <p className="text-muted-foreground">Loading selected scenarios...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Metric</th>
                  {currentData && (
                    <th className="text-right p-2 font-medium bg-primary/5">Current</th>
                  )}
                  {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                    <th className="text-right p-2 font-medium bg-secondary/20">
                      {formatAggregatedLabel()}
                    </th>
                  )}
                  {displayedScenarios.map((scenario) => (
                    <th key={scenario.id} className="text-right p-2 font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="truncate max-w-[150px]">{scenario.name}</span>
                        <div className="text-xs text-muted-foreground font-normal">
                          {new Date(scenario.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpiFilters.numSites && (
                  <tr className="border-b">
                    <td className="p-2 font-medium">Number of Sites</td>
                    {currentData && (
                      <td className="text-right p-2 bg-primary/5">{currentData.numSites}</td>
                    )}
                    {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                      <td className="text-right p-2 bg-secondary/10 font-medium">
                        {getAggregatedValue('numSites', displayedScenarios)?.toFixed(0)}
                      </td>
                    )}
                    {displayedScenarios.map((scenario, idx) => {
                      const prevScenario = idx > 0 ? displayedScenarios[idx - 1] : null;
                      const diff = prevScenario ? getDifference(scenario.numSites, prevScenario.numSites) : null;
                      return (
                        <td key={scenario.id} className="text-right p-2">
                          {scenario.numSites}
                          {diff && (
                            <div className={`text-xs ${diff.diff < 0 ? 'text-green-600' : diff.diff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({diff.diff > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {kpiFilters.totalCost && (
                  <tr className="border-b">
                    <td className="p-2 font-medium">Total Cost</td>
                    {currentData && (
                      <td className="text-right p-2 bg-primary/5">
                        ${currentData.totalCost.toLocaleString()}
                      </td>
                    )}
                    {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                      <td className="text-right p-2 bg-secondary/10 font-medium">
                        ${getAggregatedValue('totalCost', displayedScenarios)?.toLocaleString()}
                      </td>
                    )}
                    {displayedScenarios.map((scenario, idx) => {
                      const prevScenario = idx > 0 ? displayedScenarios[idx - 1] : null;
                      const diff = prevScenario ? getDifference(scenario.totalCost, prevScenario.totalCost) : null;
                      return (
                        <td key={scenario.id} className="text-right p-2">
                          ${scenario.totalCost.toLocaleString()}
                          {diff && (
                            <div className={`text-xs ${diff.diff < 0 ? 'text-green-600' : diff.diff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({diff.diff > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {kpiFilters.transportationCost && (
                  <tr className="border-b">
                    <td className="p-2 font-medium">Transportation Cost</td>
                    {currentData && (
                      <td className="text-right p-2 bg-primary/5">
                        ${currentData.transportationCost.toLocaleString()}
                      </td>
                    )}
                    {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                      <td className="text-right p-2 bg-secondary/10 font-medium">
                        ${getAggregatedValue('transportationCost', displayedScenarios)?.toLocaleString()}
                      </td>
                    )}
                    {displayedScenarios.map((scenario, idx) => {
                      const prevScenario = idx > 0 ? displayedScenarios[idx - 1] : null;
                      const diff = prevScenario ? getDifference(scenario.transportationCost, prevScenario.transportationCost) : null;
                      return (
                        <td key={scenario.id} className="text-right p-2">
                          ${scenario.transportationCost.toLocaleString()}
                          {diff && (
                            <div className={`text-xs ${diff.diff < 0 ? 'text-green-600' : diff.diff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({diff.diff > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {kpiFilters.facilityCost && (
                  <tr className="border-b">
                    <td className="p-2 font-medium">Facility Cost</td>
                    {currentData && (
                      <td className="text-right p-2 bg-primary/5">
                        ${currentData.facilityCost.toLocaleString()}
                      </td>
                    )}
                    {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                      <td className="text-right p-2 bg-secondary/10 font-medium">
                        ${getAggregatedValue('facilityCost', displayedScenarios)?.toLocaleString()}
                      </td>
                    )}
                    {displayedScenarios.map((scenario, idx) => {
                      const prevScenario = idx > 0 ? displayedScenarios[idx - 1] : null;
                      const diff = prevScenario ? getDifference(scenario.facilityCost, prevScenario.facilityCost) : null;
                      return (
                        <td key={scenario.id} className="text-right p-2">
                          ${scenario.facilityCost.toLocaleString()}
                          {diff && (
                            <div className={`text-xs ${diff.diff < 0 ? 'text-green-600' : diff.diff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({diff.diff > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {kpiFilters.avgDistance && (
                  <tr className="border-b">
                    <td className="p-2 font-medium">Avg Distance</td>
                    {currentData && (
                      <td className="text-right p-2 bg-primary/5">
                        {currentData.avgDistance.toFixed(1)} {settings.distanceUnit}
                      </td>
                    )}
                    {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                      <td className="text-right p-2 bg-secondary/10 font-medium">
                        {getAggregatedValue('avgDistance', displayedScenarios)?.toFixed(1)} {settings.distanceUnit}
                      </td>
                    )}
                    {displayedScenarios.map((scenario, idx) => {
                      const prevScenario = idx > 0 ? displayedScenarios[idx - 1] : null;
                      const diff = prevScenario ? getDifference(scenario.avgDistance, prevScenario.avgDistance) : null;
                      return (
                        <td key={scenario.id} className="text-right p-2">
                          {scenario.avgDistance.toFixed(1)} {scenario.settings.distanceUnit}
                          {diff && (
                            <div className={`text-xs ${diff.diff < 0 ? 'text-green-600' : diff.diff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({diff.diff > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {kpiFilters.demandCoverage && (
                  <tr className="border-b">
                    <td className="p-2 font-medium">
                      <div className="flex items-center gap-2">
                        <span>Demand Coverage within</span>
                        <Input
                          type="number"
                          value={coverageRadius}
                          onChange={(e) => setCoverageRadius(Number(e.target.value))}
                          className="w-20 h-7 text-xs"
                          min="1"
                        />
                        <span>{settings.distanceUnit}</span>
                      </div>
                    </td>
                    {currentData && (
                      <td className="text-right p-2 bg-primary/5">
                        {currentData.demandCoverage.toFixed(1)}%
                      </td>
                    )}
                    {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                      <td className="text-right p-2 bg-secondary/10 font-medium">
                        {getAggregatedValue('demandCoverage', displayedScenarios)?.toFixed(1)}%
                      </td>
                    )}
                    {displayedScenarios.map((scenario, idx) => {
                      const prevScenario = idx > 0 ? displayedScenarios[idx - 1] : null;
                      const diff = prevScenario ? getDifference(scenario.demandCoverage, prevScenario.demandCoverage) : null;
                      return (
                        <td key={scenario.id} className="text-right p-2">
                          {scenario.demandCoverage.toFixed(1)}%
                          {diff && (
                            <div className={`text-xs ${diff.diff > 0 ? 'text-green-600' : diff.diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({diff.diff > 0 ? '+' : ''}{diff.diff.toFixed(1)}pp)
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {kpiFilters.costPerUnit && (
                  <tr className="border-b">
                    <td className="p-2 font-medium">Cost per Unit</td>
                    {currentData && (
                      <td className="text-right p-2 bg-primary/5">
                        ${currentData.costPerUnit.toFixed(2)}
                      </td>
                    )}
                    {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                      <td className="text-right p-2 bg-secondary/10 font-medium">
                        ${getAggregatedValue('costPerUnit', displayedScenarios)?.toFixed(2)}
                      </td>
                    )}
                    {displayedScenarios.map((scenario, idx) => {
                      const prevScenario = idx > 0 ? displayedScenarios[idx - 1] : null;
                      const diff = prevScenario ? getDifference(scenario.costPerUnit, prevScenario.costPerUnit) : null;
                      return (
                        <td key={scenario.id} className="text-right p-2">
                          ${scenario.costPerUnit.toFixed(2)}
                          {diff && (
                            <div className={`text-xs ${diff.diff < 0 ? 'text-green-600' : diff.diff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({diff.diff > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {kpiFilters.costPerCustomer && (
                  <tr className="border-b">
                    <td className="p-2 font-medium">Cost per Customer</td>
                    {currentData && (
                      <td className="text-right p-2 bg-primary/5">
                        ${currentData.costPerCustomer.toFixed(2)}
                      </td>
                    )}
                    {aggregationType !== 'none' && displayedScenarios.length > 0 && (
                      <td className="text-right p-2 bg-secondary/10 font-medium">
                        ${getAggregatedValue('costPerCustomer', displayedScenarios)?.toFixed(2)}
                      </td>
                    )}
                    {displayedScenarios.map((scenario, idx) => {
                      const prevScenario = idx > 0 ? displayedScenarios[idx - 1] : null;
                      const diff = prevScenario ? getDifference(scenario.costPerCustomer, prevScenario.costPerCustomer) : null;
                      return (
                        <td key={scenario.id} className="text-right p-2">
                          ${scenario.costPerCustomer.toFixed(2)}
                          {diff && (
                            <div className={`text-xs ${diff.diff < 0 ? 'text-green-600' : diff.diff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({diff.diff > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
