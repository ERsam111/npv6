import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Filter, TrendingUp, Calculator } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface InventorySnapshot {
  day: number;
  inventory: number;
  facility: string;
  product: string;
  scenario: string;
  replication: number;
}

interface OptimizationResultsProps {
  results: any[];
  kpis: any;
  replications: any[];
  iterations?: any[];
  inventoryData?: InventorySnapshot[];
}

export function OptimizationResults({ results, kpis, replications, iterations = [], inventoryData = [] }: OptimizationResultsProps) {
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedScenario, setSelectedScenario] = useState<string>("all");

  // Get unique sites and products
  const sites = useMemo(() => {
    const uniqueSites = Array.from(new Set(results.map(r => r.location_id)));
    return uniqueSites;
  }, [results]);

  const products = useMemo(() => {
    const uniqueProducts = Array.from(new Set(results.map(r => r.product_id)));
    return uniqueProducts;
  }, [results]);

  // Filter results
  const filteredResults = useMemo(() => {
    return results.filter(r => 
      (selectedSite === "all" || r.location_id === selectedSite) &&
      (selectedProduct === "all" || r.product_id === selectedProduct)
    );
  }, [results, selectedSite, selectedProduct]);

  // Filter iterations
  const filteredIterations = useMemo(() => {
    return iterations.filter(i => 
      (selectedSite === "all" || i.location_id === selectedSite) &&
      (selectedProduct === "all" || i.product_id === selectedProduct)
    );
  }, [iterations, selectedSite, selectedProduct]);

  // Prepare chart data for safety stock vs min/max
  const chartData = useMemo(() => {
    return filteredResults.map(r => ({
      location: r.location_id,
      product: r.product_id,
      safety_stock: r.safety_stock,
      min_stock: r.s_mean,
      max_stock: r.S_mean,
    }));
  }, [filteredResults]);

  // Prepare iteration convergence data
  const iterationChartData = useMemo(() => {
    if (filteredIterations.length === 0) return [];
    
    // Group by iteration and calculate averages
    const iterationMap = new Map();
    filteredIterations.forEach(i => {
      if (!iterationMap.has(i.iteration)) {
        iterationMap.set(i.iteration, { 
          s: [], 
          S: [], 
          cost: [], 
          csl: [] 
        });
      }
      const data = iterationMap.get(i.iteration);
      data.s.push(i.s);
      data.S.push(i.S);
      data.cost.push(i.avg_cost);
      data.csl.push(i.avg_csl);
    });

    return Array.from(iterationMap.entries()).map(([iteration, data]) => ({
      iteration,
      avg_s: data.s.reduce((a: number, b: number) => a + b, 0) / data.s.length,
      avg_S: data.S.reduce((a: number, b: number) => a + b, 0) / data.S.length,
      avg_cost: data.cost.reduce((a: number, b: number) => a + b, 0) / data.cost.length,
      avg_csl: data.csl.reduce((a: number, b: number) => a + b, 0) / data.csl.length,
    })).sort((a, b) => a.iteration - b.iteration);
  }, [filteredIterations]);

  // Calculate service level statistics
  const serviceLevelStats = useMemo(() => {
    if (iterationChartData.length === 0) return { below: 0, above: 0, target: 95 };
    
    const target = 95; // Default target, can be made dynamic
    const below = iterationChartData.filter(d => d.avg_csl < target).length;
    const above = iterationChartData.filter(d => d.avg_csl >= target).length;
    
    return { below, above, target };
  }, [iterationChartData]);

  const handleExportResults = () => {
    const ws = XLSX.utils.json_to_sheet(filteredResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Policy Results");
    XLSX.writeFile(wb, `inventory_policy_results_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Results exported successfully");
  };

  const handleExportReplications = () => {
    const ws = XLSX.utils.json_to_sheet(replications);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Replications");
    XLSX.writeFile(wb, `inventory_replications_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Replications exported successfully");
  };

  const handleExportIterations = () => {
    const ws = XLSX.utils.json_to_sheet(filteredIterations);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Iterations");
    XLSX.writeFile(wb, `inventory_iterations_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Iterations exported successfully");
  };

  // Prepare inventory chart data
  const inventoryChartData = useMemo(() => {
    if (!inventoryData || inventoryData.length === 0) return [];
    
    const filtered = inventoryData.filter(d => 
      (selectedSite === "all" || d.facility === selectedSite) &&
      (selectedProduct === "all" || d.product === selectedProduct) &&
      (selectedScenario === "all" || d.scenario === selectedScenario)
    );
    
    // Group by day and calculate average inventory across replications
    const grouped = filtered.reduce((acc, item) => {
      if (!acc[item.day]) {
        acc[item.day] = { sum: 0, count: 0 };
      }
      acc[item.day].sum += item.inventory;
      acc[item.day].count += 1;
      return acc;
    }, {} as Record<number, { sum: number; count: number }>);
    
    return Object.entries(grouped).map(([day, data]) => ({
      day: parseInt(day),
      avgInventory: data.sum / data.count
    })).sort((a, b) => a.day - b.day);
  }, [inventoryData, selectedSite, selectedProduct, selectedScenario]);

  // Get unique scenarios
  const scenarios = useMemo(() => {
    if (!inventoryData || inventoryData.length === 0) return [];
    return Array.from(new Set(inventoryData.map(d => d.scenario)));
  }, [inventoryData]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Average Total Cost</h3>
          <p className="text-3xl font-bold mt-2">${kpis.total_cost?.toLocaleString()}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Average Fill Rate</h3>
          <p className="text-3xl font-bold mt-2">{kpis.avg_fill_rate?.toFixed(1)}%</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Average CSL</h3>
          <p className="text-3xl font-bold mt-2">{kpis.avg_csl?.toFixed(1)}%</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Site/Location</Label>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger>
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site} value={site}>{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">All Products</SelectItem>
                {products.map(product => (
                  <SelectItem key={product} value={product}>{product}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scenario</Label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger>
                <SelectValue placeholder="Select scenario" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">All Scenarios</SelectItem>
                {scenarios.map(scenario => (
                  <SelectItem key={scenario} value={scenario}>{scenario}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Inventory Over Time Chart */}
      {inventoryData && inventoryData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Inventory On Hand Over Time
            </h3>
            <Badge variant="outline">
              {inventoryChartData.length} days tracked
            </Badge>
          </div>
          {inventoryChartData.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Average inventory levels across selected filters (365-day simulation period)
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={inventoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Day', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Inventory Level', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} units`, 'Avg Inventory']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgInventory" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Average Inventory" 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No inventory data available for the selected filters
            </div>
          )}
        </Card>
      )}

      {/* Safety Stock vs Min/Max Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Safety Stock vs Min/Max Stock Levels</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="location" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="safety_stock" fill="#3b82f6" name="Safety Stock" />
            <Bar dataKey="min_stock" fill="#22c55e" name="Min Stock (s)" />
            <Bar dataKey="max_stock" fill="#f97316" name="Max Stock (S)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Service Level vs Target by Iteration */}
      {iterationChartData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Service Level vs Target by Iteration</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-red-600 font-medium">
                Below Target: {serviceLevelStats.below}
              </span>
              <span className="text-green-600 font-medium">
                Above Target: {serviceLevelStats.above}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={iterationChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="iteration" 
                label={{ value: 'Iteration', position: 'insideBottom', offset: -5 }} 
              />
              <YAxis 
                domain={[80, 100]} 
                label={{ value: 'Service Level (%)', angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip 
                formatter={(value: any) => `${value.toFixed(2)}%`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avg_csl" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Achieved CSL" 
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey={() => serviceLevelStats.target} 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target Service Level" 
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Iteration Convergence Chart */}
      {iterationChartData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Optimization Convergence by Iteration</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={iterationChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="iteration" label={{ value: 'Iteration', position: 'insideBottom', offset: -5 }} />
              <YAxis yAxisId="left" label={{ value: 'Stock Levels', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Cost', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="avg_s" stroke="#22c55e" name="Avg s" />
              <Line yAxisId="left" type="monotone" dataKey="avg_S" stroke="#f97316" name="Avg S" />
              <Line yAxisId="right" type="monotone" dataKey="avg_cost" stroke="#3b82f6" name="Avg Cost" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Detailed Calculation Report by Iteration and Replication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Detailed Calculation Report by Iteration & Replication
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Each iteration contains {replications.length > 0 ? Math.ceil(replications.length / filteredIterations.length) : 30} replications with different sampled demand/lead time values
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {filteredIterations.map((iter: any, iterIdx: number) => (
              <AccordionItem key={iterIdx} value={`iteration-${iterIdx}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">Iteration {iter.iteration}</span>
                    <Badge variant={iter.avg_csl >= 95 ? "default" : "secondary"}>
                      Avg CSL: {iter.avg_csl?.toFixed(1)}%
                    </Badge>
                    <Badge variant="outline">
                      Avg Cost: ${iter.avg_cost?.toFixed(2)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {iter.location_id} - {iter.product_id}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Summary for the iteration */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Iteration {iter.iteration} Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Reorder Point (s)</div>
                          <div className="font-semibold">{iter.s}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Order-up-to (S)</div>
                          <div className="font-semibold">{iter.S}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Replications</div>
                          <div className="font-semibold">{iter.replications?.length || 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Safety Stock</div>
                          <div className="font-semibold">{iter.safety_stock}</div>
                        </div>
                      </div>
                    </div>

                    {/* All replications within this iteration */}
                    <Accordion type="single" collapsible className="w-full">
                      {iter.replications?.map((rep: any, repIdx: number) => (
                        <AccordionItem key={repIdx} value={`rep-${repIdx}`} className="border-border">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Replication {rep.replication}</span>
                              <Badge variant={rep.csl >= 95 ? "default" : "secondary"}>
                                CSL: {rep.csl?.toFixed(1)}%
                              </Badge>
                              <Badge variant="outline">
                                Cost: ${rep.cost?.toFixed(2)}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            {rep.calculationSteps && (
                              <div className="space-y-4 text-sm">
                                {/* Demand Analysis */}
                                <div className="border-l-2 border-primary pl-4">
                                  <h5 className="font-semibold mb-2">1. Demand Analysis</h5>
                                  <div className="space-y-2">
                                    <div className="bg-muted/30 p-2 rounded">
                                      <p className="text-xs text-muted-foreground mb-1">Input Parameters:</p>
                                      <p>• Mean: <span className="font-mono">{rep.calculationSteps.demandAnalysis.inputParams.meanDemand.toFixed(2)}</span> units/day</p>
                                      <p>• Std Dev: <span className="font-mono">{rep.calculationSteps.demandAnalysis.inputParams.demandStdDev.toFixed(2)}</span></p>
                                      <p>• Model: <span className="font-mono">{rep.calculationSteps.demandAnalysis.inputParams.demandModel}</span></p>
                                    </div>
                                    {rep.calculationSteps.demandAnalysis.sampledStats && (
                                      <div className="bg-card border p-2 rounded">
                                        <p className="text-xs text-muted-foreground mb-1">Sampled Statistics (Monte Carlo):</p>
                                        <p>• Actual Mean: <span className="font-mono">{rep.calculationSteps.demandAnalysis.sampledStats.mean.toFixed(2)}</span></p>
                                        <p>• Actual Std: <span className="font-mono">{rep.calculationSteps.demandAnalysis.sampledStats.std.toFixed(2)}</span></p>
                                        <p>• Range: <span className="font-mono">[{rep.calculationSteps.demandAnalysis.sampledStats.min}, {rep.calculationSteps.demandAnalysis.sampledStats.max}]</span></p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Lead Time Analysis */}
                                <div className="border-l-2 border-primary pl-4">
                                  <h5 className="font-semibold mb-2">2. Lead Time Analysis</h5>
                                  <div className="space-y-2">
                                    <div className="bg-muted/30 p-2 rounded">
                                      <p className="text-xs text-muted-foreground mb-1">Input Parameters:</p>
                                      <p>• Mean: <span className="font-mono">{rep.calculationSteps.leadTimeAnalysis.inputParams.avgLeadTime.toFixed(2)}</span> days</p>
                                      <p>• Std Dev: <span className="font-mono">{rep.calculationSteps.leadTimeAnalysis.inputParams.leadTimeStdDev.toFixed(2)}</span></p>
                                      <p>• Model: <span className="font-mono">{rep.calculationSteps.leadTimeAnalysis.inputParams.leadTimeModel}</span></p>
                                    </div>
                                    {rep.calculationSteps.leadTimeAnalysis.sampledStats && (
                                      <div className="bg-card border p-2 rounded">
                                        <p className="text-xs text-muted-foreground mb-1">Sampled Statistics (Monte Carlo):</p>
                                        <p>• Actual Mean: <span className="font-mono">{rep.calculationSteps.leadTimeAnalysis.sampledStats.mean.toFixed(2)}</span></p>
                                        <p>• Actual Std: <span className="font-mono">{rep.calculationSteps.leadTimeAnalysis.sampledStats.std.toFixed(2)}</span></p>
                                        <p>• Range: <span className="font-mono">[{rep.calculationSteps.leadTimeAnalysis.sampledStats.min}, {rep.calculationSteps.leadTimeAnalysis.sampledStats.max}]</span></p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Safety Stock Calculation */}
                                <div className="border-l-2 border-primary pl-4">
                                  <h5 className="font-semibold mb-2">3. Safety Stock Calculation</h5>
                                  <div className="space-y-1">
                                    <p className="font-mono text-xs bg-muted p-2 rounded mb-2">{rep.calculationSteps.safetyStockCalculation.formula}</p>
                                    <p>• Target Service Level: <span className="font-mono">{(rep.calculationSteps.safetyStockCalculation.targetServiceLevel * 100).toFixed(1)}%</span></p>
                                    <p>• Z-Score: <span className="font-mono">{rep.calculationSteps.safetyStockCalculation.zScore.toFixed(4)}</span></p>
                                    <p>• Demand Variance: <span className="font-mono">{rep.calculationSteps.safetyStockCalculation.demandVariance.toFixed(4)}</span></p>
                                    <p>• Lead Time Variance: <span className="font-mono">{rep.calculationSteps.safetyStockCalculation.leadTimeVariance.toFixed(4)}</span></p>
                                    <p>• Component 1: <span className="font-mono">{rep.calculationSteps.safetyStockCalculation.component1.toFixed(4)}</span></p>
                                    <p>• Component 2: <span className="font-mono">{rep.calculationSteps.safetyStockCalculation.component2.toFixed(4)}</span></p>
                                    <p className="font-semibold text-primary mt-1">→ Safety Stock: <span className="font-mono">{rep.calculationSteps.safetyStockCalculation.result.toFixed(2)}</span> units</p>
                                  </div>
                                </div>

                                {/* Reorder Point */}
                                <div className="border-l-2 border-primary pl-4">
                                  <h5 className="font-semibold mb-2">4. Reorder Point</h5>
                                  <div className="space-y-1">
                                    <p className="font-mono text-xs bg-muted p-2 rounded mb-2">{rep.calculationSteps.reorderPointCalculation.formula}</p>
                                    <p>• Avg Demand During Lead Time: <span className="font-mono">{rep.calculationSteps.reorderPointCalculation.avgDemandDuringLeadTime.toFixed(2)}</span></p>
                                    <p>• Safety Stock: <span className="font-mono">{rep.calculationSteps.reorderPointCalculation.safetyStock.toFixed(2)}</span></p>
                                    <p className="font-semibold text-primary mt-1">→ Reorder Point: <span className="font-mono">{rep.calculationSteps.reorderPointCalculation.result.toFixed(2)}</span></p>
                                  </div>
                                </div>

                                {/* Cost Calculation */}
                                <div className="border-l-2 border-primary pl-4">
                                  <h5 className="font-semibold mb-2">5. Cost Calculation</h5>
                                  <div className="space-y-3">
                                    {/* Transportation Cost */}
                                    {rep.calculationSteps.costCalculation.transportationCost !== undefined && (
                                      <div className="bg-card border p-3 rounded">
                                        <p className="font-medium text-sm mb-2">Transportation Cost:</p>
                                        <div className="space-y-1 text-xs">
                                          <p className="text-muted-foreground">
                                            Cost per load: <span className="font-mono">${rep.calculationSteps.costCalculation.costPerLoad?.toFixed(2) || '500.00'}</span>
                                          </p>
                                          <p className="text-muted-foreground">
                                            Number of loads: <span className="font-mono">{rep.calculationSteps.costCalculation.numLoads || 'N/A'}</span>
                                          </p>
                                          <p className="font-semibold text-primary mt-1">
                                            = ${rep.calculationSteps.costCalculation.transportationCost.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Production Cost */}
                                    {rep.calculationSteps.costCalculation.productionCost !== undefined && (
                                      <div className="bg-card border p-3 rounded">
                                        <p className="font-medium text-sm mb-2">Production Cost:</p>
                                        <div className="space-y-1 text-xs">
                                          <p className="text-muted-foreground">
                                            Unit cost: <span className="font-mono">${rep.calculationSteps.costCalculation.unitProductionCost?.toFixed(2) || '10.00'}</span>
                                          </p>
                                          <p className="text-muted-foreground">
                                            Units produced: <span className="font-mono">{rep.calculationSteps.costCalculation.unitsProduced || 'N/A'}</span>
                                          </p>
                                          <p className="font-semibold text-primary mt-1">
                                            = ${rep.calculationSteps.costCalculation.productionCost.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Handling Cost */}
                                    {rep.calculationSteps.costCalculation.handlingCost !== undefined && (
                                      <div className="bg-card border p-3 rounded">
                                        <p className="font-medium text-sm mb-2">Handling Cost:</p>
                                        <div className="space-y-1 text-xs">
                                          <p className="text-muted-foreground">
                                            Inbound: <span className="font-mono">${rep.calculationSteps.costCalculation.inboundHandlingCost?.toFixed(2) || '0.00'}</span>
                                          </p>
                                          <p className="text-muted-foreground">
                                            Outbound: <span className="font-mono">${rep.calculationSteps.costCalculation.outboundHandlingCost?.toFixed(2) || '0.00'}</span>
                                          </p>
                                          <p className="font-semibold text-primary mt-1">
                                            = ${rep.calculationSteps.costCalculation.handlingCost.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Inventory/Holding Cost */}
                                    <div className="bg-card border p-3 rounded">
                                      <p className="font-medium text-sm mb-2">Inventory Holding Cost:</p>
                                      <div className="space-y-1 text-xs">
                                        <p className="font-mono bg-muted p-2 rounded mb-2">{rep.calculationSteps.costCalculation.holdingCostCalc.formula}</p>
                                        <p className="text-muted-foreground">
                                          Holding cost per unit: <span className="font-mono">${rep.calculationSteps.costCalculation.holdingCostCalc.holdingCostPerUnit?.toFixed(2) || '0.30'}</span>
                                        </p>
                                        <p className="text-muted-foreground">
                                          Average inventory: <span className="font-mono">{rep.calculationSteps.costCalculation.holdingCostCalc.avgInventory?.toFixed(2) || 'N/A'}</span> units
                                        </p>
                                        <p className="text-muted-foreground">
                                          Simulation days: <span className="font-mono">{rep.calculationSteps.costCalculation.holdingCostCalc.simulationDays || '365'}</span>
                                        </p>
                                        <p className="font-semibold text-primary mt-1">
                                          = ${rep.calculationSteps.costCalculation.holdingCostCalc.result.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Ordering Cost */}
                                    <div className="bg-card border p-3 rounded">
                                      <p className="font-medium text-sm mb-2">Ordering Cost:</p>
                                      <div className="space-y-1 text-xs">
                                        <p className="font-mono bg-muted p-2 rounded mb-2">{rep.calculationSteps.costCalculation.orderingCostCalc.formula}</p>
                                        <p className="text-muted-foreground">
                                          Order cost: <span className="font-mono">${rep.calculationSteps.costCalculation.orderingCostCalc.orderCost?.toFixed(2) || '500.00'}</span>
                                        </p>
                                        <p className="text-muted-foreground">
                                          Number of orders: <span className="font-mono">{rep.calculationSteps.costCalculation.orderingCostCalc.numOrders || 'N/A'}</span>
                                        </p>
                                        <p className="font-semibold text-primary mt-1">
                                          = ${rep.calculationSteps.costCalculation.orderingCostCalc.result.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Total Cost Summary */}
                                    <div className="bg-primary/10 border-2 border-primary p-3 rounded">
                                      <p className="font-bold text-base text-primary">
                                        Total Cost = ${rep.calculationSteps.costCalculation.totalCost.toFixed(2)}
                                      </p>
                                      <div className="mt-2 text-xs space-y-0.5">
                                        {rep.calculationSteps.costCalculation.transportationCost !== undefined && (
                                          <p className="text-muted-foreground">Transportation: ${rep.calculationSteps.costCalculation.transportationCost.toFixed(2)}</p>
                                        )}
                                        {rep.calculationSteps.costCalculation.productionCost !== undefined && (
                                          <p className="text-muted-foreground">Production: ${rep.calculationSteps.costCalculation.productionCost.toFixed(2)}</p>
                                        )}
                                        {rep.calculationSteps.costCalculation.handlingCost !== undefined && (
                                          <p className="text-muted-foreground">Handling: ${rep.calculationSteps.costCalculation.handlingCost.toFixed(2)}</p>
                                        )}
                                        <p className="text-muted-foreground">Inventory: ${rep.calculationSteps.costCalculation.holdingCostCalc.result.toFixed(2)}</p>
                                        <p className="text-muted-foreground">Ordering: ${rep.calculationSteps.costCalculation.orderingCostCalc.result.toFixed(2)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Performance */}
                                <div className="border-l-2 border-primary pl-4">
                                  <h5 className="font-semibold mb-2">6. Performance Metrics</h5>
                                  <div className="space-y-1">
                                    <p>• Achieved CSL: <span className="font-mono">{(rep.calculationSteps.performanceMetrics.achievedServiceLevel * 100).toFixed(1)}%</span></p>
                                    <p>• Target CSL: <span className="font-mono">{(rep.calculationSteps.performanceMetrics.targetServiceLevel * 100).toFixed(1)}%</span></p>
                                    <p>• Avg Inventory: <span className="font-mono">{rep.calculationSteps.performanceMetrics.avgInventoryLevel.toFixed(2)}</span></p>
                                    <p>• Fill Rate: <span className="font-mono">{rep.calculationSteps.performanceMetrics.fillRate.toFixed(1)}%</span></p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Policy Results Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Optimized Policy Results with Safety Stock</h3>
          <Button onClick={handleExportResults} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Results
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="border-r">Location</TableHead>
                <TableHead rowSpan={2} className="border-r">Product</TableHead>
                <TableHead rowSpan={2} className="border-r">Safety Stock</TableHead>
                <TableHead colSpan={4} className="text-center border-r">Reorder Point (s)</TableHead>
                <TableHead colSpan={4} className="text-center border-r">Order-up-to (S)</TableHead>
                <TableHead colSpan={4} className="text-center">Average Inventory</TableHead>
              </TableRow>
              <TableRow>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Mean</TableHead>
                <TableHead className="border-r">Std Dev</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Mean</TableHead>
                <TableHead className="border-r">Std Dev</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Mean</TableHead>
                <TableHead>Std Dev</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium border-r">{result.location_id}</TableCell>
                  <TableCell className="border-r">{result.product_id}</TableCell>
                  <TableCell className="border-r font-semibold text-blue-600">{result.safety_stock}</TableCell>
                  <TableCell>{result.s_min?.toFixed(0)}</TableCell>
                  <TableCell>{result.s_max?.toFixed(0)}</TableCell>
                  <TableCell>{result.s_mean?.toFixed(0)}</TableCell>
                  <TableCell className="border-r">{result.s_std?.toFixed(1)}</TableCell>
                  <TableCell>{result.S_min?.toFixed(0)}</TableCell>
                  <TableCell>{result.S_max?.toFixed(0)}</TableCell>
                  <TableCell>{result.S_mean?.toFixed(0)}</TableCell>
                  <TableCell className="border-r">{result.S_std?.toFixed(1)}</TableCell>
                  <TableCell>{result.avg_inventory_min?.toFixed(0)}</TableCell>
                  <TableCell>{result.avg_inventory_max?.toFixed(0)}</TableCell>
                  <TableCell>{result.avg_inventory_mean?.toFixed(0)}</TableCell>
                  <TableCell>{result.avg_inventory_std?.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Monte Carlo Simulation - All Replications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Monte Carlo Simulation - All Replications</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Each replication uses different sampled demand and lead time values from their distributions
            </p>
          </div>
          <Button onClick={handleExportReplications} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Replications
          </Button>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {replications.map((rep: any, idx: number) => (
            <AccordionItem key={idx} value={`rep-${idx}`} className="border-border">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 w-full">
                  <span className="font-medium">Replication {rep.replication}</span>
                  <span className="text-sm text-muted-foreground">{rep.location_id} - {rep.product_id}</span>
                  <div className="flex gap-2 ml-auto mr-4">
                    <Badge variant="outline">Cost: ${rep.total_cost?.toFixed(2)}</Badge>
                    <Badge variant={rep.csl >= 95 ? "default" : "secondary"}>
                      CSL: {rep.csl?.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-4">
                  {/* Policy & Performance */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Reorder Point (s)</div>
                      <div className="text-lg font-semibold">{rep.s}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Order-up-to (S)</div>
                      <div className="text-lg font-semibold">{rep.S}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Avg Inventory</div>
                      <div className="text-lg font-semibold">{rep.avg_inventory?.toFixed(1)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Fill Rate</div>
                      <div className="text-lg font-semibold">{rep.fill_rate?.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Monte Carlo Sampled Values */}
                  {rep.monte_carlo_samples && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Monte Carlo Sampled Values</h4>
                      
                      {/* Demand Statistics */}
                      <div className="bg-card border rounded-lg p-4">
                        <h5 className="font-medium text-sm mb-2">Demand Samples ({rep.monte_carlo_samples.demands?.length} days)</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Mean</div>
                            <div className="font-semibold">{rep.monte_carlo_samples.demand_stats?.mean?.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Std Dev</div>
                            <div className="font-semibold">{rep.monte_carlo_samples.demand_stats?.std?.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Min</div>
                            <div className="font-semibold">{rep.monte_carlo_samples.demand_stats?.min}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Max</div>
                            <div className="font-semibold">{rep.monte_carlo_samples.demand_stats?.max}</div>
                          </div>
                        </div>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View all {rep.monte_carlo_samples.demands?.length} demand samples
                          </summary>
                          <div className="mt-2 p-2 bg-muted/30 rounded max-h-32 overflow-y-auto font-mono">
                            {rep.monte_carlo_samples.demands?.slice(0, 50).join(', ')}
                            {rep.monte_carlo_samples.demands?.length > 50 && '...'}
                          </div>
                        </details>
                      </div>

                      {/* Lead Time Statistics */}
                      {rep.monte_carlo_samples.lead_time_stats && (
                        <div className="bg-card border rounded-lg p-4">
                          <h5 className="font-medium text-sm mb-2">
                            Lead Time Samples ({rep.monte_carlo_samples.order_count} orders)
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div>
                              <div className="text-xs text-muted-foreground">Mean</div>
                              <div className="font-semibold">{rep.monte_carlo_samples.lead_time_stats?.mean?.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Std Dev</div>
                              <div className="font-semibold">{rep.monte_carlo_samples.lead_time_stats?.std?.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Min</div>
                              <div className="font-semibold">{rep.monte_carlo_samples.lead_time_stats?.min}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Max</div>
                              <div className="font-semibold">{rep.monte_carlo_samples.lead_time_stats?.max}</div>
                            </div>
                          </div>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View all {rep.monte_carlo_samples.lead_times?.length} lead time samples
                            </summary>
                            <div className="mt-2 p-2 bg-muted/30 rounded max-h-32 overflow-y-auto font-mono">
                              {rep.monte_carlo_samples.lead_times?.join(', ')}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      {/* Data by Iteration and Replication */}
      {filteredIterations.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Detailed Data by Iteration</h3>
            <Button onClick={handleExportIterations} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Iterations
            </Button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Iteration</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Safety Stock</TableHead>
                  <TableHead>s</TableHead>
                  <TableHead>S</TableHead>
                  <TableHead>Avg Cost</TableHead>
                  <TableHead>CSL (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIterations.map((iter, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{iter.iteration}</TableCell>
                    <TableCell>{iter.location_id}</TableCell>
                    <TableCell>{iter.product_id}</TableCell>
                    <TableCell className="font-semibold text-blue-600">{iter.safety_stock}</TableCell>
                    <TableCell>{iter.s}</TableCell>
                    <TableCell>{iter.S}</TableCell>
                    <TableCell>${iter.avg_cost?.toLocaleString()}</TableCell>
                    <TableCell>{iter.avg_csl?.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
