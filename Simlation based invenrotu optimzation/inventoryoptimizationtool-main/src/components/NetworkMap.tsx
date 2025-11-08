import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Factory } from "lucide-react";
interface NetworkMapProps {
  customerData: any[];
  facilityData: any[];
  productData: any[];
  transportationData: any[];
}
export const NetworkMap = ({
  customerData,
  facilityData,
  productData,
  transportationData
}: NetworkMapProps) => {
  const [selectedProduct, setSelectedProduct] = useState<string>("All");
  const productNames = ["All", ...Array.from(new Set(productData.map((p: any) => p["Product Name"])))];

  // Filter connections by selected product
  const filteredConnections = selectedProduct === "All" ? transportationData : transportationData.filter((t: any) => t["Product Name"] === selectedProduct);

  // Calculate positions for network nodes
  const getNodePosition = (index: number, total: number, type: 'left' | 'center' | 'right') => {
    const spacing = 80 / (total + 1);
    const y = (index + 1) * spacing;
    const x = type === 'left' ? 15 : type === 'right' ? 85 : 50;
    return {
      x: `${x}%`,
      y: `${y}%`
    };
  };
  return <Card className="border-border shadow-lg">
      <CardHeader className="rounded-sm">
        <CardTitle className="text-2xl">Supply Chain Network Visualization</CardTitle>
        <CardDescription>
          View your supply chain network: Suppliers, Facilities, and Customers
        </CardDescription>
        <div className="mt-4">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by product" />
            </SelectTrigger>
            <SelectContent>
              {productNames.map(product => <SelectItem key={product} value={product}>
                  {product}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative bg-accent/10 rounded-lg border border-border" style={{
        height: '600px'
      }}>
          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {filteredConnections.map((conn: any, idx: number) => {
            const origin = facilityData.find((f: any) => f["Facility Name"] === conn["Origin Name"]);
            const destination = customerData.find((c: any) => c["Customer Name"] === conn["Destination Name"]) || facilityData.find((f: any) => f["Facility Name"] === conn["Destination Name"]);
            if (!origin || !destination) return null;
            const originIsSupplier = origin["Type"] === "Supplier";
            const destIsCustomer = customerData.some((c: any) => c["Customer Name"] === conn["Destination Name"]);

            // Calculate rough positions
            const suppliers = facilityData.filter((f: any) => f["Type"] === "Supplier");
            const dcs = facilityData.filter((f: any) => f["Type"] !== "Supplier");
            const originIndex = originIsSupplier ? suppliers.findIndex((s: any) => s["Facility Name"] === origin["Facility Name"]) : dcs.findIndex((d: any) => d["Facility Name"] === origin["Facility Name"]);
            const originPos = originIsSupplier ? getNodePosition(originIndex, suppliers.length, 'left') : getNodePosition(originIndex, dcs.length, 'center');
            const destIndex = destIsCustomer ? customerData.findIndex((c: any) => c["Customer Name"] === destination["Customer Name"]) : dcs.findIndex((d: any) => d["Facility Name"] === destination["Facility Name"]);
            const destPos = destIsCustomer ? getNodePosition(destIndex, customerData.length, 'right') : getNodePosition(destIndex, dcs.length, 'center');
            return <line key={`${conn["Origin Name"]}-${conn["Destination Name"]}-${idx}`} x1={originPos.x} y1={originPos.y} x2={destPos.x} y2={destPos.y} stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="5,5" />;
          })}
          </svg>

          {/* Suppliers (Left) */}
          <div className="absolute left-0 top-0 h-full w-1/4 flex flex-col justify-around p-4">
            {facilityData.filter((f: any) => f["Type"] === "Supplier").map((facility: any, index: number) => {
            const pos = getNodePosition(index, facilityData.filter((f: any) => f["Type"] === "Supplier").length, 'left');
            return <div key={facility["Facility Name"]} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{
              left: pos.x,
              top: pos.y
            }}>
                    <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="flex items-center gap-2">
                        <Factory className="h-6 w-6 text-primary" />
                        <div>
                          <div className="font-semibold text-sm">{facility["Facility Name"]}</div>
                          <div className="text-xs text-muted-foreground">Supplier</div>
                        </div>
                      </div>
                    </div>
                  </div>;
          })}
          </div>

          {/* Facilities/DCs (Center) */}
          <div className="absolute left-1/2 top-0 h-full w-1/4 flex flex-col justify-around p-4 transform -translate-x-1/2">
            {facilityData.filter((f: any) => f["Type"] !== "Supplier").map((facility: any, index: number) => {
            const pos = getNodePosition(index, facilityData.filter((f: any) => f["Type"] !== "Supplier").length, 'center');
            return <div key={facility["Facility Name"]} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{
              left: pos.x,
              top: pos.y
            }}>
                    <div className="bg-card border-2 border-secondary rounded-lg p-3 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-secondary" />
                        <div>
                          <div className="font-semibold text-sm">{facility["Facility Name"]}</div>
                          <div className="text-xs text-muted-foreground">{facility["Type"]}</div>
                        </div>
                      </div>
                    </div>
                  </div>;
          })}
          </div>

          {/* Customers (Right) */}
          <div className="absolute right-0 top-0 h-full w-1/4 flex flex-col justify-around p-4">
            {customerData.map((customer: any, index: number) => {
            const pos = getNodePosition(index, customerData.length, 'right');
            return <div key={customer["Customer Name"]} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{
              left: pos.x,
              top: pos.y
            }}>
                  <div className="bg-card border-2 border-accent rounded-lg p-3 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-2">
                      <Users className="h-6 w-6 text-accent-foreground" />
                      <div>
                        <div className="font-semibold text-sm">{customer["Customer Name"]}</div>
                        <div className="text-xs text-muted-foreground">Customer</div>
                      </div>
                    </div>
                  </div>
                </div>;
          })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex gap-6 justify-center">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            <span className="text-sm">Supplier</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-secondary" />
            <span className="text-sm">Facility/DC</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-foreground" />
            <span className="text-sm">Customer</span>
          </div>
        </div>
      </CardContent>
    </Card>;
};