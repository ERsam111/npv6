import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Plus, Trash2, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { TableColumnFilter, ColumnFilter, SortDirection, applyColumnFilter, applySorting } from "@/components/ui/table-column-filter";
interface GFAEditableTableProps {
  tableType: "customers" | "products" | "existing-sites";
  data: any[];
  onDataChange: (data: any[]) => void;
  onGeocode?: (index: number) => void;
}
const getTableTitle = (type: string) => ({
  customers: "Customers",
  products: "Products",
  "existing-sites": "Existing Sites"
})[type] || type;
const getTableColumns = (tableType: string): string[] => {
  const map: Record<string, string[]> = {
    customers: ["Customer Name", "City", "Country", "Latitude", "Longitude", "Product", "Demand", "Unit of Measure"],
    products: ["Product Name", "Base Unit", "Selling Price", "to_m3", "to_ft3", "to_kg", "to_tonnes", "to_lbs", "to_liters", "to_pallets", "to_units", "to_sq2", "to_cbm"],
    "existing-sites": ["Site Name", "City", "Country", "Latitude", "Longitude", "Capacity", "Capacity Unit"]
  };
  return map[tableType] || ["Name"];
};

// Map display labels to actual Customer/Product type keys
const keyOf = (label: string, tableType: string) => {
  if (tableType === "customers") {
    const customerKeyMap: Record<string, string> = {
      "Customer Name": "name",
      "City": "city",
      "Country": "country",
      "Latitude": "latitude",
      "Longitude": "longitude",
      "Product": "product",
      "Demand": "demand",
      "Unit of Measure": "unitOfMeasure"
    };
    return customerKeyMap[label] || label.toLowerCase().replace(/[\s]+/g, "_");
  } else if (tableType === "products") {
    const productKeyMap: Record<string, string> = {
      "Product Name": "name",
      "Base Unit": "baseUnit",
      "Selling Price": "sellingPrice",
      "Unit Conversions": "unitConversions"
    };
    return productKeyMap[label] || label.toLowerCase().replace(/[\s]+/g, "_");
  } else if (tableType === "existing-sites") {
    const existingSiteKeyMap: Record<string, string> = {
      "Site Name": "name",
      "City": "city",
      "Country": "country",
      "Latitude": "latitude",
      "Longitude": "longitude",
      "Capacity": "capacity",
      "Capacity Unit": "capacityUnit"
    };
    return existingSiteKeyMap[label] || label.toLowerCase().replace(/[\s]+/g, "_");
  }
  return label.toLowerCase().replace(/[\s]+/g, "_");
};
export function GFAEditableTable({
  tableType,
  data,
  onDataChange,
  onGeocode
}: GFAEditableTableProps) {
  const [rows, setRows] = useState<any[]>(data);
  const columns = getTableColumns(tableType);
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [columnSorts, setColumnSorts] = useState<Record<string, SortDirection>>({});
  useEffect(() => {
    setRows(data);
  }, [data]);
  const handleAddRow = () => {
    const newRow: any = {};
    if (tableType === "products") {
      newRow.name = "";
      newRow.baseUnit = "m3";
      newRow.sellingPrice = "";
      newRow.unitConversions = {};
    } else if (tableType === "customers") {
      newRow.id = `customer-${Date.now()}`;
      newRow.name = "";
      newRow.city = "";
      newRow.country = "";
      newRow.latitude = 0;
      newRow.longitude = 0;
      newRow.product = "";
      newRow.demand = 0;
      newRow.unitOfMeasure = "m3";
    } else if (tableType === "existing-sites") {
      newRow.id = `site-${Date.now()}`;
      newRow.name = "";
      newRow.city = "";
      newRow.country = "";
      newRow.latitude = 0;
      newRow.longitude = 0;
      newRow.capacity = 0;
      newRow.capacityUnit = "m3";
    }
    const updated = [...rows, newRow];
    setRows(updated);
    onDataChange(updated);
  };
  const handleDeleteRow = (i: number) => {
    const updated = rows.filter((_, idx) => idx !== i);
    setRows(updated);
    onDataChange(updated);
  };
  const handleChange = (i: number, col: string, val: any) => {
    const key = keyOf(col, tableType);
    const updated = [...rows];
    
    // For product unit conversions, update the unitConversions object
    if (tableType === "products" && key.startsWith("to_")) {
      const conversions = { ...(updated[i].unitConversions || {}) };
      const numVal = parseFloat(val);
      if (!isNaN(numVal) && numVal > 0) {
        conversions[key] = numVal;
      } else {
        delete conversions[key];
      }
      updated[i] = {
        ...updated[i],
        unitConversions: conversions
      };
    } else {
      updated[i] = {
        ...updated[i],
        [key]: val
      };
    }
    
    setRows(updated);
    onDataChange(updated);
  };
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const workbook = XLSX.read(evt.target?.result, {
          type: "binary"
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        setRows(jsonData);
        onDataChange(jsonData);
        toast.success("Data imported successfully");
      } catch (error) {
        toast.error("Failed to import data");
      }
    };
    reader.readAsBinaryString(file);
  };
  const handleDownload = () => {
    const exportData = rows.length ? rows : [{}];
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, getTableTitle(tableType));
    XLSX.writeFile(wb, `${tableType}_template.xlsx`);
  };
  const handleFilterChange = (columnKey: string, filter?: ColumnFilter) => {
    setColumnFilters((prev) => {
      const updated = { ...prev };
      if (filter) {
        updated[columnKey] = filter;
      } else {
        delete updated[columnKey];
      }
      return updated;
    });
  };

  const handleSortChange = (columnKey: string, sort: SortDirection) => {
    setColumnSorts({ [columnKey]: sort }); // Only one sort at a time
  };

  const getColumnDataType = (col: string): "text" | "number" => {
    const key = keyOf(col, tableType);
    const numericFields = ["latitude", "longitude", "demand", "sellingPrice"];
    return numericFields.includes(key) ? "number" : "text";
  };

  // Apply filters and sorting
  let displayRows = rows.filter((row) => {
    return Object.entries(columnFilters).every(([colLabel, filter]) => {
      const key = keyOf(colLabel, tableType);
      return applyColumnFilter(row[key], filter);
    });
  });

  // Apply sorting
  const sortEntry = Object.entries(columnSorts).find(([_, dir]) => dir !== null);
  if (sortEntry) {
    const [colLabel, direction] = sortEntry;
    const key = keyOf(colLabel, tableType);
    displayRows = applySorting(displayRows, key, direction);
  }

  return <Card className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold">{getTableTitle(tableType)}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          {tableType === "customers" && <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" /> Import
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleExcelUpload} />
              </label>
            </Button>}
          <Button size="sm" onClick={handleAddRow}>
            <Plus className="h-4 w-4 mr-2" /> Add Row
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
        <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                {columns.map(c => <TableHead key={c} className="sticky top-0 font-semibold text-sm whitespace-nowrap bg-muted/50 px-2">
                    <TableColumnFilter
                      columnKey={keyOf(c, tableType)}
                      columnLabel={c}
                      dataType={getColumnDataType(c)}
                      currentFilter={columnFilters[c]}
                      currentSort={columnSorts[c] || null}
                      onFilterChange={(filter) => handleFilterChange(c, filter)}
                      onSortChange={(sort) => handleSortChange(c, sort)}
                    />
                  </TableHead>)}
                <TableHead className="sticky top-0 bg-muted/50 font-semibold text-sm whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                    No data. Click "Add Row" to begin.
                  </TableCell>
                </TableRow> : displayRows.length === 0 ? <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                    No results match your filters.
                  </TableCell>
                </TableRow> : displayRows.map((row, displayIndex) => {
                const i = rows.indexOf(row);
                return <TableRow key={i}>
                    {columns.map(col => {
              const key = keyOf(col, tableType);
              const val = row[key] ?? "";

              // Special handling for unit conversion columns in products
              if (tableType === "products" && key.startsWith("to_")) {
                const conversions = row.unitConversions || {};
                const value = conversions[key] || "";
                return <TableCell key={col}>
                  <Input 
                    type="number"
                    value={value}
                    onChange={e => handleChange(i, col, e.target.value)}
                    placeholder="Factor"
                    className="h-9 text-sm w-24"
                  />
                </TableCell>;
              }

              // Special handling for base unit dropdown in products
              if (tableType === "products" && key === "baseUnit") {
                return <TableCell key={col}>
                            <Select value={String(val)} onValueChange={v => handleChange(i, col, v)}>
                              <SelectTrigger className="w-full h-9 text-sm">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-background">
                                <SelectItem value="m3">m³ (Cubic Meter)</SelectItem>
                                <SelectItem value="pallets">Pallets</SelectItem>
                                <SelectItem value="kg">kg (Kilogram)</SelectItem>
                                <SelectItem value="tonnes">Tonnes</SelectItem>
                                <SelectItem value="lbs">lbs (Pounds)</SelectItem>
                                <SelectItem value="ft3">ft³ (Cubic Feet)</SelectItem>
                                <SelectItem value="liters">Liters</SelectItem>
                                <SelectItem value="units">Units</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>;
              }

              // Special handling for country dropdown
              if (key === "country") {
                return <TableCell key={col}>
                            <Select value={String(val)} onValueChange={v => handleChange(i, col, v)}>
                              <SelectTrigger className="w-full h-9 text-sm">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-background">
                                <SelectItem value="USA">USA</SelectItem>
                                <SelectItem value="Canada">Canada</SelectItem>
                                <SelectItem value="Mexico">Mexico</SelectItem>
                                <SelectItem value="UK">UK</SelectItem>
                                <SelectItem value="Germany">Germany</SelectItem>
                                <SelectItem value="France">France</SelectItem>
                                <SelectItem value="India">India</SelectItem>
                                <SelectItem value="China">China</SelectItem>
                                <SelectItem value="Japan">Japan</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>;
              }

              // Special handling for unit of measure dropdown in customers
              if (tableType === "customers" && key === "unitOfMeasure") {
                return <TableCell key={col}>
                            <Select value={String(val)} onValueChange={v => handleChange(i, col, v)}>
                              <SelectTrigger className="w-full h-9 text-sm">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-background">
                                <SelectItem value="m3">m³ (Cubic Meter)</SelectItem>
                                <SelectItem value="pallets">Pallets</SelectItem>
                                <SelectItem value="kg">kg (Kilogram)</SelectItem>
                                <SelectItem value="tonnes">Tonnes</SelectItem>
                                <SelectItem value="lbs">lbs (Pounds)</SelectItem>
                                <SelectItem value="ft3">ft³ (Cubic Feet)</SelectItem>
                                <SelectItem value="liters">Liters</SelectItem>
                                <SelectItem value="units">Units</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>;
              }

              // Regular input fields
              return <TableCell key={col} className="whitespace-nowrap">
                          <Input value={val === undefined || val === null ? "" : String(val)} onChange={e => handleChange(i, col, e.target.value)} placeholder={`Enter ${col}`} className="h-9 text-sm min-w-[120px]" type={key === "demand" || key === "sellingPrice" || key === "latitude" || key === "longitude" ? "number" : "text"} />
                        </TableCell>;
            })}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {tableType === "customers" && onGeocode && <Button variant="ghost" size="sm" onClick={() => onGeocode(i)} className="h-8 w-8 p-0">
                            <MapPin className="h-4 w-4 text-primary" />
                          </Button>}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRow(i)} className="h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
              })}
            </TableBody>
        </Table>
      </div>
    </Card>;
}