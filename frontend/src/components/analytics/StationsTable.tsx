import { useState, useMemo, useEffect, useRef } from "react";
import type { Ride } from "../../types/ride";
import type { Station } from "../../schemas/station";

interface StationsTableProps {
  rides: Ride[];
  stations: Station[];
  selectedStations?: Set<string>;
  onStationSelectionChange?: (selectedStations: Set<string>) => void;
}

type SortField = "name" | "pickups" | "dropoffs" | "total" | "net";
type SortDirection = "none" | "asc" | "desc";

interface StationStats {
  station: Station;
  pickups: number;
  dropoffs: number;
  total: number;
  net: number; // pickups - dropoffs
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

export default function StationsTable({
  rides,
  stations,
  selectedStations: externalSelectedStations,
  onStationSelectionChange,
}: StationsTableProps) {
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [internalSelectedStations, setInternalSelectedStations] = useState<
    Set<string>
  >(new Set());

  // Use external state if provided, otherwise use internal state
  const selectedStations = externalSelectedStations ?? internalSelectedStations;
  const setSelectedStations =
    onStationSelectionChange ?? setInternalSelectedStations;
  const initializedRef = useRef(false);

  // Calculate stats for each station
  const stationStats = useMemo(() => {
    const statsMap = new Map<string, StationStats>();

    // Initialize all stations with zero stats
    stations.forEach((station) => {
      statsMap.set(station.id, {
        station,
        pickups: 0,
        dropoffs: 0,
        total: 0,
        net: 0,
      });
    });

    // Count pickups and dropoffs
    rides.forEach((ride) => {
      const startStation = findStationByName(ride.startAddress, stations);
      if (startStation) {
        const stats = statsMap.get(startStation.id);
        if (stats) {
          stats.pickups++;
          stats.total++;
          stats.net++;
        }
      }

      const endStation = findStationByName(ride.endAddress, stations);
      if (endStation) {
        const stats = statsMap.get(endStation.id);
        if (stats) {
          stats.dropoffs++;
          stats.total++;
          stats.net--;
        }
      }
    });

    return Array.from(statsMap.values());
  }, [rides, stations]);

  // Sort stations
  const sortedStats = useMemo(() => {
    const sorted = [...stationStats];

    if (sortDirection === "none") {
      return sorted;
    }

    sorted.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case "name":
          aValue = a.station.name.toLowerCase();
          bValue = b.station.name.toLowerCase();
          break;
        case "pickups":
          aValue = a.pickups;
          bValue = b.pickups;
          break;
        case "dropoffs":
          aValue = a.dropoffs;
          bValue = b.dropoffs;
          break;
        case "total":
          aValue = a.total;
          bValue = b.total;
          break;
        case "net":
          aValue = a.net;
          bValue = b.net;
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
  }, [stationStats, sortField, sortDirection]);

  // Filter to only show stations with at least one visit
  const visitedStations = sortedStats.filter((stat) => stat.total > 0);

  // Auto-select all visited stations on first load
  useEffect(() => {
    if (
      visitedStations.length > 0 &&
      !initializedRef.current &&
      selectedStations.size === 0
    ) {
      const allStationIds = new Set(visitedStations.map((s) => s.station.id));
      setSelectedStations(allStationIds);
      initializedRef.current = true;
    }
  }, [visitedStations, selectedStations.size, setSelectedStations]);

  const handleCheckboxChange = (stationId: string, checked: boolean) => {
    const newSelected = new Set(selectedStations);
    if (checked) {
      newSelected.add(stationId);
    } else {
      newSelected.delete(stationId);
    }
    setSelectedStations(newSelected);
  };

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

  if (visitedStations.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Station Statistics
        </h3>
        <p className="text-gray-600">No station visits found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Station Statistics
      </h3>
      <p className="text-gray-600 mb-4 text-sm">
        Click column headers to sort. Shows stations you've visited with pickup
        and dropoff counts.
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
                    visitedStations.length > 0 &&
                    visitedStations.every((s) =>
                      selectedStations.has(s.station.id)
                    )
                  }
                  onChange={(e) => {
                    const newSelected = new Set<string>();
                    if (e.target.checked) {
                      visitedStations.forEach((s) =>
                        newSelected.add(s.station.id)
                      );
                    }
                    setSelectedStations(newSelected);
                  }}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Station Name
                  {getSortIcon("name")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("pickups")}
              >
                <div className="flex items-center gap-2">
                  Pickups
                  {getSortIcon("pickups")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("dropoffs")}
              >
                <div className="flex items-center gap-2">
                  Dropoffs
                  {getSortIcon("dropoffs")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("total")}
              >
                <div className="flex items-center gap-2">
                  Total
                  {getSortIcon("total")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("net")}
              >
                <div className="flex items-center gap-2">
                  Net
                  {getSortIcon("net")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visitedStations.map((stat) => (
              <tr key={stat.station.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedStations.has(stat.station.id)}
                    onChange={(e) =>
                      handleCheckboxChange(stat.station.id, e.target.checked)
                    }
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {stat.station.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stat.pickups}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stat.dropoffs}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {stat.total}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    stat.net > 0
                      ? "text-green-600"
                      : stat.net < 0
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {stat.net > 0 ? "+" : ""}
                  {stat.net}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
