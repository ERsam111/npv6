import { useState } from "react";
import { Filter, ArrowUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type FilterType = 
  | "contains" 
  | "equals" 
  | "greaterThan" 
  | "lessThan" 
  | "greaterOrEqual" 
  | "lessOrEqual"
  | "between"
  | "blank"
  | "notBlank"
  | "regex"
  | "dateRange"
  | "multiSelect";

export type SortDirection = "asc" | "desc" | null;

export interface ColumnFilter {
  type: FilterType;
  value?: string | number;
  value2?: string | number; // For "between" and "dateRange"
  values?: string[]; // For "multiSelect"
}

interface TableColumnFilterProps {
  columnKey: string;
  columnLabel: string;
  dataType: "text" | "number" | "date";
  currentFilter?: ColumnFilter;
  currentSort?: SortDirection;
  sortPriority?: number; // For multi-column sorting
  uniqueValues?: string[]; // For multi-select dropdown
  onFilterChange: (filter?: ColumnFilter) => void;
  onSortChange: (sort: SortDirection) => void;
}

export function TableColumnFilter({
  columnKey,
  columnLabel,
  dataType,
  currentFilter,
  currentSort,
  sortPriority,
  uniqueValues = [],
  onFilterChange,
  onSortChange,
}: TableColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>(currentFilter?.type || "contains");
  const [filterValue, setFilterValue] = useState<string>(currentFilter?.value?.toString() || "");
  const [filterValue2, setFilterValue2] = useState<string>(currentFilter?.value2?.toString() || "");
  const [selectedValues, setSelectedValues] = useState<string[]>(currentFilter?.values || []);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentFilter?.value ? new Date(currentFilter.value) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    currentFilter?.value2 ? new Date(currentFilter.value2) : undefined
  );

  const getFilterOptions = (): { value: FilterType; label: string }[] => {
    const commonOptions = [
      { value: "blank" as FilterType, label: "Is Blank" },
      { value: "notBlank" as FilterType, label: "Is Not Blank" },
    ];

    if (dataType === "number") {
      return [
        { value: "equals", label: "Equals (=)" },
        { value: "greaterThan", label: "Greater Than (>)" },
        { value: "lessThan", label: "Less Than (<)" },
        { value: "greaterOrEqual", label: "Greater or Equal (≥)" },
        { value: "lessOrEqual", label: "Less or Equal (≤)" },
        { value: "between", label: "Between" },
        ...commonOptions,
      ];
    }
    
    if (dataType === "date") {
      return [
        { value: "equals", label: "Equals" },
        { value: "greaterThan", label: "After" },
        { value: "lessThan", label: "Before" },
        { value: "dateRange", label: "Date Range" },
        ...commonOptions,
      ];
    }

    return [
      { value: "contains", label: "Contains" },
      { value: "equals", label: "Equals" },
      { value: "regex", label: "Regex Pattern" },
      ...(uniqueValues.length > 0 ? [{ value: "multiSelect" as FilterType, label: "Multi-Select" }] : []),
      ...commonOptions,
    ];
  };

  const applyFilter = () => {
    if (filterType === "blank" || filterType === "notBlank") {
      onFilterChange({ type: filterType });
      setIsOpen(false);
      return;
    }

    if (filterType === "multiSelect") {
      if (selectedValues.length === 0) {
        onFilterChange(undefined);
      } else {
        onFilterChange({ type: filterType, values: selectedValues });
      }
      setIsOpen(false);
      return;
    }

    if (filterType === "between") {
      if (!filterValue || !filterValue2) {
        onFilterChange(undefined);
      } else {
        onFilterChange({
          type: filterType,
          value: parseFloat(filterValue),
          value2: parseFloat(filterValue2),
        });
      }
      setIsOpen(false);
      return;
    }

    if (filterType === "dateRange") {
      if (!dateFrom || !dateTo) {
        onFilterChange(undefined);
      } else {
        onFilterChange({
          type: filterType,
          value: dateFrom.toISOString(),
          value2: dateTo.toISOString(),
        });
      }
      setIsOpen(false);
      return;
    }

    // For all other filter types (contains, equals, regex, etc.)
    if (!filterValue) {
      onFilterChange(undefined);
    } else {
      const value = dataType === "number" ? parseFloat(filterValue) : 
                    dataType === "date" ? new Date(filterValue).toISOString() : 
                    filterValue;
      onFilterChange({ type: filterType, value });
    }
    setIsOpen(false);
  };

  const clearFilter = () => {
    setFilterValue("");
    setFilterValue2("");
    setSelectedValues([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    onFilterChange(undefined);
    setIsOpen(false);
  };

  const toggleSort = () => {
    if (currentSort === null) {
      onSortChange("asc");
    } else if (currentSort === "asc") {
      onSortChange("desc");
    } else {
      onSortChange(null);
    }
  };

  const hasActiveFilter = !!currentFilter;
  const hasActiveSort = currentSort !== null;

  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <span className="font-semibold text-sm truncate">{columnLabel}</span>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${hasActiveSort ? "text-primary" : ""}`}
          onClick={toggleSort}
          title={`Sort ${currentSort === "asc" ? "descending" : currentSort === "desc" ? "clear" : "ascending"}`}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {currentSort === "asc" && (
            <span className="text-[10px] absolute -top-1 -right-1">
              ↑{sortPriority !== undefined && sortPriority > 0 && sortPriority + 1}
            </span>
          )}
          {currentSort === "desc" && (
            <span className="text-[10px] absolute -top-1 -right-1">
              ↓{sortPriority !== undefined && sortPriority > 0 && sortPriority + 1}
            </span>
          )}
        </Button>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 relative ${hasActiveFilter ? "text-primary" : ""}`}
              title="Filter column"
            >
              <Filter className="h-3.5 w-3.5" />
              {hasActiveFilter && (
                <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 flex items-center justify-center text-[8px]">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filter {columnLabel}</h4>
                {hasActiveFilter && (
                  <Button variant="ghost" size="sm" onClick={clearFilter} className="h-6 px-2 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Filter Type</label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilterOptions().map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filterType === "blank" || filterType === "notBlank" ? (
                <p className="text-xs text-muted-foreground">
                  This filter doesn't require a value
                </p>
              ) : filterType === "multiSelect" ? (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Select Values</label>
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                    {uniqueValues.map((val) => (
                      <label key={val} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(val)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedValues([...selectedValues, val]);
                            } else {
                              setSelectedValues(selectedValues.filter((v) => v !== val));
                            }
                          }}
                          className="h-4 w-4"
                        />
                        {val || "(empty)"}
                      </label>
                    ))}
                  </div>
                </div>
              ) : filterType === "between" ? (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="number"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Min value..."
                    className="h-9"
                  />
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="number"
                    value={filterValue2}
                    onChange={(e) => setFilterValue2(e.target.value)}
                    placeholder="Max value..."
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        applyFilter();
                      }
                    }}
                  />
                </div>
              ) : filterType === "dateRange" ? (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom ? dateFrom.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : undefined)}
                    className="h-9"
                  />
                  <label className="text-xs text-muted-foreground">To Date</label>
                  <Input
                    type="date"
                    value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : undefined)}
                    className="h-9"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    {filterType === "regex" ? "Regex Pattern" : "Value"}
                  </label>
                  <Input
                    type={dataType === "number" ? "number" : dataType === "date" ? "date" : "text"}
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder={
                      filterType === "regex" 
                        ? "e.g., ^[A-Z].*" 
                        : `Enter ${dataType}...`
                    }
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        applyFilter();
                      }
                    }}
                  />
                  {filterType === "regex" && (
                    <p className="text-[10px] text-muted-foreground">
                      Use JavaScript regex syntax
                    </p>
                  )}
                </div>
              )}

              <Button onClick={applyFilter} className="w-full h-9" size="sm">
                Apply Filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function applyColumnFilter(value: any, filter?: ColumnFilter): boolean {
  if (!filter) return true;

  const cellValue = value === null || value === undefined ? "" : String(value);
  const isEmpty = cellValue === "" || cellValue === null || cellValue === undefined;

  switch (filter.type) {
    case "blank":
      return isEmpty;
    case "notBlank":
      return !isEmpty;
    case "multiSelect":
      if (!filter.values || filter.values.length === 0) return true;
      return filter.values.includes(cellValue);
    case "between":
      if (filter.value === undefined || filter.value2 === undefined) return true;
      const numVal = parseFloat(cellValue);
      return numVal >= parseFloat(String(filter.value)) && numVal <= parseFloat(String(filter.value2));
    case "dateRange":
      if (!filter.value || !filter.value2) return true;
      const dateVal = new Date(cellValue).getTime();
      const fromTime = new Date(filter.value).getTime();
      const toTime = new Date(filter.value2).getTime();
      return dateVal >= fromTime && dateVal <= toTime;
    case "regex":
      if (!filter.value) return true;
      try {
        const regex = new RegExp(String(filter.value), 'i');
        return regex.test(cellValue);
      } catch {
        return true;
      }
    case "contains":
      if (filter.value === undefined || filter.value === "") return true;
      return cellValue.toLowerCase().includes(String(filter.value).toLowerCase());
    case "equals":
      if (filter.value === undefined || filter.value === "") return true;
      return cellValue.toLowerCase() === String(filter.value).toLowerCase();
    case "greaterThan":
      if (filter.value === undefined) return true;
      return parseFloat(cellValue) > parseFloat(String(filter.value));
    case "lessThan":
      if (filter.value === undefined) return true;
      return parseFloat(cellValue) < parseFloat(String(filter.value));
    case "greaterOrEqual":
      if (filter.value === undefined) return true;
      return parseFloat(cellValue) >= parseFloat(String(filter.value));
    case "lessOrEqual":
      if (filter.value === undefined) return true;
      return parseFloat(cellValue) <= parseFloat(String(filter.value));
    default:
      return true;
  }
}

export function applySorting<T extends Record<string, any>>(
  data: T[],
  sortKey: string,
  sortDirection: SortDirection
): T[] {
  if (!sortDirection) return data;

  return [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    // Handle null/undefined
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Try numeric comparison first
    const aNum = parseFloat(String(aVal));
    const bNum = parseFloat(String(bVal));
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Fall back to string comparison
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    
    if (sortDirection === "asc") {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
}

// Multi-column sorting
export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function applyMultiColumnSorting<T extends Record<string, any>>(
  data: T[],
  sortConfigs: SortConfig[]
): T[] {
  if (sortConfigs.length === 0) return data;

  return [...data].sort((a, b) => {
    for (const config of sortConfigs) {
      if (!config.direction) continue;

      const aVal = a[config.key];
      const bVal = b[config.key];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) {
        if (bVal !== null && bVal !== undefined) return 1;
        continue;
      }
      if (bVal === null || bVal === undefined) return -1;

      // Try numeric comparison
      const aNum = parseFloat(String(aVal));
      const bNum = parseFloat(String(bVal));
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        const result = config.direction === "asc" ? aNum - bNum : bNum - aNum;
        if (result !== 0) return result;
        continue;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      const result = config.direction === "asc" 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
      
      if (result !== 0) return result;
    }
    return 0;
  });
}
