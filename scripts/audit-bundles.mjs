/**
 * Reports which serverless functions bundle files from public/, and how large that makes them.
 *
 * Vercel's uncompressed function limit is 250 MB. Two routes were sitting at ~125 MB of it, and
 * ~98 MB of that was every image in public/ copied inside the Lambda - which meant the deployment
 * had a hard ceiling roughly one catalogue-doubling away, with no warning until a deploy failed.
 *
 * The cause is not a config mistake. lib/business-card/resolve-images-server.ts reads artwork with
 * a computed path under public/; Next's file tracer cannot statically resolve that, so it
 * conservatively includes the whole directory. Anything that makes the read path computed will do
 * this again, which is why this is a script and not a one-off measurement.
 *
 * Run after `npx next build`:
 *   node scripts/audit-bundles.mjs
 *
 * Gitignored files are excluded, because they exist locally and never reach Vercel: card-beds
 * (raw generations) and, since the R2 move, the template artwork itself. Without that filter this
 * would report ~98 MB of images that are not in the deployment at all, and the number would never
 * change no matter how much was offloaded. The printed figure is what actually deploys.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const LIMIT_MB = 250;
const SERVER_DIR = path.join(".next", "server");

/**
 * Everything git ignores under public/ - present on this machine, absent from the deployment.
 *
 * Resolved once via `git check-ignore` over the whole directory rather than per file, because the
 * traces name thousands of paths and one process per path would take longer than the build.
 */
function gitIgnoredUnderPublic() {
  try {
    const all = execSync("git ls-files --others --ignored --exclude-standard -- public", {
      maxBuffer: 1024 * 1024 * 256,
    }).toString().split(String.fromCharCode(10)).map((f) => f.trim()).filter(Boolean);
    return new Set(all.map((f) => path.resolve(f).split(path.sep).join("/")));
  } catch {
    return new Set();
  }
}
const IGNORED = gitIgnoredUnderPublic();

const mb = (bytes) => bytes / 1048576;
const fmt = (bytes) => mb(bytes).toFixed(1).padStart(6) + " MB";

function findTraces(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findTraces(full, found);
    else if (entry.name.endsWith(".nft.json")) found.push(full);
  }
  return found;
}

const traces = findTraces(SERVER_DIR);
if (traces.length === 0) {
  console.error("No .nft.json traces found. Run `npx next build` first.");
  process.exit(1);
}

const rows = [];
for (const trace of traces) {
  const base = path.dirname(trace);
  let files;
  try {
    files = JSON.parse(fs.readFileSync(trace, "utf8")).files;
  } catch {
    continue;
  }

  let publicBytes = 0;
  let otherBytes = 0;
  let publicCount = 0;

  for (const rel of files) {
    const abs = path.resolve(base, rel);
    let size;
    try {
      size = fs.statSync(abs).size;
    } catch {
      continue; // A trace may name a file that no longer exists; not our concern here.
    }
    const posix = abs.split(path.sep).join("/");
    if (posix.includes("/public/")) {
      if (IGNORED.has(posix)) continue;
      publicBytes += size;
      publicCount += 1;
    } else {
      otherBytes += size;
    }
  }

  rows.push({
    route: trace.replace(SERVER_DIR + path.sep, "").replace(/\.js\.nft\.json$/, "").split(path.sep).join("/"),
    publicBytes,
    publicCount,
    otherBytes,
    total: publicBytes + otherBytes,
  });
}

const offenders = rows.filter((r) => r.publicCount > 0).sort((a, b) => b.total - a.total);

console.log(`Scanned ${rows.length} function traces.\n`);

if (offenders.length === 0) {
  console.log("No function bundles any file from public/. This is the goal state.");
} else {
  console.log("Functions bundling public/ (deployed sizes, card-beds excluded):\n");
  for (const r of offenders) {
    const pct = ((mb(r.total) / LIMIT_MB) * 100).toFixed(0);
    console.log(`  ${r.route}`);
    console.log(`      public/ ${fmt(r.publicBytes)}  (${r.publicCount} files)`);
    console.log(`      code    ${fmt(r.otherBytes)}`);
    console.log(`      TOTAL   ${fmt(r.total)}  = ${pct}% of the ${LIMIT_MB} MB limit\n`);
  }
}

const worst = offenders[0];
if (worst && mb(worst.total) > LIMIT_MB * 0.6) {
  console.error(
    `FAIL: ${worst.route} is at ${mb(worst.total).toFixed(1)} MB, over 60% of the ${LIMIT_MB} MB limit.`
  );
  process.exit(1);
}
