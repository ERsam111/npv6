import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { Customer, Product, ExistingSite, OptimizationSettings } from "@/types/gfa";
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
  onProductsUpload?: (products: Product[], mode: 'append' | 'overwrite') => void;
  onExistingSitesUpload?: (sites: ExistingSite[], mode: 'append' | 'overwrite') => void;
  onCostParametersUpload?: (settings: Partial<OptimizationSettings>) => void;
}

export function ExcelUploadCompact({ 
  onBulkUpload, 
  onProductsUpload,
  onExistingSitesUpload,
  onCostParametersUpload 
}: ExcelUploadCompactProps) {
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

        // Process all 4 sheets (same logic as ExcelUpload.tsx)
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

              if (!product || !name || !city || !country || isNaN(latitude) || isNaN(longitude) || isNaN(demand) ||
                  latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || demand <= 0) {
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
            toast.success(`Imported ${customers.length} customers`);
          }
        }

        if (workbook.Sheets["Products"] && onProductsUpload) {
          const productsData = XLSX.utils.sheet_to_json(workbook.Sheets["Products"]);
          const products: Product[] = productsData.map((row: any) => {
            const name = row.Product || row.product || row.PRODUCT || row.Name || row.name;
            const baseUnit = row.BaseUnit || row["Base Unit"] || row.baseUnit || "m3";
            const sellingPrice = parseFloat(row.SellingPrice || row["Selling Price"] || row.sellingPrice || "0");
            
            const product: Product = {
              name: name?.toString().trim() || "",
              baseUnit: baseUnit.toString().trim(),
              sellingPrice: sellingPrice > 0 ? sellingPrice : undefined,
              unitConversions: {}
            };
            
            Object.keys(row).forEach((key) => {
              if (key.startsWith('to_')) {
                const value = parseFloat(row[key]);
                if (!isNaN(value) && value > 0 && product.unitConversions) {
                  product.unitConversions[key] = value;
                }
              }
            });
            
            return product;
          }).filter(p => p.name);

          if (products.length > 0) {
            onProductsUpload(products, uploadMode);
            toast.success(`Imported ${products.length} products`);
          }
        }

        if (workbook.Sheets["Existing Sites"] && onExistingSitesUpload) {
          const sitesData = XLSX.utils.sheet_to_json(workbook.Sheets["Existing Sites"]);
          console.log("Raw existing sites data from Excel:", sitesData);
          
          const sites: ExistingSite[] = sitesData.map((row: any, index: number) => {
            const site = {
              id: `site-${Date.now()}-${index}`,
              name: (row.Name || row.name || row.Site || "").toString().trim(),
              city: (row.City || row.city || "").toString().trim(),
              country: (row.Country || row.country || "").toString().trim(),
              latitude: parseFloat(row.Latitude || row.latitude || row.Lat || 0),
              longitude: parseFloat(row.Longitude || row.longitude || row.Lng || 0),
              capacity: parseFloat(row.Capacity || row.capacity || 0),
              capacityUnit: (row.CapacityUnit || row["Capacity Unit"] || row.Unit || "m3").toString().trim(),
            };
            console.log(`Site ${index}:`, site);
            return site;
          }).filter(s => {
            const isValid = s.name && 
              s.capacity > 0 && 
              !isNaN(s.latitude) && 
              !isNaN(s.longitude) &&
              s.latitude >= -90 && 
              s.latitude <= 90 && 
              s.longitude >= -180 && 
              s.longitude <= 180;
            
            if (!isValid) {
              console.log("Invalid site filtered out:", s, {
                hasName: !!s.name,
                hasCapacity: s.capacity > 0,
                validLat: !isNaN(s.latitude) && s.latitude >= -90 && s.latitude <= 90,
                validLng: !isNaN(s.longitude) && s.longitude >= -180 && s.longitude <= 180
              });
            }
            return isValid;
          });

          console.log(`Valid sites after filtering: ${sites.length} out of ${sitesData.length}`);
          
          if (sites.length > 0) {
            onExistingSitesUpload(sites, uploadMode);
            toast.success(`Imported ${sites.length} existing site(s)`);
          } else if (sitesData.length > 0) {
            toast.error(`No valid sites found. Check: name, capacity > 0, valid coordinates (-90≤lat≤90, -180≤lng≤180)`);
          }
        }

        if (workbook.Sheets["Cost Parameters"] && onCostParametersUpload) {
          const costData = XLSX.utils.sheet_to_json(workbook.Sheets["Cost Parameters"]);
          if (costData.length > 0) {
            const row: any = costData[0];
            const settings: Partial<OptimizationSettings> = {};
            const transportCost = parseFloat(row.TransportationCostPerMilePerUnit || row.transportationCostPerMilePerUnit || "0");
            const facilityCost = parseFloat(row.FacilityCost || row.facilityCost || "0");
            const distanceUnit = (row.DistanceUnit || row.distanceUnit || "km").toString().toLowerCase();
            const costUnit = (row.CostUnit || row.costUnit || "m3").toString().trim();

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
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    // All possible unit conversion columns
    const allUnitColumns = {
      to_m3: "", to_ft3: "", to_kg: "", to_tonnes: "", 
      to_lbs: "", to_liters: "", to_pallets: "", to_units: "", 
      to_sq2: "", to_cbm: "", to_sqm: "", to_sqft: ""
    };

    const customersTemplate = [
      { Product: "Electronics", Name: "Customer A", City: "New York", Country: "USA", Latitude: 40.7128, Longitude: -74.0060, Demand: 1000, Unit: "pallets" },
      { Product: "Furniture", Name: "Customer B", City: "Los Angeles", Country: "USA", Latitude: 34.0522, Longitude: -118.2437, Demand: 1500, Unit: "m3" }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(customersTemplate), "Customers");

    const productsTemplate = [
      { 
        Product: "Electronics", 
        BaseUnit: "pallets", 
        SellingPrice: 500, 
        to_m3: 1.2, 
        to_ft3: 42.4, 
        to_kg: 150, 
        ...allUnitColumns
      },
      { 
        Product: "Furniture", 
        BaseUnit: "m3", 
        SellingPrice: 300, 
        to_m3: 1, 
        to_ft3: 35.3, 
        to_liters: 1000, 
        to_pallets: 0.83, 
        ...allUnitColumns
      }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productsTemplate), "Products");

    const sitesTemplate = [
      { Name: "Warehouse NYC", City: "New York", Country: "USA", Latitude: 40.7580, Longitude: -73.9855, Capacity: 50000, CapacityUnit: "m3" },
      { Name: "", City: "", Country: "", Latitude: "", Longitude: "", Capacity: "", CapacityUnit: "" }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sitesTemplate), "Existing Sites");

    const costTemplate = [
      { TransportationCostPerMilePerUnit: 0.5, FacilityCost: 100000, DistanceUnit: "km", CostUnit: "m3" }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(costTemplate), "Cost Parameters");

    XLSX.writeFile(workbook, "gfa_data_template.xlsx");
    toast.success("Template downloaded");
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
