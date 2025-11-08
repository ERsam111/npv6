import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, DollarSign, Target, Percent } from "lucide-react";
import { Scenario3Output, Scenario3KPIs } from "@/types/scenario3";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceDot,
} from "recharts";
import * as XLSX from "xlsx";

interface Scenario3ResultsProps {
  results: Scenario3Output[];
  scenario1Data?: any;
  scenario2Data?: any;
}

export function Scenario3Results({ results, scenario1Data, scenario2Data }: Scenario3ResultsProps) {
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(["scenario1", "scenario2", "scenario3"]);
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  const formatDate = (d: Date | string) => new Date(d).toISOString().split("T")[0];

  const kpis: Scenario3KPIs = {
    totalAdjustedUnits: results.reduce((sum, r) => sum + r.adjusted_forecast_units, 0),
    totalRevenue: results.reduce((sum, r) => sum + r.adjusted_forecast_units * r.actual_price, 0),
    avgVolumeLift:
      results.reduce((sum, r) => sum + (r.adjusted_forecast_units - r.scenario2_forecast), 0) / results.length,
    avgDiscountPercent: results.reduce((sum, r) => sum + r.discount_rate, 0) / results.length,
    percentDiffVsScenario2: 0,
    percentDiffVsTarget: 0,
  };

  const totalScenario2 = results.reduce((sum, r) => sum + r.scenario2_forecast, 0);
  kpis.percentDiffVsScenario2 =
    totalScenario2 > 0 ? ((kpis.totalAdjustedUnits - totalScenario2) / totalScenario2) * 100 : 0;

  const resultsWithTarget = results.filter((r) => r.target_units);
  if (resultsWithTarget.length > 0) {
    const totalTarget = resultsWithTarget.reduce((sum, r) => sum + (r.target_units || 0), 0);
    kpis.percentDiffVsTarget = totalTarget > 0 ? ((kpis.totalAdjustedUnits - totalTarget) / totalTarget) * 100 : 0;
  }

  // Prepare timeline chart data
  const timelineMap: Record<
    string,
    {
      period: string;
      scenario1: number;
      scenario2: number;
      scenario3: number;
      hasS2?: boolean;
      hasS3?: boolean;
    }
  > = {};

  if (scenario1Data?.results) {
    const baseline = scenario1Data.results.find((r: any) => r.isRecommended)?.predictions || [];
    baseline.forEach((p: any) => {
      const date = formatDate(p.date);
      timelineMap[date] = {
        period: date,
        scenario1: p.predicted,
        scenario2: p.predicted,
        scenario3: p.predicted,
      };
    });
  }

  if (scenario2Data) {
    scenario2Data.forEach((s2: any) => {
      const date = formatDate(s2.period);
      if (timelineMap[date]) {
        const base = s2.baselineForecast || 0;
        timelineMap[date].scenario2 = timelineMap[date].scenario2 - base + s2.adjustedForecast;
        timelineMap[date].scenario3 = timelineMap[date].scenario2;
        timelineMap[date].hasS2 = true;
      }
    });
  }

  results.forEach((r) => {
    const date = formatDate(r.period);
    if (timelineMap[date]) {
      timelineMap[date].scenario3 = timelineMap[date].scenario3 - r.scenario2_forecast + r.adjusted_forecast_units;
      timelineMap[date].hasS3 = true;
    }
  });

  const timelineData = Object.values(timelineMap).sort((a, b) => a.period.localeCompare(b.period));

  const toggleScenario = (s: string) =>
    setSelectedScenarios((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const productOptions = Array.from(new Set(results.map((r) => r.product_name)));
  const filteredResults =
    selectedProduct === "all" ? results : results.filter((r) => r.product_name === selectedProduct);

  const handleExport = () => {
    const data = filteredResults.map((r) => ({
      product: r.product_name,
      period: formatDate(r.period),
      scenario2: r.scenario2_forecast,
      scenario3: r.adjusted_forecast_units,
      revenue: r.adjusted_forecast_units * r.actual_price,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scenario3");
    XLSX.writeFile(wb, `scenario3_${formatDate(new Date())}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <KPI
          title="Adjusted Units"
          icon={<TrendingUp className="w-4 h-4" />}
          value={kpis.totalAdjustedUnits}
          suffix={` (${kpis.percentDiffVsScenario2.toFixed(1)}%)`}
        />
        <KPI title="Total Revenue" icon={<DollarSign className="w-4 h-4" />} value={kpis.totalRevenue} prefix="$" />
        <KPI title="Avg Lift" icon={<Target className="w-4 h-4" />} value={kpis.avgVolumeLift} />
        <KPI title="Avg Discount" icon={<Percent className="w-4 h-4" />} value={kpis.avgDiscountPercent} suffix="%" />
      </div>

      {/* Product Filter */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Filter by product:</span>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="all">All</option>
          {productOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Scenario Badges */}
      <div className="flex gap-2 mt-2">
        {["scenario1", "scenario2", "scenario3"].map((s) => (
          <Badge
            key={s}
            variant={selectedScenarios.includes(s) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleScenario(s)}
          >
            {s === "scenario1" && "Scenario 1 (Baseline)"}
            {s === "scenario2" && "Scenario 2 (Manual)"}
            {s === "scenario3" && "Scenario 3 (Elasticity)"}
          </Badge>
        ))}
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Forecast Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="s2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="s3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" angle={-45} textAnchor="end" height={90} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {selectedScenarios.includes("scenario1") && (
                <Area type="monotone" dataKey="scenario1" stroke="#3b82f6" fill="url(#s1)" name="Scenario 1" />
              )}
              {selectedScenarios.includes("scenario2") && (
                <Area type="monotone" dataKey="scenario2" stroke="#22c55e" fill="url(#s2)" name="Scenario 2" />
              )}
              {selectedScenarios.includes("scenario3") && (
                <Area type="monotone" dataKey="scenario3" stroke="#a855f7" fill="url(#s3)" name="Scenario 3" />
              )}
              {timelineData.map((d, i) =>
                d.hasS2 ? (
                  <ReferenceDot key={`s2-${i}`} x={d.period} y={d.scenario2} r={5} fill="#facc15" stroke="#eab308" />
                ) : null,
              )}
              {timelineData.map((d, i) =>
                d.hasS3 ? (
                  <ReferenceDot key={`s3-${i}`} x={d.period} y={d.scenario3} r={5} fill="#a855f7" stroke="#9333ea" />
                ) : null,
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Forecast Table</CardTitle>
            <CardDescription>Scenario 2 vs Scenario 3 with Revenue</CardDescription>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[500px]">
            <Table className="min-w-[1400px]">
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Scenario 2</TableHead>
                  <TableHead className="text-right">Scenario 3</TableHead>
                  <TableHead className="text-right">Lift</TableHead>
                  <TableHead className="text-right">Target Units</TableHead>
                  <TableHead className="text-right">Recommended Discount</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead>Recommendation Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((r, idx) => {
                  const lift = r.adjusted_forecast_units - r.scenario2_forecast;
                  const revenue = r.adjusted_forecast_units * r.actual_price;
                  return (
                    <TableRow key={idx}>
                      <TableCell>{r.product_name}</TableCell>
                      <TableCell>{formatDate(r.period)}</TableCell>
                      <TableCell className="text-right">{Math.round(r.scenario2_forecast)}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {Math.round(r.adjusted_forecast_units)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={lift >= 0 ? "text-green-600" : "text-red-600"}>
                          {lift >= 0 ? "+" : ""}
                          {Math.round(lift)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.target_units ? Math.round(r.target_units).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.recommended_discount_percent ? (
                          <span className="font-semibold text-orange-600">
                            {r.recommended_discount_percent.toFixed(1)}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">${Math.round(revenue).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={r.notes}>
                        {r.notes}
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

const KPI = ({
  title,
  icon,
  value,
  prefix = "",
  suffix = "",
}: {
  title: string;
  icon: React.ReactNode;
  value: number;
  prefix?: string;
  suffix?: string;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {prefix}
        {Math.round(value).toLocaleString()}
        {suffix}
      </div>
    </CardContent>
  </Card>
);
