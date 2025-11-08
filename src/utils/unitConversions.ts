// Standard unit conversion factors to m3 (cubic meters)
export const UNIT_CONVERSIONS: Record<string, number> = {
  // Volume units
  "m3": 1,
  "cubic meters": 1,
  "cubic metre": 1,
  "liters": 0.001,
  "litres": 0.001,
  "l": 0.001,
  
  // Weight units (assuming average density)
  "tonnes": 0.5, // 1 tonne ≈ 0.5 m3 (average)
  "tons": 0.5,
  "kg": 0.0005,
  "kilograms": 0.0005,
  
  // Area units (assuming 1m height)
  "sq2": 1, // square meters with 1m height
  "sqm": 1,
  "square meters": 1,
  
  // Pallet units (standard pallet)
  "pallets": 1.0, // 1 pallet = 1.0 (no default conversion)
  "pallet": 1.0,
  
  // Container units
  "containers": 33, // 20ft container ≈ 33 m3
  "container": 33,
  
  // Custom/other
  "units": 1,
  "unit": 1,
};

/**
 * Get conversion factor for a given unit to m3
 */
export function getConversionFactor(unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim();
  return UNIT_CONVERSIONS[normalizedUnit] || 1;
}

/**
 * Convert demand to standard units (m3)
 */
export function convertToStandardUnit(demand: number, unit: string): number {
  return demand * getConversionFactor(unit);
}

/**
 * Get list of available units
 */
export function getAvailableUnits(): string[] {
  return ["m3", "pallets", "tonnes", "sq2", "containers", "liters", "kg", "units"];
}
