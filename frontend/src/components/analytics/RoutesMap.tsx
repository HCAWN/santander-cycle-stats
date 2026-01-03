import { useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Station } from "../../schemas/station";

interface Route {
  startStation: Station;
  endStation: Station;
  count: number;
}

interface RoutesMapProps {
  routes: Route[];
}

// Component to fit map bounds to show all routes
function MapBounds({ routes }: { routes: Route[] }) {
  const map = useMap();

  useMemo(() => {
    const allPoints: [number, number][] = [];

    // Only add route endpoints if routes exist (don't show anything if no routes selected)
    if (routes.length > 0) {
      routes.forEach((r) => {
        allPoints.push([r.startStation.lat, r.startStation.long]);
        allPoints.push([r.endStation.lat, r.endStation.long]);
      });
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, routes]);

  return null;
}

// Fixed blue color matching station icons
const ROUTE_COLOR = "#3B82F6"; // blue-500

export default function RoutesMap({ routes }: RoutesMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate max count for color normalization
  const maxCount = useMemo(() => {
    if (routes.length === 0) return 1;
    return Math.max(...routes.map((r) => r.count));
  }, [routes]);

  // Get all unique stations from routes only (don't show stations if no routes selected)
  const stationsToShow = useMemo(() => {
    if (routes.length > 0) {
      const stationMap = new Map<string, Station>();
      routes.forEach((route) => {
        stationMap.set(route.startStation.id, route.startStation);
        stationMap.set(route.endStation.id, route.endStation);
      });
      return Array.from(stationMap.values());
    }
    return []; // Show nothing if no routes selected
  }, [routes]);

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
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Route Map</h3>
            <p className="text-gray-600 text-sm mt-1">
              {routes.length > 0 &&
                `Showing ${routes.length} selected route${
                  routes.length !== 1 ? "s" : ""
                } as straight lines between stations.`}
            </p>
          </div>
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
        <MapBounds routes={routes} />

        {/* Draw routes as straight lines */}
        {routes.length > 0 &&
          routes.map((route, index) => {
            const weight = Math.max(
              2,
              Math.min(8, 2 + (route.count / maxCount) * 6)
            );

            return (
              <Polyline
                key={`${route.startStation.id}-${route.endStation.id}-${index}`}
                positions={[
                  [route.startStation.lat, route.startStation.long],
                  [route.endStation.lat, route.endStation.long],
                ]}
                color={ROUTE_COLOR}
                weight={weight}
                opacity={0.7}
              />
            );
          })}

        {/* Show station markers only if there are routes */}
        {routes.length > 0 &&
          stationsToShow.map((station) => (
            <Marker
              key={station.id}
              position={[station.lat, station.long]}
              icon={L.divIcon({
                className: "custom-marker",
                html: `<div style="
                background-color: #3B82F6;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                border: 1px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5],
              })}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold mb-1">{station.name}</div>
                  <div className="text-gray-600">
                    Terminal: {station.terminalName}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
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
            Route Map
          </h3>
          <p className="text-gray-600 text-sm">
            {routes.length > 0 &&
              `Showing ${routes.length} selected route${
                routes.length !== 1 ? "s" : ""
              } as straight lines between stations. Line thickness indicates route frequency.`}
          </p>
        </div>
        <button
          onClick={() => setIsFullscreen(true)}
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0"
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
      {mapElement}
    </div>
  );
}
