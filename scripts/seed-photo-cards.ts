/**
 * Turns the generated design beds into real, browsable business card templates.
 *
 * The beds are full-bleed photographic compositions with no lettering. This script does the two
 * things that stand between a folder of images and something a customer can pick:
 *
 *  1. Crops the border artifact. The model renders a card-shaped OBJECT with its own dark edge
 *     rather than pure edge-to-edge bleed, so every bed carries a thin dark frame. Left alone that
 *     frame would print as a black line around the card. A 2.5% inset crop removes it and the
 *     result is re-fitted to the authored bleed size.
 *
 *  2. Lays editable text into the empty zone each layout was generated to leave. The prompt told
 *     the model which region to keep clear, and the layout's `textZone` records that, so the type
 *     lands where there is actually room for it rather than over the photograph.
 *
 * Run:  npx tsx --env-file=.env.local scripts/seed-photo-cards.ts [--dry]
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { db } from "../lib/prisma";

const BEDS_DIR = path.join(process.cwd(), "public", "images", "card-beds");
const OUT_DIR = path.join(process.cwd(), "public", "images", "card-art");

/** Authored card: 3.5 x 2 trim plus the 0.125in authored bleed the template system expects. */
const W = 3.75;
const H = 2.25;
/** Content must clear bleed + safe zone on every edge. */
const SAFE = 0.25;

/** The model draws a card-shaped object; this much off each edge removes its border. */
const CROP_INSET = 0.025;

type Zone = "right" | "left" | "bottom" | "centre";

/** Which region each layout was generated to leave empty. Must match generate-card-beds.ts. */
const ZONE_BY_LAYOUT: Record<string, Zone> = {
  "angled-split": "right",
  "torn-edge": "right",
  "full-bleed-scrim": "left",
  "corner-wedge": "bottom",
  "vertical-band": "right",
  "arc-cut": "right",
  duotone: "centre",
  "inset-frame": "bottom",
  triptych: "right",
  "macro-texture": "centre",
};

/**
 * Whether the type goes light or dark, per LAYOUT rather than per zone.
 *
 * Zone was the wrong axis. Every layout except one leaves its empty area either as a saturated
 * brand-colour panel or as a deliberately darkened part of the photograph, so the type is white.
 * The first pass keyed this off the zone and put black type on a navy panel: legible in the
 * abstract, invisible on the card.
 *
 * vertical-band is the exception, and by design: its prompt asks for the right side to be slightly
 * overexposed and low contrast precisely so dark type sits on it.
 */
const DARK_TYPE_LAYOUTS = new Set(["vertical-band"]);

interface Box { x: number; y: number; w: number }

function zoneBox(zone: Zone): Box {
  switch (zone) {
    // The colour panel occupies the right 45%; type sits inside it, clear of the diagonal.
    // x=2.35, not 2.05: the angled and arc layouts cut into the panel, and at 2.05 the
    // first two characters of every line sat on the photograph on the wrong side of the cut.
    case "right": return { x: 2.35, y: 0.58, w: W - SAFE - 2.35 };
    case "left": return { x: SAFE, y: 0.62, w: 1.55 };
    case "bottom": return { x: SAFE, y: 1.34, w: W - SAFE * 2 };
    case "centre": return { x: SAFE + 0.25, y: 0.72, w: W - (SAFE + 0.25) * 2 };
  }
}

const text = (
  id: string, t: string, box: Box, dy: number, sizePt: number,
  weight: "400" | "600" | "700" | "900", color: string, opts: Partial<Record<string, unknown>> = {}
) => ({
  id, type: "text" as const, text: t,
  x: box.x, y: box.y + dy, width: box.w, height: sizePt / 72 * 1.35,
  rotation: 0, opacity: 1, locked: false, visible: true,
  fontFamily: "Inter", fontSizePt: sizePt, fontWeight: weight,
  italic: false, underline: false, textTransform: "none" as const,
  align: "left" as const, lineHeight: 1.15, letterSpacing: 0,
  color, backgroundColor: null, ...opts,
});

function buildFront(src: string, zone: Zone, layout: string) {
  const box = zoneBox(zone);
  const light = !DARK_TYPE_LAYOUTS.has(layout);
  const ink = light ? "#FFFFFF" : "#111111";
  const muted = light ? "#E6E6E6" : "#444444";

  return {
    physicalWidthIn: W,
    physicalHeightIn: H,
    bleedIn: 0.125,
    safeZoneInsetIn: 0.125,
    shapeMask: "rectangle" as const,
    background: { type: "solid" as const, color: "#FFFFFF", gradient: null },
    elements: [
      {
        id: "bed",
        type: "image" as const,
        src,
        naturalWidthPx: 1125,
        naturalHeightPx: 675,
        crop: null,
        borderWidthPx: 0,
        borderColor: "#000000",
        cornerRadiusIn: 0,
        // Full bleed, and locked: the photograph is the template. Someone dragging it off the card
        // by accident while trying to select the text behind it is the obvious failure here.
        x: 0, y: 0, width: W, height: H,
        rotation: 0, opacity: 1, locked: true, visible: true,
        name: "Background",
      },
      text("name", "Your Name", box, 0, 13, "900", ink),
      text("role", "Your Title", box, 0.26, 8.5, "600", muted, { textTransform: "uppercase", letterSpacing: 0.06 }),
      text("phone", "(816) 555-0100", box, 0.56, 8, "400", ink),
      text("email", "hello@yourbusiness.com", box, 0.74, 8, "400", ink),
      text("web", "yourbusiness.com", box, 0.92, 8, "400", muted),
    ],
  };
}

function buildBack(layout: string) {
  const light = !DARK_TYPE_LAYOUTS.has(layout);
  return {
    physicalWidthIn: W, physicalHeightIn: H, bleedIn: 0.125, safeZoneInsetIn: 0.125,
    shapeMask: "rectangle" as const,
    background: { type: "solid" as const, color: light ? "#141414" : "#FFFFFF", gradient: null },
    elements: [
      text("back-name", "Your Business", { x: SAFE, y: 0.85, w: W - SAFE * 2 }, 0, 16, "900",
        light ? "#FFFFFF" : "#111111", { align: "center" as const }),
      text("back-web", "yourbusiness.com", { x: SAFE, y: 0.85, w: W - SAFE * 2 }, 0.3, 9, "400",
        light ? "#CCCCCC" : "#555555", { align: "center" as const }),
    ],
  };
}

const titleCase = (s: string) =>
  s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

async function main() {
  const dry = process.argv.includes("--dry");
  if (!fs.existsSync(BEDS_DIR)) throw new Error(`no beds at ${BEDS_DIR}`);

  const industries = fs.readdirSync(BEDS_DIR).filter((d) =>
    fs.statSync(path.join(BEDS_DIR, d)).isDirectory()
  );

  let made = 0, skipped = 0;
  for (const industry of industries) {
    const files = fs.readdirSync(path.join(BEDS_DIR, industry)).filter((f) => f.endsWith(".webp"));
    for (const file of files) {
      // "03-full-bleed-scrim.webp" -> index 03, layout full-bleed-scrim
      const m = file.match(/^(\d+)-(.+)\.webp$/);
      if (!m) { skipped++; continue; }
      const [, idx, layout] = m;
      const zone = ZONE_BY_LAYOUT[layout];
      if (!zone) { console.warn(`  unknown layout ${layout}`); skipped++; continue; }

      // Crop the model's own card border away, then re-fit to the authored bleed proportions.
      /*
       * JPEG, not WebP.
       *
       * The thumbnails and every raster export go through librsvg (via sharp), which rasterises the
       * card as an SVG with the artwork inlined as a data URI in an <image href>. librsvg cannot
       * decode WebP there, so the photograph silently vanished and the thumbnail came out as text
       * on a blank card - no error anywhere, the element was simply not drawn.
       */
      const artRel = `/images/card-art/${industry}/${idx}-${layout}.jpg`;
      const artAbs = path.join(OUT_DIR, industry, `${idx}-${layout}.jpg`);
      if (!dry && !fs.existsSync(artAbs)) {
        const srcAbs = path.join(BEDS_DIR, industry, file);
        const meta = await sharp(srcAbs).metadata();
        const iw = meta.width ?? 1125, ih = meta.height ?? 675;
        const dx = Math.round(iw * CROP_INSET), dy = Math.round(ih * CROP_INSET);
        fs.mkdirSync(path.dirname(artAbs), { recursive: true });
        await sharp(srcAbs)
          .extract({ left: dx, top: dy, width: iw - dx * 2, height: ih - dy * 2 })
          .resize(1125, 675, { fit: "cover" })
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer()
          .then((b) => fs.writeFileSync(artAbs, b));
      }

      const slug = `photo-${industry}-${idx}-${layout}`;
      const row = {
        schemaVersion: 1,
        product: "BUSINESS_CARD" as const,
        slug,
        title: `${titleCase(industry)} ${titleCase(layout)}`,
        description: `A photographic ${layout.replace(/-/g, " ")} business card for ${titleCase(industry).toLowerCase()}.`,
        industry,
        style: layout,
        tags: [industry, layout, "photo", "premium"],
        orientation: "landscape",
        palette: [] as string[],
        fontFamilies: ["Inter"],
        thumbnailFront: null,
        thumbnailBack: null,
        front: buildFront(artRel, zone, layout) as unknown as object,
        back: buildBack(layout) as unknown as object,
        source: "MANUAL" as const,
        active: true,
      };

      if (!dry) {
        await db.cardTemplate.upsert({ where: { slug }, update: row, create: row });
      }
      made++;
    }
  }

  console.log(`${dry ? "[dry] " : ""}${made} templates, ${skipped} skipped`);
  if (!dry) {
    const n = await db.cardTemplate.count({ where: { product: "BUSINESS_CARD", active: true } });
    console.log(`BUSINESS_CARD active total: ${n}`);
  }
  await db.$disconnect();
}

main();
