import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Plus, Trash2, Calculator } from "lucide-react";
import { Scenario2Adjustment } from "@/types/scenario2";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Scenario2InputProps {
  onAdjustmentsSubmit: (adjustments: Scenario2Adjustment[]) => void;
  scenario1Data?: any;
}

export function Scenario2Input({ onAdjustmentsSubmit, scenario1Data }: Scenario2InputProps) {
  const { toast } = useToast();
  
  // Get products from Scenario 1
  const availableProducts = scenario1Data ? [scenario1Data.product] : [];
  
  // Get date range from Scenario 1
  const getDefaultDates = () => {
    if (scenario1Data?.results?.[0]?.predictions?.length > 0) {
      const predictions = scenario1Data.results.find((r: any) => r.isRecommended)?.predictions || scenario1Data.results[0].predictions;
      return {
        from: new Date(predictions[0].date),
        to: new Date(predictions[predictions.length - 1].date)
      };
    }
    return { from: new Date(), to: new Date() };
  };
  
  const defaultDates = getDefaultDates();
  
  const [adjustments, setAdjustments] = useState<Scenario2Adjustment[]>([{
    product: availableProducts[0] || "",
    fromPeriod: defaultDates.from,
    toPeriod: defaultDates.to,
    adjustmentType: "percentage",
    adjustmentValue: 0,
    notes: ""
  }]);

  const addRow = () => {
    setAdjustments([...adjustments, {
      product: availableProducts[0] || "",
      fromPeriod: defaultDates.from,
      toPeriod: defaultDates.to,
      adjustmentType: "percentage",
      adjustmentValue: 0,
      notes: ""
    }]);
  };

  const removeRow = (index: number) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof Scenario2Adjustment, value: any) => {
    const newAdjustments = [...adjustments];
    newAdjustments[index] = { ...newAdjustments[index], [field]: value };
    setAdjustments(newAdjustments);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const parsedData: Scenario2Adjustment[] = json.map((row: any) => ({
          product: String(row.product || row.Product || ""),
          fromPeriod: new Date(row.from_period || row.FromPeriod || Date.now()),
          toPeriod: new Date(row.to_period || row.ToPeriod || Date.now()),
          adjustmentType: (row.adjustment_type || row.AdjustmentType || "percentage") as "units" | "percentage",
          adjustmentValue: Number(row.adjustment_value || row.AdjustmentValue || 0),
          notes: String(row.notes || row.Notes || "")
        }));

        setAdjustments(parsedData);
        toast({
          title: "Excel file uploaded",
          description: `Loaded ${parsedData.length} adjustments`
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Could not parse Excel file",
          variant: "destructive"
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        product: "Widget A",
        from_period: "2024-01-01",
        to_period: "2024-12-31",
        adjustment_type: "percentage",
        adjustment_value: 10,
        notes: "Expected promotion boost"
      },
      {
        product: "Widget B",
        from_period: "2024-01-01",
        to_period: "2024-12-31",
        adjustment_type: "units",
        adjustment_value: -50,
        notes: "Seasonal decline"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scenario2Template");
    XLSX.writeFile(wb, "scenario2_template.xlsx");
  };

  const handleSubmit = () => {
    const validAdjustments = adjustments.filter(a => a.product);
    
    if (validAdjustments.length === 0) {
      toast({
        title: "Invalid data",
        description: "Please fill in product name",
        variant: "destructive"
      });
      return;
    }

    onAdjustmentsSubmit(validAdjustments);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Scenario 2 - Manual Adjustments</CardTitle>
        <CardDescription>
          Add or remove units, or apply percentage changes to baseline forecasts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={downloadTemplate} variant="outline" className="flex-1">
            Download Template
          </Button>
          <label className="flex-1">
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Excel
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {adjustments.map((adj, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">Adjustment {index + 1}</span>
                {adjustments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Product Name *</Label>
                  <Select
                    value={adj.product}
                    onValueChange={(v) => updateRow(index, "product", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">From Period</Label>
                  <Input
                    type="date"
                    value={adj.fromPeriod.toISOString().split('T')[0]}
                    onChange={(e) => updateRow(index, "fromPeriod", new Date(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">To Period</Label>
                  <Input
                    type="date"
                    value={adj.toPeriod.toISOString().split('T')[0]}
                    onChange={(e) => updateRow(index, "toPeriod", new Date(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Adjustment Type</Label>
                  <Select
                    value={adj.adjustmentType}
                    onValueChange={(v) => updateRow(index, "adjustmentType", v as "units" | "percentage")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="units">Add/Remove Units</SelectItem>
                      <SelectItem value="percentage">Percentage Change (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">
                    Adjustment Value {adj.adjustmentType === "percentage" ? "(%)" : "(Units)"}
                  </Label>
                  <Input
                    type="number"
                    step={adj.adjustmentType === "percentage" ? "0.1" : "1"}
                    value={adj.adjustmentValue}
                    onChange={(e) => updateRow(index, "adjustmentValue", Number(e.target.value))}
                    placeholder={adj.adjustmentType === "percentage" ? "e.g., 10 or -5" : "e.g., 100 or -50"}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Notes (Optional)</Label>
                  <Textarea
                    value={adj.notes}
                    onChange={(e) => updateRow(index, "notes", e.target.value)}
                    placeholder="Reason for adjustment..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={addRow} variant="outline" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Adjustment
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            <Calculator className="h-4 w-4 mr-2" />
            Apply Adjustments
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
