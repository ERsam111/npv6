import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2 } from "lucide-react";

interface DistributionParameterDialogProps {
  currentValue: string;
  onSave: (value: string) => void;
}

const DISTRIBUTIONS = [
  { name: "Normal", params: ["mean", "std"], format: "Normal(mean, std)" },
  { name: "Uniform", params: ["min", "max"], format: "Uniform(min, max)" },
  { name: "Exponential", params: ["lambda"], format: "Exponential(lambda)" },
  { name: "Poisson", params: ["lambda"], format: "Poisson(lambda)" },
  { name: "Lognormal", params: ["mean", "std"], format: "Lognormal(mean, std)" },
  { name: "Gamma", params: ["shape", "scale"], format: "Gamma(shape, scale)" },
  { name: "Weibull", params: ["shape", "scale"], format: "Weibull(shape, scale)" },
  { name: "Triangular", params: ["min", "mode", "max"], format: "Triangular(min, mode, max)" },
  { name: "Beta", params: ["alpha", "beta"], format: "Beta(alpha, beta)" },
  { name: "Constant", params: ["value"], format: "Constant(value)" },
];

export const DistributionParameterDialog = ({
  currentValue,
  onSave,
}: DistributionParameterDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedDist, setSelectedDist] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    // Parse current value to pre-fill form
    if (currentValue) {
      const match = currentValue.match(/^(\w+)\((.*)\)$/);
      if (match) {
        const distName = match[1];
        const paramValues = match[2].split(",").map((v) => v.trim());
        const dist = DISTRIBUTIONS.find((d) => d.name === distName);
        
        if (dist) {
          setSelectedDist(distName);
          const paramObj: Record<string, string> = {};
          dist.params.forEach((param, idx) => {
            paramObj[param] = paramValues[idx] || "";
          });
          setParams(paramObj);
        }
      }
    }
  }, [currentValue, open]);

  const handleSave = () => {
    const dist = DISTRIBUTIONS.find((d) => d.name === selectedDist);
    if (dist) {
      const paramValues = dist.params.map((p) => params[p] || "0").join(", ");
      const result = `${selectedDist}(${paramValues})`;
      onSave(result);
      setOpen(false);
    }
  };

  const selectedDistribution = DISTRIBUTIONS.find((d) => d.name === selectedDist);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Settings2 className="h-3 w-3 mr-1" />
          {currentValue || "Set Distribution"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Quantity Distribution</DialogTitle>
          <DialogDescription>
            Select a probability distribution and enter its parameters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="distribution">Distribution Type</Label>
            <Select value={selectedDist} onValueChange={setSelectedDist}>
              <SelectTrigger id="distribution">
                <SelectValue placeholder="Select distribution" />
              </SelectTrigger>
              <SelectContent>
                {DISTRIBUTIONS.map((dist) => (
                  <SelectItem key={dist.name} value={dist.name}>
                    {dist.format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDistribution && (
            <div className="space-y-3 border-t pt-3">
              <Label className="text-sm font-semibold">Parameters</Label>
              {selectedDistribution.params.map((param) => (
                <div key={param} className="space-y-1">
                  <Label htmlFor={param} className="text-sm capitalize">
                    {param}
                  </Label>
                  <Input
                    id={param}
                    type="number"
                    value={params[param] || ""}
                    onChange={(e) =>
                      setParams({ ...params, [param]: e.target.value })
                    }
                    placeholder={`Enter ${param}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!selectedDist}>
            Save Distribution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
