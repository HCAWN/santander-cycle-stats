import { useState, useMemo } from "react";
import type { Ride } from "../types/ride";
import StatsCards from "./analytics/StatsCards";
import JourneyTimeHistogram from "./analytics/JourneyTimeHistogram";
import TimePatternChart from "./analytics/TimePatternChart";
import RidesOverTimeHistogram from "./analytics/RidesOverTimeHistogram";
import StationsTable from "./analytics/StationsTable";
import RoutesTable, { type RouteStats } from "./analytics/RoutesTable";
import RoutesMap from "./analytics/RoutesMap";
import VisitedStationsMap from "./analytics/VisitedStationsMap";
import { useStations } from "../hooks/useStations";

interface Step4PreviewProps {
  rides: Ride[];
}

export default function Step4Preview({ rides }: Step4PreviewProps) {
  const {
    stations,
    loading: stationsLoading,
    error: stationsError,
  } = useStations();
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [allRoutes, setAllRoutes] = useState<RouteStats[]>([]);
  const [selectedStations, setSelectedStations] = useState<Set<string>>(
    new Set()
  );

  // Handle routes calculated - just store them, don't auto-select
  const handleRoutesCalculated = (routes: RouteStats[]) => {
    setAllRoutes(routes);
  };

  // Filter routes based on selection
  const selectedRoutesData = useMemo(() => {
    return allRoutes.filter((route) => {
      const routeKey = `${route.startStation.id}-${route.endStation.id}`;
      return selectedRoutes.has(routeKey);
    });
  }, [allRoutes, selectedRoutes]);

  if (rides.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          No data to preview. Please complete Step 3 first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Step 4: Analysis</h2>
        <p className="text-gray-600">
          Your ride data has been loaded. Here's all the good stuff:
        </p>
      </div>

      <StatsCards rides={rides} />

      <JourneyTimeHistogram rides={rides} />

      <TimePatternChart rides={rides} />

      <RidesOverTimeHistogram rides={rides} />

      {stationsLoading ? (
        <>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Station Statistics
            </h3>
            <p className="text-gray-600">Loading station data...</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Visited Stations Map
            </h3>
            <p className="text-gray-600">Loading station data...</p>
          </div>
        </>
      ) : stationsError ? (
        <>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">
              Station Statistics
            </h3>
            <p className="text-red-600">
              Error loading stations: {stationsError}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">
              Visited Stations Map
            </h3>
            <p className="text-red-600">
              Error loading stations: {stationsError}
            </p>
          </div>
        </>
      ) : (
        <>
          <StationsTable
            rides={rides}
            stations={stations}
            selectedStations={selectedStations}
            onStationSelectionChange={setSelectedStations}
          />
          <VisitedStationsMap
            rides={rides}
            stations={stations}
            selectedStations={selectedStations}
          />
          <RoutesTable
            rides={rides}
            stations={stations}
            selectedRoutes={selectedRoutes}
            onRouteSelectionChange={setSelectedRoutes}
            onRoutesCalculated={handleRoutesCalculated}
          />
          <RoutesMap routes={selectedRoutesData} />
        </>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mt-8">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">
              That's all for now!
            </h3>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Your rides are saved in your browser, so you don't need to
              re-scrape them next time you want to explore your cycling data.
              Just come back and your data will be ready to go!
            </p>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm font-medium text-gray-900 mb-3">
                Have ideas for new visualisations or ways to sort the data?
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="https://github.com/HCAWN/santander-cycle-stats/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Suggest on GitHub</span>
                </a>
                <span className="text-gray-300">•</span>
                <a
                  href="mailto:santander_cycle_stats@hcawn.com"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Email me</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
