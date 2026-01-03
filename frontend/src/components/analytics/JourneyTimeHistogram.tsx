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

type BucketWidth = "15s" | "30s" | "1m" | "2m" | "5m";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface JourneyTimeHistogramProps {
  rides: Ride[];
}

export default function JourneyTimeHistogram({
  rides,
}: JourneyTimeHistogramProps) {
  const [bucketWidth, setBucketWidth] = useState<BucketWidth>("1m");

  const chartData = useMemo(() => {
    // Filter rides with valid duration
    const ridesWithDuration = rides.filter(
      (r) => r.startTimeMs !== null && r.endTimeMs !== null
    );

    if (ridesWithDuration.length === 0) {
      return null;
    }

    // Calculate durations in seconds for more precise binning
    const durationsSeconds = ridesWithDuration.map((r) => {
      const durationMs = (r.endTimeMs || 0) - (r.startTimeMs || 0);
      return Math.floor(durationMs / 1000); // Convert to seconds
    });

    // Find min and max for binning
    const minDurationSeconds = Math.min(...durationsSeconds);
    const maxDurationSeconds = Math.max(...durationsSeconds);

    // Convert bucket width to seconds
    const bucketWidthSeconds: Record<BucketWidth, number> = {
      "15s": 15,
      "30s": 30,
      "1m": 60,
      "2m": 120,
      "5m": 300,
    };
    const bucketSizeSeconds = bucketWidthSeconds[bucketWidth];

    // Create bins based on bucket width
    const numBins =
      Math.ceil((maxDurationSeconds - minDurationSeconds) / bucketSizeSeconds) +
      1;
    const bins: number[] = new Array(numBins).fill(0);
    const binLabels: string[] = [];

    // Create bin labels
    for (let i = 0; i < numBins; i++) {
      const binStartSeconds = minDurationSeconds + i * bucketSizeSeconds;
      const binEndSeconds = binStartSeconds + bucketSizeSeconds;

      // Format labels based on bucket width
      if (bucketWidth === "15s" || bucketWidth === "30s") {
        binLabels.push(`${binStartSeconds}s-${binEndSeconds}s`);
      } else {
        const binStartMinutes = Math.floor(binStartSeconds / 60);
        const binEndMinutes = Math.floor(binEndSeconds / 60);
        if (bucketWidth === "1m") {
          // For 1-minute buckets, show single minute labels
          binLabels.push(`${binStartMinutes} min`);
        } else if (binStartMinutes === binEndMinutes) {
          binLabels.push(`${binStartMinutes} min`);
        } else {
          binLabels.push(`${binStartMinutes}-${binEndMinutes} min`);
        }
      }
    }

    // Count rides in each bin
    durationsSeconds.forEach((durationSeconds) => {
      const binIndex = Math.floor(
        (durationSeconds - minDurationSeconds) / bucketSizeSeconds
      );
      bins[Math.min(binIndex, numBins - 1)]++;
    });

    return {
      labels: binLabels,
      datasets: [
        {
          label: "Number of Rides",
          data: bins,
          backgroundColor: "rgba(59, 130, 246, 0.6)", // blue-500 with opacity
          borderColor: "rgba(59, 130, 246, 1)", // blue-500
          borderWidth: 1,
        },
      ],
    };
  }, [rides, bucketWidth]);

  if (!chartData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          Journey Time Histogram
        </h3>
        <p className="text-gray-600">No duration data available to display.</p>
      </div>
    );
  }

  const getTitleText = () => {
    const bucketLabels: Record<BucketWidth, string> = {
      "15s": "15-second intervals",
      "30s": "30-second intervals",
      "1m": "1-minute intervals",
      "2m": "2-minute intervals",
      "5m": "5-minute intervals",
    };
    return `Ride Duration Distribution (${bucketLabels[bucketWidth]})`;
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
          text:
            bucketWidth === "15s" || bucketWidth === "30s"
              ? "Duration (seconds)"
              : "Duration (minutes)",
        },
      },
    },
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Journey Time Histogram
      </h3>
      <p className="text-gray-600 mb-4 text-sm">
        Distribution of your ride durations. See how long your typical journeys
        are.
      </p>
      <div className="mb-4 flex items-center gap-2">
        <label
          htmlFor="bucket-width"
          className="text-sm font-medium text-gray-700"
        >
          Bucket width:
        </label>
        <select
          id="bucket-width"
          value={bucketWidth}
          onChange={(e) => setBucketWidth(e.target.value as BucketWidth)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="15s">15 seconds</option>
          <option value="30s">30 seconds</option>
          <option value="1m">1 minute</option>
          <option value="2m">2 minutes</option>
          <option value="5m">5 minutes</option>
        </select>
      </div>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
