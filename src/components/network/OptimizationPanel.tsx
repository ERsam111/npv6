import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Play, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNetwork } from "@/contexts/NetworkContext";
import { toast } from "sonner";
import { useState } from "react";
import { DataIntegrityChecker } from "./DataIntegrityChecker";
import { supabase } from "@/integrations/supabase/client";

export function OptimizationPanel() {
  const { data, setResults } = useNetwork();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [objective, setObjective] = useState<'min_cost' | 'min_time' | 'max_service'>('min_cost');
  const [solver, setSolver] = useState('opensource');
  const [showIntegrity, setShowIntegrity] = useState(true);

  // Transform data from UI format to optimization format
  const transformData = () => {
    // Create ID mappings
    const customerIdMap = new Map<string, string>();
    data.customers.forEach((c: any, idx: number) => {
      const name = c.customer_name || c.name;
      const id = `C${idx + 1}`;
      customerIdMap.set(name, id);
    });

    const facilityIdMap = new Map<string, string>();
    data.facilities.forEach((f: any, idx: number) => {
      const name = f.facility_name || f.name;
      const id = `F${idx + 1}`;
      facilityIdMap.set(name, id);
    });

    const supplierIdMap = new Map<string, string>();
    data.suppliers.forEach((s: any, idx: number) => {
      const name = s.supplier_name || s.name;
      const id = `S${idx + 1}`;
      supplierIdMap.set(name, id);
    });

    const vehicleIdMap = new Map<string, string>();
    data.vehicleTypes.forEach((v: any) => {
      const id = v.vehicle_id || v["vehicle_id"] || v.id;
      vehicleIdMap.set(id, id);
    });

    const periodIdMap = new Map<string, string>();
    data.periods.forEach((p: any) => {
      const id = p.period_id || p.id;
      periodIdMap.set(id, id);
    });

    const productIdMap = new Map<string, string>();
    data.products.forEach((p: any) => {
      const id = p.product_id || p.id;
      productIdMap.set(id, id);
    });

    // Transform customers
    const customers = data.customers.map((c: any, idx: number) => ({
      customer_id: `C${idx + 1}`,
      name: c.customer_name || c.name || `Customer ${idx + 1}`,
      single_sourcing: (c.single_sourcing || c["single_sourcing"]) === "Yes",
      include: (c.include || "Include") === "Include",
    }));

    // Transform facilities
    const facilities = data.facilities.map((f: any, idx: number) => ({
      facility_id: `F${idx + 1}`,
      name: f.facility_name || f.name || `Facility ${idx + 1}`,
      type: f.type || "DC",
      address: f.address || "",
      city: f.city || "",
      country: f.country || "",
      lat: f.lat || 0,
      lng: f.lng || 0,
      status: f.status || "Include",
    }));

    // Transform suppliers
    const suppliers = data.suppliers.map((s: any, idx: number) => ({
      supplier_id: `S${idx + 1}`,
      name: s.supplier_name || s.name || `Supplier ${idx + 1}`,
      location: s.location || "",
      lat: s.lat || 0,
      lng: s.lng || 0,
      product_id: s.product_id || s.product || "",
      capacity: Number(s.capacity) || 10000,
      capacity_unit: s.capacity_unit || s["capacity_unit"] || "units",
      include: true,
    }));

    // Transform paths
    const paths = data.paths.filter((p: any) => (p.include || "Include") === "Include").map((p: any, idx: number) => {
      let from_id = "";
      let to_id = "";

      const fromName = p.from;
      const toName = p.to;

      // Determine from_id
      if (p.from_type === "Customer") from_id = customerIdMap.get(fromName) || "";
      else if (p.from_type === "Facility") from_id = facilityIdMap.get(fromName) || "";
      else if (p.from_type === "Supplier") from_id = supplierIdMap.get(fromName) || "";

      // Determine to_id
      if (p.to_type === "Customer") to_id = customerIdMap.get(toName) || "";
      else if (p.to_type === "Facility") to_id = facilityIdMap.get(toName) || "";
      else if (p.to_type === "Supplier") to_id = supplierIdMap.get(toName) || "";

      return {
        path_id: `P${idx + 1}`,
        from_type: p.from_type,
        from_id,
        to_type: p.to_type,
        to_id,
        vehicle_type_id: p.vehicle_id || p["vehicle_id"],
        shipping_policy: p.shipping_policy || p["shipping_policy"] || "LTL",
        min_load_ratio: Number(p.min_load_ratio || p["min_load_ratio"] || 0),
        transport_pricing: p.transport_pricing || p["transport_pricing"] || "ProductBased",
        fixed_cost: Number(p.fixed_cost || p["fixed_cost"] || 0),
        product_cost_per_unit: Number(p["product_cost/unit"] || p.product_cost_per_unit || 1),
        distance: Number(p.distance || 100),
        distance_unit: p.distance_unit || p["distance_unit"] || "km",
        include: true,
      };
    });

    // Transform demand
    const demand = data.demand.map((d: any, idx: number) => ({
      demand_id: `D${idx + 1}`,
      customer_id: customerIdMap.get(d.customer_name || d.customer) || "",
      product_id: d.product_id || d.product || "",
      period_id: d.period_id || d.period || "Q1",
      demand_qty: Number(d.demand_qty || d.quantity || 0),
    }));

    // Transform production
    const production = data.production.filter((p: any) => (p.include || "Include") === "Include").map((p: any, idx: number) => ({
      production_id: `PR${idx + 1}`,
      site_id: facilityIdMap.get(p.facility_name || p.facility) || "",
      product_id: p.product_id || p.product || "",
      prod_cost_per_unit: Number(p["prod_cost/unit"] || p.prod_cost_per_unit || 10),
      prod_time_per_unit_hr: Number(p["prod_time/unit_(hr)"] || p.prod_time_per_unit_hr || 1),
      uom: "units",
      min_throughput: Number(p.min_throughput || 0),
      max_throughput: Number(p.max_throughput || 10000),
      conditional_minimum: Number(p.conditional_min || 0),
      period_id: p.period_id || p.period || "Q1",
      include: true,
    }));

    // Transform inventory
    const inventory = data.inventory.map((inv: any, idx: number) => ({
      inventory_id: `INV${idx + 1}`,
      site_id: facilityIdMap.get(inv.facility_name || inv.facility) || "",
      product_id: inv.product_id || inv.product || "",
      period_id: inv.period_id || inv.period || "Q1",
      min_level: Number(inv.min_level || 0),
      max_level: Number(inv.max_level || 1000),
      initial_level: Number(inv.initial_level || 0),
    }));

    // Transform flow rules
    const flowRules = data.flowRules.map((fr: any, idx: number) => {
      const fromId = facilityIdMap.get(fr.from) || customerIdMap.get(fr.from) || "";
      const toId = facilityIdMap.get(fr.to) || customerIdMap.get(fr.to) || "";

      return {
        rule_id: `FR${idx + 1}`,
        from_id: fromId,
        to_id: toId,
        product_id: fr.product_id || fr.product || "",
        min_throughput: Number(fr.min_throughput || 0),
        max_throughput: Number(fr.max_throughput || 10000),
        conditional_minimum: Number(fr.conditional_min || 0),
        vehicle_type_id: fr.vehicle_id || fr.vehicle || null,
        period_id: fr.period_id || fr.period || null,
      };
    });

    return {
      customers,
      facilities,
      suppliers,
      products: data.products.map((p: any) => ({
        product_id: p.product_id || p.id,
        name: p.product_name || p.name || p.product_id || p.id,
        uom: p.uom || p.UOM || "units",
      })),
      paths,
      demand,
      production,
      vehicleTypes: data.vehicleTypes.map((v: any) => ({
        vehicle_type_id: v.vehicle_id || v.id,
        name: v.vehicle_id || v.id,
        capacity: Number(v.capacity || 1000),
        capacity_unit: v.capacity_unit || v["capacity_unit"] || "units",
        speed_kmph: Number(v["speed_(km/h)"] || v.speed || 80),
        fixed_cost_per_trip: Number(v["fixed_cost/trip"] || v.fixed_cost_per_trip || 500),
        var_cost_per_km: Number(v["var_cost/km"] || v.var_cost_per_km || 1.5),
      })),
      periods: data.periods.map((p: any) => ({
        period_id: p.period_id || p.id,
        name: p.period_id || p.id,
        start_date: p.start_date || p["start_date"] || "2025-01-01",
        end_date: p.end_date || p["end_date"] || "2025-12-31",
        time_gap_days: Number(p["gap_(days)"] || p.time_gap_days || 0),
      })),
      flowRules,
      inventory,
    };
  };

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    
    try {
      toast.info("Running optimization...");
      
      const transformedData = transformData();
      
      console.log("Sending optimization request with transformed data:", {
        customers: transformedData.customers.length,
        facilities: transformedData.facilities.length,
        paths: transformedData.paths.length,
        demand: transformedData.demand.length
      });
      
      // Call the edge function using Supabase client
      const { data: result, error } = await supabase.functions.invoke('optimize-network', {
        body: {
          data: transformedData,
          settings: {
            objective,
            solver
          }
        }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        toast.error(`Optimization failed: ${error.message}`);
        return;
      }
      
      console.log("Optimization result:", result);
      
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      
      setResults({
        productFlow: result?.productFlow || [],
        production: result?.production || [],
        vehicleFlow: result?.vehicleFlow || [],
        costSummary: result?.costSummary || []
      });
      
      toast.success(`Optimization completed! Total cost: $${result?.costSummary?.[0]?.amount?.toFixed(2) || '0'}`);
      
    } catch (error: any) {
      console.error("Optimization error:", error);
      toast.error("Failed to run optimization: " + error.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="grid gap-6">
      {showIntegrity && (
        <DataIntegrityChecker />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Optimization Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <Label>Show Data Integrity Check</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIntegrity(!showIntegrity)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {showIntegrity ? 'Hide' : 'Show'} Integrity Check
            </Button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Solver</Label>
              <Select value={solver} onValueChange={setSolver}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opensource">Open Source (Simplex)</SelectItem>
                  <SelectItem value="ortools">OR-Tools</SelectItem>
                  <SelectItem value="gurobi" disabled>Gurobi (Commercial)</SelectItem>
                  <SelectItem value="cplex" disabled>CPLEX (Commercial)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Objective</Label>
              <Select value={objective} onValueChange={(v: any) => setObjective(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="min_cost">Minimize Total Cost</SelectItem>
                  <SelectItem value="min_time">Minimize Time</SelectItem>
                  <SelectItem value="max_service">Maximize Service Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Model Formulation:</strong> Multi-echelon network flow with production, transport, and capacity constraints. 
              Uses linear programming with flow balance, FTL/LTL policies, and single-sourcing constraints.
            </p>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleRunOptimization}
            disabled={isOptimizing}
          >
            <Play className="h-4 w-4 mr-2" />
            {isOptimizing ? "Optimizing..." : "Run Optimization"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
