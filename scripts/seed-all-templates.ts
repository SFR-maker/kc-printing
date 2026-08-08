import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateAllTemplates } from "../lib/business-card/templates/generate";
import { generateAiCardTemplates } from "../lib/business-card/templates/generate-ai";
import { generatePostcardTemplates } from "../lib/business-card/templates/generate-postcard";
import { generateBannerTemplates } from "../lib/business-card/templates/generate-banner";
import { generateRigidSignTemplates } from "../lib/business-card/templates/generate-rigid-sign";
import { generateWindowDecalTemplates } from "../lib/business-card/templates/generate-window-decal";
import { exportSideThumbnail, THUMBNAIL_WIDTH } from "../lib/business-card/export";
import type { CardTemplate } from "../lib/business-card/schema";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const db = new PrismaClient({ adapter });

async function toDataUri(buffer: Buffer): Promise<string> {
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

async function seedProduct(product: "BUSINESS_CARD" | "POSTCARD" | "BANNER" | "RIGID_SIGN" | "WINDOW_DECAL", templates: CardTemplate[]) {
  console.log(`\n${product}: generating ${templates.length} templates...`);
  let created = 0;
  let updated = 0;
  const failed: { slug: string; error: string }[] = [];

  for (const t of templates) {
    try {
      // Widths live in one place (lib/business-card/export.ts) so seeding and
      // scripts/refresh-thumbnails.ts cannot drift apart.
      const thumbWidth = THUMBNAIL_WIDTH[product] ?? 640;
      const [thumbFront, thumbBack] = await Promise.all([
        exportSideThumbnail(t.front, thumbWidth),
        exportSideThumbnail(t.back, thumbWidth),
      ]);
      const thumbnailFront = await toDataUri(thumbFront);
      const thumbnailBack = await toDataUri(thumbBack);

      const existing = await db.cardTemplate.findUnique({ where: { slug: t.slug } });

      await db.cardTemplate.upsert({
        where: { slug: t.slug },
        update: {
          product,
          title: t.title,
          description: t.description,
          industry: t.industry,
          style: t.style,
          tags: t.tags,
          orientation: t.orientation,
          palette: t.palette,
          fontFamilies: t.fontFamilies,
          thumbnailFront,
          thumbnailBack,
          front: t.front,
          back: t.back,
          source: "MANUAL",
          // Deliberately omitted from update (unlike create): re-running this script to fix
          // content bugs must not silently reactivate templates that were curated out via
          // active:false — see scripts/dedupe-templates.ts.
        },
        create: {
          slug: t.slug,
          product,
          title: t.title,
          description: t.description,
          industry: t.industry,
          style: t.style,
          tags: t.tags,
          orientation: t.orientation,
          palette: t.palette,
          fontFamilies: t.fontFamilies,
          thumbnailFront,
          thumbnailBack,
          front: t.front,
          back: t.back,
          source: "MANUAL",
          active: true,
        },
      });

      if (existing) updated++;
      else created++;
    } catch (err) {
      failed.push({ slug: t.slug, error: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`${product}: created ${created}, updated ${updated}, failed ${failed.length}.`);
  if (failed.length > 0) {
    for (const f of failed) console.log(`  - ${f.slug}: ${f.error}`);
  }
  return failed.length;
}

async function main() {
  const products = (process.argv[2] ?? "all").split(",");
  let totalFailed = 0;

  if (products.includes("all") || products.includes("business-card")) {
    totalFailed += await seedProduct("BUSINESS_CARD", [...generateAllTemplates(), ...generateAiCardTemplates()]);
  }
  if (products.includes("all") || products.includes("postcard")) {
    totalFailed += await seedProduct("POSTCARD", generatePostcardTemplates());
  }
  if (products.includes("all") || products.includes("banner")) {
    totalFailed += await seedProduct("BANNER", generateBannerTemplates());
  }
  if (products.includes("all") || products.includes("rigid-sign")) {
    totalFailed += await seedProduct("RIGID_SIGN", generateRigidSignTemplates());
  }
  if (products.includes("all") || products.includes("window-decal")) {
    totalFailed += await seedProduct("WINDOW_DECAL", generateWindowDecalTemplates());
  }

  const counts = await db.cardTemplate.groupBy({ by: ["product"], _count: true, where: { active: true } });
  console.log("\nActive template counts by product:", counts.map((c) => `${c.product}=${c._count}`).join(", "));

  if (totalFailed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
