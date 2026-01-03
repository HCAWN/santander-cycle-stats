import { useMemo } from "react";
import type { Ride } from "../../types/ride";
import type { Station } from "../../schemas/station";
import { useStations } from "../../hooks/useStations";

interface StatsCardsProps {
  rides: Ride[];
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

// Match station by name similarity (fuzzy matching) - same logic as StationsTable
function findStationByName(
  address: string | null,
  stations: Station[]
): Station | null {
  if (!address || stations.length === 0) return null;

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
    if (matchingWords.length >= 2) {
      return station;
    }
  }

  return null;
}

interface Stats {
  totalRides: number;
  avgDurationMinutes: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  earliestRide: Date | null;
  daysAgo: number | null;
  totalSpentAmount: number;
  totalSpentRides: number;
  stationsVisited: number;
  totalStations: number;
  eBikeTrips: number;
  favouriteStation: Station | null;
  maxVisits: number;
  longestRideDistanceKm: number | null;
  longestRideDate: Date | null;
  mostRidesInDay: number;
  mostRidesInDayDate: Date | null;
  totalDistanceKm: number;
  fastestJourney: {
    durationMinutes: number;
    distanceKm: number;
    speedKph: number;
  } | null;
  longestStreak: number;
  busiestMonth: {
    count: number;
    month: number;
    year: number;
  } | null;
  totalTimeCyclingMinutes: number;
  longestBreakDays: number | null;
}

export default function StatsCards({ rides }: StatsCardsProps) {
  const { stations } = useStations();

  const stats = useMemo((): Stats => {
    const totalRides = rides.length;

    // Calculate duration stats
    const ridesWithDuration = rides.filter(
      (r) => r.startTimeMs !== null && r.endTimeMs !== null
    );

    // Compute duration from startTimeMs and endTimeMs
    const durationsMs = ridesWithDuration.map(
      (r) => (r.endTimeMs || 0) - (r.startTimeMs || 0)
    );

    const avgDurationMinutes =
      durationsMs.length > 0
        ? Math.round(
            durationsMs.reduce((sum, d) => sum + d, 0) /
              durationsMs.length /
              60000
          )
        : null;

    const minDurationMinutes =
      durationsMs.length > 0
        ? Math.round(Math.min(...durationsMs) / 60000)
        : null;

    const maxDurationMinutes =
      durationsMs.length > 0
        ? Math.round(Math.max(...durationsMs) / 60000)
        : null;

    // Calculate first ride date and days ago
    const ridesWithDates = rides.filter((r) => r.startTimeMs !== null);
    const dates = ridesWithDates.map((r) => new Date(r.startTimeMs!));
    const earliestRide =
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => d.getTime())))
        : null;

    const daysAgo = earliestRide
      ? Math.floor(
          (new Date().getTime() - earliestRide.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    // Calculate price stats
    // Filter out rides with no actual cost (£0.00 or null)
    const ridesWithPrice = rides.filter((r) => {
      if (!r.price || r.price === null) return false;
      // Parse price string (e.g., "£1.50" or "£0.00") and check if > 0
      const priceMatch = r.price.match(/£?([\d.]+)/);
      if (!priceMatch) return false;
      const priceValue = parseFloat(priceMatch[1]);
      return priceValue > 0;
    });

    // Calculate total spend
    const totalSpentAmount = ridesWithPrice.reduce((sum, r) => {
      if (!r.price) return sum;
      const priceMatch = r.price.match(/£?([\d.]+)/);
      if (!priceMatch) return sum;
      return sum + parseFloat(priceMatch[1]);
    }, 0);

    const totalSpentRides = ridesWithPrice.length;

    // Calculate stations visited
    const visitedStationIds = new Set<string>();
    rides.forEach((ride) => {
      const startStation = findStationByName(ride.startAddress, stations);
      const endStation = findStationByName(ride.endAddress, stations);
      if (startStation) visitedStationIds.add(startStation.id);
      if (endStation) visitedStationIds.add(endStation.id);
    });
    const stationsVisited = visitedStationIds.size;
    const totalStations = stations.length;

    // Calculate e-bike trips (check priceBreakdown for e-bike surcharge)
    const eBikeRides = rides.filter((ride) => {
      if (!ride.priceBreakdown) return false;
      return ride.priceBreakdown.some(
        (item) =>
          item.title &&
          (item.title.toLowerCase().includes("e-bike") ||
            item.title.toLowerCase().includes("ebike") ||
            item.title.toLowerCase().includes("electric"))
      );
    });
    const eBikeTrips = eBikeRides.length;

    // Calculate favourite station (most visited)
    const stationVisitCounts = new Map<string, number>();
    rides.forEach((ride) => {
      const startStation = findStationByName(ride.startAddress, stations);
      const endStation = findStationByName(ride.endAddress, stations);
      if (startStation) {
        stationVisitCounts.set(
          startStation.id,
          (stationVisitCounts.get(startStation.id) || 0) + 1
        );
      }
      if (endStation) {
        stationVisitCounts.set(
          endStation.id,
          (stationVisitCounts.get(endStation.id) || 0) + 1
        );
      }
    });
    let favouriteStation: Station | null = null;
    let maxVisits = 0;
    stationVisitCounts.forEach((visits, stationId) => {
      if (visits > maxVisits) {
        const station = stations.find((s) => s.id === stationId);
        if (station) {
          maxVisits = visits;
          favouriteStation = station as Station;
        }
      }
    });

    // Calculate ride distances and find longest ride
    let longestRideDistanceKm: number | null = null;
    let longestRideDate: Date | null = null;
    let totalDistanceKm = 0;
    const rideDistances: Array<{
      distanceKm: number;
      durationMinutes: number | null;
      date: Date | null;
    }> = [];

    rides.forEach((ride) => {
      const startStation = findStationByName(ride.startAddress, stations);
      const endStation = findStationByName(ride.endAddress, stations);

      if (startStation && endStation) {
        const distanceKm = calculateDistance(
          startStation.lat,
          startStation.long,
          endStation.lat,
          endStation.long
        );
        totalDistanceKm += distanceKm;

        let durationMinutes: number | null = null;
        if (ride.startTimeMs !== null && ride.endTimeMs !== null) {
          durationMinutes = Math.round(
            (ride.endTimeMs - ride.startTimeMs) / 60000
          );
        }

        const rideDate = ride.startTimeMs ? new Date(ride.startTimeMs) : null;

        rideDistances.push({
          distanceKm,
          durationMinutes,
          date: rideDate,
        });

        if (
          longestRideDistanceKm === null ||
          distanceKm > longestRideDistanceKm
        ) {
          longestRideDistanceKm = distanceKm;
          longestRideDate = rideDate;
        }
      }
    });

    // Find fastest journey (highest speed, excluding rides < 1km)
    let fastestJourney: {
      durationMinutes: number;
      distanceKm: number;
      speedKph: number;
    } | null = null;
    rideDistances.forEach((ride) => {
      if (
        ride.durationMinutes !== null &&
        ride.durationMinutes > 0 &&
        ride.distanceKm >= 1 // At least 1km
      ) {
        const speedKph = (ride.distanceKm / ride.durationMinutes) * 60;
        if (fastestJourney === null || speedKph > fastestJourney.speedKph) {
          fastestJourney = {
            durationMinutes: ride.durationMinutes,
            distanceKm: ride.distanceKm,
            speedKph,
          };
        }
      }
    });

    // Calculate most rides in a single day
    const ridesByDate = new Map<string, number>();
    rides.forEach((ride) => {
      if (ride.startTimeMs !== null) {
        const date = new Date(ride.startTimeMs);
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
        ridesByDate.set(dateKey, (ridesByDate.get(dateKey) || 0) + 1);
      }
    });

    let mostRidesInDay = 0;
    let mostRidesInDayDate: Date | null = null;
    ridesByDate.forEach((count, dateKey) => {
      if (count > mostRidesInDay) {
        mostRidesInDay = count;
        mostRidesInDayDate = new Date(dateKey);
      }
    });

    // Calculate longest streak of consecutive days with at least one ride
    const rideDates = Array.from(ridesByDate.keys())
      .map((d) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());

    let longestStreak = 0;
    let longestBreakDays: number | null = null;
    if (rideDates.length > 1) {
      let currentStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < rideDates.length; i++) {
        const prevDate = rideDates[i - 1];
        const currDate = rideDates[i];
        const daysDiff = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          // Gap in days, reset streak
          currentStreak = 1;
        }

        // Track longest break (days between rides, excluding the day of the rides themselves)
        // If rides are on day 1 and day 5, that's a 3-day break
        const breakDays = daysDiff - 1;
        if (
          breakDays > 0 &&
          (longestBreakDays === null || breakDays > longestBreakDays)
        ) {
          longestBreakDays = breakDays;
        }
      }
    }

    // Calculate busiest month
    const ridesByMonth = new Map<string, number>();
    rides.forEach((ride) => {
      if (ride.startTimeMs !== null) {
        const date = new Date(ride.startTimeMs);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`; // YYYY-MM (0-indexed)
        ridesByMonth.set(monthKey, (ridesByMonth.get(monthKey) || 0) + 1);
      }
    });

    let busiestMonth: {
      count: number;
      month: number;
      year: number;
    } | null = null;
    ridesByMonth.forEach((count, monthKey) => {
      if (busiestMonth === null || count > busiestMonth.count) {
        const [year, month] = monthKey.split("-").map(Number);
        busiestMonth = {
          count,
          month,
          year,
        };
      }
    });

    // Calculate total time cycling
    const totalTimeCyclingMinutes = ridesWithDuration.reduce((sum, ride) => {
      if (ride.startTimeMs !== null && ride.endTimeMs !== null) {
        return sum + Math.round((ride.endTimeMs - ride.startTimeMs) / 60000);
      }
      return sum;
    }, 0);

    return {
      totalRides,
      avgDurationMinutes,
      minDurationMinutes,
      maxDurationMinutes,
      earliestRide,
      daysAgo,
      totalSpentAmount,
      totalSpentRides,
      stationsVisited,
      totalStations,
      eBikeTrips,
      favouriteStation,
      maxVisits,
      longestRideDistanceKm,
      longestRideDate,
      mostRidesInDay,
      mostRidesInDayDate,
      totalDistanceKm,
      fastestJourney,
      longestStreak,
      busiestMonth,
      totalTimeCyclingMinutes,
      longestBreakDays,
    };
  }, [rides, stations]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-900">
            {stats.totalRides}
          </div>
          <div className="text-sm text-blue-700 mt-1">Total Rides</div>
        </div>

        {stats.daysAgo !== null && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-teal-900">
              {stats.daysAgo}
            </div>
            <div className="text-sm text-teal-700 mt-1">
              First Ride (days ago)
            </div>
          </div>
        )}

        {stats.avgDurationMinutes !== null && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-900">
              {stats.avgDurationMinutes}
            </div>
            <div className="text-sm text-purple-700 mt-1">
              Avg Duration (min)
            </div>
          </div>
        )}

        {stats.minDurationMinutes !== null &&
          stats.maxDurationMinutes !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {stats.minDurationMinutes} - {stats.maxDurationMinutes}
              </div>
              <div className="text-sm text-green-700 mt-1">
                Duration Range (min)
              </div>
            </div>
          )}

        {stats.totalSpentRides > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-900">
              £{stats.totalSpentAmount.toFixed(2)}
            </div>
            <div className="text-sm text-orange-700 mt-1">
              Total spend* over {stats.totalSpentRides} ride
              {stats.totalSpentRides !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {stats.totalStations > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-indigo-900">
              {stats.stationsVisited} / {stats.totalStations}
            </div>
            <div className="text-sm text-indigo-700 mt-1">Stations Visited</div>
          </div>
        )}

        {stats.eBikeTrips > 0 && (
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-pink-900">
              {stats.eBikeTrips}
            </div>
            <div className="text-sm text-pink-700 mt-1">E-bike Trips</div>
          </div>
        )}

        {stats.favouriteStation && stats.maxVisits > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-lg font-bold text-amber-900 line-clamp-2">
              {stats.favouriteStation?.name || "Unknown"}
            </div>
            <div className="text-sm text-amber-700 mt-1">
              Favourite Station ({stats.maxVisits} visits)
            </div>
          </div>
        )}

        {stats.longestRideDistanceKm !== null && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-cyan-900">
              {stats.longestRideDistanceKm < 1.60934
                ? `${stats.longestRideDistanceKm.toFixed(2)} km`
                : `${(stats.longestRideDistanceKm / 1.60934).toFixed(2)} mi`}
            </div>
            {stats.longestRideDistanceKm >= 1.60934 && (
              <div className="text-sm text-cyan-700 mt-1">
                ({stats.longestRideDistanceKm.toFixed(2)} km)
              </div>
            )}
            <div className="text-sm text-cyan-700 mt-1">
              Longest Single Ride
              {stats.longestRideDate && (
                <span className="ml-2">
                  {stats.longestRideDate.toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {stats.mostRidesInDay > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-violet-900">
              {stats.mostRidesInDay}
            </div>
            <div className="text-sm text-violet-700 mt-1">
              Most Rides in a Day
            </div>
            {stats.mostRidesInDayDate && (
              <div className="text-xs text-violet-600 mt-1">
                {stats.mostRidesInDayDate.toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {stats.totalDistanceKm > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-900">
              {stats.totalDistanceKm < 1.60934
                ? `${Math.round(stats.totalDistanceKm)} km`
                : `${Math.round(stats.totalDistanceKm / 1.60934)} mi`}
            </div>
            {stats.totalDistanceKm >= 1.60934 && (
              <div className="text-sm text-emerald-700 mt-1">
                ({Math.round(stats.totalDistanceKm)} km)
              </div>
            )}
            <div className="text-sm text-emerald-700 mt-1">
              Total Cycling Distance
            </div>
          </div>
        )}

        {stats.fastestJourney && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-rose-900">
              {Math.round(stats.fastestJourney.speedKph / 1.60934)} mph
            </div>
            <div className="text-sm text-rose-700 mt-1">
              ({Math.round(stats.fastestJourney.speedKph)} kph)
            </div>
            <div className="text-sm text-rose-700 mt-1">Fastest Journey</div>
          </div>
        )}

        {stats.longestStreak > 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-sky-900">
              {stats.longestStreak}
            </div>
            <div className="text-sm text-sky-700 mt-1">Longest Ride Streak</div>
            <div className="text-xs text-sky-600 mt-1">(consecutive days)</div>
          </div>
        )}

        {stats.busiestMonth && (
          <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-fuchsia-900">
              {stats.busiestMonth.count}
            </div>
            <div className="text-sm text-fuchsia-700 mt-1">Busiest Month</div>
            <div className="text-xs text-fuchsia-600 mt-1">
              {new Date(
                stats.busiestMonth.year,
                stats.busiestMonth.month
              ).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        )}

        {stats.totalTimeCyclingMinutes > 0 && (
          <div className="bg-lime-50 border border-lime-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-lime-900">
              {stats.totalTimeCyclingMinutes < 60
                ? `${stats.totalTimeCyclingMinutes} min`
                : stats.totalTimeCyclingMinutes < 1440
                ? `${Math.floor(stats.totalTimeCyclingMinutes / 60)} hr ${
                    stats.totalTimeCyclingMinutes % 60
                  } min`
                : `${Math.floor(
                    stats.totalTimeCyclingMinutes / 1440
                  )} days ${Math.floor(
                    (stats.totalTimeCyclingMinutes % 1440) / 60
                  )} hr`}
            </div>
            <div className="text-sm text-lime-700 mt-1">Total Time Cycling</div>
          </div>
        )}

        {stats.longestBreakDays !== null && stats.longestBreakDays > 0 && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-stone-900">
              {stats.longestBreakDays}
            </div>
            <div className="text-sm text-stone-700 mt-1">
              Longest Break Between Rides
            </div>
            <div className="text-xs text-stone-600 mt-1">(days)</div>
          </div>
        )}
      </div>

      {stats.totalSpentRides > 0 && (
        <div className="text-xs text-gray-500 mt-2 italic">
          *Total spend does not include day/week/annual passes
        </div>
      )}
    </>
  );
}
