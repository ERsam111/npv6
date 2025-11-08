import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DistributionCenter, CostBreakdown, Customer, OptimizationSettings, Product } from "@/types/gfa";
import { CheckCircle2, AlertTriangle, MapPin, Package, DollarSign, Download, TrendingUp, Loader2, ChevronDown } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { haversineDistance, convertDemand } from "@/utils/geoCalculations";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ResultsPanelProps {
  dcs: DistributionCenter[];
  feasible: boolean;
  warnings: string[];
  costBreakdown?: CostBreakdown;
  customers: Customer[];
  settings: OptimizationSettings;
  products: Product[];
}

export function ResultsPanel({ dcs, feasible, warnings, costBreakdown, customers, settings, products }: ResultsPanelProps) {
  const [isOpen, setIsOpen] = useState(true); // Default open
  const [dcsWithCities, setDcsWithCities] = useState<DistributionCenter[]>(dcs);
  const [loadingCities, setLoadingCities] = useState(false);

  // Fetch nearest cities for all DCs
  useEffect(() => {
    const fetchCities = async () => {
      if (dcs.length === 0) return;
      
      setLoadingCities(true);
      const updatedDcs = await Promise.all(
        dcs.map(async (dc) => {
          try {
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
            const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
            
            const response = await fetch(
              `${SUPABASE_URL}/functions/v1/find-nearest-city`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                },
                body: JSON.stringify({ 
                  latitude: dc.latitude, 
                  longitude: dc.longitude 
                }),
              }
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return {
              ...dc,
              nearestCity: data.city,
              cityCountry: data.country,
            };
          } catch (error) {
            console.error(`Error fetching city for DC ${dc.id}:`, error);
            return dc;
          }
        })
      );
      
      setDcsWithCities(updatedDcs);
      setLoadingCities(false);
    };

    fetchCities();
  }, [dcs]);

  // Calculate total demand and demand by site
  const totalDemand = customers.reduce((sum, c) => sum + (c.demand * c.conversionFactor), 0);
  
  // Helper function to calculate transportation cost for a customer
  const calculateCustomerTransportationCost = (customer: Customer, dc: DistributionCenter): number => {
    const distanceKm = haversineDistance(customer.latitude, customer.longitude, dc.latitude, dc.longitude);
    const distance = settings.distanceUnit === 'mile' ? distanceKm * 0.621371 : distanceKm;
    
    // Find the product for this customer
    const product = products.find(p => p.name === customer.product);
    
    // Convert customer demand to cost unit
    const demandInCostUnit = convertDemand(
      customer.demand,
      customer.unitOfMeasure,
      settings.costUnit,
      product
    );
    
    return distance * settings.transportationCostPerMilePerUnit * demandInCostUnit;
  };
  
  const demandBySite = dcsWithCities.map(dc => ({
    site: dc.id,
    demand: dc.totalDemand,
    percentage: totalDemand > 0 ? (dc.totalDemand / totalDemand) * 100 : 0,
    customers: dc.assignedCustomers.length,
  })).sort((a, b) => b.percentage - a.percentage);

  const handleExport = () => {
    // Create export data
    const exportData: any[] = [];
    
    dcsWithCities.forEach((dc) => {
      dc.assignedCustomers.forEach((customer) => {
        const distanceKm = haversineDistance(
          customer.latitude,
          customer.longitude,
          dc.latitude,
          dc.longitude
        );
        const distanceMiles = distanceKm * 0.621371;
        const transportationCost = calculateCustomerTransportationCost(customer, dc);
        
        // Find product and convert demand
        const product = products.find(p => p.name === customer.product);
        const demandInCostUnit = convertDemand(
          customer.demand,
          customer.unitOfMeasure,
          settings.costUnit,
          product
        );
        
        exportData.push({
          'Customer Name': customer.name,
          'Customer City': customer.city,
          'Customer Country': customer.country,
          'Customer Product': customer.product,
          'Customer Demand': customer.demand,
          'Customer Unit': customer.unitOfMeasure,
          'Demand in Cost Unit': demandInCostUnit.toFixed(2),
          'Cost Unit': settings.costUnit,
          'Customer Latitude': customer.latitude,
          'Customer Longitude': customer.longitude,
          'Distribution Center': dc.id,
          'DC Nearest City': dc.nearestCity || 'Loading...',
          'DC Country': dc.cityCountry || '',
          'DC Latitude': dc.latitude,
          'DC Longitude': dc.longitude,
          'Distance (km)': distanceKm.toFixed(2),
          'Distance (miles)': distanceMiles.toFixed(2),
          'Transportation Cost': transportationCost.toFixed(2),
          'Cost per Unit': (transportationCost / demandInCostUnit).toFixed(4),
        });
      });
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Customer Assignments");
    
    // Generate file name with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `gfa-customer-assignments-${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, fileName);
    
    toast.success(`Exported ${exportData.length} customer assignments to ${fileName}`);
  };

  if (dcs.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Optimization Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Run optimization to see results
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-lg">
        <CardHeader className="cursor-pointer">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span>Optimization Results</span>
                <Badge variant={feasible ? "default" : "destructive"}>
                  {feasible ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Feasible
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Constraints Violated
                    </>
                  )}
                </Badge>
                <ChevronDown className={`h-5 w-5 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </div>
          </CollapsibleTrigger>
          {isOpen && (
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="gap-2 absolute top-4 right-4"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
        {/* Demand Distribution Chart */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">
            Demand Distribution by Site
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(200, dcs.length * 40)}>
            <BarChart data={demandBySite} layout="vertical" margin={{ left: 20, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: '% of Total Demand', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="category" 
                dataKey="site" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={80}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'percentage') return [`${value.toFixed(2)}%`, 'Demand Share'];
                  return [value, name];
                }}
              />
              <Bar 
                dataKey="percentage" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
                label={{ 
                  position: 'right', 
                  fill: 'hsl(var(--foreground))',
                  fontSize: 12,
                  formatter: (value: number) => `${value.toFixed(1)}%`
                }}
              >
                {demandBySite.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`hsl(var(--primary) / ${1 - index * 0.05})`} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {costBreakdown && (
          <div className="p-4 bg-primary/5 rounded-lg space-y-3 border border-primary/20">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="h-4 w-4 text-primary" />
              Cost Breakdown
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Transportation Cost:</p>
                <p className="font-semibold text-lg">${costBreakdown.transportationCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Facility Cost:</p>
                <p className="font-semibold text-lg">${costBreakdown.facilityCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-primary/20">
              <div className="flex justify-between items-center">
                <p className="text-muted-foreground">Total Cost:</p>
                <p className="font-bold text-xl text-primary">${costBreakdown.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Optimized for {costBreakdown.numSites} site{costBreakdown.numSites !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {warning}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground">
              Sites ({dcsWithCities.length})
            </h3>
            {loadingCities && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Finding nearest cities...
              </div>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {dcsWithCities.map((dc) => (
              <div
                key={dc.id}
                className="p-4 bg-muted rounded-lg space-y-2 border border-border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{dc.id}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {dc.assignedCustomers.length} customers
                  </Badge>
                </div>

                {dc.nearestCity && (
                  <div className="bg-primary/10 rounded px-3 py-2 border border-primary/20">
                    <p className="text-xs text-muted-foreground">Nearest City (10k+ pop):</p>
                    <p className="font-semibold text-sm text-foreground">
                      {dc.nearestCity}
                      {dc.cityCountry && `, ${dc.cityCountry}`}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Latitude:</span>
                    <span className="ml-1 font-mono">
                      {dc.latitude.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Longitude:</span>
                    <span className="ml-1 font-mono">
                      {dc.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Package className="h-3 w-3 text-secondary" />
                  <span className="text-muted-foreground">Total Demand (standardized):</span>
                  <span className="font-semibold">
                    {dc.totalDemand.toFixed(2)}
                  </span>
                </div>

                {/* Demand by Product */}
                {dc.assignedCustomers.length > 0 && (
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">Demand by Product:</p>
                    {Object.entries(
                      dc.assignedCustomers.reduce((acc, customer) => {
                        if (!acc[customer.product]) {
                          acc[customer.product] = { demand: 0, unit: customer.unitOfMeasure };
                        }
                        acc[customer.product].demand += customer.demand;
                        return acc;
                      }, {} as Record<string, { demand: number; unit: string }>)
                    ).map(([product, data]) => (
                      <p key={product} className="pl-2">
                        • {product}: {data.demand.toFixed(2)} {data.unit}
                      </p>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Assigned Customers:
                  </p>
                  <div className="space-y-2">
                    {dc.assignedCustomers.map((customer) => {
                      const transportationCost = calculateCustomerTransportationCost(customer, dc);
                      const product = products.find(p => p.name === customer.product);
                      const demandInCostUnit = convertDemand(
                        customer.demand,
                        customer.unitOfMeasure,
                        settings.costUnit,
                        product
                      );
                      const costPerUnit = demandInCostUnit > 0 ? transportationCost / demandInCostUnit : 0;
                      
                      return (
                        <div key={customer.id} className="text-xs pl-2 bg-background p-2 rounded space-y-1">
                          <div className="flex items-start justify-between">
                            <p className="font-medium">• {customer.name}</p>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {customer.demand} {customer.unitOfMeasure}
                            </Badge>
                          </div>
                          <div className="pl-3 space-y-0.5 text-muted-foreground">
                            <p>Demand: {demandInCostUnit.toFixed(2)} {settings.costUnit}</p>
                            <p className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-primary" />
                              Cost/Unit: ${costPerUnit.toFixed(4)}/{settings.costUnit}
                            </p>
                            <p className="font-semibold text-foreground">
                              Total Transport Cost: ${transportationCost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
