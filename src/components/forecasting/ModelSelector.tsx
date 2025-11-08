import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FORECASTING_MODELS } from "@/utils/forecastingModels";
import { Brain } from "lucide-react";

interface ModelSelectorProps {
  selectedModels: string[];
  onModelToggle: (modelId: string) => void;
  modelParams: Record<string, any>;
  onParamChange: (modelId: string, paramName: string, value: number) => void;
  granularity: "daily" | "weekly" | "monthly";
}

export function ModelSelector({ selectedModels, onModelToggle, modelParams, onParamChange, granularity }: ModelSelectorProps) {
  const getGranularityLabel = () => {
    return granularity === "daily" ? "days" : granularity === "weekly" ? "weeks" : "months";
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Select Forecasting Models
        </CardTitle>
        <CardDescription>
          Choose one or more models to compare their predictions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {FORECASTING_MODELS.map((model) => (
          <div key={model.id} className="space-y-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id={model.id}
                checked={selectedModels.includes(model.id)}
                onCheckedChange={() => onModelToggle(model.id)}
              />
              <div className="grid gap-1.5 leading-none flex-1">
                <Label
                  htmlFor={model.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {model.name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {model.description}
                </p>
              </div>
            </div>
            
            {/* Model-specific parameters */}
            {selectedModels.includes(model.id) && (
              <div className="ml-8 space-y-2">
                {model.id === "moving_average" && (
                  <div className="space-y-1">
                    <Label htmlFor={`${model.id}-window`} className="text-xs text-muted-foreground">
                      Window Period ({getGranularityLabel()})
                    </Label>
                    <Input
                      id={`${model.id}-window`}
                      type="number"
                      min="2"
                      max={granularity === "daily" ? 30 : granularity === "weekly" ? 12 : 12}
                      value={modelParams[model.id]?.window || 3}
                      onChange={(e) => onParamChange(model.id, "window", Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                )}
                
                {model.id === "exponential_smoothing" && (
                  <div className="space-y-1">
                    <Label htmlFor={`${model.id}-alpha`} className="text-xs text-muted-foreground">
                      Alpha (smoothing factor: 0-1)
                    </Label>
                    <Input
                      id={`${model.id}-alpha`}
                      type="number"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={modelParams[model.id]?.alpha || 0.3}
                      onChange={(e) => onParamChange(model.id, "alpha", Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                )}
                
                {model.id === "weighted_moving_average" && (
                  <div className="space-y-1">
                    <Label htmlFor={`${model.id}-window`} className="text-xs text-muted-foreground">
                      Window Period ({getGranularityLabel()})
                    </Label>
                    <Input
                      id={`${model.id}-window`}
                      type="number"
                      min="2"
                      max={granularity === "daily" ? 30 : granularity === "weekly" ? 12 : 12}
                      value={modelParams[model.id]?.window || 3}
                      onChange={(e) => onParamChange(model.id, "window", Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                )}
                
                {model.id === "seasonal_naive" && (
                  <div className="space-y-1">
                    <Label htmlFor={`${model.id}-seasonLength`} className="text-xs text-muted-foreground">
                      Season Length ({getGranularityLabel()})
                    </Label>
                    <Input
                      id={`${model.id}-seasonLength`}
                      type="number"
                      min="1"
                      max={granularity === "daily" ? 365 : granularity === "weekly" ? 52 : 24}
                      value={modelParams[model.id]?.seasonLength || (granularity === "daily" ? 7 : granularity === "weekly" ? 4 : 12)}
                      onChange={(e) => onParamChange(model.id, "seasonLength", Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                )}
                
                {model.id === "holt_winters" && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-alpha`} className="text-xs text-muted-foreground">
                        Alpha - Level (0-1)
                      </Label>
                      <Input
                        id={`${model.id}-alpha`}
                        type="number"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={modelParams[model.id]?.alpha || 0.3}
                        onChange={(e) => onParamChange(model.id, "alpha", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-beta`} className="text-xs text-muted-foreground">
                        Beta - Trend (0-1)
                      </Label>
                      <Input
                        id={`${model.id}-beta`}
                        type="number"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={modelParams[model.id]?.beta || 0.1}
                        onChange={(e) => onParamChange(model.id, "beta", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-gamma`} className="text-xs text-muted-foreground">
                        Gamma - Seasonality (0-1)
                      </Label>
                      <Input
                        id={`${model.id}-gamma`}
                        type="number"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={modelParams[model.id]?.gamma || 0.1}
                        onChange={(e) => onParamChange(model.id, "gamma", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-seasonLength`} className="text-xs text-muted-foreground">
                        Season Length ({getGranularityLabel()})
                      </Label>
                      <Input
                        id={`${model.id}-seasonLength`}
                        type="number"
                        min="1"
                        max={granularity === "daily" ? 365 : granularity === "weekly" ? 52 : 24}
                        value={modelParams[model.id]?.seasonLength || (granularity === "daily" ? 7 : granularity === "weekly" ? 4 : 12)}
                        onChange={(e) => onParamChange(model.id, "seasonLength", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
                
                {model.id === "random_forest" && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-nTrees`} className="text-xs text-muted-foreground">
                        Number of Trees
                      </Label>
                      <Input
                        id={`${model.id}-nTrees`}
                        type="number"
                        min="5"
                        max="50"
                        value={modelParams[model.id]?.nTrees || 10}
                        onChange={(e) => onParamChange(model.id, "nTrees", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-windowSize`} className="text-xs text-muted-foreground">
                        Window Size ({getGranularityLabel()})
                      </Label>
                      <Input
                        id={`${model.id}-windowSize`}
                        type="number"
                        min="3"
                        max={granularity === "daily" ? 30 : 12}
                        value={modelParams[model.id]?.windowSize || 5}
                        onChange={(e) => onParamChange(model.id, "windowSize", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
                
                {model.id === "arima" && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-p`} className="text-xs text-muted-foreground">
                        p - AR order
                      </Label>
                      <Input
                        id={`${model.id}-p`}
                        type="number"
                        min="0"
                        max="5"
                        value={modelParams[model.id]?.p || 2}
                        onChange={(e) => onParamChange(model.id, "p", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-d`} className="text-xs text-muted-foreground">
                        d - Integration order
                      </Label>
                      <Input
                        id={`${model.id}-d`}
                        type="number"
                        min="0"
                        max="2"
                        value={modelParams[model.id]?.d || 1}
                        onChange={(e) => onParamChange(model.id, "d", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${model.id}-q`} className="text-xs text-muted-foreground">
                        q - MA order
                      </Label>
                      <Input
                        id={`${model.id}-q`}
                        type="number"
                        min="0"
                        max="5"
                        value={modelParams[model.id]?.q || 2}
                        onChange={(e) => onParamChange(model.id, "q", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
