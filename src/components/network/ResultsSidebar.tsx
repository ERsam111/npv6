import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart3, Package, Truck, DollarSign } from "lucide-react";

interface ResultsSidebarProps {
  activeTable: string;
  onTableSelect: (table: string) => void;
}

const resultTables = [
  { id: "productFlow", label: "Product Flow", icon: Package },
  { id: "production", label: "Production", icon: BarChart3 },
  { id: "vehicleFlow", label: "Vehicle Flow", icon: Truck },
  { id: "costSummary", label: "Cost Summary", icon: DollarSign },
];

export function ResultsSidebar({ activeTable, onTableSelect }: ResultsSidebarProps) {
  return (
    <Card className="w-64 p-4 space-y-2">
      <div className="text-sm font-semibold text-muted-foreground mb-4">Results</div>
      {resultTables.map((table) => {
        const Icon = table.icon;
        return (
          <Button
            key={table.id}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2",
              activeTable === table.id && "bg-muted"
            )}
            onClick={() => onTableSelect(table.id)}
          >
            <Icon className="h-4 w-4" />
            {table.label}
          </Button>
        );
      })}
    </Card>
  );
}
