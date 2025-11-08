import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, Product, DistributionCenter, OptimizationSettings } from "@/types/gfa";
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, Filter, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { haversineDistance } from "@/utils/geoCalculations";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

interface ProfitabilityAnalysisProps {
  customers: Customer[];
  products?: Product[];
  dcs?: DistributionCenter[];
  settings?: OptimizationSettings;
}

export function ProfitabilityAnalysis({ 
  customers, 
  products = [], 
  dcs = [], 
  settings 
}: ProfitabilityAnalysisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerSort, setCustomerSort] = useState<'profit' | 'margin' | 'revenue'>('profit');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [profitabilityFilter, setProfitabilityFilter] = useState<'all' | 'profitable' | 'unprofitable'>('all');

  const hasRevenue = products.some(p => p.sellingPrice);
  const hasCost = dcs.length > 0 && settings;

  // Calculate profitability metrics for each customer
  const customerProfitability = useMemo(() => {
    return customers.map(customer => {
      const product = products.find(p => p.name === customer.product);
      const revenue = product?.sellingPrice ? customer.demand * product.sellingPrice : 0;
      
      // Calculate transportation cost
      let transportCost = 0;
      if (settings) {
        const assignedDC = dcs.find(dc => 
          dc.assignedCustomers.some(c => c.id === customer.id)
        );
        
        if (assignedDC) {
          const distanceKm = haversineDistance(
            customer.latitude,
            customer.longitude,
            assignedDC.latitude,
            assignedDC.longitude
          );
          const distance = settings.distanceUnit === 'mile' ? distanceKm * 0.621371 : distanceKm;
          transportCost = distance * customer.demand * settings.transportationCostPerMilePerUnit;
        }
      }
      
      const profit = revenue - transportCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const isProfitable = profit > 0;
      
      return {
        ...customer,
        revenue,
        transportCost,
        profit,
        margin,
        isProfitable
      };
    });
  }, [customers, products, dcs, settings]);

  // Calculate profitability by product
  const productProfitability = useMemo(() => {
    const productMap = new Map<string, {
      product: string;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      customerCount: number;
      avgMargin: number;
      unit: string;
    }>();

    customerProfitability.forEach(customer => {
      const existing = productMap.get(customer.product) || {
        product: customer.product,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        customerCount: 0,
        avgMargin: 0,
        unit: customer.unitOfMeasure
      };

      existing.totalRevenue += customer.revenue;
      existing.totalCost += customer.transportCost;
      existing.totalProfit += customer.profit;
      existing.customerCount += 1;

      productMap.set(customer.product, existing);
    });

    return Array.from(productMap.values()).map(p => ({
      ...p,
      avgMargin: p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue) * 100 : 0
    })).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [customerProfitability]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = [...customerProfitability];

    // Filter by product
    if (productFilter !== 'all') {
      filtered = filtered.filter(c => c.product === productFilter);
    }

    // Filter by profitability
    if (profitabilityFilter === 'profitable') {
      filtered = filtered.filter(c => c.isProfitable);
    } else if (profitabilityFilter === 'unprofitable') {
      filtered = filtered.filter(c => !c.isProfitable);
    }

    // Sort
    filtered.sort((a, b) => {
      if (customerSort === 'profit') return b.profit - a.profit;
      if (customerSort === 'margin') return b.margin - a.margin;
      return b.revenue - a.revenue;
    });

    return filtered;
  }, [customerProfitability, productFilter, profitabilityFilter, customerSort]);

  // Summary metrics
  const totalRevenue = customerProfitability.reduce((sum, c) => sum + c.revenue, 0);
  const totalCost = customerProfitability.reduce((sum, c) => sum + c.transportCost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const profitableCustomers = customerProfitability.filter(c => c.isProfitable).length;
  const unprofitableCustomers = customerProfitability.length - profitableCustomers;

  const handleExport = () => {
    const exportData = customerProfitability.map(c => ({
      'Customer Name': c.name,
      'Product': c.product,
      'Demand': c.demand,
      'Unit': c.unitOfMeasure,
      'Revenue': c.revenue.toFixed(2),
      'Transport Cost': c.transportCost.toFixed(2),
      'Profit': c.profit.toFixed(2),
      'Margin %': c.margin.toFixed(2),
      'Status': c.isProfitable ? 'Profitable' : 'Loss',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Profitability Analysis");
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `profitability-analysis-${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success(`Exported profitability analysis to ${fileName}`);
  };

  // Early return after all hooks have been called
  if (!hasRevenue || !hasCost || customers.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profitability Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {!hasRevenue ? "Add selling prices to products to see profitability analysis" : 
             !hasCost ? "Run optimization with cost parameters to see profitability analysis" :
             "Add customer data to see profitability analysis"}
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
              <div className="space-y-1 text-left">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Profitability Analysis
                  <ChevronDown className={`h-5 w-5 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Based on selling price and transportation cost only
                </p>
              </div>
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Total Profit</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {avgMargin.toFixed(1)}% avg margin
                </p>
              </div>

              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-muted-foreground">Profitable Customers</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {profitableCustomers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((profitableCustomers / customerProfitability.length) * 100).toFixed(1)}% of total
                </p>
              </div>

              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-muted-foreground">Unprofitable Customers</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {unprofitableCustomers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((unprofitableCustomers / customerProfitability.length) * 100).toFixed(1)}% of total
                </p>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} cost
                </p>
              </div>
            </div>

            {/* Tabs for Customer vs Product View */}
            <Tabs defaultValue="customer" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer">By Customer</TabsTrigger>
                <TabsTrigger value="product">By Product</TabsTrigger>
              </TabsList>

              {/* Customer View */}
              <TabsContent value="customer" className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>
                  
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {products.map(p => (
                        <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={profitabilityFilter} onValueChange={setProfitabilityFilter as any}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="profitable">Profitable Only</SelectItem>
                      <SelectItem value="unprofitable">Unprofitable Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={customerSort} onValueChange={setCustomerSort as any}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profit">Sort by Profit</SelectItem>
                      <SelectItem value="margin">Sort by Margin %</SelectItem>
                      <SelectItem value="revenue">Sort by Revenue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Profit Chart */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-3">
                    Customer Profitability Overview
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredCustomers.slice(0, 20)}>
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
                        label={{ value: 'Profit ($)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                      <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]}>
                        {filteredCustomers.slice(0, 20).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.profit > 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Transport Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{customer.product}</TableCell>
                          <TableCell className="text-right">
                            ${customer.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${customer.transportCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${customer.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${customer.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {customer.margin.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            {customer.isProfitable ? (
                              <Badge variant="default" className="bg-green-500">Profitable</Badge>
                            ) : (
                              <Badge variant="destructive">Loss</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Product View */}
              <TabsContent value="product" className="space-y-4">
                {/* Product Profit Chart */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-3">
                    Product Profitability Overview
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productProfitability}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="product" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        label={{ value: 'Profit ($)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                      <Bar dataKey="totalProfit" name="Total Profit" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Product Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Customers</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Total Profit</TableHead>
                        <TableHead className="text-right">Avg Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productProfitability.map((product) => (
                        <TableRow key={product.product}>
                          <TableCell className="font-medium">{product.product}</TableCell>
                          <TableCell className="text-right">{product.customerCount}</TableCell>
                          <TableCell className="text-right">
                            ${product.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${product.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${product.totalProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${product.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.avgMargin.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
