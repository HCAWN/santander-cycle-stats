import { useState, useMemo, useEffect, useRef } from "react";
import type { Ride } from "../../types/ride";
import type { Station } from "../../schemas/station";

interface RoutesTableProps {
  rides: Ride[];
  stations: Station[];
  selectedRoutes?: Set<string>;
  onRouteSelectionChange?: (selectedRoutes: Set<string>) => void;
  onRoutesCalculated?: (routes: RouteStats[]) => void;
}

type SortField =
  | "startStation"
  | "endStation"
  | "count"
  | "distance"
  | "avgDuration"
  | "minDuration"
  | "maxDuration";
type SortDirection = "none" | "asc" | "desc";

export interface RouteStats {
  startStation: Station;
  endStation: Station;
  count: number;
  avgDurationMinutes: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  distanceKm: number;
}

// Calculate distance between two lat/long points using Haversine formula (returns km)
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

export default function RoutesTable({
  rides,
  stations,
  selectedRoutes: externalSelectedRoutes,
  onRouteSelectionChange,
  onRoutesCalculated,
}: RoutesTableProps) {
  const [sortField, setSortField] = useState<SortField>("count");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [internalSelectedRoutes, setInternalSelectedRoutes] = useState<
    Set<string>
  >(new Set());

  // Use external state if provided, otherwise use internal state
  const selectedRoutes = externalSelectedRoutes ?? internalSelectedRoutes;
  const setSelectedRoutes = onRouteSelectionChange ?? setInternalSelectedRoutes;
  const initializedRef = useRef(false);

  // Calculate route stats
  const routeStats = useMemo(() => {
    const routesMap = new Map<string, RouteStats>();

    rides.forEach((ride) => {
      const startStation = findStationByName(ride.startAddress, stations);
      const endStation = findStationByName(ride.endAddress, stations);

      // Only count routes where both stations are identified
      if (startStation && endStation) {
        const routeKey = `${startStation.id}-${endStation.id}`;
        const existing = routesMap.get(routeKey);

        // Calculate distance between stations
        const distanceKm = calculateDistance(
          startStation.lat,
          startStation.long,
          endStation.lat,
          endStation.long
        );

        // Calculate duration if available
        let durationMinutes: number | null = null;
        if (ride.startTimeMs !== null && ride.endTimeMs !== null) {
          const durationMs = ride.endTimeMs - ride.startTimeMs;
          durationMinutes = Math.round(durationMs / 60000);
        }

        if (existing) {
          existing.count++;
          // Update average, min, and max duration
          if (durationMinutes !== null) {
            if (existing.avgDurationMinutes === null) {
              existing.avgDurationMinutes = durationMinutes;
            } else {
              // Recalculate average
              const totalDuration =
                existing.avgDurationMinutes * (existing.count - 1) +
                durationMinutes;
              existing.avgDurationMinutes = Math.round(
                totalDuration / existing.count
              );
            }
            // Update min duration
            if (
              existing.minDurationMinutes === null ||
              durationMinutes < existing.minDurationMinutes
            ) {
              existing.minDurationMinutes = durationMinutes;
            }
            // Update max duration
            if (
              existing.maxDurationMinutes === null ||
              durationMinutes > existing.maxDurationMinutes
            ) {
              existing.maxDurationMinutes = durationMinutes;
            }
          }
        } else {
          routesMap.set(routeKey, {
            startStation,
            endStation,
            count: 1,
            avgDurationMinutes: durationMinutes,
            minDurationMinutes: durationMinutes,
            maxDurationMinutes: durationMinutes,
            distanceKm,
          });
        }
      }
    });

    return Array.from(routesMap.values());
  }, [rides, stations]);

  // Notify parent of calculated routes
  useEffect(() => {
    if (onRoutesCalculated) {
      onRoutesCalculated(routeStats);
    }
  }, [routeStats, onRoutesCalculated]);

  // Auto-select all routes on first load
  useEffect(() => {
    if (
      routeStats.length > 0 &&
      !initializedRef.current &&
      selectedRoutes.size === 0
    ) {
      const allRouteKeys = new Set(
        routeStats.map((r) => `${r.startStation.id}-${r.endStation.id}`)
      );
      setSelectedRoutes(allRouteKeys);
      initializedRef.current = true;
    }
  }, [routeStats, selectedRoutes.size, setSelectedRoutes]);

  // Sort routes
  const sortedRoutes = useMemo(() => {
    const sorted = [...routeStats];

    if (sortDirection === "none") {
      return sorted;
    }

    sorted.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case "startStation":
          aValue = a.startStation.name.toLowerCase();
          bValue = b.startStation.name.toLowerCase();
          break;
        case "endStation":
          aValue = a.endStation.name.toLowerCase();
          bValue = b.endStation.name.toLowerCase();
          break;
        case "count":
          aValue = a.count;
          bValue = b.count;
          break;
        case "avgDuration":
          aValue = a.avgDurationMinutes ?? 0;
          bValue = b.avgDurationMinutes ?? 0;
          break;
        case "minDuration":
          aValue = a.minDurationMinutes ?? 0;
          bValue = b.minDurationMinutes ?? 0;
          break;
        case "maxDuration":
          aValue = a.maxDurationMinutes ?? 0;
          bValue = b.maxDurationMinutes ?? 0;
          break;
        case "distance":
          aValue = a.distanceKm;
          bValue = b.distanceKm;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [routeStats, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: desc -> asc -> none -> desc
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection("none");
      } else {
        setSortDirection("desc");
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getRouteKey = (route: RouteStats): string => {
    return `${route.startStation.id}-${route.endStation.id}`;
  };

  const handleCheckboxChange = (route: RouteStats, checked: boolean) => {
    const routeKey = getRouteKey(route);
    const newSelected = new Set(selectedRoutes);
    if (checked) {
      newSelected.add(routeKey);
    } else {
      newSelected.delete(routeKey);
    }
    setSelectedRoutes(newSelected);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field || sortDirection === "none") {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0-12l-4 4m4-4l4 4"
          />
        </svg>
      );
    }
    if (sortDirection === "asc") {
      return (
        <svg
          className="w-4 h-4 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  if (sortedRoutes.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Route Statistics
        </h3>
        <p className="text-gray-600">No routes found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Route Statistics
      </h3>
      <p className="text-gray-600 mb-4 text-sm">
        Click column headers to sort. Shows the most common routes you've taken
        between stations.
      </p>
      <div className="overflow-x-auto overflow-y-auto max-h-[520px] border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={
                    sortedRoutes.length > 0 &&
                    sortedRoutes.every((r) =>
                      selectedRoutes.has(getRouteKey(r))
                    )
                  }
                  onChange={(e) => {
                    const newSelected = new Set<string>();
                    if (e.target.checked) {
                      sortedRoutes.forEach((r) =>
                        newSelected.add(getRouteKey(r))
                      );
                    }
                    setSelectedRoutes(newSelected);
                  }}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("startStation")}
              >
                <div className="flex items-center gap-2">
                  Start Station
                  {getSortIcon("startStation")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("endStation")}
              >
                <div className="flex items-center gap-2">
                  End Station
                  {getSortIcon("endStation")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("count")}
              >
                <div className="flex items-center gap-2">
                  Count
                  {getSortIcon("count")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("distance")}
              >
                <div className="flex items-center gap-2">
                  Distance
                  {getSortIcon("distance")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("avgDuration")}
              >
                <div className="flex items-center gap-2">
                  Avg Duration (min)
                  {getSortIcon("avgDuration")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("minDuration")}
              >
                <div className="flex items-center gap-2">
                  Min Duration (min)
                  {getSortIcon("minDuration")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("maxDuration")}
              >
                <div className="flex items-center gap-2">
                  Max Duration (min)
                  {getSortIcon("maxDuration")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRoutes.map((route, index) => {
              const routeKey = getRouteKey(route);
              const isSelected = selectedRoutes.has(routeKey);
              return (
                <tr
                  key={`${route.startStation.id}-${route.endStation.id}-${index}`}
                  className={`hover:bg-gray-50 ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={isSelected}
                      onChange={(e) =>
                        handleCheckboxChange(route, e.target.checked)
                      }
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {route.startStation.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {route.endStation.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {route.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {route.distanceKm < 1.60934
                      ? `${route.distanceKm.toFixed(2)} km`
                      : `${(route.distanceKm / 1.60934).toFixed(
                          2
                        )} mi (${route.distanceKm.toFixed(2)} km)`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {route.avgDurationMinutes !== null
                      ? route.avgDurationMinutes
                      : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {route.minDurationMinutes !== null
                      ? route.minDurationMinutes
                      : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {route.maxDurationMinutes !== null
                      ? route.maxDurationMinutes
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
