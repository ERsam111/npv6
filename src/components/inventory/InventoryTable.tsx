import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { TableColumnFilter, ColumnFilter, SortDirection, applyColumnFilter, applySorting } from "@/components/ui/table-column-filter";

interface InventoryTableProps {
  tableType: string;
  tableData: Record<string, Record<string, any>[]>;
  onDataChange: (tableType: string, data: Record<string, any>[]) => void;
}

const getTableColumns = (tableType: string, masterData: Record<string, Record<string, any>[]>): { key: string; label: string; type?: string; options?: string[] }[] => {
  // Extract IDs from master tables
  const customerIds = masterData.customers?.map(c => c.customer_id).filter(Boolean) || [];
  const facilityIds = masterData.facilities?.map(f => f.facility_id).filter(Boolean) || [];
  const plantIds = masterData.plants?.map(p => p.plant_id).filter(Boolean) || [];
  const productIds = masterData.products?.map(p => p.product_id).filter(Boolean) || [];
  const vehicleIds = masterData.vehicles?.map(v => v.vehicle_id).filter(Boolean) || [];
  const locationIds = [...customerIds, ...facilityIds, ...plantIds];
  

  const columnDefs: Record<string, any[]> = {
    customers: [
      { key: "customer_id", label: "Customer ID" },
      { key: "customer_name", label: "Customer Name" },
      { key: "lat", label: "Latitude", type: "number" },
      { key: "lon", label: "Longitude", type: "number" },
      { key: "city", label: "City" },
      { key: "region", label: "Region" },
      { key: "country", label: "Country" },
    ],
    facilities: [
      { key: "facility_id", label: "Facility ID" },
      { key: "facility_name", label: "Facility Name" },
      { key: "facility_type", label: "Type", type: "select", options: ["DC", "WAREHOUSE"] },
      { key: "lat", label: "Latitude", type: "number" },
      { key: "lon", label: "Longitude", type: "number" },
      { key: "city", label: "City" },
      { key: "region", label: "Region" },
      { key: "country", label: "Country" },
    ],
    plants: [
      { key: "plant_id", label: "Plant ID" },
      { key: "plant_name", label: "Plant Name" },
      { key: "production_capacity", label: "Production Capacity", type: "number" },
      { key: "lat", label: "Latitude", type: "number" },
      { key: "lon", label: "Longitude", type: "number" },
      { key: "city", label: "City" },
      { key: "region", label: "Region" },
      { key: "country", label: "Country" },
    ],
    products: [
      { key: "product_id", label: "Product ID" },
      { key: "uom", label: "UOM" },
      { key: "weight_kg_per_unit", label: "Weight (kg/unit)", type: "number" },
      { key: "cube_m3_per_unit", label: "Volume (m³/unit)", type: "number" },
    ],
    vehicles: [
      { key: "vehicle_id", label: "Vehicle ID" },
      { key: "vehicle_type", label: "Vehicle Type" },
      { key: "capacity_units", label: "Capacity (units)", type: "number" },
      { key: "capacity_kg", label: "Capacity (kg)", type: "number" },
      { key: "capacity_m3", label: "Capacity (m³)", type: "number" },
      { key: "cost_per_km", label: "Cost per km", type: "number" },
      { key: "cost_per_trip", label: "Cost per trip", type: "number" },
    ],
    demand: [
      { key: "customer_id", label: "Customer ID", type: "select", options: customerIds },
      { key: "product_id", label: "Product ID", type: "select", options: productIds },
      { key: "demand_model", label: "Model", type: "select", options: ["normal", "triangular", "uniform", "poisson"] },
      { key: "param1", label: "Param 1", type: "number" },
      { key: "param2", label: "Param 2", type: "number" },
      { key: "param3", label: "Param 3", type: "number" },
      { key: "calendar", label: "Calendar", type: "select", options: ["daily", "weekly"] },
    ],
    capacity: [
      { key: "location_id", label: "Location ID", type: "select", options: [...facilityIds, ...plantIds] },
      { key: "product_id", label: "Product ID", type: "select", options: productIds },
      { key: "max_units_capacity", label: "Max Capacity", type: "number" },
    ],
    sourcing: [
      { key: "ship_from_location_id", label: "From Location", type: "select", options: locationIds },
      { key: "ship_to_location_id", label: "To Location", type: "select", options: locationIds },
      { key: "product_id", label: "Product ID", type: "select", options: productIds },
      { key: "is_allowed", label: "Allowed", type: "select", options: ["true", "false"] },
      { key: "preference_rank", label: "Rank", type: "number" },
    ],
    transport: [
      { key: "origin_id", label: "Origin", type: "select", options: locationIds },
      { key: "dest_id", label: "Destination", type: "select", options: locationIds },
      { key: "product_id", label: "Product ID", type: "select", options: productIds },
      { key: "vehicle_id", label: "Vehicle ID", type: "select", options: vehicleIds },
      { key: "lead_time_model", label: "LT Model", type: "select", options: ["normal", "triangular", "uniform"] },
      { key: "lt_param1", label: "LT Param 1", type: "number" },
      { key: "lt_param2", label: "LT Param 2", type: "number" },
      { key: "lt_param3", label: "LT Param 3", type: "number" },
      { key: "cost_model", label: "Cost Model", type: "select", options: ["per_unit", "per_shipment", "per_km"] },
      { key: "cost_param1", label: "Cost Param 1", type: "number" },
      { key: "cost_param2", label: "Cost Param 2", type: "number" },
    ],
    production: [
      { key: "plant_id", label: "Plant ID", type: "select", options: plantIds },
      { key: "product_id", label: "Product ID", type: "select", options: productIds },
      { key: "prod_rate_units_per_day", label: "Rate (units/day)", type: "number" },
      { key: "setup_time_days", label: "Setup (days)", type: "number" },
      { key: "prod_cost_per_unit", label: "Cost/unit", type: "number" },
    ],
    policy: [
      { key: "location_id", label: "Location ID", type: "select", options: [...facilityIds, ...plantIds] },
      { key: "product_id", label: "Product ID", type: "select", options: productIds },
      { key: "initial_s", label: "Initial s (min)", type: "number" },
      { key: "initial_S", label: "Initial S (max)", type: "number" },
    ],
    financial: [
      { key: "product_id", label: "Product ID", type: "select", options: productIds },
      { key: "holding_cost_per_unit_day", label: "Holding Cost", type: "number" },
      { key: "backorder_penalty_per_unit_day", label: "Backorder Penalty", type: "number" },
      { key: "lost_sale_penalty_per_unit", label: "Lost Sale Penalty", type: "number" },
      { key: "ordering_cost_per_order", label: "Ordering Cost", type: "number" },
    ],
  };

  return columnDefs[tableType] || [];
};

export function InventoryTable({ tableType, tableData, onDataChange }: InventoryTableProps) {
  const rows = tableData[tableType] || [];
  const columns = getTableColumns(tableType, tableData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [columnSorts, setColumnSorts] = useState<Record<string, SortDirection>>({});

  const setRows = (newRows: Record<string, any>[]) => {
    onDataChange(tableType, newRows);
  };

  const handleFilterChange = (key: string, filter?: ColumnFilter) => {
    setColumnFilters((prev) => {
      const updated = { ...prev };
      if (filter) {
        updated[key] = filter;
      } else {
        delete updated[key];
      }
      return updated;
    });
  };

  const handleSortChange = (key: string, sort: SortDirection) => {
    setColumnSorts({ [key]: sort }); // Only one sort at a time
  };

  const clearFilters = () => {
    setColumnFilters({});
    setColumnSorts({});
  };

  // Apply filters
  let filteredRows = rows.filter((row) => {
    return Object.entries(columnFilters).every(([key, filter]) => {
      return applyColumnFilter(row[key], filter);
    });
  });

  // Apply sorting
  const sortEntry = Object.entries(columnSorts).find(([_, dir]) => dir !== null);
  if (sortEntry) {
    const [key, direction] = sortEntry;
    filteredRows = applySorting(filteredRows, key, direction);
  }

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tableType);
    XLSX.writeFile(wb, `${tableType}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${tableType} data exported successfully`);
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setRows(jsonData as Record<string, any>[]);
        toast.success(`${tableType} data imported successfully`);
      } catch (error) {
        toast.error("Failed to import file");
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    columns.forEach((col) => {
      newRow[col.key] = "";
    });
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleCellChange = (rowIndex: number, key: string, value: any) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][key] = value;
    setRows(updatedRows);
  };

  return (
    <Card className="p-6 h-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold capitalize">
          {tableType.replace(/_/g, " ")} 
          {(Object.keys(columnFilters).length > 0 || Object.values(columnSorts).some(s => s)) && (
            <span className="ml-2 text-sm text-muted-foreground">
              ({filteredRows.length} of {rows.length})
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {(Object.keys(columnFilters).length > 0 || Object.values(columnSorts).some(s => s)) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button onClick={handleAddRow} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              {columns.map((col) => (
                <TableHead 
                  key={col.key}
                  className="border-r px-2 py-3 bg-muted/50"
                >
                  <TableColumnFilter
                    columnKey={col.key}
                    columnLabel={col.label}
                    dataType={col.type === "number" ? "number" : "text"}
                    currentFilter={columnFilters[col.key]}
                    currentSort={columnSorts[col.key] || null}
                    onFilterChange={(filter) => handleFilterChange(col.key, filter)}
                    onSortChange={(sort) => handleSortChange(col.key, sort)}
                  />
                </TableHead>
              ))}
              <TableHead className="w-24 border-r px-4 py-3 bg-muted/50">
                <div className="font-semibold text-sm">Actions</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                  No data. Click "Add Row" to start.
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                  No results match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, displayIndex) => {
                const rowIndex = rows.indexOf(row);
                return (
                  <TableRow key={rowIndex} className="border-b">
                  {columns.map((col) => (
                    <TableCell key={col.key} className="border-r p-2">
                      {col.type === "select" ? (
                        <Select
                          value={row[col.key]}
                          onValueChange={(value) => handleCellChange(rowIndex, col.key, value)}
                        >
                          <SelectTrigger className="h-10 w-full border-0 focus:ring-0 bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {col.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                       ) : (
                        <Input
                          type={col.type || "text"}
                          value={row[col.key] ?? ""}
                          onChange={(e) => {
                            let value: any = e.target.value;
                            if (col.type === "number") {
                              if (e.target.value === "") {
                                value = "";
                              } else {
                                const parsed = parseFloat(e.target.value);
                                value = isNaN(parsed) ? "" : parsed;
                              }
                            }
                            handleCellChange(rowIndex, col.key, value);
                          }}
                          className="h-10 w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="border-r p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRow(rowIndex)}
                      className="h-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
