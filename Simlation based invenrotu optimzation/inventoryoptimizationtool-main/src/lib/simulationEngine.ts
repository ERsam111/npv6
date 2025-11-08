// simulationEngine.ts
// Simulation Engine - Inventory Optimization Model (v3, backward-compatible)
// - Keeps original runSimulation signature (returns scenario array)
// - Adds ELT (order-based) service level stats to SimulationResult
// - Adds runSimulationWithLogs that also returns a Customer Order Log

// ================== Types ==================
export interface SimulationInput {
  customerData: any[];
  facilityData: any[];
  productData: any[];
  customerFulfillmentData: any[];
  replenishmentData: any[];
  productionData: any[];
  inventoryPolicyData: any[];
  warehousingData: any[];
  orderFulfillmentData: any[];
  transportationData: any[];
  customerOrderData: any[];
  inputFactorsData: any[];
  bomData: any[];
}

export interface CostBreakdown {
  transportation: number;
  production: number;
  handling: number;
  inventory: number;
  replenishment: number; // Unified: ordering cost = replenishment cost
}

export interface TransportationDetails {
  fixedCostPerOrder: number;
  transportUnitCost: number;
  replenishmentUnitCost: number;
  totalOrders: number;
  totalUnits: number;
  distributionType: string; // Distribution used for transport time
  distributionParams: string; // Parameters for the distribution
}

export interface ProductionDetails {
  unitCost: number;
  totalUnits: number;
}

export interface HandlingDetails {
  inboundCost: number;
  outboundCost: number;
  inboundUnits: number;
  outboundUnits: number;
}

export interface FacilityInventoryDetails {
  facilityName: string;
  productName: string;
  holdingCostPerUnit: number;
  avgInventory: number;
  totalHoldingCost: number;
}

export interface InventoryDetails {
  holdingCostPerUnit: number; // Overall (for backward compatibility)
  avgInventory: number;       // Overall (for backward compatibility)
  days: number;
  byFacility?: FacilityInventoryDetails[]; // Per-facility breakdown
}

export interface SimulationResult {
  srNo: number;
  scenarioDescription: string;
  costMin: number;
  costMax: number;
  costMean: number;
  costSD: number;
  serviceLevelMin: number;
  serviceLevelMax: number;
  serviceLevelMean: number;
  serviceLevelSD: number;
  // NEW: order-based ELT service level stats (probability an order is delivered within SLA days)
  eltServiceLevelMin: number;
  eltServiceLevelMax: number;
  eltServiceLevelMean: number;
  eltServiceLevelSD: number;
  // Cost breakdown
  costBreakdown?: CostBreakdown;
  // Transportation details
  transportationDetails?: TransportationDetails;
  // Production details
  productionDetails?: ProductionDetails;
  // Handling details
  handlingDetails?: HandlingDetails;
  // Inventory details
  inventoryDetails?: InventoryDetails;
}

export interface OrderLog {
  orderId: number;
  customerName: string;
  productName: string;
  quantity: number;
  orderDate: string;            // e.g. "Day 42"
  deliveryDate: string | null;  // e.g. "Day 47" or null if not delivered
  waitTime: number;             // days between order and delivery
  onTime: boolean;              // delivered within service window (days)?
  scenario?: string;            // optional tag like "DC1-ProductA"
  scenarioDescription?: string; // Full scenario description with parameters
  replication?: number;         // replication number
}

export interface InventorySnapshot {
  day: number;
  inventory: number;
  facility: string;
  product: string;
  scenario: string;
  scenarioDescription: string;
  replication: number;
}

export interface ProductionLog {
  day: number;
  facility: string;
  product: string;
  quantityProduced: number; // Quantity completed on this day (0 if idle)
  status: 'active' | 'idle'; // Production line status
  currentInventory: number; // Current inventory at factory
  rawMaterial?: string; // Raw material used (deprecated - use rawMaterialsUsed)
  rawMaterialConsumed?: number; // Amount of raw material consumed (deprecated)
  rawMaterialInventory?: number; // Raw material inventory after consumption (deprecated)
  rawMaterialsUsed?: string; // All raw materials consumed in format: "Material1(qty), Material2(qty)"
  rawMaterialInventories?: string; // All raw material inventories in format: "Material1:qty, Material2:qty"
  scenario: string;
  scenarioDescription: string;
  replication: number;
}

export interface ProductFlowLog {
  source: string;
  destination: string;
  product: string;
  quantity: number;
  date: string; // e.g., "Day 42"
  scenario: string;
  scenarioDescription: string;
  replication: number;
}

export interface TripLog {
  from: string;
  to: string;
  vehicleType: string;
  trips: number;
  totalQuantity: number;
  scenario: string;
  scenarioDescription: string;
  replication: number;
}

// ================== RNG helpers ==================
function generateDemand(distributionStr: string): number {
  // Accepts forms like "Uniform(100,200)", "Normal(150,25)", "Constant(7)".
  // If string is numeric, return number; otherwise default 100.
  const numeric = Number(distributionStr);
  if (!isNaN(numeric)) return numeric;

  const match = distributionStr?.match?.(/(\w+)\(([\d\s,\.]+)\)/);
  if (!match) return 100;

  const [, distribution, paramsStr] = match;
  const params = paramsStr.split(",").map((p) => parseFloat(p.trim()));

  switch ((distribution || "").toLowerCase()) {
    case "uniform": {
      const [min, max] = params;
      return Math.random() * (max - min) + min;
    }
    case "normal": {
      const [mean, std] = params;
      return normalRandom(mean, std);
    }
    case "exponential": {
      const [lambda] = params;
      return -Math.log(1 - Math.random()) / lambda;
    }
    case "poisson": {
      return poissonRandom(params[0]);
    }
    case "constant": {
      return params[0];
    }
    default:
      return 100;
  }
}

function normalRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * std + mean;
}

function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// ================== One replication ==================
function runReplication(
  input: SimulationInput,
  scenario: any,
  repNumber?: number,
  collectInventory?: boolean,
  scenarioDescription?: string
): { 
  cost: number; 
  serviceLevel: number; 
  eltServiceLevel: number; 
  orderLog: OrderLog[];
  costBreakdown: CostBreakdown;
  transportationDetails: TransportationDetails;
  productionDetails: ProductionDetails;
  handlingDetails: HandlingDetails;
  inventoryDetails: InventoryDetails;
  inventorySnapshots: InventorySnapshot[];
  productionLog: ProductionLog[];
  productFlowLog: ProductFlowLog[];
  tripLog: TripLog[];
} {
  const simulationDays = 365;
  const scDesc = scenarioDescription || `${scenario.facilityName} | ${scenario.productName} | s=${scenario.s} | S=${scenario.S}`;

  // ---- Cost lookups (per facility+product) ----
  const warehousing = input.warehousingData.find(
    (w: any) => w["Facility Name"] === scenario.facilityName && w["Product Name"] === scenario.productName
  );
  const production = input.productionData.find(
    (p: any) => p["Facility Name"]?.startsWith("S") && p["Product Name"] === scenario.productName
  );
  const replenishment = input.replenishmentData.find(
    (r: any) => r["Facility Name"] === scenario.facilityName && r["Product Name"] === scenario.productName
  );
  const transportation = input.transportationData.find(
    (t: any) => t["Destination Name"] === scenario.facilityName && t["Product Name"] === scenario.productName
  );

  // Cost parameters from tables
  const holdingCostPerUnit = parseFloat(warehousing?.["Stocking Unit Cost"] || "0.3");
  const productionCost = parseFloat(production?.["Unit Cost"] || "10");
  const inboundHandling = parseFloat(warehousing?.["Inbound Handling Cost"] || "1");
  const outboundHandling = parseFloat(warehousing?.["Outbound Handling Cost"] || "1.5");
  
  // Production rate parameters
  const productionRate = parseFloat(production?.["Production Rate"] || "50"); // units per time
  const productionRateTimeUOM = production?.["Rate Time UOM"] || "HR"; // HR or DAY
  
  // Convert production rate to units per day
  const productionRatePerDay = productionRateTimeUOM === "HR" 
    ? productionRate * 24 
    : productionRate;
  
  // Transportation costs - Unit Cost per product + Fixed Cost per shipment
  const transportUnitCost = parseFloat(transportation?.["Unit Cost"] || "0.5");
  const transportFixedCost = parseFloat(transportation?.["Fixed Cost"] || "200");
  
  // Replenishment unit cost (additional cost per unit from replenishment table)
  const replenishmentUnitCost = parseFloat(replenishment?.["Unit Cost"] || "0");
  
  // Lead time from transportation table (using Transport Time Distribution)
  const transportTimeDistribution = transportation?.["Transport Time Distribution"] || "Constant(2)";
  const transportTimeUOM = transportation?.["Transport Time Distribution UOM"] || "DAY";
  
  // Helper function to convert time to days based on UOM
  const convertToDays = (time: number, uom: string): number => {
    switch (uom.toUpperCase()) {
      case "MIN":
        return time / (60 * 24); // minutes to days
      case "HR":
        return time / 24; // hours to days
      case "DAY":
      default:
        return time; // already in days
    }
  };

  // ---- Multi-facility inventory tracking ----
  // Track inventory for each facility-product combination from scenario.allFactors
  const facilityInventory: Record<string, { inventory: number; s: number; S: number; facilityName: string; productName: string }> = {};
  
  if (scenario.allFactors && scenario.allFactors.length > 0) {
    // Initialize inventory for each facility-product in the scenario
    for (const factor of scenario.allFactors) {
      const key = `${factor.facilityName}|${factor.productName}`;
      
      // Get inventory policy to check for initial inventory value
      const invPolicy = input.inventoryPolicyData.find(
        (ip: any) => ip["Facility Name"] === factor.facilityName && ip["Product Name"] === factor.productName
      );
      
      const initialInventory = invPolicy?.["Initial Inventory"] !== undefined 
        ? parseFloat(invPolicy["Initial Inventory"]) 
        : factor.S; // Fallback to S if no initial inventory specified
      
      facilityInventory[key] = {
        inventory: initialInventory,
        s: factor.s,
        S: factor.S,
        facilityName: factor.facilityName,
        productName: factor.productName
      };
    }
  } else {
    // Fallback for backward compatibility (single facility)
    const key = `${scenario.facilityName}|${scenario.productName}`;
    
    // Get inventory policy to check for initial inventory value
    const invPolicy = input.inventoryPolicyData.find(
      (ip: any) => ip["Facility Name"] === scenario.facilityName && ip["Product Name"] === scenario.productName
    );
    
    const initialInventory = invPolicy?.["Initial Inventory"] !== undefined 
      ? parseFloat(invPolicy["Initial Inventory"]) 
      : scenario.S; // Fallback to S if no initial inventory specified
    
    facilityInventory[key] = {
      inventory: initialInventory,
      s: scenario.s,
      S: scenario.S,
      facilityName: scenario.facilityName,
      productName: scenario.productName
    };
  }
  
  // Add all inventory policies to facility inventory (including raw materials at factories)
  for (const invPolicy of input.inventoryPolicyData) {
    const facName = invPolicy["Facility Name"];
    const prodName = invPolicy["Product Name"];
    const key = `${facName}|${prodName}`;
    
    if (!facilityInventory[key]) {
      const S_value = parseFloat(invPolicy["Simulation Policy Value 2"] || "10");
      const initialInventory = invPolicy["Initial Inventory"] !== undefined 
        ? parseFloat(invPolicy["Initial Inventory"]) 
        : S_value; // Fallback to S if no initial inventory specified
      
      facilityInventory[key] = {
        inventory: initialInventory,
        s: parseFloat(invPolicy["Simulation Policy Value 1"] || "0"),
        S: S_value,
        facilityName: facName,
        productName: prodName
      };
    }
  }
  
  // For backward compatibility, main inventory tracks the DC
  const s = scenario.s; // reorder point
  const S = scenario.S; // order-up-to level
  
  // Get initial inventory from inventory policy for main scenario
  const mainInvPolicy = input.inventoryPolicyData.find(
    (ip: any) => ip["Facility Name"] === scenario.facilityName && ip["Product Name"] === scenario.productName
  );
  const mainInitialInventory = mainInvPolicy?.["Initial Inventory"] !== undefined 
    ? parseFloat(mainInvPolicy["Initial Inventory"]) 
    : S; // Fallback to S if no initial inventory specified
  
  let inventory = mainInitialInventory;    // start with initial inventory

  // ---- Demand / SLA profile (using first order profile row, as before) ----
  const customerOrder = input.customerOrderData?.[0] ?? {};
  const demandDistribution = customerOrder["Quantity"] || "Uniform(100,200)";
  const orderIntervalDistribution = customerOrder["Time Between Orders"] || "Constant(7)"; // Distribution for time between orders
  const serviceWindow = parseInt(customerOrder["Service Level"] || "14");      // SLA in days
  const customerName = customerOrder["Customer Name"] || "Customer";
  const productName = customerOrder["Product Name"] || scenario.productName;

  // ---- KPI accumulators ----
  let totalCost = 0;
  let totalDemand = 0;     // units requested
  let totalFulfilled = 0;  // units shipped

  let totalOrders = 0;     // orders placed
  let onTimeOrders = 0;    // orders delivered within SLA

  // ---- Cost breakdown accumulators ----
  let transportationCost = 0;
  let productionCostTotal = 0;
  let handlingCostTotal = 0;
  let inventoryCostTotal = 0;
  let replenishmentCostTotal = 0; // Unified: ordering cost = replenishment cost

  // ---- Order queues/log ----
  let orderCounter = 1;
  let pendingOrders: { id: number; qty: number; age: number; placed: number }[] = [];
  const orderLog: OrderLog[] = [];
  const inventorySnapshots: InventorySnapshot[] = [];
  const productionLog: ProductionLog[] = [];
  const productFlowLog: ProductFlowLog[] = [];
  
  // ---- Trip aggregation tracking (route -> total quantity shipped) ----
  const tripAggregation: Record<string, { from: string; to: string; totalQuantity: number; vehicleType: string }> = {};
  
  // ---- Replenishment orders tracking ----
  let replenishmentCounter = 1;
  let pendingReplenishments: { id: number; qty: number; arrivalDay: number; orderDay: number; facilityKey?: string; sourceKey?: string; productionCompletionDay?: number }[] = [];
  let totalReplenishmentOrders = 0;
  let totalReplenishmentUnits = 0;
  
  // ---- Additional tracking for detailed cost calculations ----
  let totalProductionUnits = 0;
  let totalInboundUnits = 0;
  let totalOutboundUnits = 0;
  let dailyInventorySum = 0;
  
  // ---- Track daily inventory sum for each facility separately ----
  const facilityDailyInventorySum: Record<string, number> = {};
  for (const key of Object.keys(facilityInventory)) {
    facilityDailyInventorySum[key] = 0;
  }
  
  // ---- Track next order day (using stochastic intervals) ----
  let nextOrderDay = 0; // First order on day 0

  for (let day = 0; day < simulationDays; day++) {
    // Place a new order based on stochastic interval
    if (day >= nextOrderDay) {
      const orderQty = Math.round(generateDemand(demandDistribution));
      pendingOrders.push({ id: orderCounter, qty: orderQty, age: 0, placed: day });
      orderLog.push({
        orderId: orderCounter,
        customerName,
        productName,
        quantity: orderQty,
        orderDate: `Day ${day}`,
        deliveryDate: null,
        waitTime: 0,
        onTime: false,
        scenario: `${scenario.facilityName}-${scenario.productName}`,
        replication: repNumber,
      });
      orderCounter++;
      totalOrders++;
      totalDemand += orderQty;
      
      // Calculate next order day using the distribution
      const intervalDays = Math.max(1, Math.round(generateDemand(orderIntervalDistribution)));
      nextOrderDay = day + intervalDays;
    }

    // Age all pending orders
    for (const o of pendingOrders) o.age++;

    // Fulfill pending orders FIFO (from main DC inventory)
    const dcKey = `${scenario.facilityName}|${scenario.productName}`;
    for (const o of pendingOrders) {
      // Use facility inventory if available, otherwise use backward-compatible inventory
      const availableInventory = facilityInventory[dcKey] ? facilityInventory[dcKey].inventory : inventory;
      if (availableInventory <= 0) break;
      
      const shipped = Math.min(o.qty, availableInventory);
      o.qty -= shipped;
      
      // Deduct from both facility inventory and main inventory
      if (facilityInventory[dcKey]) {
        facilityInventory[dcKey].inventory -= shipped;
      }
      inventory -= shipped;
      
      totalFulfilled += shipped;
      totalOutboundUnits += shipped;
      const handlingCost = shipped * outboundHandling;
      
      // Track customer delivery flow
      if (shipped > 0) {
        productFlowLog.push({
          source: scenario.facilityName,
          destination: customerName,
          product: productName,
          quantity: shipped,
          date: `Day ${day}`,
          scenario: `${scenario.facilityName}-${scenario.productName}`,
          scenarioDescription: scDesc,
          replication: repNumber || 0,
        });
        
        // Track trip aggregation for customer deliveries
        const transportMode = input.transportationData?.find(
          (t: any) => t["Transportation Mode Name"] === (scenario.facilityName.includes("Factory") ? "Truck" : "Truck")
        );
        const vehicleType = transportMode?.["Transportation Mode Name"] || "Truck";
        const tripKey = `${scenario.facilityName}|${customerName}|${vehicleType}`;
        
        if (!tripAggregation[tripKey]) {
          tripAggregation[tripKey] = {
            from: scenario.facilityName,
            to: customerName,
            totalQuantity: 0,
            vehicleType
          };
        }
        tripAggregation[tripKey].totalQuantity += shipped;
      }
      handlingCostTotal += handlingCost;
      totalCost += handlingCost;

      // If this order just got fully delivered, finalize its log
      if (o.qty <= 0) {
        const wait = o.age; // days since placement
        const onTime = wait <= serviceWindow;
        if (onTime) onTimeOrders++;

        const row = orderLog.find((r) => r.orderId === o.id);
        if (row) {
          row.deliveryDate = `Day ${day}`;
          row.waitTime = wait;
          row.onTime = onTime;
        }
      }
    }

    // Remove completed orders
    pendingOrders = pendingOrders.filter((o) => o.qty > 0);

    // Holding cost (daily)
    if (inventory > 0) {
      const holdingCost = holdingCostPerUnit * inventory;
      inventoryCostTotal += holdingCost;
      totalCost += holdingCost;
    }
    
    // Track daily inventory for average calculation (main inventory for backward compatibility)
    dailyInventorySum += inventory;
    
    // Track daily inventory for each facility
    for (const key of Object.keys(facilityInventory)) {
      facilityDailyInventorySum[key] += facilityInventory[key].inventory;
    }

    // Check if any replenishment orders arrive at destination today
    const arrivingReplenishments = pendingReplenishments.filter(r => r.arrivalDay === day);
    for (const rep of arrivingReplenishments) {
      // Update the specific facility's inventory
      if (rep.facilityKey && facilityInventory[rep.facilityKey]) {
        facilityInventory[rep.facilityKey].inventory += rep.qty;
      }
      // Also update main inventory for backward compatibility (DC)
      inventory += rep.qty;
      totalInboundUnits += rep.qty;
      // Inbound handling cost applied when inventory arrives
      const inboundCost = rep.qty * inboundHandling;
      handlingCostTotal += inboundCost;
      totalCost += inboundCost;
    }
    // Remove arrived replenishments
    pendingReplenishments = pendingReplenishments.filter(r => r.arrivalDay > day);

    // Check each facility's inventory and trigger production if needed
    for (const key in facilityInventory) {
      const facInv = facilityInventory[key];
      
      // Find if this is a factory (has production capability)
      const facilityProduction = input.productionData.find(
        (p: any) => p["Facility Name"] === facInv.facilityName && p["Product Name"] === facInv.productName
      );
      
      const isFactory = !!facilityProduction;
      
      // Get production policy for this factory
      const productionPolicy = facilityProduction?.["Production Policy"] || "Make By Demand";
      
      // For factories: Handle production based on policy
      if (isFactory) {
        // Calculate total in-transit for this factory
        const totalInTransitFactory = pendingReplenishments
          .filter(r => r.sourceKey === key)
          .reduce((sum, r) => sum + r.qty, 0);
        const factoryInventoryPosition = facInv.inventory + totalInTransitFactory;
        
        const facilityProductionRate = parseFloat(facilityProduction?.["Production Rate"] || "1");
        const facilityProductionRateTimeUOM = facilityProduction?.["Rate Time UOM"] || "DAY";
        const dailyProduction = facilityProductionRateTimeUOM === "HR" 
          ? facilityProductionRate * 24 
          : facilityProductionRate;
        
        if (productionPolicy === "Continuous Production") {
          // Continuous Production: produce daily up to max inventory
          if (facInv.inventory < facInv.S && dailyProduction > 0) {
            let actualProduction = Math.min(dailyProduction, facInv.S - facInv.inventory);
            
            // Check BOM and consume ALL raw materials
            // First try to get BOM ID from production policy, otherwise fallback to matching by product
            const bomId = facilityProduction?.["BOM"];
            const bomEntry = bomId 
              ? input.bomData?.find((bom: any) => bom["BOM ID"] === bomId)
              : input.bomData?.find((bom: any) => bom["End Product"] === facInv.productName);
            let rawMaterialsUsed: Array<{name: string, consumed: number, inventoryAfter: number}> = [];
            let canProduce = true;
            
            if (bomEntry && bomEntry["Raw Materials"]) {
              // Parse raw materials from format: "Raw_Material_1(2), Raw_Material_2(1)"
              const rawMaterialsStr = bomEntry["Raw Materials"];
              const rawMaterialPairs = rawMaterialsStr.split(',').map((s: string) => s.trim());
              
              const requiredMaterials = rawMaterialPairs.map((pair: string) => {
                const match = pair.match(/^(.+)\(([0-9.]+)\)$/);
                if (!match) return null;
                
                const rawMaterial = match[1].trim();
                const qtyPerUnit = parseFloat(match[2]);
                const totalNeeded = actualProduction * qtyPerUnit;
                const rawMatKey = `${facInv.facilityName}|${rawMaterial}`;
                const rawMatInv = facilityInventory[rawMatKey];
                const available = rawMatInv ? rawMatInv.inventory : 0;
                
                return {
                  name: rawMaterial,
                  qtyPerUnit,
                  totalNeeded,
                  available,
                  key: rawMatKey,
                  inv: rawMatInv
                };
              }).filter(Boolean);
              
              // Calculate max production based on limiting raw material
              let maxPossibleProduction = actualProduction;
              for (const mat of requiredMaterials) {
                if (mat && mat.qtyPerUnit > 0) {
                  const maxFromThisMaterial = Math.floor(mat.available / mat.qtyPerUnit);
                  maxPossibleProduction = Math.min(maxPossibleProduction, maxFromThisMaterial);
                }
              }
              
              actualProduction = maxPossibleProduction;
              
              if (actualProduction > 0) {
                // Consume all raw materials proportionally
                for (const mat of requiredMaterials) {
                  if (mat) {
                    const totalToConsume = actualProduction * mat.qtyPerUnit;
                    if (mat.inv) {
                      mat.inv.inventory -= totalToConsume;
                      rawMaterialsUsed.push({
                        name: mat.name,
                        consumed: totalToConsume,
                        inventoryAfter: mat.inv.inventory
                      });
                    }
                  }
                }
                
                // Produce finished goods
                facInv.inventory += actualProduction;
              } else {
                // Not enough raw materials
                canProduce = false;
                for (const mat of requiredMaterials) {
                  if (mat) {
                    rawMaterialsUsed.push({
                      name: mat.name,
                      consumed: 0,
                      inventoryAfter: mat.available
                    });
                  }
                }
              }
            } else {
              // No BOM entry, produce without consuming materials
              facInv.inventory += actualProduction;
            }
            
            productionLog.push({
              day,
              facility: facInv.facilityName,
              product: facInv.productName,
              quantityProduced: actualProduction,
              status: actualProduction > 0 ? 'active' : 'idle',
              currentInventory: facInv.inventory,
              rawMaterialsUsed: rawMaterialsUsed.length > 0 
                ? rawMaterialsUsed.map(m => `${m.name}(${m.consumed.toFixed(2)})`).join(', ')
                : undefined,
              rawMaterialInventories: rawMaterialsUsed.length > 0 
                ? rawMaterialsUsed.map(m => `${m.name}:${m.inventoryAfter.toFixed(2)}`).join(', ')
                : undefined,
              scenario: `${facInv.facilityName}-${facInv.productName}`,
              scenarioDescription: scDesc,
              replication: repNumber || 0,
            });
            
            const facilityProductionCost = parseFloat(facilityProduction?.["Unit Cost"] || "10");
            const prodCost = actualProduction * facilityProductionCost;
            productionCostTotal += prodCost;
            totalCost += prodCost;
            totalProductionUnits += actualProduction;
          } else {
            productionLog.push({
              day,
              facility: facInv.facilityName,
              product: facInv.productName,
              quantityProduced: 0,
              status: 'idle',
              currentInventory: facInv.inventory,
              scenario: `${facInv.facilityName}-${facInv.productName}`,
              scenarioDescription: scDesc,
              replication: repNumber || 0,
            });
          }
        } else if (productionPolicy === "Make By Demand") {
          // Make By Demand: produce when inventory position falls below s (reorder point)
          if (factoryInventoryPosition <= facInv.s && dailyProduction > 0) {
            const replenishQty = facInv.S - factoryInventoryPosition;
            let actualProduction = Math.min(dailyProduction, replenishQty);
            
            // Check BOM and consume ALL raw materials
            // First try to get BOM ID from production policy, otherwise fallback to matching by product
            const bomId = facilityProduction?.["BOM"];
            const bomEntry = bomId 
              ? input.bomData?.find((bom: any) => bom["BOM ID"] === bomId)
              : input.bomData?.find((bom: any) => bom["End Product"] === facInv.productName);
            let rawMaterialsUsed: Array<{name: string, consumed: number, inventoryAfter: number}> = [];
            let canProduce = true;
            
            if (bomEntry && bomEntry["Raw Materials"]) {
              // Parse raw materials from format: "Raw_Material_1(2), Raw_Material_2(1)"
              const rawMaterialsStr = bomEntry["Raw Materials"];
              const rawMaterialPairs = rawMaterialsStr.split(',').map((s: string) => s.trim());
              
              const requiredMaterials = rawMaterialPairs.map((pair: string) => {
                const match = pair.match(/^(.+)\(([0-9.]+)\)$/);
                if (!match) return null;
                
                const rawMaterial = match[1].trim();
                const qtyPerUnit = parseFloat(match[2]);
                const totalNeeded = actualProduction * qtyPerUnit;
                const rawMatKey = `${facInv.facilityName}|${rawMaterial}`;
                const rawMatInv = facilityInventory[rawMatKey];
                const available = rawMatInv ? rawMatInv.inventory : 0;
                
                return {
                  name: rawMaterial,
                  qtyPerUnit,
                  totalNeeded,
                  available,
                  key: rawMatKey,
                  inv: rawMatInv
                };
              }).filter(Boolean);
              
              // Calculate max production based on limiting raw material
              let maxPossibleProduction = actualProduction;
              for (const mat of requiredMaterials) {
                if (mat && mat.qtyPerUnit > 0) {
                  const maxFromThisMaterial = Math.floor(mat.available / mat.qtyPerUnit);
                  maxPossibleProduction = Math.min(maxPossibleProduction, maxFromThisMaterial);
                }
              }
              
              actualProduction = maxPossibleProduction;
              
              if (actualProduction > 0) {
                // Consume all raw materials proportionally
                for (const mat of requiredMaterials) {
                  if (mat) {
                    const totalToConsume = actualProduction * mat.qtyPerUnit;
                    if (mat.inv) {
                      mat.inv.inventory -= totalToConsume;
                      rawMaterialsUsed.push({
                        name: mat.name,
                        consumed: totalToConsume,
                        inventoryAfter: mat.inv.inventory
                      });
                    }
                  }
                }
                
                // Produce finished goods
                facInv.inventory += actualProduction;
              } else {
                // Not enough raw materials
                canProduce = false;
                for (const mat of requiredMaterials) {
                  if (mat) {
                    rawMaterialsUsed.push({
                      name: mat.name,
                      consumed: 0,
                      inventoryAfter: mat.available
                    });
                  }
                }
              }
            } else {
              // No BOM entry, produce without consuming materials
              facInv.inventory += actualProduction;
            }
            
            productionLog.push({
              day,
              facility: facInv.facilityName,
              product: facInv.productName,
              quantityProduced: actualProduction,
              status: actualProduction > 0 ? 'active' : 'idle',
              currentInventory: facInv.inventory,
              rawMaterialsUsed: rawMaterialsUsed.length > 0 
                ? rawMaterialsUsed.map(m => `${m.name}(${m.consumed.toFixed(2)})`).join(', ')
                : undefined,
              rawMaterialInventories: rawMaterialsUsed.length > 0 
                ? rawMaterialsUsed.map(m => `${m.name}:${m.inventoryAfter.toFixed(2)}`).join(', ')
                : undefined,
              scenario: `${facInv.facilityName}-${facInv.productName}`,
              scenarioDescription: scDesc,
              replication: repNumber || 0,
            });
            
            const facilityProductionCost = parseFloat(facilityProduction?.["Unit Cost"] || "10");
            const prodCost = actualProduction * facilityProductionCost;
            productionCostTotal += prodCost;
            totalCost += prodCost;
            totalProductionUnits += actualProduction;
          } else {
            productionLog.push({
              day,
              facility: facInv.facilityName,
              product: facInv.productName,
              quantityProduced: 0,
              status: 'idle',
              currentInventory: facInv.inventory,
              scenario: `${facInv.facilityName}-${facInv.productName}`,
              scenarioDescription: scDesc,
              replication: repNumber || 0,
            });
          }
        }
      }
      
      // Check if this facility needs replenishment (both DCs and factories can order)
      const totalInTransit = pendingReplenishments
        .filter(r => r.facilityKey === key)
        .reduce((sum, r) => sum + r.qty, 0);
      const inventoryPosition = facInv.inventory + totalInTransit;
      
      // Order/ship if inventory position is at or below s (reorder point)
      // This applies to both DCs ordering finished goods AND factories ordering raw materials
      if (inventoryPosition <= facInv.s) {
        const replenishQty = facInv.S - inventoryPosition;
        
        // Find transportation for this facility
        const facilityTransportation = input.transportationData.find(
          (t: any) => t["Destination Name"] === facInv.facilityName && t["Product Name"] === facInv.productName
        );
        
        if (facilityTransportation) {
          // Find source facility
          const originFacility = facilityTransportation["Origin Name"];
          const sourceKey = `${originFacility}|${facInv.productName}`;
          
          // Check if source facility has inventory available
          const sourceInv = facilityInventory[sourceKey];
          if (sourceInv && sourceInv.inventory > 0) {
            // Ship what's available from source inventory (up to requested quantity)
            const actualShipQty = Math.min(replenishQty, sourceInv.inventory);
            
            // Deduct from source inventory immediately when order is placed
            sourceInv.inventory -= actualShipQty;
            
            const facilityTransportUnitCost = parseFloat(facilityTransportation?.["Unit Cost"] || "0.5");
            const facilityTransportFixedCost = parseFloat(facilityTransportation?.["Fixed Cost"] || "200");
            const facilityTransportTimeDistribution = facilityTransportation?.["Transport Time Distribution"] || "Constant(2)";
            const facilityTransportTimeUOM = facilityTransportation?.["Transport Time Distribution UOM"] || "DAY";
            
            // Transportation cost (unit cost per product + fixed cost per shipment)
            const transCost = (actualShipQty * facilityTransportUnitCost) + facilityTransportFixedCost;
            transportationCost += transCost;
            totalCost += transCost;
            
            // Replenishment unit cost (additional cost from replenishment policy)
            const facilityReplenishment = input.replenishmentData.find(
              (r: any) => r["Facility Name"] === facInv.facilityName && r["Product Name"] === facInv.productName
            );
            const facilityReplenishmentUnitCost = parseFloat(facilityReplenishment?.["Unit Cost"] || "0");
            const replCost = actualShipQty * facilityReplenishmentUnitCost;
            replenishmentCostTotal += replCost;
            totalCost += replCost;
            
            // Track totals for reporting
            totalReplenishmentOrders += 1;
            totalReplenishmentUnits += actualShipQty;
            
            // Schedule arrival after transportation time only (ships immediately from source inventory)
            const leadTimeRaw = generateDemand(facilityTransportTimeDistribution);
            const leadTime = convertToDays(leadTimeRaw, facilityTransportTimeUOM);
            const arrivalDay = day + leadTime;
            
            pendingReplenishments.push({
              id: replenishmentCounter++,
              qty: actualShipQty,
              arrivalDay: Math.round(arrivalDay),
              orderDay: day,
              facilityKey: key,
              sourceKey: sourceKey,
              productionCompletionDay: undefined // No production time for shipments
            });
            
            // Log product flow (shipment in transit)
            productFlowLog.push({
              source: originFacility,
              destination: facInv.facilityName,
              product: facInv.productName,
              quantity: actualShipQty,
              date: `Day ${day}`,
              scenario: `${facInv.facilityName}-${facInv.productName}`,
              scenarioDescription: scDesc,
              replication: repNumber || 0,
            });
            
            // Track trips for aggregation
            const tripKey = `${originFacility}|${facInv.facilityName}`;
            const modeName = facilityTransportation?.["Mode Name"] || "Truck";
            
            if (!tripAggregation[tripKey]) {
              tripAggregation[tripKey] = {
                from: originFacility,
                to: facInv.facilityName,
                totalQuantity: 0,
                vehicleType: modeName
              };
            }
            tripAggregation[tripKey].totalQuantity += actualShipQty;
          }
        }
      }
    }

    // Record inventory snapshot for ALL facilities
    if (collectInventory) {
      // Record inventory for each facility in the scenario
      for (const key in facilityInventory) {
        const facInv = facilityInventory[key];
        inventorySnapshots.push({
          day,
          inventory: facInv.inventory,
          facility: facInv.facilityName,
          product: facInv.productName,
          scenario: `${facInv.facilityName}-${facInv.productName}`,
          scenarioDescription: scDesc,
          replication: repNumber || 0,
        });
      }
    }
  }

  // KPIs
  const fillRate = totalDemand > 0 ? (totalFulfilled / totalDemand) * 100 : 0;
  const eltServiceLevel = totalOrders > 0 ? (onTimeOrders / totalOrders) * 100 : 0;

  const costBreakdown: CostBreakdown = {
    transportation: transportationCost,
    production: productionCostTotal,
    handling: handlingCostTotal,
    inventory: inventoryCostTotal,
    replenishment: replenishmentCostTotal, // Unified: ordering cost = replenishment cost
  };

  const distributionType = transportTimeDistribution.split("(")[0] || "Constant";
  const distributionParams = transportTimeDistribution.match(/\((.*)\)/)?.[1] || "2";
  
  const transportationDetails: TransportationDetails = {
    fixedCostPerOrder: transportFixedCost,
    transportUnitCost: transportUnitCost,
    replenishmentUnitCost: replenishmentUnitCost,
    totalOrders: totalReplenishmentOrders,
    totalUnits: totalReplenishmentUnits,
    distributionType: distributionType,
    distributionParams: distributionParams,
  };

  const productionDetails: ProductionDetails = {
    unitCost: productionCost,
    totalUnits: totalProductionUnits,
  };

  const handlingDetails: HandlingDetails = {
    inboundCost: inboundHandling,
    outboundCost: outboundHandling,
    inboundUnits: totalInboundUnits,
    outboundUnits: totalOutboundUnits,
  };

  const avgInventory = simulationDays > 0 ? dailyInventorySum / simulationDays : 0;
  
  // Calculate per-facility inventory details
  const byFacility: FacilityInventoryDetails[] = [];
  for (const key of Object.keys(facilityInventory)) {
    const facInv = facilityInventory[key];
    const avgFacilityInventory = simulationDays > 0 ? facilityDailyInventorySum[key] / simulationDays : 0;
    
    // Get facility-specific holding cost
    const facWarehousing = input.warehousingData.find(
      (w: any) => w["Facility Name"] === facInv.facilityName && w["Product Name"] === facInv.productName
    );
    const facHoldingCost = parseFloat(facWarehousing?.["Stocking Unit Cost"] || "0.3");
    const totalFacilityHoldingCost = avgFacilityInventory * facHoldingCost * simulationDays;
    
    byFacility.push({
      facilityName: facInv.facilityName,
      productName: facInv.productName,
      holdingCostPerUnit: facHoldingCost,
      avgInventory: avgFacilityInventory,
      totalHoldingCost: totalFacilityHoldingCost,
    });
  }
  
  const inventoryDetails: InventoryDetails = {
    holdingCostPerUnit: holdingCostPerUnit,
    avgInventory: avgInventory,
    days: simulationDays,
    byFacility: byFacility,
  };
  
  // Calculate trips based on vehicle capacity
  const tripLog: TripLog[] = [];
  for (const tripKey in tripAggregation) {
    const tripData = tripAggregation[tripKey];
    
    // Find transportation mode to get vehicle capacity
    const transportMode = input.transportationData.find(
      (t: any) => t["Origin Name"] === tripData.from && t["Destination Name"] === tripData.to
    );
    const modeName = transportMode?.["Mode Name"] || tripData.vehicleType;
    
    // Find vehicle capacity from transportation mode data
    const modeData = input.transportationData.find(
      (t: any) => t["Mode Name"] === modeName
    );
    let vehicleCapacity = 1000; // Default capacity
    
    // Try to get from transportation mode table
    if (input.transportationData && input.transportationData.length > 0) {
      const modeConfig = input.transportationData.find((m: any) => m["Mode Name"] === modeName);
      if (modeConfig && modeConfig["Vehicle Capacity"]) {
        vehicleCapacity = parseFloat(modeConfig["Vehicle Capacity"]) || 1000;
      }
    }
    
    // Calculate number of trips needed based on total quantity and vehicle capacity
    const trips = Math.ceil(tripData.totalQuantity / vehicleCapacity);
    
    tripLog.push({
      from: tripData.from,
      to: tripData.to,
      vehicleType: modeName,
      trips: trips,
      totalQuantity: tripData.totalQuantity,
      scenario: scDesc,
      scenarioDescription: scDesc,
      replication: repNumber || 0,
    });
  }

  return { 
    cost: totalCost, 
    serviceLevel: fillRate, 
    eltServiceLevel, 
    orderLog, 
    costBreakdown, 
    transportationDetails, 
    productionDetails, 
    handlingDetails, 
    inventoryDetails, 
    inventorySnapshots,
    productionLog,
    productFlowLog,
    tripLog
  };
}

// ================== Scenarios & stats ==================
function generateParameterValues(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  const steps = Math.round((max - min) / step) + 1;
  for (let i = 0; i < steps; i++) {
    const v = min + i * step;
    if (v <= max) values.push(Math.round(v * 100) / 100);
  }
  return values;
}

function generateScenarios(input: SimulationInput): any[] {
  const scenarios: any[] = [];
  const inputFactors = input.inputFactorsData;

  // Fallback: take a DC policy if no Input Factors are present (keeps original behavior)
  if (!inputFactors || inputFactors.length === 0) {
    const dcPolicy = input.inventoryPolicyData.find((ip: any) =>
      ip["Facility Name"]?.startsWith("DC")
    );
    if (dcPolicy) {
      scenarios.push({
        facilityName: dcPolicy["Facility Name"],
        productName: dcPolicy["Product Name"],
        s: parseFloat(dcPolicy["Simulation Policy Value 1"] || "150"),
        S: parseFloat(dcPolicy["Simulation Policy Value 2"] || "600"),
      });
    }
    return scenarios;
  }

  // NEW APPROACH: Generate combinations across ALL input factors
  // First, extract all possible parameter combinations for each facility-product
  const factorCombinations: Record<string, any[]> = {};
  
  for (const factor of inputFactors) {
    const facilityName = factor["Facility Name"];
    const productName = factor["Product"];
    const parameterSetupStr = factor["Parameter Setup"];
    if (!parameterSetupStr || !facilityName || !productName) continue;

    const key = `${facilityName}|${productName}`;
    
    let config: any[] = [];
    try {
      config = JSON.parse(parameterSetupStr);
    } catch {
      continue;
    }

    const sCfg = config.find((p: any) => p.name === "s");
    const SCfg = config.find((p: any) => p.name === "S");
    if (!sCfg || !SCfg) continue;

    const sVals = generateParameterValues(sCfg.min, sCfg.max, sCfg.step);
    const SVals = generateParameterValues(SCfg.min, SCfg.max, SCfg.step);

    // Store all combinations for this facility-product
    const combinations = [];
    for (const s of sVals) {
      for (const S of SVals) {
        if (s < S) {
          combinations.push({ facilityName, productName, s, S });
        }
      }
    }
    factorCombinations[key] = combinations;
  }

  // Now create full scenarios by combining across all facility-products
  const keys = Object.keys(factorCombinations);
  if (keys.length === 0) return scenarios;
  
  // Generate Cartesian product of all combinations
  const cartesianProduct = (arrays: any[][]): any[][] => {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restProduct = cartesianProduct(rest);
    return first.flatMap(item => restProduct.map(r => [item, ...r]));
  };
  
  const allCombinations = cartesianProduct(Object.values(factorCombinations));
  
  // Each scenario now includes all facility-product combinations
  for (const combo of allCombinations) {
    // combo is an array of {facilityName, productName, s, S} objects
    // We need to flatten this into a single scenario object
    const scenario: any = {};
    for (const item of combo) {
      const prefix = `${item.facilityName}_${item.productName}`;
      scenario[`${prefix}_s`] = item.s;
      scenario[`${prefix}_S`] = item.S;
      scenario[`${prefix}_facilityName`] = item.facilityName;
      scenario[`${prefix}_productName`] = item.productName;
    }
    // For backward compatibility, also include the first one as the primary
    if (combo.length > 0) {
      scenario.facilityName = combo[0].facilityName;
      scenario.productName = combo[0].productName;
      scenario.s = combo[0].s;
      scenario.S = combo[0].S;
    }
    scenario.allFactors = combo; // Store all for easy access
    scenarios.push(scenario);
  }
  
  return scenarios;
}

function calculateStats(values: number[]): { min: number; max: number; mean: number; sd: number } {
  if (!values.length) return { min: 0, max: 0, mean: 0, sd: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return { min, max, mean, sd: Math.sqrt(variance) };
}


// Helper function to yield control to the browser
function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

// ================== Shared runner ==================
async function runAll(
  input: SimulationInput,
  replications: number,
  onProgress?: (progress: number) => void,
  collectLogs: boolean = false,
  collectInventory: boolean = false
): Promise<{ 
  scenarioResults: SimulationResult[]; 
  orderLogs: OrderLog[]; 
  inventoryData: InventorySnapshot[];
  productionLogs: ProductionLog[];
  productFlowLogs: ProductFlowLog[];
  tripLogs: TripLog[];
}> {
  const scenarios = generateScenarios(input);
  const scenarioResults: SimulationResult[] = [];
  const allOrderLogs: OrderLog[] = [];
  const allInventoryData: InventorySnapshot[] = [];
  const allProductionLogs: ProductionLog[] = [];
  const allProductFlowLogs: ProductFlowLog[] = [];
  const allTripLogs: TripLog[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    
    // Build description from all factors in scenario
    let desc = "";
    if (sc.allFactors && sc.allFactors.length > 0) {
      desc = sc.allFactors
        .map((f: any) => `${f.facilityName}(${f.productName}): s=${f.s}, S=${f.S}`)
        .join(" | ");
    } else {
      desc = `${sc.facilityName} | ${sc.productName} | s=${sc.s} | S=${sc.S}`;
    }
    
    const costs: number[] = [];
    const sls: number[] = [];
    const elts: number[] = [];
    const scenarioOrderLogs: OrderLog[] = [];
    const costBreakdowns: CostBreakdown[] = [];
    let transportationDetailsForScenario: TransportationDetails | undefined;
    let productionDetailsForScenario: ProductionDetails | undefined;
    let handlingDetailsForScenario: HandlingDetails | undefined;
    let inventoryDetailsForScenario: InventoryDetails | undefined;

    // Run all replications for this scenario without yielding (much faster)
    for (let rep = 0; rep < replications; rep++) {
      const { cost, serviceLevel, eltServiceLevel, orderLog, costBreakdown, transportationDetails, productionDetails, handlingDetails, inventoryDetails, inventorySnapshots, productionLog, productFlowLog, tripLog } = 
        runReplication(input, sc, rep + 1, collectInventory, desc);
      costs.push(cost);
      sls.push(serviceLevel);
      elts.push(eltServiceLevel);
      costBreakdowns.push(costBreakdown);
      
      // Store details from first replication (they're the same for all reps)
      if (rep === 0) {
        transportationDetailsForScenario = transportationDetails;
        productionDetailsForScenario = productionDetails;
        handlingDetailsForScenario = handlingDetails;
        inventoryDetailsForScenario = inventoryDetails;
      }

      if (collectLogs) {
        // Add scenarioDescription to order logs
        const logsWithScenario = orderLog.map(log => ({
          ...log,
          scenarioDescription: desc
        }));
        scenarioOrderLogs.push(...logsWithScenario);
        
        // Collect production, product flow, and trip logs (only from first replication)
        if (rep === 0) {
          allProductionLogs.push(...productionLog);
          allProductFlowLogs.push(...productFlowLog);
          allTripLogs.push(...tripLog);
        }
      }

      if (collectInventory && rep < 3) { // Only collect first 3 replications for performance
        allInventoryData.push(...inventorySnapshots);
      }
    }

    if (collectLogs) allOrderLogs.push(...scenarioOrderLogs);

    const costStats = calculateStats(costs);
    const slStats = calculateStats(sls);
    const eltStats = calculateStats(elts);

    // Average cost breakdown across replications
    const avgBreakdown: CostBreakdown = {
      transportation: costBreakdowns.reduce((s, b) => s + b.transportation, 0) / costBreakdowns.length,
      production: costBreakdowns.reduce((s, b) => s + b.production, 0) / costBreakdowns.length,
      handling: costBreakdowns.reduce((s, b) => s + b.handling, 0) / costBreakdowns.length,
      inventory: costBreakdowns.reduce((s, b) => s + b.inventory, 0) / costBreakdowns.length,
      replenishment: costBreakdowns.reduce((s, b) => s + b.replenishment, 0) / costBreakdowns.length,
    };

    scenarioResults.push({
      srNo: i + 1,
      scenarioDescription: desc,
      costMin: Math.round(costStats.min),
      costMax: Math.round(costStats.max),
      costMean: Math.round(costStats.mean),
      costSD: Math.round(costStats.sd),
      serviceLevelMin: parseFloat(slStats.min.toFixed(2)),
      serviceLevelMax: parseFloat(slStats.max.toFixed(2)),
      serviceLevelMean: parseFloat(slStats.mean.toFixed(2)),
      serviceLevelSD: parseFloat(slStats.sd.toFixed(2)),
      eltServiceLevelMin: parseFloat(eltStats.min.toFixed(2)),
      eltServiceLevelMax: parseFloat(eltStats.max.toFixed(2)),
      eltServiceLevelMean: parseFloat(eltStats.mean.toFixed(2)),
      eltServiceLevelSD: parseFloat(eltStats.sd.toFixed(2)),
      transportationDetails: transportationDetailsForScenario,
      productionDetails: productionDetailsForScenario,
      handlingDetails: handlingDetailsForScenario,
      inventoryDetails: inventoryDetailsForScenario,
      costBreakdown: avgBreakdown,
    });

    if (onProgress) onProgress(((i + 1) / scenarios.length) * 100);
    
    // Yield after each scenario to keep UI responsive
    await yieldToMain();
  }

  return { 
    scenarioResults, 
    orderLogs: allOrderLogs, 
    inventoryData: allInventoryData,
    productionLogs: allProductionLogs,
    productFlowLogs: allProductFlowLogs,
    tripLogs: allTripLogs
  };
}

// ================== Public APIs ==================
// BACK-COMPAT: same signature, returns only scenario array (your old UI keeps working)
export async function runSimulation(
  input: SimulationInput,
  replications: number,
  onProgress?: (progress: number) => void
): Promise<SimulationResult[]> {
  const { scenarioResults } = await runAll(input, replications, onProgress, false, false);
  return scenarioResults;
}

// NEW: returns both scenarioResults and orderLogs (for your new Customer Order Log table)
export async function runSimulationWithLogs(
  input: SimulationInput,
  replications: number,
  onProgress?: (progress: number) => void
): Promise<{ scenarioResults: SimulationResult[]; orderLogs: OrderLog[]; inventoryData: InventorySnapshot[] }> {
  return await runAll(input, replications, onProgress, true, true);
}
