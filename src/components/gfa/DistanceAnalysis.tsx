import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DistributionCenter, Customer } from "@/types/gfa";
import { haversineDistance } from "@/utils/geoCalculations";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart, Legend, LineChart } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
interface DistanceAnalysisProps {
  dcs: DistributionCenter[];
  customers: Customer[];
  rangeStep: number;
  onRangeStepChange: (step: number) => void;
  distanceUnit: 'km' | 'mile';
}
export function DistanceAnalysis({
  dcs,
  customers,
  rangeStep,
  onRangeStepChange,
  distanceUnit
}: DistanceAnalysisProps) {
  const [isOpen, setIsOpen] = useState(true); // Default open
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set(dcs.map(dc => dc.id)));
  const [chartView, setChartView] = useState<"bars" | "cumulative" | "both">("both");
  const toggleSite = (siteId: string) => {
    const newSelected = new Set(selectedSites);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSites(newSelected);
  };
  const toggleAll = () => {
    if (selectedSites.size === dcs.length) {
      setSelectedSites(new Set());
    } else {
      setSelectedSites(new Set(dcs.map(dc => dc.id)));
    }
  };
  const distanceAnalysis = useMemo(() => {
    // Filter DCs based on selection
    const filteredDcs = dcs.filter(dc => selectedSites.has(dc.id));
    if (filteredDcs.length === 0) {
      return {
        ranges: [],
        totalDemand: 0,
        chartData: []
      };
    }

    // Calculate total demand (standardized)
    const totalDemand = customers.reduce((sum, c) => sum + c.demand * c.conversionFactor, 0);

    // Calculate distances for each customer to their assigned DC
    const customerDistances: {
      customer: Customer;
      distance: number;
    }[] = [];
    filteredDcs.forEach(dc => {
      dc.assignedCustomers.forEach(customer => {
        const distanceKm = haversineDistance(customer.latitude, customer.longitude, dc.latitude, dc.longitude);
        const distance = distanceUnit === 'mile' ? distanceKm * 0.621371 : distanceKm;
        customerDistances.push({
          customer,
          distance
        });
      });
    });

    // Sort by distance
    customerDistances.sort((a, b) => a.distance - b.distance);

    // Create distance ranges based on selected step
    const maxDistance = Math.max(...customerDistances.map(cd => cd.distance), 0);
    const numRanges = Math.ceil(maxDistance / rangeStep);
    const ranges: {
      range: string;
      minKm: number;
      maxKm: number;
      demand: number;
      demandPercentage: number;
      cumulativeDemand: number;
      cumulativePercentage: number;
    }[] = [];
    let cumulativeDemand = 0;
    for (let i = 0; i < numRanges; i++) {
      const minKm = i * rangeStep;
      const maxKm = (i + 1) * rangeStep;
      const rangeCustomers = customerDistances.filter(cd => cd.distance >= minKm && cd.distance < maxKm);
      const rangeDemand = rangeCustomers.reduce((sum, cd) => sum + cd.customer.demand * cd.customer.conversionFactor, 0);
      cumulativeDemand += rangeDemand;
      const unitLabel = distanceUnit === 'mile' ? 'miles' : 'km';
      ranges.push({
        range: `${minKm}-${maxKm} ${unitLabel}`,
        minKm,
        maxKm,
        demand: rangeDemand,
        demandPercentage: totalDemand > 0 ? rangeDemand / totalDemand * 100 : 0,
        cumulativeDemand,
        cumulativePercentage: totalDemand > 0 ? cumulativeDemand / totalDemand * 100 : 0
      });
    }

    // Prepare chart data
    const chartData = ranges.map(r => ({
      range: r.range,
      percentage: r.demandPercentage,
      cumulative: r.cumulativePercentage
    }));
    return {
      ranges,
      totalDemand,
      chartData
    };
  }, [dcs, customers, selectedSites, rangeStep, distanceUnit]);
  const handleExport = () => {
    const exportData = distanceAnalysis.ranges.map(r => ({
      'Distance Range': r.range,
      'Demand': r.demand.toFixed(2),
      'Percentage of Total': r.demandPercentage.toFixed(2) + '%',
      'Cumulative Percentage': r.cumulativePercentage.toFixed(2) + '%'
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Distance Analysis");
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `distance-analysis-${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Exported distance analysis to ${fileName}`);
  };
  if (dcs.length === 0) {
    return null;
  }
  return <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-lg">
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
        {/* Site Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Filter by Sites</Label>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selectedSites.size === dcs.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {dcs.map(dc => <div key={dc.id} className="flex items-center space-x-2">
                <Checkbox id={`site-${dc.id}`} checked={selectedSites.has(dc.id)} onCheckedChange={() => toggleSite(dc.id)} />
                <Label htmlFor={`site-${dc.id}`} className="text-sm font-normal cursor-pointer">
                  {dc.id}
                </Label>
              </div>)}
          </div>
        </div>

        {selectedSites.size === 0 ? <p className="text-sm text-muted-foreground text-center py-8">
            Select at least one site to view analysis
          </p> : <>
            {/* Chart View Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Chart View</Label>
              <RadioGroup value={chartView} onValueChange={(v: any) => setChartView(v)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bars" id="bars" />
                  <Label htmlFor="bars" className="font-normal cursor-pointer">Bar Chart</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cumulative" id="cumulative" />
                  <Label htmlFor="cumulative" className="font-normal cursor-pointer">Cumulative Line</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="font-normal cursor-pointer">Both</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Chart */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Demand Distribution by Distance</h3>
              <ResponsiveContainer width="100%" height={300}>
                {chartView === "cumulative" ? <LineChart data={distanceAnalysis.chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="range" className="text-xs" tick={{
                    fill: 'hsl(var(--muted-foreground))'
                  }} />
                    <YAxis className="text-xs" tick={{
                    fill: 'hsl(var(--muted-foreground))'
                  }} label={{
                    value: '% of Demand',
                    angle: -90,
                    position: 'insideLeft'
                  }} />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }} formatter={(value: number) => [`${value.toFixed(2)}%`, 'Cumulative %']} />
                    <Legend />
                    <Line type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={2} dot={false} name="Cumulative %" />
                  </LineChart> : <ComposedChart data={distanceAnalysis.chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="range" className="text-xs" tick={{
                    fill: 'hsl(var(--muted-foreground))'
                  }} />
                    <YAxis className="text-xs" tick={{
                    fill: 'hsl(var(--muted-foreground))'
                  }} label={{
                    value: '% of Demand',
                    angle: -90,
                    position: 'insideLeft'
                  }} />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }} formatter={(value: number, name: string) => {
                    const label = name === 'percentage' ? 'Range %' : 'Cumulative %';
                    return [`${value.toFixed(2)}%`, label];
                  }} />
                    <Legend />
                    <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Range %">
                      {distanceAnalysis.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.1})`} />)}
                    </Bar>
                    {chartView === "both" && <Line type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={2} dot={false} name="Cumulative %" />}
                  </ComposedChart>}
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Detailed Breakdown</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Distance Range</TableHead>
                      <TableHead className="text-right">Demand</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                      <TableHead className="text-right">Cumulative %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distanceAnalysis.ranges.map((range, idx) => <TableRow key={idx}>
                        <TableCell className="font-medium">{range.range}</TableCell>
                        <TableCell className="text-right">
                          {range.demand.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {range.demandPercentage.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {range.cumulativePercentage.toFixed(2)}%
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Total Demand (standardized): {distanceAnalysis.totalDemand.toFixed(2)} m³
              </p>
            </div>
          </>}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>;
}