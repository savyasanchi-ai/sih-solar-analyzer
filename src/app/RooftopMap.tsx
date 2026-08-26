"use client";

import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import { Search, Loader2, Navigation } from "lucide-react";

interface RooftopMapProps {
  onAreaCalculated: (areaSqMeters: number) => void;
  cityCoordinates: [number, number];
}

export default function RooftopMap({
  onAreaCalculated,
  cityCoordinates,
}: RooftopMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const searchMarkerRef = useRef<any>(null);

  const [pointCount, setPointCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const pointsRef = useRef<[number, number][]>([]);

  useEffect(() => {
    let L: any;

    const initMap = async () => {
      L = (await import("leaflet")).default;

      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: cityCoordinates,
        zoom: 18,
        maxZoom: 20,
      });

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri Satellite Imagery",
          maxZoom: 20,
        }
      ).addTo(map);

      map.on("click", (e: any) => {
        const newCoord: [number, number] = [e.latlng.lat, e.latlng.lng];
        pointsRef.current.push(newCoord);
        setPointCount(pointsRef.current.length);

        const marker = L.circleMarker(newCoord, {
          radius: 5,
          fillColor: "#d8c29d",
          color: "#1c241f",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        markersRef.current.push(marker);

        if (pointsRef.current.length >= 3) {
          if (polygonRef.current) {
            map.removeLayer(polygonRef.current);
          }

          polygonRef.current = L.polygon(pointsRef.current, {
            color: "#f59e0b",
            weight: 2,
            fillColor: "#f59e0b",
            fillOpacity: 0.35,
            dashArray: "4, 4",
          }).addTo(map);

          const turfCoords = pointsRef.current.map((pt) => [pt[1], pt[0]]);
          turfCoords.push(turfCoords[0]);

          const poly = turf.polygon([turfCoords]);
          const calculatedAreaSqM = Math.round(turf.area(poly));

          if (calculatedAreaSqM > 5) {
            onAreaCalculated(calculatedAreaSqM);
          }
        }
      });

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(cityCoordinates, 18);
    }
  }, [cityCoordinates]);

  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const L = (await import("leaflet")).default;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ", India"
        )}`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        mapInstanceRef.current.flyTo([lat, lon], 19, {
          duration: 1.5,
        });

        if (searchMarkerRef.current) {
          mapInstanceRef.current.removeLayer(searchMarkerRef.current);
        }

        searchMarkerRef.current = L.marker([lat, lon])
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>${data[0].display_name.split(",")[0]}</b><br/>Ready for rooftop tracing.`)
          .openPopup();
      } else {
        setSearchError("Location not found. Try a specific landmark.");
      }
    } catch {
      setSearchError("Search error. Check network connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    if (!mapInstanceRef.current) return;
    if (polygonRef.current) {
      mapInstanceRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
    if (searchMarkerRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }
    markersRef.current.forEach((m) => mapInstanceRef.current.removeLayer(m));
    markersRef.current = [];
    pointsRef.current = [];
    setPointCount(0);
    onAreaCalculated(120);
  };

  return (
    <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-[#2c372f] shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Address Search Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-col gap-1.5 sm:max-w-md">
        <form onSubmit={handleSearchAddress} className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search any rooftop / landmark in India..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c241f]/95 text-[#f7f5f0] text-xs px-3.5 py-2.5 rounded-xl border border-white/20 placeholder-white/50 backdrop-blur-md outline-none focus:border-[#d8c29d] shadow-xl"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2.5 bg-[#d8c29d] hover:bg-[#e4d3b5] text-[#1c241f] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xl shrink-0 disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            <span>Locate</span>
          </button>
        </form>

        {searchError && (
          <span className="text-[10px] bg-red-950/80 text-red-200 border border-red-700/50 px-2.5 py-1 rounded-lg backdrop-blur-md">
            {searchError}
          </span>
        )}
      </div>

      {/* Status & Reset Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        <div className="bg-[#1c241f]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-[#f7f5f0] flex items-center gap-2 shadow-lg pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
          <span>Click 3+ corners to trace rooftop boundaries</span>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-[#1c241f]/90 hover:bg-[#2c372f] backdrop-blur-md border border-white/10 text-xs font-semibold text-[#f7f5f0] transition shadow-lg"
        >
          Reset ({pointCount} pts)
        </button>
      </div>
    </div>
  );
}