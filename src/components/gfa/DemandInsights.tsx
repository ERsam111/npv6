import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, Product, DistributionCenter, OptimizationSettings } from "@/types/gfa";
import { BarChart3, TrendingUp, Users, Package, ChevronDown, DollarSign, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, Brush } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { haversineDistance } from "@/utils/geoCalculations";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

interface DemandInsightsProps {
  customers: Customer[];
  products?: Product[];
  dcs?: DistributionCenter[];
  settings?: OptimizationSettings;
}

export function DemandInsights({ customers, products = [], dcs = [], settings }: DemandInsightsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (customers.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Demand Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Add customer data to see demand insights
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total demand by unit (in base units, not converted)
  const totalDemandByUnit = customers.reduce((acc, customer) => {
    const unit = customer.unitOfMeasure;
    if (!acc[unit]) {
      acc[unit] = 0;
    }
    acc[unit] += customer.demand;
    return acc;
  }, {} as Record<string, number>);

  // Calculate demand by product - show in all possible units
  const demandByProductUnit: Array<{ product: string; unit: string; demand: number }> = [];
  const seenKeys = new Set<string>();
  
  customers.forEach(customer => {
    const product = products.find(p => p.name === customer.product);
    
    // Base unit
    const baseKey = `${customer.product}|${customer.unitOfMeasure}`;
    if (!seenKeys.has(baseKey)) {
      seenKeys.add(baseKey);
      const baseDemand = customers
        .filter(c => c.product === customer.product && c.unitOfMeasure === customer.unitOfMeasure)
        .reduce((sum, c) => sum + c.demand, 0);
      demandByProductUnit.push({ product: customer.product, unit: customer.unitOfMeasure, demand: baseDemand });
    }
    
    // All possible conversions
    if (product?.unitConversions) {
      product.unitConversions.forEach(conv => {
        const fromUnit = customer.unitOfMeasure.toLowerCase();
        const convFrom = conv.fromUnit.toLowerCase();
        const convTo = conv.toUnit.toLowerCase();
        
        // Direct conversion (customer's unit → conversion target)
        if (convFrom === fromUnit) {
          const key = `${customer.product}|${conv.toUnit}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            const convertedDemand = customers
              .filter(c => c.product === customer.product && c.unitOfMeasure.toLowerCase() === fromUnit)
              .reduce((sum, c) => sum + c.demand * conv.factor, 0);
            demandByProductUnit.push({ product: customer.product, unit: conv.toUnit, demand: convertedDemand });
          }
        }
        // Reverse conversion (customer's unit is the target, so convert from)
        else if (convTo === fromUnit) {
          const key = `${customer.product}|${conv.fromUnit}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            const convertedDemand = customers
              .filter(c => c.product === customer.product && c.unitOfMeasure.toLowerCase() === fromUnit)
              .reduce((sum, c) => sum + c.demand / conv.factor, 0);
            demandByProductUnit.push({ product: customer.product, unit: conv.fromUnit, demand: convertedDemand });
          }
        }
      });
    }
  });

  const productInsights = demandByProductUnit.sort((a, b) => b.demand - a.demand);

  // Calculate demand by customer
  const totalDemandAllCustomers = customers.reduce((sum, customer) => sum + (customer.demand * customer.conversionFactor), 0);
  
  const customerInsights = customers
    .map((customer) => ({
      ...customer,
      standardDemand: customer.demand * customer.conversionFactor,
      percentage: (((customer.demand * customer.conversionFactor) / totalDemandAllCustomers) * 100).toFixed(1),
    }))
    .sort((a, b) => b.standardDemand - a.standardDemand);

  // Top 5 customers
  const topCustomers = customerInsights.slice(0, 5);

  // Calculate demand by country (in standard units)
  const demandByCountry = customers.reduce((acc, customer) => {
    const standardDemand = customer.demand * customer.conversionFactor;
    acc[customer.country] = (acc[customer.country] || 0) + standardDemand;
    return acc;
  }, {} as Record<string, number>);

  const countryInsights = Object.entries(demandByCountry)
    .map(([country, demand]) => ({
      country,
      demand,
      percentage: ((demand / totalDemandAllCustomers) * 100).toFixed(1),
    }))
    .sort((a, b) => b.demand - a.demand);

  // Calculate revenue and cost by customer (if we have selling prices and optimization results)
  const hasRevenue = products.some(p => p.sellingPrice);
  const hasCost = dcs.length > 0 && settings;
  
  const customerFinancials = customers.map(customer => {
    const product = products.find(p => p.name === customer.product);
    const revenue = product?.sellingPrice ? customer.demand * product.sellingPrice : 0;
    
    // Calculate transportation cost
    let transportCost = 0;
    if (hasCost && settings) {
      // Find which DC this customer is assigned to
      const assignedDC = dcs.find(dc => 
        dc.assignedCustomers.some(c => c.id === customer.id)
      );
      
      if (assignedDC) {
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          assignedDC.latitude,
          assignedDC.longitude
        );
        const distanceInMiles = settings.distanceUnit === 'km' ? distance * 0.621371 : distance;
        transportCost = distanceInMiles * customer.demand * settings.transportationCostPerMilePerUnit;
      }
    }
    
    return {
      ...customer,
      revenue,
      transportCost,
      profit: revenue - transportCost
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Calculate revenue by product
  const revenueByProduct = products.map(product => {
    const productCustomers = customers.filter(c => c.product === product.name);
    const totalDemand = productCustomers.reduce((sum, c) => sum + c.demand, 0);
    const revenue = product.sellingPrice ? totalDemand * product.sellingPrice : 0;
    return {
      product: product.name,
      revenue,
      demand: totalDemand,
      unit: product.baseUnit
    };
  }).filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = revenueByProduct.reduce((sum, p) => sum + p.revenue, 0);

  const handleExport = () => {
    const exportData = customers.map(customer => ({
      'Customer Name': customer.name,
      'City': customer.city,
      'Country': customer.country,
      'Product': customer.product,
      'Demand': customer.demand,
      'Unit': customer.unitOfMeasure,
      'Standard Demand': (customer.demand * customer.conversionFactor).toFixed(2),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Demand Insights");
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `demand-insights-${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success(`Exported demand insights to ${fileName}`);
  };

  // Calculate cost to serve by product
  const costToServeByProduct = products.map(product => {
    const productCustomers = customerFinancials.filter(c => c.product === product.name);
    const totalTransportCost = productCustomers.reduce((sum, c) => sum + c.transportCost, 0);
    const totalDemand = productCustomers.reduce((sum, c) => sum + c.demand, 0);
    const avgCostPerUnit = totalDemand > 0 ? totalTransportCost / totalDemand : 0;
    
    return {
      product: product.name,
      totalCost: totalTransportCost,
      avgCostPerUnit,
      demand: totalDemand,
      unit: product.baseUnit
    };
  }).filter(p => p.totalCost > 0).sort((a, b) => b.totalCost - a.totalCost);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-lg">
        <CardHeader className="cursor-pointer">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Demand Insights
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
          <CardContent className="space-y-6">
            {/* Total Demand */}
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
              <div className="p-3 bg-primary/20 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Demand</p>
                <div className="space-y-1">
                  {Object.entries(totalDemandByUnit).map(([unit, demand]) => (
                    <p key={unit} className="text-2xl font-bold text-foreground">
                      {demand.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unit}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {customers.length} customer{customers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Demand by Product Unit Type */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-foreground">
                  Demand by Product Unit Type
                </h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Demand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productInsights.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.product}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">
                          {item.demand.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Demand by Customer - Bar Chart */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-foreground">
                  Demand by Customer
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={customerInsights}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Demand', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toLocaleString()} ${props.payload.unitOfMeasure}`,
                      'Demand'
                    ]}
                  />
                  <Bar dataKey="demand" radius={[4, 4, 0, 0]}>
                    {customerInsights.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(var(--primary) / ${1 - (index / customerInsights.length) * 0.5})`} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Customers */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-foreground">
                  Top Customers
                </h3>
              </div>
              <div className="space-y-2">
                {topCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {customer.city}, {customer.country}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {customer.demand.toLocaleString()} {customer.unitOfMeasure}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demand by Country */}
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-3">
                Distribution by Country
              </h3>
              <div className="space-y-2">
                {countryInsights.map((item) => (
                  <div key={item.country} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{item.country}</span>
                    <span className="text-muted-foreground">
                      {item.demand.toLocaleString(undefined, { maximumFractionDigits: 2 })} (standardized) ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Analysis */}
            {hasRevenue && (
              <>
                {/* Total Revenue */}
                <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                  <div className="p-3 bg-primary/20 rounded-full">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on selling prices
                    </p>
                  </div>
                </div>

                {/* Revenue by Product - Pie Chart */}
                {revenueByProduct.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm text-foreground">
                        Revenue by Product
                      </h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={revenueByProduct}
                          dataKey="revenue"
                          nameKey="product"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ product, revenue }) => 
                            `${product}: ${((revenue / totalRevenue) * 100).toFixed(1)}%`
                          }
                        >
                          {revenueByProduct.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`}
                              fill={`hsl(var(--primary) / ${1 - (index / revenueByProduct.length) * 0.5})`}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Customer Revenue & Cost Analysis */}
                {hasCost && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm text-foreground">
                        Customer Revenue vs Transportation Cost
                      </h3>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={customerFinancials}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="name" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="transportCost" fill="hsl(var(--destructive))" name="Transport Cost" radius={[4, 4, 0, 0]} />
                        <Brush 
                          dataKey="name" 
                          height={30} 
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--muted))"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Cost to Serve Analysis */}
                {hasCost && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm text-foreground">
                        Cost to Serve Analysis
                      </h3>
                    </div>
                    
                    <Tabs defaultValue="customer" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="customer">By Customer</TabsTrigger>
                        <TabsTrigger value="product">By Product</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="customer" className="space-y-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={customerFinancials.sort((a, b) => b.transportCost - a.transportCost)}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="name" 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              angle={-45}
                              textAnchor="end"
                              height={100}
                            />
                            <YAxis 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                              formatter={(value: number) => `$${value.toLocaleString()}`}
                            />
                            <Bar dataKey="transportCost" fill="hsl(var(--chart-2))" name="Transport Cost" radius={[4, 4, 0, 0]}>
                              {customerFinancials.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`hsl(var(--chart-2) / ${1 - (index / customerFinancials.length) * 0.5})`} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">Demand</TableHead>
                                <TableHead className="text-right">Transport Cost</TableHead>
                                <TableHead className="text-right">Cost per Unit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerFinancials.sort((a, b) => b.transportCost - a.transportCost).map((customer) => {
                                const costPerUnit = customer.demand > 0 ? customer.transportCost / customer.demand : 0;
                                return (
                                  <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell className="text-right">
                                      {customer.demand.toLocaleString()} {customer.unitOfMeasure}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      ${customer.transportCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      ${costPerUnit.toFixed(2)}/{customer.unitOfMeasure}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="product" className="space-y-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={costToServeByProduct}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="product" 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                              formatter={(value: number) => `$${value.toLocaleString()}`}
                            />
                            <Bar dataKey="totalCost" fill="hsl(var(--chart-3))" name="Total Transport Cost" radius={[4, 4, 0, 0]}>
                              {costToServeByProduct.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`hsl(var(--chart-3) / ${1 - (index / costToServeByProduct.length) * 0.5})`} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Total Demand</TableHead>
                                <TableHead className="text-right">Total Transport Cost</TableHead>
                                <TableHead className="text-right">Avg Cost per Unit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {costToServeByProduct.map((product) => (
                                <TableRow key={product.product}>
                                  <TableCell className="font-medium">{product.product}</TableCell>
                                  <TableCell className="text-right">
                                    {product.demand.toLocaleString()} {product.unit}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${product.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${product.avgCostPerUnit.toFixed(2)}/{product.unit}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
