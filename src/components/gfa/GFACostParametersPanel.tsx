import { Card } from "@/components/ui/card";
import { CostParameters } from "./CostParameters";
import { OptimizationSettings } from "@/types/gfa";

interface GFACostParametersPanelProps {
  settings: OptimizationSettings;
  onSettingsChange: (settings: OptimizationSettings) => void;
}

export function GFACostParametersPanel({ settings, onSettingsChange }: GFACostParametersPanelProps) {
  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Cost Parameters</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure transportation and facility costs</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <CostParameters
          transportationCostPerMilePerUnit={settings.transportationCostPerMilePerUnit}
          facilityCost={settings.facilityCost}
          distanceUnit={settings.distanceUnit}
          costUnit={settings.costUnit}
          onTransportCostChange={(value) =>
            onSettingsChange({ ...settings, transportationCostPerMilePerUnit: value })
          }
          onFacilityCostChange={(value) => onSettingsChange({ ...settings, facilityCost: value })}
          onDistanceUnitChange={(value) => onSettingsChange({ ...settings, distanceUnit: value })}
          onCostUnitChange={(value) => onSettingsChange({ ...settings, costUnit: value })}
        />
      </div>
    </Card>
  );
}
