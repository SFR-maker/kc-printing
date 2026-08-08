import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Seeds the opening set of promotions.
 *
 * Upserted by slug so re-running does not duplicate them, and `active`/`showInBar` are set on create
 * only - re-running this script must never switch a promotion the shop deliberately turned off back
 * on, which is the same trap scripts/seed-all-templates.ts documents for curated templates.
 *
 *   npx tsx scripts/seed-specials.ts
 */

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

const SPECIALS = [
  {
    slug: "window-decals-launch",
    title: "Window graphics are here",
    blurb: "New: decals, clings and perfs, printed at cost from $19",
    body:
      "Storefront window graphics on adhesive vinyl, static cling, or see-through perforated film. "
      + "Eleven cut shapes across 117 sizes, removable with no residue. Design one yourself in the "
      + "studio or upload a print-ready file.",
    imageUrl: "/images/print/window-decals.webp",
    ctaLabel: "Order window decals",
    ctaHref: "/services/window-decals/order",
    couponCode: null,
    titleEs: "Ya tenemos gráficos para ventanas",
    blurbEs: "Nuevo: calcomanías, adhesivos estáticos y película perforada, a costo desde $19",
    bodyEs:
      "Gráficos para el vidrio de su local en vinil adhesivo, adhesivo estático o película "
      + "perforada translúcida. Once formas de corte en 117 tamaños, y se retiran sin dejar "
      + "residuo. Diséñelo usted mismo en el editor o suba su archivo listo para imprenta.",
    ctaLabelEs: "Pedir calcomanías",
    showInBar: true,
    sortOrder: 0,
  },
];

async function main() {
  for (const s of SPECIALS) {
    await db.special.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        blurb: s.blurb,
        body: s.body,
        imageUrl: s.imageUrl,
        ctaLabel: s.ctaLabel,
        ctaHref: s.ctaHref,
        couponCode: s.couponCode,
        titleEs: s.titleEs,
        blurbEs: s.blurbEs,
        bodyEs: s.bodyEs,
        ctaLabelEs: s.ctaLabelEs,
        sortOrder: s.sortOrder,
        // active and showInBar deliberately omitted - see the note above.
      },
      create: { ...s, active: true },
    });
    console.log(`upserted ${s.slug}`);
  }

  const live = await db.special.count({ where: { active: true } });
  console.log(`${live} active special(s)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
