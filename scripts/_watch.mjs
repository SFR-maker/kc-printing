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
  const ps =
    "(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
    "Where-Object { $_.CommandLine -like '*scrape-gotprint.mjs*' -and $_.CommandLine -notlike '*CimInstance*' }).Count";
  try {
    const n = Number(String(execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, { encoding: "utf8" })).trim());
    return Number.isFinite(n) ? n : -1;
  } catch { return -1; }
};

let prev = Object.fromEntries(Object.keys(FILES).map((k) => [k, count(FILES[k])]));
let stalls = 0;

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

  if (!moved && live > 0) {
    stalls++;
    console.log(`STALLED x${stalls} | ${live} scraper(s) running but no new prices in 10min | ${total} total | ${parts.join(" · ")}`);
  } else if (live === 0) {
    console.log(`ALL SCRAPERS FINISHED | ${total} prices | ${parts.join(" · ")}`);
    break;
  } else {
    stalls = 0;
    console.log(`OK check ${tick} | ${live} running | ${total} prices | ${parts.join(" · ")}`);
  }
  prev = now;
}
