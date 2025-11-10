export interface UnitConversion {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: number;
}

export interface Product {
  name: string;
  baseUnit: string; // The unit used in customer demand data
  conversionToStandard: number; // Conversion factor to standard unit (m3) for capacity calculations
  unitConversions: UnitConversion[]; // Additional unit conversions for this product
  sellingPrice?: number; // Selling price per unit
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
