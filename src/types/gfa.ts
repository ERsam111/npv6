export interface UnitConversion {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: number;
}

export interface Product {
  name: string;
  baseUnit: string; // The baseline unit for this product
  sellingPrice?: number; // Selling price per base unit
  // Unit conversion factors - these are column names from Excel that represent conversions to other units
  // e.g., "to_m3": 1.2 means 1 baseUnit = 1.2 m3
  unitConversions?: { [unitName: string]: number };
}

export interface Customer {
  id: string;
  product: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  demand: number;
  unitOfMeasure: string; // e.g., "pallets", "m3", "tonnes", "sq2"
  conversionFactor: number; // conversion to standard unit (m3)
}

export interface ExistingSite {
  id: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  capacity: number; // capacity in standard units (m3)
  capacityUnit: string;
}

export interface DistributionCenter {
  id: string;
  latitude: number;
  longitude: number;
  assignedCustomers: Customer[];
  totalDemand: number;
  nearestCity?: string;
  cityCountry?: string;
}

export interface OptimizationSettings {
  mode: 'sites' | 'distance' | 'cost'; // optimization mode
  numDCs: number;
  maxRadius: number; // kilometers
  demandPercentage: number; // percentage of demand that must be within maxRadius (0-100)
  dcCapacity: number; // capacity in standard units (m3)
  capacityUnit: string; // unit for display (e.g., "m3", "pallets")
  transportationCostPerMilePerUnit: number; // cost per mile per unit
  facilityCost: number; // cost to open one site
  distanceUnit: 'km' | 'mile'; // unit for transportation cost
  costUnit: string; // unit for cost calculation (kg, ton, m3, pallet, etc.)
  includeExistingSites: boolean; // whether to include existing sites in analysis
  existingSitesMode: 'potential' | 'always'; // 'potential' = compete with new sites, 'always' = always included
}

export interface CostBreakdown {
  totalCost: number;
  transportationCost: number;
  facilityCost: number;
  numSites: number;
}
