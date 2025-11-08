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
    const { postalCode, country } = await req.json();

    if (!postalCode) {
      return new Response(
        JSON.stringify({ error: "Postal code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Geocoding postal code: ${postalCode}, country: ${country || 'any'}`);

    // Build search query
    let searchQuery = postalCode;
    if (country) {
      searchQuery = `${postalCode}, ${country}`;
    }

    // Use Nominatim for geocoding
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(postalCode)}${country ? `&country=${encodeURIComponent(country)}` : ''}&addressdetails=1&limit=1`;
    
    console.log(`Fetching: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "GFA-Optimization-App/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Postal code not found. Please check the postal code and country.",
          found: false
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const location = data[0];
    
    console.log(`Found location: ${location.display_name}`);

    return new Response(
      JSON.stringify({
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        city: location.address?.city || 
              location.address?.town || 
              location.address?.village || 
              location.address?.municipality || 
              location.address?.county || 
              "Unknown",
        country: location.address?.country || "",
        displayName: location.display_name || "",
        found: true
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error geocoding postal code:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        found: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
