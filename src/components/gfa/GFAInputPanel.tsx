import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Users, TrendingUp } from "lucide-react";
import { Customer, Product, OptimizationSettings, ExistingSite, CustomerLocation, Demand } from "@/types/gfa";
import { ExcelUpload } from "./ExcelUpload";
import { GFAEditableTable } from "./GFAEditableTable";
import { CostParameters } from "./CostParameters";
import { CustomerMapView } from "./CustomerMapView";
import { CustomerTable } from "./CustomerTable";
import { DemandTable } from "./DemandTable";
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
import { useState, useMemo } from "react";

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
  // Extract unique customer locations from customers
  const uniqueCustomers = useMemo((): CustomerLocation[] => {
    const customerMap = new Map<string, CustomerLocation>();
    customers.forEach(c => {
      const key = `${c.name}-${c.city}-${c.country}`;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: c.id,
          name: c.name,
          city: c.city,
          country: c.country,
          latitude: c.latitude,
          longitude: c.longitude,
          included: c.included !== false,
        });
      }
    });
    return Array.from(customerMap.values());
  }, [customers]);

  const handleAddCustomerLocation = (newCustomer: CustomerLocation) => {
    // Create a temporary customer entry to hold the location
    const tempCustomer: Customer = {
      ...newCustomer,
      product: "",
      demand: 0,
      unitOfMeasure: "m3",
      conversionFactor: 1,
    };
    onCustomersChange([...customers, tempCustomer]);
    toast.success("Customer location added. Now add demand data for this customer.");
  };

  const handleAddDemand = (demand: Demand) => {
    const customerLoc = uniqueCustomers.find(c => c.id === demand.customerId);
    if (!customerLoc) {
      toast.error("Customer location not found");
      return;
    }
    
    const newCustomer: Customer = {
      id: `customer-${Date.now()}-${Math.random()}`,
      name: customerLoc.name,
      city: customerLoc.city,
      country: customerLoc.country,
      latitude: customerLoc.latitude,
      longitude: customerLoc.longitude,
      product: demand.product,
      demand: demand.quantity,
      unitOfMeasure: demand.unitOfMeasure,
      conversionFactor: demand.conversionFactor,
      included: customerLoc.included,
    };
    
    onCustomersChange([...customers, newCustomer]);
  };

  const handleRemoveCustomerLocation = (id: string) => {
    // Remove all customer entries with this location
    const updatedCustomers = customers.filter(c => c.id !== id);
    onCustomersChange(updatedCustomers);
  };

  const handleUpdateCustomerLocation = (id: string, updates: Partial<CustomerLocation>) => {
    const updatedCustomers = customers.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    onCustomersChange(updatedCustomers);
  };

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


  return (
    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      {/* Customer Map - Pure Input Visualization */}
      {customers.length > 0 && <CustomerMapView customers={customers} />}
      
      {/* Section 1: Data Upload */}
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

      {/* Section 1: Customers */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Users className="h-3.5 w-3.5" />
                1. Customers
              </CardTitle>
              <CardDescription className="text-[11px]">Customer locations and details</CardDescription>
            </div>
            {uniqueCustomers.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5 h-7 text-[11px]">
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all customers?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all customer location data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCustomers}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3">
          <CustomerTable
            customers={uniqueCustomers}
            onAddCustomer={handleAddCustomerLocation}
            onRemoveCustomer={handleRemoveCustomerLocation}
            onUpdateCustomer={handleUpdateCustomerLocation}
          />
        </CardContent>
      </Card>

      {/* Section 2: Demand */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                2. Demand
              </CardTitle>
              <CardDescription className="text-[11px]">Product demand by customer</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3">
          <DemandTable
            demands={customers.filter(c => c.product).map(c => ({
              id: c.id,
              customerId: c.id,
              customerName: c.name,
              product: c.product,
              quantity: c.demand,
              unitOfMeasure: c.unitOfMeasure,
              conversionFactor: c.conversionFactor,
            }))}
            customers={uniqueCustomers}
            products={products}
            onAddDemand={handleAddDemand}
            onRemoveDemand={(id) => {
              const updatedCustomers = customers.filter(c => c.id !== id);
              onCustomersChange(updatedCustomers);
            }}
            onUpdateDemand={(id, updates) => {
              const updatedCustomers = customers.map(c => 
                c.id === id ? { 
                  ...c, 
                  product: updates.product || c.product,
                  demand: updates.quantity !== undefined ? updates.quantity : c.demand,
                  unitOfMeasure: updates.unitOfMeasure || c.unitOfMeasure,
                  conversionFactor: updates.conversionFactor || c.conversionFactor,
                } : c
              );
              onCustomersChange(updatedCustomers);
            }}
          />
        </CardContent>
      </Card>

      {/* Section 3: Products */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">3. Products</CardTitle>
              <CardDescription className="text-[11px]">Product catalog and attributes</CardDescription>
            </div>
            {products.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5 h-7 text-[11px]">
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all products?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all product data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearProducts}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3">
          <GFAEditableTable
            tableType="products"
            data={products}
            onDataChange={(data) => onProductsChange(data as Product[])}
          />
        </CardContent>
      </Card>

      {/* Section 4: Existing Sites */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">4. Existing Sites</CardTitle>
          <CardDescription className="text-[11px]">Optional existing facility locations</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3">
          <GFAEditableTable
            tableType="existing-sites"
            data={existingSites}
            onDataChange={(data) => onExistingSitesChange(data as ExistingSite[])}
          />
        </CardContent>
      </Card>

      {/* Section 5: Cost Parameters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">5. Cost Parameters</CardTitle>
          <CardDescription className="text-[11px]">Transportation and facility costs</CardDescription>
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
    </div>
  );
}
