import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ==================== LINEAR PROGRAMMING SOLVER ====================
// Simple implementation of Branch and Bound for Mixed Integer Linear Programming

interface Constraint {
  coefficients: number[];
  operator: 'le' | 'ge' | 'eq';
  rhs: number;
}

interface LPProblem {
  objective: number[];
  constraints: Constraint[];
  bounds: [number, number][];
  integerVars: Set<number>;
  maximize: boolean;
}

class SimplexSolver {
  solve(problem: LPProblem): { x: number[], value: number, feasible: boolean } {
    const n = problem.objective.length;
    const m = problem.constraints.length;
    
    // Initialize tableau
    const tableau: number[][] = [];
    
    // Add constraints
    for (let i = 0; i < m; i++) {
      const row: number[] = [...problem.constraints[i].coefficients];
      // Add slack/surplus variables
      for (let j = 0; j < m; j++) {
        row.push(i === j ? (problem.constraints[i].operator === 'le' ? 1 : -1) : 0);
      }
      row.push(problem.constraints[i].rhs);
      tableau.push(row);
    }
    
    // Add objective row
    const objRow = [...problem.objective.map(c => problem.maximize ? -c : c)];
    for (let i = 0; i < m; i++) objRow.push(0);
    objRow.push(0);
    tableau.push(objRow);
    
    // Simplex iterations (simplified)
    let iterations = 0;
    const maxIterations = 100;
    
    while (iterations < maxIterations) {
      // Find entering variable (most negative in objective row)
      const objRowIdx = tableau.length - 1;
      let enteringCol = -1;
      let minVal = 0;
      
      for (let j = 0; j < tableau[0].length - 1; j++) {
        if (tableau[objRowIdx][j] < minVal) {
          minVal = tableau[objRowIdx][j];
          enteringCol = j;
        }
      }
      
      if (enteringCol === -1) break; // Optimal
      
      // Find leaving variable (minimum ratio test)
      let leavingRow = -1;
      let minRatio = Infinity;
      
      for (let i = 0; i < m; i++) {
        if (tableau[i][enteringCol] > 0) {
          const ratio = tableau[i][tableau[i].length - 1] / tableau[i][enteringCol];
          if (ratio >= 0 && ratio < minRatio) {
            minRatio = ratio;
            leavingRow = i;
          }
        }
      }
      
      if (leavingRow === -1) return { x: [], value: 0, feasible: false };
      
      // Pivot
      const pivot = tableau[leavingRow][enteringCol];
      for (let j = 0; j < tableau[leavingRow].length; j++) {
        tableau[leavingRow][j] /= pivot;
      }
      
      for (let i = 0; i < tableau.length; i++) {
        if (i !== leavingRow) {
          const factor = tableau[i][enteringCol];
          for (let j = 0; j < tableau[i].length; j++) {
            tableau[i][j] -= factor * tableau[leavingRow][j];
          }
        }
      }
      
      iterations++;
    }
    
    // Extract solution
    const x = new Array(n).fill(0);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let isBasic = true;
        let basicRow = -1;
        for (let k = 0; k < m; k++) {
          if (k === i && Math.abs(tableau[k][j] - 1) < 1e-6) {
            basicRow = k;
          } else if (Math.abs(tableau[k][j]) > 1e-6) {
            isBasic = false;
            break;
          }
        }
        if (isBasic && basicRow >= 0) {
          x[j] = Math.max(0, tableau[basicRow][tableau[basicRow].length - 1]);
        }
      }
    }
    
    // Apply bounds
    for (let i = 0; i < n; i++) {
      x[i] = Math.max(problem.bounds[i][0], Math.min(problem.bounds[i][1], x[i]));
    }
    
    const value = problem.objective.reduce((sum, c, i) => sum + c * x[i], 0);
    
    return { x, value: problem.maximize ? -value : value, feasible: true };
  }
}

// ==================== NETWORK FLOW OPTIMIZATION ====================

interface NetworkData {
  customers: any[];
  facilities: any[];
  suppliers: any[];
  products: any[];
  paths: any[];
  demand: any[];
  production: any[];
  vehicleTypes: any[];
  periods: any[];
  flowRules: any[];
  inventory: any[];
}

interface OptimizationSettings {
  objective: 'min_cost' | 'min_time' | 'max_service';
  solver: string;
}

function buildNetworkOptimization(data: NetworkData, settings: OptimizationSettings) {
  console.log("Building network optimization model...");
  
  // Create index maps
  const pathMap = new Map<string, any>();
  data.paths.filter(p => p.include !== false).forEach(p => {
    pathMap.set(`${p.from_id}_${p.to_id}`, p);
  });
  
  const demandMap = new Map<string, any>();
  data.demand.forEach(d => {
    demandMap.set(`${d.customer_id}_${d.product_id}_${d.period_id}`, d);
  });
  
  const productionMap = new Map<string, any>();
  data.production.filter(p => p.include !== false).forEach(p => {
    productionMap.set(`${p.site_id}_${p.product_id}_${p.period_id}`, p);
  });
  
  const vehicleMap = new Map<string, any>();
  data.vehicleTypes.forEach(v => {
    vehicleMap.set(v.vehicle_type_id, v);
  });
  
  // Variables: x_{i,j,k,t} for product flow
  const variables: string[] = [];
  const varIndex = new Map<string, number>();
  let idx = 0;
  
  // Create flow variables
  data.paths.filter(p => p.include !== false).forEach(path => {
    data.products.forEach(product => {
      data.periods.forEach(period => {
        const varName = `flow_${path.from_id}_${path.to_id}_${product.product_id}_${period.period_id}`;
        variables.push(varName);
        varIndex.set(varName, idx++);
      });
    });
  });
  
  // Create production variables
  data.facilities.filter(f => f.status === 'Include').forEach(facility => {
    data.products.forEach(product => {
      data.periods.forEach(period => {
        const varName = `prod_${facility.facility_id}_${product.product_id}_${period.period_id}`;
        variables.push(varName);
        varIndex.set(varName, idx++);
      });
    });
  });
  
  // Create vehicle trip variables for FTL paths
  data.paths.filter(p => p.include !== false && p.shipping_policy === 'FTL').forEach(path => {
    data.periods.forEach(period => {
      const varName = `trips_${path.from_id}_${path.to_id}_${path.vehicle_type_id}_${period.period_id}`;
      variables.push(varName);
      varIndex.set(varName, idx++);
    });
  });
  
  console.log(`Created ${variables.length} variables`);
  
  // Objective function coefficients
  const objective = new Array(variables.length).fill(0);
  
  // Cost for product flow
  data.paths.filter(p => p.include !== false).forEach(path => {
    const unitCost = path.transport_pricing === 'ProductBased' || path.transport_pricing === 'FixedPlusProduct'
      ? (path.product_cost_per_unit || 0)
      : (path.distance || 10) * 0.5; // fallback cost per unit
    
    data.products.forEach(product => {
      data.periods.forEach(period => {
        const varName = `flow_${path.from_id}_${path.to_id}_${product.product_id}_${period.period_id}`;
        const vIdx = varIndex.get(varName);
        if (vIdx !== undefined) {
          objective[vIdx] = unitCost;
        }
      });
    });
  });
  
  // Cost for FTL trips
  data.paths.filter(p => p.include !== false && p.shipping_policy === 'FTL').forEach(path => {
    const vehicle = vehicleMap.get(path.vehicle_type_id);
    const tripCost = (path.fixed_cost || 0) + (vehicle?.fixed_cost_per_trip || 0);
    
    data.periods.forEach(period => {
      const varName = `trips_${path.from_id}_${path.to_id}_${path.vehicle_type_id}_${period.period_id}`;
      const vIdx = varIndex.get(varName);
      if (vIdx !== undefined) {
        objective[vIdx] = tripCost;
      }
    });
  });
  
  // Cost for production
  data.facilities.filter(f => f.status === 'Include').forEach(facility => {
    data.products.forEach(product => {
      data.periods.forEach(period => {
        const prodKey = `${facility.facility_id}_${product.product_id}_${period.period_id}`;
        const prodInfo = productionMap.get(prodKey);
        const prodCost = prodInfo?.prod_cost_per_unit || 50;
        
        const varName = `prod_${facility.facility_id}_${product.product_id}_${period.period_id}`;
        const vIdx = varIndex.get(varName);
        if (vIdx !== undefined) {
          objective[vIdx] = prodCost;
        }
      });
    });
  });
  
  // Constraints
  const constraints: Constraint[] = [];
  
  // Flow balance constraints for each node, product, period
  const allNodes = [
    ...data.customers.filter(c => c.include !== false).map(c => ({ id: c.customer_id, type: 'Customer' })),
    ...data.facilities.filter(f => f.status === 'Include').map(f => ({ id: f.facility_id, type: 'Facility' })),
    ...data.suppliers.filter(s => s.include !== false).map(s => ({ id: s.supplier_id, type: 'Supplier' }))
  ];
  
  allNodes.forEach(node => {
    data.products.forEach(product => {
      data.periods.forEach(period => {
        const coefficients = new Array(variables.length).fill(0);
        
        // Inflow: sum of x_{i,node}
        data.paths.filter(p => p.include !== false && p.to_id === node.id).forEach(path => {
          const varName = `flow_${path.from_id}_${path.to_id}_${product.product_id}_${period.period_id}`;
          const vIdx = varIndex.get(varName);
          if (vIdx !== undefined) {
            coefficients[vIdx] = 1;
          }
        });
        
        // Outflow: sum of x_{node,j}
        data.paths.filter(p => p.include !== false && p.from_id === node.id).forEach(path => {
          const varName = `flow_${path.from_id}_${path.to_id}_${product.product_id}_${period.period_id}`;
          const vIdx = varIndex.get(varName);
          if (vIdx !== undefined) {
            coefficients[vIdx] = -1;
          }
        });
        
        // Production (if facility)
        if (node.type === 'Facility') {
          const varName = `prod_${node.id}_${product.product_id}_${period.period_id}`;
          const vIdx = varIndex.get(varName);
          if (vIdx !== undefined) {
            coefficients[vIdx] = -1;
          }
        }
        
        // RHS = -demand (customer) or 0
        const demandKey = `${node.id}_${product.product_id}_${period.period_id}`;
        const demandInfo = demandMap.get(demandKey);
        const demandQty = demandInfo?.demand_qty || 0;
        
        constraints.push({
          coefficients,
          operator: 'eq',
          rhs: -demandQty
        });
      });
    });
  });
  
  // FTL capacity constraints
  data.paths.filter(p => p.include !== false && p.shipping_policy === 'FTL').forEach(path => {
    const vehicle = vehicleMap.get(path.vehicle_type_id);
    const capacity = vehicle?.capacity || 10000;
    
    data.periods.forEach(period => {
      const coefficients = new Array(variables.length).fill(0);
      
      // Sum of product flows
      data.products.forEach(product => {
        const flowVar = `flow_${path.from_id}_${path.to_id}_${product.product_id}_${period.period_id}`;
        const fIdx = varIndex.get(flowVar);
        if (fIdx !== undefined) {
          coefficients[fIdx] = 1;
        }
      });
      
      // - capacity * trips
      const tripVar = `trips_${path.from_id}_${path.to_id}_${path.vehicle_type_id}_${period.period_id}`;
      const tIdx = varIndex.get(tripVar);
      if (tIdx !== undefined) {
        coefficients[tIdx] = -capacity;
      }
      
      constraints.push({
        coefficients,
        operator: 'le',
        rhs: 0
      });
      
      // Min load ratio constraint
      if (path.min_load_ratio && path.min_load_ratio > 0) {
        const minCoeffs = new Array(variables.length).fill(0);
        data.products.forEach(product => {
          const flowVar = `flow_${path.from_id}_${path.to_id}_${product.product_id}_${period.period_id}`;
          const fIdx = varIndex.get(flowVar);
          if (fIdx !== undefined) {
            minCoeffs[fIdx] = 1;
          }
        });
        if (tIdx !== undefined) {
          minCoeffs[tIdx] = -capacity * path.min_load_ratio;
        }
        constraints.push({
          coefficients: minCoeffs,
          operator: 'ge',
          rhs: 0
        });
      }
    });
  });
  
  // Production capacity constraints
  data.production.filter(p => p.include !== false).forEach(prod => {
    const coefficients = new Array(variables.length).fill(0);
    const varName = `prod_${prod.site_id}_${prod.product_id}_${prod.period_id}`;
    const vIdx = varIndex.get(varName);
    
    if (vIdx !== undefined) {
      if (prod.max_throughput) {
        coefficients[vIdx] = 1;
        constraints.push({
          coefficients: [...coefficients],
          operator: 'le',
          rhs: prod.max_throughput
        });
      }
      
      if (prod.min_throughput) {
        coefficients.fill(0);
        coefficients[vIdx] = 1;
        constraints.push({
          coefficients: [...coefficients],
          operator: 'ge',
          rhs: prod.min_throughput
        });
      }
    }
  });
  
  console.log(`Created ${constraints.length} constraints`);
  
  // Variable bounds
  const bounds: [number, number][] = variables.map(() => [0, 100000]);
  const integerVars = new Set<number>();
  
  // Trip variables must be integers
  variables.forEach((varName, idx) => {
    if (varName.startsWith('trips_')) {
      integerVars.add(idx);
    }
  });
  
  return {
    problem: {
      objective,
      constraints,
      bounds,
      integerVars,
      maximize: settings.objective === 'max_service'
    },
    variables,
    varIndex,
    pathMap,
    demandMap,
    productionMap,
    vehicleMap
  };
}

function solveNetworkOptimization(model: any, data: NetworkData) {
  console.log("Solving optimization problem...");
  
  const solver = new SimplexSolver();
  const result = solver.solve(model.problem);
  
  if (!result.feasible) {
    console.log("Problem is infeasible");
    return null;
  }
  
  console.log(`Optimal value: ${result.value.toFixed(2)}`);
  
  // Extract results
  const productFlow: any[] = [];
  const production: any[] = [];
  const vehicleFlow: any[] = [];
  const costSummary: any[] = [];
  
  let totalTransportCost = 0;
  let totalProductionCost = 0;
  let totalTripCost = 0;
  
  model.variables.forEach((varName: string, idx: number) => {
    const value = result.x[idx];
    if (value > 0.01) {
      if (varName.startsWith('flow_')) {
        const [, from, to, product, period] = varName.split('_');
        const pathKey = `${from}_${to}`;
        const path = model.pathMap.get(pathKey);
        const unitCost = path?.product_cost_per_unit || 1;
        const cost = value * unitCost;
        totalTransportCost += cost;
        
        productFlow.push({
          from,
          to,
          product,
          quantity: Math.round(value * 100) / 100,
          unit: 'units',
          period,
          cost: Math.round(cost * 100) / 100
        });
      } else if (varName.startsWith('prod_')) {
        const [, site, product, period] = varName.split('_');
        const prodKey = `${site}_${product}_${period}`;
        const prodInfo = model.productionMap.get(prodKey);
        const unitCost = prodInfo?.prod_cost_per_unit || 50;
        const cost = value * unitCost;
        totalProductionCost += cost;
        
        production.push({
          site,
          product,
          bom: prodInfo?.bom_id || '-',
          quantity: Math.round(value * 100) / 100,
          unit: prodInfo?.uom || 'units',
          cost: Math.round(cost * 100) / 100,
          period
        });
      } else if (varName.startsWith('trips_')) {
        const [, from, to, vehicleType, period] = varName.split('_');
        const vehicle = model.vehicleMap.get(vehicleType);
        const tripCost = vehicle?.fixed_cost_per_trip || 500;
        const cost = Math.round(value) * tripCost;
        totalTripCost += cost;
        
        vehicleFlow.push({
          from,
          to,
          vehicle_type: vehicle?.name || vehicleType,
          trip_count: Math.round(value),
          period,
          cost: Math.round(cost * 100) / 100
        });
      }
    }
  });
  
  const totalCost = totalTransportCost + totalProductionCost + totalTripCost;
  
  costSummary.push(
    { category: 'Total Cost', amount: Math.round(totalCost * 100) / 100 },
    { category: 'Transport Cost (Units)', amount: Math.round(totalTransportCost * 100) / 100 },
    { category: 'Transport Cost (Trips)', amount: Math.round(totalTripCost * 100) / 100 },
    { category: 'Production Cost', amount: Math.round(totalProductionCost * 100) / 100 }
  );
  
  return {
    productFlow,
    production,
    vehicleFlow,
    costSummary,
    optimalValue: result.value,
    status: 'optimal'
  };
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    const { data, settings } = await req.json();
    
    console.log("Received optimization request");
    console.log(`Customers: ${data.customers?.length || 0}`);
    console.log(`Facilities: ${data.facilities?.length || 0}`);
    console.log(`Paths: ${data.paths?.length || 0}`);
    console.log(`Demand entries: ${data.demand?.length || 0}`);
    
    // Build optimization model
    const model = buildNetworkOptimization(data, settings);
    
    // Solve
    const results = solveNetworkOptimization(model, data);
    
    if (!results) {
      return new Response(
        JSON.stringify({ 
          error: 'Optimization problem is infeasible. Check constraints and capacity.',
          productFlow: [],
          production: [],
          vehicleFlow: [],
          costSummary: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Solution found: ${results.productFlow.length} flows, ${results.production.length} productions, ${results.vehicleFlow.length} vehicle trips`);
    
    return new Response(
      JSON.stringify(results),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error in optimize-network function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
