import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  TrendingUp,
  Warehouse,
  GitBranch,
  Truck,
  Factory,
  Settings,
  DollarSign,
  Users,
  Database,
  Sliders,
} from "lucide-react";

interface InventorySidebarProps {
  activeTable: string;
  onTableSelect: (table: string) => void;
}

const tables = [
  { id: "customers", label: "Customers", icon: Users },
  { id: "facilities", label: "Facilities (DC)", icon: Warehouse },
  { id: "plants", label: "Plants", icon: Factory },
  { id: "products", label: "Products", icon: Package },
  { id: "vehicles", label: "Vehicles", icon: Truck },
  { id: "demand", label: "Demand", icon: TrendingUp },
  { id: "sourcing", label: "Sourcing Rules", icon: GitBranch },
  { id: "transport", label: "Transport", icon: Settings },
  { id: "production", label: "Production", icon: Factory },
  { id: "policy", label: "Policy Parameters", icon: Sliders },
  { id: "financial", label: "Financial Parameters", icon: DollarSign },
];

export function InventorySidebar({ activeTable, onTableSelect }: InventorySidebarProps) {
  return (
    <Card className="w-64 p-4">
      <h2 className="text-lg font-semibold mb-4">Input Tables</h2>
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-2">
          {tables.map((table) => {
            const Icon = table.icon;
            return (
              <Button
                key={table.id}
                variant={activeTable === table.id ? "default" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => onTableSelect(table.id)}
              >
                <Icon className="h-4 w-4" />
                {table.label}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
