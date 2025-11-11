import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { Customer, Demand, Product } from "@/types/gfa";
import { toast } from "sonner";
import { getConversionFactor, getAvailableUnits } from "@/utils/unitConversions";
import { Card } from "@/components/ui/card";

interface DemandTableProps {
  demands: Demand[];
  customers: Customer[];
  products: Product[];
  onAddDemand: (demand: Demand) => void;
  onRemoveDemand: (id: string) => void;
  onUpdateDemand?: (id: string, updates: Partial<Demand>) => void;
}

export function DemandTable({
  demands,
  customers,
  products,
  onAddDemand,
  onRemoveDemand,
  onUpdateDemand,
}: DemandTableProps) {
  const [rows, setRows] = useState<Demand[]>(demands);

  useEffect(() => {
    setRows(demands);
  }, [demands]);

  const handleAddRow = () => {
    if (customers.length === 0) {
      toast.error("Add customers first before adding demand data");
      return;
    }
    if (products.length === 0) {
      toast.error("Add products first before adding demand data");
      return;
    }

    const newDemand: Demand = {
      id: `demand-${Date.now()}-${Math.random()}`,
      customerId: customers[0]?.id || "",
      customerName: customers[0]?.name || "",
      product: products[0]?.name || "",
      quantity: 0,
      unitOfMeasure: "m3",
      conversionFactor: 1,
    };

    onAddDemand(newDemand);
    toast.success("New demand row added");
  };

  const handleChange = (id: string, field: keyof Demand, value: any) => {
    const updated = rows.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        
        // Update customer name when customer changes
        if (field === "customerId") {
          const customer = customers.find(c => c.id === value);
          if (customer) {
            newRow.customerName = customer.name;
          }
        }
        
        // Update conversion factor when unit changes
        if (field === "unitOfMeasure") {
          newRow.conversionFactor = getConversionFactor(value);
        }
        
        return newRow;
      }
      return row;
    });
    
    setRows(updated);
    
    if (onUpdateDemand) {
      const updatedRow = updated.find(r => r.id === id);
      if (updatedRow) {
        onUpdateDemand(id, updatedRow);
      }
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Demand Data</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="h-7 text-xs"
            disabled={customers.length === 0 || products.length === 0}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Row
          </Button>
        </div>

        {(customers.length === 0 || products.length === 0) && (
          <p className="text-xs text-muted-foreground mb-2">
            {customers.length === 0 && "Add customers first. "}
            {products.length === 0 && "Add products first."}
          </p>
        )}

        <div className="border rounded-lg overflow-auto max-h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[200px]">Customer</TableHead>
                <TableHead className="w-[150px]">Product</TableHead>
                <TableHead className="w-[120px]">Quantity</TableHead>
                <TableHead className="w-[120px]">Unit</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs">
                    No demand data. Click "Add Row" to begin.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((demand) => (
                  <TableRow key={demand.id}>
                    <TableCell>
                      <Select
                        value={demand.customerId}
                        onValueChange={(value) => handleChange(demand.id, "customerId", value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {customers.filter(c => c.included !== false).map((customer) => (
                            <SelectItem key={customer.id} value={customer.id} className="text-xs">
                              {customer.name} ({customer.city})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={demand.product}
                        onValueChange={(value) => handleChange(demand.id, "product", value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {products.map((product) => (
                            <SelectItem key={product.name} value={product.name} className="text-xs">
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={demand.quantity}
                        onChange={(e) => handleChange(demand.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={demand.unitOfMeasure}
                        onValueChange={(value) => handleChange(demand.id, "unitOfMeasure", value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {getAvailableUnits().map((unit) => (
                            <SelectItem key={unit} value={unit} className="text-xs">
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveDemand(demand.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}
