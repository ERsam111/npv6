export interface Customer {
  customer_id: string;
  customer_name: string;
  lat?: number;
  lon?: number;
  city?: string;
  region?: string;
  country?: string;
}

export interface Facility {
  facility_id: string;
  facility_name: string;
  facility_type: 'DC' | 'WAREHOUSE';
  lat?: number;
  lon?: number;
  city?: string;
  region?: string;
  country?: string;
}

export interface Plant {
  plant_id: string;
  plant_name: string;
  production_capacity?: number;
  lat?: number;
  lon?: number;
  city?: string;
  region?: string;
  country?: string;
}

export interface Product {
  product_id: string;
  uom: string;
  weight_kg_per_unit: number;
  cube_m3_per_unit: number;
}

export interface Vehicle {
  vehicle_id: string;
  vehicle_type: string;
  capacity_units?: number;
  capacity_kg?: number;
  capacity_m3?: number;
  cost_per_km?: number;
  cost_per_trip?: number;
}

export interface Demand {
  customer_id: string;
  product_id: string;
  demand_model: 'normal' | 'triangular' | 'uniform' | 'poisson';
  param1: number;
  param2?: number;
  param3?: number;
  calendar: 'daily' | 'weekly';
}

export interface Capacity {
  location_id: string;
  product_id: string;
  max_units_capacity: number;
}

export interface SourcingRule {
  ship_from_location_id: string;
  ship_to_location_id: string;
  product_id: string;
  is_allowed: boolean;
  preference_rank: number;
}

export interface Transport {
  origin_id: string;
  dest_id: string;
  product_id: string;
  vehicle_id: string;
  lead_time_model: 'normal' | 'triangular' | 'uniform';
  lt_param1: number;
  lt_param2?: number;
  lt_param3?: number;
  cost_model: 'per_unit' | 'per_shipment' | 'per_km';
  cost_param1: number;
  cost_param2?: number;
}

export interface Production {
  plant_id: string;
  product_id: string;
  prod_rate_units_per_day: number;
  setup_time_days: number;
  prod_cost_per_unit: number;
  bom_id?: string;
}

export interface PolicyParameter {
  location_id: string;
  product_id: string;
  initial_s: number;
  initial_S: number;
}

export interface FinancialParameter {
  product_id: string;
  holding_cost_per_unit_day: number;
  backorder_penalty_per_unit_day: number;
  lost_sale_penalty_per_unit: number;
  ordering_cost_per_order: number;
}

export interface PolicyResult {
  location_id: string;
  product_id: string;
  s: number;
  S: number;
  total_cost: number;
  fill_rate: number;
  csl: number;
}

export interface SimulationConfig {
  simulation_days: number;
  replications: number;
  random_seed?: number;
  service_level_target: number;
}
