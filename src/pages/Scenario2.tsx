import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Scenario2Input } from "@/components/forecasting/Scenario2Input";
import { Scenario2Results } from "@/components/forecasting/Scenario2Results";
import { Scenario2Adjustment, Scenario2AdjustmentWithForecast } from "@/types/scenario2";
import { useToast } from "@/hooks/use-toast";
import { getScenario1Results, getScenario2Results, saveScenario2Results } from "@/utils/scenarioStorage";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Scenario2 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<Scenario2Adjustment[]>([]);
  const [enrichedAdjustments, setEnrichedAdjustments] = useState<Scenario2AdjustmentWithForecast[]>([]);
  const [scenario1Data, setScenario1Data] = useState<any>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  useEffect(() => {
    // Load Scenario 1 results
    const data = getScenario1Results();
    if (data) {
      setScenario1Data(data);
      // Auto-select recommended model or first model
      const recommended = data.results.find((r: any) => r.isRecommended);
      if (recommended) {
        setSelectedModelId(recommended.modelId);
      } else if (data.results.length > 0) {
        setSelectedModelId(data.results[0].modelId);
      }
    }
    
    // Load saved Scenario 2 results
    const saved = getScenario2Results();
    if (saved) {
      setEnrichedAdjustments(saved);
    }
  }, []);

  const calculateAdjustedForecast = (baseline: number, type: "units" | "percentage", value: number): number => {
    if (type === "units") {
      return baseline + value;
    } else {
      return baseline * (1 + value / 100);
    }
  };

  const handleAdjustmentsSubmit = (data: Scenario2Adjustment[]) => {
    setAdjustments(data);
    
    // Enrich adjustments with baseline and calculated forecasts from Scenario 1
    if (!scenario1Data) {
      toast({
        title: "No baseline data",
        description: "Import from Scenario 1 first to see detailed results",
        variant: "destructive"
      });
      return;
    }

    const selectedModel = scenario1Data.results.find((r: any) => r.modelId === selectedModelId);
    if (!selectedModel) {
      toast({
        title: "No forecast data",
        description: "Complete Scenario 1 or select a model",
        variant: "destructive"
      });
      return;
    }

    const enriched: Scenario2AdjustmentWithForecast[] = [];
    
    data.forEach(adj => {
      // Find all predictions within the date range
      const predictions = selectedModel.predictions.filter((pred: any) => {
        const predDate = new Date(pred.date);
        return predDate >= adj.fromPeriod && predDate <= adj.toPeriod;
      });

      predictions.forEach((pred: any) => {
        enriched.push({
          ...adj,
          period: new Date(pred.date),
          baselineForecast: pred.predicted,
          adjustedForecast: calculateAdjustedForecast(pred.predicted, adj.adjustmentType, adj.adjustmentValue)
        });
      });
    });

    setEnrichedAdjustments(enriched);
    
    // Save enriched results for Scenario 3
    saveScenario2Results(enriched);
    
    toast({
      title: "Adjustments applied",
      description: `Applied ${data.length} adjustments across ${enriched.length} periods. Results saved for Scenario 3.`
    });
  };

  const handleImportFromScenario1 = () => {
    if (!scenario1Data) {
      toast({
        title: "No Scenario 1 data",
        description: "Please complete Scenario 1 first",
        variant: "destructive"
      });
      return;
    }

    // Convert selected model forecasts to Scenario 2 adjustments
    const selectedModel = scenario1Data.results.find((r: any) => r.modelId === selectedModelId);
    if (!selectedModel) {
      toast({
        title: "No model selected",
        description: "Select a forecast model first",
        variant: "destructive"
      });
      return;
    }

    const predictions = selectedModel.predictions;
    const imported: Scenario2Adjustment[] = [{
      product: scenario1Data.product,
      fromPeriod: new Date(predictions[0].date),
      toPeriod: new Date(predictions[predictions.length - 1].date),
      adjustmentType: "percentage" as const,
      adjustmentValue: 0,
      notes: `Imported from ${selectedModel.modelName} baseline`
    }];

    setAdjustments(imported);
    
    toast({
      title: "Data imported",
      description: `Imported baseline date range from ${selectedModel.modelName}`
    });
  };

  // Prepare chart data for Scenario 1 comparison
  const selectedModel = scenario1Data?.results.find((r: any) => r.modelId === selectedModelId);
  const scenario1ChartData = selectedModel?.predictions.map((p: any) => ({
    date: new Date(p.date).toISOString().split('T')[0],
    baseline: p.predicted
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/demand-forecasting")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Scenario 1
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Scenario 2 - Manual Adjustments
              </h1>
              <p className="text-muted-foreground mt-1">
                Apply manual changes to baseline forecasts (add/remove units or percentage changes)
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/scenario3")}
            className="gap-2"
          >
            Next: Scenario 3
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="lg:col-span-1 space-y-6">
            {scenario1Data && (
              <Card>
                <CardHeader>
                  <CardTitle>Scenario 1 Baseline</CardTitle>
                  <CardDescription>
                    {scenario1Data.product} - {scenario1Data.granularity} forecast
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Select Forecast Model</Label>
                    <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose model" />
                      </SelectTrigger>
                      <SelectContent>
                        {scenario1Data.results.map((model: any) => (
                          <SelectItem key={model.modelId} value={model.modelId}>
                            {model.modelName} {model.isRecommended && "⭐"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={scenario1ChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="baseline" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                  <Button onClick={handleImportFromScenario1} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Import Baseline Data
                  </Button>
                </CardContent>
              </Card>
            )}
            <Scenario2Input onAdjustmentsSubmit={handleAdjustmentsSubmit} scenario1Data={scenario1Data} />
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {enrichedAdjustments.length > 0 ? (
              <Scenario2Results adjustments={enrichedAdjustments} scenario1Data={scenario1Data} />
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                <div className="text-center text-muted-foreground p-12">
                  <p className="text-lg font-medium">No adjustments yet</p>
                  <p className="text-sm mt-2">Import baseline from Scenario 1, then apply adjustments to see results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scenario2;
