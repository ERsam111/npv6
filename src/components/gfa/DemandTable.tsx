import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, X } from "lucide-react";
import { CustomerLocation, Demand, Product } from "@/types/gfa";
import { toast } from "sonner";
import { getConversionFactor, getAvailableUnits } from "@/utils/unitConversions";

interface DemandTableProps {
  demands: Demand[];
  customers: CustomerLocation[];
  products: Product[];
  onAddDemand: (demand: Demand) => void;
  onRemoveDemand: (id: string) => void;
}

export function DemandTable({
  demands,
  customers,
  products,
  onAddDemand,
  onRemoveDemand,
}: DemandTableProps) {
  const [formData, setFormData] = useState({
    customerId: "",
    product: "",
    quantity: "",
    unitOfMeasure: "m3",
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.product || !formData.quantity) {
      toast.error("Customer, product, and quantity are required");
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    if (!customer) {
      toast.error("Selected customer not found");
      return;
    }

    const demand: Demand = {
      id: `demand-${Date.now()}-${Math.random()}`,
      customerId: formData.customerId,
      customerName: customer.name,
      product: formData.product.trim(),
      quantity: quantity,
      unitOfMeasure: formData.unitOfMeasure,
      conversionFactor: getConversionFactor(formData.unitOfMeasure),
    };

    onAddDemand(demand);
    
    setFormData({
      customerId: "",
      product: "",
      quantity: "",
      unitOfMeasure: "m3",
    });

    toast.success(`Added demand for ${customer.name}`);
  };

  return (
    <div className="space-y-2">
      <div className="border rounded-lg max-h-[300px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[150px]">Customer</TableHead>
              <TableHead className="w-[120px]">Product</TableHead>
              <TableHead className="w-[100px]">Quantity</TableHead>
              <TableHead className="w-[80px]">Unit</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demands.map((demand) => (
              <TableRow key={demand.id}>
                <TableCell className="text-xs">{demand.customerName}</TableCell>
                <TableCell className="text-xs">{demand.product}</TableCell>
                <TableCell className="text-xs tabular-nums">{demand.quantity}</TableCell>
                <TableCell className="text-xs">{demand.unitOfMeasure}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveDemand(demand.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full h-7 text-xs"
        disabled={customers.length === 0}
      >
        <Plus className="h-3 w-3 mr-1" />
        {showAddForm ? "Cancel" : "Add Demand"}
      </Button>

      {customers.length === 0 && (
        <p className="text-xs text-muted-foreground">Add customers first before adding demand data</p>
      )}

      {showAddForm && customers.length > 0 && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="space-y-1">
            <Label htmlFor="customerId" className="text-xs">Customer *</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
              >
                <SelectTrigger id="customerId" className="h-7 text-xs">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {customers.filter(c => c.included).map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.city}, {customer.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="product" className="text-xs">Product *</Label>
              <Select
                value={formData.product}
                onValueChange={(value) => setFormData({ ...formData, product: value })}
              >
                <SelectTrigger id="product" className="h-7 text-xs">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {products.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No products available - add products first
                    </SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.name} value={product.name}>
                        {product.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantity" className="text-xs">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1000"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unitOfMeasure" className="text-xs">Unit *</Label>
              <Select
                value={formData.unitOfMeasure}
                onValueChange={(value) => setFormData({ ...formData, unitOfMeasure: value })}
              >
                <SelectTrigger id="unitOfMeasure" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {getAvailableUnits().map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" size="sm" className="w-full h-7 text-xs">
            Add Demand
          </Button>
        </form>
      )}
    </div>
  );
}
