import { useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import type { Ride } from "../../types/ride";

type BucketWidth = "1d" | "3d" | "1w" | "1m" | "3m" | "6m" | "1y";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RidesOverTimeHistogramProps {
  rides: Ride[];
}

export default function RidesOverTimeHistogram({
  rides,
}: RidesOverTimeHistogramProps) {
  const [bucketWidth, setBucketWidth] = useState<BucketWidth>("1m");

  const chartData = useMemo(() => {
    // Filter rides with valid start time
    const ridesWithStartTime = rides.filter((r) => r.startTimeMs !== null);

    if (ridesWithStartTime.length === 0) {
      return null;
    }

    // Get the date range
    const timestamps = ridesWithStartTime
      .map((r) => r.startTimeMs!)
      .sort((a, b) => a - b);
    const minDate = new Date(timestamps[0]);
    const maxDate = new Date(timestamps[timestamps.length - 1]);

    // Helper function to get bin key for a date
    const getBinKey = (date: Date): string => {
      if (bucketWidth === "1d") {
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      } else if (bucketWidth === "3d") {
        // Round down to nearest 3-day boundary (using days since epoch)
        const daysSinceEpoch = Math.floor(
          date.getTime() / (24 * 60 * 60 * 1000)
        );
        const binStartDays = Math.floor(daysSinceEpoch / 3) * 3;
        return `d${binStartDays}`;
      } else if (bucketWidth === "1w") {
        // Round down to start of week (Monday)
        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(date);
        monday.setDate(date.getDate() - mondayOffset);
        monday.setHours(0, 0, 0, 0);
        return `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
      } else if (bucketWidth === "1m") {
        return `${date.getFullYear()}-${date.getMonth()}`;
      } else if (bucketWidth === "3m") {
        // Quarters: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
        const quarter = Math.floor(date.getMonth() / 3);
        return `${date.getFullYear()}-Q${quarter}`;
      } else if (bucketWidth === "6m") {
        // Half-years: Jan-Jun, Jul-Dec
        const half = Math.floor(date.getMonth() / 6);
        return `${date.getFullYear()}-H${half}`;
      } else if (bucketWidth === "1y") {
        return `${date.getFullYear()}`;
      }
      return "";
    };

    // Count rides per bin
    const binCounts = new Map<string, number>();
    ridesWithStartTime.forEach((ride) => {
      if (ride.startTimeMs !== null) {
        const date = new Date(ride.startTimeMs);
        const key = getBinKey(date);
        binCounts.set(key, (binCounts.get(key) || 0) + 1);
      }
    });

    // Helper function to get next bin start date
    const getNextBinStartDate = (currentDate: Date): Date => {
      const next = new Date(currentDate);
      if (bucketWidth === "1d") {
        next.setDate(next.getDate() + 1);
      } else if (bucketWidth === "3d") {
        next.setDate(next.getDate() + 3);
      } else if (bucketWidth === "1w") {
        next.setDate(next.getDate() + 7);
      } else if (bucketWidth === "1m") {
        next.setMonth(next.getMonth() + 1);
      } else if (bucketWidth === "3m") {
        next.setMonth(next.getMonth() + 3);
      } else if (bucketWidth === "6m") {
        next.setMonth(next.getMonth() + 6);
      } else if (bucketWidth === "1y") {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next;
    };

    // Generate all bins from minDate to maxDate
    const binStartDates: Date[] = [];
    let currentBinStart = new Date(minDate);

    // Round down to the start of the first bin
    if (bucketWidth === "1d") {
      currentBinStart.setHours(0, 0, 0, 0);
    } else if (bucketWidth === "3d") {
      const daysSinceEpoch = Math.floor(
        currentBinStart.getTime() / (24 * 60 * 60 * 1000)
      );
      const binStartDays = Math.floor(daysSinceEpoch / 3) * 3;
      currentBinStart = new Date(binStartDays * 24 * 60 * 60 * 1000);
    } else if (bucketWidth === "1w") {
      const dayOfWeek = currentBinStart.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentBinStart.setDate(currentBinStart.getDate() - mondayOffset);
      currentBinStart.setHours(0, 0, 0, 0);
    } else if (bucketWidth === "1m") {
      currentBinStart.setDate(1);
      currentBinStart.setHours(0, 0, 0, 0);
    } else if (bucketWidth === "3m") {
      const quarter = Math.floor(currentBinStart.getMonth() / 3);
      currentBinStart.setMonth(quarter * 3, 1);
      currentBinStart.setHours(0, 0, 0, 0);
    } else if (bucketWidth === "6m") {
      const half = Math.floor(currentBinStart.getMonth() / 6);
      currentBinStart.setMonth(half * 6, 1);
      currentBinStart.setHours(0, 0, 0, 0);
    } else if (bucketWidth === "1y") {
      currentBinStart.setMonth(0, 1);
      currentBinStart.setHours(0, 0, 0, 0);
    }

    // Generate all bin start dates
    while (currentBinStart <= maxDate) {
      binStartDates.push(new Date(currentBinStart));
      currentBinStart = getNextBinStartDate(currentBinStart);
    }

    // Generate labels and data for all bins
    const binLabels: string[] = [];
    const bins: number[] = [];

    binStartDates.forEach((binStartDate) => {
      const key = getBinKey(binStartDate);
      let label: string;

      if (bucketWidth === "1d") {
        label = binStartDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } else if (bucketWidth === "3d") {
        const binEndDate = new Date(binStartDate);
        binEndDate.setDate(binEndDate.getDate() + 3);
        label = `${binStartDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })} - ${binEndDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;
      } else if (bucketWidth === "1w") {
        const binEndDate = new Date(binStartDate);
        binEndDate.setDate(binEndDate.getDate() + 7);
        label = `${binStartDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })} - ${binEndDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;
      } else if (bucketWidth === "1m") {
        label = binStartDate.toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        });
      } else if (bucketWidth === "3m") {
        const quarterNames = ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"];
        const quarter = Math.floor(binStartDate.getMonth() / 3);
        label = `${quarterNames[quarter]} ${binStartDate.getFullYear()}`;
      } else if (bucketWidth === "6m") {
        const halfNames = ["Jan-Jun", "Jul-Dec"];
        const half = Math.floor(binStartDate.getMonth() / 6);
        label = `${halfNames[half]} ${binStartDate.getFullYear()}`;
      } else if (bucketWidth === "1y") {
        label = binStartDate.getFullYear().toString();
      } else {
        label = key;
      }

      binLabels.push(label);
      bins.push(binCounts.get(key) || 0);
    });

    return {
      labels: binLabels,
      datasets: [
        {
          label: "Number of Rides",
          data: bins,
          backgroundColor: "rgba(168, 85, 247, 0.6)", // purple-500 with opacity
          borderColor: "rgba(168, 85, 247, 1)", // purple-500
          borderWidth: 1,
        },
      ],
    };
  }, [rides, bucketWidth]);

  if (!chartData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Rides Over Time</h3>
        <p className="text-gray-600">
          No start time data available to display.
        </p>
      </div>
    );
  }

  const getTitleText = () => {
    const bucketLabels: Record<BucketWidth, string> = {
      "1d": "daily",
      "3d": "3-day intervals",
      "1w": "weekly",
      "1m": "monthly",
      "3m": "3-month intervals",
      "6m": "6-month intervals",
      "1y": "yearly",
    };
    return `Rides Over Time (${bucketLabels[bucketWidth]})`;
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: getTitleText(),
        font: {
          size: 16,
          weight: "bold" as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            const value = context.parsed.y;
            return `${value} ride${value !== 1 ? "s" : ""}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        title: {
          display: true,
          text: "Number of Rides",
        },
      },
      x: {
        title: {
          display: true,
          text: "Time Period",
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Rides Over Time
      </h3>
      <p className="text-gray-600 mb-4 text-sm">
        See how your cycling activity has changed over time. Track your ride
        frequency across different time periods.
      </p>
      <div className="mb-4 flex items-center gap-2">
        <label
          htmlFor="time-bucket-width"
          className="text-sm font-medium text-gray-700"
        >
          Bucket width:
        </label>
        <select
          id="time-bucket-width"
          value={bucketWidth}
          onChange={(e) => setBucketWidth(e.target.value as BucketWidth)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="1d">1 day</option>
          <option value="3d">3 days</option>
          <option value="1w">1 week</option>
          <option value="1m">1 month</option>
          <option value="3m">3 months</option>
          <option value="6m">6 months</option>
          <option value="1y">1 year</option>
        </select>
      </div>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
