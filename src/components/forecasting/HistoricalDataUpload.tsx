import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { HistoricalDataPoint } from "@/types/forecasting";

interface HistoricalDataUploadProps {
  onDataUpload: (data: HistoricalDataPoint[]) => void;
}

export function HistoricalDataUpload({ onDataUpload }: HistoricalDataUploadProps) {
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const historicalData: HistoricalDataPoint[] = jsonData.map((row: any) => {
          const dateValue = row.Date || row.date;
          let parsedDate: Date;
          
          // Handle Excel date serial numbers
          if (typeof dateValue === 'number') {
            parsedDate = new Date((dateValue - 25569) * 86400 * 1000);
          } else {
            parsedDate = new Date(dateValue);
          }

          return {
            date: parsedDate,
            customer: String(row.Customer || row.customer || ""),
            product: String(row.Product || row.product || ""),
            demand: Number(row.Demand || row.demand || 0),
            unitOfMeasure: String(row.Unit || row.unit || row.UnitOfMeasure || "units")
          };
        }).filter(item => !isNaN(item.date.getTime()) && item.demand > 0);

        if (historicalData.length === 0) {
          toast({
            title: "No valid data found",
            description: "Please check your Excel file format",
            variant: "destructive"
          });
          return;
        }

        onDataUpload(historicalData);
        toast({
          title: "Data uploaded successfully",
          description: `Loaded ${historicalData.length} data points`
        });
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({
          title: "Upload failed",
          description: "Failed to parse Excel file",
          variant: "destructive"
        });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Date: "2023-01-01",
        Customer: "Customer A",
        Product: "Product X",
        Demand: 100,
        Unit: "pallets"
      },
      {
        Date: "2023-02-01",
        Customer: "Customer A",
        Product: "Product X",
        Demand: 120,
        Unit: "pallets"
      },
      {
        Date: "2023-03-01",
        Customer: "Customer A",
        Product: "Product X",
        Demand: 95,
        Unit: "pallets"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historical Data");
    XLSX.writeFile(workbook, "historical_data_template.xlsx");
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Historical Data
        </CardTitle>
        <CardDescription>
          Upload 1-3 years of historical demand data by customer and product
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Excel file should contain columns: <strong>Date, Customer, Product, Demand, Unit</strong>
        </p>
        
        <div className="flex gap-2">
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          <Button
            onClick={() => document.getElementById("historical-file-upload")?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
        </div>

        <input
          id="historical-file-upload"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
