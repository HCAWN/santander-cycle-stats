import { useState } from "react";
import { z } from "zod";
import { RidesArraySchema } from "../schemas/ride";
import type { Ride } from "../types/ride";

const STORAGE_KEY = "santander-cycle-rides";

interface StoredData {
  rides: Ride[];
  savedAt: number; // timestamp
  rideCount: number;
}

interface Step3PasteDataProps {
  onDataParsed: (rides: Ride[]) => void;
}

export default function Step3PasteData({ onDataParsed }: Step3PasteDataProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rideCount, setRideCount] = useState<number | null>(null);

  // Check for existing stored data on mount and get metadata
  const [storedDataInfo, setStoredDataInfo] = useState<{
    savedAt: number;
    rideCount: number;
  } | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Handle both old format (array) and new format (object with metadata)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Old format - migrate it
          return {
            savedAt: Date.now(),
            rideCount: parsed.length,
          };
        } else if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray(parsed.rides)
        ) {
          // New format
          return {
            savedAt: parsed.savedAt || Date.now(),
            rideCount: parsed.rideCount || parsed.rides.length,
          };
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  const saveToLocalStorage = (rides: Ride[]) => {
    try {
      const dataToStore: StoredData = {
        rides,
        savedAt: Date.now(),
        rideCount: rides.length,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      setStoredDataInfo({
        savedAt: dataToStore.savedAt,
        rideCount: dataToStore.rideCount,
      });
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStoredDataInfo(null);
    setJsonInput("");
    setSuccess(false);
    setRideCount(null);
    setError(null);
  };

  const validateAndParse = () => {
    setError(null);
    setSuccess(false);
    setRideCount(null);

    if (!jsonInput.trim()) {
      setError("Please paste your JSON data");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);

      // Validate directly with Zod schema
      const validationResult = RidesArraySchema.safeParse(parsed);

      if (!validationResult.success) {
        const issues = validationResult.error.issues;
        const firstError = issues[0];
        const errorMessage = firstError
          ? `Validation error at ride ${firstError.path.join(".")}: ${
              firstError.message
            }`
          : "Invalid ride data structure";
        setError(errorMessage);
        return;
      }

      const typedRides = validationResult.data as Ride[];

      // Save to localStorage
      saveToLocalStorage(typedRides);

      setRideCount(typedRides.length);
      setSuccess(true);
      onDataParsed(typedRides);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError(`Invalid JSON: ${err.message}`);
      } else if (err instanceof z.ZodError) {
        const firstError = err.issues[0];
        setError(
          `Validation error: ${firstError?.message || "Invalid data structure"}`
        );
      } else {
        setError(
          `Error parsing data: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Step 3: Paste Your Data</h2>
        <p className="text-gray-600">
          Paste the JSON array you copied from the console.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>
            Copy the JSON array from your browser console (it should be
            automatically copied to your clipboard when Script B completes)
          </li>
          <li>Paste the complete array into the textarea below</li>
          <li>Click "Parse & Validate" to check your data</li>
        </ol>
      </div>

      {storedDataInfo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                Data Storage Notice
              </h3>
              <div className="space-y-2 text-amber-800 text-sm mb-4">
                <div className="bg-amber-100 rounded p-3 border border-amber-300">
                  <p className="font-medium text-amber-900 mb-2">
                    ⚠️ Important: Local Storage Only
                  </p>
                  <p className="mb-2">
                    Your ride data is saved <strong>only on this device</strong>{" "}
                    in your browser's local storage. This data is{" "}
                    <strong>not synced</strong> to any server or cloud service.
                  </p>
                  <p className="font-medium text-amber-900">
                    ⚠️ Clearing your browser cache or using private/incognito
                    mode will permanently delete this data.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="font-medium">Saved rides:</span>{" "}
                    <span className="font-semibold">
                      {storedDataInfo.rideCount}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Last saved:</span>{" "}
                    <span className="font-semibold">
                      {new Date(storedDataInfo.savedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-amber-700 pt-2 border-t border-amber-300">
                  If you re-scrape and paste new data, it will{" "}
                  <strong>overwrite</strong> your existing saved data.
                </p>
              </div>
              <button
                onClick={clearLocalStorage}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                Clear Saved Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          JSON Data:
        </label>
        <textarea
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setError(null);
            setSuccess(false);
          }}
          placeholder="Paste your JSON array here..."
          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-1">❌ Error:</h3>
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && rideCount !== null && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-1">✅ Success!</h3>
          <p className="text-green-800 mb-2">
            Parsed <strong>{rideCount}</strong> ride{rideCount !== 1 ? "s" : ""}{" "}
            successfully.
          </p>
          <p className="text-green-700 text-sm">
            Your data has been saved to your browser's local storage and will be
            available next time you visit.
          </p>
        </div>
      )}

      <button
        onClick={validateAndParse}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Parse & Validate
      </button>
    </div>
  );
}
