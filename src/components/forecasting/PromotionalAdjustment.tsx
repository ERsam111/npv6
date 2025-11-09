import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ForecastResult } from "@/types/forecasting";
import { Calendar, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Promotion {
  id: string;
  name: string;
  startPeriod: number;
  endPeriod: number;
  uplift: number; // percentage
}

interface PromotionalAdjustmentProps {
  forecastResults: ForecastResult[];
  selectedProduct: string;
  granularity: "daily" | "weekly" | "monthly";
  onPromotionalAdjustmentsChange: (adjustedResults: ForecastResult[]) => void;
}

export function PromotionalAdjustment({
  forecastResults,
  selectedProduct,
  granularity,
  onPromotionalAdjustmentsChange
}: PromotionalAdjustmentProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [newPromotion, setNewPromotion] = useState<Partial<Promotion>>({
    name: "",
    startPeriod: 1,
    endPeriod: 1,
    uplift: 10
  });

  const addPromotion = () => {
    if (!newPromotion.name || !newPromotion.startPeriod || !newPromotion.endPeriod) {
      toast.error("Please fill all promotion fields");
      return;
    }

    if (newPromotion.startPeriod! > newPromotion.endPeriod!) {
      toast.error("Start period must be before end period");
      return;
    }

    const promotion: Promotion = {
      id: `promo-${Date.now()}`,
      name: newPromotion.name,
      startPeriod: newPromotion.startPeriod!,
      endPeriod: newPromotion.endPeriod!,
      uplift: newPromotion.uplift || 10
    };

    setPromotions([...promotions, promotion]);
    setNewPromotion({ name: "", startPeriod: 1, endPeriod: 1, uplift: 10 });
    toast.success(`Promotion "${promotion.name}" added`);
  };

  const removePromotion = (id: string) => {
    setPromotions(promotions.filter(p => p.id !== id));
    toast.success("Promotion removed");
  };

  const applyPromotions = () => {
    if (promotions.length === 0) {
      toast.error("No promotions to apply");
      return;
    }

    const adjustedResults = forecastResults.map(result => {
      const adjustedPredictions = result.predictions.map((pred, idx) => {
        let adjustedValue = pred.predicted;
        
        // Apply all promotions that overlap with this period
        promotions.forEach(promo => {
          if (idx + 1 >= promo.startPeriod && idx + 1 <= promo.endPeriod) {
            adjustedValue = adjustedValue * (1 + promo.uplift / 100);
          }
        });

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

    onPromotionalAdjustmentsChange(adjustedResults);
    toast.success(`Applied ${promotions.length} promotion(s) to forecasts`);
  };

  const maxPeriods = forecastResults[0]?.predictions.length || 12;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Promotional Adjustment
          </CardTitle>
          <CardDescription>
            Factor in promotional events and marketing campaigns for {selectedProduct}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Label>Promotion Name</Label>
              <Input
                value={newPromotion.name}
                onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
                placeholder="e.g., Summer Sale"
              />
            </div>
            <div>
              <Label>Start Period</Label>
              <Input
                type="number"
                min={1}
                max={maxPeriods}
                value={newPromotion.startPeriod}
                onChange={(e) => setNewPromotion({ ...newPromotion, startPeriod: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>End Period</Label>
              <Input
                type="number"
                min={1}
                max={maxPeriods}
                value={newPromotion.endPeriod}
                onChange={(e) => setNewPromotion({ ...newPromotion, endPeriod: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Uplift (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={newPromotion.uplift}
                onChange={(e) => setNewPromotion({ ...newPromotion, uplift: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={addPromotion} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Promotion
            </Button>
            {promotions.length > 0 && (
              <Button onClick={applyPromotions} variant="default" className="gap-2">
                <Calendar className="h-4 w-4" />
                Apply All Promotions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {promotions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Promotions</CardTitle>
            <CardDescription>
              {promotions.length} promotion(s) configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotion Name</TableHead>
                  <TableHead>Start Period</TableHead>
                  <TableHead>End Period</TableHead>
                  <TableHead>Uplift</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">{promo.name}</TableCell>
                    <TableCell>Period {promo.startPeriod}</TableCell>
                    <TableCell>Period {promo.endPeriod}</TableCell>
                    <TableCell className="text-green-600 font-semibold">+{promo.uplift}%</TableCell>
                    <TableCell>{promo.endPeriod - promo.startPeriod + 1} {granularity}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePromotion(promo.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {promotions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No promotions configured yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add promotional events to adjust your demand forecasts
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
