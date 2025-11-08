export type ID = string;

export interface Customer {
  customer_id: ID;
  name: string;
  address?: string;
  code?: string;
  lat?: number;
  lng?: number;
  remark?: string;
  single_sourcing?: boolean;
  include?: boolean;
}

export interface Facility {
  facility_id: ID;
  name: string;
  type: 'DC' | 'Factory';
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  status?: 'Include' | 'Exclude';
}

export interface Supplier {
  supplier_id: ID;
  name: string;
  location?: string;
  lat?: number;
  lng?: number;
  product_id: ID;
  capacity: number;
  capacity_unit: string;
  include?: boolean;
}

export interface VehicleType {
  vehicle_type_id: ID;
  name: string;
  capacity: number;
  capacity_unit: string;
  speed_kmph?: number;
  fixed_cost_per_trip?: number;
  var_cost_per_km?: number;
}

export interface Product {
  product_id: ID;
  name: string;
  uom: string;
  bom_id?: ID | null;
}

export interface UnitConversion {
  product_id: ID;
  amount_from: number;
  unit_from: string;
  amount_to: number;
  unit_to: string;
}

export interface Path {
  path_id: ID;
  from_type: 'Customer' | 'Facility' | 'Supplier';
  from_id: ID;
  to_type: 'Customer' | 'Facility' | 'Supplier';
  to_id: ID;
  vehicle_type_id: ID;
  shipping_policy: 'FTL' | 'LTL';
  min_load_ratio?: number;
  transport_pricing: 'Fixed' | 'ProductBased' | 'FixedPlusProduct';
  fixed_cost?: number;
  product_cost_per_unit?: number;
  distance?: number;
  distance_unit?: string;
  include?: boolean;
}

export interface ProductFlowRule {
  rule_id: ID;
  from_id: ID;
  to_id: ID;
  product_id: ID;
  min_throughput?: number | null;
  max_throughput?: number | null;
  conditional_minimum?: number | null;
  vehicle_type_id?: ID | null;
  period_id?: ID | null;
}

export interface Period {
  period_id: ID;
  name: string;
  start_date: string;
  end_date: string;
  time_gap_days?: number;
}

export interface ProductGroup {
  group_id: ID;
  group_name: string;
  product_ids: ID[];
}

export interface Production {
  production_id: ID;
  site_id: ID;
  product_id: ID;
  bom_id?: ID | null;
  prod_cost_per_unit: number;
  prod_time_per_unit_hr?: number;
  uom: string;
  min_throughput?: number | null;
  max_throughput?: number | null;
  conditional_minimum?: number | null;
  period_id?: ID | null;
  include?: boolean;
}

export interface BOM {
  bom_id: ID;
  end_product_id: ID;
  end_qty: number;
  raw_product_id: ID;
  raw_qty: number;
}

export interface Inventory {
  inventory_id: ID;
  site_id: ID;
  product_id: ID;
  period_id: ID;
  min_level?: number;
  max_level?: number;
  initial_level?: number;
}

export interface Demand {
  demand_id: ID;
  customer_id: ID;
  product_id: ID;
  period_id: ID;
  demand_qty: number;
}

export interface OptimizeSettings {
  objective: 'min_cost' | 'min_time' | 'max_service';
  time_gap_days?: number;
  solver: 'pulp_cbc' | 'or_tools' | 'gurobi' | 'cplex';
  license?: Record<string, string>;
}
