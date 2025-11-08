import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Settings } from "lucide-react";
import { Customer, Product, OptimizationSettings } from "@/types/gfa";
import { OptimizationSettings as OptimizationSettingsComponent } from "./OptimizationSettings";

interface GFAOptimizationPanelProps {
  customers: Customer[];
  products: Product[];
  settings: OptimizationSettings;
  onSettingsChange: (settings: OptimizationSettings) => void;
  onOptimize: () => void;
}

export function GFAOptimizationPanel({
  customers,
  products,
  settings,
  onSettingsChange,
  onOptimize,
}: GFAOptimizationPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
          <CardDescription>Overview of input data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Customers:</p>
              <p className="font-semibold text-2xl">{customers.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Products:</p>
              <p className="font-semibold text-2xl">{products.length}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Total Demand:</p>
              <p className="font-semibold text-lg">
                {customers.reduce((sum, c) => sum + c.demand, 0).toFixed(2)} units
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Settings */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Optimization Settings
          </CardTitle>
          <CardDescription>
            Configure optimization parameters and constraints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OptimizationSettingsComponent
            settings={settings}
            onSettingsChange={onSettingsChange}
            onOptimize={onOptimize}
            disabled={customers.length === 0}
          />
        </CardContent>
      </Card>

      {/* Run Optimization */}
      <Card className="lg:col-span-3 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Ready to Optimize</h3>
              <p className="text-sm text-muted-foreground">
                Run the optimization algorithm to find the best distribution center locations
              </p>
            </div>
            <Button
              size="lg"
              onClick={onOptimize}
              disabled={customers.length === 0}
              className="gap-2"
            >
              <Play className="h-5 w-5" />
              Run Optimization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
