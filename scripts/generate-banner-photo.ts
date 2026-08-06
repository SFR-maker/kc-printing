import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Regenerates the banner product photograph.
 *
 * The old shot was a retractable roll-up stand, which is not the product being sold: the priced
 * catalogue is hemmed vinyl and mesh, finished with grommets and hung. Showing a roll-up sets an
 * expectation the order page cannot meet.
 *
 * The style stem is copied from scripts/generate-services-photos.ts so this belongs to the same
 * shoot rather than looking like a different set - and "no text, no logos" is what keeps a generated
 * product shot from reading as a mock-up of somebody else's brand.
 *
 *   npx tsx --env-file=.env.local scripts/generate-banner-photo.ts
 */

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MODEL = "google/gemini-3-pro-image";
const OUT = path.join(process.cwd(), "public", "images", "print", "banners.webp");

const STYLE =
  "Professional commercial product photography, warm natural window light, shallow depth of field, " +
  "soft blurred background, no text, no logos, no watermark, no people, landscape orientation, " +
  "editorial quality, realistic, high detail.";

const PROMPT =
  `${STYLE} A blank white large-format vinyl banner stretched taut and hung outdoors against a ` +
  `green hedge and white lattice fence, tied at each corner through shiny metal grommets with thin ` +
  `rope, hemmed edges clearly visible along all four sides, slight natural fabric tension, ` +
  `photographed straight on in soft afternoon daylight.`;

async function generate(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };
  const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("no image returned");
  return Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
}

async function main() {
  console.log("generating the hung vinyl banner shot...");
  const raw = await generate(PROMPT);

  // Matched to the other product shots: 4:3, webp, so it drops into the same layouts unchanged.
  const out = await sharp(raw).resize(1600, 1200, { fit: "cover" }).webp({ quality: 82 }).toBuffer();

  if (fs.existsSync(OUT)) {
    fs.copyFileSync(OUT, OUT.replace(/\.webp$/, "-rollup-previous.webp"));
    console.log("  kept the roll-up shot alongside it for when roll-ups are added back");
  }
  fs.writeFileSync(OUT, out);
  const meta = await sharp(out).metadata();
  console.log(`  wrote ${OUT} (${meta.width}x${meta.height}, ${(out.length / 1024).toFixed(0)}KB)`);
}

main().catch((err) => {
  console.error(String(err).slice(0, 300));
  process.exitCode = 1;
});
