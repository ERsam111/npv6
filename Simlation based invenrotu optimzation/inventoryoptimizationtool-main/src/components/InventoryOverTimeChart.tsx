import { useMemo, useRef, useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";

// ✅ stable ref hook (no stringify)
function useStableArray<T>(arr: T[]): T[] {
  const ref = useRef<T[]>(arr);
  if (arr.length !== ref.current.length) {
    ref.current = arr;
  }
  return ref.current;
}

export const InventoryOverTimeChart = ({
  inventoryData = [],
  selectedSite,
  selectedProduct,
  selectedScenario,
  selectedReplication,
  onSiteChange,
  onProductChange,
  onScenarioChange,
  onReplicationChange,
}) => {

  // ⚙️ freeze the reference without huge serialization
  const stableData = useStableArray(inventoryData);

  // ✅ dynamically cap processing to protect browser
  const MAX_SCENARIOS = 25;
  const MAX_POINTS = 2000;

  // Extract filter lists
  const facilities = useMemo(() => ["all", ...new Set(stableData.map(d => d.facility))], [stableData.length]);
  const products = useMemo(() => ["all", ...new Set(stableData.map(d => d.product))], [stableData.length]);
  const scenarios = useMemo(() => {
    const s = new Set<string>();
    for (const d of stableData) if (d.scenarioDescription) s.add(d.scenarioDescription);
    return ["all", ...Array.from(s)];
  }, [stableData.length]);
  const replications = useMemo(
    () => ["all", ...new Set(stableData.map(d => String(d.replication)))],
    [stableData.length]
  );

  // Filter
  const filteredData = useMemo(() => {
    if (!stableData.length) return [];
    return stableData.filter(d => {
      const s1 = selectedSite === "all" || d.facility === selectedSite;
      const s2 = selectedProduct === "all" || d.product === selectedProduct;
      const s3 = selectedScenario === "all" || d.scenarioDescription === selectedScenario;
      const s4 = selectedReplication === "all" || String(d.replication) === selectedReplication;
      return s1 && s2 && s3 && s4;
    });
  }, [stableData, selectedSite, selectedProduct, selectedScenario, selectedReplication]);

  // Aggregate
  const [chartData, setChartData] = useState<any[]>([]);
  const [dataByRep, setDataByRep] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!filteredData.length) {
      setChartData([]);
      setDataByRep({});
      return;
    }

    // run aggregation off-thread tick
    const timeout = setTimeout(() => {
      const grouped: Record<string, any[]> = {};
      for (const d of filteredData) {
        const key = `Rep ${d.replication}`;
        (grouped[key] ||= []).push(d);
      }

      const allKeys = Object.keys(grouped).slice(0, MAX_SCENARIOS);
      const maxDay = Math.max(...filteredData.map(d => d.day ?? 0), 0);
      const data: any[] = [];

      for (let day = 0; day <= maxDay; day++) {
        const p: any = { day };
        for (const repKey of allKeys) {
          const val = grouped[repKey].find(d => d.day === day);
          if (val) p[repKey] = val.inventory;
        }
        if (Object.keys(p).length > 1) data.push(p);
        if (data.length > MAX_POINTS) break;
      }

      setDataByRep(grouped);
      setChartData(data);
    }, 0);

    return () => clearTimeout(timeout);
  }, [filteredData]);

  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#a28bfe", "#00b894", "#0984e3"];

  return (
    <Card className="border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          On-Hand Inventory Over Time
        </CardTitle>
        <CardDescription>
          Displays up to {MAX_SCENARIOS} replications and {MAX_POINTS} points for stability
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[{
            label: "Site/Facility", value: selectedSite, onChange: onSiteChange, options: facilities
          }, {
            label: "Product", value: selectedProduct, onChange: onProductChange, options: products
          }, {
            label: "Scenario", value: selectedScenario, onChange: onScenarioChange, options: scenarios
          }, {
            label: "Replication", value: selectedReplication, onChange: onReplicationChange, options: replications
          }].map(({ label, value, onChange, options }) => (
            <div className="space-y-2" key={label}>
              <Label>{label}</Label>
              <Select value={value} onValueChange={onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {opt === "all" ? `All ${label.split("/")[0]}s` : opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {chartData.length ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" label={{ value: "Day", position: "insideBottom", offset: -10 }} />
              <YAxis label={{ value: "Inventory (units)", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              {Object.keys(dataByRep).slice(0, MAX_SCENARIOS).map((repKey, i) => (
                <Line key={repKey} dataKey={repKey} stroke={colors[i % colors.length]} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No inventory data available or too large to render.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
