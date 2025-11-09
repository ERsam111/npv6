import { Upload, TrendingUp, Calendar, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemandForecastingSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasData: boolean;
  hasForecast: boolean;
}

export function DemandForecastingSidebar({
  activeTab,
  onTabChange,
  hasData,
  hasForecast
}: DemandForecastingSidebarProps) {
  const tabs = [
    {
      id: "input",
      label: "Demand Forecasting",
      icon: Upload,
      enabled: true,
      description: "Upload and configure input data"
    },
    {
      id: "manual",
      label: "Manual Adjustment",
      icon: TrendingUp,
      enabled: hasData,
      description: "Adjust forecasts manually"
    },
    {
      id: "promotional",
      label: "Promotional Adjustment",
      icon: Calendar,
      enabled: hasData,
      description: "Factor in promotions"
    },
    {
      id: "data-support",
      label: "Data Support",
      icon: MessageSquare,
      enabled: hasData,
      description: "Ask questions about your data"
    }
  ];

  return (
    <div className="w-64 border-r bg-card/50 p-4 space-y-2">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Navigation
        </h3>
      </div>
      
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => tab.enabled && onTabChange(tab.id)}
            disabled={!tab.enabled}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg transition-all",
              "text-left hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed",
              isActive && "bg-primary/10 border border-primary/20"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 shrink-0 mt-0.5",
              isActive ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="flex-1 min-w-0">
              <div className={cn(
                "font-medium text-sm",
                isActive ? "text-primary" : "text-foreground"
              )}>
                {tab.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {tab.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
