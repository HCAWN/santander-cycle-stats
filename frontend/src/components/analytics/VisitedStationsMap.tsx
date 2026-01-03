import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Ride } from "../../types/ride";
import type { Station } from "../../schemas/station";

// Fix for default marker icons in react-leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface VisitedStationsMapProps {
  rides: Ride[];
  stations: Station[]; // All stations
  selectedStations?: Set<string>; // Selected stations from table
}

// Component to fit map bounds to show all stations
function MapBounds({ stations }: { stations: Station[] }) {
  const map = useMap();

  useMemo(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((s) => [s.lat, s.long] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, stations]);

  return null;
}

// Component for markers that scale with zoom
function ZoomAwareMarker({
  station,
  visits,
  getColorForVisits,
}: {
  station: Station;
  visits: number;
  getColorForVisits: (visits: number) => string;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
    };

    map.on("zoomend", updateZoom);
    map.on("zoom", updateZoom);

    return () => {
      map.off("zoomend", updateZoom);
      map.off("zoom", updateZoom);
    };
  }, [map]);

  // Calculate icon size based on zoom level
  // Base size at zoom 12, scales up/down with zoom
  const baseSize = 12;
  const minSize = 8;
  const maxSize = 24;
  const size = Math.max(
    minSize,
    Math.min(maxSize, baseSize * Math.pow(1.2, zoom - 12))
  );

  const color = getColorForVisits(visits);
  const icon = L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 1px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  return (
    <Marker position={[station.lat, station.long]} icon={icon}>
      <Popup>
        <div className="text-sm">
          <div className="font-semibold mb-1">{station.name}</div>
          <div className="text-gray-600">Terminal: {station.terminalName}</div>
          <div className="mt-2">
            <span className="font-medium">Visits: {visits}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {station.nbBikes} bikes available
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Helper function to calculate distance between two lat/long points (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Match station by name similarity (fuzzy matching)
function findStationByName(
  address: string | null,
  stations: Station[]
): Station | null {
  if (!address) return null;

  const normalizedAddress = address.toLowerCase().trim();

  // Try exact match first
  for (const station of stations) {
    const stationName = station.name.toLowerCase();
    if (
      normalizedAddress.includes(stationName) ||
      stationName.includes(normalizedAddress)
    ) {
      return station;
    }
  }

  // Try matching by terminal name if address contains numbers
  const terminalMatch = normalizedAddress.match(/\d{6}/);
  if (terminalMatch) {
    const terminal = terminalMatch[0];
    const station = stations.find((s) => s.terminalName === terminal);
    if (station) return station;
  }

  // Try partial word matching
  const addressWords = normalizedAddress
    .split(/[,\s]+/)
    .filter((w) => w.length > 2);
  for (const station of stations) {
    const stationWords = station.name.toLowerCase().split(/[,\s]+/);
    const matchingWords = addressWords.filter((aw) =>
      stationWords.some((sw) => sw.includes(aw) || aw.includes(sw))
    );
    // If at least 2 words match, consider it a match
    if (matchingWords.length >= 2) {
      return station;
    }
  }

  return null;
}

// Parse address string to extract lat/long if available
function parseAddress(
  address: string | null
): { lat: number; lon: number } | null {
  if (!address) return null;

  // Check if address contains coordinates pattern
  const coordMatch = address.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lon: parseFloat(coordMatch[2]),
    };
  }

  return null;
}

// Match a ride's start/end address to the nearest station
function findNearestStation(
  lat: number,
  lon: number,
  stations: Station[],
  maxDistanceKm: number = 0.5 // 500 meters default
): Station | null {
  let nearest: Station | null = null;
  let minDistance = maxDistanceKm;

  for (const station of stations) {
    const distance = calculateDistance(lat, lon, station.lat, station.long);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

export default function VisitedStationsMap({
  rides,
  stations,
  selectedStations,
}: VisitedStationsMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUnvisitedStations, setShowUnvisitedStations] = useState(true);

  const stationVisitCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const stationMap = new Map<string, Station>();

    // Create a map of stations by ID for quick lookup
    stations.forEach((station) => {
      stationMap.set(station.id, station);
    });

    // Count visits to each station
    rides.forEach((ride) => {
      // Try to match start address by name first
      let startStation = findStationByName(ride.startAddress, stations);

      // If name matching fails, try coordinates
      if (!startStation && ride.startAddress) {
        const startCoords = parseAddress(ride.startAddress);
        if (startCoords) {
          startStation = findNearestStation(
            startCoords.lat,
            startCoords.lon,
            stations
          );
        }
      }

      if (startStation) {
        counts.set(startStation.id, (counts.get(startStation.id) || 0) + 1);
      }

      // Try to match end address by name first
      let endStation = findStationByName(ride.endAddress, stations);

      // If name matching fails, try coordinates
      if (!endStation && ride.endAddress) {
        const endCoords = parseAddress(ride.endAddress);
        if (endCoords) {
          endStation = findNearestStation(
            endCoords.lat,
            endCoords.lon,
            stations
          );
        }
      }

      if (endStation) {
        counts.set(endStation.id, (counts.get(endStation.id) || 0) + 1);
      }
    });

    return counts;
  }, [rides, stations]);

  // Calculate max visits for normalization
  const maxVisits = useMemo(() => {
    if (stationVisitCounts.size === 0) return 1;
    return Math.max(...Array.from(stationVisitCounts.values()));
  }, [stationVisitCounts]);

  // Filter stations to show based on selection and toggle
  // Selected stations (visited, from table) and unvisited stations are completely separate
  const stationsToShow = useMemo(() => {
    const result: Station[] = [];

    // Always show selected stations (these are visited stations from the table)
    if (selectedStations && selectedStations.size > 0) {
      const selected = stations.filter((s) => selectedStations.has(s.id));
      result.push(...selected);
    }

    // Separately, show/hide unvisited stations based on toggle
    if (showUnvisitedStations) {
      const unvisited = stations.filter(
        (s) => (stationVisitCounts.get(s.id) || 0) === 0
      );
      result.push(...unvisited);
    }

    return result;
  }, [stations, selectedStations, showUnvisitedStations, stationVisitCounts]);

  // Get color based on visit frequency (red to yellow to green)
  const getColorForVisits = (visits: number): string => {
    if (visits === 0) return "#9CA3AF"; // Gray for unvisited
    const normalized = visits / maxVisits;
    if (normalized < 0.33) {
      // Red to Yellow
      const ratio = normalized / 0.33;
      const r = 255;
      const g = Math.round(255 * ratio);
      const b = 0;
      return `rgb(${r}, ${g}, ${b})`;
    } else if (normalized < 0.67) {
      // Yellow to Green
      const ratio = (normalized - 0.33) / 0.34;
      const r = Math.round(255 * (1 - ratio));
      const g = 255;
      const b = 0;
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Green
      return "rgb(34, 197, 94)"; // green-500
    }
  };

  if (stations.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          Visited Stations Map
        </h3>
        <p className="text-gray-600">Loading station data...</p>
      </div>
    );
  }

  const mapElement = (
    <div
      className={`${
        isFullscreen
          ? "fixed inset-0 z-50 bg-white"
          : "h-96 rounded-lg overflow-hidden border border-gray-300"
      }`}
    >
      {isFullscreen && (
        <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">
              Visited Stations Map
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {showUnvisitedStations
                ? "All docking stations are shown on the map."
                : "Only stations you've visited are shown."}{" "}
              Stations you've visited are colored by frequency:{" "}
              <span className="text-red-600">red</span> (few visits) →{" "}
              <span className="text-yellow-600">yellow</span> (moderate) →{" "}
              <span className="text-green-600">green</span> (many visits).
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnvisitedStations}
                onChange={(e) => setShowUnvisitedStations(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Show unvisited stations
              </span>
            </label>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              aria-label="Exit fullscreen"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Exit Fullscreen
            </button>
          </div>
        </div>
      )}
      <MapContainer
        center={[51.5074, -0.1278]} // London center
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds stations={stationsToShow} />
        {stationsToShow.map((station) => {
          const visits = stationVisitCounts.get(station.id) || 0;
          return (
            <ZoomAwareMarker
              key={station.id}
              station={station}
              visits={visits}
              getColorForVisits={getColorForVisits}
            />
          );
        })}
      </MapContainer>
    </div>
  );

  if (isFullscreen) {
    return mapElement;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Visited Stations Map
          </h3>
          <p className="text-gray-600 text-sm">
            {showUnvisitedStations
              ? "All docking stations are shown on the map."
              : "Only stations you've visited are shown."}{" "}
            Stations you've visited are colored by frequency:{" "}
            <span className="text-red-600">red</span> (few visits) →{" "}
            <span className="text-yellow-600">yellow</span> (moderate) →{" "}
            <span className="text-green-600">green</span> (many visits). Hover
            over markers to see station names and visit counts.
          </p>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnvisitedStations}
              onChange={(e) => setShowUnvisitedStations(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 whitespace-nowrap">
              Show unvisited stations
            </span>
          </label>
          <button
            onClick={() => setIsFullscreen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0"
            aria-label="Enter fullscreen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zM17 4a1 1 0 00-1-1h-4a1 1 0 100 2h1.586l-2.293 2.293a1 1 0 101.414 1.414L15 6.414V8a1 1 0 102 0V4zM3 16a1 1 0 001 1h4a1 1 0 100-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414L5 13.586V12a1 1 0 00-2 0v4zM17 16a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 112 0v4z" />
            </svg>
            Fullscreen
          </button>
        </div>
      </div>
      {mapElement}
    </div>
  );
}
