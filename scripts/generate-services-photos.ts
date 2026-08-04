import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MODEL = "google/gemini-3-pro-image";
const OUT_DIR = path.join(__dirname, "..", "public", "images", "services");

const STYLE =
  "Professional commercial product photography, warm natural window light, shallow depth of field, " +
  "soft blurred background, no text, no logos, no watermark, no people, landscape orientation, " +
  "editorial quality, realistic, high detail.";

const PRODUCTS: { name: string; prompt: string }[] = [
  {
    name: "business-cards",
    prompt: `${STYLE} A small neat stack of blank premium business cards fanned out flat-lay on a warm wooden desk, top-down angled view, soft daylight from a window.`,
  },
  {
    name: "postcards",
    prompt: `${STYLE} A fan of blank postcards spread out on a warm wooden desk, one postcard slightly overlapping the next, soft daylight.`,
  },
  {
    name: "banners",
    prompt: `${STYLE} A blank retractable roll-up banner stand standing in a modern bright office lobby, full banner visible, aluminum base, softly blurred lobby background.`,
  },
  {
    name: "rigid-signs",
    prompt: `${STYLE} A blank round acrylic rigid sign mounted with silver standoffs on a bright white interior office wall, close-up angled view, softly blurred office background.`,
  },
];

async function generateImage(prompt: string): Promise<Buffer> {
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter image error: ${err}`);
  }

  const data = (await res.json()) as {
    choices: { message: { images?: { image_url: { url: string } }[] } }[];
  };
  const dataUrl = data.choices[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("OpenRouter returned no image");

  const base64 = dataUrl.split(",")[1] ?? "";
  return Buffer.from(base64, "base64");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const p of PRODUCTS) {
    console.log(`Generating ${p.name}...`);
    const raw = await generateImage(p.prompt);
    const resized = await sharp(raw).resize(1280, 800, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, `${p.name}.jpg`), resized);
    console.log(`  wrote ${p.name}.jpg (${resized.length} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
