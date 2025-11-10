import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Product, UnitConversion } from "@/types/gfa";
import { Package, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getAvailableUnits } from "@/utils/unitConversions";

interface ProductManagerProps {
  products: Product[];
  onProductUpdate: (productName: string, unitConversions?: { [key: string]: number }, sellingPrice?: number) => void;
  targetUnit: string; // The unit that all products should convert to
}

export function ProductManager({ products, onProductUpdate, targetUnit }: ProductManagerProps) {
  const [newConversions, setNewConversions] = useState<{ [key: string]: { fromUnit: string; toUnit: string; factor: string } }>({});

  if (products.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Units, Selling Price & Conversions
            </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Add customer data to manage product units and conversions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-auto max-h-[250px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[150px]">Product</TableHead>
              <TableHead className="w-[100px]">Base Unit</TableHead>
              <TableHead className="w-[150px]">Selling Price</TableHead>
              <TableHead>Unit Conversions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const newConv = newConversions[product.name] || { fromUnit: '', toUnit: '', factor: '' };
              
              return (
                <TableRow key={product.name}>
                  <TableCell className="text-xs font-medium">{product.name}</TableCell>
                  <TableCell className="text-xs">{product.baseUnit}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={product.sellingPrice || ''}
                      onChange={(e) => {
                        const price = e.target.value ? parseFloat(e.target.value) : undefined;
                        onProductUpdate(product.name, product.unitConversions, price);
                      }}
                      className="h-7 text-xs w-[120px]"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {/* Existing Conversions */}
                      {product.unitConversions && Object.keys(product.unitConversions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {Object.entries(product.unitConversions).map(([unitName, factor]) => (
                            <div key={unitName} className="flex items-center gap-1 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              <span>{unitName}: {factor}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = { ...product.unitConversions };
                                  delete updated[unitName];
                                  onProductUpdate(product.name, updated, product.sellingPrice);
                                  toast.success("Conversion removed");
                                }}
                                className="h-4 w-4 p-0 hover:bg-destructive/20"
                              >
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add New Conversion */}
                      <div className="flex items-center gap-1">
                        <Select
                          value={newConv.fromUnit}
                          onValueChange={(value) => setNewConversions({ 
                            ...newConversions, 
                            [product.name]: { ...newConv, fromUnit: value } 
                          })}
                        >
                          <SelectTrigger className="h-6 text-[10px] w-[70px]">
                            <SelectValue placeholder="From" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableUnits().map((unit) => (
                              <SelectItem key={unit} value={unit} className="text-xs">
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-[10px]">=</span>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="Factor"
                          value={newConv.factor}
                          onChange={(e) => setNewConversions({ 
                            ...newConversions, 
                            [product.name]: { ...newConv, factor: e.target.value } 
                          })}
                          className="h-6 text-[10px] w-[60px]"
                        />
                        <Select
                          value={newConv.toUnit}
                          onValueChange={(value) => setNewConversions({ 
                            ...newConversions, 
                            [product.name]: { ...newConv, toUnit: value } 
                          })}
                        >
                          <SelectTrigger className="h-6 text-[10px] w-[70px]">
                            <SelectValue placeholder="To" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableUnits().map((unit) => (
                              <SelectItem key={unit} value={unit} className="text-xs">
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!newConv.fromUnit || !newConv.toUnit || !newConv.factor) {
                              toast.error("Fill all fields");
                              return;
                            }
                            const unitName = `to_${newConv.toUnit}`;
                            const updated = {
                              ...(product.unitConversions || {}),
                              [unitName]: parseFloat(newConv.factor)
                            };
                            onProductUpdate(product.name, updated, product.sellingPrice);
                            setNewConversions({ ...newConversions, [product.name]: { fromUnit: '', toUnit: '', factor: '' } });
                            toast.success("Added");
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
