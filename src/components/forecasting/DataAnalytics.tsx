import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Scatter,
  ScatterChart,
  ZAxis,
} from "recharts";
import { TrendingUp, Package, AlertTriangle } from "lucide-react";
import { HistoricalDataPoint } from "@/types/forecasting";

interface DataAnalyticsProps {
  data: HistoricalDataPoint[];
}

type OutlierMethod = "iqr" | "zscore" | "modified-zscore";
type TrendGranularity = "daily" | "weekly" | "monthly";
type RawGranularity = "daily" | "weekly-ish" | "monthly" | "mixed";

/* ----------------------- Date helpers ----------------------- */

function coerceDate(d: Date | string | number): Date {
  if (d instanceof Date) return d;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? new Date("Invalid") : dt;
}
function daysInMonth(y: number, m0: number) {
  // m0: 0..11
  return new Date(y, m0 + 1, 0).getDate();
}
function dayKey(d: Date) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "invalid";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function isoWeek(d: Date): number {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((+dt - +yearStart) / 86400000 + 1) / 7);
}
const weekKey = (d: Date) => `${d.getFullYear()}-W${String(isoWeek(d)).padStart(2, "0")}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function fmtPeriodLabel(key: string, g: TrendGranularity) {
  if (g === "monthly") {
    const [y, m] = key.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(y, (m || 1) - 1, 1));
  }
  return key; // YYYY-Www or YYYY-MM-DD
}

/* ----------------------- Detect raw frequency ----------------------- */

function detectRawGranularity(rows: HistoricalDataPoint[]): RawGranularity {
  if (!rows.length) return "mixed";
  const ds = rows.map((r) => coerceDate(r.date)).filter((d) => !isNaN(d.getTime()));
  const daySet = new Set(ds.map(dayKey));
  const weekSet = new Set(ds.map(weekKey));
  const monthSet = new Set(ds.map(monthKey));

  const allFirstOfMonth = ds.every((d) => d.getDate() === 1);
  if (allFirstOfMonth && monthSet.size === rows.length) return "monthly";

  // Heuristic: if many unique days and most days repeat across months -> daily
  if (daySet.size / rows.length > 0.6) return "daily";

  // Otherwise "weekly-ish" or mixed
  if (weekSet.size >= monthSet.size * 3) return "weekly-ish";
  return "mixed";
}

/* ----------------------- Resampling -----------------------
   For when raw is monthly and user selects daily/weekly:
   Distribute each monthly value evenly across all days of that month. */
function resampleMonthlyToDaily(rows: HistoricalDataPoint[]) {
  const out: { date: Date; demand: number; product: string; customer: string }[] = [];
  for (const r of rows) {
    const dt = coerceDate(r.date);
    if (isNaN(dt.getTime())) continue;
    const y = dt.getFullYear();
    const m0 = dt.getMonth();
    const n = daysInMonth(y, m0);
    const perDay = (Number(r.demand) || 0) / n;
    for (let d = 1; d <= n; d++) {
      out.push({
        date: new Date(y, m0, d),
        demand: perDay,
        product: r.product,
        customer: r.customer,
      });
    }
  }
  return out;
}

/* ----------------------- Aggregation (SUM) -----------------------
   1) Sum raw/resampled rows into calendar days.
   2) Roll those daily sums into week or month if requested. */

function aggregateSums(
  rows: { date: Date | string | number; value: number; isOutlier?: boolean }[],
  g: TrendGranularity,
) {
  const dayTotals = new Map<string, { sum: number; hasOutlier: boolean; points: number; date: Date }>();
  for (const r of rows) {
    const dt = coerceDate(r.date);
    if (isNaN(dt.getTime())) continue;
    const dk = dayKey(dt);
    if (dk === "invalid") continue;
    const prev = dayTotals.get(dk);
    if (prev) {
      prev.sum += Number(r.value) || 0;
      prev.points += 1;
      prev.hasOutlier = prev.hasOutlier || !!r.isOutlier;
    } else {
      dayTotals.set(dk, { sum: Number(r.value) || 0, hasOutlier: !!r.isOutlier, points: 1, date: dt });
    }
  }

  if (g === "daily") {
    return Array.from(dayTotals.entries())
      .map(([period, v]) => ({ period, demand: v.sum, hasOutlier: v.hasOutlier, dataPoints: v.points }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  const buckets = new Map<string, { sum: number; hasOutlier: boolean; dataPoints: number }>();
  for (const { sum, hasOutlier, points, date } of dayTotals.values()) {
    const bk = g === "weekly" ? weekKey(date) : monthKey(date);
    const prev = buckets.get(bk);
    if (prev) {
      prev.sum += sum;
      prev.dataPoints += points;
      prev.hasOutlier = prev.hasOutlier || hasOutlier;
    } else {
      buckets.set(bk, { sum, hasOutlier, dataPoints: points });
    }
  }

  return Array.from(buckets.entries())
    .map(([period, v]) => ({ period, demand: v.sum, hasOutlier: v.hasOutlier, dataPoints: v.dataPoints }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/* ----------------------- Component ----------------------- */

export function DataAnalytics({ data }: DataAnalyticsProps) {
  const [outlierMethod, setOutlierMethod] = useState<OutlierMethod>("iqr");
  const [includeOutliers, setIncludeOutliers] = useState(true);
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("monthly");
  const [resampleLower, setResampleLower] = useState(true); // NEW: distribute monthly into days when viewing daily/weekly

  const rawGranularity = useMemo(() => detectRawGranularity(data), [data]);

  const analytics = useMemo(() => {
    if (data.length === 0) return null;

    // --- Outlier thresholds on raw rows
    const demands = data.map((d) => d.demand);
    const mean = demands.reduce((s, v) => s + v, 0) / Math.max(1, demands.length);
    const sorted = [...demands].sort((a, b) => a - b);

    let lo = -Infinity,
      hi = Infinity;
    if (outlierMethod === "iqr") {
      const q1 = sorted[Math.floor(0.3 * (sorted.length - 1))];
      const q3 = sorted[Math.floor(0.7 * (sorted.length - 1))];
      const iqr = q3 - q1;
      lo = q1 - 1.5 * iqr;
      hi = q3 + 1.5 * iqr;
    } else if (outlierMethod === "zscore") {
      const variance = demands.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, demands.length);
      const std = Math.sqrt(variance || 0);
      lo = mean - 3 * std;
      hi = mean + 3 * std;
    } else {
      const median = sorted[Math.floor(sorted.length / 2)];
      const mad = sorted.reduce((a, v) => a + Math.abs(v - median), 0) / Math.max(1, sorted.length);
      lo = median - 3.5 * mad;
      hi = median + 3.5 * mad;
    }

    const rowsWithFlag = data.map((d) => ({ ...d, isOutlier: d.demand < lo || d.demand > hi }));
    const filteredRows = includeOutliers ? rowsWithFlag : rowsWithFlag.filter((r) => !r.isOutlier);

    // --- Optional resampling when raw is monthly and user asks for daily/weekly
    let workingRows: { date: Date | string | number; value: number; isOutlier?: boolean }[];
    if (
      resampleLower &&
      rawGranularity === "monthly" &&
      (trendGranularity === "daily" || trendGranularity === "weekly")
    ) {
      const dailyRows = resampleMonthlyToDaily(filteredRows);
      workingRows = dailyRows.map((r) => ({ date: r.date, value: r.demand, isOutlier: false }));
    } else {
      workingRows = filteredRows.map((r) => ({ date: r.date, value: r.demand, isOutlier: (r as any).isOutlier }));
    }

    // --- Build period series (SUMS)
    const timeSeries = aggregateSums(workingRows, trendGranularity);

    // --- Stats from current series
    const vals = timeSeries.map((p) => p.demand);
    const totalDemand = vals.reduce((s, v) => s + v, 0);
    const avgDemand = vals.length ? totalDemand / vals.length : 0;
    const maxDemand = vals.length ? Math.max(...vals) : 0;
    const minDemand = vals.length ? Math.min(...vals) : 0;

    // --- Top products (respect outlier filter; on raw rows)
    const productTotals = filteredRows.reduce<Record<string, number>>((acc, d) => {
      acc[d.product] = (acc[d.product] ?? 0) + d.demand;
      return acc;
    }, {});
    const topProducts = Object.entries(productTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product, demand]) => ({ product, demand }));

    // --- Scatter of individual points (optional)
    const scatterData = includeOutliers
      ? filteredRows.map((r) => {
          const dt = coerceDate(r.date);
          const label =
            trendGranularity === "daily" ? dayKey(dt) : trendGranularity === "weekly" ? weekKey(dt) : monthKey(dt);
          return {
            period: label,
            demand: r.demand,
            isOutlier: (r as any).isOutlier ? 1 : 0,
            fill: (r as any).isOutlier ? "hsl(var(--destructive))" : "hsl(var(--primary))",
          };
        })
      : [];

    const outlierCount = rowsWithFlag.filter((r) => (r as any).isOutlier).length;

    return {
      timeSeries,
      totalDemand,
      avgDemand,
      maxDemand,
      minDemand,
      topProducts,
      scatterData,
      outlierCount,
      periodsCount: timeSeries.length,
    };
  }, [data, outlierMethod, includeOutliers, trendGranularity, resampleLower, rawGranularity]);

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No data available for analysis</CardContent>
      </Card>
    );
  }

  // Force re-scale and remount
  const chartKey = `${trendGranularity}-${includeOutliers}-${outlierMethod}-${resampleLower}-${rawGranularity}`;
  const maxY = analytics.timeSeries.length ? Math.max(...analytics.timeSeries.map((p) => p.demand)) : 0;
  const yMax = Number.isFinite(maxY) && maxY > 0 ? Math.ceil(maxY * 1.1) : 1;
  const yDomain: [number, number] = [0, yMax];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Demand (sum of periods)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.totalDemand).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.periodsCount} {trendGranularity} period{analytics.periodsCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average per period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.avgDemand).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">based on {trendGranularity} sums</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Max period sum</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.maxDemand).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">peak {trendGranularity}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Min period sum</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.minDemand).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">lowest {trendGranularity}</p>
          </CardContent>
        </Card>
      </div>

      {/* Demand Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Historical Demand Trend — Sum per {trendGranularity}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Detected input frequency: <b>{rawGranularity}</b>
                {rawGranularity === "monthly" &&
                  (trendGranularity === "daily" || trendGranularity === "weekly") &&
                  " (daily/weekly views can be resampled from monthly totals)"}
              </p>
              {analytics.outlierCount > 0 && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {analytics.outlierCount} outliers detected (toggle to exclude)
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>View Granularity</Label>
              <Select value={trendGranularity} onValueChange={(v) => setTrendGranularity(v as TrendGranularity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outlier Detection</Label>
              <Select value={outlierMethod} onValueChange={(v) => setOutlierMethod(v as OutlierMethod)}>
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

            <div className="space-y-2">
              <Label className="invisible">Toggle</Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="include-outliers"
                  checked={includeOutliers}
                  onCheckedChange={(checked) => setIncludeOutliers(checked as boolean)}
                />
                <label htmlFor="include-outliers" className="text-sm font-medium cursor-pointer">
                  Include outliers in charts
                </label>
              </div>
            </div>

            {(trendGranularity === "daily" || trendGranularity === "weekly") && rawGranularity === "monthly" && (
              <div className="space-y-2">
                <Label className="invisible">Toggle</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Checkbox
                    id="resample-lower"
                    checked={resampleLower}
                    onCheckedChange={(checked) => setResampleLower(!!checked)}
                  />
                  <label htmlFor="resample-lower" className="text-sm font-medium cursor-pointer">
                    Resample monthly totals into days
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Line chart — keys & numeric domain ensure Y-axis updates */}
          <ResponsiveContainer key={`rc-${chartKey}-${yMax}`} width="100%" height={350}>
            <LineChart key={`lc-${chartKey}-${yMax}`} data={analytics.timeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => fmtPeriodLabel(v, trendGranularity)}
              />
              <YAxis key={`y-${chartKey}-${yMax}`} domain={[0, yMax]} allowDataOverflow={false} />
              <Tooltip
                formatter={(value: number) => Math.round(value).toLocaleString()}
                labelFormatter={(label) => `Period: ${fmtPeriodLabel(String(label), trendGranularity)}`}
              />
              <Line
                type="monotone"
                dataKey="demand"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const isOut = payload?.hasOutlier;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isOut ? 5 : 4}
                      fill={isOut ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                    />
                  );
                }}
                name={`Total demand (sum per ${trendGranularity})`}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Scatter (optional) */}
          {includeOutliers && analytics.scatterData.length > 0 && (
            <>
              <div className="text-sm text-muted-foreground text-center">Individual points (red = outliers)</div>
              <ResponsiveContainer key={`src-${chartKey}-${yMax}`} width="100%" height={240}>
                <ScatterChart key={`sc-${chartKey}-${yMax}`}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => fmtPeriodLabel(v, trendGranularity)}
                  />
                  <YAxis key={`sy-${chartKey}-${yMax}`} dataKey="demand" domain={[0, yMax]} allowDataOverflow={false} />
                  <ZAxis range={[50, 50]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    labelFormatter={(label) => `Period: ${fmtPeriodLabel(String(label), trendGranularity)}`}
                    formatter={(value: number) => Math.round(value).toLocaleString()}
                  />
                  <Scatter
                    data={analytics.scatterData.filter((d) => !d.isOutlier)}
                    fill="hsl(var(--primary))"
                    name="Normal"
                  />
                  <Scatter
                    data={analytics.scatterData.filter((d) => d.isOutlier)}
                    fill="hsl(var(--destructive))"
                    name="Outlier"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Products (sum) */}
      {analytics.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Products by Demand (sum)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={`tp-${chartKey}`} width="100%" height={250}>
              <BarChart data={analytics.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, (max: number) => Math.ceil(max * 1.1)]} />
                <YAxis dataKey="product" type="category" width={150} />
                <Tooltip formatter={(v: number) => Math.round(v).toLocaleString()} />
                <Bar dataKey="demand" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
