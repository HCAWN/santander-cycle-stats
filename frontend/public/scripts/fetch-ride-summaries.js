(async () => {
  const ENDPOINT = "https://santandercycles.tfl.gov.uk/bikesharefe-gql";

  const Q_LIST = `query GetCurrentUserRides($startTimeMs: String, $memberId: String) {
    member(id: $memberId) {
      id
      rideHistory(startTimeMs: $startTimeMs) {
        limit
        hasMore
        rideHistoryList {
          rideId
          startTimeMs
          endTimeMs
          duration
          rideableName
          price { formatted }
        }
      }
    }
  }`;

  // ---- knobs ----
  const START_OFFSET = 0; // set to 10 if that's how your UI starts
  const PAGE_DELAY_MS = 120; // faster paging
  const JITTER_MS = 60;
  const MAX_RETRIES = 3;
  const RETRY_BASE_MS = 500;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = () => Math.floor(Math.random() * JITTER_MS);

  function showLogoutMessage() {
    console.clear();
    console.error("╔════════════════════════════════════════╗");
    console.error("║            SESSION EXPIRED             ║");
    console.error("╚════════════════════════════════════════╝");
    console.error("");
    console.error(
      "❌ You have been logged out (sessions expire after ~15 minutes)"
    );
    console.error("");
    console.error("📋 TO CONTINUE:");
    console.error("   1. Open a NEW tab and log into:");
    console.error("      https://santandercycles.tfl.gov.uk/ride-history");
    console.error("   2. Come back to this tab");
    console.error(
      "   3. Run this script again to continue from where you left off"
    );
    console.error("");
    console.error("💡 Your progress is saved in window.__rideSummaries");
    console.error("   You can check how many rides you've fetched so far.");
  }

  function isLoggedOut(data, response) {
    // Check HTTP status
    if (response && (response.status === 401 || response.status === 403)) {
      return true;
    }

    // Check for missing member data
    if (!data || !data.member) {
      return true;
    }

    // Check for null/undefined member
    if (data.member === null || data.member === undefined) {
      return true;
    }

    return false;
  }

  async function gql(operationName, variables, query) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationName, variables, query }),
      credentials: "include",
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response (HTTP ${res.status}). Logged out?`);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (json.errors?.length)
      throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);

    // Check for logout
    if (isLoggedOut(json.data, res)) {
      showLogoutMessage();
      throw new Error("Session expired - please login and restart");
    }

    return json.data;
  }

  async function withRetries(fn, label) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn();
      } catch (e) {
        // If it's a logout error, don't retry
        if (
          e.message.includes("Session expired") ||
          e.message.includes("Logged out")
        ) {
          throw e;
        }

        if (attempt >= MAX_RETRIES)
          throw new Error(`${label} failed: ${e.message}`);
        const backoff = RETRY_BASE_MS * attempt + jitter();
        console.warn(
          `${label} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${backoff}ms`,
          e
        );
        await sleep(backoff);
      }
    }
  }

  let start = START_OFFSET;
  let limit = 10;
  let hasMore = true;
  const all = [];

  // Get estimated ride count if provided
  const estimatedRides = window.__estimatedRideCount || null;
  const startTime = Date.now();
  let pagesProcessed = 0;

  console.log("🚴 Fetching ride summaries…");
  if (estimatedRides) {
    console.log(`📊 Estimated rides: ~${estimatedRides}`);
  }
  console.log("⏱️  Time estimates will be calculated dynamically as we go...");
  console.log("");
  console.log(
    "💡 To stop the script: Type 'window.__stopFetching = true' in the console and press Enter"
  );
  console.log("");

  // Reset stop flag
  window.__stopFetching = false;

  try {
    while (hasMore) {
      // Check if user wants to stop
      if (window.__stopFetching) {
        console.log("");
        console.log("⏹️  Script stopped by user");
        if (all.length > 0) {
          window.__rideSummaries = all;
          console.log(
            `💾 Progress saved: ${all.length} rides in window.__rideSummaries`
          );
          console.log(
            "   Run this script again to continue from where you left off"
          );
        }
        break;
      }

      const data = await withRetries(
        () =>
          gql("GetCurrentUserRides", { startTimeMs: String(start) }, Q_LIST),
        `List page startTimeMs=${start}`
      );

      const rh = data?.member?.rideHistory;
      if (!rh) {
        showLogoutMessage();
        throw new Error("No member.rideHistory (logged out?)");
      }

      const page = rh.rideHistoryList || [];

      // Check for empty page when hasMore is true (potential logout)
      if (page.length === 0 && hasMore) {
        console.warn(
          "⚠️  0 results but hasMore=true — checking if logged out..."
        );
        // Try one more request to confirm
        const testData = await withRetries(
          () =>
            gql("GetCurrentUserRides", { startTimeMs: String(start) }, Q_LIST),
          `Test page startTimeMs=${start}`
        );
        if (!testData?.member?.rideHistory) {
          showLogoutMessage();
          throw new Error("Session expired - empty results indicate logout");
        }
      }

      all.push(...page);
      pagesProcessed++;

      hasMore = !!rh.hasMore;
      limit = rh.limit ?? limit;

      const progress = `+${page.length} rides (total: ${all.length})`;
      const moreInfo = hasMore ? ` | More pages remaining...` : ` | All done!`;

      // Calculate dynamic time estimate if we have estimated rides
      let progressMsg = `✅ ${progress}${moreInfo}`;
      if (estimatedRides && hasMore && pagesProcessed > 0) {
        const elapsedMs = Date.now() - startTime;
        const avgMsPerPage = elapsedMs / pagesProcessed;
        const remainingRides = estimatedRides - all.length;
        const remainingPages = Math.ceil(remainingRides / limit);
        const estimatedRemainingMs = remainingPages * avgMsPerPage;
        const estimatedRemainingSeconds = Math.round(
          estimatedRemainingMs / 1000
        );
        const estimatedRemainingMinutes = Math.floor(
          estimatedRemainingSeconds / 60
        );
        const estimatedRemainingSecs = estimatedRemainingSeconds % 60;

        const percent = Math.round((all.length / estimatedRides) * 100);
        let timeEstimate = "";
        if (estimatedRemainingMinutes > 0) {
          timeEstimate = `~${estimatedRemainingMinutes}m ${estimatedRemainingSecs}s remaining`;
        } else {
          timeEstimate = `~${estimatedRemainingSecs}s remaining`;
        }
        progressMsg += ` (~${percent}%) | ${timeEstimate}`;
      } else if (estimatedRides && hasMore) {
        const percent = Math.round((all.length / estimatedRides) * 100);
        progressMsg += ` (~${percent}%)`;
      }

      console.log(progressMsg);

      start += limit;
      if (hasMore) await sleep(PAGE_DELAY_MS + jitter());
    }

    window.__rideSummaries = all;
    console.log("");
    console.log("╔═══════════════════════════════╗");
    console.log("║      ✅ COMPLETE              ║");
    console.log("╚═══════════════════════════════╝");
    console.log("");
    console.log(`📊 Total rides fetched: ${all.length}`);
    console.log(
      `🆔 Unique ride IDs: ${new Set(all.map((r) => r.rideId)).size}`
    );
    console.log("");
    console.log("💾 Data stored in: window.__rideSummaries");
    console.log("");
    console.log(
      "➡️  Next step: Run Script B to fetch detailed information for each ride"
    );
  } catch (error) {
    // Save progress even on error
    if (all.length > 0) {
      window.__rideSummaries = all;
      console.log("");
      console.log(
        `💾 Progress saved: ${all.length} rides in window.__rideSummaries`
      );
    }
    throw error;
  }
})();
