import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ForecastResult, HistoricalDataPoint } from "@/types/forecasting";
import { Calendar, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface ManualAdjustmentProps {
  forecastResults: ForecastResult[];
  historicalData: HistoricalDataPoint[];
  selectedProduct: string;
  granularity: "daily" | "weekly" | "monthly";
  onAdjustmentsChange: (adjustedResults: ForecastResult[]) => void;
  uniqueProducts: string[];
  onProductChange: (product: string) => void;
}

export function ManualAdjustment({
  forecastResults,
  historicalData,
  selectedProduct,
  granularity,
  onAdjustmentsChange,
  uniqueProducts,
  onProductChange
}: ManualAdjustmentProps) {
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [selectedModelId, setSelectedModelId] = useState<string>(
    forecastResults.find(r => r.isRecommended)?.modelId || forecastResults[0]?.modelId || ""
  );

  const selectedModel = forecastResults.find(r => r.modelId === selectedModelId);

  const handleAdjustment = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAdjustments(prev => ({
        ...prev,
        [`${selectedModelId}-${index}`]: numValue
      }));
    }
  };

  const applyAdjustments = () => {
    const adjustedResults = forecastResults.map(result => {
      if (result.modelId !== selectedModelId) return result;

      const adjustedPredictions = result.predictions.map((pred, idx) => {
        const key = `${selectedModelId}-${idx}`;
        const adjustedValue = adjustments[key] !== undefined ? adjustments[key] : pred.predicted;
        return {
          date: pred.date,
          predicted: adjustedValue
        };
      });

      return {
        ...result,
        predictions: adjustedPredictions
      };
    });

    onAdjustmentsChange(adjustedResults);
    toast.success("Manual adjustments applied successfully");
  };

  const resetAdjustments = () => {
    setAdjustments({});
    toast.info("All adjustments reset");
  };

  if (!selectedModel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manual Adjustment</CardTitle>
          <CardDescription>No forecast data available. Please run forecasting first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Manual Forecast Adjustment
          </CardTitle>
          <CardDescription>
            Manually adjust forecast values for {selectedProduct} based on expert judgment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={onProductChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueProducts.map(product => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Forecast Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {forecastResults.map(result => (
                    <SelectItem key={result.modelId} value={result.modelId}>
                      {result.modelName} {result.isRecommended && "⭐"} - MAPE: {result.mape.toFixed(2)}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyAdjustments} className="gap-2">
              <Save className="h-4 w-4" />
              Apply Adjustments
            </Button>
            <Button onClick={resetAdjustments} variant="outline" className="gap-2">
              <Undo2 className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forecast Values</CardTitle>
          <CardDescription>
            Adjust individual forecast periods (Granularity: {granularity})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Original Forecast</TableHead>
                  <TableHead>Adjusted Value</TableHead>
                  <TableHead>Change (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedModel.predictions.map((pred, idx) => {
                  const key = `${selectedModelId}-${idx}`;
                  const adjusted = adjustments[key] !== undefined ? adjustments[key] : pred.predicted;
                  const change = ((adjusted - pred.predicted) / pred.predicted * 100).toFixed(1);

                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        Period {idx + 1}
                      </TableCell>
                      <TableCell>{pred.predicted.toFixed(2)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={adjustments[key] !== undefined ? adjustments[key] : pred.predicted}
                          onChange={(e) => handleAdjustment(idx, e.target.value)}
                          step="0.01"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className={
                        parseFloat(change) > 0 ? "text-green-600" : 
                        parseFloat(change) < 0 ? "text-red-600" : ""
                      }>
                        {change !== "0.0" && (parseFloat(change) > 0 ? "+" : "")}{change}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
