import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, context, model = "gpt-4o-mini" } = await req.json();
    const openaiApiKey = Deno.env.get("openaiapi");

    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    console.log("Inventory Data Support - Question:", question);
    console.log("Inventory Data Support - Model:", model);
    console.log("Inventory Data Support - Context keys:", Object.keys(context));

    // Build comprehensive context about the inventory optimization
    const systemPrompt = `You are an expert inventory optimization assistant analyzing simulation-based multi-echelon supply chain data. 

SCENARIO INFORMATION:
- Scenario Name: ${context.scenarioName || "N/A"}
- Description: ${context.scenarioDescription || "N/A"}
- Number of Replications: ${context.settings?.replications || 0}

INPUT DATA SUMMARY:
- Customers: ${context.inputData?.customerData?.length || 0}
- Facilities: ${context.inputData?.facilityData?.length || 0} (DCs, Factories, Suppliers)
- Products: ${context.inputData?.productData?.length || 0}
- Customer Fulfillment Rules: ${context.inputData?.customerFulfillmentData?.length || 0}
- Replenishment Policies: ${context.inputData?.replenishmentData?.length || 0}
- Production Policies: ${context.inputData?.productionData?.length || 0}
- Inventory Policies: ${context.inputData?.inventoryPolicyData?.length || 0}
- Warehousing Policies: ${context.inputData?.warehousingData?.length || 0}
- Order Fulfillment: ${context.inputData?.orderFulfillmentData?.length || 0}
- Transportation Routes: ${context.inputData?.transportationData?.length || 0}
- Transportation Modes: ${context.inputData?.transportationModeData?.length || 0}
- Customer Orders: ${context.inputData?.customerOrderData?.length || 0}
- BOM Items: ${context.inputData?.bomData?.length || 0}

SIMULATION RESULTS:
${context.results?.simulationResults?.length > 0 ? `
- Total Scenarios Simulated: ${context.results.simulationResults.length}
- Best Scenario: The scenario with a star (★) marking indicates the optimal solution
` : "No simulation results available yet"}

ORDER LOG RECORDS: ${context.results?.orderLogResults?.length || 0}
INVENTORY RECORDS: ${context.results?.inventoryData?.length || 0}
PRODUCTION LOG RECORDS: ${context.results?.productionLogResults?.length || 0}
PRODUCT FLOW RECORDS: ${context.results?.productFlowLogResults?.length || 0}
TRIP LOG RECORDS: ${context.results?.tripLogResults?.length || 0}

DETAILED INPUT DATA:
${JSON.stringify(context.inputData, null, 2)}

${context.results?.simulationResults?.length > 0 ? `
DETAILED SIMULATION RESULTS:
${JSON.stringify(context.results.simulationResults, null, 2)}
` : ""}

${context.results?.orderLogResults?.length > 0 ? `
ORDER LOG SAMPLE (first 20 records):
${JSON.stringify(context.results.orderLogResults.slice(0, 20), null, 2)}
` : ""}

${context.results?.inventoryData?.length > 0 ? `
INVENTORY DATA SAMPLE (first 20 records):
${JSON.stringify(context.results.inventoryData.slice(0, 20), null, 2)}
` : ""}

${context.results?.productionLogResults?.length > 0 ? `
PRODUCTION LOG SAMPLE (first 20 records):
${JSON.stringify(context.results.productionLogResults.slice(0, 20), null, 2)}
` : ""}

${context.results?.productFlowLogResults?.length > 0 ? `
PRODUCT FLOW LOG SAMPLE (first 20 records):
${JSON.stringify(context.results.productFlowLogResults.slice(0, 20), null, 2)}
` : ""}

${context.results?.tripLogResults?.length > 0 ? `
TRIP LOG SAMPLE (first 20 records):
${JSON.stringify(context.results.tripLogResults.slice(0, 20), null, 2)}
` : ""}

HOW THE OPTIMIZATION WORKS:
1. The simulation runs multiple replications to account for stochastic demand and lead times
2. Each scenario represents different inventory policy parameters (s,S or R,Q values)
3. The system simulates customer orders, production, inventory levels, and transportation
4. Cost elements include:
   - Transportation costs (shipping between facilities and to customers)
   - Warehousing costs (inbound handling, stocking, destocking)
   - Production costs (manufacturing at factories)
   - Inventory holding costs
   - Stockout/backorder costs
   - Time in queue costs
5. The best scenario minimizes total cost while meeting service level requirements

INVENTORY POLICIES:
- (s,S): When inventory drops to reorder point s, order up to S
- (R,Q): Review inventory every R periods, order quantity Q if needed
- Policies are defined per facility-product combination

PRODUCTION:
- Continuous Production: Produce at a constant rate
- Make By Demand: Produce only when orders arrive
- BOM defines raw material requirements for finished goods

TRANSPORTATION:
- FTL (Full Truck Load): Wait until truck is full
- LTL (Less Than Truck Load): Ship partial loads
- Lead times can follow various probability distributions

Answer questions accurately based on this data. If asked about:
- Best scenario: Look for the scenario marked with ★ in the results
- Cost breakdown: Explain the different cost components
- Product flow: Use the product flow log to trace paths
- Demand patterns: Analyze customer order data
- Policies: Explain the inventory, production, and transportation policies
- Specific values: Provide exact numbers from the data when available

Be specific, quantitative, and actionable in your responses.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    console.log("Inventory Data Support - Answer generated");

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in inventory-data-support:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
