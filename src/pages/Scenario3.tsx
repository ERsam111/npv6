import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Scenario3InputForm } from "@/components/forecasting/Scenario3Input";
import { Scenario3Results } from "@/components/forecasting/Scenario3Results";
import { Scenario3Input, Scenario3Output } from "@/types/scenario3";
import { processScenario3Adjustments } from "@/utils/elasticityCalculator";
import { useToast } from "@/hooks/use-toast";
import { getScenario1Results, getScenario2Results, getScenario3Results, saveScenario3Results } from "@/utils/scenarioStorage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Scenario3 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [results, setResults] = useState<Scenario3Output[]>([]);
  const [scenario1Data, setScenario1Data] = useState<any>(null);
  const [scenario2Data, setScenario2Data] = useState<any>(null);

  useEffect(() => {
    // Load previous scenarios
    const s1 = getScenario1Results();
    const s2 = getScenario2Results();
    
    if (s1) setScenario1Data(s1);
    if (s2) setScenario2Data(s2);
    
    // Load saved Scenario 3 results
    const s3 = getScenario3Results();
    if (s3) {
      setResults(s3.results);
    }
  }, []);

  const handleDataSubmit = (inputs: Scenario3Input[]) => {
    if (!scenario2Data || scenario2Data.length === 0) {
      toast({
        title: "No Scenario 2 data",
        description: "Please complete Scenario 2 first to use as baseline",
        variant: "destructive"
      });
      return;
    }

    try {
      // Enrich inputs with Scenario 2 data
      const enrichedInputs = inputs.flatMap(input => {
        // Filter scenario2 data for matching product and date range
        const matchingS2Data = scenario2Data.filter((s2: any) => {
          const s2Date = new Date(s2.period);
          return s2.product === input.product_name &&
                 s2Date >= input.fromPeriod &&
                 s2Date <= input.toPeriod;
        });

        // Calculate actual price from base price and discount rate
        const actualPrice = input.base_price * (1 - input.discount_rate / 100);

        // Create scenario3 inputs for each matching period
        return matchingS2Data.map((s2: any) => ({
          product_id: s2.product.substring(0, 10),
          product_name: s2.product,
          period: new Date(s2.period),
          scenario2_forecast: s2.adjustedForecast,
          base_price: input.base_price,
          actual_price: actualPrice,
          promotion_flag: (input.discount_rate > 0 ? 1 : 0) as 0 | 1,
          discount_rate: input.discount_rate,
          elasticity: input.elasticity,
          target_units: input.target_units,
          target_revenue: input.target_revenue
        }));
      });

      if (enrichedInputs.length === 0) {
        toast({
          title: "No matching data",
          description: "No Scenario 2 data found for the selected products and date ranges",
          variant: "destructive"
        });
        return;
      }

      const processedResults = processScenario3Adjustments(enrichedInputs);
      setResults(processedResults);
      
      // Save results
      saveScenario3Results(processedResults);
      
      toast({
        title: "Scenario 3 calculated",
        description: `Processed ${processedResults.length} forecasts with elasticity adjustments`
      });
    } catch (error) {
      toast({
        title: "Calculation failed",
        description: "Error processing Scenario 3 adjustments",
        variant: "destructive"
      });
    }
  };

  const handleImportFromScenario2 = () => {
    if (!scenario2Data || scenario2Data.length === 0) {
      toast({
        title: "No Scenario 2 data",
        description: "Please complete Scenario 2 first",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Use form to select products",
      description: "Select products from the dropdown in the form below. Date ranges will auto-populate from Scenario 2.",
    });
  };

  // Prepare comparison chart data
  const comparisonChartData = scenario2Data?.map((adj: any) => ({
    product: adj.product,
    baseline: adj.baselineForecast,
    scenario2: adj.adjustedForecast
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/scenario2")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Scenario 2
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Scenario 3 - Advanced Adjustments
            </h1>
            <p className="text-muted-foreground mt-1">
              Apply price elasticity, promotions, and target-driven recommendations
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="lg:col-span-1 space-y-6">
            {(scenario1Data || scenario2Data) && (
              <Card>
                <CardHeader>
                  <CardTitle>Previous Scenarios</CardTitle>
                  <CardDescription>
                    Compare baseline and adjusted forecasts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="product" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="baseline" fill="hsl(var(--muted))" name="Scenario 1" />
                      <Bar dataKey="scenario2" fill="hsl(var(--primary))" name="Scenario 2" />
                    </BarChart>
                  </ResponsiveContainer>
                  {scenario2Data && (
                    <Button onClick={handleImportFromScenario2} className="w-full" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Import from Scenario 2
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
            <Scenario3InputForm onDataSubmit={handleDataSubmit} scenario2Data={scenario2Data} />
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {results.length > 0 ? (
              <Scenario3Results 
                results={results} 
                scenario1Data={scenario1Data}
                scenario2Data={scenario2Data}
              />
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                <div className="text-center text-muted-foreground p-12">
                  <p className="text-lg font-medium">No results yet</p>
                  <p className="text-sm mt-2">Enter data and click "Calculate Scenario 3" to see results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scenario3;
