import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Trash2, Eye, EyeOff } from "lucide-react";
import { HistoricalDataPoint } from "@/types/forecasting";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface OutlierDetectionProps {
  data: HistoricalDataPoint[];
  onRemoveOutliers: (outlierIndices: number[]) => void;
}

type OutlierMethod = "iqr" | "zscore" | "modified-zscore";

export function OutlierDetection({ data, onRemoveOutliers }: OutlierDetectionProps) {
  const [method, setMethod] = useState<OutlierMethod>("iqr");
  const [showOutliers, setShowOutliers] = useState(true);

  const outlierAnalysis = useMemo(() => {
    if (data.length === 0) return null;

    const demands = data.map((d) => d.demand);
    const mean = demands.reduce((a, b) => a + b, 0) / demands.length;
    const sortedDemands = [...demands].sort((a, b) => a - b);

    // Calculate thresholds based on method
    let lowerThreshold = 0;
    let upperThreshold = Infinity;

    if (method === "iqr") {
      // Interquartile Range method
      const q1Index = Math.floor(sortedDemands.length * 0.3);
      const q3Index = Math.floor(sortedDemands.length * 0.7);
      const q1 = sortedDemands[q1Index];
      const q3 = sortedDemands[q3Index];
      const iqr = q3 - q1;
      lowerThreshold = q1 - 1.5 * iqr;
      upperThreshold = q3 + 1.5 * iqr;
    } else if (method === "zscore") {
      // Z-score method (3 standard deviations)
      const variance = demands.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / demands.length;
      const stdDev = Math.sqrt(variance);
      lowerThreshold = mean - 3 * stdDev;
      upperThreshold = mean + 3 * stdDev;
    } else if (method === "modified-zscore") {
      // Modified Z-score using median
      const median = sortedDemands[Math.floor(sortedDemands.length / 2)];
      const mad = sortedDemands.reduce((acc, val) => acc + Math.abs(val - median), 0) / sortedDemands.length;
      lowerThreshold = median - 3.5 * mad;
      upperThreshold = median + 3.5 * mad;
    }

    // Identify outliers
    const outlierIndices: number[] = [];
    const outlierPoints: Array<{ date: string; demand: number; isOutlier: boolean }> = [];

    data.forEach((d, idx) => {
      const isOutlier = d.demand < lowerThreshold || d.demand > upperThreshold;
      if (isOutlier) {
        outlierIndices.push(idx);
      }
      outlierPoints.push({
        date: d.date.toISOString().split("T")[0],
        demand: d.demand,
        isOutlier,
      });
    });

    return {
      outlierIndices,
      outlierPoints,
      lowerThreshold,
      upperThreshold,
      mean,
      count: outlierIndices.length,
      percentage: (outlierIndices.length / data.length) * 100,
    };
  }, [data, method]);

  if (!outlierAnalysis) return null;

  const handleRemoveOutliers = () => {
    onRemoveOutliers(outlierAnalysis.outlierIndices);
  };

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Outlier Detection
            </CardTitle>
            <CardDescription>Identify and remove anomalous data points</CardDescription>
          </div>
          {outlierAnalysis.count > 0 && (
            <Badge variant="destructive">
              {outlierAnalysis.count} outliers ({outlierAnalysis.percentage.toFixed(1)}%)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label>Detection Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as OutlierMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iqr">IQR (Interquartile Range)</SelectItem>
                <SelectItem value="zscore">Z-Score (3σ)</SelectItem>
                <SelectItem value="modified-zscore">Modified Z-Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowOutliers(!showOutliers)}>
              {showOutliers ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {showOutliers ? "Hide" : "Show"}
            </Button>
            {outlierAnalysis.count > 0 && (
              <Button variant="destructive" size="sm" onClick={handleRemoveOutliers}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Outliers
              </Button>
            )}
          </div>
        </div>

        {showOutliers && (
          <>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Lower Threshold</div>
                <div className="text-lg font-bold">{Math.round(outlierAnalysis.lowerThreshold)}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Mean</div>
                <div className="text-lg font-bold">{Math.round(outlierAnalysis.mean)}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Upper Threshold</div>
                <div className="text-lg font-bold">{Math.round(outlierAnalysis.upperThreshold)}</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" name="Date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis dataKey="demand" name="Demand" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value: number) => Math.round(value)} />
                <ReferenceLine
                  y={outlierAnalysis.upperThreshold}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label={{ value: "Upper", position: "right", fontSize: 10 }}
                />
                <ReferenceLine
                  y={outlierAnalysis.mean}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  label={{ value: "Mean", position: "right", fontSize: 10 }}
                />
                <ReferenceLine
                  y={outlierAnalysis.lowerThreshold}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label={{ value: "Lower", position: "right", fontSize: 10 }}
                />
                <Scatter
                  data={outlierAnalysis.outlierPoints.filter((p) => !p.isOutlier)}
                  fill="hsl(var(--primary))"
                  name="Normal"
                />
                <Scatter
                  data={outlierAnalysis.outlierPoints.filter((p) => p.isOutlier)}
                  fill="hsl(var(--destructive))"
                  name="Outlier"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
