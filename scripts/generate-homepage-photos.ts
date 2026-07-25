import "dotenv/config";
import fs from "fs";
import path from "path";
import { generateImageWithOpenRouter } from "../lib/openrouter";

const OUT_DIR = path.join(__dirname, "..", "public", "images", "homepage");

const SHOTS: { name: string; prompt: string }[] = [
  {
    name: "business-cards",
    prompt:
      "Professional product photograph of a small stack of blank premium business cards (thick cardstock, subtle texture, one card fanned slightly off the stack) resting on a warm walnut wood desk, soft natural window light from the left, shallow depth of field, minimalist styling, no visible text, logos, or people, no watermarks. Photorealistic, editorial print-shop aesthetic, warm and inviting color grade with hints of violet and orange in the ambient reflections.",
  },
  {
    name: "postcards",
    prompt:
      "Professional product photograph of a few blank glossy postcards fanned out on a light concrete surface, one postcard slightly overlapping the next, soft directional daylight, shallow depth of field, minimalist flat-lay styling from a slight angle, no visible text, logos, or people, no watermarks. Photorealistic, clean editorial print-shop aesthetic, warm color grade with subtle violet and orange accents.",
  },
  {
    name: "banners",
    prompt:
      "Professional product photograph of a modern retractable roll-up banner stand, fabric blank and unprinted (solid soft neutral color), standing in a bright minimal storefront or trade show setting, soft even lighting, shallow depth of field background blur, no visible text, logos, or people, no watermarks. Photorealistic, clean editorial aesthetic, warm color grade with subtle violet and orange accents in the environment.",
  },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const shot of SHOTS) {
    console.log(`Generating ${shot.name}...`);
    try {
      const result = await generateImageWithOpenRouter({ prompt: shot.prompt });
      const b64 = result.dataUrl.split(",")[1];
      const buf = Buffer.from(b64, "base64");
      const ext = result.dataUrl.startsWith("data:image/png") ? "png" : "jpg";
      fs.writeFileSync(path.join(OUT_DIR, `${shot.name}.${ext}`), buf);
      console.log(`  saved ${shot.name}.${ext} (${buf.length} bytes) via ${result.model}`);
    } catch (err) {
      console.error(`  FAILED ${shot.name}:`, err instanceof Error ? err.message : err);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
