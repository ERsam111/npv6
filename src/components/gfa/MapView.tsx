import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Customer, DistributionCenter } from "@/types/gfa";

interface MapViewProps {
  customers: Customer[];
  dcs: DistributionCenter[];
  distanceRangeStep: number; // e.g., 100
  distanceUnit: "km" | "mile"; // "km" or "mile"
}

export function MapView({ customers, dcs, distanceRangeStep, distanceUnit }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // visibility
  const [showCustomers, setShowCustomers] = useState(true);
  const [showSites, setShowSites] = useState(true);
  const [showLines, setShowLines] = useState(true);

  // filters
  const [selectedRanges, setSelectedRanges] = useState<Set<number>>(new Set()); // empty => all
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set()); // empty => none

  // view behavior
  const [autoFit, setAutoFit] = useState(true);
  const initialFitDoneRef = useRef(false);

  // markers we add (so we can clean them up)
  const customerMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const dcMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // keep last user camera
  const lastUserViewRef = useRef<{ center: mapboxgl.LngLatLike; zoom: number; bearing: number; pitch: number } | null>(
    null,
  );

  // token
  const MAPBOX_TOKEN = "pk.eyJ1IjoiZXJzaGFkMTExIiwiYSI6ImNtZ204Z2V2ejE3angyanNnM28xdng0aWwifQ.YXPI9Lti9Y6fEoFbYrqzTg";

  // helpers
  const kmToMiles = (km: number) => km * 0.621371;
  const distInUnit = (km: number) => (distanceUnit === "mile" ? kmToMiles(km) : km);
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  const getLat = (x: any) => (typeof x?.lat === "number" ? x.lat : x?.latitude);
  const getLon = (x: any) => (typeof x?.lon === "number" ? x.lon : x?.longitude);
  const getId = (x: any) => x?.id ?? x?.customer_id ?? x?.customer_name ?? x?.name;

  const palette = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444", "#a855f7", "#3b82f6", "#06b6d4"];
  const safeStep = Math.max(1, distanceRangeStep || 0);
  const siteFilterActive = selectedSites.size > 0;
  const isAnyRangeSelected = selectedRanges.size > 0;

  // connections
  const allConnections = useMemo(() => {
    const feats: Array<{
      dcId: string;
      cId: string | number;
      distance: number;
      rangeIndex: number;
      coords: [[number, number], [number, number]];
    }> = [];
    dcs.forEach((dc) => {
      const dLat = getLat(dc),
        dLon = getLon(dc);
      if (typeof dLat !== "number" || typeof dLon !== "number") return;
      (dc.assignedCustomers || []).forEach((c) => {
        const cLat = getLat(c),
          cLon = getLon(c);
        if (typeof cLat !== "number" || typeof cLon !== "number") return;
        const dKm = haversineKm(dLat, dLon, cLat, cLon);
        const dUnit = distInUnit(dKm);
        feats.push({
          dcId: dc.id,
          cId: getId(c),
          distance: dUnit,
          rangeIndex: Math.floor(dUnit / safeStep),
          coords: [
            [dLon, dLat],
            [cLon, cLat],
          ],
        });
      });
    });
    return feats;
  }, [dcs, distanceRangeStep, distanceUnit]);

  // range chips
  const ranges = useMemo(() => {
    if (!allConnections.length) return [];
    const maxDistance = Math.max(...allConnections.map((f) => f.distance), 0);
    const numRanges = Math.ceil(maxDistance / safeStep);
    const unit = distanceUnit === "mile" ? "miles" : "km";
    return Array.from({ length: numRanges }, (_, i) => ({
      index: i,
      label: `${i * safeStep}-${(i + 1) * safeStep} ${unit}`,
      color: palette[i % palette.length],
    }));
  }, [allConnections, safeStep, distanceUnit]);

  // select all sites whenever dcs change
  useEffect(() => {
    setSelectedSites(new Set(dcs.map((dc) => dc.id)));
  }, [dcs]);

  // init map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [0, 20],
      zoom: 2.2,
      renderWorldCopies: false,
      trackResize: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const onMoveEnd = () => {
      lastUserViewRef.current = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };
    };
    map.on("moveend", onMoveEnd);

    // any manual interaction disables further auto-fit
    const disableAutoFit = () => setAutoFit(false);
    map.on("dragstart", disableAutoFit);
    map.on("zoomstart", disableAutoFit);
    map.on("rotatestart", disableAutoFit);
    map.on("pitchstart", disableAutoFit);

    map.on("load", () => {
      setIsLoaded(true);
      onMoveEnd();
    });

    mapRef.current = map;
    return () => {
      map.off("moveend", onMoveEnd);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // keep map sized when container changes (prevents top-left jump on layout changes)
  useEffect(() => {
    if (!mapContainer.current) return;
    const ro = new ResizeObserver(() => {
      const m = mapRef.current;
      if (!m) return;
      m.resize();
      requestAnimationFrame(() => m.resize());
      setTimeout(() => m.resize(), 120);
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, []);

  // render markers
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // clear old
    customerMarkersRef.current.forEach((m) => m.remove());
    dcMarkersRef.current.forEach((m) => m.remove());
    customerMarkersRef.current = [];
    dcMarkersRef.current = [];

    // demand scaling
    const demands = customers.map((c) => c.demand ?? 0);
    const minDemand = demands.length ? Math.min(...demands) : 0;
    const maxDemand = demands.length ? Math.max(...demands) : 0;
    const demandRange = Math.max(0, maxDemand - minDemand);

    // customers
    if (showCustomers) {
      customers.forEach((c) => {
        const lat = getLat(c),
          lon = getLon(c);
        if (typeof lat !== "number" || typeof lon !== "number") return;

        if (siteFilterActive && dcs.length > 0) {
          const assignedDc = dcs.find((dc) => dc.assignedCustomers?.some((ac) => getId(ac) === getId(c)));
          if (assignedDc && !selectedSites.has(assignedDc.id)) return;
        }

        const minSize = 8,
          maxSize = 32;
        const val = typeof c.demand === "number" ? c.demand : minDemand;
        const norm = demandRange > 0 ? (val - minDemand) / demandRange : 0.5;
        const size = minSize + norm * (maxSize - minSize);

        const el = document.createElement("div");
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "50%";
        el.style.background = "rgba(59, 130, 246, 0.75)";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.25)";
        el.style.cursor = "pointer";

        const name = (c as any).customer_name ?? c.name ?? "Customer";
        const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
          `<div style="padding:8px;">
            <strong>${name}</strong><br/>
            ${typeof c.demand === "number" ? `Demand: ${c.demand} ${c.unitOfMeasure ?? ""}<br/>` : ""}
            ${c.product ? `Product: ${c.product}<br/>` : ""}
            Loc: ${lat.toFixed(3)}, ${lon.toFixed(3)}
          </div>`,
        );

        const mk = new mapboxgl.Marker(el).setLngLat([lon, lat]).addTo(map);
        mk.setPopup(popup);
        customerMarkersRef.current.push(mk);
      });
    }

    // dcs
    if (showSites) {
      dcs.forEach((dc) => {
        const lat = getLat(dc),
          lon = getLon(dc);
        if (typeof lat !== "number" || typeof lon !== "number") return;
        if (siteFilterActive && !selectedSites.has(dc.id)) return;

        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.backgroundColor = "#22c55e";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";

        const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
          `<div style="padding:8px;">
            <strong>${dc.id}</strong><br/>
            ${typeof dc.totalDemand === "number" ? `Total Demand: ${dc.totalDemand.toFixed(0)}<br/>` : ""}
            Customers: ${dc.assignedCustomers?.length ?? 0}<br/>
            Loc: ${lat.toFixed(3)}, ${lon.toFixed(3)}
          </div>`,
        );

        const mk = new mapboxgl.Marker(el).setLngLat([lon, lat]).addTo(map);
        mk.setPopup(popup);
        dcMarkersRef.current.push(mk);
      });
    }
  }, [isLoaded, customers, dcs, showCustomers, showSites, selectedSites, siteFilterActive]);

  // lines
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const clearLines = () => {
      if (!map || !map.getStyle()) return;
      try {
        if (map.getLayer("connections-layer")) map.removeLayer("connections-layer");
        if (map.getSource("connections")) map.removeSource("connections");
      } catch (error) {
        console.warn("Error clearing lines:", error);
      }
    };

    clearLines();

    if (!showLines || allConnections.length === 0) return;

    const features = allConnections
      .filter((f) => (siteFilterActive ? selectedSites.has(f.dcId) : true))
      .filter((f) => (isAnyRangeSelected ? selectedRanges.has(f.rangeIndex) : true))
      .map((f) => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: f.coords },
        properties: { color: palette[f.rangeIndex % palette.length] },
      }));

    if (!features.length) return;

    map.addSource("connections", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });
    map.addLayer({
      id: "connections-layer",
      type: "line",
      source: "connections",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 1.8, "line-opacity": 0.8 },
    });

    return () => clearLines();
  }, [isLoaded, showLines, allConnections, selectedRanges, selectedSites, siteFilterActive, isAnyRangeSelected]);

  // data-fit (only when autoFit OR first time data arrives)
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const coords: [number, number][] = [];
    customers.forEach((c) => {
      const lat = getLat(c),
        lon = getLon(c);
      if (typeof lat === "number" && typeof lon === "number") coords.push([lon, lat]);
    });
    dcs.forEach((dc) => {
      const lat = getLat(dc),
        lon = getLon(dc);
      if (typeof lat === "number" && typeof lon === "number") coords.push([lon, lat]);
    });

    if (!coords.length) return;

    if (autoFit || !initialFitDoneRef.current) {
      const bounds = coords.slice(1).reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding: 50, maxZoom: 6 });
      initialFitDoneRef.current = true;
    }
  }, [isLoaded, customers, dcs, autoFit]);

  // simple actions
  const fitNow = () => {
    if (!mapRef.current) return;
    const coords: [number, number][] = [];
    if (showCustomers) {
      customers.forEach((c) => {
        const lat = getLat(c),
          lon = getLon(c);
        if (typeof lat !== "number" || typeof lon !== "number") return;
        if (siteFilterActive && dcs.length > 0) {
          const assignedDc = dcs.find((dc) => dc.assignedCustomers?.some((ac) => getId(ac) === getId(c)));
          if (assignedDc && !selectedSites.has(assignedDc.id)) return;
        }
        coords.push([lon, lat]);
      });
    }
    if (showSites) {
      dcs.forEach((dc) => {
        if (siteFilterActive && !selectedSites.has(dc.id)) return;
        const lat = getLat(dc),
          lon = getLon(dc);
        if (typeof lat === "number" && typeof lon === "number") coords.push([lon, lat]);
      });
    }
    if (!coords.length) return;
    const bounds = coords.slice(1).reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
    mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 6 });
  };

  return (
    <Card className="p-4 h-full">
      {/* header / legend / controls */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <h3 className="text-lg font-semibold">Green Field Analysis — Map</h3>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showCustomers} onChange={(e) => setShowCustomers(e.target.checked)} />
          <span className="flex items-center gap-2">
            <span
              className="inline-block rounded-full"
              style={{ width: 12, height: 12, background: "rgba(59,130,246,0.75)", border: "2px solid white" }}
            />
            Customers (size = demand)
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showSites} onChange={(e) => setShowSites(e.target.checked)} />
          <span className="flex items-center gap-2">
            <span
              className="inline-block"
              style={{ width: 12, height: 12, background: "#22c55e", border: "2px solid white" }}
            />
            Distribution Centers
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} />
          <span className="flex items-center gap-2">
            <span className="inline-block w-8 h-0.5 bg-slate-400" />
            Connections
          </span>
        </label>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoFit} onChange={(e) => setAutoFit(e.target.checked)} />
            Auto-fit
          </label>
          <button onClick={fitNow} className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-50">
            Fit now
          </button>
        </div>
      </div>

      {/* site filter */}
      {dcs.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Filter by site:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSites(new Set(dcs.map((dc) => dc.id)))}
                className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-50"
              >
                All
              </button>
              <button
                onClick={() => setSelectedSites(new Set())}
                className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {dcs.map((dc) => (
              <label key={dc.id} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSites.has(dc.id)}
                  onChange={() =>
                    setSelectedSites((prev) => {
                      const next = new Set(prev);
                      next.has(dc.id) ? next.delete(dc.id) : next.add(dc.id);
                      return next;
                    })
                  }
                />
                <span>{dc.id}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* range chips */}
      {ranges.length > 0 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Distance ranges:</span>
          {ranges.map((r) => {
            const active = selectedRanges.has(r.index) || (!isAnyRangeSelected && true);
            return (
              <button
                key={r.index}
                onClick={() =>
                  setSelectedRanges((prev) => {
                    const next = new Set(prev);
                    next.has(r.index) ? next.delete(r.index) : next.add(r.index);
                    return next;
                  })
                }
                className={`text-xs px-2 py-1 rounded border transition ${active ? "ring-1 ring-black/10" : "opacity-40"}`}
                style={{ backgroundColor: r.color, color: "#000", borderColor: "rgba(0,0,0,0.08)" }}
                title={r.label}
              >
                {r.label}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedRanges(new Set(ranges.map((r) => r.index)))}
            className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-50"
          >
            All
          </button>
          <button
            onClick={() => setSelectedRanges(new Set())}
            className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      )}

      {/* map */}
      <div ref={mapContainer} className="rounded-lg" style={{ height: "520px", width: "100%" }} />
    </Card>
  );
}
