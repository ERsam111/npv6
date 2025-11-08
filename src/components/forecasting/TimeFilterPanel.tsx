import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeFilterPanelProps {
  onFilterChange: (startDate: Date | null, endDate: Date | null) => void;
  startDate: Date | null;
  endDate: Date | null;
}

export function TimeFilterPanel({ onFilterChange, startDate, endDate }: TimeFilterPanelProps) {
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate || undefined);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate || undefined);

  const handleApplyFilter = () => {
    onFilterChange(localStartDate || null, localEndDate || null);
  };

  const handleClearFilter = () => {
    setLocalStartDate(undefined);
    setLocalEndDate(undefined);
    onFilterChange(null, null);
  };

  const hasFilter = startDate || endDate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Time Period Filter
        </CardTitle>
        <CardDescription>
          Filter data by specific date range for analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localStartDate ? format(localStartDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localStartDate}
                  onSelect={setLocalStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localEndDate ? format(localEndDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localEndDate}
                  onSelect={setLocalEndDate}
                  initialFocus
                  disabled={(date) => localStartDate ? date < localStartDate : false}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleApplyFilter}
            className="flex-1"
            disabled={!localStartDate && !localEndDate}
          >
            Apply Filter
          </Button>
          {hasFilter && (
            <Button 
              onClick={handleClearFilter}
              variant="outline"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {hasFilter && (
          <div className="text-sm text-muted-foreground text-center">
            Filtering: {startDate ? format(startDate, "MMM dd, yyyy") : "Beginning"} → {endDate ? format(endDate, "MMM dd, yyyy") : "Present"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
