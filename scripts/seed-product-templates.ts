/**
 * Builds banner, postcard, sign and decal templates around each product's OWN content model.
 *
 * The previous attempt refitted business card layouts onto these products. Geometrically fine, and
 * wrong: a banner carrying a name, job title, phone, email and website at business-card scale is
 * unreadable at banner distance. Here the message is the template, headline sizes come from the
 * medium's viewing distance, and the two non-photographic products are built as flat colour.
 *
 *   npx tsx --env-file=.env.local scripts/seed-product-templates.ts banner --limit 6
 *   npx tsx --env-file=.env.local scripts/seed-product-templates.ts postcard
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { db } from "../lib/prisma";
import { PRODUCT_MODELS, type ProductModel, type TextSlot } from "./product-content-models";
import { MESSAGES_BY_PRODUCT, type Message } from "./product-messages";
import { termsForCategory } from "../lib/business-card/templates/occupations";
import { findTextBox } from "./lib-place-text";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MODEL = process.env.BED_MODEL ?? "google/gemini-3.1-flash-lite-image";
const PARALLEL = 4;

const PRODUCT_DB: Record<string, string> = {
  banner: "BANNER", postcard: "POSTCARD", "rigid-sign": "RIGID_SIGN", "window-decal": "WINDOW_DECAL",
};

/** Palettes for the flat-colour products, chosen for contrast at distance. */
const FLAT_PALETTES = [
  { bg: "#0B3D62", ink: "#FFFFFF", accent: "#FBC800" },
  { bg: "#FBC800", ink: "#141414", accent: "#0B3D62" },
  { bg: "#12261A", ink: "#FFFFFF", accent: "#7BC47F" },
  { bg: "#FFFFFF", ink: "#141414", accent: "#E6007E" },
  { bg: "#8A1C1C", ink: "#FFFFFF", accent: "#FFD9D9" },
  { bg: "#141414", ink: "#FFFFFF", accent: "#0099D8" },
];

/** Composition variants, so a category is not ten of the same arrangement. */
const PHOTO_LAYOUTS = [
  { key: "scrim-centre", direction: "Full-bleed photograph with a strong even dark scrim across the whole frame, so large light text will sit anywhere on it. No text." },
  { key: "lower-band", direction: "Photograph filling the upper two thirds, with a broad flat solid colour band across the lower third, completely empty." },
  { key: "left-panel", direction: "A large flat solid colour panel filling the left 45%, and a photograph filling the right 55%. The panel is completely empty." },
  { key: "angled", direction: "Photograph on the left, a bold flat colour panel entering from the right on a steep diagonal, with a thin accent stripe along the cut. The panel is empty." },
  { key: "top-band", direction: "A broad flat solid colour band across the upper third, completely empty, above a photograph filling the lower two thirds." },
  { key: "duotone-wash", direction: "Full-bleed duotone photograph, heavy contrast, with a large calm empty area across the middle." },
];

const STEM =
  "Large format print background artwork. Print quality, sharp focus, clean commercial photography. " +
  "ABSOLUTELY NO TEXT, NO LETTERING, NO WORDS, NO NUMBERS, NO LOGOS, NO WATERMARKS anywhere. " +
  "This IS the printed face, edge to edge, full bleed. Do not draw a banner or sign object.";

/** Subject matter per message group, so the photograph suits the occasion. */
const GROUP_SUBJECTS: Record<string, string> = {
  business: "a bright welcoming shopfront or busy small business interior",
  "real-estate": "an attractive suburban house exterior at golden hour",
  events: "a warm celebration setting with soft festive lighting",
  community: "an outdoor community gathering in daylight",
  directional: "a clean architectural surface with strong directional light",
  restaurant: "appetising fresh food on a rustic table",
  "bakery-cafe": "fresh bread and coffee in a warm cafe",
  fitness: "a bright modern gym interior",
  cleaning: "a spotless bright interior",
  holidays: "warm festive lights and greenery",
  "appointment-cards": "a calm clean reception desk",
  roofing: "a new roof against clear blue sky",
  plumbing: "clean copper pipework",
  electrical: "a neat electrical panel",
  landscaping: "a freshly striped green lawn",
  painting: "a freshly painted bright interior",
  construction: "a building under construction against open sky",
  hvac: "a clean outdoor condenser unit",
  "pest-control": "a tidy suburban home exterior",
  automotive: "a clean modern auto repair workshop",
  "law-politics": "a civic building against open sky",
  security: "a secure gated property boundary",
  "pets-animals": "a happy dog in a garden",
  medical: "a bright clean clinic room",
  dental: "a bright modern dental surgery",
  veterinary: "a bright clean veterinary room",
  beauty: "a calm bright treatment room",
  "beauty-salon": "a bright modern salon interior",
  barber: "a classic barbershop interior",
  retail: "a well merchandised shop interior",
};

async function generate(prompt: string, apiKey: string): Promise<Buffer> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
      "HTTP-Referer": "https://611printing.com", "X-Title": "611 Printing",
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const j = (await res.json()) as { choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[] };
  const url = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("no image returned");
  return Buffer.from(url.split(",")[1] ?? "", "base64");
}

const text = (
  slot: TextSlot, box: { x: number; y: number; w: number }, scale: number, color: string
) => ({
  id: slot.id, type: "text" as const, text: slot.text,
  x: box.x, y: box.y + slot.dy * scale,
  width: box.w, height: (slot.pt / 72) * 1.4,
  rotation: 0, opacity: 1, locked: false, visible: true,
  fontFamily: "Inter", fontSizePt: slot.pt, fontWeight: slot.weight,
  italic: false, underline: false,
  textTransform: slot.transform ?? ("none" as const),
  align: slot.align ?? ("left" as const),
  lineHeight: 1.1, letterSpacing: 0, color, backgroundColor: null,
});

function buildSide(
  model: ProductModel, slots: TextSlot[], opts: { src?: string; bg: string; ink: string; accent: string; box: { x: number; y: number; w: number } }
) {
  /*
   * dy is a fraction of the TEXT BLOCK, not of the whole piece.
   *
   * Scaling by the full height put the sign's phone number at 17.15in down an 18.25in board, and a
   * 1.5in line height then ran it off the bottom edge - the number was simply cut in half. The block
   * is maxTextHeight of the piece, so that is what the offsets are relative to.
   */
  const scale = model.heightIn * model.maxTextHeight;
  const elements: unknown[] = [];
  if (opts.src) {
    elements.push({
      id: "bed", type: "image", src: opts.src, naturalWidthPx: 1600, naturalHeightPx: 800,
      crop: null, borderWidthPx: 0, borderColor: "#000000", cornerRadiusIn: 0,
      x: 0, y: 0, width: model.widthIn, height: model.heightIn,
      rotation: 0, opacity: 1, locked: true, visible: true, name: "Background",
    });
  }
  for (const slot of slots) {
    elements.push(text(slot, opts.box, scale, slot.role === "cta" ? opts.accent : opts.ink));
  }
  return {
    physicalWidthIn: model.widthIn, physicalHeightIn: model.heightIn,
    bleedIn: model.bleedIn, safeZoneInsetIn: model.safeZoneInsetIn,
    shapeMask: "rectangle" as const,
    background: { type: "solid" as const, color: opts.bg, gradient: null },
    elements,
  };
}

async function main() {
  const product = process.argv[2];
  const model = PRODUCT_MODELS[product];
  const messages = MESSAGES_BY_PRODUCT[product];
  if (!model || !messages) throw new Error(`unknown product "${product}" - try ${Object.keys(PRODUCT_MODELS).join(", ")}`);

  const li = process.argv.indexOf("--limit");
  const limit = li > -1 ? Number(process.argv[li + 1]) : Infinity;
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (model.photographic && !apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const outDir = path.join(process.cwd(), "public", "images", "product-art", product);
  const variantsPerMessage = model.photographic ? PHOTO_LAYOUTS.length : FLAT_PALETTES.length;

  interface Job { msg: Message; variant: number; file: string; rel: string }
  const jobs: Job[] = [];
  for (const msg of messages) {
    for (let v = 0; v < variantsPerMessage; v++) {
      const name = `${msg.key}-${v + 1}.jpg`;
      jobs.push({ msg, variant: v, file: path.join(outDir, name), rel: `/images/product-art/${product}/${name}` });
    }
  }
  const batch = jobs.slice(0, limit === Infinity ? jobs.length : limit);
  console.log(`${product}: ${batch.length} of ${jobs.length} templates`);

  // Generate any missing photographic beds, in parallel, resume-safe.
  if (model.photographic) {
    const todo = batch.filter((j) => !fs.existsSync(j.file));
    console.log(`  beds to generate: ${todo.length}`);
    const queue = [...todo];
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        const layout = PHOTO_LAYOUTS[job.variant % PHOTO_LAYOUTS.length];
        const subject = GROUP_SUBJECTS[job.msg.group] ?? "a clean bright commercial setting";
        const prompt = `${STEM} ${model.bedAspect}. ${layout.direction} The photographic element shows ${subject}.`;
        try {
          const raw = await generate(prompt, apiKey);
          const out = await sharp(raw).resize(1600, Math.round(1600 * (model.heightIn / model.widthIn)), { fit: "cover" }).jpeg({ quality: 86 }).toBuffer();
          fs.mkdirSync(path.dirname(job.file), { recursive: true });
          fs.writeFileSync(job.file, out);
          console.log(`    ${path.basename(job.file)} (${(out.length / 1024).toFixed(0)}KB)`);
        } catch (err) {
          console.error(`    FAILED ${path.basename(job.file)}: ${String(err).slice(0, 120)}`);
        }
      }
    }));
  }

  let made = 0;
  for (const job of batch) {
    const { msg, variant } = job;
    let fitScale = 1;
    const rawSlots = model.front.map((s) =>
      s.role === "headline" ? { ...s, text: msg.headline }
      : s.role === "sub" ? { ...s, text: msg.sub }
      : s);

    const pal = FLAT_PALETTES[variant % FLAT_PALETTES.length];
    let ink = pal.ink, bg = pal.bg, accent = pal.accent;
    let src: string | undefined;
    let box = {
      x: model.bleedIn + model.safeZoneInsetIn,
      y: model.heightIn * (1 - model.maxTextHeight) / 2,
      w: model.widthIn - (model.bleedIn + model.safeZoneInsetIn) * 2,
    };

    if (model.photographic && fs.existsSync(job.file)) {
      src = job.rel;
      // Same measurement used for the cards: put the type where the artwork is actually flat.
      const place = await findTextBox(job.file);
      ink = place.light ? "#FFFFFF" : "#141414";
      accent = place.light ? "#FBC800" : "#C4006B";
      bg = "#FFFFFF";
      box = { x: place.x * model.widthIn, y: place.y * model.heightIn, w: place.w * model.widthIn };
      /*
       * Fit the type to the panel, do not widen the panel to the type.
       *
       * The first pass replaced any measured box narrower than half the piece with the full width,
       * which is precisely the case where the composition HAS a narrow flat panel - so on the
       * left-panel layout the headline and both sub-lines ran off the panel and onto the
       * photograph, where they were unreadable. Scaling the slots to the measured width keeps the
       * type on the surface it was measured onto.
       */
      const usable = model.widthIn - (model.bleedIn + model.safeZoneInsetIn) * 2;
      fitScale = Math.max(0.45, Math.min(1, box.w / usable));
    } else if (model.photographic) {
      continue; // bed failed to generate; skip rather than seed a template with no artwork
    }

    // Point sizes and the vertical rhythm both scale, so a narrower panel gets a smaller, tighter
    // block rather than an overlapping one.
    const slots = rawSlots.map((s) => ({ ...s, pt: s.pt * fitScale, dy: s.dy * fitScale }));
    const front = buildSide(model, slots, { src, bg, ink, accent, box });
    const back = model.back
      ? buildSide(model, model.back, {
          bg: pal.bg, ink: pal.ink, accent: pal.accent,
          box: { x: model.bleedIn + model.safeZoneInsetIn, y: model.heightIn * 0.16, w: model.widthIn - (model.bleedIn + model.safeZoneInsetIn) * 2 },
        })
      : buildSide(model, [], { bg: "#FFFFFF", ink: "#141414", accent: "#141414", box });

    const slug = `${product}-${msg.key}-${variant + 1}`;
    const row = {
      schemaVersion: 1,
      product: PRODUCT_DB[product] as "BANNER",
      slug,
      title: `${msg.headline.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())} ${variant + 1}`,
      description: `${msg.headline} ${product.replace("-", " ")} with ${msg.sub.toLowerCase()}.`,
      industry: msg.group,
      style: model.photographic ? PHOTO_LAYOUTS[variant % PHOTO_LAYOUTS.length].key : `flat-${variant + 1}`,
      tags: [msg.key, msg.group, product, ...msg.terms, ...termsForCategory(msg.group)],
      orientation: model.heightIn > model.widthIn ? "portrait" : "landscape",
      palette: [bg, ink, accent],
      fontFamilies: ["Inter"],
      thumbnailFront: null, thumbnailBack: null,
      front: front as unknown as object,
      back: back as unknown as object,
      source: "MANUAL" as const,
      active: true,
    };
    await db.cardTemplate.upsert({ where: { slug }, update: row, create: row });
    made++;
  }

  console.log(`seeded ${made}`);
  await db.$disconnect();
}

main();
