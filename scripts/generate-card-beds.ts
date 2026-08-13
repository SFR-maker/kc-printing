/**
 * Generates photographic "design beds" for business card templates.
 *
 * Why beds and not finished cards: the reference cards the brief was set against have their text
 * baked into the artwork, but a template whose text is part of a JPEG is not a template - the
 * customer cannot change the name on it. So the model is asked for the composition only (the
 * photography, the angled colour blocks, the torn edge, the scrim) with no lettering anywhere in
 * frame, and the editable text elements are placed on top by the seeder.
 *
 * Every prompt is built from three parts that vary independently:
 *
 *   LAYOUT   - where the photo sits and how it is cut. Ten of them, and they are genuinely
 *              different compositions rather than one composition in ten colourways, which was the
 *              specific failure of the existing library.
 *   INDUSTRY - what is actually photographed, plus a palette that suits the trade.
 *   STEM     - the shared art direction that makes 80 separate generations read as one library.
 *
 * Run:  npx tsx --env-file=.env.local scripts/generate-card-beds.ts [phase1|phase2] [--only <slug>]
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { EXTRA_CATEGORIES } from "./card-bed-categories";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
/*
 * Chosen by a bake-off against the same prompt, not by reputation.
 *
 *   gemini-3-pro-image          ~$0.58/image   (what phase 1 used, and what exhausted the grant)
 *   openai/gpt-5-image-mini      $0.049        and 89 seconds per image
 *   google/gemini-2.5-flash-image $0.0388
 *   gemini-3.1-flash-lite-image  $0.0336       8 seconds
 *
 * flash-lite is 17x cheaper than the model phase 1 used and it won on quality too: the diagonal
 * split was cleaner, the colour panel genuinely flat and empty, and it did not add the dark
 * card-shaped border that every phase 1 bed had to be cropped to remove.
 */
const MODEL = process.env.BED_MODEL ?? "google/gemini-3.1-flash-lite-image";
const OUT_DIR = path.join(process.cwd(), "public", "images", "card-beds");

/** Concurrency. The image endpoint is slow and rate limits above roughly this. */
const PARALLEL = 4;

/**
 * Authored card bed at 3.75 x 2.25in - the 0.125in authored bleed the template system expects,
 * rebled to the house 0.05in at export. 300 DPI gives 1125 x 675.
 */
const BED_W = 1125;
const BED_H = 675;

const STEM =
  "Professional business card background artwork, 3.5x2 inch landscape card proportions, " +
  "print quality, sharp focus, clean commercial photography, balanced composition. " +
  "ABSOLUTELY NO TEXT, NO LETTERING, NO WORDS, NO NUMBERS, NO LOGOS, NO WATERMARKS, NO SIGNATURES " +
  "anywhere in the image. Leave the negative space clean and uncluttered so text can be placed over " +
  "it later. Do not draw a business card object - this IS the card face, edge to edge, full bleed.";

interface Layout {
  slug: string;
  /** Where the type will go, so the seeder and the prompt agree about the empty area. */
  textZone: "right" | "left" | "bottom" | "centre";
  direction: string;
}

const LAYOUTS: Layout[] = [
  {
    slug: "angled-split",
    textZone: "right",
    direction:
      "Split diagonally: photograph fills the left 55% of the frame, a bold solid colour panel " +
      "cuts across the right 45% on a steep diagonal edge, with a thin second accent stripe " +
      "following the same angle. The colour panel is flat and completely empty.",
  },
  {
    slug: "torn-edge",
    textZone: "right",
    direction:
      "Dark moody photograph fills the upper three quarters, ending in a ragged torn-paper edge " +
      "with visible white paper fibres, below which is a flat solid colour band. The right half of " +
      "the photograph is deliberately empty and darker for text.",
  },
  {
    slug: "full-bleed-scrim",
    textZone: "left",
    direction:
      "Full-bleed photograph across the entire frame with a strong dark gradient scrim washing in " +
      "from the left edge to roughly two thirds across, deep and opaque at the left edge, fading to " +
      "clear at the right. The subject sits in the clear right third.",
  },
  {
    slug: "corner-wedge",
    textZone: "bottom",
    direction:
      "Photograph fills the frame. A large flat colour wedge enters from the bottom-left corner and " +
      "sweeps up to the right edge, covering the lower third. A hairline metallic rule traces the " +
      "top of the wedge. The wedge is completely empty.",
  },
  {
    slug: "vertical-band",
    textZone: "right",
    direction:
      "A narrow vertical colour band occupies the left 30% edge to edge, textured with a subtle " +
      "pattern relevant to the trade. The remaining 70% is a bright clean photograph, slightly " +
      "overexposed and low contrast on its right side so dark text will sit on it.",
  },
  {
    slug: "arc-cut",
    textZone: "right",
    direction:
      "Photograph on the left divided from a flat colour field on the right by a large smooth " +
      "circular arc, the curve bulging into the colour field. A thin concentric arc line echoes it. " +
      "The colour field is empty.",
  },
  {
    slug: "duotone",
    textZone: "centre",
    direction:
      "Full-bleed duotone photograph, two-colour treatment with crushed shadows and bright " +
      "highlights, heavy grain, high contrast, with a large calm empty area through the horizontal " +
      "centre band of the frame.",
  },
  {
    slug: "inset-frame",
    textZone: "bottom",
    direction:
      "A solid colour border frames the card, roughly 12% in from every edge, and a photograph is " +
      "inset within that frame occupying the upper two thirds only. The lower third inside the " +
      "frame is flat colour and empty.",
  },
  {
    slug: "triptych",
    textZone: "right",
    direction:
      "Three narrow vertical photographic panels of different but related subjects fill the left " +
      "half, separated by thin white gutters, beside a single flat colour field filling the right " +
      "half. The colour field is empty.",
  },
  {
    slug: "macro-texture",
    textZone: "centre",
    direction:
      "Extreme macro photograph of a material or surface central to the trade, filling the entire " +
      "frame, shallow depth of field, dramatic raking side light picking out the texture, with a " +
      "broad softly blurred empty area across the middle of the frame.",
  },
];

interface Industry {
  slug: string;
  label: string;
  phase: 1 | 2 | 3 | 4;
  subjects: string[];
  palette: string;
}

const INDUSTRIES: Industry[] = [
  {
    slug: "real-estate", label: "Real Estate", phase: 1,
    palette: "deep navy, crimson red, warm white and brushed gold",
    subjects: [
      "a handsome suburban two-storey house at golden hour with warm lit windows",
      "a modern glass-and-steel luxury home exterior at dusk",
      "a set of brass door keys resting on a granite countertop",
      "a bright open-plan living room interior with tall windows",
      "a downtown commercial high-rise photographed from street level looking up",
      "a manicured front lawn and porch of a colonial home",
      "an aerial view of a leafy residential neighbourhood",
      "a contemporary kitchen with marble island and pendant lighting",
      "a wooden front door with a wreath and brass hardware",
      "a sunlit staircase and entryway of an elegant home",
    ],
  },
  {
    slug: "automotive", label: "Automotive", phase: 1,
    palette: "gunmetal grey, safety orange, carbon black and chrome",
    subjects: [
      "a polished alloy wheel and low-profile tyre in dramatic side light",
      "a mechanic's gloved hands with a torque wrench over an engine bay",
      "a clean modern repair shop with a car raised on a two-post lift",
      "a glossy car body panel with water beading after detailing",
      "an engine block with visible cylinder head and cam covers",
      "a wall of organised chrome socket tools in a red tool chest",
      "a performance car's front grille and headlight in shallow focus",
      "brake rotor and caliper close up, machined metal",
      "a car undergoing paint correction with a rotary polisher",
      "an exhaust tip and rear diffuser of a sports car",
    ],
  },
  {
    slug: "construction", label: "Construction", phase: 1,
    palette: "high-visibility amber, concrete grey, steel blue and black",
    subjects: [
      "a steel frame building under construction against open sky",
      "a yellow hard hat resting on rolled architectural blueprints",
      "an excavator bucket biting into earth on a work site",
      "a tower crane silhouetted at sunset",
      "poured concrete with visible formwork lines and rebar",
      "a carpenter's hands marking a timber joist with a pencil",
      "scaffolding rising across a building facade",
      "a level and tape measure on a fresh timber frame",
      "a construction site at blue hour with work lights burning",
      "stacked timber and steel beams on a site under tarpaulin",
    ],
  },
  {
    slug: "roofing", label: "Roofing", phase: 1,
    palette: "slate grey, deep charcoal, brick red and sky blue",
    subjects: [
      "a newly shingled roof ridge line against a bright blue sky",
      "a roofer on a pitched roof laying asphalt shingles",
      "close macro of overlapping architectural shingles with granular texture",
      "a metal standing-seam roof catching low sun",
      "a gutter and fascia detail with clean new flashing",
      "a residential roof photographed by drone from directly above",
      "terracotta clay roof tiles in rows",
      "a skylight set into a dark shingled roof",
      "rain running off a roof edge in sharp detail",
      "a chimney with new lead flashing against blue sky",
    ],
  },
  {
    slug: "plumbing", label: "Plumbing", phase: 1,
    palette: "deep water blue, copper, clean white and slate",
    subjects: [
      "polished copper pipework with soldered elbow joints",
      "a plumber's hands fitting a wrench to a chrome pipe under a sink",
      "a modern chrome kitchen tap with water running",
      "a tankless water heater mounted on a utility wall",
      "a brass valve manifold with red handles",
      "clean white bathroom fixtures in soft daylight",
      "a pipe threading machine with fresh cut steel pipe",
      "water droplets on a chrome shower head, macro",
      "a boiler room with organised copper and insulated pipe runs",
      "a spirit level across new pipework in an open wall cavity",
    ],
  },
  {
    slug: "electrical", label: "Electrical", phase: 1,
    palette: "electric yellow, deep navy, copper and black",
    subjects: [
      "a neatly wired electrical panel with organised coloured conductors",
      "an electrician's hands with wire strippers on copper cable",
      "a coil of stranded copper wire, macro, warm light",
      "modern recessed ceiling lighting in a finished room",
      "a multimeter probing a terminal block",
      "conduit runs along an industrial ceiling",
      "a utility pole and transformer against dramatic sky",
      "an EV charger mounted on a garage wall",
      "a switchboard with breakers, shallow depth of field",
      "warm filament bulbs hanging in a row against dark background",
    ],
  },
  {
    slug: "landscaping", label: "Landscaping", phase: 1,
    palette: "deep forest green, sunlit lime, terracotta and cream",
    subjects: [
      "a freshly striped lawn with clean mower lines at golden hour",
      "a flagstone patio bordered by ornamental planting",
      "hands in gardening gloves planting a shrub in dark soil",
      "a formal hedge being trimmed with shears, sharp edge",
      "a garden path lit by low landscape lighting at dusk",
      "colourful flower beds in full bloom, shallow depth of field",
      "a stone retaining wall with cascading planting",
      "a sprinkler arc catching sunlight over a green lawn",
      "autumn leaves being cleared from a manicured lawn",
      "a wheelbarrow and tools beside a freshly mulched bed",
    ],
  },
  {
    slug: "cleaning", label: "Cleaning", phase: 1,
    palette: "fresh aqua, crisp white, mint and soft grey",
    subjects: [
      "sunlight through a spotless streak-free window pane",
      "a pristine white marble bathroom, bright and airy",
      "microfibre cloths folded in a neat stack",
      "soap bubbles and foam on a clean glass surface, macro",
      "a vacuum leaving clean tracks across pale carpet",
      "an immaculate modern kitchen counter with nothing on it",
      "a pressure washer stripping grime from a concrete driveway",
      "folded fresh white towels in warm daylight",
      "a gloved hand wiping a stainless steel surface to a shine",
      "an empty tidy office at dawn with polished floors",
    ],
  },

  // ── Phase 2 ─────────────────────────────────────────────────────────────
  {
    slug: "restaurant", label: "Restaurants & Food", phase: 2,
    palette: "warm terracotta, charcoal, cream and olive",
    subjects: [
      "a rustic wooden table with fresh ingredients scattered",
      "a chef plating a dish with tweezers, shallow focus",
      "steam rising from a cast iron skillet on a dark stove",
      "fresh bread loaves cooling on a bakery rack",
      "a moody restaurant interior with warm pendant lighting",
      "espresso pouring into a white cup, macro",
      "fresh herbs and spices on dark slate",
      "a wood-fired pizza oven glowing orange",
      "a bartender pouring a cocktail against a dark backdrop",
      "an overhead spread of colourful plated dishes",
    ],
  },
  {
    slug: "beauty", label: "Beauty & Salon", phase: 2,
    palette: "blush pink, deep plum, champagne gold and off-white",
    subjects: [
      "barber tools and a shaving brush on dark marble",
      "a salon chair in a bright minimal interior",
      "makeup brushes fanned on a pale surface, macro",
      "soft-focus hair styling with warm backlight",
      "manicure tools and polish bottles arranged neatly",
      "a spa setting with rolled towels and orchids",
      "scissors and comb on a leather barber strop",
      "a bright modern salon washing station",
      "cosmetic creams and serums on a mirrored tray",
      "eyelash and brow tools on blush fabric",
    ],
  },
  {
    slug: "medical", label: "Medical & Dental", phase: 2,
    palette: "clinical teal, clean white, soft grey and navy",
    subjects: [
      "a bright modern dental surgery with clean lines",
      "a stethoscope on a white clinical surface",
      "a clean medical consulting room with soft daylight",
      "dental instruments arranged on a sterile tray",
      "a smiling healthy mouth close up, clinical lighting",
      "a modern clinic waiting area, calm and bright",
      "gloved hands holding a small dental mirror",
      "medical charts and a tablet on a white desk",
      "an orthodontic model on a clean surface",
      "soft focus clinic corridor with natural light",
    ],
  },
  {
    slug: "professional-services", label: "Professional Services", phase: 2,
    palette: "deep navy, warm grey, burgundy and brushed brass",
    subjects: [
      "a modern glass office tower photographed from below",
      "a leather-bound notebook and fountain pen on a walnut desk",
      "a bright boardroom with a long table and city view",
      "law books on a dark shelf, warm side light",
      "hands shaking across a polished conference table",
      "an architectural staircase in a corporate lobby",
      "a laptop and coffee on a minimal workspace",
      "city skyline at dusk from an office window",
      "stacked documents and reading glasses, shallow focus",
      "a quiet private office with bookshelves and a lamp",
    ],
  },
  {
    slug: "retail", label: "Retail", phase: 2,
    palette: "vivid coral, deep ink, warm cream and gold",
    subjects: [
      "a beautifully merchandised boutique shelf",
      "a shop window display with warm lighting at dusk",
      "folded clothing in colour-graded stacks",
      "a till counter with plants and warm styling",
      "shopping bags in kraft paper against a plain wall",
      "a curated homeware display on open shelving",
      "racks of clothing in a bright modern store",
      "gift wrapping with ribbon on a clean surface",
      "a display of artisan products under spot lighting",
      "an inviting storefront facade with an awning",
    ],
  },
  {
    slug: "events", label: "Events", phase: 2,
    palette: "champagne gold, deep aubergine, blush and ivory",
    subjects: [
      "a set banquet table with candles and florals at dusk",
      "string lights over an outdoor evening reception",
      "a floral arch against a soft garden background",
      "champagne flutes catching warm light",
      "an elegant place setting with linen and gold cutlery",
      "confetti suspended in air against dark background",
      "a marquee interior with draped fabric and lighting",
      "a tiered celebration cake on a styled table",
      "a dance floor with warm uplighting and bokeh",
      "stacked gift boxes with ribbon in soft focus",
    ],
  },
  {
    slug: "general-business", label: "General Small Business", phase: 2,
    palette: "confident teal, warm charcoal, coral and bone",
    subjects: [
      "an abstract geometric colour composition with depth and shadow",
      "soft flowing fabric texture in gradient light",
      "a clean minimal desk workspace from above",
      "layered paper shapes casting soft shadows",
      "a subtle concrete and brass material study",
      "warm bokeh lights against a dark gradient",
      "brushed metal surface with directional light",
      "an organic marble and stone texture, macro",
      "a soft dual-tone gradient with fine grain",
      "architectural shadow patterns across a plain wall",
    ],
  },
  ...EXTRA_CATEGORIES,
];

async function generate(prompt: string, apiKey: string): Promise<Buffer> {
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
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };
  const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("no image returned");
  return Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
}

interface Job { industry: Industry; layout: Layout; index: number; file: string }

function buildJobs(phase: number): Job[] {
  const jobs: Job[] = [];
  for (const industry of INDUSTRIES.filter((i) => i.phase === phase)) {
    industry.subjects.forEach((_, i) => {
      // Pairing subject i with layout i gives each industry all ten compositions exactly once, so
      // no industry ends up with ten variations of the same arrangement.
      jobs.push({
        industry,
        layout: LAYOUTS[i % LAYOUTS.length],
        index: i,
        file: path.join(OUT_DIR, industry.slug, `${String(i + 1).padStart(2, "0")}-${LAYOUTS[i % LAYOUTS.length].slug}.webp`),
      });
    });
  }
  return jobs;
}

function promptFor(job: Job): string {
  const subject = job.industry.subjects[job.index];
  return (
    `${STEM} ${job.layout.direction} ` +
    `The photographic element shows ${subject}. ` +
    `Colour palette: ${job.industry.palette}. ` +
    `Industry: ${job.industry.label}. Make it look like premium printed marketing material.`
  );
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const phase = Number(String(process.argv[2] ?? "phase1").replace("phase", "")) as 1 | 2 | 3 | 4;
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;

  let jobs = buildJobs(phase);
  if (only) jobs = jobs.filter((j) => j.industry.slug === only);
  // Resume-safe: an interrupted run picks up where it stopped rather than paying twice.
  jobs = jobs.filter((j) => !fs.existsSync(j.file));

  console.log(`phase ${phase}: ${jobs.length} beds to generate (${PARALLEL} at a time)`);
  let done = 0, failed = 0;

  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        const tag = `${job.industry.slug}/${path.basename(job.file)}`;
        try {
          const raw = await generate(promptFor(job), apiKey);
          const out = await sharp(raw)
            .resize(BED_W, BED_H, { fit: "cover", position: "attention" })
            .webp({ quality: 88 })
            .toBuffer();
          fs.mkdirSync(path.dirname(job.file), { recursive: true });
          fs.writeFileSync(job.file, out);
          done++;
          console.log(`  [${done + failed}/${jobs.length}] ${tag} (${(out.length / 1024).toFixed(0)}KB)`);
        } catch (err) {
          failed++;
          console.error(`  [${done + failed}/${jobs.length}] FAILED ${tag}: ${String(err).slice(0, 160)}`);
        }
      }
    })
  );

  console.log(`\ndone: ${done} written, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
