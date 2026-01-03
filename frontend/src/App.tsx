import { useState } from "react";
import Step1ScrapeSummaries from "./components/Step1ScrapeSummaries";
import Step2ScrapeDetails from "./components/Step2ScrapeDetails";
import Step3PasteData from "./components/Step3PasteData";
import Step4Preview from "./components/Step4Preview";
import AnalyticsShowcase from "./components/AnalyticsShowcase";
import type { Ride } from "./types/ride";
import { RidesArraySchema } from "./schemas/ride";

const STORAGE_KEY = "santander-cycle-rides";

type Step = 1 | 2 | 3 | 4;

function App() {
  // Load rides from localStorage on initial render
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Handle both old format (array) and new format (object with metadata)
        const rides = Array.isArray(parsed) ? parsed : parsed?.rides;
        if (rides) {
          const validationResult = RidesArraySchema.safeParse(rides);
          if (validationResult.success) {
            return 4; // Auto-advance to preview if data exists
          }
        }
      } catch {
        // Invalid stored data, ignore
      }
    }
    return 1;
  });

  const [rides, setRides] = useState<Ride[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Handle both old format (array) and new format (object with metadata)
        const rides = Array.isArray(parsed) ? parsed : parsed?.rides;
        if (rides) {
          const validationResult = RidesArraySchema.safeParse(rides);
          if (validationResult.success) {
            return validationResult.data;
          }
        }
      } catch {
        // Invalid stored data, ignore
      }
    }
    return [];
  });

  const handleStep1Complete = () => {
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    setCurrentStep(3);
  };

  const handleDataParsed = (parsedRides: Ride[]) => {
    setRides(parsedRides);
    setCurrentStep(4);
  };

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Santander Cycle Stats
          </h1>
          <p className="text-gray-600">
            Scrape and analyse your Santander Cycle (Boris Bike) ride history
          </p>
        </header>

        {/* Analytics Showcase - Show on Step 1 */}
        {currentStep === 1 && <AnalyticsShowcase />}

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((step) => {
              const stepNum = step as Step;
              const isActive = currentStep === stepNum;
              const isComplete = currentStep > stepNum;

              return (
                <div
                  key={step}
                  className={`flex items-center ${step < 4 ? "flex-1" : ""}`}
                >
                  <div className="flex flex-col items-center px-4">
                    <button
                      onClick={() => goToStep(stepNum)}
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-semibold
                        transition-all
                        ${
                          isActive
                            ? "bg-blue-600 text-white ring-4 ring-blue-200"
                            : isComplete
                            ? "bg-green-500 text-white cursor-pointer hover:bg-green-600"
                            : "bg-gray-300 text-gray-600 cursor-pointer hover:bg-gray-400"
                        }
                      `}
                    >
                      {isComplete ? "✓" : step}
                    </button>
                    <span
                      className={`text-xs mt-2 text-center ${
                        isActive
                          ? "font-semibold text-blue-600"
                          : "text-gray-500"
                      }`}
                    >
                      Step {step}
                    </span>
                  </div>
                  {step < 4 && (
                    <div
                      className={`
                      h-1 flex-1 mx-2
                      ${isComplete ? "bg-green-500" : "bg-gray-300"}
                    `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          {currentStep === 1 && (
            <Step1ScrapeSummaries onComplete={handleStep1Complete} />
          )}
          {currentStep === 2 && (
            <Step2ScrapeDetails onComplete={handleStep2Complete} />
          )}
          {currentStep === 3 && (
            <Step3PasteData onDataParsed={handleDataParsed} />
          )}
          {currentStep === 4 && <Step4Preview rides={rides} />}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-300">
          <div className="space-y-4">
            {/* Privacy Notice */}
            <div className="text-center text-sm text-gray-500">
              <p>
                All data processing happens in your browser. No data is sent to
                any server.
              </p>
              <p className="mt-1">
                This tool is not affiliated with Transport for London or
                Santander Cycles.
              </p>
            </div>

            {/* Horizontal Divider */}
            <div className="flex items-center justify-center">
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* GitHub Links */}
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://github.com/HCAWN/santander-cycle-stats"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Repository"
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
                <span>Repository</span>
              </a>
            </div>

            {/* Attribution & License */}
            <div className="text-center text-sm text-gray-500 space-y-1">
              <p>
                Made by{" "}
                <a
                  href="https://github.com/hcawn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  HCAWN
                </a>
              </p>
              <p>
                © 2026 •{" "}
                <a
                  href="https://github.com/HCAWN/santander-cycle-stats/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-gray-900 transition-colors"
                >
                  MIT License
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
