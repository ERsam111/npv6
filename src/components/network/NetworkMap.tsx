import { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useNetwork } from "@/contexts/NetworkContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXJzaGFkMTExIiwiYSI6ImNtZ204Z2V2ejE3angyanNnM28xdng0aWwifQ.YXPI9Lti9Y6fEoFbYrqzTg";

type Coord = { lng: number; lat: number };
type SiteRecord = { name: string; lng: number; lat: number; type: "customer" | "facility" | "supplier"; raw: any };

export function NetworkMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const connectionsLayerId = "network-connections";
  const arrowsLayerId = "network-arrows";
  const sourceId = "network-connections-src";

  const { data } = useNetwork();
  const [mapLoaded, setMapLoaded] = useState(false);

  // ---------- Filters ----------
  const productOptions = useMemo(
    () => (data.products || []).map((p: any) => p.ProductID || p.product_id || p.id).filter(Boolean),
    [data.products],
  );
  const [selectedProduct, setSelectedProduct] = useState<string>("(All)");
  const [showCustomers, setShowCustomers] = useState<boolean>(true);
  const [showFacilities, setShowFacilities] = useState<boolean>(true);
  const [showSuppliers, setShowSuppliers] = useState<boolean>(true);

  // ---------- Map init ----------
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-95, 38],
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.on("load", () => setMapLoaded(true));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ---------- Build site index ----------
  const sites: SiteRecord[] = useMemo(() => {
    const out: SiteRecord[] = [];

    // Customers (Include true-ish)
    (data.customers || []).forEach((c: any) => {
      const include = (c.include ?? c.Include ?? "Include") !== "Exclude";
      if (include && c.lat && c.lng) {
        out.push({
          name: c.name || c.CustomerName,
          lat: Number(c.lat),
          lng: Number(c.lng),
          type: "customer",
          raw: c,
        });
      }
    });

    // Facilities (Status Include)
    (data.facilities || []).forEach((f: any) => {
      if ((f.status || f.Status) === "Include" && f.lat && f.lng) {
        out.push({
          name: f.name || f.FacilityName,
          lat: Number(f.lat),
          lng: Number(f.lng),
          type: "facility",
          raw: f,
        });
      }
    });

    // Suppliers (Include true-ish)
    (data.suppliers || []).forEach((s: any) => {
      const include = (s.include ?? s.Include ?? "Include") !== "Exclude";
      if (include && s.lat && s.lng) {
        out.push({
          name: s.name || s.SupplierName,
          lat: Number(s.lat),
          lng: Number(s.lng),
          type: "supplier",
          raw: s,
        });
      }
    });

    // Deduplicate by name+type if needed
    const keySet = new Set<string>();
    return out.filter((rec) => {
      const key = `${rec.type}:${rec.name}`;
      if (keySet.has(key)) return false;
      keySet.add(key);
      return true;
    });
  }, [data.customers, data.facilities, data.suppliers]);

  const siteIndex = useMemo(() => {
    const idx = new Map<string, Coord>();
    sites.forEach((s) => {
      if (s.name && Number.isFinite(s.lng) && Number.isFinite(s.lat)) {
        idx.set(s.name, { lng: s.lng, lat: s.lat });
      }
    });
    return idx;
  }, [sites]);

  // ---------- Draw markers (respect filters) ----------
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing DOM markers
    const markers = document.getElementsByClassName("mapboxgl-marker");
    while (markers[0]) {
      markers[0].parentNode?.removeChild(markers[0]);
    }

    const bounds = new mapboxgl.LngLatBounds();
    const addMarker = (rec: SiteRecord) => {
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      if (rec.type === "customer") {
        el.style.width = "24px";
        el.style.height = "24px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#3b82f6";
        el.style.border = "2px solid white";
      } else if (rec.type === "facility") {
        el.style.width = "28px";
        el.style.height = "28px";
        el.style.borderRadius = "4px";
        el.style.backgroundColor = (rec.raw.type || rec.raw.Type) === "Factory" ? "#ef4444" : "#10b981";
        el.style.border = "2px solid white";
      } else {
        el.style.width = "26px";
        el.style.height = "26px";
        el.style.backgroundColor = "#f59e0b";
        el.style.border = "2px solid white";
        el.style.clipPath = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
      }

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2">
          <h3 class="font-semibold">${rec.name}</h3>
          <p class="text-xs capitalize">${rec.type}</p>
        </div>`,
      );

      new mapboxgl.Marker(el).setLngLat([rec.lng, rec.lat]).setPopup(popup).addTo(map.current!);
      bounds.extend([rec.lng, rec.lat]);
    };

    sites.forEach((s) => {
      if (s.type === "customer" && !showCustomers) return;
      if (s.type === "facility" && !showFacilities) return;
      if (s.type === "supplier" && !showSuppliers) return;
      addMarker(s);
    });

    if (!bounds.isEmpty()) {
      map.current?.fitBounds(bounds, { padding: 50, maxZoom: 9 });
    }
  }, [mapLoaded, sites, showCustomers, showFacilities, showSuppliers]);

  // ---------- Build connection GeoJSON ----------
  const connections = useMemo(() => {
    // Prefer flowRules; fallback to paths
    const rules = Array.isArray(data.flowRules) ? data.flowRules : [];
    const paths = Array.isArray(data.paths) ? data.paths : [];

    const features: any[] = [];

    const addLine = (fromName: string, toName: string, meta: any = {}) => {
      const a = siteIndex.get(fromName);
      const b = siteIndex.get(toName);
      if (!a || !b) return;
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [a.lng, a.lat],
            [b.lng, b.lat],
          ],
        },
        properties: {
          from: fromName,
          to: toName,
          product_id: meta.product_id || "",
          label: meta.product_id || "",
        },
      });
    };

    // Flow rules first
    if (rules.length > 0) {
      rules.forEach((r: any) => {
        const pid = r.ProductID || r.product_id || "";
        if (selectedProduct !== "(All)" && pid && pid !== selectedProduct) return;
        const from = r.From || r.from;
        const to = r.To || r.to;
        if (from && to) addLine(from, to, { product_id: pid });
      });
    } else {
      // Fall back to paths (no product on many models, so skip filter if missing)
      paths.forEach((p: any) => {
        const from = p.From || p.from;
        const to = p.To || p.to;
        const pid = p.ProductID || p.product_id || "";
        if (selectedProduct !== "(All)" && pid && pid !== selectedProduct) return;
        if (from && to) addLine(from, to, { product_id: pid });
      });
    }

    return {
      type: "FeatureCollection",
      features,
    } as GeoJSON.FeatureCollection;
  }, [data.flowRules, data.paths, siteIndex, selectedProduct]);

  // ---------- Draw / update connection layers ----------
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing layers/sources if present
    if (map.current.getLayer(arrowsLayerId)) map.current.removeLayer(arrowsLayerId);
    if (map.current.getLayer(connectionsLayerId)) map.current.removeLayer(connectionsLayerId);
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

    // Add source
    map.current.addSource(sourceId, {
      type: "geojson",
      data: connections as any,
    });

    // Dotted line layer
    map.current.addLayer({
      id: connectionsLayerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#111827", // slate-900
        "line-width": 2,
        "line-dasharray": [2, 2], // dotted
        "line-opacity": 0.6,
      },
    });

    // Direction arrows along the line
    // Using built-in triangle icon; placed along line to show direction
    map.current.addLayer({
      id: arrowsLayerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 150,
        "icon-image": "triangle-11",
        "icon-size": 0.8,
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-color": "#111827",
        "icon-opacity": 0.8,
      },
    });

    // Fit bounds to connections if any
    if (connections.features.length > 0) {
      const b = new mapboxgl.LngLatBounds();
      connections.features.forEach((f: any) => {
        (f.geometry.coordinates as [number, number][]).forEach((c) => b.extend(c));
      });
      if (!b.isEmpty()) map.current!.fitBounds(b, { padding: 60, maxZoom: 6 });
    }
  }, [connections, mapLoaded]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Network Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Product filter */}
            <div className="w-56">
              <Label className="mb-1 block">Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="(All)">(All)</SelectItem>
                  {productOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <Checkbox checked={showCustomers} onCheckedChange={(v) => setShowCustomers(Boolean(v))} />
                <span>Customers</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={showFacilities} onCheckedChange={(v) => setShowFacilities(Boolean(v))} />
                <span>Facilities</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={showSuppliers} onCheckedChange={(v) => setShowSuppliers(Boolean(v))} />
                <span>Suppliers</span>
              </label>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                <span>Customers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500 border-2 border-white"></div>
                <span>DC</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500 border-2 border-white"></div>
                <span>Factory</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 bg-amber-500 border-2 border-white"
                  style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                ></div>
                <span>Suppliers</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-[2px] bg-slate-800"
                  style={{
                    backgroundImage: "linear-gradient(to right, #111827 50%, rgba(0,0,0,0) 0%)",
                    backgroundSize: "6px 2px",
                    backgroundRepeat: "repeat-x",
                  }}
                ></div>
                <span>Connections</span>
              </div>
            </div>
          </div>

          <div ref={mapContainer} className="h-[600px] rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
