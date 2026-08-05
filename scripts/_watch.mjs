import fs from "node:fs";
import { execSync } from "node:child_process";

const FILES = {
  banners: "lib/pricing/banners-scraped.json",
  postcards: "lib/pricing/postcards-scraped.json",
  "corrugated-boards": "lib/pricing/corrugated-boards-scraped.json",
  "foam-boards": "lib/pricing/foam-boards-scraped.json",
  "yard-signs": "lib/pricing/yard-signs-scraped.json",
};

const count = (f) => {
  try { return Object.keys(JSON.parse(fs.readFileSync(f, "utf8")).prices).length; }
  catch { return 0; }
};
const liveScrapers = () => {
  // Matches the script invocation specifically, and excludes the probe process itself - the
  // PowerShell filter string contains the pattern, so a looser match counted this check as a
  // scraper and the watcher could never observe zero.
  // @() is load-bearing. Without it, a pipeline matching exactly one process returns an empty
  // string rather than 1 - PowerShell unrolls a single object and .Count yields nothing. That
  // became Number("") === 0 here, so the watcher reported "no scrapers running" while one was, and
  // a duplicate got started on top of it. Both processes then wrote the same file, each save
  // discarding the other's work.
  const ps =
    "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
    "Where-Object { $_.CommandLine -like '*scrape-gotprint.mjs*' -and $_.CommandLine -notlike '*CimInstance*' }).Count";
  try {
    const raw = String(execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, { encoding: "utf8" })).trim();
    if (raw === "") return -1; // unreadable, not zero
    const n = Number(raw);
    return Number.isFinite(n) ? n : -1;
  } catch { return -1; }
};

/**
 * Seconds since any scraper last wrote a line of output.
 *
 * Price counts are the wrong progress signal: a scraper saves once per size, and one postcard size
 * takes about seventeen minutes, so a ten-minute window routinely shows no change and looked like a
 * stall when the run was perfectly healthy. The log is written every twenty combinations, so its
 * modification time is the honest measure of whether work is happening.
 */
const secondsSinceOutput = () => {
  const dir = process.env.SCRAPE_LOG_DIR;
  if (!dir || !fs.existsSync(dir)) return null;
  let newest = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".output")) continue;
    try { newest = Math.max(newest, fs.statSync(`${dir}/${f}`).mtimeMs); } catch {}
  }
  return newest ? Math.round((Date.now() - newest) / 1000) : null;
};

/** A run is only stalled when nothing has been written for this long. */
const STALL_SECONDS = 6 * 60;

let prev = Object.fromEntries(Object.keys(FILES).map((k) => [k, count(FILES[k])]));
let stalls = 0;
let zeroes = 0;

for (let tick = 1; ; tick++) {
  await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
  const now = Object.fromEntries(Object.keys(FILES).map((k) => [k, count(FILES[k])]));
  const live = liveScrapers();
  const parts = Object.keys(FILES).map((k) => {
    const d = now[k] - prev[k];
    return `${k.slice(0, 9)} ${now[k]}${d > 0 ? `(+${d})` : ""}`;
  });
  const total = Object.values(now).reduce((a, b) => a + b, 0);
  const moved = Object.keys(FILES).some((k) => now[k] > prev[k]);

  const quietFor = secondsSinceOutput();
  const reallyStalled = live > 0 && quietFor !== null && quietFor > STALL_SECONDS;

  if (reallyStalled) {
    stalls++;
    console.log(`STALLED x${stalls} | ${live} scraper(s) running but silent for ${quietFor}s | ${total} prices | ${parts.join(" · ")}`);
  } else if (live === 0) {
    // Two consecutive zero readings before declaring completion. One was enough to be wrong: a
    // single transient miscount reported "finished" while a scraper was still going, a second was
    // started on top of it, and two processes then wrote the same file - each save discarding
    // whatever the other had added since it loaded.
    zeroes++;
    if (zeroes >= 2) {
      console.log(`ALL SCRAPERS FINISHED | ${total} prices | ${parts.join(" · ")}`);
      break;
    }
    console.log(`possible finish (${zeroes}/2) | ${total} prices | ${parts.join(" · ")}`);
  } else {
    stalls = 0;
    zeroes = 0;
    const quiet = quietFor === null ? "" : ` | last output ${quietFor}s ago`;
    console.log(`OK check ${tick} | ${live} running | ${total} prices${quiet} | ${parts.join(" · ")}`);
  }
  prev = now;
}
