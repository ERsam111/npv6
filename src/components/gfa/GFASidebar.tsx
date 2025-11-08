import { Database, Upload, Package, DollarSign, Settings, Trash2 } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarMenu, useSidebar } from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Customer, Product, OptimizationSettings as OptSettings, DistributionCenter } from "@/types/gfa";
import { CustomerDataForm } from "./CustomerDataForm";
import { ProductManager } from "./ProductManager";
import { CostParameters } from "./CostParameters";
import { OptimizationSettings } from "./OptimizationSettings";
import { ExcelUpload } from "./ExcelUpload";
import { Button } from "@/components/ui/button";
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

interface GFASidebarProps {
  customers: Customer[];
  products: Product[];
  dcs: DistributionCenter[];
  settings: OptSettings;
  onAddCustomer: (customer: Customer) => void;
  onRemoveCustomer: (id: string) => void;
  onBulkUpload: (customers: Customer[], mode: "append" | "overwrite") => void;
  onProductUpdate: (
    productName: string,
    conversionFactor: number,
    unitConversions?: any[],
    sellingPrice?: number,
  ) => void;
  onSettingsChange: (settings: OptSettings) => void;
  onOptimize: () => void;
  onClearData: () => void;
}

export function GFASidebar({
  customers,
  products,
  dcs,
  settings,
  onAddCustomer,
  onRemoveCustomer,
  onBulkUpload,
  onProductUpdate,
  onSettingsChange,
  onOptimize,
  onClearData,
}: GFASidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-96"} collapsible="icon">
      <SidebarContent className="p-2">
        <div className="mb-3 px-1">
          <h2 className={`text-sm font-semibold text-muted-foreground uppercase ${isCollapsed ? "hidden" : ""}`}>
            GENERAL DATA
          </h2>
        </div>

        <SidebarGroup className="space-y-2">
          <SidebarMenu className="space-y-2">
            <Accordion type="single" collapsible defaultValue="data-upload" className="w-full space-y-2">
              {/* Data Upload */}
              <AccordionItem
                value="data-upload"
                className="border-none bg-primary/5 rounded-lg px-2 border border-primary/20"
              >
                <AccordionTrigger className="flex items-center justify-start gap-2 w-full px-2 py-1.5 hover:bg-primary/10 rounded-md hover:no-underline">
                  <Upload className="h-4 w-4 text-primary" />
                  {!isCollapsed && (
                    <span className="text-sm font-semibold text-primary text-left flex-1">Data Upload</span>
                  )}
                </AccordionTrigger>
                {/* ↓↓↓ Compact only the opened content */}
                <AccordionContent className="mt-1 px-1 pb-2 gfa-compact">
                  {!isCollapsed && (
                    <div className="space-y-2">
                      <ExcelUpload onBulkUpload={onBulkUpload} />
                      {customers.length > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="w-full">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Clear All Data
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
                              <AlertDialogAction onClick={onClearData}>Clear All</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Customers */}
              <AccordionItem value="customers" className="border-none">
                <AccordionTrigger className="flex items-center justify-start gap-2 w-full px-2 py-1.5 hover:bg-muted rounded-md hover:no-underline">
                  <Database className="h-4 w-4" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium text-left flex-1">
                      Customer and Demand {customers.length > 0 && `(${customers.length})`}
                    </span>
                  )}
                </AccordionTrigger>
                <AccordionContent className="mt-1 px-1 pb-2 gfa-compact">
                  {!isCollapsed && (
                    <CustomerDataForm
                      customers={customers}
                      onAddCustomer={onAddCustomer}
                      onRemoveCustomer={onRemoveCustomer}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Products */}
              <AccordionItem value="products" className="border-none">
                <AccordionTrigger className="flex items-center justify-start gap-2 w-full px-2 py-1.5 hover:bg-muted rounded-md hover:no-underline">
                  <Package className="h-4 w-4" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium text-left flex-1">
                      Products {products.length > 0 && `(${products.length})`}
                    </span>
                  )}
                </AccordionTrigger>
                <AccordionContent className="mt-1 px-1 pb-2 gfa-compact">
                  {!isCollapsed && (
                    <ProductManager
                      products={products}
                      onProductUpdate={onProductUpdate}
                      targetUnit={settings.capacityUnit}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Cost Parameters */}
              <AccordionItem value="cost-parameters" className="border-none">
                <AccordionTrigger className="flex items-center justify-start gap-2 w-full px-2 py-1.5 hover:bg-muted rounded-md hover:no-underline">
                  <DollarSign className="h-4 w-4" />
                  {!isCollapsed && <span className="text-sm font-medium text-left flex-1">Cost Parameters</span>}
                </AccordionTrigger>
                <AccordionContent className="mt-1 px-1 pb-2 gfa-compact">
                  {!isCollapsed && (
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
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Optimization */}
              <AccordionItem
                value="optimization"
                className="border-none bg-primary/5 rounded-lg px-2 border border-primary/20"
              >
                <AccordionTrigger className="flex items-center justify-start gap-2 w-full px-2 py-1.5 hover:bg-primary/10 rounded-md hover:no-underline">
                  <Settings className="h-4 w-4 text-primary" />
                  {!isCollapsed && (
                    <span className="text-sm font-semibold text-primary text-left flex-1">Optimization Setting</span>
                  )}
                </AccordionTrigger>
                <AccordionContent className="mt-1 px-1 pb-2 gfa-compact">
                  {!isCollapsed && (
                    <OptimizationSettings
                      settings={settings}
                      onSettingsChange={onSettingsChange}
                      onOptimize={onOptimize}
                      disabled={customers.length === 0}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
