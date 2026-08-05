import fs from "node:fs";
import path from "node:path";

/**
 * Downloads the regular (400) cut of every editor font that currently ships only bold.
 *
 * The PDF export registers one TrueType file per family, so a family bundled at weight 700 renders
 * every weight bold - including the body text on a card whose proof showed it regular. The PNG proof
 * goes through librsvg, which resolves fonts by name and honours font-weight, so the proof and the
 * print file disagreed and only the printed piece was wrong.
 *
 *   node scripts/fetch-regular-fonts.mjs
 */

const DIR = "lib/business-card/fonts-ttf";

/** Families bundled at 700. The rest are display faces that only exist in one weight. */
const FAMILIES = [
  ["Inter", "inter"],
  ["Montserrat", "montserrat"],
  ["Poppins", "poppins"],
  ["Raleway", "raleway"],
  ["Roboto", "roboto"],
  ["Open Sans", "open-sans"],
  ["Oswald", "oswald"],
  ["Space Grotesk", "space-grotesk"],
  ["Josefin Sans", "josefin-sans"],
  ["Barlow Condensed", "barlow-condensed"],
  ["Work Sans", "work-sans"],
  ["Nunito", "nunito"],
  ["Playfair Display", "playfair-display"],
  ["Merriweather", "merriweather"],
  ["Lora", "lora"],
  ["Libre Baskerville", "libre-baskerville"],
  ["Cormorant Garamond", "cormorant-garamond"],
  ["Cinzel", "cinzel"],
  ["Dancing Script", "dancing-script"],
  ["Caveat", "caveat"],
];

// Requesting without a modern browser UA makes Google Fonts serve TrueType rather than woff2,
// which is what PDFKit's registerFont can embed.
const UA = "Mozilla/5.0";

async function ttfUrlFor(family) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400&display=swap`;
  const css = await fetch(url, { headers: { "user-agent": UA } }).then((r) => r.text());
  const m = css.match(/url\((https:\/\/[^)]+\.ttf)\)/);
  return m?.[1] ?? null;
}

let ok = 0;
let failed = 0;

for (const [family, slug] of FAMILIES) {
  const out = path.join(DIR, `${slug}-400.ttf`);
  if (fs.existsSync(out)) { console.log(`  ${family.padEnd(20)} already present`); ok++; continue; }
  try {
    const ttf = await ttfUrlFor(family);
    if (!ttf) { console.log(`  ${family.padEnd(20)} no TTF offered`); failed++; continue; }
    const buf = Buffer.from(await fetch(ttf, { headers: { "user-agent": UA } }).then((r) => r.arrayBuffer()));
    if (buf.length < 5000) { console.log(`  ${family.padEnd(20)} suspiciously small (${buf.length}B), skipped`); failed++; continue; }
    fs.writeFileSync(out, buf);
    console.log(`  ${family.padEnd(20)} ${(buf.length / 1024).toFixed(0)}KB -> ${slug}-400.ttf`);
    ok++;
  } catch (err) {
    console.log(`  ${family.padEnd(20)} failed: ${String(err).slice(0, 60)}`);
    failed++;
  }
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`\n${ok} regular cuts available, ${failed} failed`);
