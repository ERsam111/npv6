import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Plus, Trash2, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { useNetwork } from "@/contexts/NetworkContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface NetworkTableProps {
  tableType: string;
}

const tableKeyMap: Record<string, string> = {
  // masters
  customers: "customers",
  facilities: "facilities",
  products: "products",
  vehicleTypes: "vehicleTypes",
  periods: "periods",
  suppliers: "suppliers",
  // new/extended masters
  unitConversion: "unitConversions",
  bom: "bom",
  productGroups: "productGroups",
  // dependents
  demand: "demand",
  production: "production",
  inventory: "inventory",
  flowRules: "flowRules",
  paths: "paths",
};

const getTableTitle = (type: string) =>
  ({
    customers: "Customers",
    facilities: "Facilities",
    products: "Products",
    vehicleTypes: "Vehicle Types",
    periods: "Periods",
    suppliers: "Suppliers",
    unitConversion: "Unit Conversion",
    bom: "Bill of Materials",
    productGroups: "Product Groups",
    demand: "Demand",
    production: "Production",
    inventory: "Inventory",
    flowRules: "Product Flow Rules",
    paths: "Transport Lanes",
  })[type] || type;

// --- Columns spec ---
const getTableColumns = (tableType: string): string[] => {
  const map: Record<string, string[]> = {
    // MASTER TABLES
    customers: ["Customer Name", "Address", "City", "Country", "Lat", "Lng", "Single Sourcing"],
    facilities: ["Facility Name", "Type", "Address", "City", "Country", "Lat", "Lng"],
    products: ["Product ID", "Product Name", "UOM", "Unit Cost", "Selling Price"],
    vehicleTypes: ["Vehicle ID", "Capacity", "Capacity Unit", "Speed", "Fixed Cost", "Var Cost/km"],
    periods: ["Period ID", "Start Date", "End Date", "Gap (days)"],
    suppliers: [
      "Supplier Name",
      "Product ID",
      "Capacity",
      "Capacity Unit",
      "Address",
      "City",
      "Country",
      "Lat",
      "Lng",
      "Include",
    ],

    // NEW TABLES
    unitConversion: ["Product Name", "Unit From", "Amount From", "Unit To", "Amount To"],
    bom: [
      "BOM ID",
      "End Product ID",
      "End Quantity",
      "Raw Product ID",
      "Raw Quantity",
      "By-Product ID",
      "By-Product Quantity",
    ],
    productGroups: ["Product Group Name", "Products"], // Products = multi-select from product IDs

    // DEPENDENTS
    demand: ["Customer Name", "Product ID", "Period ID", "Demand Qty", "Single Sourcing"],
    production: [
      "Facility Name",
      "Product ID",
      "Period ID",
      "Prod Cost/Unit",
      "Min Throughput",
      "Max Throughput",
      "Conditional Min",
    ],
    inventory: ["Facility Name", "Product ID", "Period ID", "Min Level", "Max Level", "Initial Level"],
    flowRules: [
      "From",
      "To",
      "Product ID",
      "Vehicle ID",
      "Period ID",
      "Min Throughput",
      "Max Throughput",
      "Conditional Min",
    ],
    paths: [
      "From",
      "To",
      "Vehicle ID",
      "Distance",
      "Fixed Cost",
      "Product Cost/Unit",
      "Shipping Policy",
      "Min Load Ratio",
      "Transport Pricing",
      "Include",
    ],
  };
  return map[tableType] || ["Name"];
};

// --- Utilities ---
const keyOf = (label: string) => label.toLowerCase().replace(/[\s()/]+/g, "_");

export function NetworkTable({ tableType }: NetworkTableProps) {
  const { data, updateTable } = useNetwork();
  const dataKey = tableKeyMap[tableType] as keyof typeof data;
  const [rows, setRows] = useState<any[]>([]);
  const columns = getTableColumns(tableType);

  useEffect(() => {
    if (dataKey && data[dataKey]) setRows(data[dataKey] as any[]);
  }, [dataKey, data]);

  const handleAddRow = () => {
    const newRow: any = {};
    columns.forEach((col) => (newRow[keyOf(col)] = ""));
    const updated = [...rows, newRow];
    setRows(updated);
    updateTable(dataKey, updated);
  };

  const handleDeleteRow = (i: number) => {
    const updated = rows.filter((_, idx) => idx !== i);
    setRows(updated);
    updateTable(dataKey, updated);
  };

  const handleChange = (i: number, col: string, val: any) => {
    const key = keyOf(col);
    const updated = [...rows];
    updated[i] = { ...updated[i], [key]: val };
    setRows(updated);
    updateTable(dataKey, updated);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target?.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      setRows(jsonData);
      updateTable(dataKey, jsonData);
    };
    reader.readAsBinaryString(file);
  };

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, getTableTitle(tableType));
    XLSX.writeFile(wb, `${tableType}_template.xlsx`);
  };

  // ---------- Master lists ----------
  const customers = useMemo(
    () => (data.customers || []).map((c: any) => c.CustomerName || c.customer_name || c.name).filter(Boolean),
    [data.customers],
  );

  const rawFacilities: any[] = useMemo(() => data.facilities || [], [data.facilities]);
  const facilities = useMemo(
    () => rawFacilities.map((f: any) => f.FacilityName || f.facility_name || f.name).filter(Boolean),
    [rawFacilities],
  );
  const factories = useMemo(
    () =>
      rawFacilities
        .filter((f: any) => (f.Type || f.type) === "Factory")
        .map((f: any) => f.FacilityName || f.facility_name || f.name)
        .filter(Boolean),
    [rawFacilities],
  );

  const products = useMemo(
    () => (data.products || []).map((p: any) => p.ProductID || p.product_id || p.id).filter(Boolean),
    [data.products],
  );

  const productNames = useMemo(
    () => (data.products || []).map((p: any) => p.ProductName || p.product_name || p.name).filter(Boolean),
    [data.products],
  );

  const productUOMs = useMemo(() => {
    const set = new Set<string>();
    (data.products || []).forEach((p: any) => {
      const u = p.UOM || p.uom;
      if (u) set.add(String(u));
    });
    return Array.from(set);
  }, [data.products]);

  const vehicles = useMemo(
    () => (data.vehicleTypes || []).map((v: any) => v.VehicleID || v.vehicle_id || v.id).filter(Boolean),
    [data.vehicleTypes],
  );

  const periods = useMemo(
    () => (data.periods || []).map((p: any) => p.PeriodID || p.period_id || p.id).filter(Boolean),
    [data.periods],
  );

  const isMasterTable = ["customers", "facilities", "products", "vehicleTypes", "periods", "suppliers"].includes(
    tableType,
  );

  // field → dropdown data
  const getDropdownList = (col: string): string[] => {
    const c = keyOf(col);
    if (tableType === "production" && c === "facility_name") return factories;
    if (c === "facility_name") return facilities;
    if (c === "customer_name") return customers;
    if (c === "from" || c === "to") return [...facilities, ...customers];
    if (c === "product_id") return products;
    if (c === "vehicle_id") return vehicles;
    if (c === "period_id") return periods;

    // Unit Conversion: Product Name + units from product UOMs
    if (tableType === "unitConversion" || tableType === "unitconversions") {
      if (c === "product_name") return productNames;
      if (c === "unit_from" || c === "unit_to") return productUOMs;
    }

    // Suppliers: product id comes from product master
    if (tableType === "suppliers" && c === "product_id") return products;

    // BOM: all product fields from products
    if (tableType === "bom" && ["end_product_id", "raw_product_id", "by-product_id"].includes(c)) return products;

    return [];
  };

  // Multi-select editor for Product Groups.Products
  const ProductsMultiSelect = ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (val: string) => void;
    options: string[];
  }) => {
    const selected = useMemo(
      () =>
        new Set(
          (value || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      [value],
    );

    const toggle = (opt: string) => {
      const next = new Set(selected);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      onChange(Array.from(next).join(", "));
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {value && value.length ? value : "Select Products"}
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2">
          <div className="max-h-64 overflow-auto space-y-1">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded">
                <Checkbox checked={selected.has(opt)} onCheckedChange={() => toggle(opt)} />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">{getTableTitle(tableType)}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" /> Import
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleExcelUpload} />
            </label>
          </Button>
          <Button size="sm" onClick={handleAddRow}>
            <Plus className="h-4 w-4 mr-2" /> Add Row
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c} className="min-w-[150px]">
                  {c}
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                  No data. Click “Add Row” to begin.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => {
                    const key = keyOf(col);
                    const val = row[key] ?? "";
                    const options = getDropdownList(col);

                    // special select fields
                    const isYesNo = col === "Single Sourcing" || col === "Include";
                    const isType = col === "Type";
                    const isShipping = col === "Shipping Policy";
                    const isPricing = col === "Transport Pricing";

                    // product groups multi select
                    const isProductGroupMulti = tableType === "productGroups" && key === "products";

                    return (
                      <TableCell key={col}>
                        {isProductGroupMulti ? (
                          <ProductsMultiSelect
                            value={String(val)}
                            onChange={(v) => handleChange(i, col, v)}
                            options={products /* product IDs */}
                          />
                        ) : isYesNo ? (
                          <Select value={String(val)} onValueChange={(v) => handleChange(i, col, v)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : isType ? (
                          <Select value={String(val)} onValueChange={(v) => handleChange(i, col, v)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Factory">Factory</SelectItem>
                              <SelectItem value="DC">DC</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : isShipping ? (
                          <Select value={String(val)} onValueChange={(v) => handleChange(i, col, v)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FTL">FTL</SelectItem>
                              <SelectItem value="LTL">LTL</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : isPricing ? (
                          <Select value={String(val)} onValueChange={(v) => handleChange(i, col, v)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Fixed">Fixed</SelectItem>
                              <SelectItem value="ProductBased">Product Based</SelectItem>
                              <SelectItem value="FixedPlusProduct">Fixed + Product</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (!isMasterTable && options.length > 0) ||
                          (tableType === "suppliers" && key === "product_id" && products.length > 0) ? (
                          <Select
                            value={val === undefined || val === null ? "" : String(val)}
                            onValueChange={(v) => handleChange(i, col, v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={`Select ${col}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={val === undefined || val === null ? "" : String(val)}
                            onChange={(e) => handleChange(i, col, e.target.value)}
                            placeholder={`Enter ${col}`}
                          />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRow(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
