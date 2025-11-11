import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, MapPin, TrendingUp, DollarSign, Download, Map } from "lucide-react";
import { Customer, DistributionCenter, Product, OptimizationSettings } from "@/types/gfa";
import { ResultsPanel } from "./ResultsPanel";
import { DistanceAnalysis } from "./DistanceAnalysis";
import { ProfitabilityAnalysis } from "./ProfitabilityAnalysis";
import { DemandInsights } from "./DemandInsights";
import { KPISummaryDashboard } from "./KPISummaryDashboard";
import { ScenarioComparison } from "./ScenarioComparison";
import { SensitivityAnalysis } from "./SensitivityAnalysis";
import { MapView } from "./MapView";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportReport } from "@/utils/exportReport";
import { useToast } from "@/hooks/use-toast";
import { useScenarios } from "@/contexts/ScenarioContext";

interface GFAResultsPanelProps {
  dcs: DistributionCenter[];
  customers: Customer[];
  products: Product[];
  settings: OptimizationSettings;
  feasible: boolean;
  warnings: string[];
  costBreakdown?: { totalCost: number; transportationCost: number; facilityCost: number; numSites: number };
  existingSites?: import("@/types/gfa").ExistingSite[];
}

export function GFAResultsPanel({
  dcs,
  customers,
  products,
  settings,
  feasible,
  warnings,
  costBreakdown,
  existingSites,
}: GFAResultsPanelProps) {
  const [distanceRangeStep, setDistanceRangeStep] = useState<number>(100);
  const { toast } = useToast();
  const { currentScenario } = useScenarios();

  const handleExportAll = () => {
    exportReport({
      customers,
      products,
      dcs,
      settings,
      costBreakdown,
      distanceRangeStep,
    });
    
    toast({
      title: "Export Complete",
      description: "All results have been exported to Excel successfully.",
    });
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex justify-between items-center">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Scenario Comparison</TabsTrigger>
        </TabsList>
        <Button onClick={handleExportAll} className="gap-2">
          <Download className="h-5 w-5" />
          Export Complete Report
        </Button>
      </div>

      <TabsContent value="overview" className="space-y-6">
        {/* KPI Summary Dashboard */}
        <KPISummaryDashboard
          dcs={dcs}
          customers={customers}
          settings={settings}
          costBreakdown={costBreakdown}
        />

        {/* Map View - Site-Customer Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Network Map
            </CardTitle>
            <CardDescription>Visual representation of site-customer connections</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[550px] w-full">
              <MapView
                customers={customers}
                dcs={dcs}
                distanceRangeStep={distanceRangeStep}
                distanceUnit={settings.distanceUnit}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Alert */}
      {feasible ? (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Optimization Successful</AlertTitle>
          <AlertDescription>
            All constraints satisfied. Found optimal solution with {dcs.length} distribution centers.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Constraint Violations</AlertTitle>
          <AlertDescription>
            The optimization completed but some constraints could not be satisfied. Review warnings below.
          </AlertDescription>
        </Alert>
      )}

      {/* Cost Summary */}
      {costBreakdown && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${costBreakdown.totalCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transportation</p>
                <p className="text-2xl font-bold">${costBreakdown.transportationCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Facility</p>
                <p className="text-2xl font-bold">${costBreakdown.facilityCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sites</p>
                <p className="text-2xl font-bold">{costBreakdown.numSites}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {warnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-yellow-600">
                  • {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Demand Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Demand Insights
          </CardTitle>
          <CardDescription>Demand distribution and coverage analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <DemandInsights
            customers={customers}
            products={products}
            dcs={dcs}
            settings={settings}
          />
        </CardContent>
      </Card>

      {/* Results Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Distribution Center Details
          </CardTitle>
          <CardDescription>Detailed breakdown of each distribution center</CardDescription>
        </CardHeader>
        <CardContent>
          <ResultsPanel
            dcs={dcs}
            feasible={feasible}
            warnings={warnings}
            costBreakdown={costBreakdown}
            customers={customers}
            settings={settings}
            products={products}
          />
        </CardContent>
      </Card>

      {/* Distance Range Control */}
      <Card className="w-fit">
        <CardContent className="pt-4">
          <div className="flex gap-4 items-center">
            <div className="space-y-2">
              <Label className="text-xs">Distance Range Step</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={distanceRangeStep}
                onChange={(e) => setDistanceRangeStep(Number(e.target.value) || 100)}
                className="w-[90px]"
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Unit</Label>
              <Select value={settings.distanceUnit} disabled>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">km</SelectItem>
                  <SelectItem value="mile">miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distance Analysis */}
      <DistanceAnalysis
        dcs={dcs}
        customers={customers}
        rangeStep={distanceRangeStep}
        onRangeStepChange={setDistanceRangeStep}
        distanceUnit={settings.distanceUnit}
      />

      {/* Profitability Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability Analysis</CardTitle>
          <CardDescription>Revenue and profit analysis by product</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfitabilityAnalysis
            customers={customers}
            products={products}
            dcs={dcs}
            settings={settings}
          />
        </CardContent>
      </Card>

      {/* Sensitivity Analysis */}
      {settings.mode === 'cost' && (
        <SensitivityAnalysis
          customers={customers}
          products={products}
          settings={settings}
          existingSites={existingSites}
        />
      )}
      </TabsContent>

      <TabsContent value="comparison" className="space-y-6">
        <ScenarioComparison
          dcs={dcs}
          customers={customers}
          settings={settings}
          costBreakdown={costBreakdown}
          projectId={currentScenario?.project_id}
        />
      </TabsContent>
    </Tabs>
  );
}
