import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DollarSign, Package, Truck, Warehouse, Factory } from "lucide-react";

interface CostBreakdownProps {
  scenario: any;
  currency?: string;
}

export const CostBreakdownAccordion = ({ scenario, currency = "USD" }: CostBreakdownProps) => {
  const totalCost = scenario.costMean || 0;
  
  // Use actual cost breakdown from simulation if available
  const breakdown = scenario.costBreakdown || {
    transportation: 0,
    production: 0,
    handling: 0,
    inventory: 0,
    replenishment: 0, // Unified: ordering cost = replenishment cost
  };

  const CostItem = ({ icon: Icon, label, value, percentage, calculation }: any) => (
    <div className="py-2 border-b border-border last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground">{percentage}%</p>
        </div>
      </div>
      {calculation && (
        <div className="mt-2 ml-11 text-xs text-muted-foreground bg-accent/20 p-2 rounded font-mono">
          {calculation}
        </div>
      )}
    </div>
  );

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="cost-breakdown" className="border-border">
        <AccordionTrigger className="hover:bg-accent/50 px-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>View Detailed Cost Breakdown</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-1 mt-2">
            <CostItem
              icon={Truck}
              label="Transportation Costs"
              value={breakdown.transportation}
              percentage={(breakdown.transportation / totalCost * 100).toFixed(1)}
              calculation={scenario.transportationDetails ? 
                `Transportation Cost Calculation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Transport Unit Cost:         $${scenario.transportationDetails.transportUnitCost.toFixed(2)} per unit
Total Units Transported:     ${scenario.transportationDetails.totalUnits.toLocaleString()} units
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lead Time Distribution:      ${scenario.transportationDetails.distributionType}
Lead Time Parameters:        ${scenario.transportationDetails.distributionParams}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Calculation:
  = Transport Unit Cost × Total Units
  = $${scenario.transportationDetails.transportUnitCost.toFixed(2)} × ${scenario.transportationDetails.totalUnits.toLocaleString()}
  = $${breakdown.transportation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : null}
            />
            <CostItem
              icon={Factory}
              label="Production Costs"
              value={breakdown.production}
              percentage={(breakdown.production / totalCost * 100).toFixed(1)}
              calculation={scenario.productionDetails ? 
                `Production Cost Calculation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unit Production Cost:        $${scenario.productionDetails.unitCost.toFixed(2)} per unit
Total Units Produced:        ${scenario.productionDetails.totalUnits.toLocaleString()} units
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Calculation:
  = Unit Cost × Total Units
  = $${scenario.productionDetails.unitCost.toFixed(2)} × ${scenario.productionDetails.totalUnits.toLocaleString()}
  = $${breakdown.production.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : null}
            />
            <CostItem
              icon={Warehouse}
              label="Handling Costs"
              value={breakdown.handling}
              percentage={(breakdown.handling / totalCost * 100).toFixed(1)}
              calculation={scenario.handlingDetails ? 
                `Handling Cost Breakdown:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INBOUND (Receiving):
  Cost per Unit:             $${scenario.handlingDetails.inboundCost.toFixed(2)}
  Units Received:            ${scenario.handlingDetails.inboundUnits.toLocaleString()}
  Subtotal:                  $${(scenario.handlingDetails.inboundCost * scenario.handlingDetails.inboundUnits).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

OUTBOUND (Shipping):
  Cost per Unit:             $${scenario.handlingDetails.outboundCost.toFixed(2)}
  Units Shipped:             ${scenario.handlingDetails.outboundUnits.toLocaleString()}
  Subtotal:                  $${(scenario.handlingDetails.outboundCost * scenario.handlingDetails.outboundUnits).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Handling Cost:         $${breakdown.handling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : null}
            />
            <CostItem
              icon={Package}
              label="Inventory Holding Costs"
              value={breakdown.inventory}
              percentage={(breakdown.inventory / totalCost * 100).toFixed(1)}
              calculation={scenario.inventoryDetails ? 
                `Inventory Holding Cost Breakdown:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${scenario.inventoryDetails.byFacility && scenario.inventoryDetails.byFacility.length > 0 
  ? scenario.inventoryDetails.byFacility.map((fac: any) => 
      `${fac.facilityName} (${fac.productName}):
  Holding Cost/Unit/Day:     $${fac.holdingCostPerUnit.toFixed(4)}
  Average Inventory:         ${fac.avgInventory.toFixed(2)} units
  Total Holding Cost:        $${fac.totalHoldingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  Calculation: $${fac.holdingCostPerUnit.toFixed(4)} × ${fac.avgInventory.toFixed(2)} × ${scenario.inventoryDetails.days} days`
    ).join('\n\n')
  : `Daily Holding Cost per Unit: $${scenario.inventoryDetails.holdingCostPerUnit.toFixed(4)} per unit per day
Average Inventory Level:     ${scenario.inventoryDetails.avgInventory.toFixed(2)} units
Simulation Period:           ${scenario.inventoryDetails.days} days

Calculation:
  = Holding Cost × Avg Inventory × Days
  = $${scenario.inventoryDetails.holdingCostPerUnit.toFixed(4)} × ${scenario.inventoryDetails.avgInventory.toFixed(2)} × ${scenario.inventoryDetails.days}
  = $${breakdown.inventory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Inventory Holding Cost: $${breakdown.inventory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : null}
            />
            <CostItem
              icon={DollarSign}
              label="Replenishment Costs"
              value={breakdown.replenishment}
              percentage={(breakdown.replenishment / totalCost * 100).toFixed(1)}
              calculation={scenario.transportationDetails ? 
                `Replenishment Cost Calculation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fixed Cost per Order:        $${scenario.transportationDetails.fixedCostPerOrder.toFixed(2)}
Replenishment Unit Cost:     $${scenario.transportationDetails.replenishmentUnitCost.toFixed(2)} per unit
Total Replenishment Orders:  ${scenario.transportationDetails.totalOrders}
Total Units Replenished:     ${scenario.transportationDetails.totalUnits.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Calculation:
  = (Fixed Cost × Orders) + (Unit Cost × Units)
  = ($${scenario.transportationDetails.fixedCostPerOrder.toFixed(2)} × ${scenario.transportationDetails.totalOrders}) + ($${scenario.transportationDetails.replenishmentUnitCost.toFixed(2)} × ${scenario.transportationDetails.totalUnits.toLocaleString()})
  = $${breakdown.replenishment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  
Note: Replenishment cost includes both the fixed 
ordering cost and the variable cost per unit.` 
                : null}
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Cost</span>
              <span className="text-lg font-bold text-primary">{currency} ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-accent/30 rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Cost Calculation Details:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Transportation:</strong> Transport unit cost × quantity transported</li>
              <li><strong>Production:</strong> Unit production cost × quantity produced</li>
              <li><strong>Handling:</strong> Inbound handling cost (when inventory arrives) + Outbound handling cost (when shipped to customer)</li>
              <li><strong>Inventory:</strong> Daily holding cost × average inventory level</li>
              <li><strong>Replenishment:</strong> Fixed cost per order + replenishment unit cost × quantity (unified ordering & replenishment cost)</li>
            </ul>
            {scenario.transportationDetails && (
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="font-semibold mb-1">Transportation & Replenishment Details:</p>
                <ul className="space-y-0.5 text-[11px]">
                  <li>Fixed Cost/Order: ${scenario.transportationDetails.fixedCostPerOrder?.toFixed(2) || "0.00"}</li>
                  <li>Transport Unit Cost: ${scenario.transportationDetails.transportUnitCost?.toFixed(2) || "0.00"}/unit</li>
                  <li>Replenishment Unit Cost: ${scenario.transportationDetails.replenishmentUnitCost?.toFixed(2) || "0.00"}/unit</li>
                  <li>Lead Time Distribution: {scenario.transportationDetails.distributionType || "Constant"}</li>
                  <li>Lead Time Parameters: {scenario.transportationDetails.distributionParams || "N/A"}</li>
                  <li>Total Replenishment Orders: {scenario.transportationDetails.totalOrders || 0}</li>
                  <li>Total Units Transported: {scenario.transportationDetails.totalUnits?.toLocaleString() || 0}</li>
                </ul>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
