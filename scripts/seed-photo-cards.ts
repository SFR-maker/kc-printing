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
import { findTextBox } from "./lib-place-text";
import { termsForCategory } from "../lib/business-card/templates/occupations";
import { refitSide } from "../lib/business-card/refit";
import { defaultSizeFor, PRODUCT_DB_VALUE, type DesignProduct } from "../lib/business-card/print-spec";

/**
 * The same artwork, refitted for every product.
 *
 * The beds are photographs and flat colour panels, not card-shaped objects, so they carry over to a
 * postcard or a banner without regenerating anything: refitSide covers the background to the new
 * aspect and clamps the type back inside the new safe area. Business cards keep all ten layouts;
 * the others take a spread of three so every category is represented on every product without the
 * gallery becoming four thousand near-identical rows.
 */
const PRODUCTS: { product: DesignProduct; layoutsPerCategory: number }[] = [
  { product: "business-card", layoutsPerCategory: 10 },
  { product: "postcard", layoutsPerCategory: 2 },
  { product: "banner", layoutsPerCategory: 2 },
  { product: "rigid-sign", layoutsPerCategory: 2 },
  { product: "window-decal", layoutsPerCategory: 2 },
];

/** Finished size including bleed for a product's default preset. */
function docSizeFor(product: DesignProduct) {
  const p = defaultSizeFor(product);
  return {
    widthIn: p.trimWidthIn + p.bleedIn * 2,
    heightIn: p.trimHeightIn + p.bleedIn * 2,
    bleedIn: p.bleedIn,
    safeZoneInsetIn: p.safeZoneInsetIn,
  };
}

const BEDS_DIR = path.join(process.cwd(), "public", "images", "card-beds");
const OUT_DIR = path.join(process.cwd(), "public", "images", "card-art");

/** Authored card: 3.5 x 2 trim plus the 0.125in authored bleed the template system expects. */
const W = 3.75;
const H = 2.25;
/** Content must clear bleed + safe zone on every edge. */
const SAFE = 0.25;

/** The model draws a card-shaped object; this much off each edge removes its border. */
const CROP_INSET = 0.025;

/**
 * Type is laid into the flattest region the artwork actually has, measured per image.
 *
 * The previous version hardcoded a box per layout from what the prompt had asked the model to
 * leave clear. The model did not oblige consistently, so on triptych the phone number ran straight
 * through the white gutter between two photo panels, and on others the type sat on photography.
 * See lib-place-text.ts.
 */

/** Roughly the width of a character as a fraction of font size, for Inter at these weights. */
const CHAR_W = 0.52;

/** Largest size at which `text` fits `widthIn`, clamped to a legible range. */
function fitPt(text: string, widthIn: number, max: number, min = 5.5): number {
  const ptForWidth = (widthIn / (text.length * CHAR_W)) * 72;
  return Math.max(min, Math.min(max, ptForWidth));
}

const text = (
  id: string, t: string, box: { x: number; y: number; w: number }, dy: number, sizePt: number,
  weight: "400" | "600" | "700" | "900", color: string, opts: Record<string, unknown> = {}
) => ({
  id, type: "text" as const, text: t,
  x: box.x, y: box.y + dy, width: box.w, height: (sizePt / 72) * 1.35,
  rotation: 0, opacity: 1, locked: false, visible: true,
  fontFamily: "Inter", fontSizePt: sizePt, fontWeight: weight,
  italic: false, underline: false, textTransform: "none" as const,
  align: "left" as const, lineHeight: 1.15, letterSpacing: 0,
  color, backgroundColor: null, ...opts,
});

function buildFront(
  src: string,
  place: { x: number; y: number; w: number; h: number; light: boolean; variance: number }
) {
  const box = { x: place.x * W, y: place.y * H, w: place.w * W };

  /*
   * Some layouts have no flat area to find.
   *
   * duotone and macro-texture are full-bleed photography by definition, so the "emptiest" region is
   * still photographic detail - an audit put 27 of 77 cards above a variance of 400, which is type
   * sitting on a picture. Where that happens the card gets a scrim: a soft dark panel behind the
   * type only. It is what a designer would do, it costs nothing, and it makes the result independent
   * of how cooperative the generated image was.
   */
  const needsScrim = place.variance > 300;
  const light = needsScrim ? true : place.light;
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
      ...(needsScrim
        ? [{
            id: "scrim",
            type: "shape" as const,
            shape: "rect" as const,
            // Generous around the type block so the panel reads as deliberate rather than as a
            // label stuck on the photograph.
            x: Math.max(0, box.x - 0.16),
            y: Math.max(0, place.y * H - 0.14),
            width: Math.min(W - Math.max(0, box.x - 0.16), box.w + 0.32),
            height: Math.min(H - Math.max(0, place.y * H - 0.14), place.h * H + 0.28),
            cornerRadiusIn: 0.06,
            fill: "#0B0B0C",
            gradient: null,
            stroke: null,
            strokeWidthPx: 0,
            rotation: 0,
            opacity: 0.55,
            locked: true,
            visible: true,
            name: "Text panel",
          }]
        : []),
      // Every line is sized to the measured box, so a narrow flat panel gets smaller type rather
      // than type that overruns the panel onto the photograph.
      ...(() => {
        const namePt = fitPt("Your Name", box.w, 15);
        const bodyPt = fitPt("hello@yourbusiness.com", box.w, 8.5);
        const rolePt = fitPt("YOUR TITLE", box.w, bodyPt * 1.05);
        const lh = bodyPt / 72 * 1.55;
        let y = 0;
        const rows = [
          text("name", "Your Name", box, y, namePt, "900", ink),
          text("role", "Your Title", box, (y += namePt / 72 * 1.35), rolePt, "600", muted,
            { textTransform: "uppercase", letterSpacing: 0.05 }),
          text("phone", "(816) 555-0100", box, (y += rolePt / 72 * 2.3), bodyPt, "400", ink),
          text("email", "hello@yourbusiness.com", box, (y += lh), bodyPt, "400", ink),
          text("web", "yourbusiness.com", box, (y += lh), bodyPt, "400", muted),
        ];
        return rows;
      })(),
    ],
  };
}

function buildBack(light: boolean) {
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

const PRODUCT_LABEL: Record<DesignProduct, string> = {
  "business-card": "business card",
  postcard: "postcard",
  banner: "banner",
  "rigid-sign": "rigid sign",
  "window-decal": "window decal",
};

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
      void layout;

      // Crop the model's own card border away, then re-fit to the authored bleed proportions.
      /*
       * JPEG, not WebP.
       *
       * The thumbnails and every raster export go through librsvg (via sharp), which rasterises the
       * card as an SVG with the artwork inlined as a data URI in an <image href>. librsvg cannot
       * decode WebP there, so the photograph silently vanished and the thumbnail came out as text
       * on a blank card - no error anywhere, the element was simply not drawn.
       */
      const artRel = `/images/card-art/${industry}/${idx}-${layout}.webp`;
      const artAbs = path.join(OUT_DIR, industry, `${idx}-${layout}.webp`);
      if (!fs.existsSync(artAbs)) {
        const srcAbs = path.join(BEDS_DIR, industry, file);
        const meta = await sharp(srcAbs).metadata();
        const iw = meta.width ?? 1125, ih = meta.height ?? 675;
        const dx = Math.round(iw * CROP_INSET), dy = Math.round(ih * CROP_INSET);
        fs.mkdirSync(path.dirname(artAbs), { recursive: true });
        await sharp(srcAbs)
          .extract({ left: dx, top: dy, width: iw - dx * 2, height: ih - dy * 2 })
          .resize(1125, 675, { fit: "cover" })
          .webp({ quality: 78, effort: 5 })
          .toBuffer()
          .then((b) => fs.writeFileSync(artAbs, b));
      }

      // Measured on the cropped artwork, so the box reflects what the card actually looks like
      // rather than what the generation prompt asked for.
      const place = await findTextBox(artAbs);

      const bcFront = buildFront(artRel, place) as unknown as Parameters<typeof refitSide>[0];
      const bcBack = buildBack(place.light) as unknown as Parameters<typeof refitSide>[0];
      const layoutIndex = Number(idx) - 1;

      for (const { product, layoutsPerCategory } of PRODUCTS) {
        // A spread across the ten layouts rather than the first three, so the non-card products do
        // not all end up showing the same three compositions in every category.
        const step = Math.max(1, Math.round(10 / layoutsPerCategory));
        if (layoutsPerCategory < 10 && layoutIndex % step !== 0) continue;

        const doc = docSizeFor(product);
        const isCard = product === "business-card";
        const front = isCard ? bcFront : refitSide(bcFront, doc);
        const back = isCard ? bcBack : refitSide(bcBack, doc);
        const slug = isCard
          ? `photo-${industry}-${idx}-${layout}`
          : `photo-${product}-${industry}-${idx}-${layout}`;

        const row = {
          schemaVersion: 1,
          product: PRODUCT_DB_VALUE[product] as "BUSINESS_CARD",
          slug,
          title: `${titleCase(industry)} ${titleCase(layout)}`,
          description: `A photographic ${layout.replace(/-/g, " ")} ${PRODUCT_LABEL[product]} for ${titleCase(industry).toLowerCase()}.`,
          industry,
          style: layout,
          // Occupation terms live in the row's tags too, so a plain `tags has` query and any future
          // search that does not go through categoriesForQuery still finds the trade.
          tags: [industry, layout, "photo", "premium", ...termsForCategory(industry)],
          orientation: front.physicalHeightIn > front.physicalWidthIn ? "portrait" : "landscape",
          palette: [] as string[],
          fontFamilies: ["Inter"],
          thumbnailFront: null,
          thumbnailBack: null,
          front: front as unknown as object,
          back: back as unknown as object,
          source: "MANUAL" as const,
          active: true,
        };

        if (!dry) {
          await db.cardTemplate.upsert({ where: { slug }, update: row, create: row });
        }
        made++;
      }
      made++;
    }
  }

  console.log(`${dry ? "[dry] " : ""}${made} templates across ${PRODUCTS.length} products, ${skipped} skipped`);
  if (!dry) {
    const n = await db.cardTemplate.count({ where: { product: "BUSINESS_CARD", active: true } });
    console.log(`BUSINESS_CARD active total: ${n}`);
  }
  await db.$disconnect();
}

main();
