"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import {
  Search,
  Loader2,
  Sun,
  Play,
  Pause,
  Layers,
  Compass,
  Building2,
  Clock,
} from "lucide-react";

interface RooftopMapProps {
  onAreaCalculated: (areaSqMeters: number) => void;
  onShadingCalculated?: (shadingPercent: number) => void;
  cityCoordinates: [number, number];
}

// Approximate Solar Position (Elevation & Azimuth) Algorithm
function calculateSunPosition(lat: number, lon: number, hour: number, dayOfYear: number = 172) {
  const rad = Math.PI / 180;
  // Solar Declination
  const delta = 23.45 * Math.sin(rad * ((360 / 365) * (dayOfYear - 81)));
  // Solar Hour Angle
  const omega = (hour - 12) * 15;

  // Solar Elevation Angle (Altitude)
  const sinAlpha =
    Math.sin(lat * rad) * Math.sin(delta * rad) +
    Math.cos(lat * rad) * Math.cos(delta * rad) * Math.cos(omega * rad);
  const alpha = Math.asin(Math.max(-1, Math.min(1, sinAlpha))) / rad;

  // Solar Azimuth Angle
  const cosTheta =
    (sinAlpha * Math.sin(lat * rad) - Math.sin(delta * rad)) /
    (Math.cos(Math.max(0.01, alpha) * rad) * Math.cos(lat * rad));
  let theta = Math.acos(Math.max(-1, Math.min(1, cosTheta))) / rad;
  if (omega > 0) theta = 360 - theta;

  return {
    altitude: Math.max(0, Math.round(alpha * 10) / 10),
    azimuth: Math.round(theta * 10) / 10,
    isDaylight: alpha > 2,
  };
}

export default function RooftopMap({
  onAreaCalculated,
  onShadingCalculated,
  cityCoordinates,
}: RooftopMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const shadowLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const searchMarkerRef = useRef<any>(null);

  const [pointCount, setPointCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 3D Sun Path & Shadow States
  const [simHour, setSimHour] = useState<number>(13.5); // 1:30 PM default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [obstacleHeight, setObstacleHeight] = useState<number>(1.8); // 1.8m parapet / water tank
  const [seasonDay, setSeasonDay] = useState<number>(172); // Summer Solstice (172) vs Winter (355)

  const pointsRef = useRef<[number, number][]>([]);

  // Calculate sun metrics based on current latitude & time
  const sunData = calculateSunPosition(cityCoordinates[0], cityCoordinates[1], simHour, seasonDay);

  // Render Dynamic Shadow Polygon
  const updateShadowProjection = useCallback(
    (L: any, map: any, points: [number, number][], sun: ReturnType<typeof calculateSunPosition>) => {
      if (!map || points.length < 3) return;

      if (shadowLayerRef.current) {
        map.removeLayer(shadowLayerRef.current);
        shadowLayerRef.current = null;
      }

      if (!sun.isDaylight || sun.altitude <= 3) {
        if (onShadingCalculated) onShadingCalculated(sun.isDaylight ? 40 : 100);
        return;
      }

      // Shadow Length Multiplier (L = H / tan(alpha))
      const shadowLengthMeters = obstacleHeight / Math.tan((sun.altitude * Math.PI) / 180);
      const effectiveShadow = Math.min(shadowLengthMeters, 15); // limit max visual projection

      // Shadow Direction (Opposite to Azimuth angle)
      const shadowAngleRad = ((sun.azimuth + 180) % 360) * (Math.PI / 180);
      const latOffset = (effectiveShadow * Math.cos(shadowAngleRad)) / 111111;
      const lngOffset =
        (effectiveShadow * Math.sin(shadowAngleRad)) /
        (111111 * Math.cos((points[0][0] * Math.PI) / 180));

      // Create offset polygon representing cast shadow from parapet
      const shadowCoords = points.map((pt) => [pt[0] + latOffset * 0.4, pt[1] + lngOffset * 0.4]);

      shadowLayerRef.current = L.polygon(shadowCoords, {
        color: "#0f172a",
        weight: 1,
        fillColor: "#020617",
        fillOpacity: 0.48,
        dashArray: "2, 4",
      }).addTo(map);

      // Estimate shaded percentage of rooftop
      const rawShadeLoss = Math.min(35, Math.round((effectiveShadow / 18) * 24));
      if (onShadingCalculated) {
        onShadingCalculated(rawShadeLoss);
      }
    },
    [obstacleHeight, onShadingCalculated]
  );

  // Initialize Leaflet Map
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

          const currentSun = calculateSunPosition(cityCoordinates[0], cityCoordinates[1], simHour, seasonDay);
          updateShadowProjection(L, map, pointsRef.current, currentSun);
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

  // Update center when city changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(cityCoordinates, 18);
    }
  }, [cityCoordinates]);

  // Update shadow when time, obstacle height, or season changes
  useEffect(() => {
    if (mapInstanceRef.current && pointsRef.current.length >= 3) {
      import("leaflet").then((L) => {
        const sun = calculateSunPosition(cityCoordinates[0], cityCoordinates[1], simHour, seasonDay);
        updateShadowProjection(L.default, mapInstanceRef.current, pointsRef.current, sun);
      });
    }
  }, [simHour, obstacleHeight, seasonDay, cityCoordinates, updateShadowProjection]);

  // Automated Sun Path Animation Loop
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setSimHour((prev) => {
          if (prev >= 18) return 6;
          return Math.round((prev + 0.25) * 100) / 100;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

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
    if (shadowLayerRef.current) {
      mapInstanceRef.current.removeLayer(shadowLayerRef.current);
      shadowLayerRef.current = null;
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
    if (onShadingCalculated) onShadingCalculated(10);
  };

  // Format hour float to readable 12-hr format (e.g. 13.5 -> 01:30 PM)
  const formatTime = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    const period = hrs >= 12 ? "PM" : "AM";
    const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
    return `${displayHrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="relative w-full h-[540px] rounded-3xl overflow-hidden border border-[#2c372f] shadow-2xl flex flex-col">
      {/* Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Address Search Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-col gap-1.5 sm:max-w-md">
        <form onSubmit={handleSearchAddress} className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search rooftop / landmark in India..."
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

      {/* Top-Right Solar Position Telemetry Card */}
      <div className="absolute top-3 right-3 z-[400] hidden md:flex flex-col gap-1 bg-[#1c241f]/90 backdrop-blur-md p-2.5 rounded-2xl border border-white/15 text-[#f7f5f0] shadow-xl text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-[#d8c29d] font-bold">
          <Sun className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "12s" }} />
          <span>Solar Vector</span>
        </div>
        <div className="flex justify-between gap-4 text-white/70">
          <span>Altitude (&alpha;):</span>
          <span className="text-white font-bold">{sunData.altitude}&deg;</span>
        </div>
        <div className="flex justify-between gap-4 text-white/70">
          <span>Azimuth (&theta;):</span>
          <span className="text-white font-bold">{sunData.azimuth}&deg;</span>
        </div>
      </div>

      {/* Bottom Floating 3D Sun Path & Shadow Slider Widget */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] bg-[#1c241f]/95 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-[#f7f5f0] shadow-2xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-[#d8c29d] hover:bg-[#e4d3b5] text-[#1c241f] font-bold transition flex items-center gap-1 text-[11px]"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? "Pause" : "Play Orbit"}</span>
            </button>
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300">
              <Clock className="h-3.5 w-3.5" /> {formatTime(simHour)}
            </div>
          </div>

          {/* Season & Parapet Controls */}
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <div className="flex items-center gap-1">
              <span className="text-white/60">Season:</span>
              <button
                onClick={() => setSeasonDay(seasonDay === 172 ? 355 : 172)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold"
              >
                {seasonDay === 172 ? "Summer (Jun)" : "Winter (Dec)"}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-white/60">Obstacle:</span>
              <button
                onClick={() => setObstacleHeight(obstacleHeight === 1.8 ? 3.0 : 1.8)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-amber-300 font-bold"
              >
                {obstacleHeight}m Wall
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-0.5 rounded bg-red-900/50 hover:bg-red-900/80 text-red-200 transition font-bold"
            >
              Reset ({pointCount} pts)
            </button>
          </div>
        </div>

        {/* Hour Slider with Sun Icons */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-white/60 font-mono">
            <span>06:00 AM (Sunrise)</span>
            <span>12:00 PM (Solar Noon)</span>
            <span>06:00 PM (Sunset)</span>
          </div>
          <input
            type="range"
            min="6"
            max="18"
            step="0.1"
            value={simHour}
            onChange={(e) => {
              setIsPlaying(false);
              setSimHour(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#d8c29d]"
          />
        </div>
      </div>
    </div>
  );
}