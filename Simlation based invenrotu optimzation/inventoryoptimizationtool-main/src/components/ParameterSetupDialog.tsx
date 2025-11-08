import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

interface ParameterConfig {
  name: string;
  min: number;
  max: number;
  step: number;
}

interface ParameterSetupDialogProps {
  facilityName: string;
  productName: string;
  simulationPolicy: string;
  parameters: ParameterConfig[];
  onSave: (parameters: ParameterConfig[]) => void;
}

// Get default parameters based on simulation policy
const getDefaultParameters = (policy: string): ParameterConfig[] => {
  switch (policy) {
    case "(s,S)":
      return [
        { name: "s", min: 100, max: 200, step: 50 },
        { name: "S", min: 500, max: 800, step: 100 }
      ];
    case "(R,S)":
      return [
        { name: "R", min: 1, max: 7, step: 1 },
        { name: "S", min: 500, max: 800, step: 100 }
      ];
    case "Unlimited":
      return [];
    default:
      return [];
  }
};

export const ParameterSetupDialog = ({ 
  facilityName, 
  productName, 
  simulationPolicy, 
  parameters: initialParameters,
  onSave 
}: ParameterSetupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [parameters, setParameters] = useState<ParameterConfig[]>(initialParameters);

  // Auto-populate parameters when dialog opens if they're empty
  useEffect(() => {
    if (open && parameters.length === 0 && simulationPolicy) {
      const defaultParams = getDefaultParameters(simulationPolicy);
      setParameters(defaultParams);
    }
  }, [open, parameters.length, simulationPolicy]);

  const handleSave = () => {
    onSave(parameters);
    setOpen(false);
  };

  const updateParameter = (index: number, field: keyof ParameterConfig, value: number) => {
    const newParameters = [...parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setParameters(newParameters);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="h-8"
      >
        <Settings className="h-4 w-4 mr-1" />
        Setup
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Parameter Setup</DialogTitle>
            <DialogDescription>
              Configure min, max, and step values for each parameter
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-accent/30 p-4 rounded-lg border border-border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Facility:</span>
                  <span className="ml-2 font-medium">{facilityName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Product:</span>
                  <span className="ml-2 font-medium">{productName}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Simulation Policy:</span>
                  <span className="ml-2 font-medium">{simulationPolicy}</span>
                </div>
              </div>
            </div>

            {parameters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No parameters required for this simulation policy.</p>
                <p className="text-sm mt-2">Select a policy like (s,S) or (R,S) to configure parameters.</p>
              </div>
            ) : (
              parameters.map((param, index) => (
                <div key={param.name} className="border border-border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Parameter: {param.name}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`min-${index}`}>Min Value</Label>
                      <Input
                        id={`min-${index}`}
                        type="number"
                        value={param.min}
                        onChange={(e) => updateParameter(index, 'min', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`max-${index}`}>Max Value</Label>
                      <Input
                        id={`max-${index}`}
                        type="number"
                        value={param.max}
                        onChange={(e) => updateParameter(index, 'max', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`step-${index}`}>Step Size</Label>
                      <Input
                        id={`step-${index}`}
                        type="number"
                        value={param.step}
                        onChange={(e) => updateParameter(index, 'step', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={parameters.length === 0}>
              Save Parameters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
