(async () => {
  const ENDPOINT = "https://santandercycles.tfl.gov.uk/bikesharefe-gql";

  const Q_DETAIL = `query GetCurrentUserRideDetails($rideId: String!) {
    me {
      id
      rideDetails(rideId: $rideId) {
        rideId
        startTimeMs
        endTimeMs
        price { formatted }
        startAddressStr
        endAddressStr
        paymentBreakdownMap {
          lineItems { title amount { formatted } }
          chargeAccount { cardType lastFour clientPaymentMethod }
        }
      }
    }
  }`;

  // ---- settings ----
  const DETAIL_DELAY_MS = 150; // Delay between requests (~150ms)
  const JITTER_MS = 50; // Random jitter to avoid patterns
  const MAX_RETRIES = 3;
  const RETRY_BASE_MS = 600;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = () => Math.floor(Math.random() * JITTER_MS);

  function showLogoutMessage(processedCount, totalRides, fetchedCount) {
    console.clear();
    console.error(
      "╔════════════════════════════════════════════════════════════╗"
    );
    console.error(
      "║                    SESSION EXPIRED                        ║"
    );
    console.error(
      "╚════════════════════════════════════════════════════════════╝"
    );
    console.error("");
    console.error(
      "❌ You have been logged out (sessions expire after ~15 minutes)"
    );
    console.error("");
    console.error(
      `📊 Progress: ${processedCount} / ${totalRides} rides processed`
    );
    console.error(`💾 Fetched: ${fetchedCount} ride details saved`);
    console.error("");
    console.error("📋 TO CONTINUE:");
    console.error("   1. Open a NEW tab and log into:");
    console.error("      https://santandercycles.tfl.gov.uk/ride-history");
    console.error("   2. Come back to this tab");
    console.error("   3. Run this script again - it will automatically resume");
    console.error("");
    console.error("💡 Your progress is saved in window.__rideDetails");
    console.error("   Already fetched rides will be automatically skipped.");
  }

  function isLoggedOut(data, response) {
    // Check HTTP status
    if (response && (response.status === 401 || response.status === 403)) {
      return true;
    }

    // Check for missing me data
    if (!data || !data.me) {
      return true;
    }

    // Check for null/undefined me
    if (data.me === null || data.me === undefined) {
      return true;
    }

    return false;
  }

  function transformRideDetail(rawDetail) {
    if (!rawDetail) return null;

    // Transform to analytics-ready format (removed redundant fields)
    const ride = {
      rideId: rawDetail.rideId || null,
      startTimeMs: rawDetail.startTimeMs
        ? parseInt(rawDetail.startTimeMs)
        : null,
      endTimeMs: rawDetail.endTimeMs ? parseInt(rawDetail.endTimeMs) : null,
      startAddress: rawDetail.startAddressStr || null,
      endAddress: rawDetail.endAddressStr || null,
      price: rawDetail.price?.formatted || null,
      priceBreakdown: null,
      paymentMethod: null,
    };

    // Flatten payment breakdown
    if (rawDetail.paymentBreakdownMap) {
      const lineItems = rawDetail.paymentBreakdownMap.lineItems || [];
      ride.priceBreakdown = lineItems.map((item) => ({
        title: item.title || null,
        amount: item.amount?.formatted || null,
      }));

      // Extract payment method info
      const chargeAccount = rawDetail.paymentBreakdownMap.chargeAccount;
      if (chargeAccount) {
        ride.paymentMethod = {
          cardType: chargeAccount.cardType || null,
          lastFour: chargeAccount.lastFour || null,
          clientPaymentMethod: chargeAccount.clientPaymentMethod || null,
        };
      }
    }

    return ride;
  }

  if (!window.__rideSummaries?.length) {
    throw new Error("window.__rideSummaries is empty. Run Script A first.");
  }

  // Get all unique ride IDs
  const rideIds = [
    ...new Set(window.__rideSummaries.map((r) => r.rideId).filter(Boolean)),
  ];
  const totalRides = rideIds.length;

  // Initialize or get existing ride details cache
  window.__rideDetails = window.__rideDetails || {};
  const out = window.__rideDetails;

  // Count already fetched rides
  const alreadyFetched = rideIds.filter(
    (id) => out[id] !== null && out[id] !== undefined
  ).length;
  const remainingRides = totalRides - alreadyFetched;

  console.log("🚴 Fetching ride details…");
  console.log(`📊 Total rides: ${totalRides}`);
  console.log(`✅ Already fetched: ${alreadyFetched}`);
  console.log(`🔄 Remaining: ${remainingRides}`);

  if (remainingRides === 0) {
    console.log("✅ All rides already fetched!");
  }
  console.log("⏱️  Time estimates will be calculated dynamically as we go...");
  console.log("");
  console.log(
    "💡 To stop the script: Type 'window.__stopFetching = true' in the console and press Enter"
  );
  console.log("");

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
      const fetchedCount = Object.keys(out).filter(
        (k) => out[k] !== null
      ).length;
      const processedCount = rideIds.filter(
        (id) => out[id] !== null && out[id] !== undefined
      ).length;
      showLogoutMessage(processedCount, totalRides, fetchedCount);
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

  let done = 0;
  let skipped = 0;
  let fetched = 0;
  const transformedRides = [];
  const startTime = Date.now();

  // Reset stop flag
  window.__stopFetching = false;

  try {
    for (let i = 0; i < rideIds.length; i++) {
      // Check if user wants to stop
      if (window.__stopFetching) {
        console.log("");
        console.log("⏹️  Script stopped by user");
        const savedCount = Object.keys(out).filter(
          (k) => out[k] !== null
        ).length;
        console.log(
          `💾 Progress saved: ${savedCount} ride details in window.__rideDetails`
        );
        console.log(
          "   Run this script again to continue from where you left off"
        );
        break;
      }

      const rideId = rideIds[i];

      // Skip if already fetched
      if (out[rideId] !== null && out[rideId] !== undefined) {
        skipped++;
        done++;
        if (skipped === 1 || skipped % 50 === 0) {
          console.log(
            `⏭️  Skipping already-fetched ride ${
              i + 1
            }/${totalRides} (${skipped} skipped so far)`
          );
        }
        continue;
      }

      const data = await withRetries(
        () => gql("GetCurrentUserRideDetails", { rideId }, Q_DETAIL),
        `Details rideId=${rideId}`
      );

      const details = data?.me?.rideDetails;
      if (!details) {
        console.warn(`⚠️  No rideDetails for ${rideId}`);
        out[rideId] = null; // mark as attempted
        done++;
      } else {
        const transformed = transformRideDetail(details);
        out[rideId] = transformed;
        transformedRides.push(transformed);
        fetched++;
        done++;

        // Calculate dynamic time estimate based on actual performance
        const elapsedMs = Date.now() - startTime;
        const avgMsPerRide = fetched > 0 ? elapsedMs / fetched : 400; // fallback to 400ms if no data yet
        const remainingRides = totalRides - done;
        const estimatedRemainingMs = remainingRides * avgMsPerRide;
        const estimatedRemainingSeconds = Math.round(
          estimatedRemainingMs / 1000
        );
        const estimatedRemainingMinutes = Math.floor(
          estimatedRemainingSeconds / 60
        );
        const estimatedRemainingSecs = estimatedRemainingSeconds % 60;

        // Format time estimate
        let timeEstimate = "";
        if (estimatedRemainingMinutes > 0) {
          timeEstimate = `~${estimatedRemainingMinutes}m ${estimatedRemainingSecs}s remaining`;
        } else {
          timeEstimate = `~${estimatedRemainingSecs}s remaining`;
        }

        // Log each response
        const progress = `${done}/${totalRides}`;
        const percent = Math.round((done / totalRides) * 100);
        const remaining = totalRides - done;
        console.log(
          `✅ Fetched ride ${progress} (${percent}%) | ${remaining} remaining | ${timeEstimate}`
        );
      }

      // Small delay between requests (responses take ~400ms, so this is just spacing)
      await sleep(DETAIL_DELAY_MS + jitter());
    }

    console.log("");
    console.log("╔═══════════════════════════════╗");
    console.log("║      ✅ COMPLETE              ║");
    console.log("╚═══════════════════════════════╝");
    console.log("");
    console.log(`📊 Processed: ${done} rides`);
    console.log(`⏭️  Skipped: ${skipped} (already fetched)`);
    console.log(`🔄 Fetched: ${fetched} new ride details`);
    console.log(
      `💾 Total cached: ${
        Object.keys(out).filter((k) => out[k] !== null).length
      }`
    );
    console.log("");

    // Create analytics-ready array from all fetched rides
    const allRides = rideIds
      .map((id) => out[id])
      .filter((ride) => ride !== null && ride !== undefined);

    if (allRides.length > 0) {
      // Copy to clipboard
      const jsonString = JSON.stringify(allRides, null, 2);
      if (typeof copy === "function") {
        copy(jsonString);
        console.log("📋 Copied analytics-ready JSON array to clipboard!");
        console.log(`   (${allRides.length} total rides)`);
      } else {
        console.log("📋 Analytics-ready JSON array:");
        console.log(jsonString);
      }
      console.log("");
      console.log("➡️  Paste this data into the website for visualization");
    } else {
      console.log("ℹ️  No rides to copy");
    }
  } catch (error) {
    // Save progress even on error
    const savedCount = Object.keys(out).filter((k) => out[k] !== null).length;
    console.log("");
    console.log(
      `💾 Progress saved: ${savedCount} ride details in window.__rideDetails`
    );
    console.log(`   Run this script again to continue from where you left off`);
    throw error;
  }
})();
