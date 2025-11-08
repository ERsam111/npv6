import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductionLog } from "@/lib/simulationEngine";

interface ProductionFlowTableProps {
  productionLog: ProductionLog[];
  maxDays?: number;
}

export const ProductionFlowTable = ({ productionLog, maxDays = 30 }: ProductionFlowTableProps) => {
  // Filter to show only production events (not idle days) and limit to maxDays
  const activeProduction = productionLog
    .filter(log => log.quantityProduced > 0)
    .slice(0, maxDays);

  if (activeProduction.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Production Flow</h3>
        <p className="text-muted-foreground">No production activity recorded</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Production Flow (BOM-Based)</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>End Product</TableHead>
              <TableHead>Quantity Produced</TableHead>
              <TableHead>End Product Inventory</TableHead>
              <TableHead>Raw Material</TableHead>
              <TableHead>Raw Material Consumed</TableHead>
              <TableHead>Raw Material Inventory</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProduction.map((log, idx) => (
              <TableRow key={idx}>
                <TableCell>{log.day}</TableCell>
                <TableCell>{log.facility}</TableCell>
                <TableCell className="font-medium">{log.product}</TableCell>
                <TableCell className="text-green-600 font-semibold">{log.quantityProduced.toFixed(0)}</TableCell>
                <TableCell>{log.currentInventory.toFixed(0)}</TableCell>
                <TableCell>{log.rawMaterial || "N/A"}</TableCell>
                <TableCell className="text-orange-600 font-semibold">
                  {log.rawMaterialConsumed !== undefined ? log.rawMaterialConsumed.toFixed(2) : "N/A"}
                </TableCell>
                <TableCell>
                  {log.rawMaterialInventory !== undefined ? log.rawMaterialInventory.toFixed(0) : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        Showing {activeProduction.length} production events. Raw material consumption is based on BOM (Bill of Materials).
      </p>
    </Card>
  );
};
