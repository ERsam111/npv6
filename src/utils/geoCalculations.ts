// src/utils/geoCalculations.ts
// Drop-in replacement: adds "open facility" cost and chooses the fewest sites that minimize total cost
// Also exports haversineDistance for exportReport.ts compatibility

import type { Customer, DistributionCenter, OptimizationSettings, Product } from "@/types/gfa";

type DistanceUnit = "km" | "mile" | "mi";
type CostParams = {
  transportationCostPerMilePerUnit: number; // cost per distance-unit per demand unit
  facilityCost: number; // fixed opening cost per DC
  distanceUnit: DistanceUnit; // "km" or "mile"
  costUnit: string; // passthrough (e.g., "m3")
};

type Constraints = {
  maxRadius: number; // in distanceUnit
  demandPercentage: number; // 0..100
  dcCapacity: number; // 0 => unlimited
  capacityUnit: string;
};

type OptimizeResult = {
  dcs: DistributionCenter[];
  feasible: boolean;
  warnings: string[];
  costBreakdown?: {
    totalCost: number;
    transportationCost: number;
    facilityCost: number;
    numSites: number;
  };
};

const toRad = (v: number) => (v * Math.PI) / 180;

// ---- Distance helpers ----

// Haversine distance in **kilometers**
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function convertKmToUnit(km: number, unit: DistanceUnit): number {
  if (unit === "km") return km;
  if (unit === "mile" || unit === "mi") return km * 0.621371;
  return km;
}

/**
 * Named export kept for backward compatibility with exportReport.ts.
 * Returns the great-circle distance between two points in the requested unit.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: DistanceUnit = "km",
): number {
  const km = haversineKm(lat1, lon1, lat2, lon2);
  return convertKmToUnit(km, unit);
}

function distanceInUnit(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
  unit: DistanceUnit,
): number {
  const km = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  return convertKmToUnit(km, unit);
}

// Extract "demand" for a customer; if none present, default to 1
function getCustomerDemand(c: Customer): number {
  const v = (c as any).demand ?? (c as any).demandQty ?? (c as any).volume ?? (c as any).qty ?? 1;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

// Choose candidate DC locations (defaults to unique customer coords)
function buildCandidates(
  customers: Customer[],
): Array<{ id: string; latitude: number; longitude: number; name: string }> {
  const uniq = new Map<string, { id: string; latitude: number; longitude: number; name: string }>();
  customers.forEach((c) => {
    const lat = Number((c as any).latitude);
    const lng = Number((c as any).longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const key = `${lat},${lng}`;
    if (!uniq.has(key)) {
      const name = (c as any).city || (c as any).name || `Site ${uniq.size + 1}`;
      uniq.set(key, { id: `CAND_${uniq.size + 1}`, latitude: lat, longitude: lng, name });
    }
  });
  return Array.from(uniq.values());
}

function formatDC(id: string, lat: number, lng: number, name?: string): DistributionCenter {
  return {
    id,
    name: name ?? id,
    latitude: lat,
    longitude: lng,
  } as unknown as DistributionCenter;
}

// Compute assignment given a set of open sites
function assignCustomersToOpenSites(
  customers: Customer[],
  openSites: Array<{ id: string; latitude: number; longitude: number; name: string }>,
  unit: DistanceUnit,
  maxRadius: number,
  demandPct: number,
  dcCapacity: number,
) {
  const capacityRem: Record<string, number> = {};
  if (dcCapacity > 0) {
    for (const s of openSites) capacityRem[s.id] = dcCapacity;
  }

  type Assign = { siteId: string | null; dist: number; served: number; unmet: number };
  const assign: Record<string, Assign> = {};
  let totalUnmet = 0;

  for (const c of customers) {
    const demand = getCustomerDemand(c);
    const mustServe = (demandPct / 100) * demand;

    // Find nearest open site within radius
    let best: { id: string; dist: number } | null = null;
    for (const s of openSites) {
      const d = distanceInUnit(
        { latitude: Number((c as any).latitude), longitude: Number((c as any).longitude) },
        { latitude: s.latitude, longitude: s.longitude },
        unit,
      );
      if (d <= maxRadius) {
        if (!best || d < best.dist) best = { id: s.id, dist: d };
      }
    }

    const key = (c as any).id ?? JSON.stringify(c);

    if (!best) {
      // No site within radius → all "mustServe" is unmet
      assign[key] = {
        siteId: null,
        dist: Infinity,
        served: 0,
        unmet: mustServe,
      };
      totalUnmet += mustServe;
      continue;
    }

    // Capacity check
    let served = mustServe;
    if (dcCapacity > 0) {
      served = Math.min(served, Math.max(0, capacityRem[best.id] ?? 0));
      capacityRem[best.id] = Math.max(0, (capacityRem[best.id] ?? 0) - served);
    }

    const unmet = Math.max(0, mustServe - served);
    totalUnmet += unmet;

    assign[key] = {
      siteId: best.id,
      dist: best.dist,
      served,
      unmet,
    };
  }

  const feasible = totalUnmet < 1e-6; // treat tiny numeric residue as feasible
  return { assignment: assign, feasible, totalUnmet };
}

// Cost function for a given open set
function evaluateCost(
  customers: Customer[],
  openSites: Array<{ id: string; latitude: number; longitude: number; name: string }>,
  unit: DistanceUnit,
  maxRadius: number,
  demandPct: number,
  dcCapacity: number,
  costParams: CostParams,
) {
  const { assignment, feasible } = assignCustomersToOpenSites(
    customers,
    openSites,
    unit,
    maxRadius,
    demandPct,
    dcCapacity,
  );

  // Transportation cost = sum(dist * served * rate)
  let transportationCost = 0;
  for (const c of customers) {
    const key = (c as any).id ?? JSON.stringify(c);
    const a = (assignment as any)[key] as { siteId: string | null; dist: number; served: number };
    if (!a || !isFinite(a.dist) || a.served <= 0) continue;
    const rate = costParams.transportationCostPerMilePerUnit;
    transportationCost += a.dist * a.served * rate;
  }

  // Facility cost = facilityCost * number of open sites
  const facilityCost = costParams.facilityCost * openSites.length;

  // Tiny epsilon to prefer fewer sites even when costs tie
  const epsilonPerSite = 1e-6;
  const tieBreaker = epsilonPerSite * openSites.length;

  const totalCost = transportationCost + facilityCost + tieBreaker;

  return {
    feasible,
    totalCost,
    transportationCost,
    facilityCost,
  };
}

// Greedy + local improvement for facility location (with optional capacity)
export function optimizeWithConstraints(
  customers: Customer[],
  numDCs: number,
  constraints: Constraints,
  mode: OptimizationSettings["mode"], // "sites" | "cost"
  costParams?: CostParams,
  _products?: Product[],
): OptimizeResult {
  const warnings: string[] = [];

  if (!customers || customers.length === 0) {
    return { dcs: [], feasible: false, warnings: ["No customers provided."] };
  }

  const unit: DistanceUnit = (constraints as any)?.distanceUnit ?? costParams?.distanceUnit ?? "km";
  const maxRadius = constraints.maxRadius ?? 50;
  const demandPct = constraints.demandPercentage ?? 100;
  const dcCapacity = constraints.dcCapacity ?? 0; // 0 means unlimited

  const candidates = buildCandidates(customers);
  if (candidates.length === 0) {
    return { dcs: [], feasible: false, warnings: ["No candidate sites available."] };
  }

  const isCostMode = mode === "cost";
  const maxSites = isCostMode ? Math.min(candidates.length, 200) : Math.min(numDCs || 1, candidates.length);

  const used = new Set<string>();
  const open: Array<{ id: string; latitude: number; longitude: number; name: string }> = [];

  // Helper to compute current cost
  const evalCurrent = () =>
    evaluateCost(customers, open, unit, maxRadius, demandPct, dcCapacity, {
      transportationCostPerMilePerUnit: costParams?.transportationCostPerMilePerUnit ?? 0,
      facilityCost: costParams?.facilityCost ?? 0,
      distanceUnit: unit,
      costUnit: costParams?.costUnit ?? "",
    });

  // 1) Greedy add
  while (open.length < maxSites) {
    let bestCand: any = null;
    let bestCost = Infinity;

    for (const cand of candidates) {
      if (used.has(cand.id)) continue;
      open.push(cand);
      const { totalCost, feasible } = evalCurrent();
      open.pop();

      const score = feasible ? totalCost : Infinity;
      if (score < bestCost) {
        bestCost = score;
        bestCand = cand;
      }
    }

    if (!bestCand) break;

    open.push(bestCand);
    used.add(bestCand.id);

    if (isCostMode) {
      if (open.length === 1) continue;
      const prev = open.slice(0, -1);
      const prevCost = evaluateCost(customers, prev, unit, maxRadius, demandPct, dcCapacity, {
        transportationCostPerMilePerUnit: costParams!.transportationCostPerMilePerUnit,
        facilityCost: costParams!.facilityCost,
        distanceUnit: unit,
        costUnit: costParams!.costUnit,
      }).totalCost;

      const nowCost = evaluateCost(customers, open, unit, maxRadius, demandPct, dcCapacity, {
        transportationCostPerMilePerUnit: costParams!.transportationCostPerMilePerUnit,
        facilityCost: costParams!.facilityCost,
        distanceUnit: unit,
        costUnit: costParams!.costUnit,
      }).totalCost;

      if (nowCost > prevCost - 1e-9) {
        open.pop();
        used.delete(bestCand.id);
        break;
      }
    } else {
      if (open.length >= (numDCs || 1)) break;
    }
  }

  // 2) Local improvement: deletions (cost mode) and swaps (both)
  if (isCostMode) {
    let improved = true;
    while (improved && open.length > 1) {
      improved = false;
      const base = evalCurrent().totalCost;
      for (let i = 0; i < open.length; i++) {
        const removed = open[i];
        const trial = [...open.slice(0, i), ...open.slice(i + 1)];
        const { totalCost, feasible } = evaluateCost(customers, trial, unit, maxRadius, demandPct, dcCapacity, {
          transportationCostPerMilePerUnit: costParams!.transportationCostPerMilePerUnit,
          facilityCost: costParams!.facilityCost,
          distanceUnit: unit,
          costUnit: costParams!.costUnit,
        });
        if (feasible && totalCost < base - 1e-9) {
          used.delete(removed.id);
          open.splice(i, 1);
          improved = true;
          break;
        }
      }
    }
  }

  {
    let improved = true;
    while (improved) {
      improved = false;
      const base = evalCurrent().totalCost;
      for (let i = 0; i < open.length; i++) {
        const removed = open[i];
        for (const cand of candidates) {
          if (used.has(cand.id)) continue;
          const trial = [...open.slice(0, i), cand, ...open.slice(i + 1)];
          const { totalCost, feasible } = evaluateCost(customers, trial, unit, maxRadius, demandPct, dcCapacity, {
            transportationCostPerMilePerUnit: costParams?.transportationCostPerMilePerUnit ?? 0,
            facilityCost: costParams?.facilityCost ?? 0,
            distanceUnit: unit,
            costUnit: costParams?.costUnit ?? "",
          });
          if (feasible && totalCost < base - 1e-9) {
            used.delete(removed.id);
            used.add(cand.id);
            open[i] = cand;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
  }

  const finalEval = evaluateCost(customers, open, unit, maxRadius, demandPct, dcCapacity, {
    transportationCostPerMilePerUnit: costParams?.transportationCostPerMilePerUnit ?? 0,
    facilityCost: costParams?.facilityCost ?? 0,
    distanceUnit: unit,
    costUnit: costParams?.costUnit ?? "",
  });

  const dcs: DistributionCenter[] = open.map((s, i) => formatDC(`DC_${i + 1}`, s.latitude, s.longitude, s.name));

  const warnings: string[] = [];
  if (!finalEval.feasible) {
    warnings.push(
      "Infeasible with current constraints. Increase max radius and/or DC capacity, or reduce demand percentage.",
    );
  }

  return {
    dcs,
    feasible: finalEval.feasible,
    warnings,
    costBreakdown: {
      totalCost: Math.round(finalEval.totalCost * 1000) / 1000,
      transportationCost: Math.round(finalEval.transportationCost * 1000) / 1000,
      facilityCost: Math.round(finalEval.facilityCost * 1000) / 1000,
      numSites: dcs.length,
    },
  };
}
