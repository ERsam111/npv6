import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== OPTIMIZATION ALGORITHMS ====================

class DifferentialEvolution {
  private bounds: [number, number][];
  private popSize: number;
  private maxIter: number;
  private F: number = 0.8;  // Differential weight
  private CR: number = 0.9;  // Crossover probability
  private seed: number;

  constructor(
    bounds: [number, number][],
    popSize: number = 15,
    maxIter: number = 100,
    seed: number = 42
  ) {
    this.bounds = bounds;
    this.popSize = popSize;
    this.maxIter = maxIter;
    this.seed = seed;
  }

  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private initPopulation(): number[][] {
    const pop: number[][] = [];
    for (let i = 0; i < this.popSize; i++) {
      const individual: number[] = [];
      for (const [lower, upper] of this.bounds) {
        individual.push(lower + this.random() * (upper - lower));
      }
      pop.push(individual);
    }
    return pop;
  }

  optimize(objectiveFn: (x: number[]) => number): { x: number[], fun: number, iterations: any[] } {
    let population = this.initPopulation();
    let fitness = population.map(ind => objectiveFn(ind));
    const iterations: any[] = [];

    for (let iter = 0; iter < this.maxIter; iter++) {
      const newPopulation: number[][] = [];
      
      for (let i = 0; i < this.popSize; i++) {
        // Select three random different individuals
        const indices = Array.from({ length: this.popSize }, (_, idx) => idx)
          .filter(idx => idx !== i);
        const shuffled = indices.sort(() => this.random() - 0.5);
        const [a, b, c] = [shuffled[0], shuffled[1], shuffled[2]];
        
        // Mutation: v = a + F * (b - c)
        const mutant: number[] = [];
        for (let j = 0; j < this.bounds.length; j++) {
          let value = population[a][j] + this.F * (population[b][j] - population[c][j]);
          // Ensure bounds
          value = Math.max(this.bounds[j][0], Math.min(this.bounds[j][1], value));
          mutant.push(value);
        }
        
        // Crossover
        const trial: number[] = [];
        const jRand = Math.floor(this.random() * this.bounds.length);
        for (let j = 0; j < this.bounds.length; j++) {
          if (this.random() < this.CR || j === jRand) {
            trial.push(mutant[j]);
          } else {
            trial.push(population[i][j]);
          }
        }
        
        // Selection
        const trialFitness = objectiveFn(trial);
        if (trialFitness < fitness[i]) {
          newPopulation.push(trial);
          fitness[i] = trialFitness;
        } else {
          newPopulation.push(population[i]);
        }
      }
      
      population = newPopulation;
      
      // Track best in this iteration
      const bestIdx = fitness.indexOf(Math.min(...fitness));
      iterations.push({
        iteration: iter + 1,
        best_cost: fitness[bestIdx],
        best_solution: [...population[bestIdx]]
      });
    }

    const bestIdx = fitness.indexOf(Math.min(...fitness));
    return {
      x: population[bestIdx],
      fun: fitness[bestIdx],
      iterations
    };
  }
}

// ==================== STATISTICAL FUNCTIONS ====================

function normalCDF(x: number): number {
  // Approximation of cumulative distribution function for standard normal
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

function normalPPF(p: number): number {
  // Inverse cumulative distribution function (quantile function)
  // Approximation for standard normal distribution
  if (p <= 0 || p >= 1) return 0;
  
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number, x: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  return x;
}

function calculateSafetyStock(
  demandMean: number,
  demandStd: number,
  leadTimeMean: number,
  leadTimeStd: number,
  serviceLevel: number
): number {
  // Z-score for service level
  const z = normalPPF(serviceLevel / 100);
  
  // Proper safety stock formula:
  // SS = z * sqrt(LT * σ_D² + D_mean² * σ_LT²)
  const variance = leadTimeMean * (demandStd ** 2) + (demandMean ** 2) * (leadTimeStd ** 2);
  const safetyStock = z * Math.sqrt(variance);
  
  return Math.max(0, Math.round(safetyStock));
}

// ==================== SIMULATION FUNCTIONS ====================

function generateDemand(model: string, param1: number, param2: number, param3: number, seed: number): number {
  // Simple PRNG
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Box-Muller for normal distribution
  const normalRandom = () => {
    const u1 = random();
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  if (model === "normal") {
    return Math.max(0, Math.round(param1 + normalRandom() * param2));
  } else if (model === "triangular") {
    const u = random();
    const f = (param2 - param1) / (param3 - param1);
    if (u < f) {
      return Math.round(param1 + Math.sqrt(u * (param3 - param1) * (param2 - param1)));
    } else {
      return Math.round(param3 - Math.sqrt((1 - u) * (param3 - param1) * (param3 - param2)));
    }
  } else if (model === "uniform") {
    return Math.round(param1 + random() * (param2 - param1));
  } else if (model === "poisson") {
    let L = Math.exp(-param1);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= random();
    } while (p > L);
    return k - 1;
  }

  return Math.max(0, Math.round(param1 + normalRandom() * param2));
}

function runSimulation(
  s: number,
  S: number,
  config: any,
  demandParams: any,
  leadTimeParams: any,
  seedBase: number,
  replication: number
): any {
  const simulationDays = config.simulation_days;
  let inventory = S;
  let totalCost = 0;
  let stockouts = 0;
  let totalDemand = 0;
  let inventorySum = 0;
  
  // Track sampled values for Monte Carlo output
  const sampledDemands: number[] = [];
  const sampledLeadTimes: number[] = [];
  let orderCount = 0;

  for (let day = 0; day < simulationDays; day++) {
    const seed = seedBase + replication * 10000 + day;
    const demand = generateDemand(
      demandParams.model,
      demandParams.param1,
      demandParams.param2,
      demandParams.param3,
      seed
    );
    sampledDemands.push(demand);
    totalDemand += demand;

    // Check stockout
    if (inventory < demand) {
      stockouts += (demand - inventory);
      inventory = 0;
    } else {
      inventory -= demand;
    }

    // Replenishment (s, S) policy
    if (inventory <= s) {
      const orderQty = S - inventory;
      totalCost += config.ordering_cost || 100;
      
      // Sample lead time for this order
      const leadTime = generateDemand(
        leadTimeParams.model,
        leadTimeParams.param1,
        leadTimeParams.param2,
        leadTimeParams.param3,
        seed + 50000
      );
      sampledLeadTimes.push(Math.max(1, leadTime));
      orderCount++;
      
      inventory = S;
    }

    // Holding cost
    const holdingCost = config.holding_cost || 0.5;
    totalCost += inventory * holdingCost;
    inventorySum += inventory;
  }

  const fillRate = totalDemand > 0 ? ((totalDemand - stockouts) / totalDemand) * 100 : 100;
  const csl = (simulationDays - Math.min(stockouts, simulationDays)) / simulationDays * 100;
  const avgInventory = inventorySum / simulationDays;

  return {
    total_cost: totalCost,
    fill_rate: fillRate,
    csl: csl,
    avg_inventory: avgInventory,
    replication,
    monte_carlo_samples: {
      demands: sampledDemands,
      lead_times: sampledLeadTimes,
      demand_stats: {
        mean: sampledDemands.reduce((a, b) => a + b, 0) / sampledDemands.length,
        min: Math.min(...sampledDemands),
        max: Math.max(...sampledDemands),
        std: Math.sqrt(sampledDemands.reduce((sum, val) => {
          const mean = sampledDemands.reduce((a, b) => a + b, 0) / sampledDemands.length;
          return sum + Math.pow(val - mean, 2);
        }, 0) / sampledDemands.length)
      },
      lead_time_stats: sampledLeadTimes.length > 0 ? {
        mean: sampledLeadTimes.reduce((a, b) => a + b, 0) / sampledLeadTimes.length,
        min: Math.min(...sampledLeadTimes),
        max: Math.max(...sampledLeadTimes),
        std: Math.sqrt(sampledLeadTimes.reduce((sum, val) => {
          const mean = sampledLeadTimes.reduce((a, b) => a + b, 0) / sampledLeadTimes.length;
          return sum + Math.pow(val - mean, 2);
        }, 0) / sampledLeadTimes.length)
      } : null,
      order_count: orderCount
    }
  };
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableData, config } = await req.json();
    
    const simulationConfig = {
      simulation_days: config.simulation_days || 365,
      replications: config.replications || 30,
      random_seed: config.random_seed || 42,
      service_level_target: config.service_level_target || 95,
      optimizer: config.optimizer || "scipy",
      optimization_method: config.optimization_method || "differential_evolution",
      max_iterations: config.max_iterations || 50,
      ordering_cost: config.ordering_cost || 100,
      holding_cost: config.holding_cost || 0.5,
    };

    console.log("Starting optimization with config:", simulationConfig);

    const policies = tableData.policy || [];
    const allResults: any[] = [];
    const allReplications: any[] = [];
    const detailedIterations: any[] = [];

    for (const policy of policies) {
      const locationId = policy.location_id;
      const productId = policy.product_id;

      // Get demand parameters
      const demandInfo = tableData.demand?.find((d: any) => d.product_id === productId);
      const demandParams = {
        model: demandInfo?.demand_model || "normal",
        param1: demandInfo?.param1 || 100,
        param2: demandInfo?.param2 || 20,
        param3: demandInfo?.param3 || 0,
      };

      // Get lead time parameters
      const transportInfo = tableData.transport?.find(
        (t: any) => t.dest_id === locationId && t.product_id === productId
      );
      const leadTimeMean = transportInfo?.lt_param1 || 2;
      const leadTimeStd = transportInfo?.lt_param2 || 0.5;
      const leadTimeParams = {
        model: transportInfo?.lt_model || "normal",
        param1: leadTimeMean,
        param2: leadTimeStd,
        param3: 0
      };

      // Calculate safety stock using proper formula
      const safetyStock = calculateSafetyStock(
        demandParams.param1,
        demandParams.param2,
        leadTimeMean,
        leadTimeStd,
        simulationConfig.service_level_target
      );

      const initialS = policy.initial_s || 200;
      const initialBigS = policy.initial_S || 500;

      // Define objective function
      const objectiveFn = (x: number[]): number => {
        const s = Math.round(x[0]);
        const S = Math.round(x[1]);
        
        if (S <= s) return 1e10; // Invalid policy

        let totalCost = 0;
        for (let rep = 0; rep < simulationConfig.replications; rep++) {
          const result = runSimulation(
            s,
            S,
            simulationConfig,
            demandParams,
            leadTimeParams,
            simulationConfig.random_seed,
            rep
          );
          totalCost += result.total_cost;
        }
        return totalCost / simulationConfig.replications;
      };

      // Run optimization
      const bounds: [number, number][] = [
        [Math.max(1, initialS - 200), initialS + 200],
        [Math.max(100, initialBigS - 300), initialBigS + 300],
      ];

      const optimizer = new DifferentialEvolution(
        bounds,
        15,
        simulationConfig.max_iterations,
        simulationConfig.random_seed
      );

      console.log(`Optimizing policy for ${locationId} - ${productId}`);
      const result = optimizer.optimize(objectiveFn);
      const [bestS, bestBigS] = result.x.map(Math.round);

      console.log(`Best solution: s=${bestS}, S=${bestBigS}, cost=${result.fun}`);

      // Store iteration details with replication-level calculation steps
      result.iterations.forEach((iter: any) => {
        const [iterS, iterS_big] = iter.best_solution.map(Math.round);
        
        // Run full replications and store each one's calculation steps
        const replicationDetails: any[] = [];
        let totalFillRate = 0;
        let totalCSL = 0;
        let totalCost = 0;
        let totalAvgInventory = 0;
        
        for (let rep = 0; rep < simulationConfig.replications; rep++) {
          const simResult = runSimulation(
            iterS,
            iterS_big,
            simulationConfig,
            demandParams,
            leadTimeParams,
            simulationConfig.random_seed,
            rep
          );
          
          totalFillRate += simResult.fill_rate;
          totalCSL += simResult.csl;
          totalCost += simResult.total_cost;
          totalAvgInventory += simResult.avg_inventory;
          
          // Z-score calculation
          const zScore = normalPPF(simulationConfig.service_level_target / 100);
          
          // Safety stock components
          const demandVariance = Math.pow(demandParams.param2, 2);
          const leadTimeVariance = Math.pow(leadTimeParams.param2, 2);
          const component1 = leadTimeParams.param1 * demandVariance;
          const component2 = Math.pow(demandParams.param1, 2) * leadTimeVariance;
          const totalVariance = component1 + component2;
          
          // Reorder point calculation
          const avgDemandDuringLeadTime = demandParams.param1 * leadTimeParams.param1;
          const reorderPoint = avgDemandDuringLeadTime + safetyStock;
          
          // Order quantity
          const orderQuantity = iterS_big - iterS;
          
          // Cost calculations
          const holdingCost = simResult.avg_inventory * simulationConfig.holding_cost;
          const annualDemand = demandParams.param1 * 365;
          const numOrders = orderQuantity > 0 ? annualDemand / orderQuantity : 0;
          const orderingCost = numOrders * simulationConfig.ordering_cost;
          
          replicationDetails.push({
            replication: rep + 1,
            s: iterS,
            S: iterS_big,
            cost: simResult.total_cost,
            csl: simResult.csl,
            fill_rate: simResult.fill_rate,
            avg_inventory: simResult.avg_inventory,
            monte_carlo_samples: simResult.monte_carlo_samples,
            calculationSteps: {
              demandAnalysis: {
                inputParams: {
                  meanDemand: demandParams.param1,
                  demandStdDev: demandParams.param2,
                  demandModel: demandParams.model
                },
                sampledStats: simResult.monte_carlo_samples?.demand_stats || null
              },
              leadTimeAnalysis: {
                inputParams: {
                  avgLeadTime: leadTimeParams.param1,
                  leadTimeStdDev: leadTimeParams.param2,
                  leadTimeModel: leadTimeParams.model
                },
                sampledStats: simResult.monte_carlo_samples?.lead_time_stats || null
              },
              safetyStockCalculation: {
                zScore: zScore,
                targetServiceLevel: simulationConfig.service_level_target / 100,
                formula: 'Safety Stock = z-score × √(avg_lead_time × demand_variance + avg_demand² × lead_time_variance)',
                demandVariance: demandVariance,
                leadTimeVariance: leadTimeVariance,
                component1: component1,
                component2: component2,
                totalVariance: totalVariance,
                result: safetyStock
              },
              reorderPointCalculation: {
                formula: 'Reorder Point = (avg_demand × avg_lead_time) + safety_stock',
                avgDemandDuringLeadTime: avgDemandDuringLeadTime,
                safetyStock: safetyStock,
                result: reorderPoint
              },
              costCalculation: {
                holdingCostCalc: {
                  formula: 'Holding Cost = avg_inventory × holding_cost_rate',
                  avgInventory: simResult.avg_inventory,
                  holdingRate: simulationConfig.holding_cost,
                  result: holdingCost
                },
                orderingCostCalc: {
                  formula: 'Ordering Cost = (annual_demand / order_quantity) × ordering_cost',
                  annualDemand: annualDemand,
                  orderQuantity: orderQuantity,
                  orderingCost: simulationConfig.ordering_cost,
                  numOrders: numOrders,
                  result: orderingCost
                },
                totalCost: simResult.total_cost
              },
              performanceMetrics: {
                achievedServiceLevel: simResult.csl / 100,
                targetServiceLevel: simulationConfig.service_level_target / 100,
                avgInventoryLevel: simResult.avg_inventory,
                fillRate: simResult.fill_rate
              }
            }
          });
        }
        
        const avgCSL = totalCSL / simulationConfig.replications;
        const avgCost = totalCost / simulationConfig.replications;
        
        detailedIterations.push({
          iteration: iter.iteration,
          location_id: locationId,
          product_id: productId,
          s: iterS,
          S: iterS_big,
          safety_stock: safetyStock,
          avg_cost: avgCost,
          avg_fill_rate: totalFillRate / simulationConfig.replications,
          avg_csl: avgCSL,
          replications: replicationDetails
        });
      });

      // Run final replications with best policy
      const finalReps: any[] = [];
      for (let rep = 0; rep < simulationConfig.replications; rep++) {
        const simResult = runSimulation(
          bestS,
          bestBigS,
          simulationConfig,
          demandParams,
          leadTimeParams,
          simulationConfig.random_seed,
          rep
        );
        finalReps.push({
          replication: rep + 1,
          location_id: locationId,
          product_id: productId,
          s: bestS,
          S: bestBigS,
          safety_stock: safetyStock,
          avg_inventory: simResult.avg_inventory,
          total_cost: simResult.total_cost,
          fill_rate: simResult.fill_rate,
          csl: simResult.csl,
          monte_carlo_samples: simResult.monte_carlo_samples
        });
      }

      allReplications.push(...finalReps);

      // Calculate statistics
      const avgInvValues = finalReps.map((r) => r.avg_inventory);
      const calculateStd = (values: number[]) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      };

      allResults.push({
        location_id: locationId,
        product_id: productId,
        safety_stock: safetyStock,
        s_min: bestS,
        s_max: bestS,
        s_mean: bestS,
        s_std: 0,
        S_min: bestBigS,
        S_max: bestBigS,
        S_mean: bestBigS,
        S_std: 0,
        avg_inventory_min: Math.min(...avgInvValues),
        avg_inventory_max: Math.max(...avgInvValues),
        avg_inventory_mean: avgInvValues.reduce((a, b) => a + b, 0) / avgInvValues.length,
        avg_inventory_std: calculateStd(avgInvValues),
      });
    }

    // Calculate KPIs
    const kpis = {
      total_cost: allReplications.reduce((sum, r) => sum + r.total_cost, 0) / allReplications.length,
      avg_fill_rate: allReplications.reduce((sum, r) => sum + r.fill_rate, 0) / allReplications.length,
      avg_csl: allReplications.reduce((sum, r) => sum + r.csl, 0) / allReplications.length,
    };

    return new Response(
      JSON.stringify({
        results: allResults,
        kpis,
        replications: allReplications,
        iterations: detailedIterations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
