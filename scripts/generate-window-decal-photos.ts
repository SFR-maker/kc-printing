import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Generates the window signage product photographs.
 *
 * The style stem is carried over verbatim from scripts/generate-banner-photo.ts and
 * generate-services-photos.ts so these belong to the same shoot as the other four products rather
 * than looking like a different set - the homepage rail puts all five side by side, and a decal shot
 * with different light and a different surface is immediately obvious there.
 *
 * The awkward part of photographing this particular product is that a window decal *is* printed
 * artwork, so the usual "no text" instruction would produce a blank sheet of vinyl. The resolution
 * is to allow printed artwork but require it to be abstract geometric colour blocks: image models
 * render garbled pseudo-typography on any printed surface, and garbled text is the single most
 * obvious tell on an otherwise photoreal image.
 *
 *   npx tsx --env-file=.env.local scripts/generate-window-decal-photos.ts
 *   npx tsx --env-file=.env.local scripts/generate-window-decal-photos.ts window-decals
 */

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
/** Nano Banana Pro, the same model the rest of the shoot was generated with. */
const MODEL = "google/gemini-3-pro-image";
const OUT_DIR = path.join(process.cwd(), "public", "images", "print");

const STYLE =
  "Professional commercial product photography, warm natural window light, shallow depth of field, " +
  "soft blurred background, no watermark, no people, landscape orientation, " +
  "editorial quality, realistic, high detail. " +
  // Text is the tell. The product is printed graphics, so artwork is allowed but constrained to
  // shapes the model cannot garble into fake lettering.
  "No text, no letters, no numerals, no logos, no readable typography anywhere in frame; any " +
  "printed artwork must be abstract geometric colour blocks and simple shapes only. " +
  "Not a 3D render, not CGI, not an illustration - a real photograph, with believable micro-dust, " +
  "faint fingerprints on the glass and tiny surface imperfections. " +
  "Subject entirely within the frame with clear headroom, top and bottom both visible.";

const SHOTS: { name: string; prompt: string }[] = [
  {
    // The one the homepage rail, services index and service page hero all use.
    name: "window-decals",
    prompt:
      `${STYLE} The front window of a small independent shop photographed from the pavement outside, ` +
      `a large rectangular vinyl decal applied flat to the glass showing bold abstract geometric ` +
      `colour blocks in deep coral and teal, the vinyl edge crisp against the glass, warm interior ` +
      `light glowing behind it and a soft reflection of the street across the pane.`,
  },
  {
    name: "window-decals-cling",
    prompt:
      `${STYLE} A close-up of two hands in the corner of frame smoothing a static cling decal onto ` +
      `the inside of a shop window with a felt squeegee, the cling showing simple abstract circular ` +
      `colour shapes, a small air bubble being pushed towards the edge, bright daylight through the glass.`,
  },
  {
    name: "window-decals-perf",
    prompt:
      `${STYLE} A perforated window film applied across a cafe window seen from inside looking out, ` +
      `the tiny perforation holes clearly visible as a fine dot pattern against the bright street ` +
      `beyond, an abstract geometric colour block graphic printed on the film, the interior in soft shadow.`,
  },
];

async function generate(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://611printing.com",
      "X-Title": "611 Printing",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };
  const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("no image returned");
  return Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
}

async function main() {
  const only = process.argv[2];
  const shots = only ? SHOTS.filter((s) => s.name === only) : SHOTS;
  if (!shots.length) throw new Error(`unknown shot "${only}" - try ${SHOTS.map((s) => s.name).join(", ")}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = 0;

  for (const shot of shots) {
    console.log(`generating ${shot.name}...`);
    try {
      const raw = await generate(shot.prompt);
      // Matched to the other product shots: 4:3, webp q82, so it drops into the same layouts
      // unchanged and a 1.5MB PNG lands somewhere around 100KB.
      const out = await sharp(raw).resize(1600, 1200, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
      const target = path.join(OUT_DIR, `${shot.name}.webp`);
      fs.writeFileSync(target, out);
      const meta = await sharp(out).metadata();
      console.log(`  wrote ${target} (${meta.width}x${meta.height}, ${(out.length / 1024).toFixed(0)}KB)`);
    } catch (err) {
      failed++;
      console.error(`  FAILED ${shot.name}: ${String(err).slice(0, 300)}`);
    }
  }

  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(String(err).slice(0, 300));
  process.exitCode = 1;
});
