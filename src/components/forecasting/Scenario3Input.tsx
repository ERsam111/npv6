import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Plus, Trash2 } from "lucide-react";
import { Scenario3Input } from "@/types/scenario3";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Scenario3InputProps {
  onDataSubmit: (data: Scenario3Input[]) => void;
  scenario2Data?: any[];
}

export function Scenario3InputForm({ onDataSubmit, scenario2Data }: Scenario3InputProps) {
  const { toast } = useToast();
  
  // Get products from Scenario 2
  const availableProducts = scenario2Data ? scenario2Data.map((adj: any) => adj.product) : [];
  const uniqueProducts = [...new Set(availableProducts)] as string[];
  
  const [rows, setRows] = useState<Scenario3Input[]>([{
    product_name: uniqueProducts[0] || "",
    fromPeriod: new Date(),
    toPeriod: new Date(),
    elasticity: -1.5,
    base_price: 0,
    discount_rate: 0,
    target_units: undefined,
    target_revenue: undefined
  }]);

  const addRow = () => {
    setRows([...rows, {
      product_name: uniqueProducts[0] || "",
      fromPeriod: new Date(),
      toPeriod: new Date(),
      elasticity: -1.5,
      base_price: 0,
      discount_rate: 0,
      target_units: undefined,
      target_revenue: undefined
    }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof Scenario3Input, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
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

        const parsedData: Scenario3Input[] = json.map((row: any) => ({
          product_name: String(row.product_name || row.ProductName || ""),
          fromPeriod: new Date(row.from_period || row.FromPeriod || Date.now()),
          toPeriod: new Date(row.to_period || row.ToPeriod || Date.now()),
          elasticity: Number(row.elasticity || row.Elasticity || -1.5),
          base_price: Number(row.base_price || row.BasePrice || 0),
          discount_rate: Number(row.discount_rate || row.DiscountRate || 0),
          target_units: row.target_units || row.TargetUnits ? Number(row.target_units || row.TargetUnits) : undefined,
          target_revenue: row.target_revenue || row.TargetRevenue ? Number(row.target_revenue || row.TargetRevenue) : undefined
        }));

        setRows(parsedData);
        toast({
          title: "Excel file uploaded",
          description: `Loaded ${parsedData.length} rows`
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
        product_name: "Widget A",
        from_period: "2024-01-01",
        to_period: "2024-12-31",
        elasticity: -1.5,
        base_price: 100,
        discount_rate: 10,
        target_units: 1000,
        target_revenue: ""
      },
      {
        product_name: "Widget B",
        from_period: "2024-01-01",
        to_period: "2024-12-31",
        elasticity: -2.0,
        base_price: 150,
        discount_rate: 5,
        target_units: "",
        target_revenue: 50000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scenario3Template");
    XLSX.writeFile(wb, "scenario3_template.xlsx");
  };

  const handleSubmit = () => {
    const validRows = rows.filter(r => r.product_name && r.fromPeriod && r.toPeriod);
    
    if (validRows.length === 0) {
      toast({
        title: "Invalid data",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    onDataSubmit(validRows);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Scenario 3 - Elasticity Adjustments</CardTitle>
        <CardDescription>
          Apply price elasticity and promotions to Scenario 2 forecasts
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
          {rows.map((row, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">Row {index + 1}</span>
                {rows.length > 1 && (
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
                    value={row.product_name}
                    onValueChange={(v) => updateRow(index, "product_name", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueProducts.map((product: string) => (
                        <SelectItem key={product} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">From Period *</Label>
                  <Input
                    type="date"
                    value={row.fromPeriod.toISOString().split('T')[0]}
                    onChange={(e) => updateRow(index, "fromPeriod", new Date(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">To Period *</Label>
                  <Input
                    type="date"
                    value={row.toPeriod.toISOString().split('T')[0]}
                    onChange={(e) => updateRow(index, "toPeriod", new Date(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Elasticity</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={row.elasticity}
                    onChange={(e) => updateRow(index, "elasticity", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Selling Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.base_price}
                    onChange={(e) => updateRow(index, "base_price", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Discount Rate %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={row.discount_rate}
                    onChange={(e) => updateRow(index, "discount_rate", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Target Units (Optional)</Label>
                  <Input
                    type="number"
                    value={row.target_units || ""}
                    onChange={(e) => updateRow(index, "target_units", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Target Revenue (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.target_revenue || ""}
                    onChange={(e) => updateRow(index, "target_revenue", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={addRow} variant="outline" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Calculate Scenario 3
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
