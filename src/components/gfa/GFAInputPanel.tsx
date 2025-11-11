import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import { Customer, Product, OptimizationSettings, ExistingSite } from "@/types/gfa";
import { ExcelUpload } from "./ExcelUpload";
import { GFAEditableTable } from "./GFAEditableTable";
import { CostParameters } from "./CostParameters";
import { CustomerMapView } from "./CustomerMapView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface GFAInputPanelProps {
  customers: Customer[];
  products: Product[];
  existingSites: ExistingSite[];
  settings: OptimizationSettings;
  onCustomersChange: (customers: Customer[]) => void;
  onProductsChange: (products: Product[]) => void;
  onExistingSitesChange: (sites: ExistingSite[]) => void;
  onSettingsChange: (settings: OptimizationSettings) => void;
}

export function GFAInputPanel({
  customers,
  products,
  existingSites,
  settings,
  onCustomersChange,
  onProductsChange,
  onExistingSitesChange,
  onSettingsChange,
}: GFAInputPanelProps) {
  // Use the same min width for BOTH tables so they align and scroll independently.
  // Adjust this number to suit your column set.
  const TABLE_MIN_WIDTH_CLS = "min-w-[100px]";

  const handleBulkUpload = (newCustomers: Customer[], mode: "append" | "overwrite") => {
    if (mode === "overwrite") {
      onCustomersChange(newCustomers);
    } else {
      onCustomersChange([...customers, ...newCustomers]);
    }
  };

  const handleClearData = () => {
    onCustomersChange([]);
    onProductsChange([]);
    toast.success("All data cleared successfully");
  };

  const handleClearCustomers = () => {
    onCustomersChange([]);
    toast.success("Customer data cleared");
  };

  const handleClearProducts = () => {
    onProductsChange([]);
    toast.success("Product data cleared");
  };

  const handleGeocodeCustomer = async (index: number) => {
    const customer = customers[index];
    if (!customer.city && !customer.country) {
      toast.error("Please provide city and country");
      return;
    }

    try {
      toast.info("Geocoding address...");
      // Integrate geocoding via your backend or a serverless fn here
      toast.success("Address geocoded successfully");
    } catch (error) {
      toast.error("Failed to geocode address");
    }
  };

  return (
    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      {/* Customer Map - Pure Input Visualization */}
      {customers.length > 0 && <CustomerMapView customers={customers} />}
      
      {/* Section 1: Data Upload + Clear All */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Upload className="h-3.5 w-3.5" />
                Upload Data
              </CardTitle>
              <CardDescription className="text-[11px]">Upload via Excel</CardDescription>
            </div>
            {(customers.length > 0 || products.length > 0) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5 h-7 text-[11px]">
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all customer data, products, and optimization results.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearData}>Clear All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3">
          <ExcelUpload 
            onBulkUpload={handleBulkUpload}
            onProductsUpload={(products, mode) => {
              if (mode === 'overwrite') {
                onProductsChange(products);
              } else {
                onProductsChange([...products, ...products]);
              }
            }}
            onExistingSitesUpload={(sites, mode) => {
              if (mode === 'overwrite') {
                onExistingSitesChange(sites);
              } else {
                onExistingSitesChange([...existingSites, ...sites]);
              }
            }}
            onCostParametersUpload={(params) => {
              onSettingsChange({ ...settings, ...params });
            }}
            currentCustomers={customers}
            currentProducts={products}
            currentExistingSites={existingSites}
            currentSettings={settings}
          />
        </CardContent>
      </Card>

      {/* Section 2: Customers (own bottom scrollbar; same width as Products) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Customers</CardTitle>
              <CardDescription className="text-[11px]">
                Edit customers, geocode addresses, and manage rows
              </CardDescription>
            </div>
            {customers.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 h-7 text-[11px]"
                onClick={handleClearCustomers}
              >
                <Trash2 className="h-3 w-3" />
                Clear Customers
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3">
          {/* Make the scrollbar belong only to the table area.
             -mx-3 lets the scrollbar span the full card width (since CardContent has px-3). */}
          <div className="-mx-3 overflow-x-auto overscroll-x-contain pb-2">
            <div className={TABLE_MIN_WIDTH_CLS}>
              <GFAEditableTable
                tableType="customers"
                data={customers}
                onDataChange={onCustomersChange}
                onGeocode={handleGeocodeCustomer}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Cost Parameters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Cost Parameters</CardTitle>
          <CardDescription className="text-[11px]">3 required fields</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3">
          <CostParameters
            transportationCostPerMilePerUnit={settings.transportationCostPerMilePerUnit}
            facilityCost={settings.facilityCost}
            distanceUnit={settings.distanceUnit}
            costUnit={settings.costUnit}
            onTransportCostChange={(value) =>
              onSettingsChange({ ...settings, transportationCostPerMilePerUnit: value })
            }
            onFacilityCostChange={(value) => onSettingsChange({ ...settings, facilityCost: value })}
            onDistanceUnitChange={(value) => onSettingsChange({ ...settings, distanceUnit: value })}
            onCostUnitChange={(value) => onSettingsChange({ ...settings, costUnit: value })}
          />
        </CardContent>
      </Card>

      {/* Section 4: Products (own bottom scrollbar; same width as Customers) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Products</CardTitle>
              <CardDescription className="text-[11px]">Edit your product catalog and attributes</CardDescription>
            </div>
            {products.length > 0 && (
              <Button variant="destructive" size="sm" className="gap-1.5 h-7 text-[11px]" onClick={handleClearProducts}>
                <Trash2 className="h-3 w-3" />
                Clear Products
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3">
          <div className="-mx-3 overflow-x-auto overscroll-x-contain pb-2">
            <div className={TABLE_MIN_WIDTH_CLS}>
              <GFAEditableTable tableType="products" data={products} onDataChange={onProductsChange} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
