import { createContext, useContext, useState, ReactNode } from "react";

type NetworkData = {
  customers: any[];
  facilities: any[];
  suppliers: any[];
  products: any[];
  vehicleTypes: any[];
  paths: any[];
  production: any[];
  inventory: any[];
  flowRules: any[];
  demand: any[];
  periods: any[];
};

type NetworkContextType = {
  data: NetworkData;
  updateTable: (table: keyof NetworkData, rows: any[]) => void;
  results: {
    productFlow: any[];
    production: any[];
    vehicleFlow: any[];
    costSummary: any[];
  };
  setResults: (results: any) => void;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

/**
 * IMPORTANT
 * Column → key mapping used by your table:
 *   "Customer Name"           -> customer_name
 *   "Single Sourcing"         -> single_sourcing
 *   "Include"                 -> include
 *
 *   "Facility Name"           -> facility_name
 *   "Type"                    -> type        ("DC" | "Factory")
 *   "Address"                 -> address
 *   "City"                    -> city
 *   "Country"                 -> country
 *   "Lat"                     -> lat
 *   "Lng"                     -> lng
 *   "Status"                  -> status      ("Include" | "Exclude")
 *
 *   "Supplier Name"           -> supplier_name
 *   "Location"                -> location
 *   "Product ID"              -> product_id
 *   "Capacity"                -> capacity
 *   "Capacity Unit"           -> capacity_unit
 *
 *   "Product ID"              -> product_id
 *   "UOM"                     -> uom
 *
 *   "Vehicle ID"              -> vehicle_id
 *   "Capacity"                -> capacity
 *   "Capacity Unit"           -> capacity_unit
 *   "Speed (km/h)"            -> speed_(km/h)
 *   "Fixed Cost/Trip"         -> fixed_cost/trip
 *   "Var Cost/km"             -> var_cost/km
 *
 *   Paths:
 *   "From Type"               -> from_type   ("Customer" | "Facility" | "Supplier")
 *   "From"                    -> from        (name from masters)
 *   "To Type"                 -> to_type
 *   "To"                      -> to
 *   "Vehicle ID"              -> vehicle_id
 *   "Shipping Policy"         -> shipping_policy ("FTL" | "LTL")
 *   "Min Load Ratio"          -> min_load_ratio
 *   "Transport Pricing"       -> transport_pricing ("Fixed"|"ProductBased"|"FixedPlusProduct")
 *   "Fixed Cost"              -> fixed_cost
 *   "Product Cost/Unit"       -> product_cost/unit
 *   "Distance"                -> distance
 *   "Distance Unit"           -> distance_unit ("km"|"mile")
 *   "Include"                 -> include
 *
 *   Production:
 *   "Facility Name"           -> facility_name   (must be a Factory)
 *   "Product ID"              -> product_id
 *   "Prod Cost/Unit"          -> prod_cost/unit
 *   "Prod Time/Unit (hr)"     -> prod_time/unit_(hr)
 *   "Min Throughput"          -> min_throughput
 *   "Max Throughput"          -> max_throughput
 *   "Conditional Min"         -> conditional_min
 *   "Period ID"               -> period_id
 *   "Include"                 -> include
 *
 *   Inventory:
 *   "Facility Name"           -> facility_name
 *   "Product ID"              -> product_id
 *   "Period ID"               -> period_id
 *   "Min Level"               -> min_level
 *   "Max Level"               -> max_level
 *   "Initial Level"           -> initial_level
 *
 *   Flow Rules:
 *   "From"                    -> from
 *   "To"                      -> to
 *   "Product ID"              -> product_id
 *   "Min Throughput"          -> min_throughput
 *   "Max Throughput"          -> max_throughput
 *   "Conditional Min"         -> conditional_min
 *   "Vehicle ID"              -> vehicle_id
 *   "Period ID"               -> period_id
 *
 *   Demand:
 *   "Customer Name"           -> customer_name
 *   "Product ID"              -> product_id
 *   "Period ID"               -> period_id
 *   "Demand Qty"              -> demand_qty
 *   "Single Sourcing"         -> single_sourcing
 *
 *   Periods:
 *   "Period ID"               -> period_id
 *   "Start Date"              -> start_date (YYYY-MM-DD)
 *   "End Date"                -> end_date   (YYYY-MM-DD)
 *   "Gap (days)"              -> gap_(days)
 */

const initialData: NetworkData = {
  // Customers - Simple example with all required fields
  customers: [
    { customer_name: "Customer A", single_sourcing: "No", include: "Include" },
    { customer_name: "Customer B", single_sourcing: "No", include: "Include" },
  ],

  // Facilities - Simple example with all required fields
  facilities: [
    {
      facility_name: "Factory A",
      type: "Factory",
      address: "123 Main St",
      city: "Detroit",
      country: "USA",
      lat: 42.33,
      lng: -83.05,
      status: "Include",
    },
    {
      facility_name: "DC A",
      type: "DC",
      address: "456 DC St",
      city: "Chicago",
      country: "USA",
      lat: 41.88,
      lng: -87.63,
      status: "Include",
    },
  ],

  // Suppliers - Simple example with all required fields
  suppliers: [
    {
      supplier_name: "Supplier A",
      location: "Houston",
      lat: 29.76,
      lng: -95.37,
      product_id: "P1",
      capacity: 5000,
      capacity_unit: "units",
    },
  ],

  // Products - Simple example
  products: [
    { product_id: "P1", uom: "units" },
  ],

  // Vehicle Types - Simple example
  vehicleTypes: [
    {
      vehicle_id: "Truck1",
      capacity: 1000,
      capacity_unit: "units",
      "speed_(km/h)": 80,
      "fixed_cost/trip": 500,
      "var_cost/km": 1.5,
    },
  ] as any[],

  // Paths - Simple complete network
  paths: [
    // Supplier to Factory
    {
      from_type: "Supplier",
      from: "Supplier A",
      to_type: "Facility",
      to: "Factory A",
      vehicle_id: "Truck1",
      shipping_policy: "LTL",
      min_load_ratio: 0.0,
      transport_pricing: "ProductBased",
      fixed_cost: 0,
      "product_cost/unit": 2.0,
      distance: 1000,
      distance_unit: "km",
      include: "Include",
    },
    // Factory to DC
    {
      from_type: "Facility",
      from: "Factory A",
      to_type: "Facility",
      to: "DC A",
      vehicle_id: "Truck1",
      shipping_policy: "LTL",
      min_load_ratio: 0.0,
      transport_pricing: "ProductBased",
      fixed_cost: 0,
      "product_cost/unit": 1.0,
      distance: 500,
      distance_unit: "km",
      include: "Include",
    },
    // DC to Customers
    {
      from_type: "Facility",
      from: "DC A",
      to_type: "Customer",
      to: "Customer A",
      vehicle_id: "Truck1",
      shipping_policy: "LTL",
      min_load_ratio: 0.0,
      transport_pricing: "ProductBased",
      fixed_cost: 0,
      "product_cost/unit": 3.0,
      distance: 200,
      distance_unit: "km",
      include: "Include",
    },
    {
      from_type: "Facility",
      from: "DC A",
      to_type: "Customer",
      to: "Customer B",
      vehicle_id: "Truck1",
      shipping_policy: "LTL",
      min_load_ratio: 0.0,
      transport_pricing: "ProductBased",
      fixed_cost: 0,
      "product_cost/unit": 3.5,
      distance: 300,
      distance_unit: "km",
      include: "Include",
    },
  ],

  // Production - Simple example
  production: [
    {
      facility_name: "Factory A",
      product_id: "P1",
      "prod_cost/unit": 10,
      "prod_time/unit_(hr)": 1.0,
      min_throughput: 0,
      max_throughput: 2000,
      conditional_min: 0,
      period_id: "Q1",
      include: "Include",
    },
  ],

  // Inventory - Simple example
  inventory: [
    {
      facility_name: "DC A",
      product_id: "P1",
      period_id: "Q1",
      min_level: 0,
      max_level: 1000,
      initial_level: 0,
    },
  ],

  // Flow Rules - Simple example
  flowRules: [
    {
      from: "Factory A",
      to: "DC A",
      product_id: "P1",
      min_throughput: 0,
      max_throughput: 2000,
      conditional_min: 0,
      vehicle_id: "Truck1",
      period_id: "Q1",
    },
    {
      from: "DC A",
      to: "Customer A",
      product_id: "P1",
      min_throughput: 0,
      max_throughput: 1000,
      conditional_min: 0,
      vehicle_id: "Truck1",
      period_id: "Q1",
    },
    {
      from: "DC A",
      to: "Customer B",
      product_id: "P1",
      min_throughput: 0,
      max_throughput: 1000,
      conditional_min: 0,
      vehicle_id: "Truck1",
      period_id: "Q1",
    },
  ],

  // Demand - Simple example
  demand: [
    {
      customer_name: "Customer A",
      product_id: "P1",
      period_id: "Q1",
      demand_qty: 100,
      single_sourcing: "No",
    },
    {
      customer_name: "Customer B",
      product_id: "P1",
      period_id: "Q1",
      demand_qty: 150,
      single_sourcing: "No",
    },
  ],

  // Periods - Simple example
  periods: [
    { period_id: "Q1", start_date: "2025-01-01", end_date: "2025-03-31", "gap_(days)": 0 },
  ],
};

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<NetworkData>(initialData);
  const [results, setResults] = useState({
    productFlow: [],
    production: [],
    vehicleFlow: [],
    costSummary: [],
  });

  const updateTable = (table: keyof NetworkData, rows: any[]) => {
    setData((prev) => ({ ...prev, [table]: rows }));
  };

  return (
    <NetworkContext.Provider value={{ data, updateTable, results, setResults }}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}
