import fs from "node:fs";
import path from "node:path";

/**
 * Corrects 14 pt. Uncoated Cover pricing against GotPrint's published figures.
 *
 * The original scrape captured gloss prices for the uncoated stock. Every other stock in the table
 * was checked against the verified spreadsheet and matches exactly at its real starting quantity,
 * so this is the one column that is wrong - and it is wrong in the expensive direction: the site
 * has been quoting $16.45 for 250 uncoated cards that cost $27.30 to buy. Every uncoated order
 * placed so far has been sold below cost.
 *
 * Verified quantities are replaced outright. The rest are scaled by the correction ratio at the
 * nearest verified quantity, which preserves the volume-break shape rather than inventing one - the
 * ratio converges to about 1.19 above 5,000, so the extrapolation is stable where it matters.
 *
 *   npx tsx scripts/correct-uncoated-pricing.ts [--apply]
 */

/** GotPrint's published 14 pt. Uncoated totals, standard 2 x 3.5 in, full colour front. */
const VERIFIED: Record<number, number> = {
  50: 14.7,
  100: 16.8,
  250: 27.3,
  500: 31.5,
  1000: 42.7,
  2500: 67.2,
  5000: 126,
  10000: 241.5,
  15000: 356.93,
  20000: 472.29,
  25000: 587.58,
  50000: 1162.98,
};

const UNCOATED_PAPER_ID = 2;
/** The combo the spreadsheet was measured against. */
const REFERENCE_KEY = `101_${UNCOATED_PAPER_ID}_1`;

interface Data {
  matrix: Record<string, Record<string, number>>;
  papers: { id: number; label: string }[];
}

function main() {
  const apply = process.argv.includes("--apply");
  const file = path.join(process.cwd(), "lib/pricing/business-card-data.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as Data;

  const reference = data.matrix[REFERENCE_KEY];
  if (!reference) throw new Error(`${REFERENCE_KEY} missing from the matrix`);

  // Ratio per verified quantity, measured once on the reference combo and reused everywhere. Other
  // sizes and colour options carry the same error, because they were scraped the same way.
  const ratios = new Map<number, number>();
  for (const [q, verified] of Object.entries(VERIFIED)) {
    const current = reference[q];
    if (current) ratios.set(Number(q), verified / current);
  }
  const sortedQ = [...ratios.keys()].sort((a, b) => a - b);

  /** Nearest verified quantity's ratio, for the break points the spreadsheet does not cover. */
  function ratioFor(qty: number): number {
    let best = sortedQ[0];
    for (const q of sortedQ) {
      if (Math.abs(q - qty) < Math.abs(best - qty)) best = q;
    }
    return ratios.get(best)!;
  }

  const keys = Object.keys(data.matrix).filter((k) => k.split("_")[1] === String(UNCOATED_PAPER_ID));
  let changed = 0;

  for (const key of keys) {
    const row = data.matrix[key];
    for (const q of Object.keys(row)) {
      const qty = Number(q);
      const next =
        key === REFERENCE_KEY && VERIFIED[qty] !== undefined
          ? VERIFIED[qty]
          : round2(row[q] * ratioFor(qty));
      if (Math.abs(next - row[q]) >= 0.005) {
        if (key === REFERENCE_KEY) {
          console.log(`  ${q.padStart(6)}  ${row[q].toFixed(2).padStart(9)} -> ${next.toFixed(2).padStart(9)}`);
        }
        row[q] = next;
        changed++;
      }
    }
  }

  console.log(`\n${changed} price(s) across ${keys.length} size/colour combos.`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write.");
    return;
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log("Written.");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

main();
