import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Table2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetwork } from "@/contexts/NetworkContext";

interface NetworkSidebarProps {
  activeTable: string;
  onTableSelect: (table: string) => void;
}

type ItemId =
  | "customers"
  | "facilities"
  | "suppliers"
  | "products"
  | "vehicleTypes"
  | "paths"
  | "production"
  | "periods"
  | "demand"
  | "inventory"
  | "flowRules";

const BASE_SECTIONS: {
  id: string;
  label: string;
  items: { id: ItemId; label: string }[];
}[] = [
  {
    id: "entities",
    label: "Network Entities",
    items: [
      { id: "customers", label: "Customers" },
      { id: "facilities", label: "Facilities" },
      { id: "suppliers", label: "Suppliers" },
      { id: "products", label: "Products" },
    ],
  },
  {
    id: "transport",
    label: "Transport Configuration",
    items: [
      { id: "vehicleTypes", label: "Vehicle Types" },
      { id: "paths", label: "Transport Lanes" },
    ],
  },
  {
    id: "production",
    label: "Production Setup",
    items: [
      { id: "production", label: "Production" },
    ],
  },
  {
    id: "planning",
    label: "Planning Parameters",
    items: [
      { id: "periods", label: "Periods" },
      { id: "demand", label: "Demand" },
      { id: "inventory", label: "Inventory" },
      { id: "flowRules", label: "Product Flow Rules" },
    ],
  },
];

const ID_TO_DATA_KEY: Record<ItemId, keyof ReturnType<typeof useNetwork>["data"]> = {
  customers: "customers",
  facilities: "facilities",
  suppliers: "suppliers",
  products: "products",
  vehicleTypes: "vehicleTypes",
  paths: "paths",
  production: "production",
  periods: "periods",
  demand: "demand",
  inventory: "inventory",
  flowRules: "flowRules",
};

export function NetworkSidebar({ activeTable, onTableSelect }: NetworkSidebarProps) {
  const { data } = useNetwork();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["entities"]);

  const lengthOf = (key: keyof typeof data) => (Array.isArray(data?.[key]) ? (data[key] as any[]).length : 0);

  // Build sections with live counts + search filter
  const sections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return BASE_SECTIONS.map((section) => {
      const items = section.items
        .map((item) => {
          const dataKey = ID_TO_DATA_KEY[item.id];
          const count = dataKey ? lengthOf(dataKey) : 0;
          return { ...item, count };
        })
        .filter((item) => (q ? item.label.toLowerCase().includes(q) : true));

      return { ...section, items };
    }).filter((section) => section.items.length > 0);
  }, [data, searchQuery]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  return (
    <Card className="w-80 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Table2 className="h-5 w-5" />
          Input Tables
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sections.map((section) => (
          <div key={section.id} className="mb-2">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md text-sm font-medium"
            >
              {expandedSections.includes(section.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Table2 className="h-4 w-4 text-green-600" />
              {section.label}
            </button>

            {expandedSections.includes(section.id) && section.items.length > 0 && (
              <div className="ml-4 mt-1 space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onTableSelect(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent",
                      activeTable === item.id && "bg-primary/10 text-primary font-medium",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Table2 className="h-3 w-3" />
                      {item.label}
                    </span>
                    <span
                      className={cn("text-xs px-2 py-0.5 rounded-full", item.count > 0 ? "bg-muted" : "bg-muted/60")}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
