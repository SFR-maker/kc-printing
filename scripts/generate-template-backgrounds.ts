import "dotenv/config";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { generateImageWithOpenRouter } from "../lib/openrouter";

const OUT_DIR = path.join(__dirname, "..", "public", "images", "templates");

interface Shot {
  name: string;
  prompt: string;
  width: number;
  height: number;
}

// Two abstract, text-friendly background textures per product — generic enough to work under
// white or light-colored overlaid text, distinct enough to look genuinely different from the
// flat-color procedural archetypes. Landscape/portrait framing matches each product's real shape.
const SHOTS: Shot[] = [
  {
    name: "business-card-texture-1",
    prompt: "Abstract background texture, soft flowing watercolor washes in deep violet and warm terracotta orange, plenty of smooth open space in the center-left for text overlay, subtle paper grain, elegant and premium, no text, no logos, landscape orientation.",
    width: 1500, height: 900,
  },
  {
    name: "business-card-texture-2",
    prompt: "Abstract background texture, minimal geometric shapes in deep charcoal and muted gold, soft diagonal gradient, plenty of smooth open dark space for text overlay, subtle and premium, no text, no logos, landscape orientation.",
    width: 1500, height: 900,
  },
  {
    name: "postcard-texture-1",
    prompt: "Abstract background texture, bright cheerful gradient from warm coral orange to soft cream, soft organic blobs, plenty of smooth open space for headline text overlay, friendly and inviting marketing postcard aesthetic, no text, no logos, landscape orientation.",
    width: 1500, height: 1000,
  },
  {
    name: "postcard-texture-2",
    prompt: "Abstract background texture, deep teal and violet gradient with soft light rays, plenty of smooth open space in the upper-left for headline text overlay, modern and bold marketing aesthetic, no text, no logos, landscape orientation.",
    width: 1500, height: 1000,
  },
  {
    name: "banner-texture-1",
    prompt: "Abstract background texture, tall vertical bold gradient from deep violet at the top to warm orange at the bottom, smooth open space in the center for large headline text overlay, bold trade-show banner aesthetic, no text, no logos, portrait orientation, very tall aspect ratio.",
    width: 900, height: 1800,
  },
  {
    name: "banner-texture-2",
    prompt: "Abstract background texture, wide horizontal bold gradient in deep teal with soft warm light streaks, smooth open space in the center for large headline text overlay, bold storefront banner aesthetic, no text, no logos, landscape orientation, very wide aspect ratio.",
    width: 1800, height: 900,
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
      const outPath = path.join(OUT_DIR, `${shot.name}.jpg`);
      await sharp(buf).resize(shot.width, shot.height, { fit: "cover" }).jpeg({ quality: 85 }).toFile(outPath);
      const stat = fs.statSync(outPath);
      console.log(`  saved ${shot.name}.jpg (${stat.size} bytes) via ${result.model}`);
    } catch (err) {
      console.error(`  FAILED ${shot.name}:`, err instanceof Error ? err.message : err);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
