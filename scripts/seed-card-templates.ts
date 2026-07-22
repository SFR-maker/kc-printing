import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateAllTemplates } from "../lib/business-card/templates/generate";
import { exportSideThumbnail } from "../lib/business-card/export";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const db = new PrismaClient({ adapter });

async function toDataUri(buffer: Buffer): Promise<string> {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function main() {
  const templates = generateAllTemplates();
  console.log(`Generating ${templates.length} business card templates...`);

  let created = 0;
  let updated = 0;
  const report: { slug: string; status: "created" | "updated" | "failed"; error?: string }[] = [];

  for (const t of templates) {
    try {
      const [thumbFront, thumbBack] = await Promise.all([
        exportSideThumbnail(t.front, 480),
        exportSideThumbnail(t.back, 480),
      ]);
      const thumbnailFront = await toDataUri(thumbFront);
      const thumbnailBack = await toDataUri(thumbBack);

      const existing = await db.cardTemplate.findUnique({ where: { slug: t.slug } });

      await db.cardTemplate.upsert({
        where: { slug: t.slug },
        update: {
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
        create: {
          slug: t.slug,
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

      if (existing) {
        updated++;
        report.push({ slug: t.slug, status: "updated" });
      } else {
        created++;
        report.push({ slug: t.slug, status: "created" });
      }
    } catch (err) {
      report.push({ slug: t.slug, status: "failed", error: err instanceof Error ? err.message : String(err) });
    }
  }

  const failed = report.filter((r) => r.status === "failed");
  console.log(`\nDone. Created ${created}, updated ${updated}, failed ${failed.length}.`);
  if (failed.length > 0) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.slug}: ${f.error}`);
  }

  const totalActive = await db.cardTemplate.count({ where: { active: true } });
  console.log(`Total active templates in database: ${totalActive}`);

  if (failed.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
