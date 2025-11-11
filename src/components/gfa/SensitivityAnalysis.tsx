import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Customer, Product, ExistingSite, OptimizationSettings } from "@/types/gfa";
import { optimizeWithCost } from "@/utils/geoCalculations";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
interface SensitivityAnalysisProps {
  customers: Customer[];
  products: Product[];
  settings: OptimizationSettings;
  existingSites?: ExistingSite[];
}
interface SensitivityResult {
  facilityCost: number;
  transportationRate: number;
  totalCost: number;
  transportationCost: number;
  facilityCostTotal: number;
  numSites: number;
}
export function SensitivityAnalysis({
  customers,
  products,
  settings,
  existingSites
}: SensitivityAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [facilityCostResults, setFacilityCostResults] = useState<SensitivityResult[]>([]);
  const [transportationRateResults, setTransportationRateResults] = useState<SensitivityResult[]>([]);
  const runFacilityCostAnalysis = async () => {
    setAnalyzing(true);
    const facilityCosts = [0, 500000, 1000000, 2000000];
    const results: SensitivityResult[] = [];
    for (const facilityCost of facilityCosts) {
      const result = optimizeWithCost(customers, settings.transportationCostPerMilePerUnit, facilityCost, settings.distanceUnit, settings.costUnit, products, settings.includeExistingSites ? existingSites : undefined, settings.includeExistingSites ? settings.existingSitesMode : undefined);
      if (result.costBreakdown) {
        results.push({
          facilityCost,
          transportationRate: settings.transportationCostPerMilePerUnit,
          totalCost: result.costBreakdown.totalCost,
          transportationCost: result.costBreakdown.transportationCost,
          facilityCostTotal: result.costBreakdown.facilityCost,
          numSites: result.dcs.length
        });
      }
    }
    setFacilityCostResults(results);
    setAnalyzing(false);
  };
  const runTransportationRateAnalysis = async () => {
    setAnalyzing(true);
    const transportationRates = [0.25, 0.5, 1.0, 2.0];
    const results: SensitivityResult[] = [];
    for (const rate of transportationRates) {
      const result = optimizeWithCost(customers, rate, settings.facilityCost, settings.distanceUnit, settings.costUnit, products, settings.includeExistingSites ? existingSites : undefined, settings.includeExistingSites ? settings.existingSitesMode : undefined);
      if (result.costBreakdown) {
        results.push({
          facilityCost: settings.facilityCost,
          transportationRate: rate,
          totalCost: result.costBreakdown.totalCost,
          transportationCost: result.costBreakdown.transportationCost,
          facilityCostTotal: result.costBreakdown.facilityCost,
          numSites: result.dcs.length
        });
      }
    }
    setTransportationRateResults(results);
    setAnalyzing(false);
  };
  const runBothAnalyses = async () => {
    await runFacilityCostAnalysis();
    await runTransportationRateAnalysis();
  };
  return <Card>
      
      
    </Card>;
}