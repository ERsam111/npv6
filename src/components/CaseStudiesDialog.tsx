import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, TrendingUp, Gauge, CheckCircle2, ArrowRight } from "lucide-react";

interface CaseStudiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CaseStudiesDialog({ open, onOpenChange }: CaseStudiesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Case Studies & User Guides</DialogTitle>
          <DialogDescription>
            Comprehensive guides to help you get started with each optimization tool
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="gfa" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gfa">
              <MapPin className="h-4 w-4 mr-2" />
              GFA
            </TabsTrigger>
            <TabsTrigger value="forecasting">
              <TrendingUp className="h-4 w-4 mr-2" />
              Forecasting
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <Gauge className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            {/* GFA Case Study */}
            <TabsContent value="gfa" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-gfa" />
                    Green Field Analysis (GFA)
                  </CardTitle>
                  <CardDescription>
                    Optimize facility location and distribution network design
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">What is GFA?</h3>
                    <p className="text-sm text-muted-foreground">
                      GFA helps you determine optimal locations for new distribution centers, warehouses, or manufacturing facilities
                      by analyzing customer locations, demand patterns, transportation costs, and facility constraints.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gfa" />
                      What You Need to Get Started
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Customer Data</p>
                          <p className="text-sm text-muted-foreground">Names, addresses/coordinates, and demand quantities for each customer location</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Product Information</p>
                          <p className="text-sm text-muted-foreground">Product names, weights, volumes, and prices</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Cost Parameters</p>
                          <p className="text-sm text-muted-foreground">Transportation cost per km/mile, warehouse fixed costs, variable handling costs</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-gfa" />
                      Step-by-Step Guide
                    </h3>
                    <div className="space-y-3">
                      <div className="pl-4 border-l-2 border-gfa/30">
                        <p className="text-sm font-medium">Step 1: Upload Customer Data</p>
                        <p className="text-sm text-muted-foreground">Upload Excel file or manually enter customer locations with coordinates and demand</p>
                      </div>
                      <div className="pl-4 border-l-2 border-gfa/30">
                        <p className="text-sm font-medium">Step 2: Add Products</p>
                        <p className="text-sm text-muted-foreground">Define products with their physical attributes and pricing</p>
                      </div>
                      <div className="pl-4 border-l-2 border-gfa/30">
                        <p className="text-sm font-medium">Step 3: Set Cost Parameters</p>
                        <p className="text-sm text-muted-foreground">Configure transportation rates, facility costs, and handling charges</p>
                      </div>
                      <div className="pl-4 border-l-2 border-gfa/30">
                        <p className="text-sm font-medium">Step 4: Define Candidate Sites</p>
                        <p className="text-sm text-muted-foreground">Mark potential warehouse/DC locations on the map</p>
                      </div>
                      <div className="pl-4 border-l-2 border-gfa/30">
                        <p className="text-sm font-medium">Step 5: Run Optimization</p>
                        <p className="text-sm text-muted-foreground">Set constraints (max facilities, capacity limits) and run the analysis</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">What Results You'll See</h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Optimal Facility Locations</p>
                        <p className="text-sm text-muted-foreground">Map showing recommended DC/warehouse positions</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Customer Assignments</p>
                        <p className="text-sm text-muted-foreground">Which facility serves which customers</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Cost Analysis</p>
                        <p className="text-sm text-muted-foreground">Total transportation costs, facility costs, and cost breakdown by region</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Distance Metrics</p>
                        <p className="text-sm text-muted-foreground">Average delivery distance, total distance traveled, service coverage</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Profitability Analysis</p>
                        <p className="text-sm text-muted-foreground">Revenue vs costs, contribution margin, ROI projections</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Demand Forecasting Case Study */}
            <TabsContent value="forecasting" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-forecasting" />
                    Demand Forecasting
                  </CardTitle>
                  <CardDescription>
                    Predict future demand using advanced statistical models
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">What is Demand Forecasting?</h3>
                    <p className="text-sm text-muted-foreground">
                      Demand Forecasting uses historical sales data to predict future demand patterns. The tool applies multiple forecasting
                      models (Moving Average, Exponential Smoothing, Linear Regression, ARIMA) and automatically selects the best-performing
                      model based on accuracy metrics.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-forecasting" />
                      What You Need to Get Started
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Historical Sales Data</p>
                          <p className="text-sm text-muted-foreground">Time series data with dates and corresponding sales/demand quantities (minimum 12 data points recommended)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Product/SKU Information</p>
                          <p className="text-sm text-muted-foreground">Product identifiers if forecasting multiple items</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Time Granularity</p>
                          <p className="text-sm text-muted-foreground">Daily, weekly, or monthly data periods</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-forecasting" />
                      Step-by-Step Guide
                    </h3>
                    <div className="space-y-3">
                      <div className="pl-4 border-l-2 border-forecasting/30">
                        <p className="text-sm font-medium">Step 1: Upload Historical Data</p>
                        <p className="text-sm text-muted-foreground">Upload Excel/CSV with columns: Date, Product/SKU, Demand/Sales Quantity</p>
                      </div>
                      <div className="pl-4 border-l-2 border-forecasting/30">
                        <p className="text-sm font-medium">Step 2: Review Data Analytics</p>
                        <p className="text-sm text-muted-foreground">View trends, seasonality patterns, and outlier detection</p>
                      </div>
                      <div className="pl-4 border-l-2 border-forecasting/30">
                        <p className="text-sm font-medium">Step 3: Select Forecast Horizon</p>
                        <p className="text-sm text-muted-foreground">Choose how many periods ahead to forecast (e.g., next 12 months)</p>
                      </div>
                      <div className="pl-4 border-l-2 border-forecasting/30">
                        <p className="text-sm font-medium">Step 4: Choose Models</p>
                        <p className="text-sm text-muted-foreground">Select forecasting methods or use auto-select for best model</p>
                      </div>
                      <div className="pl-4 border-l-2 border-forecasting/30">
                        <p className="text-sm font-medium">Step 5: Run Forecast</p>
                        <p className="text-sm text-muted-foreground">Execute the analysis and compare model performances</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">What Results You'll See</h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Forecast Values</p>
                        <p className="text-sm text-muted-foreground">Predicted demand for each future period with confidence intervals</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Model Comparison</p>
                        <p className="text-sm text-muted-foreground">Accuracy metrics (MAPE, RMSE, MAE) for each forecasting model</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Trend Analysis</p>
                        <p className="text-sm text-muted-foreground">Growth rate, seasonality index, trend direction</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Visual Charts</p>
                        <p className="text-sm text-muted-foreground">Time series plot showing historical data vs forecast with confidence bands</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Scenario Analysis</p>
                        <p className="text-sm text-muted-foreground">Best case, worst case, and most likely scenarios</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-forecasting/10 p-4 rounded-lg border border-forecasting/20">
                    <p className="text-sm font-medium mb-1">💡 Pro Tip</p>
                    <p className="text-sm text-muted-foreground">
                      The tool automatically detects outliers and anomalies in your data. Review these before finalizing your forecast
                      to ensure data quality.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory Optimization Case Study */}
            <TabsContent value="inventory" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-inventory" />
                    Inventory Optimization
                  </CardTitle>
                  <CardDescription>
                    Monte Carlo simulation for multi-echelon inventory optimization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">What is Inventory Optimization?</h3>
                    <p className="text-sm text-muted-foreground">
                      This tool uses Monte Carlo simulation to optimize inventory policies across your entire supply chain network.
                      It models the flow of products from suppliers through factories, distribution centers, to customers, considering
                      demand variability, lead times, and various cost factors to determine optimal inventory levels.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-inventory" />
                      What You Need to Get Started
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Network Structure</p>
                          <p className="text-sm text-muted-foreground">Facilities (suppliers, factories, DCs), customers, and their locations</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Product Data</p>
                          <p className="text-sm text-muted-foreground">Product types, BOMs (Bill of Materials), unit costs, weights, volumes</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Demand Patterns</p>
                          <p className="text-sm text-muted-foreground">Customer orders with demand distributions (e.g., Uniform, Normal)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">4</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Policies & Costs</p>
                          <p className="text-sm text-muted-foreground">Replenishment policies, transportation costs, warehousing costs, production rates</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-inventory" />
                      Step-by-Step Guide
                    </h3>
                    <div className="space-y-3">
                      <div className="pl-4 border-l-2 border-inventory/30">
                        <p className="text-sm font-medium">Step 1: Define Network</p>
                        <p className="text-sm text-muted-foreground">Add customers, suppliers, factories, and DCs with their locations</p>
                      </div>
                      <div className="pl-4 border-l-2 border-inventory/30">
                        <p className="text-sm font-medium">Step 2: Configure Products</p>
                        <p className="text-sm text-muted-foreground">Create products, define BOMs showing raw material requirements</p>
                      </div>
                      <div className="pl-4 border-l-2 border-inventory/30">
                        <p className="text-sm font-medium">Step 3: Set Policies</p>
                        <p className="text-sm text-muted-foreground">
                          Define inventory policies (s,S), replenishment rules, production policies linked to BOMs
                        </p>
                      </div>
                      <div className="pl-4 border-l-2 border-inventory/30">
                        <p className="text-sm font-medium">Step 4: Configure Transportation</p>
                        <p className="text-sm text-muted-foreground">Set routes between facilities with costs, lead times, and capacities</p>
                      </div>
                      <div className="pl-4 border-l-2 border-inventory/30">
                        <p className="text-sm font-medium">Step 5: Define Customer Orders</p>
                        <p className="text-sm text-muted-foreground">Create order profiles with demand distributions and service level requirements</p>
                      </div>
                      <div className="pl-4 border-l-2 border-inventory/30">
                        <p className="text-sm font-medium">Step 6: Run Simulation</p>
                        <p className="text-sm text-muted-foreground">Set simulation parameters (duration, replications) and execute Monte Carlo analysis</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">What Results You'll See</h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Inventory Levels Over Time</p>
                        <p className="text-sm text-muted-foreground">Charts showing inventory at each facility throughout the simulation period</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Service Level Achievement</p>
                        <p className="text-sm text-muted-foreground">Fill rates, stockout frequency, and order fulfillment metrics</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Cost Breakdown</p>
                        <p className="text-sm text-muted-foreground">
                          Total costs split by: holding costs, transportation, production, warehousing, stockout penalties
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Network Flow Visualization</p>
                        <p className="text-sm text-muted-foreground">Map showing product flow between facilities with volumes</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Optimal Policy Recommendations</p>
                        <p className="text-sm text-muted-foreground">Suggested reorder points (s) and order-up-to levels (S) for each product-facility pair</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Production Schedule</p>
                        <p className="text-sm text-muted-foreground">Manufacturing plan showing when and how much to produce</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-inventory/10 p-4 rounded-lg border border-inventory/20">
                    <p className="text-sm font-medium mb-1">💡 Key Features</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                      <li>BOM-based production: Link production policies to specific BOMs</li>
                      <li>Multi-echelon optimization: Balance inventory across the entire network</li>
                      <li>Stochastic demand: Model realistic demand variability</li>
                      <li>Lead time variability: Account for transportation and production delays</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
