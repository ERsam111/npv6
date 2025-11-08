import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Latitude and longitude are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for nearby cities using Nominatim
    const searchUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "GFA-Optimization-App/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Try to get city from address
    let cityName = data.address?.city || 
                   data.address?.town || 
                   data.address?.village || 
                   data.address?.municipality ||
                   data.address?.county ||
                   data.address?.state;

    // If we got a result, try to search for nearby larger cities
    if (cityName) {
      const nearbySearchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&addressdetails=1&extratags=1&limit=5`;
      
      const nearbyResponse = await fetch(nearbySearchUrl, {
        headers: {
          "User-Agent": "GFA-Optimization-App/1.0",
        },
      });

      if (nearbyResponse.ok) {
        const nearbyData = await nearbyResponse.json();
        
        const cityWithPop = nearbyData.find((place: any) => {
          const pop = place.extratags?.population || place.extratags?.["population:date"];
          return pop && parseInt(pop) >= 10000;
        });

        if (cityWithPop) {
          cityName = cityWithPop.display_name?.split(',')[0] || cityName;
        }
      }
    }

    return new Response(
      JSON.stringify({
        city: cityName || "Unknown",
        country: data.address?.country || "",
        displayName: data.display_name || "",
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error finding nearest city:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        city: "Unknown",
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
