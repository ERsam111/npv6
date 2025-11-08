import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { Customer } from "@/types/gfa";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { getConversionFactor } from "@/utils/unitConversions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ExcelUploadCompactProps {
  onBulkUpload: (customers: Customer[], mode: 'append' | 'overwrite') => void;
}

export function ExcelUploadCompact({ onBulkUpload }: ExcelUploadCompactProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'append' | 'overwrite'>('append');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const customers: Customer[] = [];
        let errors = 0;

        jsonData.forEach((row: any, index: number) => {
          try {
            const product = row.Product || row.product || row.PRODUCT || "";
            const name = row.Name || row.name || row.NAME || row["Customer Name"] || "";
            const city = row.City || row.city || row.CITY || "";
            const country = row.Country || row.country || row.COUNTRY || "";
            const unitOfMeasure = row.Unit || row.unit || row.UNIT || row.UOM || row.uom || "m3";
            const latitude = parseFloat(row.Latitude || row.latitude || row.LATITUDE || row.Lat || row.lat);
            const longitude = parseFloat(row.Longitude || row.longitude || row.LONGITUDE || row.Lng || row.lng || row.Long || row.long);
            const demand = parseFloat(row.Demand || row.demand || row.DEMAND);

            if (!product || !name || !city || !country) {
              errors++;
              return;
            }

            if (isNaN(latitude) || isNaN(longitude) || isNaN(demand)) {
              errors++;
              return;
            }

            if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
              errors++;
              return;
            }

            if (demand <= 0) {
              errors++;
              return;
            }

            customers.push({
              id: `customer-${Date.now()}-${index}`,
              product: product.toString().trim(),
              name: name.toString().trim(),
              city: city.toString().trim(),
              country: country.toString().trim(),
              latitude,
              longitude,
              demand,
              unitOfMeasure: unitOfMeasure.toString().trim(),
              conversionFactor: getConversionFactor(unitOfMeasure.toString().trim())
            });
          } catch (err) {
            errors++;
          }
        });

        if (customers.length > 0) {
          onBulkUpload(customers, uploadMode);
          const action = uploadMode === 'overwrite' ? 'Replaced with' : 'Added';
          toast.success(`${action} ${customers.length} customers${errors > 0 ? ` (${errors} rows skipped due to errors)` : ""}`);
        } else {
          toast.error("No valid customer data found in the file");
        }
      } catch (error) {
        toast.error("Failed to parse Excel file. Please check the format.");
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        Product: "Electronics",
        Name: "Customer A",
        PostalCode: "10001",
        City: "New York",
        Country: "USA",
        Latitude: 40.7128,
        Longitude: -74.0060,
        Demand: 1000,
        Unit: "pallets"
      },
      {
        Product: "Furniture",
        Name: "Customer B",
        PostalCode: "90001",
        City: "Los Angeles",
        Country: "USA",
        Latitude: 34.0522,
        Longitude: -118.2437,
        Demand: 1500,
        Unit: "m3"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "customer_data_template.xlsx");
    toast.success("Template downloaded successfully");
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 z-50 bg-background" align="end">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-2">Upload Mode</h4>
              <RadioGroup value={uploadMode} onValueChange={(value: 'append' | 'overwrite') => setUploadMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="append" id="append-compact" />
                  <Label htmlFor="append-compact" className="font-normal cursor-pointer text-sm">
                    Append
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="overwrite" id="overwrite-compact" />
                  <Label htmlFor="overwrite-compact" className="font-normal cursor-pointer text-sm">
                    Overwrite
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" size="sm">
              Select File
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button onClick={downloadTemplate} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Template
      </Button>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
    </div>
  );
}
