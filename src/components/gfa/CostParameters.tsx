import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAvailableUnits } from "@/utils/unitConversions";

interface CostParametersProps {
  transportationCostPerMilePerUnit: number;
  facilityCost: number;
  distanceUnit: 'km' | 'mile';
  costUnit: string;
  onTransportCostChange: (value: number) => void;
  onFacilityCostChange: (value: number) => void;
  onDistanceUnitChange: (value: 'km' | 'mile') => void;
  onCostUnitChange: (value: string) => void;
}

export function CostParameters({
  transportationCostPerMilePerUnit,
  facilityCost,
  distanceUnit,
  costUnit,
  onTransportCostChange,
  onFacilityCostChange,
  onDistanceUnitChange,
  onCostUnitChange,
}: CostParametersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="space-y-1">
        <Label htmlFor="distanceUnit" className="text-xs">Distance Unit</Label>
        <Select
          value={distanceUnit}
          onValueChange={(value: 'km' | 'mile') => onDistanceUnitChange(value)}
        >
          <SelectTrigger id="distanceUnit" className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="km">km</SelectItem>
            <SelectItem value="mile">mile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="costUnit" className="text-xs">Cost Unit</Label>
        <Select
          value={costUnit}
          onValueChange={onCostUnitChange}
        >
          <SelectTrigger id="costUnit" className="h-8">
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

      <div className="space-y-1">
        <Label htmlFor="transportCost" className="text-xs">Transport Cost (per {distanceUnit}/{costUnit})</Label>
        <Input
          id="transportCost"
          type="number"
          min="0"
          step="0.01"
          value={transportationCostPerMilePerUnit}
          onChange={(e) => onTransportCostChange(parseFloat(e.target.value) || 0)}
          className="h-8"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="facilityCost" className="text-xs">Facility Cost</Label>
        <Input
          id="facilityCost"
          type="number"
          min="0"
          step="1000"
          value={facilityCost}
          onChange={(e) => onFacilityCostChange(parseFloat(e.target.value) || 0)}
          className="h-8"
        />
      </div>
    </div>
  );
}
