import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Rebuilds the link-preview card so it carries the logo, not just the words.
 *
 * The old card was the wordmark set in type on a plain background. It said the right name, but the
 * mark people recognise - the black tile with the CMYK bar - was nowhere on it, so a link pasted
 * into a message showed no branding at all.
 *
 * Composited from public/icon-512.png rather than redrawn, so the card and the favicon and the
 * schema logo are all provably the same artwork.
 *
 *   npx tsx --env-file=.env.local scripts/generate-og-card.mjs
 */

const OUT = path.join(process.cwd(), "public", "og-default.png");
const MARK = path.join(process.cwd(), "public", "icon-512.png");

const W = 1200;
const H = 630;
const BG = "#FAFAF8";
const INK = "#121110";
const MUTED = "#575757";

/** The CMYK registration bar the brand uses as a rule across the top. */
const BAR = [
  { color: "#0099D8", x: 0 },
  { color: "#E6007E", x: 300 },
  { color: "#FBC800", x: 600 },
  { color: "#121110", x: 900 },
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${BAR.map((b) => `<rect x="${b.x}" y="0" width="300" height="10" fill="${b.color}"/>`).join("")}
  <text x="380" y="300" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="96"
        font-weight="800" fill="${INK}">611 Printing</text>
  <text x="384" y="358" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="${MUTED}">
    Business cards, postcards, banners and signs
  </text>
</svg>`;

const mark = await sharp(MARK).resize(220, 220).toBuffer();

const card = await sharp(Buffer.from(svg))
  .composite([{ input: mark, top: 205, left: 120 }])
  .png()
  .toBuffer();

fs.writeFileSync(OUT, card);
const meta = await sharp(card).metadata();
console.log(`  wrote ${OUT} (${meta.width}x${meta.height}, ${(card.length / 1024).toFixed(0)}KB)`);
