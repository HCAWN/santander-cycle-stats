export default function AnalyticsShowcase() {
  const screenshots = [
    { id: 1, title: "All Your Stats in One Place" },
    { id: 2, title: "How Long And When Do You Ride?" },
    { id: 3, title: "All the Stations You've Visited" },
    { id: 4, title: "Your Favourite Stations" },
    { id: 5, title: "The Routes You've Taken" },
    { id: 6, title: "See Your Routes on a Map" },
  ];

  return (
    <div className="mb-12">
      <div className="text-center mb-8 pt-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          See What You Can Do With Your Data 🚴
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          I built this tool to explore my own Boris bike history - check out
          what you can discover about your rides! Everything runs right in your
          browser so your data never leaves your machine, and it's all{" "}
          <a
            href="https://github.com/HCAWN/santander-cycle-stats"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            open source
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {screenshots.map((screenshot) => (
          <div
            key={screenshot.id}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
          >
            <div className="aspect-video bg-white overflow-hidden">
              <img
                src={`/screenshots/screenshot_${screenshot.id}.jpg`}
                alt={screenshot.title}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900">
                {screenshot.title}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Ready to give it a go? Follow the steps below to get your data sorted!
        </p>
      </div>
    </div>
  );
}
