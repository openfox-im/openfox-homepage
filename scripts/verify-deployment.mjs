const DEFAULT_MARKERS = [
  'name="openfox-deployment-platform"',
  'content="cloudflare-pages"',
  'name="openfox-pages-project"',
  'content="openfox-homepage"'
];

const args = process.argv.slice(2);
const url = args[0];

if (!url) {
  console.error("Usage: pnpm verify:url <url> [--timeout-ms=180000] [--interval-ms=5000] [--contains=<text>]");
  process.exit(1);
}

let timeoutMs = 180000;
let intervalMs = 5000;
const extraMarkers = [];

for (const arg of args.slice(1)) {
  if (arg.startsWith("--timeout-ms=")) {
    timeoutMs = Number(arg.slice("--timeout-ms=".length));
    continue;
  }

  if (arg.startsWith("--interval-ms=")) {
    intervalMs = Number(arg.slice("--interval-ms=".length));
    continue;
  }

  if (arg.startsWith("--contains=")) {
    extraMarkers.push(arg.slice("--contains=".length));
    continue;
  }

  console.error(`Unknown argument: ${arg}`);
  process.exit(1);
}

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(intervalMs) || intervalMs <= 0) {
  console.error("timeout-ms and interval-ms must be positive numbers");
  process.exit(1);
}

const expectedMarkers = [...DEFAULT_MARKERS, ...extraMarkers];
const deadline = Date.now() + timeoutMs;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAndVerify(targetUrl) {
  const requestUrl = new URL(targetUrl);
  requestUrl.searchParams.set("_verify", String(Date.now()));

  const response = await fetch(requestUrl, {
    redirect: "follow",
    headers: {
      "cache-control": "no-cache"
    }
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: `HTTP ${response.status}`
    };
  }

  const body = await response.text();
  const missing = expectedMarkers.filter((marker) => !body.includes(marker));

  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Missing markers: ${missing.join(", ")}`
    };
  }

  return {
    ok: true,
    reason: `Verified ${targetUrl}`
  };
}

let lastFailure = "Verification did not run";

while (Date.now() <= deadline) {
  try {
    const result = await fetchAndVerify(url);
    if (result.ok) {
      console.log(result.reason);
      process.exit(0);
    }

    lastFailure = result.reason;
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : String(error);
  }

  await sleep(intervalMs);
}

console.error(`Verification failed for ${url}: ${lastFailure}`);
process.exit(1);
