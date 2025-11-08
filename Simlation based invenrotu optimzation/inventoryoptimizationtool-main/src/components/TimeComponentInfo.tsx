import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, TrendingUp, Package, Truck } from "lucide-react";

export const TimeComponentInfo = () => {
  return (
    <Card className="border-border shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Understanding Time Components
        </CardTitle>
        <CardDescription>
          How time flows in the simulation from order placement to delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-l-4 border-primary pl-4 py-2">
          <h4 className="font-semibold text-foreground mb-1">Example Timeline</h4>
          <p className="text-sm text-muted-foreground">
            Customer places order on Day 1 → Delivery on Day 3 = 2 days total lead time
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h5 className="font-semibold text-sm">Review Period</h5>
              <p className="text-sm text-muted-foreground">
                Time the facility waits before processing orders (set in Order Fulfillment Policies).
                Orders are batched and reviewed periodically.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h5 className="font-semibold text-sm">Processing Time</h5>
              <p className="text-sm text-muted-foreground">
                Time to pick, pack, and prepare the order at the facility.
                Includes warehouse handling operations (inbound/outbound).
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h5 className="font-semibold text-sm">Transportation Time</h5>
              <p className="text-sm text-muted-foreground">
                Transit time from facility to customer (set in Transportation Policy).
                The 2 days between Day 1 and Day 3 includes this transport time.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-accent/30 p-4 rounded-lg mt-4">
          <p className="text-sm">
            <strong>Service Level:</strong> The maximum time between order placement and delivery.
            In the example, if Service Level = 14 days but delivery happens on Day 3, 
            the order is fulfilled on time. If delivery takes 15+ days, it is late.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
