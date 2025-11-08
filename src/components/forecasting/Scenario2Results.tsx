import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Scenario2AdjustmentWithForecast, Scenario2Summary } from "@/types/scenario2";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

interface Scenario2ResultsProps {
  adjustments: Scenario2AdjustmentWithForecast[];
  scenario1Data?: any;
}

export function Scenario2Results({ adjustments, scenario1Data }: Scenario2ResultsProps) {
  const summary: Scenario2Summary = {
    totalBaseline: adjustments.reduce((sum, a) => sum + a.baselineForecast, 0),
    totalAdjusted: adjustments.reduce((sum, a) => sum + a.adjustedForecast, 0),
    totalDifference: 0,
    percentageChange: 0,
    productsAdjusted: new Set(adjustments.map(a => a.product)).size
  };

  summary.totalDifference = summary.totalAdjusted - summary.totalBaseline;
  summary.percentageChange = summary.totalBaseline > 0 
    ? (summary.totalDifference / summary.totalBaseline) * 100 
    : 0;

  // Prepare complete chart data with all baseline periods + continuous adjusted line
  const chartDataMap = new Map<string, { baseline: number; adjusted: number }>();
  
  // Add all baseline periods from Scenario 1
  if (scenario1Data?.results) {
    const recommended = scenario1Data.results.find((r: any) => r.isRecommended);
    if (recommended?.predictions) {
      recommended.predictions.forEach((pred: any) => {
        const period = new Date(pred.date).toISOString().split('T')[0];
        chartDataMap.set(period, { baseline: pred.predicted, adjusted: pred.predicted });
      });
    }
  }
  
  // Overlay adjusted values where adjustments exist
  adjustments.forEach(adj => {
    const period = adj.period.toISOString().split('T')[0];
    const existing = chartDataMap.get(period);
    if (existing) {
      existing.adjusted = adj.adjustedForecast;
    } else {
      chartDataMap.set(period, { baseline: adj.baselineForecast, adjusted: adj.adjustedForecast });
    }
  });
  
  const chartData = Array.from(chartDataMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, data]) => ({
      period,
      baseline: data.baseline,
      adjusted: data.adjusted
    }));

  const handleExport = () => {
    const exportData = adjustments.map(a => ({
      product: a.product,
      period: a.period.toISOString().split('T')[0],
      baseline_forecast: a.baselineForecast,
      adjustment_type: a.adjustmentType,
      adjustment_value: a.adjustmentValue,
      adjusted_forecast: a.adjustedForecast.toFixed(2),
      difference: (a.adjustedForecast - a.baselineForecast).toFixed(2),
      percent_change: a.baselineForecast > 0 
        ? (((a.adjustedForecast - a.baselineForecast) / a.baselineForecast) * 100).toFixed(2)
        : 0,
      notes: a.notes || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scenario2Results");
    XLSX.writeFile(wb, `scenario2_results_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Baseline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summary.totalBaseline).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Original forecast total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {summary.percentageChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              Total Adjusted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summary.totalAdjusted).toLocaleString()}</div>
            <p className={`text-xs mt-1 ${summary.percentageChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.percentageChange > 0 ? "+" : ""}{summary.percentageChange.toFixed(1)}% change
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Difference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.totalDifference > 0 ? "+" : ""}{Math.round(summary.totalDifference).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.productsAdjusted} product(s) adjusted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Forecast Timeline</CardTitle>
          <CardDescription>Continuous forecast showing all periods (baseline + adjustments)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="period" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                tick={{ fontSize: 10 }}
              />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar 
                dataKey="baseline" 
                fill="hsl(220, 70%, 50%)" 
                fillOpacity={0.6}
                name="Baseline (Scenario 1)" 
              />
              <Line 
                type="monotone" 
                dataKey="adjusted" 
                stroke="hsl(142, 71%, 45%)" 
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isAdjusted = payload.baseline !== payload.adjusted;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={isAdjusted ? 5 : 3} 
                      fill={isAdjusted ? "hsl(142, 71%, 45%)" : "hsl(220, 70%, 50%)"} 
                      stroke="white"
                      strokeWidth={isAdjusted ? 2 : 1}
                    />
                  );
                }}
                name="Adjusted (Scenario 2)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Detailed Adjustments</CardTitle>
            <CardDescription>All manual adjustments applied to baseline forecasts</CardDescription>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead>Adjustment Type</TableHead>
                  <TableHead className="text-right">Adjustment</TableHead>
                  <TableHead className="text-right">Adjusted Forecast</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">% Change</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adj, idx) => {
                  const diff = adj.adjustedForecast - adj.baselineForecast;
                  const pctChange = adj.baselineForecast > 0 
                    ? ((diff / adj.baselineForecast) * 100)
                    : 0;
                  
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{adj.product}</TableCell>
                      <TableCell>{adj.period.toISOString().split('T')[0]}</TableCell>
                      <TableCell className="text-right">{Math.round(adj.baselineForecast).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {adj.adjustmentType === "units" ? "Units" : "Percentage"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {adj.adjustmentValue > 0 ? "+" : ""}{adj.adjustmentValue}
                        {adj.adjustmentType === "percentage" ? "%" : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {Math.round(adj.adjustedForecast).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={diff >= 0 ? "text-green-600" : "text-red-600"}>
                          {diff > 0 ? "+" : ""}{Math.round(diff).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={pctChange >= 0 ? "text-green-600" : "text-red-600"}>
                          {pctChange > 0 ? "+" : ""}{pctChange.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={adj.notes}>
                        {adj.notes || "–"}
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
