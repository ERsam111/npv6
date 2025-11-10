import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { Customer, Product, ExistingSite, OptimizationSettings } from "@/types/gfa";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { getConversionFactor } from "@/utils/unitConversions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ExcelUploadProps {
  onBulkUpload: (customers: Customer[], mode: 'append' | 'overwrite') => void;
  onProductsUpload?: (products: Product[], mode: 'append' | 'overwrite') => void;
  onExistingSitesUpload?: (sites: ExistingSite[], mode: 'append' | 'overwrite') => void;
  onCostParametersUpload?: (settings: Partial<OptimizationSettings>) => void;
}
export function ExcelUpload({
  onBulkUpload,
  onProductsUpload,
  onExistingSitesUpload,
  onCostParametersUpload
}: ExcelUploadProps) {
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

        // Process Customers sheet
        const customersSheet = workbook.Sheets["Customers"] || workbook.Sheets[workbook.SheetNames[0]];
        if (customersSheet) {
          const customersData = XLSX.utils.sheet_to_json(customersSheet);
          const customers: Customer[] = [];
          let errors = 0;

          customersData.forEach((row: any, index: number) => {
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
                conversionFactor: getConversionFactor(unitOfMeasure.toString().trim()),
              });
            } catch (err) {
              errors++;
            }
          });

          if (customers.length > 0) {
            onBulkUpload(customers, uploadMode);
            const action = uploadMode === 'overwrite' ? 'Replaced with' : 'Added';
            toast.success(`${action} ${customers.length} customers${errors > 0 ? ` (${errors} rows skipped)` : ""}`);
          }
        }

        // Process Products sheet
        if (workbook.Sheets["Products"] && onProductsUpload) {
          const productsData = XLSX.utils.sheet_to_json(workbook.Sheets["Products"]);
          const products: Product[] = [];

          productsData.forEach((row: any) => {
            const name = row.Product || row.product || row.PRODUCT || row.Name || row.name;
            const baseUnit = row.BaseUnit || row["Base Unit"] || row.baseUnit || row.Unit || "m3";
            const sellingPrice = parseFloat(row.SellingPrice || row["Selling Price"] || row.sellingPrice || row.Price || "0");

            if (!name) return;

            const product: Product = {
              name: name.toString().trim(),
              baseUnit: baseUnit.toString().trim(),
              sellingPrice: sellingPrice > 0 ? sellingPrice : undefined,
              unitConversions: {}
            };

            // Add all unit conversion columns (any column that's not the core fields and has a numeric value)
            Object.keys(row).forEach((key) => {
              if (!['Product', 'product', 'PRODUCT', 'Name', 'name', 'BaseUnit', 'Base Unit', 'baseUnit', 'Unit', 'SellingPrice', 'Selling Price', 'sellingPrice', 'Price'].includes(key)) {
                const value = parseFloat(row[key]);
                if (!isNaN(value) && value > 0 && product.unitConversions) {
                  product.unitConversions[key] = value;
                }
              }
            });

            products.push(product);
          });

          if (products.length > 0) {
            onProductsUpload(products, uploadMode);
            toast.success(`Imported ${products.length} products`);
          }
        }

        // Process Existing Sites sheet
        if (workbook.Sheets["Existing Sites"] && onExistingSitesUpload) {
          const sitesData = XLSX.utils.sheet_to_json(workbook.Sheets["Existing Sites"]);
          const sites: ExistingSite[] = [];

          sitesData.forEach((row: any, index: number) => {
            const name = row.Name || row.name || row.NAME || row.Site || row.site;
            const city = row.City || row.city || row.CITY || "";
            const country = row.Country || row.country || row.COUNTRY || "";
            const latitude = parseFloat(row.Latitude || row.latitude || row.LATITUDE || row.Lat || row.lat);
            const longitude = parseFloat(row.Longitude || row.longitude || row.LONGITUDE || row.Lng || row.lng);
            const capacity = parseFloat(row.Capacity || row.capacity || row.CAPACITY);
            const capacityUnit = row.CapacityUnit || row["Capacity Unit"] || row.capacityUnit || row.Unit || "m3";

            if (!name || isNaN(latitude) || isNaN(longitude) || isNaN(capacity)) return;
            if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;

            sites.push({
              id: `site-${Date.now()}-${index}`,
              name: name.toString().trim(),
              city: city.toString().trim(),
              country: country.toString().trim(),
              latitude,
              longitude,
              capacity,
              capacityUnit: capacityUnit.toString().trim(),
            });
          });

          if (sites.length > 0) {
            onExistingSitesUpload(sites, uploadMode);
            toast.success(`Imported ${sites.length} existing sites`);
          }
        }

        // Process Cost Parameters sheet
        if (workbook.Sheets["Cost Parameters"] && onCostParametersUpload) {
          const costData = XLSX.utils.sheet_to_json(workbook.Sheets["Cost Parameters"]);
          if (costData.length > 0) {
            const row: any = costData[0];
            const settings: Partial<OptimizationSettings> = {};

            const transportCost = parseFloat(row.TransportationCostPerMilePerUnit || row.transportationCostPerMilePerUnit || row["Transportation Cost"] || "0");
            const facilityCost = parseFloat(row.FacilityCost || row.facilityCost || row["Facility Cost"] || "0");
            const distanceUnit = (row.DistanceUnit || row.distanceUnit || row["Distance Unit"] || "km").toString().toLowerCase();
            const costUnit = (row.CostUnit || row.costUnit || row["Cost Unit"] || "m3").toString().trim();

            if (transportCost > 0) settings.transportationCostPerMilePerUnit = transportCost;
            if (facilityCost > 0) settings.facilityCost = facilityCost;
            if (distanceUnit === 'km' || distanceUnit === 'mile') settings.distanceUnit = distanceUnit as 'km' | 'mile';
            if (costUnit) settings.costUnit = costUnit;

            if (Object.keys(settings).length > 0) {
              onCostParametersUpload(settings);
              toast.success("Imported cost parameters");
            }
          }
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Excel upload error:", error);
        toast.error("Failed to parse Excel file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Customers
    const customersTemplate = [
      {
        Product: "Electronics",
        Name: "Customer A",
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
        City: "Los Angeles",
        Country: "USA",
        Latitude: 34.0522,
        Longitude: -118.2437,
        Demand: 1500,
        Unit: "m3"
      }
    ];
    const customersSheet = XLSX.utils.json_to_sheet(customersTemplate);
    XLSX.utils.book_append_sheet(workbook, customersSheet, "Customers");

    // Sheet 2: Products
    const productsTemplate = [
      {
        Product: "Electronics",
        BaseUnit: "pallets",
        SellingPrice: 500,
        "to_m3": 1.2,
        "to_ft3": 42.4,
        "to_kg": "",
      },
      {
        Product: "Furniture",
        BaseUnit: "m3",
        SellingPrice: 300,
        "to_m3": 1,
        "to_ft3": 35.3,
        "to_pallets": 0.83,
      }
    ];
    const productsSheet = XLSX.utils.json_to_sheet(productsTemplate);
    XLSX.utils.book_append_sheet(workbook, productsSheet, "Products");

    // Sheet 3: Existing Sites
    const sitesTemplate = [
      {
        Name: "Warehouse NYC",
        City: "New York",
        Country: "USA",
        Latitude: 40.7580,
        Longitude: -73.9855,
        Capacity: 50000,
        CapacityUnit: "m3"
      }
    ];
    const sitesSheet = XLSX.utils.json_to_sheet(sitesTemplate);
    XLSX.utils.book_append_sheet(workbook, sitesSheet, "Existing Sites");

    // Sheet 4: Cost Parameters
    const costTemplate = [
      {
        TransportationCostPerMilePerUnit: 0.5,
        FacilityCost: 100000,
        DistanceUnit: "km",
        CostUnit: "m3"
      }
    ];
    const costSheet = XLSX.utils.json_to_sheet(costTemplate);
    XLSX.utils.book_append_sheet(workbook, costSheet, "Cost Parameters");

    XLSX.writeFile(workbook, "gfa_data_template.xlsx");
    toast.success("Template downloaded with 4 sheets");
  };
  return <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Customer Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-3">Upload Mode</h3>
            <RadioGroup value={uploadMode} onValueChange={(value: 'append' | 'overwrite') => setUploadMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="append" id="append" />
                <Label htmlFor="append" className="font-normal cursor-pointer">
                  Append - Add to existing data
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="overwrite" id="overwrite" />
                <Label htmlFor="overwrite" className="font-normal cursor-pointer">
                  Overwrite - Replace all existing data
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" size="lg">
              <Upload className="mr-2 h-4 w-4" />
              Upload Excel File
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            
            <Button onClick={downloadTemplate} variant="outline" className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium">Template includes 4 sheets:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Customers - customer demand data</li>
            <li>Products - product units & conversions</li>
            <li>Existing Sites - current facilities</li>
            <li>Cost Parameters - optimization settings</li>
          </ul>
        </div>
      </CardContent>
    </Card>;
}