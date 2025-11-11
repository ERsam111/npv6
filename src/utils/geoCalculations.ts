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
 */
function matchExistingSite(
  dc: DistributionCenter,
  existingSites?: ExistingSite[],
  thresholdKm: number = 1 // conservative tolerance
): ExistingSite | undefined {
  if (!existingSites || existingSites.length === 0) return undefined;
  for (const s of existingSites) {
    const d = haversineDistance(
      dc.latitude,
      dc.longitude,
      Number(s.latitude),
      Number(s.longitude)
    );
    if (d <= thresholdKm) return s;
  }
  return undefined;
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
 * Opening cost is charged ONLY for truly new (non-existing, not already-open) sites.
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

  // When 'always', all existingSites are included
  const numExistingSitesForced =
    existingSites && existingSitesMode === 'always' ? existingSites.length : 0;

  // Try different numbers of *new* sites; cap for perf
  const maxSites = Math.min(100, customers.length);
  const startingNewSites = numExistingSitesForced > 0 ? 0 : 1;

  for (let numNewSites = startingNewSites; numNewSites <= maxSites; numNewSites++) {
    const totalSites = numNewSites + numExistingSitesForced;
    if (totalSites === 0) continue;

    let dcs: DistributionCenter[];

    if (numExistingSitesForced > 0 && numNewSites === 0) {
      // Only use existing (forced) sites
      dcs = existingSites!.map((site, index) => ({
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
    } else if (numExistingSitesForced > 0 && numNewSites > 0) {
      // Combine existing (forced) and new sites
      const newDcs = kMeansOptimization(customers, numNewSites);

      const existingDcs: DistributionCenter[] = existingSites!.map((site, index) => ({
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

      // Reassign all customers to nearest DC
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

      dcs = allDcs;
    } else {
      // Only new sites
      dcs = kMeansOptimization(customers, numNewSites);

      // In 'potential' mode, snap cluster centers to nearby existing sites (50 km)
      if (existingSites && existingSites.length > 0 && existingSitesMode === 'potential') {
        dcs = dcs.map(dc => {
          let closest: ExistingSite | undefined;
          let minDist = 50; // km
          for (const site of existingSites) {
            const dist = haversineDistance(
              dc.latitude,
              dc.longitude,
              Number(site.latitude),
              Number(site.longitude)
            );
            if (dist < minDist) {
              minDist = dist;
              closest = site;
            }
          }
          return closest
            ? { ...dc, latitude: Number(closest.latitude), longitude: Number(closest.longitude) }
            : dc;
        });
      }

      // Reassign customers after potential snapping
      dcs.forEach(dc => { dc.assignedCustomers = []; dc.totalDemand = 0; });
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
    }

    // --- COSTS ---
    const transportationCost = calculateTransportationCost(
      dcs,
      transportationCostPerDistancePerUnit,
      distanceUnit,
      costUnit,
      products
    );

    // Count DCs that correspond to existing sites.
    // In 'always' mode, treat all existing sites as already open (no facility cost)
    // In 'potential' mode, existing sites compete with new sites (no facility cost for matched existing)
    const existingMatchesCount = dcs.filter(dc => {
      return matchExistingSite(dc, existingSites) !== undefined;
    }).length;

    // New (greenfield) sites are those not matched to an already-open site
    const newSitesCount = Math.max(0, dcs.length - existingMatchesCount);

    const facilityOpeningCost = newSitesCount * facilityCost;
    const totalCost = transportationCost + facilityOpeningCost;

    if (totalCost < bestTotalCost) {
      bestTotalCost = totalCost;
      bestDcs = dcs;
      bestTransportationCost = transportationCost;
      bestNumSites = dcs.length;
      bestFacilityCost = facilityOpeningCost;
    }
  }

  return {
    dcs: bestDcs,
    feasible: true,
    warnings,
    costBreakdown: {
      totalCost: bestTotalCost,
      transportationCost: bestTransportationCost,
      facilityCost: bestFacilityCost, // ONLY new sites pay opening cost
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
    // Distance-based optimization: add sites until ALL constraints are met
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

        const percentageWithinRadius =
          (demandWithinRadius / dc.totalDemand) * 100;

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
    if (existingSites && existingSites.length > 0 && existingSitesMode === 'always') {
      // Always include existing sites
      const numExistingSites = existingSites.length;
      const numNewSites = Math.max(0, numDCs - numExistingSites);

      if (numNewSites === 0) {
        // Only use existing sites
        dcs = existingSites.map((site, index) => ({
          id: `existing-${index + 1}`,
          latitude: Number(site.latitude),
          longitude: Number(site.longitude),
          assignedCustomers: [],
          totalDemand: 0,
        }));

        // Assign customers
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
      } else {
        // Some new sites + existing
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

        // Reassign
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

        dcs = allDcs;
      }
    } else if (existingSites && existingSites.length > 0 && existingSitesMode === 'potential') {
      // Treat existing sites as potential: run k-means then snap if close
      const tempDcs = kMeansOptimization(customers, numDCs);

      dcs = tempDcs.map(dc => {
        let closest: ExistingSite | undefined;
        let minDist = 50; // 50 km threshold
        for (const site of existingSites) {
          const dist = haversineDistance(
            dc.latitude,
            dc.longitude,
            Number(site.latitude),
            Number(site.longitude)
          );
          if (dist < minDist) {
            minDist = dist;
            closest = site;
          }
        }
        return closest
          ? {
              ...dc,
              latitude: Number(closest.latitude),
              longitude: Number(closest.longitude),
            }
          : dc;
      });

      // Reassign customers post-snap
      dcs.forEach(dc => { dc.assignedCustomers = []; dc.totalDemand = 0; });
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
    } else {
      // Standard optimization without existing sites
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

      dcs = kMeansOptimization(customers, numDCs);
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

  return {
    dcs,
    feasible,
    warnings,
  };
}
