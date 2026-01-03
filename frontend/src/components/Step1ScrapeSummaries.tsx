import { useState, useEffect } from "react";

interface Step1ScrapeSummariesProps {
  onComplete: () => void;
}

export default function Step1ScrapeSummaries({
  onComplete,
}: Step1ScrapeSummariesProps) {
  const [copied, setCopied] = useState(false);
  const [stepComplete, setStepComplete] = useState(false);
  const [estimatedRideCount, setEstimatedRideCount] = useState<string>("");
  const [scriptCode, setScriptCode] = useState<string>("Loading script...");

  useEffect(() => {
    // Load the script file dynamically
    fetch("/scripts/fetch-ride-summaries.js")
      .then((res) => res.text())
      .then((text) => {
        // Inject the estimated ride count at the beginning (before the IIFE)
        const injectedCode = text.replace(
          /^\(async \(\) => \{/,
          `(async () => {
  // Set estimated ride count for time estimation
  window.__estimatedRideCount = ${estimatedRideCount || "null"};
`
        );
        setScriptCode(injectedCode);
      })
      .catch((err) => {
        console.error("Failed to load script:", err);
        setScriptCode("// Error loading script file. Please refresh the page.");
      });
  }, [estimatedRideCount]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          Step 1: Fetch Ride Summaries
        </h2>
        <p className="text-gray-600">
          First, we need to fetch a list of all your rides. This script will
          paginate through your ride history.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>
            First, visit your profile page to find your total ride count:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>
                Go to{" "}
                <a
                  href="https://santandercycles.tfl.gov.uk/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  https://santandercycles.tfl.gov.uk/profile
                </a>{" "}
                and log in if needed
              </li>
              <li>Look for the number showing your total rides taken</li>
              <li>
                Enter that number in the field below (optional but helps
                estimate time)
              </li>
            </ul>
          </li>
          <li>
            Open{" "}
            <a
              href="https://santandercycles.tfl.gov.uk/ride-history"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              https://santandercycles.tfl.gov.uk/ride-history
            </a>{" "}
            in a new tab (keep it open)
          </li>
          <li>
            Open the browser console:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm">
              <li>
                <strong>Windows/Linux:</strong> Press{" "}
                <kbd className="bg-blue-100 px-1 rounded">F12</kbd> or{" "}
                <kbd className="bg-blue-100 px-1 rounded">Ctrl</kbd> +{" "}
                <kbd className="bg-blue-100 px-1 rounded">Shift</kbd> +{" "}
                <kbd className="bg-blue-100 px-1 rounded">I</kbd>
              </li>
              <li>
                <strong>Mac:</strong> Press{" "}
                <kbd className="bg-blue-100 px-1 rounded">Cmd</kbd> +{" "}
                <kbd className="bg-blue-100 px-1 rounded">Option</kbd> +{" "}
                <kbd className="bg-blue-100 px-1 rounded">I</kbd>
              </li>
              <li>
                Or right-click anywhere on the page → select{" "}
                <strong>"Inspect"</strong> or <strong>"Inspect Element"</strong>
              </li>
              <li>
                Once the developer tools open, click the{" "}
                <strong>"Console"</strong> tab at the top
              </li>
            </ul>
          </li>
          <li>Copy the script below and paste it into the console</li>
          <li>Press Enter to run it</li>
          <li>
            Wait for it to complete (estimated time will be shown if you entered
            your ride count)
          </li>
          <li>
            If you get logged out, follow the instructions in the console to
            continue
          </li>
          <li>
            <strong>To stop the script:</strong> Type{" "}
            <code className="bg-blue-100 px-1 rounded">
              window.__stopFetching = true
            </code>{" "}
            in the console and press Enter. Your progress will be saved.
          </li>
        </ol>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Total Ride Count (from profile page - optional):
        </label>
        <input
          type="number"
          value={estimatedRideCount}
          onChange={(e) => setEstimatedRideCount(e.target.value)}
          min="0"
          placeholder="e.g. 3004"
          className="w-48 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-600 mt-2">
          This helps estimate how long the script will take to run. You can find
          this number on your{" "}
          <a
            href="https://santandercycles.tfl.gov.uk/profile"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            profile page
          </a>
          .
        </p>
      </div>

      <div className="relative">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">
            Script Code:
          </label>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-xs max-h-96">
          <code>{scriptCode}</code>
        </pre>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">
          ⚠️ Important Notes:
        </h3>
        <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
          <li>
            Sessions expire after ~15 minutes. If you get logged out, the script
            will tell you how to continue.
          </li>
          <li>
            Your progress is automatically saved in{" "}
            <code className="bg-yellow-100 px-1 rounded">
              window.__rideSummaries
            </code>
            . You can check your progress anytime by typing{" "}
            <code className="bg-yellow-100 px-1 rounded">
              window.__rideSummaries
            </code>{" "}
            in the console and pressing Enter to see the values saved so far.
          </li>
          <li>Don't close the browser tab until you've completed Step 2</li>
        </ul>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setStepComplete(true);
            onComplete();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          I've completed this step
        </button>
        {stepComplete && (
          <span className="text-green-600 font-medium">✓ Step 1 Complete</span>
        )}
      </div>
    </div>
  );
}
