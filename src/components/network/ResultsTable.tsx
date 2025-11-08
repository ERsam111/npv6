import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNetwork } from "@/contexts/NetworkContext";
import * as XLSX from "xlsx";

interface ResultsTableProps {
  tableType: string;
}

const getTableTitle = (tableType: string) => {
  const titleMap: { [key: string]: string } = {
    productFlow: "Product Flow",
    production: "Production",
    vehicleFlow: "Vehicle Flow",
    costSummary: "Cost Summary",
  };
  return titleMap[tableType] || tableType;
};

const getTableColumns = (tableType: string): string[] => {
  const columnMap: { [key: string]: string[] } = {
    productFlow: ["From", "To", "Product", "Quantity", "Unit", "Period"],
    production: ["Site", "Product", "BOM", "Quantity", "Unit", "Cost", "Period"],
    vehicleFlow: ["From", "To", "Vehicle Type", "Trip Count", "Period"],
    costSummary: ["Category", "Amount ($)"],
  };
  return columnMap[tableType] || [];
};

export function ResultsTable({ tableType }: ResultsTableProps) {
  const { results } = useNetwork();
  const columns = getTableColumns(tableType);
  const rows = results[tableType as keyof typeof results] || [];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, getTableTitle(tableType));
    XLSX.writeFile(wb, `${tableType}_results.xlsx`);
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">{getTableTitle(tableType)}</h2>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="min-w-[150px]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  No results yet. Run optimization to see results.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: any, rowIndex: number) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => {
                    const key = column.toLowerCase().replace(/\s+/g, '_').replace(/[()$]/g, '');
                    return (
                      <TableCell key={column}>
                        {row[key] || "-"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
