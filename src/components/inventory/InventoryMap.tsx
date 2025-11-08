import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Customer, Facility, Plant } from "@/types/inventory";

interface InventoryMapProps {
  customers: Customer[];
  facilities: Facility[];
  plants: Plant[];
}

export function InventoryMap({ customers, facilities, plants }: InventoryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken] = useState("pk.eyJ1IjoiZXJzaGFkMTExIiwiYSI6ImNtZ204Z2V2ejE3angyanNnM28xdng0aWwifQ.YXPI9Lti9Y6fEoFbYrqzTg");
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    if (map.current) return; // Already initialized

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-95, 37],
        zoom: 3.5,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.current.on('load', () => {
        setIsMapInitialized(true);
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current || !isMapInitialized) return;

    const addMarkers = () => {
      if (!map.current) return;

      // Clear existing markers
      const markers = document.getElementsByClassName("mapboxgl-marker");
      while (markers[0]) {
        markers[0].remove();
      }

      // Add customer markers (triangle)
      customers.forEach((customer) => {
      if (customer.lat && customer.lon) {
        const el = document.createElement("div");
        el.className = "marker";
        el.style.width = "0";
        el.style.height = "0";
        el.style.borderLeft = "6px solid transparent";
        el.style.borderRight = "6px solid transparent";
        el.style.borderBottom = "12px solid #3b82f6";
        el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.3))";
        
        // Add label
        const label = document.createElement("div");
        label.className = "marker-label";
        label.style.position = "absolute";
        label.style.top = "15px";
        label.style.left = "50%";
        label.style.transform = "translateX(-50%)";
        label.style.backgroundColor = "white";
        label.style.padding = "2px 6px";
        label.style.borderRadius = "4px";
        label.style.fontSize = "10px";
        label.style.fontWeight = "600";
        label.style.whiteSpace = "nowrap";
        label.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        label.textContent = customer.customer_name;
        el.appendChild(label);

        new mapboxgl.Marker(el)
          .setLngLat([customer.lon, customer.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<strong>Customer: ${customer.customer_name}</strong><br/>
              ${customer.city ? `${customer.city}, ` : ""}
              ${customer.region ? `${customer.region}, ` : ""}
              ${customer.country || ""}`
            )
          )
          .addTo(map.current);
      }
    });

    // Add facility markers (square)
    facilities.forEach((facility) => {
      if (facility.lat && facility.lon) {
        const el = document.createElement("div");
        el.className = "marker";
        el.style.backgroundColor = "#22c55e";
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        
        // Add label
        const label = document.createElement("div");
        label.className = "marker-label";
        label.style.position = "absolute";
        label.style.top = "18px";
        label.style.left = "50%";
        label.style.transform = "translateX(-50%)";
        label.style.backgroundColor = "white";
        label.style.padding = "2px 6px";
        label.style.borderRadius = "4px";
        label.style.fontSize = "10px";
        label.style.fontWeight = "600";
        label.style.whiteSpace = "nowrap";
        label.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        label.textContent = facility.facility_name;
        el.appendChild(label);

        new mapboxgl.Marker(el)
          .setLngLat([facility.lon, facility.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<strong>Facility: ${facility.facility_name}</strong><br/>
              Type: ${facility.facility_type}<br/>
              ${facility.city ? `${facility.city}, ` : ""}
              ${facility.region ? `${facility.region}, ` : ""}
              ${facility.country || ""}`
            )
          )
          .addTo(map.current);
      }
    });

    // Add plant markers (diamond)
    plants.forEach((plant) => {
      if (plant.lat && plant.lon) {
        const el = document.createElement("div");
        el.className = "marker";
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.backgroundColor = "#f97316";
        el.style.transform = "rotate(45deg)";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        
        // Add label
        const label = document.createElement("div");
        label.className = "marker-label";
        label.style.position = "absolute";
        label.style.top = "20px";
        label.style.left = "50%";
        label.style.transform = "translateX(-50%) rotate(-45deg)";
        label.style.backgroundColor = "white";
        label.style.padding = "2px 6px";
        label.style.borderRadius = "4px";
        label.style.fontSize = "10px";
        label.style.fontWeight = "600";
        label.style.whiteSpace = "nowrap";
        label.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        label.textContent = plant.plant_name;
        el.appendChild(label);

        new mapboxgl.Marker(el)
          .setLngLat([plant.lon, plant.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<strong>Plant: ${plant.plant_name}</strong><br/>
              ${plant.city ? `${plant.city}, ` : ""}
              ${plant.region ? `${plant.region}, ` : ""}
              ${plant.country || ""}`
            )
          )
          .addTo(map.current!);
      }
    });

    // Draw connection lines: Plant -> Facility -> Customer
    if (map.current.getSource('connections')) {
      map.current.removeLayer('connections-layer');
      map.current.removeSource('connections');
    }

    const connectionLines: any[] = [];
    
    // Connect facilities to plants
    facilities.forEach((facility) => {
      if (facility.lat && facility.lon && plants.length > 0) {
        const nearestPlant = plants.reduce((nearest, plant) => {
          if (!plant.lat || !plant.lon) return nearest;
          const dist = Math.sqrt(
            Math.pow(plant.lat - facility.lat, 2) + Math.pow(plant.lon - facility.lon, 2)
          );
          if (!nearest || dist < nearest.distance) {
            return { plant, distance: dist };
          }
          return nearest;
        }, null as any);

        if (nearestPlant?.plant.lat && nearestPlant?.plant.lon) {
          connectionLines.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [nearestPlant.plant.lon, nearestPlant.plant.lat],
                [facility.lon, facility.lat]
              ]
            }
          });
        }
      }
    });

    // Connect customers to facilities
    customers.forEach((customer) => {
      if (customer.lat && customer.lon && facilities.length > 0) {
        const nearestFacility = facilities.reduce((nearest, facility) => {
          if (!facility.lat || !facility.lon) return nearest;
          const dist = Math.sqrt(
            Math.pow(facility.lat - customer.lat, 2) + Math.pow(facility.lon - customer.lon, 2)
          );
          if (!nearest || dist < nearest.distance) {
            return { facility, distance: dist };
          }
          return nearest;
        }, null as any);

        if (nearestFacility?.facility.lat && nearestFacility?.facility.lon) {
          connectionLines.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [nearestFacility.facility.lon, nearestFacility.facility.lat],
                [customer.lon, customer.lat]
              ]
            }
          });
        }
      }
    });

    if (connectionLines.length > 0) {
      map.current.addSource('connections', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: connectionLines
        }
      });

      map.current.addLayer({
        id: 'connections-layer',
        type: 'line',
        source: 'connections',
        paint: {
          'line-color': '#94a3b8',
          'line-width': 1.5,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2]
        }
      });
    }
    };

    if (map.current.loaded()) {
      addMarkers();
    } else {
      map.current.on('load', addMarkers);
    }

    return () => {
      if (map.current) {
        map.current.off('load', addMarkers);
      }
    };
  }, [customers, facilities, plants, isMapInitialized]);


  return (
    <Card className="p-4 h-full">
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold">Location Map</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-blue-500"></div>
            <span>Customers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 border-2 border-white"></div>
            <span>Facilities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 border-2 border-white transform rotate-45"></div>
            <span>Plants</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-slate-400 border-dashed"></div>
            <span>Connections</span>
          </div>
        </div>
      </div>
      <div ref={mapContainer} className="h-[600px] rounded-lg" />
    </Card>
  );
}
