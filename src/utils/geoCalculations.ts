/**
 * Calculate Haversine distance between two geographic points
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
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
  unitOfMeasure: string;
  conversionFactor: number;
}

export interface Product {
  name: string;
  baseUnit: string;
  conversionToStandard: number;
  unitConversions: Array<{
    id: string;
    fromUnit: string;
    toUnit: string;
    factor: number;
  }>;
}

export interface DistributionCenter {
  id: string;
  latitude: number;
  longitude: number;
  assignedCustomers: Customer[];
  totalDemand: number;
}

/**
 * Calculate center of gravity for a set of customers
 */
export function calculateCenterOfGravity(customers: Customer[]): {
  latitude: number;
  longitude: number;
} {
  if (customers.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  const totalDemand = customers.reduce((sum, c) => sum + c.demand, 0);
  
  const weightedLat = customers.reduce(
    (sum, c) => sum + c.latitude * c.demand,
    0
  );
  const weightedLon = customers.reduce(
    (sum, c) => sum + c.longitude * c.demand,
    0
  );

  return {
    latitude: weightedLat / totalDemand,
    longitude: weightedLon / totalDemand,
  };
}

/**
 * K-means clustering for DC optimization
 */
export function kMeansOptimization(
  customers: Customer[],
  numDCs: number,
  maxIterations: number = 100
): DistributionCenter[] {
  if (customers.length === 0 || numDCs <= 0) {
    return [];
  }

  // Initialize DCs with random customers
  let dcs: DistributionCenter[] = [];
  const usedIndices = new Set<number>();
  
  for (let i = 0; i < Math.min(numDCs, customers.length); i++) {
    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * customers.length);
    } while (usedIndices.has(randomIndex));
    
    usedIndices.add(randomIndex);
    const customer = customers[randomIndex];
    
    dcs.push({
      id: `site-${i + 1}`,
      latitude: customer.latitude,
      longitude: customer.longitude,
      assignedCustomers: [],
      totalDemand: 0,
    });
  }

  // K-means iterations
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Reset assignments
    dcs.forEach(dc => {
      dc.assignedCustomers = [];
      dc.totalDemand = 0;
    });

    // Assign customers to nearest DC
    customers.forEach(customer => {
      let nearestDC = dcs[0];
      let minDistance = haversineDistance(
        customer.latitude,
        customer.longitude,
        nearestDC.latitude,
        nearestDC.longitude
      );

      dcs.forEach(dc => {
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          dc.latitude,
          dc.longitude
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestDC = dc;
        }
      });

      nearestDC.assignedCustomers.push(customer);
      // Convert customer demand to standard units (m3) for totalDemand calculation
      nearestDC.totalDemand += customer.demand * customer.conversionFactor;
    });

    // Recalculate DC positions (center of gravity of assigned customers)
    let converged = true;
    dcs.forEach(dc => {
      if (dc.assignedCustomers.length > 0) {
        const newCenter = calculateCenterOfGravity(dc.assignedCustomers);
        const movement = haversineDistance(
          dc.latitude,
          dc.longitude,
          newCenter.latitude,
          newCenter.longitude
        );
        
        if (movement > 0.1) {
          converged = false;
        }
        
        dc.latitude = newCenter.latitude;
        dc.longitude = newCenter.longitude;
      }
    });

    if (converged) {
      break;
    }
  }

  return dcs;
}

export interface OptimizationConstraints {
  maxRadius: number; // in kilometers
  demandPercentage: number; // percentage of demand that must be within maxRadius (0-100)
  dcCapacity: number; // maximum capacity in standard units (0 = unlimited)
  capacityUnit?: string; // unit for display purposes
}

export interface OptimizationResult {
  dcs: DistributionCenter[];
  feasible: boolean;
  warnings: string[];
  costBreakdown?: {
    totalCost: number;
    transportationCost: number;
    facilityCost: number;
    numSites: number;
  };
}

/**
 * Convert demand from one unit to another using product-specific conversions
 */
export function convertDemand(
  demand: number,
  fromUnit: string,
  toUnit: string,
  product: Product | undefined
): number {
  const normalizedFrom = fromUnit.toLowerCase().trim();
  const normalizedTo = toUnit.toLowerCase().trim();
  
  // Same units - no conversion needed
  if (normalizedFrom === normalizedTo) {
    return demand;
  }
  
  // Check for custom unit conversions first
  if (product?.unitConversions && product.unitConversions.length > 0) {
    // Direct conversion (from → to)
    const directConv = product.unitConversions.find(
      c => c.fromUnit.toLowerCase().trim() === normalizedFrom && 
           c.toUnit.toLowerCase().trim() === normalizedTo
    );
    if (directConv) {
      return demand * directConv.factor;
    }
    
    // Reverse conversion (to → from, so we divide)
    const reverseConv = product.unitConversions.find(
      c => c.fromUnit.toLowerCase().trim() === normalizedTo && 
           c.toUnit.toLowerCase().trim() === normalizedFrom
    );
    if (reverseConv) {
      return demand / reverseConv.factor;
    }
  }
  
  // Fallback to system defaults
  const fromFactor = getConversionFactor(fromUnit);
  const toFactor = getConversionFactor(toUnit);
  return (demand * fromFactor) / toFactor;
}

/**
 * Calculate total transportation cost for a given DC configuration
 */
function calculateTransportationCost(
  dcs: DistributionCenter[],
  costPerDistancePerUnit: number,
  distanceUnit: 'km' | 'mile',
  costUnit: string,
  products: Product[]
): number {
  let totalCost = 0;
  
  dcs.forEach(dc => {
    dc.assignedCustomers.forEach(customer => {
      const distance = haversineDistance(
        customer.latitude,
        customer.longitude,
        dc.latitude,
        dc.longitude
      );
      
      // Convert distance to selected unit
      const distanceInSelectedUnit = distanceUnit === 'mile' ? distance * 0.621371 : distance;
      
      // Find the product for this customer
      const product = products.find(p => p.name === customer.product);
      
      // Convert customer demand to cost unit
      const demandInCostUnit = convertDemand(
        customer.demand,
        customer.unitOfMeasure,
        costUnit,
        product
      );
      
      // Cost = distance * demand (in cost units) * cost per distance per unit
      totalCost += distanceInSelectedUnit * demandInCostUnit * costPerDistancePerUnit;
    });
  });
  
  return totalCost;
}

// Import conversion function from unitConversions
import { getConversionFactor } from './unitConversions';

/**
 * Optimize DC placement with cost minimization
 */
export function optimizeWithCost(
  customers: Customer[],
  transportationCostPerDistancePerUnit: number,
  facilityCost: number,
  distanceUnit: 'km' | 'mile',
  costUnit: string,
  products: Product[]
): OptimizationResult {
  const warnings: string[] = [];
  let bestDcs: DistributionCenter[] = [];
  let bestTotalCost = Infinity;
  let bestTransportationCost = 0;
  let bestNumSites = 1;
  
  // Try different numbers of sites from 1 to customers.length (capped at 100 for performance)
  const maxSites = Math.min(100, customers.length);
  for (let numSites = 1; numSites <= maxSites; numSites++) {
    const dcs = kMeansOptimization(customers, numSites);
    const transportationCost = calculateTransportationCost(
      dcs, 
      transportationCostPerDistancePerUnit,
      distanceUnit,
      costUnit,
      products
    );
    const totalFacilityCost = numSites * facilityCost;
    const totalCost = transportationCost + totalFacilityCost;
    
    if (totalCost < bestTotalCost) {
      bestTotalCost = totalCost;
      bestDcs = dcs;
      bestTransportationCost = transportationCost;
      bestNumSites = numSites;
    }
  }
  
  return {
    dcs: bestDcs,
    feasible: true,
    warnings,
    costBreakdown: {
      totalCost: bestTotalCost,
      transportationCost: bestTransportationCost,
      facilityCost: bestNumSites * facilityCost,
      numSites: bestNumSites,
    },
  };
}

/**
 * Optimize DC placement with constraints
 */
export function optimizeWithConstraints(
  customers: Customer[],
  numDCs: number,
  constraints: OptimizationConstraints,
  mode: 'sites' | 'distance' | 'cost' = 'sites',
  costParams?: {
    transportationCostPerMilePerUnit: number;
    facilityCost: number;
    distanceUnit: 'km' | 'mile';
    costUnit: string;
  },
  products?: Product[]
): OptimizationResult {
  const warnings: string[] = [];
  let dcs: DistributionCenter[];

  // Calculate total demand to check feasibility
  const totalDemand = customers.reduce((sum, c) => sum + (c.demand * c.conversionFactor), 0);
  const hasCapacityConstraint = constraints.dcCapacity > 0;

  if (mode === 'cost') {
    // Cost-based optimization
    if (!costParams) {
      throw new Error('Cost parameters required for cost-based optimization');
    }
    return optimizeWithCost(
      customers,
      costParams.transportationCostPerMilePerUnit,
      costParams.facilityCost,
      costParams.distanceUnit,
      costParams.costUnit,
      products || []
    );
  } else if (mode === 'distance') {
    // Distance-based optimization: iteratively add sites until ALL constraints are met
    let currentNumSites = 1;
    let constraintViolations = Infinity;
    const maxSites = customers.length; // No limit - add as many sites as needed
    const targetDemandPercentage = constraints.demandPercentage || 100;

    while (constraintViolations > 0 && currentNumSites <= maxSites) {
      dcs = kMeansOptimization(customers, currentNumSites);
      constraintViolations = 0;
      let radiusViolations = 0;
      let capacityViolations = 0;

      // Check distance constraints based on demand percentage
      dcs.forEach(dc => {
        if (dc.totalDemand === 0) return;
        
        let demandWithinRadius = 0;
        
        dc.assignedCustomers.forEach(customer => {
          const distance = haversineDistance(
            customer.latitude,
            customer.longitude,
            dc.latitude,
            dc.longitude
          );
          if (distance <= constraints.maxRadius) {
            demandWithinRadius += customer.demand * customer.conversionFactor;
          }
        });
        
        const percentageWithinRadius = (demandWithinRadius / dc.totalDemand) * 100;
        
        if (percentageWithinRadius < targetDemandPercentage) {
          radiusViolations++;
          constraintViolations++;
        }
      });

      // Check capacity constraints
      if (hasCapacityConstraint) {
        dcs.forEach(dc => {
          if (dc.totalDemand > constraints.dcCapacity) {
            capacityViolations++;
            constraintViolations++;
          }
        });
      }

      if (constraintViolations === 0) {
        break;
      }
      currentNumSites++;
    }

    if (constraintViolations > 0) {
      if (currentNumSites > maxSites) {
        warnings.push(
          `Unable to find feasible solution even with ${maxSites} sites. Consider relaxing constraints.`
        );
      }
    }
  } else {
    // Sites-based optimization: use ONLY the specified number of sites
    // Check if this is even feasible with capacity constraints
    if (hasCapacityConstraint) {
      const maxPossibleCapacity = numDCs * constraints.dcCapacity;
      if (totalDemand > maxPossibleCapacity) {
        warnings.push(
          `INFEASIBLE: Total demand (${totalDemand.toFixed(2)} ${constraints.capacityUnit || 'm3'}) exceeds maximum capacity with ${numDCs} sites (${maxPossibleCapacity.toFixed(2)} ${constraints.capacityUnit || 'm3'}). You need at least ${Math.ceil(totalDemand / constraints.dcCapacity)} sites, or increase capacity to ${(totalDemand / numDCs).toFixed(2)} ${constraints.capacityUnit || 'm3'} per site.`
        );
      }
    }
    
    dcs = kMeansOptimization(customers, numDCs);
  }

  // Final check: Report any capacity violations
  let capacityViolations = 0;
  if (hasCapacityConstraint) {
    dcs.forEach(dc => {
      if (dc.totalDemand > constraints.dcCapacity) {
        capacityViolations++;
        const unitLabel = constraints.capacityUnit || 'm3';
        const overage = dc.totalDemand - constraints.dcCapacity;
        warnings.push(
          `Site ${dc.id} exceeds capacity by ${overage.toFixed(2)} ${unitLabel}: ${dc.totalDemand.toFixed(2)} / ${constraints.dcCapacity} ${unitLabel} (${((dc.totalDemand / constraints.dcCapacity) * 100).toFixed(1)}% utilization)`
        );
      }
    });
  }

  // Check distance violations in sites mode (informational)
  if (mode === 'sites' && constraints.maxRadius > 0) {
    const targetDemandPercentage = constraints.demandPercentage || 100;
    let sitesViolatingDistance = 0;
    
    dcs.forEach(dc => {
      if (dc.totalDemand === 0) return;
      
      let demandWithinRadius = 0;
      
      dc.assignedCustomers.forEach(customer => {
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          dc.latitude,
          dc.longitude
        );
        if (distance <= constraints.maxRadius) {
          demandWithinRadius += customer.demand * customer.conversionFactor;
        }
      });
      
      const percentageWithinRadius = (demandWithinRadius / dc.totalDemand) * 100;
      
      if (percentageWithinRadius < targetDemandPercentage) {
        sitesViolatingDistance++;
      }
    });
    
    if (sitesViolatingDistance > 0) {
      warnings.push(
        `${sitesViolatingDistance} site(s) do not meet the ${targetDemandPercentage}% demand coverage within ${constraints.maxRadius} km. This is informational only in 'Number of Sites' mode.`
      );
    }
  }

  const feasible = capacityViolations === 0 && (mode !== 'sites' || totalDemand <= (hasCapacityConstraint ? numDCs * constraints.dcCapacity : Infinity));

  return {
    dcs,
    feasible,
    warnings,
  };
}
