/**
 * COMPREHENSIVE DATA CONTEXT SCHEMA FOR GFA DATA SUPPORT
 * 
 * This file documents all data structures, columns, and their meanings
 * that are available to the AI model for answering user questions.
 * 
 * Location: supabase/functions/gfa-data-support/data-context-schema.ts
 */

export const DATA_SCHEMA_DOCUMENTATION = `
═══════════════════════════════════════════════════════════════════
  GFA (GREEN FIELD ANALYSIS) DATA STRUCTURE DOCUMENTATION
═══════════════════════════════════════════════════════════════════

This document provides complete context about all data tables, columns,
and their relationships in the Green Field Analysis optimization tool.

───────────────────────────────────────────────────────────────────
1. INPUT DATA STRUCTURES
───────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│ TABLE: CUSTOMERS (Customer Data)                                 │
└─────────────────────────────────────────────────────────────────┘

Purpose: Contains all customer information including location, demand, 
         and product requirements.

Columns:
  • id (string)
    - Unique identifier for each customer
    - Format: UUID or sequential number
    - Required: Yes
    - Example: "cust-001", "550e8400-e29b-41d4-a716-446655440000"
  
  • name (string)
    - Customer name or business name
    - Required: Yes
    - Example: "Acme Corporation", "Customer A"
  
  • city (string)
    - City where customer is located
    - Required: Yes
    - Used for: Geographic analysis, grouping by location
    - Example: "New York", "London", "Tokyo"
  
  • country (string)
    - Country where customer is located
    - Required: Yes
    - Used for: International analysis, regional grouping
    - Example: "USA", "United Kingdom", "Japan"
  
  • postalCode (string)
    - Postal code or ZIP code
    - Required: No
    - Used for: Precise location identification
    - Example: "10001", "SW1A 1AA", "100-0001"
  
  • address (string)
    - Complete street address
    - Required: No
    - Example: "123 Main St, Suite 100"
  
  • product (string)
    - Name of the product this customer orders
    - Required: Yes
    - Links to: Products table
    - Example: "Widget A", "Premium Service Package"
  
  • demand (number)
    - Quantity of product demanded by customer
    - Required: Yes
    - Unit: Varies based on product
    - Used for: Calculating total demand, capacity planning
    - Example: 100, 2500.5, 10000
  
  • volume (number)
    - Volume in cubic meters (m³)
    - Required: No
    - Calculated from: demand × product volume
    - Used for: Capacity calculations, space planning
    - Example: 50.5, 125.75
  
  • lat (number)
    - Latitude coordinate
    - Required: Yes
    - Range: -90 to 90
    - Used for: Distance calculations, mapping
    - Example: 40.7128, 51.5074
  
  • lng (number)
    - Longitude coordinate
    - Required: Yes
    - Range: -180 to 180
    - Used for: Distance calculations, mapping
    - Example: -74.0060, -0.1278

┌─────────────────────────────────────────────────────────────────┐
│ TABLE: PRODUCTS (Product Catalog)                                │
└─────────────────────────────────────────────────────────────────┘

Purpose: Defines products available in the system with their units,
         pricing, and conversion factors.

Columns:
  • id (string)
    - Unique product identifier
    - Required: Yes
    - Example: "prod-001", "SKU-12345"
  
  • name (string)
    - Product name
    - Required: Yes
    - Must match: Customer.product values
    - Example: "Widget A", "Premium Package"
  
  • baseUnit (string)
    - Base unit of measurement for this product
    - Required: Yes
    - Common values: "kg", "lbs", "units", "liters", "m³"
    - Example: "kg", "units"
  
  • conversionToStandard (number)
    - Conversion factor to standard units (m³)
    - Required: Yes
    - Used for: Normalizing different unit types
    - Example: 1.0, 0.001, 35.3147 (cubic feet to m³)
  
  • sellingPrice (number)
    - Price per unit in USD
    - Required: No
    - Used for: Revenue calculations, profitability analysis
    - Example: 10.50, 999.99

┌─────────────────────────────────────────────────────────────────┐
│ TABLE: OPTIMIZATION_SETTINGS (Configuration)                     │
└─────────────────────────────────────────────────────────────────┘

Purpose: Contains optimization parameters and constraints used to
         generate distribution center recommendations.

Fields:
  • mode (string: "sites" | "radius")
    - Optimization approach
    - "sites": Optimize for specific number of distribution centers
    - "radius": Optimize based on maximum service radius
    - Example: "sites"
  
  • numDCs (number)
    - Target number of distribution centers
    - Used when: mode = "sites"
    - Range: 1-100
    - Example: 3, 5, 10
  
  • maxRadius (number)
    - Maximum service radius from DC to customer
    - Used when: mode = "radius"
    - Unit: Specified in distanceUnit
    - Example: 50, 100, 500
  
  • demandPercentage (number)
    - Percentage of total demand to cover
    - Range: 1-100
    - Used for: Partial coverage scenarios
    - Example: 100, 95, 80
  
  • dcCapacity (number)
    - Storage capacity per distribution center
    - Unit: Specified in capacityUnit
    - 0 = unlimited capacity
    - Example: 0, 10000, 50000
  
  • capacityUnit (string)
    - Unit for measuring capacity
    - Common values: "m3", "kg", "units"
    - Must align with: Products.baseUnit
    - Example: "m3"
  
  • transportationCostPerMilePerUnit (number)
    - Cost to transport one unit for one mile
    - Currency: USD
    - Used for: Transportation cost calculations
    - Example: 0.5, 1.25, 2.0
  
  • facilityCost (number)
    - Fixed annual cost per distribution center
    - Currency: USD
    - Includes: Rent, utilities, staff, overhead
    - Example: 100000, 500000, 1000000
  
  • distanceUnit (string: "km" | "miles")
    - Unit for all distance measurements
    - Affects: maxRadius, distance calculations
    - Example: "km"
  
  • costUnit (string)
    - Unit for cost calculations
    - Must align with: Products.baseUnit
    - Example: "m3", "kg"

───────────────────────────────────────────────────────────────────
2. OUTPUT/RESULTS DATA STRUCTURES
───────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│ TABLE: DISTRIBUTION_CENTERS (Optimization Results)               │
└─────────────────────────────────────────────────────────────────┘

Purpose: Contains optimized distribution center locations and their
         assigned customers after running optimization.

Columns:
  • lat (number)
    - Latitude of the distribution center
    - Range: -90 to 90
    - Optimized based on: Customer locations and demand
    - Example: 40.7128
  
  • lng (number)
    - Longitude of the distribution center
    - Range: -180 to 180
    - Optimized based on: Customer locations and demand
    - Example: -74.0060
  
  • customers (Customer[])
    - Array of customers assigned to this DC
    - Contains: Full customer objects with all fields
    - Sorted by: Distance from DC (closest first)
    - Used for: Service area analysis, demand aggregation
    - Each customer object includes all fields from Customers table

  • totalDemand (calculated)
    - Sum of demand from all assigned customers
    - Calculated: Sum of customers[].demand
    - Used for: Capacity validation, load balancing
  
  • totalVolume (calculated)
    - Sum of volume from all assigned customers
    - Calculated: Sum of customers[].volume
    - Used for: Space planning, capacity checks
  
  • customersCount (calculated)
    - Number of customers assigned
    - Calculated: customers.length
    - Used for: Workload analysis

┌─────────────────────────────────────────────────────────────────┐
│ TABLE: COST_BREAKDOWN (Financial Analysis)                       │
└─────────────────────────────────────────────────────────────────┘

Purpose: Provides detailed cost analysis of the optimization solution.

Fields:
  • totalCost (number)
    - Total annual cost of the distribution network
    - Currency: USD
    - Calculated: transportationCost + facilityCost
    - Used for: Comparing different optimization scenarios
    - Example: 450000, 1250000
  
  • transportationCost (number)
    - Total annual transportation costs
    - Currency: USD
    - Calculated: Sum of (distance × demand × costPerMilePerUnit)
                  for all customer-DC assignments
    - Includes: Fuel, driver costs, vehicle maintenance
    - Example: 350000
  
  • facilityCost (number)
    - Total annual facility costs
    - Currency: USD
    - Calculated: numSites × facilityCostPerSite
    - Includes: Rent, utilities, staff, overhead per DC
    - Example: 100000
  
  • numSites (number)
    - Number of distribution centers in solution
    - Should match: distributionCenters.length
    - Used for: Infrastructure planning
    - Example: 3, 5, 10

───────────────────────────────────────────────────────────────────
3. CALCULATED METRICS & AGGREGATIONS
───────────────────────────────────────────────────────────────────

The following metrics can be calculated from the base data:

GEOGRAPHIC METRICS:
  • Customers by Country
    - Count of customers grouped by country
    - SQL equivalent: SELECT country, COUNT(*) FROM customers GROUP BY country
  
  • Customers by City
    - Count of customers grouped by city
    - SQL equivalent: SELECT city, COUNT(*) FROM customers GROUP BY city
  
  • Geographic Distribution
    - Min/max/average lat/lng coordinates
    - Geographic spread and center point

DEMAND METRICS:
  • Total Demand
    - Sum of all customer demand
    - SUM(customers.demand)
  
  • Average Demand
    - Mean demand per customer
    - AVG(customers.demand)
  
  • Demand by Product
    - Total demand grouped by product
    - SELECT product, SUM(demand) FROM customers GROUP BY product
  
  • Demand by Geography
    - Total demand by country or city
    - SELECT country, SUM(demand) FROM customers GROUP BY country

REVENUE METRICS (requires products.sellingPrice):
  • Total Revenue
    - Sum of (customer.demand × product.sellingPrice)
    - Requires joining customers with products
  
  • Revenue by Product
    - Total revenue grouped by product
  
  • Revenue by Customer
    - Individual customer revenue contribution
  
  • Revenue by DC (from results)
    - Revenue generated by customers assigned to each DC

PROFITABILITY METRICS:
  • Gross Profit
    - Total Revenue - Total Cost
  
  • Profit Margin
    - (Total Revenue - Total Cost) / Total Revenue × 100%
  
  • Cost per Customer
    - Total Cost / Number of Customers Served
  
  • Revenue per Customer
    - Total Revenue / Number of Customers

DISTRIBUTION CENTER METRICS:
  • DC Utilization
    - Total volume served / DC capacity
    - Percentage of capacity used
  
  • Average Distance to Customers
    - Mean distance from DC to all assigned customers
  
  • Service Coverage
    - Percentage of customers within maxRadius
  
  • Load Balance
    - Standard deviation of demand across DCs
    - Measures how evenly demand is distributed

COST METRICS:
  • Cost per Unit Delivered
    - Total Cost / Total Demand
  
  • Transportation Cost per Mile
    - Total Transportation Cost / Total Miles
  
  • Facility Cost per Customer
    - Total Facility Cost / Number of Customers

───────────────────────────────────────────────────────────────────
4. DATA RELATIONSHIPS
───────────────────────────────────────────────────────────────────

Customers ─→ Products
  • Relationship: Many-to-One
  • Link: customers.product = products.name
  • Used for: Price lookups, unit conversions

Customers ─→ DistributionCenters
  • Relationship: Many-to-One (in results)
  • Link: Via distributionCenters[].customers array
  • Used for: Service area analysis, route planning

OptimizationSettings ─→ All Tables
  • Affects: How optimization algorithm processes data
  • Influences: Number of DCs, service areas, cost calculations

───────────────────────────────────────────────────────────────────
5. COMMON QUERY PATTERNS
───────────────────────────────────────────────────────────────────

Users frequently ask questions in these patterns:

COUNTING QUERIES:
  • "How many customers are there?"
  • "How many products do we have?"
  • "How many DCs were created?"
  • "How many customers in [city/country]?"

AGGREGATION QUERIES:
  • "What's the total demand?"
  • "What's the average demand per customer?"
  • "What's the min/max demand?"
  • "Sum of demand by product?"

GEOGRAPHIC QUERIES:
  • "Which country has the most customers?"
  • "List all cities"
  • "Customers in [specific city]"
  • "Geographic distribution of customers"

FINANCIAL QUERIES:
  • "What's the total cost?"
  • "Show cost breakdown"
  • "What's the transportation cost?"
  • "Calculate total revenue"
  • "What's the profit?"
  • "Most profitable customer/product"

DISTRIBUTION QUERIES:
  • "How many customers per DC?"
  • "Which DC serves the most customers?"
  • "Show DC locations"
  • "Average distance from DC to customers"

PRODUCT QUERIES:
  • "Which product has highest demand?"
  • "Revenue by product"
  • "Customers ordering [product name]"

OPTIMIZATION QUERIES:
  • "What optimization settings were used?"
  • "What was the max radius?"
  • "How many DCs were requested?"
  • "What's the facility cost?"

═══════════════════════════════════════════════════════════════════
END OF DATA SCHEMA DOCUMENTATION
═══════════════════════════════════════════════════════════════════
`;

/**
 * Builds comprehensive context string with complete data for AI model
 */
export function buildComprehensiveContext(context: any): string {
  const { customers = [], products = [], dcs = [], settings = {}, costBreakdown } = context;
  
  let contextData = DATA_SCHEMA_DOCUMENTATION;
  
  contextData += "\n\n═══════════════════════════════════════════════════════════════════\n";
  contextData += "  ACTUAL DATA FROM CURRENT SESSION\n";
  contextData += "═══════════════════════════════════════════════════════════════════\n\n";
  
  // Customer Data Summary (REDUCED for token efficiency)
  if (customers.length > 0) {
    contextData += "┌─────────────────────────────────────────────────────────────────┐\n";
    contextData += `│ INPUT DATA: CUSTOMERS (${customers.length} records)`.padEnd(66) + "│\n";
    contextData += "└─────────────────────────────────────────────────────────────────┘\n\n";
    
    contextData += "CUSTOMER STATISTICS:\n" + "─".repeat(65) + "\n\n";
    
    // By country
    const byCountry = customers.reduce((acc: any, c: any) => {
      const country = c.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
    contextData += `Countries (${Object.keys(byCountry).length} total):\n`;
    Object.entries(byCountry).sort(([,a], [,b]) => (b as number) - (a as number)).forEach(([country, count]) => {
      contextData += `  • ${country}: ${count} customers (${((count as number / customers.length) * 100).toFixed(1)}%)\n`;
    });
    
    // By city
    const byCity = customers.reduce((acc: any, c: any) => {
      const city = c.city || 'Unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});
    contextData += `\nCities (${Object.keys(byCity).length} total):\n`;
    Object.entries(byCity).sort(([,a], [,b]) => (b as number) - (a as number)).forEach(([city, count]) => {
      contextData += `  • ${city}: ${count} customers (${((count as number / customers.length) * 100).toFixed(1)}%)\n`;
    });
    
    // Demand statistics
    const demands = customers.map((c: any) => c.demand || 0).filter((d: number) => d > 0);
    if (demands.length > 0) {
      const totalDemand = demands.reduce((a: number, b: number) => a + b, 0);
      const avgDemand = totalDemand / demands.length;
      const minDemand = Math.min(...demands);
      const maxDemand = Math.max(...demands);
      const medianDemand = demands.sort((a: number, b: number) => a - b)[Math.floor(demands.length / 2)];
      
      contextData += `\nDemand Analysis:\n`;
      contextData += `  • Total Demand: ${totalDemand.toFixed(2)} units\n`;
      contextData += `  • Average Demand: ${avgDemand.toFixed(2)} units per customer\n`;
      contextData += `  • Median Demand: ${medianDemand.toFixed(2)} units\n`;
      contextData += `  • Min Demand: ${minDemand.toFixed(2)} units\n`;
      contextData += `  • Max Demand: ${maxDemand.toFixed(2)} units\n`;
      contextData += `  • Standard Deviation: ${Math.sqrt(demands.map((d: number) => Math.pow(d - avgDemand, 2)).reduce((a: number, b: number) => a + b, 0) / demands.length).toFixed(2)}\n`;
    }
    
    // Volume statistics
    const volumes = customers.map((c: any) => c.volume || 0).filter((v: number) => v > 0);
    if (volumes.length > 0) {
      const totalVolume = volumes.reduce((a: number, b: number) => a + b, 0);
      contextData += `\nVolume Analysis:\n`;
      contextData += `  • Total Volume: ${totalVolume.toFixed(2)} m³\n`;
      contextData += `  • Average Volume per Customer: ${(totalVolume / volumes.length).toFixed(2)} m³\n`;
    }
    
    // By product
    const byProduct = customers.reduce((acc: any, c: any) => {
      const product = c.product || 'Unknown';
      acc[product] = (acc[product] || 0) + 1;
      return acc;
    }, {});
    contextData += `\nProduct Distribution:\n`;
    Object.entries(byProduct).sort(([,a], [,b]) => (b as number) - (a as number)).forEach(([product, count]) => {
      contextData += `  • ${product}: ${count} customers (${((count as number / customers.length) * 100).toFixed(1)}%)\n`;
    });
  }
  
  // Complete Product Data
  if (products.length > 0) {
    contextData += "\n\n┌─────────────────────────────────────────────────────────────────┐\n";
    contextData += `│ INPUT DATA: PRODUCTS (${products.length} records)`.padEnd(66) + "│\n";
    contextData += "└─────────────────────────────────────────────────────────────────┘\n\n";
    
    products.forEach((product: any, idx: number) => {
      contextData += `Product #${idx + 1}:\n`;
      contextData += `  ID: ${product.id}\n`;
      contextData += `  Name: ${product.name}\n`;
      contextData += `  Base Unit: ${product.baseUnit}\n`;
      contextData += `  Conversion to Standard: ${product.conversionToStandard}\n`;
      const price = product.sellingPrice ? Number(product.sellingPrice) : null;
      contextData += `  Selling Price: ${price !== null && !isNaN(price) ? '$' + price.toFixed(2) : 'Not set'}\n\n`;
    });
  }
  
  // Optimization Settings
  contextData += "\n┌─────────────────────────────────────────────────────────────────┐\n";
  contextData += "│ OPTIMIZATION SETTINGS".padEnd(66) + "│\n";
  contextData += "└─────────────────────────────────────────────────────────────────┘\n\n";
  
  contextData += `Optimization Mode: ${settings.mode || 'Not set'}\n`;
  contextData += `Number of DCs Target: ${settings.numDCs || 'Not set'}\n`;
  contextData += `Maximum Service Radius: ${settings.maxRadius || 'Not set'} ${settings.distanceUnit || 'km'}\n`;
  contextData += `Demand Coverage Target: ${settings.demandPercentage || 100}%\n`;
  contextData += `DC Capacity Limit: ${settings.dcCapacity || 'Unlimited'} ${settings.capacityUnit || 'm3'}\n`;
  contextData += `Transportation Cost Rate: $${settings.transportationCostPerMilePerUnit || 0}/mile/unit\n`;
  contextData += `Fixed Facility Cost per DC: $${(settings.facilityCost || 0).toLocaleString()}/year\n`;
  contextData += `Distance Unit: ${settings.distanceUnit || 'km'}\n`;
  contextData += `Cost Calculation Unit: ${settings.costUnit || 'm3'}\n`;
  
  // Distribution Centers (Results)
  if (dcs.length > 0) {
    contextData += "\n\n┌─────────────────────────────────────────────────────────────────┐\n";
    contextData += `│ OPTIMIZATION RESULTS: DISTRIBUTION CENTERS (${dcs.length} created)`.padEnd(66) + "│\n";
    contextData += "└─────────────────────────────────────────────────────────────────┘\n\n";
    
    let totalCustomersServed = 0;
    let totalDemandServed = 0;
    let totalVolumeServed = 0;
    
    dcs.forEach((dc: any, idx: number) => {
      const dcNumber = idx + 1;
      const dcCustomers = dc.customers || dc.assignedCustomers || [];
      const dcDemand = dcCustomers.reduce((sum: number, c: any) => sum + (c.demand || 0), 0);
      const dcVolume = dcCustomers.reduce((sum: number, c: any) => sum + (c.volume || 0), 0);
      
      totalCustomersServed += dcCustomers.length;
      totalDemandServed += dcDemand;
      totalVolumeServed += dcVolume;
      
      contextData += `\n┌────────────── DISTRIBUTION CENTER (SITE) #${dcNumber} ──────────────┐\n`;
      contextData += `  Site ID: DC-${dcNumber}\n`;
      contextData += `  Location Coordinates: Latitude ${dc.lat || dc.latitude}, Longitude ${dc.lng || dc.longitude}\n`;
      contextData += `  Nearest City: ${dc.nearestCity || 'Not specified'}\n`;
      contextData += `  City/Country: ${dc.cityCountry || 'Not specified'}\n`;
      contextData += `  \n`;
      contextData += `  Number of Customers Assigned: ${dcCustomers.length}\n`;
      contextData += `  Total Demand Served: ${dcDemand.toFixed(2)} units\n`;
      contextData += `  Total Volume Served: ${dcVolume.toFixed(2)} m³\n`;
      
      if (settings.dcCapacity && dcVolume > 0) {
        const utilization = (dcVolume / settings.dcCapacity) * 100;
        contextData += `  Capacity Utilization: ${utilization.toFixed(1)}%\n`;
      }
      
      if (dcCustomers.length > 0) {
        contextData += `\n  Top 5 Customers by Demand:\n`;
        const topCustomers = dcCustomers
          .sort((a: any, b: any) => (b.demand || 0) - (a.demand || 0))
          .slice(0, 5);
        topCustomers.forEach((customer: any, cidx: number) => {
          contextData += `    ${cidx + 1}. ${customer.name} (${customer.city}): ${customer.demand} units of ${customer.product}\n`;
        });
      }
      contextData += "\n└────────────────────────────────────────────────────────────┘\n\n";
    });
    
    // Results summary
    contextData += "─".repeat(65) + "\n";
    contextData += "RESULTS SUMMARY:\n";
    contextData += "─".repeat(65) + "\n";
    contextData += `Total DCs Created: ${dcs.length}\n`;
    contextData += `Total Customers Served: ${totalCustomersServed} of ${customers.length} (${((totalCustomersServed / customers.length) * 100).toFixed(1)}%)\n`;
    contextData += `Total Demand Served: ${totalDemandServed.toFixed(2)} units\n`;
    contextData += `Total Volume Served: ${totalVolumeServed.toFixed(2)} m³\n`;
    contextData += `Average Customers per DC: ${(totalCustomersServed / dcs.length).toFixed(1)}\n`;
    contextData += `Average Demand per DC: ${(totalDemandServed / dcs.length).toFixed(2)} units\n`;
    
    // Calculate revenue if possible
    let totalRevenue = 0;
    dcs.forEach((dc: any) => {
      dc.customers?.forEach((c: any) => {
        const product = products.find((p: any) => p.name === c.product);
        if (product?.sellingPrice && c.demand) {
          const price = Number(product.sellingPrice);
          if (!isNaN(price)) {
            totalRevenue += price * c.demand;
          }
        }
      });
    });
    
    if (totalRevenue > 0) {
      contextData += `\nRevenue from Served Customers: $${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
      contextData += `Average Revenue per Customer: $${(totalRevenue / totalCustomersServed).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
      contextData += `Average Revenue per DC: $${(totalRevenue / dcs.length).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
    }
  }
  
  // Cost Breakdown
  if (costBreakdown) {
    contextData += "\n\n┌─────────────────────────────────────────────────────────────────┐\n";
    contextData += "│ COST ANALYSIS".padEnd(66) + "│\n";
    contextData += "└─────────────────────────────────────────────────────────────────┘\n\n";
    
    contextData += `Total Annual Cost: $${costBreakdown.totalCost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || 'N/A'}\n`;
    contextData += `  • Transportation Cost: $${costBreakdown.transportationCost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || 'N/A'} (${costBreakdown.transportationCost && costBreakdown.totalCost ? ((costBreakdown.transportationCost / costBreakdown.totalCost) * 100).toFixed(1) : 0}%)\n`;
    contextData += `  • Facility Cost: $${costBreakdown.facilityCost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || 'N/A'} (${costBreakdown.facilityCost && costBreakdown.totalCost ? ((costBreakdown.facilityCost / costBreakdown.totalCost) * 100).toFixed(1) : 0}%)\n`;
    contextData += `Number of Sites: ${costBreakdown.numSites || 'N/A'}\n`;
    
    if (customers.length > 0 && costBreakdown.totalCost) {
      contextData += `\nCost per Customer: $${(costBreakdown.totalCost / customers.length).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
    }
    
    // Calculate profit if revenue data available
    let totalRevenue = 0;
    if (dcs.length > 0) {
      dcs.forEach((dc: any) => {
        const dcCustomers = dc.customers || dc.assignedCustomers || [];
        dcCustomers.forEach((c: any) => {
          const product = products.find((p: any) => p.name === c.product);
          if (product?.sellingPrice && c.demand) {
            const price = Number(product.sellingPrice);
            if (!isNaN(price)) {
              totalRevenue += price * c.demand;
            }
          }
        });
      });
      
      if (totalRevenue > 0 && costBreakdown.totalCost) {
        const profit = totalRevenue - costBreakdown.totalCost;
        const profitMargin = (profit / totalRevenue) * 100;
        contextData += `\nProfitability Analysis:\n`;
        contextData += `  • Total Revenue: $${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
        contextData += `  • Total Cost: $${costBreakdown.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
        contextData += `  • Gross Profit: $${profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
        contextData += `  • Profit Margin: ${profitMargin.toFixed(2)}%\n`;
      }
    }
  }
  
  // ============ CUSTOMER PROFITABILITY ANALYSIS ============
  contextData += "\n\n┌─────────────────────────────────────────────────────────────────┐\n";
  contextData += "│ DETAILED CUSTOMER PROFITABILITY ANALYSIS".padEnd(66) + "│\n";
  contextData += "└─────────────────────────────────────────────────────────────────┘\n\n";
  
  let profitableCount = 0;
  let unprofitableCount = 0;
  const customerProfitability: any[] = [];
  
  if (dcs.length > 0) {
    dcs.forEach((dc: any, dcIndex: number) => {
      const dcCustomers = dc.customers || dc.assignedCustomers || [];
      dcCustomers.forEach((customer: any) => {
        const product = products.find((p: any) => p.name === customer.product);
        
        // Calculate distance using Haversine formula
        const lat1 = (dc.lat || dc.latitude) * (Math.PI / 180);
        const lat2 = (customer.lat || customer.latitude) * (Math.PI / 180);
        const latDiff = lat2 - lat1;
        const lonDiff = ((customer.lng || customer.longitude) - (dc.lng || dc.longitude)) * (Math.PI / 180);
        const a = Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = 6371 * c;
        const distance = settings.distanceUnit === 'mile' ? distanceKm * 0.621371 : distanceKm;
        
        // Calculate transportation cost
        let demandInCostUnit = customer.demand;
        if (product && customer.unitOfMeasure !== settings.costUnit) {
          demandInCostUnit = customer.demand * (product.conversionToStandard || 1);
        }
        const transportationCost = distance * settings.transportationCostPerMilePerUnit * demandInCostUnit;
        
        // Calculate revenue
        const sellingPrice = product?.sellingPrice ? Number(product.sellingPrice) : 0;
        const revenue = !isNaN(sellingPrice) ? customer.demand * sellingPrice : 0;
        
        // Calculate profit
        const profit = revenue - transportationCost;
        const isProfitable = profit > 0;
        
        if (isProfitable) profitableCount++;
        else unprofitableCount++;
        
        customerProfitability.push({
          name: customer.name,
          id: customer.id,
          city: customer.city,
          country: customer.country,
          product: customer.product,
          demand: customer.demand,
          unit: customer.unitOfMeasure || customer.unit || 'units',
          dcNumber: dcIndex + 1,
          dcLocation: dc.nearestCity || `${dc.lat || dc.latitude}, ${dc.lng || dc.longitude}`,
          distance: distance.toFixed(2),
          transportationCost: transportationCost.toFixed(2),
          revenue: revenue.toFixed(2),
          profit: profit.toFixed(2),
          isProfitable,
        });
      });
    });
    
    // Sort by profit (highest to lowest)
    customerProfitability.sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit));
    
    // Calculate product-level profitability
    const productProfitability: any = {};
    customerProfitability.forEach(cust => {
      if (!productProfitability[cust.product]) {
        productProfitability[cust.product] = {
          profitable: 0,
          unprofitable: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0
        };
      }
      if (cust.isProfitable) {
        productProfitability[cust.product].profitable++;
      } else {
        productProfitability[cust.product].unprofitable++;
      }
      productProfitability[cust.product].totalRevenue += parseFloat(cust.revenue);
      productProfitability[cust.product].totalCost += parseFloat(cust.transportationCost);
      productProfitability[cust.product].totalProfit += parseFloat(cust.profit);
    });
    
    contextData += `╔═══════════════════════════════════════════════════════════════════╗\n`;
    contextData += `║  PROFITABILITY SUMMARY - READ THESE EXACT NUMBERS                 ║\n`;
    contextData += `╚═══════════════════════════════════════════════════════════════════╝\n\n`;
    contextData += `>>> CRITICAL: USE THESE EXACT COUNTS - DO NOT RECALCULATE <<<\n\n`;
    contextData += `  📊 Total Customers Analyzed: ${customerProfitability.length}\n`;
    contextData += `  ✅ Profitable Customers: ${profitableCount} (${((profitableCount/customerProfitability.length)*100).toFixed(1)}%)\n`;
    contextData += `  ❌ Unprofitable Customers: ${unprofitableCount} (${((unprofitableCount/customerProfitability.length)*100).toFixed(1)}%)\n\n`;
    
    contextData += `PROFITABILITY BY PRODUCT:\n`;
    contextData += `─────────────────────────────────────────────────────────────────\n`;
    Object.entries(productProfitability).forEach(([product, stats]: [string, any]) => {
      const total = stats.profitable + stats.unprofitable;
      contextData += `\n📦 ${product}:\n`;
      contextData += `   • Total Customers: ${total}\n`;
      contextData += `   • Profitable: ${stats.profitable} (${((stats.profitable/total)*100).toFixed(1)}%)\n`;
      contextData += `   • Unprofitable: ${stats.unprofitable} (${((stats.unprofitable/total)*100).toFixed(1)}%)\n`;
      contextData += `   • Total Revenue: $${stats.totalRevenue.toFixed(2)}\n`;
      contextData += `   • Total Transport Cost: $${stats.totalCost.toFixed(2)}\n`;
      contextData += `   • Net Profit/Loss: $${stats.totalProfit.toFixed(2)}\n`;
    });
    contextData += `\n`;
  }
  
  contextData += "\n\n═══════════════════════════════════════════════════════════════════\n";
  contextData += "  END OF ACTUAL DATA\n";
  contextData += "═══════════════════════════════════════════════════════════════════\n";
  
  return contextData;
}
