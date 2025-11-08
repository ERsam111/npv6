import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { ParameterSetupDialog } from "./ParameterSetupDialog";
import { DistributionParameterDialog } from "./DistributionParameterDialog";
import { BOMDialog } from "./BOMDialog";

interface EditableTableProps {
  title: string;
  description?: string;
  columns: string[];
  data: any[];
  onDataChange: (newData: any[]) => void;
  dropdownOptions?: Record<string, string[]>;
  inventoryPolicyData?: any[];
}

export const EditableTable = ({
  title,
  description,
  columns,
  data,
  onDataChange,
  dropdownOptions,
  inventoryPolicyData,
}: EditableTableProps) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Auto-populate Simulation Policy
  useEffect(() => {
    if (inventoryPolicyData && data.length > 0 && columns.includes("Simulation Policy")) {
      const updatedData = data.map((row) => {
        const facilityName = row["Facility Name"];
        const productName = row["Product"];

        if (facilityName && productName) {
          const policy = inventoryPolicyData.find(
            (p: any) => p["Facility Name"] === facilityName && p["Product Name"] === productName,
          );
          if (policy?.["Simulation Policy"]) {
            return { ...row, "Simulation Policy": policy["Simulation Policy"] };
          }
        }
        return row;
      });
      if (JSON.stringify(updatedData) !== JSON.stringify(data)) {
        onDataChange(updatedData);
      }
    }
  }, [data, inventoryPolicyData]);

  const handleCellClick = (rowIndex: number, column: string, value: any) => {
    setEditingCell({ row: rowIndex, col: column });
    setEditValue(value?.toString() || "");
  };

  const handleCellSave = () => {
    if (editingCell) {
      const newData = [...data];
      newData[editingCell.row][editingCell.col] = editValue;
      onDataChange(newData);
      setEditingCell(null);
      toast.success("Cell updated");
    }
  };

  const handleAddRow = () => {
    const newRow: any = {};
    columns.forEach((col) => (newRow[col] = col === "Parameter Setup" ? JSON.stringify([]) : ""));
    onDataChange([...data, newRow]);
    toast.success("Row added");
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = data.filter((_, i) => i !== rowIndex);
    onDataChange(newData);
    toast.success("Row deleted");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCellSave();
    else if (e.key === "Escape") setEditingCell(null);
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button onClick={handleAddRow} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col}
                  className="min-w-[150px]"
                >
                  {col}
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col) => (
                  <TableCell
                    key={col}
                    className="cursor-pointer"
                    onClick={() => col !== "Parameter Setup" && handleCellClick(rowIndex, col, row[col])}
                  >
                        {/* === DIALOG TYPES === */}
                        {col === "Parameter Setup" ? (
                          <ParameterSetupDialog
                            facilityName={row["Facility Name"] || ""}
                            productName={row["Product"] || ""}
                            simulationPolicy={row["Simulation Policy"] || ""}
                            parameters={row[col] ? JSON.parse(row[col]) : []}
                            onSave={(params) => {
                              const newData = [...data];
                              newData[rowIndex][col] = JSON.stringify(params);
                              onDataChange(newData);
                              toast.success("Parameters updated");
                            }}
                          />
                        ) : col === "BOM" ? (
                          // Show dropdown for BOM ID selection
                          editingCell?.row === rowIndex && editingCell?.col === col ? (
                            <div className="flex gap-1">
                              <Select
                                value={editValue}
                                onValueChange={(val) => {
                                  const newData = [...data];
                                  newData[rowIndex][col] = val;
                                  onDataChange(newData);
                                  setEditingCell(null);
                                  toast.success("BOM selected");
                                }}
                              >
                                <SelectTrigger className="h-8 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(dropdownOptions?.["BOM ID"] || [])
                                    .filter((opt) => opt)
                                    .map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span>{row[col] ?? ""}</span>
                          )
                        ) : col === "Raw Materials" ? (
                          <BOMDialog
                            currentValue={row[col] || ""}
                            availableProducts={dropdownOptions?.["Raw Material"] || []}
                            onSave={(val) => {
                              const newData = [...data];
                              newData[rowIndex][col] = val;
                              onDataChange(newData);
                            }}
                          />
                        ) : col === "Quantity" ? (
                          <DistributionParameterDialog
                            currentValue={row[col] || ""}
                            onSave={(val) => {
                              const newData = [...data];
                              newData[rowIndex][col] = val;
                              onDataChange(newData);
                              toast.success("Quantity distribution updated");
                            }}
                          />
                        ) : col === "Transport Time Distribution" ? (
                          <DistributionParameterDialog
                            currentValue={row[col] || ""}
                            onSave={(val) => {
                              const newData = [...data];
                              newData[rowIndex][col] = val;
                              onDataChange(newData);
                              toast.success("Transport time distribution updated");
                            }}
                          />
                        ) : col === "Time Between Orders" ? (
                          <DistributionParameterDialog
                            currentValue={row[col] || ""}
                            onSave={(val) => {
                              const newData = [...data];
                              newData[rowIndex][col] = val;
                              onDataChange(newData);
                              toast.success("Time between orders distribution updated");
                            }}
                          />
                        ) : col === "Simulation Policy" && inventoryPolicyData ? (
                          <span className="text-foreground font-medium">{row[col] ?? ""}</span>
                        ) : editingCell?.row === rowIndex && editingCell?.col === col ? (
                          <div className="flex gap-1">
                            {dropdownOptions?.[col] ? (
                              <Select
                                value={editValue}
                                onValueChange={(val) => {
                                  const newData = [...data];
                                  newData[rowIndex][col] = val;
                                  onDataChange(newData);
                                  setEditingCell(null);
                                  toast.success("Cell updated");
                                }}
                              >
                                <SelectTrigger className="h-8 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {dropdownOptions[col]
                                    .filter((opt) => opt)
                                    .map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <>
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  onBlur={handleCellSave}
                                  autoFocus
                                  className="h-8"
                                />
                                <Button onClick={handleCellSave} size="sm" variant="ghost" className="h-8 px-2">
                                  <Save className="h-4 w-4" />
                                </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <span>{row[col] ?? ""}</span>
                )}
              </TableCell>
            ))}

            <TableCell>
              <Button
                onClick={() => handleDeleteRow(rowIndex)}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
</Card>
  );
};
