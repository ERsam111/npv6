import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Settings } from "lucide-react";
import { Customer, Product, OptimizationSettings, ExistingSite } from "@/types/gfa";
import { OptimizationSettings as OptimizationSettingsComponent } from "./OptimizationSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface GFAOptimizationPanelProps {
  customers: Customer[];
  products: Product[];
  existingSites: ExistingSite[];
  settings: OptimizationSettings;
  onSettingsChange: (settings: OptimizationSettings) => void;
  onOptimize: () => void;
}

export function GFAOptimizationPanel({
  customers,
  products,
  existingSites,
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
            <div>
              <p className="text-muted-foreground">Existing Sites:</p>
              <p className="font-semibold text-2xl">{existingSites.length}</p>
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
        <CardContent className="space-y-6">
          <OptimizationSettingsComponent
            settings={settings}
            onSettingsChange={onSettingsChange}
            onOptimize={onOptimize}
            disabled={customers.length === 0}
          />
          
          {existingSites.length > 0 && (
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-existing" className="text-base font-semibold">
                    Include Existing Sites in Analysis
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Consider your {existingSites.length} existing site{existingSites.length > 1 ? 's' : ''} in the optimization
                  </p>
                </div>
                <Switch
                  id="include-existing"
                  checked={settings.includeExistingSites}
                  onCheckedChange={(checked) => 
                    onSettingsChange({ ...settings, includeExistingSites: checked })
                  }
                />
              </div>

              {settings.includeExistingSites && (
                <div className="pl-4 space-y-3">
                  <Label className="text-sm font-medium">Site Inclusion Mode</Label>
                  <RadioGroup
                    value={settings.existingSitesMode}
                    onValueChange={(value: 'potential' | 'always') =>
                      onSettingsChange({ ...settings, existingSitesMode: value })
                    }
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="potential" id="potential" />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="potential"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Consider as Potential Sites
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Existing sites compete with new locations. May or may not be selected in the final solution.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="always" id="always" />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="always"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Always Include
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Existing sites are always in the solution. Additional sites may be added as needed.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          )}
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
