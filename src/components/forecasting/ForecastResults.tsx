import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Award, TrendingUp, Download, ZoomIn, ZoomOut, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ForecastResult, HistoricalDataPoint } from "@/types/forecasting";

type ViewGran = "daily" | "weekly" | "monthly";
type NativeGranularity = "hourly" | "daily" | "weekly" | "monthly";

interface ForecastResultsProps {
  results: ForecastResult[];
  historicalData: HistoricalDataPoint[]; // { date: Date; demand: number; ... }
  product: string;
  granularity: ViewGran; // "daily" | "weekly" | "monthly"
}

/* -------------------- Date helpers -------------------- */
function isoWeek(d: Date): number {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7)); // Thursday of the same week
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((+dt - +yearStart) / 86400000 + 1) / 7);
}
function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function weekKey(d: Date) {
  const y = d.getFullYear();
  const w = String(isoWeek(d)).padStart(2, "0");
  return `${y}-W${w}`;
}
function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function labelForGranularity(gran: ViewGran) {
  return gran === "daily" ? "Date" : gran === "weekly" ? "Week" : "Month";
}
function formatLabel(key: string, gran: ViewGran) {
  if (gran === "monthly") {
    const [y, m] = key.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(y, (m || 1) - 1, 1));
  }
  return key; // YYYY-Www or YYYY-MM-DD
}

/* -------------------- Native granularity (for info banner) -------------------- */
function detectNativeGranularity(dates: Date[]): NativeGranularity {
  if (dates.length < 2) return "monthly";
  const s = [...dates].sort((a, b) => +a - +b);
  const hrs: number[] = [];
  for (let i = 1; i < s.length; i++) hrs.push((+s[i] - +s[i - 1]) / 3600000);
  hrs.sort((a, b) => a - b);
  const median = hrs.length % 2 ? hrs[(hrs.length - 1) / 2] : (hrs[hrs.length / 2 - 1] + hrs[hrs.length / 2]) / 2;

  if (median < 1.5) return "hourly";
  if (median < 36) return "daily";
  if (median < 10 * 24) return "weekly";
  return "monthly";
}

/* -------------------- SUM aggregator (daily-aware) -------------------- */
/**
 * Step 1: Sum all rows that fall on the same calendar day (handles multiple customers per day).
 * Step 2: If granularity is daily → return day sums.
 *         If weekly/monthly → sum those day sums within the respective bucket.
 */
function aggregateSumByBucketDailyAware(
  points: { date: Date; value: number }[],
  gran: ViewGran,
): Array<{ key: string; value: number }> {
  // Day sums
  const dayTotals = new Map<string, number>();
  for (const p of points) {
    const dk = dayKey(p.date);
    dayTotals.set(dk, (dayTotals.get(dk) ?? 0) + p.value);
  }

  if (gran === "daily") {
    return Array.from(dayTotals.entries())
      .map(([k, sum]) => ({ key: k, value: sum }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  // Sum day totals into week/month
  const bucketTotals = new Map<string, number>();
  for (const [dk, daySum] of dayTotals.entries()) {
    const [y, m, d] = dk.split("-").map(Number);
    const dateObj = new Date(y, (m || 1) - 1, d || 1);
    const bk = gran === "weekly" ? weekKey(dateObj) : monthKey(dateObj);
    bucketTotals.set(bk, (bucketTotals.get(bk) ?? 0) + daySum);
  }

  return Array.from(bucketTotals.entries())
    .map(([k, sum]) => ({ key: k, value: sum }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/* -------------------- Component -------------------- */
export function ForecastResults({ results, historicalData, product, granularity }: ForecastResultsProps) {
  const { toast } = useToast();
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Model filter
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(() => new Set(results.map((r) => r.modelId)));
  const [applyFilterToTable, setApplyFilterToTable] = useState<boolean>(false);

  useEffect(() => {
    setSelectedModelIds(new Set(results.map((r) => r.modelId)));
  }, [results]);

  if (results.length === 0) return null;

  const recommendedIds = useMemo(
    () => new Set(results.filter((r) => r.isRecommended).map((r) => r.modelId)),
    [results],
  );

  // Normalize historical
  const normHistorical = useMemo(
    () =>
      historicalData
        .map((d) => ({
          date: d.date,
          value: Number.isFinite(+d.demand) ? +d.demand : 0,
        }))
        .filter((d) => !Number.isNaN(d.date.getTime())),
    [historicalData],
  );

  // Info banner
  const nativeGranularity: NativeGranularity = useMemo(
    () => detectNativeGranularity(normHistorical.map((d) => d.date)),
    [normHistorical],
  );

  // Aggregate (SUM in all views)
  const historicalAgg = useMemo(
    () => aggregateSumByBucketDailyAware(normHistorical, granularity).map((r) => ({ date: r.key, actual: r.value })),
    [normHistorical, granularity],
  );

  const modelBuckets = useMemo(
    () =>
      results.map((r) => {
        const series = aggregateSumByBucketDailyAware(
          r.predictions.map((p) => ({ date: p.date, value: Number(p.predicted) || 0 })),
          granularity,
        ); // [{key, value}]
        return { modelId: r.modelId, modelName: r.modelName, isRecommended: r.isRecommended, series };
      }),
    [results, granularity],
  );

  // X axis union
  const xKeys = useMemo(() => {
    const s = new Set<string>();
    historicalAgg.forEach((h) => s.add(h.date));
    modelBuckets.forEach((m) => m.series.forEach((p) => s.add(p.key)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [historicalAgg, modelBuckets]);

  // Stable colors
  const modelColorMap = useMemo(() => {
    const palette = [
      "hsl(var(--primary))",
      "hsl(142, 76%, 36%)",
      "hsl(24, 95%, 53%)",
      "hsl(262, 83%, 58%)",
      "hsl(200, 98%, 39%)",
      "hsl(12, 88%, 55%)",
      "hsl(48, 96%, 53%)",
    ];
    const map = new Map<string, string>();
    results.forEach((r, i) => map.set(r.modelId, palette[i % palette.length]));
    return map;
  }, [results]);

  // Lookup maps
  const modelSeriesMap: Record<string, Map<string, number>> = useMemo(() => {
    const out: Record<string, Map<string, number>> = {};
    modelBuckets.forEach((m) => {
      out[m.modelId] = new Map(m.series.map((s) => [s.key, s.value]));
    });
    return out;
  }, [modelBuckets]);

  // Filtered models + rows
  const filteredModels = useMemo(
    () => results.filter((r) => selectedModelIds.has(r.modelId)),
    [results, selectedModelIds],
  );

  const combinedRows = useMemo(() => {
    return xKeys.map((k) => {
      const row: Record<string, any> = { date: k };

      const h = historicalAgg.find((x) => x.date === k);
      row.actual = h ? h.actual : null;

      filteredModels.forEach((m) => {
        const v = modelSeriesMap[m.modelId]?.get(k) ?? null;
        row[m.modelName] = Number.isFinite(v) ? v : null;
      });

      return row;
    });
  }, [xKeys, historicalAgg, filteredModels, modelSeriesMap]);

  // Zoom (tail window)
  const totalDataPoints = combinedRows.length;
  const visibleDataPoints = Math.max(5, Math.ceil((zoomLevel / 100) * totalDataPoints));
  const startIndex = Math.max(0, totalDataPoints - visibleDataPoints);
  const zoomedData = combinedRows.slice(startIndex);

  // Table dataset
  const tableResults = applyFilterToTable ? filteredModels : results;

  // Export CSV
  const exportToCSV = () => {
    const cols = [
      labelForGranularity(granularity),
      "Historical (sum)",
      ...tableResults.map((r) => r.modelName),
      "MAPE",
    ];
    let csv = cols.join(",") + "\n";

    // MAPE row
    csv += ["", "", ...tableResults.map((r) => `${r.mape.toFixed(2)}%`), ""].join(",") + "\n\n";

    combinedRows.forEach((row) => {
      const line = [
        row.date,
        row.actual != null ? Math.round(row.actual) : "",
        ...tableResults.map((r) => {
          const v = row[r.modelName];
          return Number.isFinite(v) ? Math.round(v as number) : "";
        }),
        "",
      ];
      csv += line.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forecast_${product}_${granularity}_SUM_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast({ title: "Export successful", description: "Forecast sums exported to CSV" });
  };

  // Selection helpers
  const toggleModel = (id: string) =>
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const selectAll = () => setSelectedModelIds(new Set(results.map((r) => r.modelId)));
  const selectNone = () => setSelectedModelIds(new Set());
  const selectRecommended = () =>
    setSelectedModelIds(new Set(recommendedIds.size ? [...recommendedIds] : results.map((r) => r.modelId)));

  const noModelSelected = filteredModels.length === 0;

  return (
    <div className="space-y-6">
      {/* Model Comparison Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => (
          <Card key={result.modelId} className={result.isRecommended ? "border-primary border-2" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{result.modelName}</CardTitle>
                {result.isRecommended && (
                  <Badge className="bg-primary">
                    <Award className="h-3 w-3 mr-1" />
                    Recommended
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">MAPE</span>
                  <span className="text-lg font-bold">{result.mape.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Forecast (raw)</span>
                  <span className="text-lg font-bold">
                    {Math.round(
                      result.predictions.reduce((s, p) => s + p.predicted, 0) / Math.max(1, result.predictions.length),
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forecast Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Forecast Comparison (Sum): {product}
            </CardTitle>
          </div>

          {/* Informational banner (kept, optional) */}
          <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <p className="text-xs">
              We aggregate by calendar day first, then show <b>sum</b> per{" "}
              {labelForGranularity(granularity).toLowerCase()} for both historical and forecasts. Native data cadence
              detected: <b>{nativeGranularity}</b>.
            </p>
          </div>

          {/* Zoom + Model Filter */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <ZoomOut className="h-4 w-4" />
                Zoom
                <ZoomIn className="h-4 w-4" />
              </Label>
              <div className="flex-1 max-w-xs">
                <Slider value={[zoomLevel]} onValueChange={(v) => setZoomLevel(v[0])} min={20} max={100} step={5} />
              </div>
              <span className="text-sm text-muted-foreground min-w-[120px]">
                {visibleDataPoints} of {totalDataPoints} points
              </span>
              <Button variant="outline" size="sm" onClick={() => setZoomLevel(100)}>
                Reset
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-medium">Models visible</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  None
                </Button>
                <Button variant="outline" size="sm" onClick={selectRecommended}>
                  Recommended
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {results.map((r) => (
                <label key={r.modelId} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModelIds.has(r.modelId)}
                    onChange={() => toggleModel(r.modelId)}
                  />
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ background: modelColorMap.get(r.modelId) || "hsl(var(--primary))" }}
                    />
                    {r.modelName}
                    <span className="text-xs text-muted-foreground">({r.mape.toFixed(1)}% MAPE)</span>
                    {r.isRecommended && <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10">⭐</span>}
                  </span>
                </label>
              ))}
            </div>

            <label className="mt-1 text-xs flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyFilterToTable}
                onChange={(e) => setApplyFilterToTable(e.target.checked)}
              />
              Apply filter to detailed table
            </label>
          </div>
        </CardHeader>

        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={zoomedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatLabel(v, granularity)}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip
                labelFormatter={(v) => formatLabel(String(v), granularity)}
                formatter={(val: any, name: string) => [Number.isFinite(val) ? Math.round(val as number) : val, name]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--foreground))"
                strokeWidth={3}
                name="Historical (sum)"
                dot={{ r: 3 }}
              />
              {filteredModels.length === 0
                ? null
                : filteredModels.map((m) => (
                    <Line
                      key={m.modelId}
                      type="monotone"
                      dataKey={m.modelName}
                      stroke={modelColorMap.get(m.modelId) || "hsl(var(--primary))"}
                      strokeWidth={2}
                      strokeDasharray={m.isRecommended ? "0" : "5 5"}
                      dot={{ r: 2 }}
                    />
                  ))}
            </LineChart>
          </ResponsiveContainer>

          {filteredModels.length === 0 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              No model selected. Use the checkboxes above to display forecast lines.
            </p>
          )}

          <p className="text-sm text-muted-foreground mt-4 text-center">
            Sums shown per {labelForGranularity(granularity).toLowerCase()} (built from daily totals).
          </p>
        </CardContent>
      </Card>

      {/* Detailed Forecast Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Detailed Forecast Values ({labelForGranularity(granularity)}) — SUM</CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">{labelForGranularity(granularity)}</th>
                  <th className="text-right p-2 font-medium">Historical (sum)</th>
                  {(applyFilterToTable ? filteredModels : results).map((r) => (
                    <th key={r.modelId} className="text-right p-2 font-medium">
                      {r.modelName}
                      {r.isRecommended && " ⭐"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {combinedRows.map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{formatLabel(row.date, granularity)}</td>
                    <td className="text-right p-2">{row.actual != null ? Math.round(row.actual) : ""}</td>
                    {(applyFilterToTable ? filteredModels : results).map((r) => (
                      <td key={r.modelId} className="text-right p-2">
                        {Number.isFinite(row[r.modelName]) ? Math.round(row[r.modelName]) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
