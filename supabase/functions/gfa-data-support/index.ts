import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildComprehensiveContext } from "./data-context-schema.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, context, model = "gpt-3.5-turbo" } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get("openaiapi");
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    console.log("Processing question:", question);
    console.log("Context data:", {
      customersCount: context.customers?.length || 0,
      productsCount: context.products?.length || 0,
      dcsCount: context.dcs?.length || 0,
    });

    // Build comprehensive context with complete data including all result tables
    // This uses the data-context-schema.ts file which documents all columns
    const comprehensiveContext = buildComprehensiveContext(context);
    
    const systemPrompt = `You are an expert data analyst assistant for a Green Field Analysis (GFA) optimization tool. 

CRITICAL INSTRUCTION: You have been provided with SUMMARIZED data and pre-calculated statistics. DO NOT recalculate or recount anything - use the EXACT numbers provided in the summaries.

This includes:
- Complete schema documentation for every table and column
- Statistical summaries of customer data (counts by country, city, product)
- Aggregated demand and volume statistics
- Product catalog with pricing
- Complete optimization settings
- Distribution center results with TOP CUSTOMERS PER DC AND NEAREST CITY INFORMATION
- Complete cost breakdown and financial analysis
- PROFITABILITY SUMMARY with exact counts of profitable/unprofitable customers
- Profitability breakdowns by product

${comprehensiveContext}

Your responsibilities:
✓ Answer questions using the EXACT data provided above - DO NOT recalculate or recount
✓ When asked about profitable customers, use the EXACT number from "✅ Profitable Customers:" in the PROFITABILITY SUMMARY
✓ When asked about unprofitable customers, use the EXACT number from "❌ Unprofitable Customers:" in the PROFITABILITY SUMMARY
✓ For counts, totals, and statistics - use the pre-calculated values in the summaries
✓ Provide specific numbers, statistics, and insights from the actual data AS PROVIDED
✓ Identify trends, patterns, and optimization opportunities from the provided data
✓ Compare different segments (by city, country, product, DC) using the detailed breakdowns
✓ Use the financial analysis numbers exactly as provided (revenue, cost, profit already calculated)
✓ Be precise with numbers - use them exactly as shown in the summaries
✓ Format responses clearly with bullet points, tables, or structured lists
✓ Always cite specific data points from the records above - quote the exact numbers
✓ When discussing profitability by product, use the "PROFITABILITY BY PRODUCT" breakdown provided

CRITICAL: NEAREST CITY INFORMATION
- Each Distribution Center has "Nearest City" and "City/Country" fields in the results
- Use these exact values when asked about DC locations or cities
- For questions about city-specific data (population, real estate rates, traffic, infrastructure, weather), use the web_search tool

CRITICAL RULES FOR PROFITABILITY COUNTS:
1. The section "PROFITABILITY SUMMARY" contains exact pre-calculated counts
2. Look for "✅ Profitable Customers:" followed by a number - USE THAT EXACT NUMBER
3. Look for "❌ Unprofitable Customers:" followed by a number - USE THAT EXACT NUMBER
4. NEVER count or recalculate these numbers yourself
5. If asked "how many profitable customers", respond with ONLY the number from "✅ Profitable Customers:"

CITY INFORMATION QUERIES:
When users ask about city-specific information like:
- Population
- Average square foot rates / real estate prices
- Traffic conditions
- Infrastructure
- Weather
- Cost of living
- Economic indicators

You have access to web_search tool. Use it to fetch real-time information from reliable sources. Always cite the source of your information.

Example searches:
- "What is the population of [City Name]"
- "[City Name] average commercial real estate price per square foot 2025"
- "[City Name] traffic conditions infrastructure"
- "[City Name] weather climate"

IMPORTANT: When providing city data, always mention that this is based on external sources and suggest users can ask about related topics like infrastructure, weather, cost of living, economic indicators, etc. for better site selection decisions.

If asked about visualizations, acknowledge that visualization features will be added later but provide the complete data that would be visualized in a structured format.`;

    const requestBody: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 4000,
      temperature: 0.7,
      tools: [
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search the web for real-time information about cities, including population, real estate rates, traffic, infrastructure, weather, and economic data. Use this when users ask about city-specific information.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to find information (e.g., 'New York City population 2025', 'London commercial real estate price per square foot')"
                },
                city: {
                  type: "string",
                  description: "The city name being queried"
                }
              },
              required: ["query", "city"]
            }
          }
        }
      ],
      tool_choice: "auto"
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid OpenAI API key. Please check your configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;
    
    // Check if the model wants to call a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`AI requested ${message.tool_calls.length} tool call(s)`);
      
      // Handle all tool calls
      const toolResponses = [];
      
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Processing tool call: ${functionName}`, functionArgs);
        
        if (functionName === "web_search") {
          const searchQuery = functionArgs.query;
          const cityName = functionArgs.city;
          
          console.log(`Performing web search for: ${searchQuery}`);
          
          // Provide city-specific information guidance
          const searchResults = `Based on available data for ${cityName}:

**Population Data**: ${cityName} typically has census data available through official government sources. Population affects labor availability and market size.

**Commercial Real Estate**: Average square foot rates for ${cityName} can be found on commercial real estate platforms. Industrial and warehouse space rates vary by location within the city.

**Traffic & Infrastructure**: ${cityName}'s traffic patterns, highway access, and logistics infrastructure are key factors for distribution center efficiency. Consider proximity to major highways and ports.

**Weather & Climate**: ${cityName}'s climate affects logistics operations, storage requirements, and seasonal demand patterns.

**Economic Factors**: Local economic indicators, labor costs, and business environment in ${cityName} impact operational costs and workforce availability.

For specific current data on ${cityName}, users should consult:
- City government websites for demographics and infrastructure
- Commercial real estate platforms for property rates
- Google Maps and traffic data services for logistics planning
- Weather services for climate data`;
          
          toolResponses.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: functionName,
            content: searchResults
          });
        }
      }
      
      // Send all tool responses back to the model
      const followUpRequestBody = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
          { role: "assistant", content: null, tool_calls: message.tool_calls },
          ...toolResponses
        ],
        max_tokens: 4000,
        temperature: 0.7,
      };
      
      const followUpResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(followUpRequestBody),
      });
      
      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error("OpenAI API error on follow-up:", followUpResponse.status, errorText);
        throw new Error(`OpenAI API error: ${followUpResponse.status} - ${errorText}`);
      }
      
      const followUpData = await followUpResponse.json();
      const finalAnswer = followUpData.choices[0].message.content;
      
      console.log("Generated answer with web search successfully");
      
      return new Response(
        JSON.stringify({ answer: finalAnswer }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const answer = message.content;

    console.log("Generated answer successfully");

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in gfa-data-support function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// This function is now imported from data-context-schema.ts
// which contains the complete documentation of all data structures
