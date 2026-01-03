import { useState, useEffect } from "react";

interface Step2ScrapeDetailsProps {
  onComplete: () => void;
}

export default function Step2ScrapeDetails({
  onComplete,
}: Step2ScrapeDetailsProps) {
  const [copied, setCopied] = useState(false);
  const [stepComplete, setStepComplete] = useState(false);
  const [scriptCode, setScriptCode] = useState<string>("Loading script...");

  useEffect(() => {
    // Load the script file dynamically
    fetch("/scripts/fetch-ride-details.js")
      .then((res) => res.text())
      .then((text) => {
        setScriptCode(text);
      })
      .catch((err) => {
        console.error("Failed to load script:", err);
        setScriptCode("// Error loading script file. Please refresh the page.");
      });
  }, []);

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
        <h2 className="text-2xl font-bold mb-2">Step 2: Fetch Ride Details</h2>
        <p className="text-gray-600">
          Now we'll fetch detailed information for each ride. This script
          automatically processes all rides and will resume from where it left
          off if you get logged out.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>
            Make sure you're still logged into the Santander Cycle website in
            the same tab
          </li>
          <li>Copy the script below and paste it into the console</li>
          <li>Press Enter to run it</li>
          <li>
            Wait for it to complete (this may take several minutes depending on
            how many rides you have)
          </li>
          <li>
            If you get logged out, follow the instructions in the console to
            login and restart the script
          </li>
          <li>
            When complete, copy the JSON output from the console (it will be
            automatically copied to your clipboard)
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
        <h3 className="font-semibold text-yellow-900 mb-2">💡 Tips:</h3>
        <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
          <li>
            The script automatically processes <strong>all</strong> your rides
            in one go
          </li>
          <li>
            Already-fetched rides are automatically skipped (no need to track
            progress manually)
          </li>
          <li>
            You can check your progress anytime by typing{" "}
            <code className="bg-yellow-100 px-1 rounded">
              window.__rideDetails
            </code>{" "}
            in the console and pressing Enter to see the values saved so far.
          </li>
          <li>
            If you get logged out, just login in another tab and run the script
            again - it will resume automatically
          </li>
          <li>
            API responses take ~400ms each, so the script will show estimated
            completion time
          </li>
          <li>
            When complete, the complete JSON array is automatically copied to
            your clipboard
          </li>
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
          <span className="text-green-600 font-medium">✓ Step 2 Complete</span>
        )}
      </div>
    </div>
  );
}
