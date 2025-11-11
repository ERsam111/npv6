import { Product, ExistingSite } from '@/types/gfa';
import { getConversionFactor } from './unitConversions';

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

export interface DistributionCenter {
  id: string;
  latitude: number;
  longitude: number;
  assignedCustomers: Customer[];
  totalDemand: number;
}

/**
 * Calculate geodesic centroid (Weber point) using iterative optimization
 * This minimizes the sum of weighted geodesic distances, which is more accurate than center of gravity
 */
export function calculateGeodesicCentroid(customers: Customer[]): {
  latitude: number;
  longitude: number;
} {
  if (customers.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  if (customers.length === 1) {
    return { latitude: customers[0].latitude, longitude: customers[0].longitude };
  }

  // Start with simple center of gravity as initial estimate
  const totalDemand = customers.reduce((sum, c) => sum + c.demand, 0);
  let lat = customers.reduce((sum, c) => sum + c.latitude * c.demand, 0) / totalDemand;
  let lon = customers.reduce((sum, c) => sum + c.longitude * c.demand, 0) / totalDemand;

  // Iterative optimization using modified Weiszfeld algorithm for geodesic distances
  const maxIterations = 100;
  const tolerance = 0.0001; // degrees

  for (let iter = 0; iter < maxIterations; iter++) {
    let numeratorLat = 0;
    let numeratorLon = 0;
    let denominator = 0;

    for (const customer of customers) {
      const distance = haversineDistance(lat, lon, customer.latitude, customer.longitude);
      
      // Avoid division by zero
      if (distance < 0.001) {
        // If we're very close to a customer, just use that customer's location
        return { latitude: customer.latitude, longitude: customer.longitude };
      }

      // Weight by demand / distance (Weiszfeld weights)
      const weight = customer.demand / distance;
      
      numeratorLat += weight * customer.latitude;
      numeratorLon += weight * customer.longitude;
      denominator += weight;
    }

    const newLat = numeratorLat / denominator;
    const newLon = numeratorLon / denominator;

    // Check convergence
    const change = Math.sqrt(Math.pow(newLat - lat, 2) + Math.pow(newLon - lon, 2));
    
    lat = newLat;
    lon = newLon;

    if (change < tolerance) {
      break;
    }
  }

  return { latitude: lat, longitude: lon };
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

    // Recalculate DC positions using geodesic centroid (optimizes for true geodesic distances)
    let converged = true;
    dcs.forEach(dc => {
      if (dc.assignedCustomers.length > 0) {
        const newCenter = calculateGeodesicCentroid(dc.assignedCustomers);
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
  if (product?.unitConversions && typeof product.unitConversions === 'object') {
    // Check if the unit conversion exists directly
    const conversionKey = `to_${normalizedTo}`;
    if ((product.unitConversions as any)[conversionKey]) {
      return demand * (product.unitConversions as any)[conversionKey];
    }

    // Check reverse conversion
    const reverseKey = `to_${normalizedFrom}`;
    if ((product.unitConversions as any)[reverseKey]) {
      return demand / (product.unitConversions as any)[reverseKey];
    }
  }

  // Fallback to system defaults
  const fromFactor = getConversionFactor(fromUnit);
  const toFactor = getConversionFactor(toUnit);
  return (demand * fromFactor) / toFactor;
}

/**
 * Helper: does a DC coincide with (or sit very near) an existing site?
 * Used to decide whether the facility opening cost should apply.
 * Returns the matched existing site if found within threshold.
 */
function matchExistingSite(
  dc: DistributionCenter,
  existingSites?: ExistingSite[],
  thresholdKm: number = 1 // very tight tolerance - must be at exact location
): ExistingSite | undefined {
  if (!existingSites || existingSites.length === 0) return undefined;
  
  for (const site of existingSites) {
    const distance = haversineDistance(
      dc.latitude,
      dc.longitude,
      Number(site.latitude),
      Number(site.longitude)
    );
    
    // If DC is at or very near existing site location, it matches
    if (distance <= thresholdKm) {
      return site;
    }
  }
  return undefined;
}

/**
 * Calculate total weighted distance-flow for a DC configuration
 * This is the sum of (distance * demand) for all customer-DC assignments
 */
function calculateTotalDistanceFlow(dcs: DistributionCenter[]): number {
  let totalFlow = 0;
  
  dcs.forEach(dc => {
    dc.assignedCustomers.forEach(customer => {
      const distance = haversineDistance(
        customer.latitude,
        customer.longitude,
        dc.latitude,
        dc.longitude
      );
      // Weight by demand (in standard units)
      totalFlow += distance * (customer.demand * customer.conversionFactor);
    });
  });
  
  return totalFlow;
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
      const distanceInSelectedUnit =
        distanceUnit === 'mile' ? distance * 0.621371 : distance;

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
      totalCost +=
        distanceInSelectedUnit * demandInCostUnit * costPerDistancePerUnit;
    });
  });

  return totalCost;
}

/**
 * Optimize DC placement with cost minimization
 * Minimizes TOTAL COST = Transportation Cost + Facility Opening Cost
 * 
 * Modes:
 * - 'always': Existing sites are always included (forced), no facility cost for them
 * - 'potential': Existing sites compete with new sites, algorithm chooses based on total cost
 */
export function optimizeWithCost(
  customers: Customer[],
  transportationCostPerDistancePerUnit: number,
  facilityCost: number,
  distanceUnit: 'km' | 'mile',
  costUnit: string,
  products: Product[],
  existingSites?: ExistingSite[],
  existingSitesMode?: 'always' | 'potential'
): OptimizationResult {
  const warnings: string[] = [];
  let bestDcs: DistributionCenter[] = [];
  let bestTotalCost = Infinity;
  let bestTransportationCost = 0;
  let bestNumSites = 1;
  let bestFacilityCost = 0;

  const maxTrialSites = Math.min(50, customers.length);
  const hasExistingSites = existingSites && existingSites.length > 0;

  if (existingSitesMode === 'always' && hasExistingSites) {
    // ALWAYS MODE: Existing sites are forced, minimize total cost by adding optimal new sites
    for (let numNewSites = 0; numNewSites <= maxTrialSites; numNewSites++) {
      const dcs = buildDCConfiguration(
        customers,
        numNewSites,
        existingSites!,
        'always'
      );

      const { totalCost, transportationCost, facilityCost: facilityOpeningCost } = 
        calculateConfigurationCost(
          dcs,
          transportationCostPerDistancePerUnit,
          distanceUnit,
          costUnit,
          products,
          facilityCost,
          existingSites
        );

      if (totalCost < bestTotalCost) {
        bestTotalCost = totalCost;
        bestDcs = dcs;
        bestTransportationCost = transportationCost;
        bestNumSites = dcs.length;
        bestFacilityCost = facilityOpeningCost;
      }
    }
  } else if (existingSitesMode === 'potential' && hasExistingSites) {
    // POTENTIAL MODE: Existing sites have 0 cost, must compare all configurations
    for (let numSites = 1; numSites <= maxTrialSites; numSites++) {
      // Option A: Use existing sites only (if we have enough)
      if (numSites <= existingSites!.length) {
        const existingDcs = buildDCConfiguration(
          customers,
          numSites,
          existingSites!,
          'use-existing-subset'
        );
        
        const existingCost = calculateConfigurationCost(
          existingDcs,
          transportationCostPerDistancePerUnit,
          distanceUnit,
          costUnit,
          products,
          facilityCost,
          existingSites
        );
        
        if (existingCost.totalCost < bestTotalCost) {
          bestTotalCost = existingCost.totalCost;
          bestDcs = existingDcs;
          bestTransportationCost = existingCost.transportationCost;
          bestNumSites = existingDcs.length;
          bestFacilityCost = existingCost.facilityCost;
        }
      }
      
      // Option B: Pure k-means (all new sites with facility cost)
      const newDcs = kMeansOptimization(customers, numSites);
      const newCost = calculateConfigurationCost(
        newDcs,
        transportationCostPerDistancePerUnit,
        distanceUnit,
        costUnit,
        products,
        facilityCost,
        undefined // No existing sites = all pay facility cost
      );
      
      if (newCost.totalCost < bestTotalCost) {
        bestTotalCost = newCost.totalCost;
        bestDcs = newDcs;
        bestTransportationCost = newCost.transportationCost;
        bestNumSites = newDcs.length;
        bestFacilityCost = newCost.facilityCost;
      }
    }
  } else {
    // No existing sites: pure cost optimization
    for (let numSites = 1; numSites <= maxTrialSites; numSites++) {
      const dcs = kMeansOptimization(customers, numSites);
      const cost = calculateConfigurationCost(
        dcs,
        transportationCostPerDistancePerUnit,
        distanceUnit,
        costUnit,
        products,
        facilityCost,
        undefined
      );
      
      if (cost.totalCost < bestTotalCost) {
        bestTotalCost = cost.totalCost;
        bestDcs = dcs;
        bestTransportationCost = cost.transportationCost;
        bestNumSites = numSites;
        bestFacilityCost = cost.facilityCost;
      }
    }
  }

  return {
    dcs: bestDcs,
    feasible: true,
    warnings,
    costBreakdown: {
      totalCost: bestTotalCost,
      transportationCost: bestTransportationCost,
      facilityCost: bestFacilityCost,
      numSites: bestNumSites,
    },
  };
}

/**
 * Build DC configuration based on mode and parameters
 */
function buildDCConfiguration(
  customers: Customer[],
  numNewSites: number,
  existingSites: ExistingSite[],
  mode: 'always' | 'potential' | 'potential-existing-only' | 'use-existing-subset'
): DistributionCenter[] {
  if (mode === 'potential-existing-only' || mode === 'use-existing-subset') {
    // Use ONLY existing sites (either all or a subset)
    const sitesToUse = mode === 'use-existing-subset' 
      ? existingSites.slice(0, numNewSites) 
      : existingSites;
    
    const dcs: DistributionCenter[] = sitesToUse.map((site, index) => ({
      id: `existing-${index + 1}`,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      assignedCustomers: [],
      totalDemand: 0,
    }));

    // Assign customers to nearest existing site
    customers.forEach(customer => {
      let nearestDC = dcs[0];
      let minDistance = Infinity;

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
      nearestDC.totalDemand += customer.demand * customer.conversionFactor;
    });

    return dcs;
  }

  if (mode === 'always') {
    // Force existing sites + add new sites
    if (numNewSites === 0) {
      // Only existing sites
      return buildDCConfiguration(customers, 0, existingSites, 'potential-existing-only');
    }

    // Combine existing + new
    const newDcs = kMeansOptimization(customers, numNewSites);
    const existingDcs: DistributionCenter[] = existingSites.map((site, index) => ({
      id: `existing-${index + 1}`,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      assignedCustomers: [],
      totalDemand: 0,
    }));

    const allDcs = [
      ...existingDcs,
      ...newDcs.map((dc, idx) => ({ ...dc, id: `new-${idx + 1}` })),
    ];

    // Reassign customers
    allDcs.forEach(dc => {
      dc.assignedCustomers = [];
      dc.totalDemand = 0;
    });

    customers.forEach(customer => {
      let nearestDC = allDcs[0];
      let minDistance = Infinity;

      allDcs.forEach(dc => {
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
      nearestDC.totalDemand += customer.demand * customer.conversionFactor;
    });

    return allDcs;
  }

  // mode === 'potential': Initialize centroids with existing sites, then add k-means for additional sites
  let dcs: DistributionCenter[];
  
  if (numNewSites <= existingSites.length) {
    // If requesting fewer or equal sites than existing, use existing sites
    dcs = existingSites.slice(0, numNewSites).map((site, index) => ({
      id: `existing-${index + 1}`,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      assignedCustomers: [],
      totalDemand: 0,
    }));
  } else {
    // Need more sites than existing: use all existing + k-means for the rest
    const existingDcs: DistributionCenter[] = existingSites.map((site, index) => ({
      id: `existing-${index + 1}`,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      assignedCustomers: [],
      totalDemand: 0,
    }));
    
    // Run k-means for the additional sites needed
    const additionalSitesNeeded = numNewSites - existingSites.length;
    const newDcs = kMeansOptimization(customers, additionalSitesNeeded);
    
    dcs = [
      ...existingDcs,
      ...newDcs.map((dc, idx) => ({ ...dc, id: `new-${idx + 1}` })),
    ];
  }

  // Reassign customers after snapping
  dcs.forEach(dc => {
    dc.assignedCustomers = [];
    dc.totalDemand = 0;
  });

  customers.forEach(customer => {
    let nearestDC = dcs[0];
    let minDistance = Infinity;

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
    nearestDC.totalDemand += customer.demand * customer.conversionFactor;
  });

  return dcs;
}

/**
 * Calculate total cost for a DC configuration
 * Returns: { totalCost, transportationCost, facilityCost }
 */
function calculateConfigurationCost(
  dcs: DistributionCenter[],
  costPerDistancePerUnit: number,
  distanceUnit: 'km' | 'mile',
  costUnit: string,
  products: Product[],
  facilityCostPerSite: number,
  existingSites?: ExistingSite[]
): { totalCost: number; transportationCost: number; facilityCost: number } {
  // Calculate transportation cost
  const transportationCost = calculateTransportationCost(
    dcs,
    costPerDistancePerUnit,
    distanceUnit,
    costUnit,
    products
  );

  // Count how many DCs are at existing site locations (no facility cost for these)
  const existingMatchesCount = dcs.filter(dc => 
    matchExistingSite(dc, existingSites) !== undefined
  ).length;

  // Only NEW sites pay facility opening cost
  const newSitesCount = dcs.length - existingMatchesCount;
  const facilityCost = newSitesCount * facilityCostPerSite;

  // TOTAL COST = Transportation + Facility (only for new sites)
  const totalCost = transportationCost + facilityCost;

  return { totalCost, transportationCost, facilityCost };
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
  products?: Product[],
  existingSites?: ExistingSite[],
  existingSitesMode?: 'potential' | 'always'
): OptimizationResult {
  const warnings: string[] = [];
  let dcs: DistributionCenter[] = [];

  // Calculate total demand to check feasibility
  const totalDemand = customers.reduce(
    (sum, c) => sum + c.demand * c.conversionFactor,
    0
  );
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
      products || [],
      existingSites,
      existingSitesMode
    );
  } else if (mode === 'distance') {
    // Distance-based optimization: find MINIMUM number of sites that meet constraints
    // AND minimize total cost for that number of sites
    const targetDemandPercentage = constraints.demandPercentage || 100;
    const maxSites = customers.length;
    
    // Helper function to check if configuration meets constraints
    const meetsConstraints = (testDcs: DistributionCenter[]): boolean => {
      let violations = 0;
      
      testDcs.forEach(dc => {
        if (dc.totalDemand === 0) return;
        
        // Check distance constraint
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
          violations++;
        }
        
        // Check capacity constraint
        if (hasCapacityConstraint && dc.totalDemand > constraints.dcCapacity) {
          violations++;
        }
      });
      
      return violations === 0;
    };
    
    // Binary search to find minimum number of sites
    let minFeasibleSites = maxSites;
    let foundFeasible = false;
    
    // First, find if solution is feasible with existing sites (if in always mode)
    if (existingSites && existingSites.length > 0 && existingSitesMode === 'always') {
      const existingDcs = buildDCConfiguration(customers, 0, existingSites, 'always');
      if (meetsConstraints(existingDcs)) {
        dcs = existingDcs;
        foundFeasible = true;
        minFeasibleSites = existingSites.length;
      }
    }
    
    // If not feasible with just existing sites, search for minimum sites needed
    if (!foundFeasible) {
      // Linear search from 1 to find minimum feasible
      for (let numSites = 1; numSites <= maxSites; numSites++) {
        let testDcs: DistributionCenter[];
        
        if (existingSites && existingSites.length > 0 && existingSitesMode === 'always') {
          const numNewSites = Math.max(0, numSites - existingSites.length);
          testDcs = buildDCConfiguration(customers, numNewSites, existingSites, 'always');
        } else if (existingSites && existingSites.length > 0 && existingSitesMode === 'potential') {
          // Try both existing and new sites, pick better one
          let bestTestDcs = kMeansOptimization(customers, numSites);
          let bestCost = costParams ? calculateConfigurationCost(
            bestTestDcs,
            costParams.transportationCostPerMilePerUnit,
            costParams.distanceUnit,
            costParams.costUnit,
            products || [],
            costParams.facilityCost,
            undefined
          ).totalCost : calculateTotalDistanceFlow(bestTestDcs);
          
          if (numSites <= existingSites.length) {
            const existingTestDcs = buildDCConfiguration(customers, numSites, existingSites, 'use-existing-subset');
            const existingCost = costParams ? calculateConfigurationCost(
              existingTestDcs,
              costParams.transportationCostPerMilePerUnit,
              costParams.distanceUnit,
              costParams.costUnit,
              products || [],
              costParams.facilityCost,
              existingSites
            ).totalCost : calculateTotalDistanceFlow(existingTestDcs);
            
            if (existingCost < bestCost) {
              bestTestDcs = existingTestDcs;
            }
          }
          testDcs = bestTestDcs;
        } else {
          testDcs = kMeansOptimization(customers, numSites);
        }
        
        if (meetsConstraints(testDcs)) {
          dcs = testDcs;
          minFeasibleSites = numSites;
          foundFeasible = true;
          break;
        }
      }
    }
    
    if (!foundFeasible) {
      warnings.push(
        `Unable to find feasible solution even with ${maxSites} sites. Consider relaxing constraints.`
      );
      dcs = kMeansOptimization(customers, maxSites);
    }
  } else {
    // Sites-based optimization: MINIMIZE total distance-flow (or cost) for specified number of sites
    if (existingSites && existingSites.length > 0 && existingSitesMode === 'always') {
      // Always include existing sites, minimize distance-flow by optimizing new site placement
      const numNewSites = Math.max(0, numDCs - existingSites.length);
      
      // Try multiple k-means runs to find best configuration
      let bestConfig: DistributionCenter[] = [];
      let bestFlow = Infinity;
      const numTrials = 10; // Multiple random initializations
      
      for (let trial = 0; trial < numTrials; trial++) {
        const trialDcs = buildDCConfiguration(customers, numNewSites, existingSites, 'always');
        const flow = costParams && products 
          ? calculateConfigurationCost(
              trialDcs,
              costParams.transportationCostPerMilePerUnit,
              costParams.distanceUnit,
              costParams.costUnit,
              products,
              costParams.facilityCost,
              existingSites
            ).totalCost
          : calculateTotalDistanceFlow(trialDcs);
        
        if (flow < bestFlow) {
          bestFlow = flow;
          bestConfig = trialDcs;
        }
      }
      
      dcs = bestConfig;
    } else if (existingSites && existingSites.length > 0 && existingSitesMode === 'potential') {
      // Potential mode: compare using existing sites vs k-means, pick configuration with minimum flow/cost
      let bestConfig: DistributionCenter[] = [];
      let bestFlow = Infinity;
      
      // Option A: Use k-means (all new sites)
      const kMeansDcs = kMeansOptimization(customers, numDCs);
      const kMeansFlow = costParams && products
        ? calculateConfigurationCost(
            kMeansDcs,
            costParams.transportationCostPerMilePerUnit,
            costParams.distanceUnit,
            costParams.costUnit,
            products,
            costParams.facilityCost,
            undefined
          ).totalCost
        : calculateTotalDistanceFlow(kMeansDcs);
      
      if (kMeansFlow < bestFlow) {
        bestFlow = kMeansFlow;
        bestConfig = kMeansDcs;
      }
      
      // Option B: Use existing sites (if we have enough)
      if (numDCs <= existingSites.length) {
        const existingDcs = buildDCConfiguration(customers, numDCs, existingSites, 'use-existing-subset');
        const existingFlow = costParams && products
          ? calculateConfigurationCost(
              existingDcs,
              costParams.transportationCostPerMilePerUnit,
              costParams.distanceUnit,
              costParams.costUnit,
              products,
              costParams.facilityCost,
              existingSites
            ).totalCost
          : calculateTotalDistanceFlow(existingDcs);
        
        if (existingFlow < bestFlow) {
          bestFlow = existingFlow;
          bestConfig = existingDcs;
        }
      }
      
      dcs = bestConfig;
    } else {
      // Standard optimization without existing sites: minimize distance-flow
      if (hasCapacityConstraint) {
        const maxPossibleCapacity = numDCs * constraints.dcCapacity;
        if (totalDemand > maxPossibleCapacity) {
          warnings.push(
            `INFEASIBLE: Total demand (${totalDemand.toFixed(2)} ${
              constraints.capacityUnit || 'm3'
            }) exceeds maximum capacity with ${numDCs} sites (${maxPossibleCapacity.toFixed(
              2
            )} ${constraints.capacityUnit || 'm3'}). You need at least ${Math.ceil(
              totalDemand / constraints.dcCapacity
            )} sites, or increase capacity to ${(totalDemand / numDCs).toFixed(2)} ${
              constraints.capacityUnit || 'm3'
            } per site.`
          );
        }
      }

      // Run k-means multiple times with different initializations, pick best
      let bestConfig: DistributionCenter[] = [];
      let bestFlow = Infinity;
      const numTrials = 10;
      
      for (let trial = 0; trial < numTrials; trial++) {
        const trialDcs = kMeansOptimization(customers, numDCs);
        const flow = costParams && products
          ? calculateConfigurationCost(
              trialDcs,
              costParams.transportationCostPerMilePerUnit,
              costParams.distanceUnit,
              costParams.costUnit,
              products,
              costParams.facilityCost,
              undefined
            ).totalCost
          : calculateTotalDistanceFlow(trialDcs);
        
        if (flow < bestFlow) {
          bestFlow = flow;
          bestConfig = trialDcs;
        }
      }
      
      dcs = bestConfig;
    }
  }

  // Final check: capacity violations
  let capacityViolations = 0;
  if (hasCapacityConstraint) {
    dcs.forEach(dc => {
      if (dc.totalDemand > constraints.dcCapacity) {
        capacityViolations++;
        const unitLabel = constraints.capacityUnit || 'm3';
        const overage = dc.totalDemand - constraints.dcCapacity;
        warnings.push(
          `Site ${dc.id} exceeds capacity by ${overage.toFixed(2)} ${unitLabel}: ${dc.totalDemand.toFixed(
            2
          )} / ${constraints.dcCapacity} ${unitLabel} (${(
            (dc.totalDemand / constraints.dcCapacity) *
            100
          ).toFixed(1)}% utilization)`
        );
      }
    });
  }

  // Informational distance coverage (sites mode)
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

      const percentageWithinRadius =
        (demandWithinRadius / dc.totalDemand) * 100;

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

  const feasible =
    capacityViolations === 0 &&
    (mode !== 'sites' ||
      totalDemand <= (hasCapacityConstraint ? numDCs * constraints.dcCapacity : Infinity));

  // Calculate cost breakdown for all modes if cost parameters are provided
  let costBreakdown: OptimizationResult['costBreakdown'] = undefined;
  if (costParams && products) {
    const transportationCost = calculateTransportationCost(
      dcs,
      costParams.transportationCostPerMilePerUnit,
      costParams.distanceUnit,
      costParams.costUnit,
      products
    );

    // Count existing sites vs new sites
    const existingMatchesCount = dcs.filter(dc => 
      matchExistingSite(dc, existingSites) !== undefined
    ).length;
    const newSitesCount = dcs.length - existingMatchesCount;
    const facilityCost = newSitesCount * costParams.facilityCost;

    costBreakdown = {
      totalCost: transportationCost + facilityCost,
      transportationCost,
      facilityCost,
      numSites: newSitesCount,
    };
  }

  return {
    dcs,
    feasible,
    warnings,
    costBreakdown,
  };
}
