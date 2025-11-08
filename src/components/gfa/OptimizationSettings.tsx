import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OptimizationSettings as OptSettings } from "@/types/gfa";
import { Calculator } from "lucide-react";
import { getAvailableUnits } from "@/utils/unitConversions";

interface OptimizationSettingsProps {
  settings: OptSettings;
  onSettingsChange: (settings: OptSettings) => void;
  onOptimize: () => void;
  disabled: boolean;
}

export function OptimizationSettings({
  settings,
  onSettingsChange,
  onOptimize,
  disabled,
}: OptimizationSettingsProps) {
  return (
    <Card className="shadow-lg">
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-3">
          <Label>Optimization Mode</Label>
          <RadioGroup
            value={settings.mode}
            onValueChange={(value: 'sites' | 'distance' | 'cost') =>
              onSettingsChange({ ...settings, mode: value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sites" id="mode-sites" />
              <Label htmlFor="mode-sites" className="font-normal cursor-pointer">
                Fixed Number of Sites (may be infeasible with capacity)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="distance" id="mode-distance" />
              <Label htmlFor="mode-distance" className="font-normal cursor-pointer">
                Demand Coverage Mode (control % of demand within distance)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cost" id="mode-cost" />
              <Label htmlFor="mode-cost" className="font-normal cursor-pointer">
                Minimize Total Cost
              </Label>
            </div>
          </RadioGroup>
        </div>

        {settings.mode === 'sites' ? (
          <div className="space-y-2">
            <Label htmlFor="numDCs">Number of Sites</Label>
            <Input
              id="numDCs"
              type="number"
              min="1"
              max="20"
              value={settings.numDCs}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  numDCs: parseInt(e.target.value) || 1,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Optimization will use EXACTLY this many sites. If capacity is set, solution may be infeasible if total demand exceeds capacity × sites.
            </p>
          </div>
        ) : settings.mode === 'distance' ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="maxRadius">Delivery Distance (km)</Label>
              <Input
                id="maxRadius"
                type="number"
                min="1"
                step="1"
                value={settings.maxRadius}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    maxRadius: parseFloat(e.target.value) || 20,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demandPercentage">Demand Coverage (%)</Label>
              <Input
                id="demandPercentage"
                type="number"
                min="0"
                max="100"
                step="5"
                value={settings.demandPercentage}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    demandPercentage: parseFloat(e.target.value) || 100,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum {settings.demandPercentage}% of demand from each site must be within {settings.maxRadius} km. System will open as many sites as needed to meet this constraint.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Configure cost parameters in the "Cost Parameters" section below. The algorithm will minimize total cost (transportation + facility costs).
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="dcCapacity">Site Capacity</Label>
          <div className="flex gap-2">
            <Input
              id="dcCapacity"
              type="number"
              min="0"
              step="100"
              value={settings.dcCapacity}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  dcCapacity: parseFloat(e.target.value) || 0,
                })
              }
              className="flex-1"
            />
            <Select
              value={settings.capacityUnit}
              onValueChange={(value) =>
                onSettingsChange({ ...settings, capacityUnit: value })
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableUnits().map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Maximum capacity per site (0 = unlimited). <strong>Note:</strong> In "Fixed Sites" mode with capacity, the solution may be infeasible. In "Deliver Within Distance" mode, more sites will be opened automatically to meet both distance AND capacity constraints.
          </p>
        </div>

        <Button
          onClick={onOptimize}
          disabled={disabled}
          className="w-full"
          variant="default"
        >
          <Calculator className="mr-2 h-4 w-4" />
          Run Optimization
        </Button>

        {disabled && (
          <p className="text-xs text-muted-foreground text-center">
            Add at least one customer to optimize
          </p>
        )}
      </CardContent>
    </Card>
  );
}
