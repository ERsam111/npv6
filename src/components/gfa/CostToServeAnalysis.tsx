import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Customer, DistributionCenter, OptimizationSettings, Product } from "@/types/gfa";
import { ChevronDown, TrendingUp } from "lucide-react";
import { haversineDistance, convertDemand } from "@/utils/geoCalculations";
import { Badge } from "@/components/ui/badge";

interface CostToServeAnalysisProps {
  customers: Customer[];
  dcs: DistributionCenter[];
  settings: OptimizationSettings;
  products: Product[];
}

export function CostToServeAnalysis({ customers, dcs, settings, products }: CostToServeAnalysisProps) {
  if (dcs.length === 0 || customers.length === 0) {
    return null;
  }

  // Calculate cost to serve for each customer
  const customerCosts = dcs.flatMap(dc => 
    dc.assignedCustomers.map(customer => {
      const distanceKm = haversineDistance(customer.latitude, customer.longitude, dc.latitude, dc.longitude);
      const distance = settings.distanceUnit === 'mile' ? distanceKm * 0.621371 : distanceKm;
      
      const product = products.find(p => p.name === customer.product);
      const demandInCostUnit = convertDemand(
        customer.demand,
        customer.unitOfMeasure,
        settings.costUnit,
        product
      );
      
      const transportationCost = distance * settings.transportationCostPerMilePerUnit * demandInCostUnit;
      const costPerUnit = demandInCostUnit > 0 ? transportationCost / demandInCostUnit : 0;

      return {
        customerName: customer.name,
        customerCity: customer.city,
        product: customer.product,
        demand: customer.demand,
        unit: customer.unitOfMeasure,
        demandInCostUnit,
        dc: dc.id,
        distance: distance.toFixed(2),
        transportationCost: transportationCost.toFixed(2),
        costPerUnit: costPerUnit.toFixed(4),
      };
    })
  ).sort((a, b) => parseFloat(b.transportationCost) - parseFloat(a.transportationCost));

  return (
    <Collapsible defaultOpen={false}>
      <Card className="shadow-lg">
        <CardHeader className="cursor-pointer">
          <CollapsibleTrigger className="w-full">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cost to Serve Analysis
              </div>
              <ChevronDown className="h-5 w-5 transition-transform" />
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Transportation cost breakdown by customer
              </p>

              <div className="max-h-[500px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Customer</TableHead>
                      <TableHead className="min-w-[100px]">City</TableHead>
                      <TableHead className="min-w-[100px]">Product</TableHead>
                      <TableHead className="min-w-[80px]">Demand</TableHead>
                      <TableHead className="min-w-[100px]">DC</TableHead>
                      <TableHead className="min-w-[80px]">Distance</TableHead>
                      <TableHead className="min-w-[100px]">Cost/Unit</TableHead>
                      <TableHead className="min-w-[120px]">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerCosts.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.customerName}</TableCell>
                        <TableCell>{row.customerCity}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {row.product}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.demand} {row.unit}
                        </TableCell>
                        <TableCell>{row.dc}</TableCell>
                        <TableCell className="tabular-nums">
                          {row.distance} {settings.distanceUnit}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          ${row.costPerUnit}/{settings.costUnit}
                        </TableCell>
                        <TableCell className="tabular-nums font-semibold">
                          ${row.transportationCost}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Transportation Cost:</span>
                  <span className="font-bold text-xl text-primary">
                    ${customerCosts.reduce((sum, row) => sum + parseFloat(row.transportationCost), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
