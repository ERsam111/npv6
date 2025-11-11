import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer } from "@/types/gfa";
import { MapPin } from "lucide-react";

interface CustomerMapViewProps {
  customers: Customer[];
}

export function CustomerMapView({ customers }: CustomerMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const MAPBOX_TOKEN = "pk.eyJ1IjoiZXJzaGFkMTExIiwiYSI6ImNtZ204Z2V2ejE3angyanNnM28xdng0aWwifQ.YXPI9Lti9Y6fEoFbYrqzTg";

  const getLat = (c: Customer) => c.latitude;
  const getLon = (c: Customer) => c.longitude;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [0, 20],
      zoom: 2,
      renderWorldCopies: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => setIsLoaded(true));

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle resize
  useEffect(() => {
    if (!mapContainer.current) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, []);

  // Render customer markers
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (customers.length === 0) return;

    // Calculate demand range for bubble sizing
    const demands = customers.map((c) => c.demand ?? 0);
    const minDemand = Math.min(...demands);
    const maxDemand = Math.max(...demands);
    const demandRange = Math.max(0, maxDemand - minDemand);

    const coords: [number, number][] = [];

    customers.forEach((c) => {
      const lat = getLat(c);
      const lon = getLon(c);
      if (typeof lat !== "number" || typeof lon !== "number") return;

      coords.push([lon, lat]);

      // Calculate bubble size based on demand
      const minSize = 10;
      const maxSize = 40;
      const val = typeof c.demand === "number" ? c.demand : minDemand;
      const norm = demandRange > 0 ? (val - minDemand) / demandRange : 0.5;
      const size = minSize + norm * (maxSize - minSize);

      // Create bubble marker
      const el = document.createElement("div");
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = "50%";
      el.style.background = "rgba(59, 130, 246, 0.7)";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.2s";
      
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.1)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      // Create popup
      const name = c.name ?? "Customer";
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="padding:10px;">
          <strong style="font-size:14px;">${name}</strong><br/>
          ${typeof c.demand === "number" ? `<span style="color:#666;">Demand: <strong>${c.demand} ${c.unitOfMeasure ?? ""}</strong></span><br/>` : ""}
          ${c.product ? `<span style="color:#666;">Product: ${c.product}</span><br/>` : ""}
          ${c.city ? `<span style="color:#666;">City: ${c.city}</span><br/>` : ""}
          ${c.country ? `<span style="color:#666;">Country: ${c.country}</span><br/>` : ""}
          <span style="color:#999;font-size:11px;">Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}</span>
        </div>`
      );

      const marker = new mapboxgl.Marker(el).setLngLat([lon, lat]).setPopup(popup).addTo(map);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all customers
    if (coords.length > 0) {
      const bounds = coords.slice(1).reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 8 });
    }
  }, [isLoaded, customers]);

  if (customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5" />
            Customer Locations
          </CardTitle>
          <CardDescription>Upload customer data to view locations on map</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">No customer data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-5 w-5" />
          Customer Locations
        </CardTitle>
        <CardDescription>Input data visualization - bubble size represents demand</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainer} className="w-full h-[500px] rounded-b-lg" />
      </CardContent>
    </Card>
  );
}
