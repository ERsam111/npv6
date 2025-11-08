import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Table2, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface GFASidebarNavProps {
  activeTable: string;
  onTableSelect: (table: string) => void;
  customerCount: number;
  productCount: number;
}

const SECTIONS = [
  {
    id: "data",
    label: "Input Data",
    items: [
      { id: "customers", label: "Customers & Demand" },
      { id: "products", label: "Products" },
    ],
  },
  {
    id: "settings",
    label: "Configuration",
    items: [{ id: "costs", label: "Cost Parameters" }],
  },
];

export function GFASidebarNav({ activeTable, onTableSelect, customerCount, productCount }: GFASidebarNavProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["data", "settings"]);

  const getCounts = (itemId: string) => {
    if (itemId === "customers") return customerCount;
    if (itemId === "products") return productCount;
    return 0;
  };

  const filteredSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      searchQuery ? item.label.toLowerCase().includes(searchQuery.toLowerCase()) : true,
    ),
  })).filter((section) => section.items.length > 0);

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
          GFA Setup
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
        {filteredSections.map((section) => (
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
              {section.id === "settings" ? (
                <Settings className="h-4 w-4 text-primary" />
              ) : (
                <Table2 className="h-4 w-4 text-primary" />
              )}
              {section.label}
            </button>

            {expandedSections.includes(section.id) && section.items.length > 0 && (
              <div className="ml-4 mt-1 space-y-1">
                {section.items.map((item) => {
                  const count = getCounts(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTableSelect(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent",
                        activeTable === item.id && "bg-primary/10 text-primary font-medium",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {item.id === "costs" ? <Settings className="h-3 w-3" /> : <Table2 className="h-3 w-3" />}
                        {item.label}
                      </span>
                      {item.id !== "costs" && (
                        <span
                          className={cn("text-xs px-2 py-0.5 rounded-full", count > 0 ? "bg-muted" : "bg-muted/60")}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
