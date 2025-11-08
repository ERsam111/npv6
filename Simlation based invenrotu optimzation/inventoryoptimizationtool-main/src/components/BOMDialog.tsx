import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

interface RawMaterialEntry {
  material: string;
  quantity: number;
}

interface BOMDialogProps {
  currentValue: string;
  onSave: (value: string) => void;
  availableProducts: string[];
}

export const BOMDialog = ({ currentValue, onSave, availableProducts }: BOMDialogProps) => {
  const [open, setOpen] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialEntry[]>(() => {
    // Parse current value: "Raw_Material_1(2), Raw_Material_2(1)"
    if (!currentValue || currentValue.trim() === "") {
      return [];
    }
    
    const pairs = currentValue.split(',').map(s => s.trim());
    return pairs.map(pair => {
      const match = pair.match(/^(.+)\(([0-9.]+)\)$/);
      if (match) {
        return {
          material: match[1].trim(),
          quantity: parseFloat(match[2])
        };
      }
      return { material: "", quantity: 0 };
    }).filter(entry => entry.material !== "");
  });

  const handleAddRawMaterial = () => {
    setRawMaterials([...rawMaterials, { material: "", quantity: 1 }]);
  };

  const handleRemoveRawMaterial = (index: number) => {
    setRawMaterials(rawMaterials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, material: string) => {
    const updated = [...rawMaterials];
    updated[index].material = material;
    setRawMaterials(updated);
  };

  const handleQuantityChange = (index: number, quantity: string) => {
    const updated = [...rawMaterials];
    updated[index].quantity = parseFloat(quantity) || 0;
    setRawMaterials(updated);
  };

  const handleSave = () => {
    // Format as: "Raw_Material_1(2), Raw_Material_2(1)"
    const formatted = rawMaterials
      .filter(rm => rm.material && rm.quantity > 0)
      .map(rm => `${rm.material}(${rm.quantity})`)
      .join(', ');
    
    onSave(formatted);
    setOpen(false);
    toast.success("BOM updated successfully");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Package className="h-4 w-4 mr-2" />
          {currentValue || "Click to add raw materials"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-background z-50">
        <DialogHeader>
          <DialogTitle>Raw Materials Configuration</DialogTitle>
          <DialogDescription>
            Add raw materials and their quantities required for production
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto py-4">
          {rawMaterials.map((entry, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor={`material-${index}`}>Raw Material</Label>
                <Select
                  value={entry.material}
                  onValueChange={(value) => handleMaterialChange(index, value)}
                >
                  <SelectTrigger id={`material-${index}`} className="bg-background">
                    <SelectValue placeholder="Select raw material" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-[60]">
                    {availableProducts
                      .filter(product => product && product.trim() !== "")
                      .map((product) => (
                        <SelectItem key={product} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32">
                <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                <Input
                  id={`quantity-${index}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={entry.quantity}
                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                  className="bg-background"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveRawMaterial(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {rawMaterials.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No raw materials added yet. Click "Add Raw Material" to get started.
            </p>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddRawMaterial}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Raw Material
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save BOM
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
