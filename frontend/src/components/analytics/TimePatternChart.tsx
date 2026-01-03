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

type BucketWidth = "15m" | "30m" | "1h" | "2h";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TimePatternChartProps {
  rides: Ride[];
}

export default function TimePatternChart({ rides }: TimePatternChartProps) {
  const [bucketWidth, setBucketWidth] = useState<BucketWidth>("1h");

  const chartData = useMemo(() => {
    // Filter rides with valid start time
    const ridesWithStartTime = rides.filter((r) => r.startTimeMs !== null);

    if (ridesWithStartTime.length === 0) {
      return null;
    }

    // Convert bucket width to minutes
    const bucketWidthMinutes: Record<BucketWidth, number> = {
      "15m": 15,
      "30m": 30,
      "1h": 60,
      "2h": 120,
    };
    const bucketSizeMinutes = bucketWidthMinutes[bucketWidth];

    // Calculate number of bins (24 hours = 1440 minutes)
    const totalMinutesInDay = 24 * 60;
    const numBins = Math.ceil(totalMinutesInDay / bucketSizeMinutes);
    const bins: number[] = new Array(numBins).fill(0);
    const binLabels: string[] = [];

    // Create bin labels
    for (let i = 0; i < numBins; i++) {
      const binStartMinutes = i * bucketSizeMinutes;
      const binEndMinutes = Math.min(
        (i + 1) * bucketSizeMinutes,
        totalMinutesInDay
      );

      const binStartHour = Math.floor(binStartMinutes / 60);
      const binStartMin = binStartMinutes % 60;
      const binEndHour = Math.floor(binEndMinutes / 60);
      const binEndMin = binEndMinutes % 60;

      // Format labels
      const formatTime = (hour: number, min: number) => {
        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        if (min === 0) {
          return `${displayHour} ${period}`;
        }
        return `${displayHour}:${min.toString().padStart(2, "0")} ${period}`;
      };

      if (binEndMinutes === totalMinutesInDay) {
        // Last bin ends at midnight (24:00 = 0:00 next day)
        binLabels.push(`${formatTime(binStartHour, binStartMin)} - 12 AM`);
      } else {
        binLabels.push(
          `${formatTime(binStartHour, binStartMin)} - ${formatTime(
            binEndHour,
            binEndMin
          )}`
        );
      }
    }

    // Count rides in each bin
    ridesWithStartTime.forEach((ride) => {
      if (ride.startTimeMs !== null) {
        const startDate = new Date(ride.startTimeMs);
        const hours = startDate.getHours();
        const minutes = startDate.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        const binIndex = Math.floor(totalMinutes / bucketSizeMinutes);
        bins[Math.min(binIndex, numBins - 1)]++;
      }
    });

    return {
      labels: binLabels,
      datasets: [
        {
          label: "Number of Rides",
          data: bins,
          backgroundColor: "rgba(34, 197, 94, 0.6)", // green-500 with opacity
          borderColor: "rgba(34, 197, 94, 1)", // green-500
          borderWidth: 1,
        },
      ],
    };
  }, [rides, bucketWidth]);

  if (!chartData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Time Patterns</h3>
        <p className="text-gray-600">
          No start time data available to display.
        </p>
      </div>
    );
  }

  const getTitleText = () => {
    const bucketLabels: Record<BucketWidth, string> = {
      "15m": "15-minute intervals",
      "30m": "30-minute intervals",
      "1h": "hourly",
      "2h": "2-hour intervals",
    };
    return `Ride Distribution Throughout the Day (${bucketLabels[bucketWidth]})`;
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
          text: "Hour of Day",
        },
      },
    },
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Time Patterns
      </h3>
      <p className="text-gray-600 mb-4 text-sm">
        See when you typically cycle during the day. Shows the distribution of
        rides by hour from midnight to midnight.
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
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="15m">15 minutes</option>
          <option value="30m">30 minutes</option>
          <option value="1h">1 hour</option>
          <option value="2h">2 hours</option>
        </select>
      </div>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
