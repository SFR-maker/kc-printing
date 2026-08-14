import { db } from "../lib/prisma";

/**
 * Interleaves the new photographic banners with the older flat ones.
 *
 * The gallery orders by featured, then sortOrder, then insertion date. The new set was seeded last,
 * so without curation it sat entirely behind 104 older flat designs - the best work was the part
 * nobody scrolled to.
 *
 * Not simply "new first" either. The plain flat banners are genuinely useful for anyone who wants
 * their own copy on a clean background, so they stay in the mix rather than being buried: the
 * ordering runs three photographic designs, then one flat, repeating. The customer sees the strong
 * work immediately and still meets the simple options without filtering for them.
 *
 *   npx tsx --env-file=.env.local scripts/curate-banners.ts
 */

/** Styles produced by the photographic banner seeder. */
const PHOTO_STYLES = ["scrim-centre", "lower-band", "left-panel", "angled", "top-band", "duotone-wash"];

async function main() {
  const all = await db.cardTemplate.findMany({
    where: { active: true, product: "BANNER" },
    select: { id: true, slug: true, style: true, industry: true },
    orderBy: { createdAt: "asc" },
  });

  const isPhoto = (t: { style: string }) => PHOTO_STYLES.includes(t.style);
  const photo = all.filter(isPhoto);
  const flat = all.filter((t) => !isPhoto(t));

  /*
   * Spread each group across its categories before interleaving, so the top of the gallery is not
   * six grand-opening banners in a row. Round-robin by category does that without a shuffle, and
   * unlike a random order it is stable between runs.
   */
  const byCategory = (rows: typeof all) => {
    const buckets = new Map<string, typeof all>();
    for (const t of rows) {
      const k = t.industry ?? "other";
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(t);
    }
    const lists = [...buckets.values()];
    const out: typeof all = [];
    for (let i = 0; out.length < rows.length; i++) {
      for (const l of lists) if (l[i]) out.push(l[i]);
    }
    return out;
  };

  const p = byCategory(photo);
  const f = byCategory(flat);

  // Three photographic to one flat.
  const ordered: typeof all = [];
  let pi = 0, fi = 0;
  while (pi < p.length || fi < f.length) {
    for (let k = 0; k < 3 && pi < p.length; k++) ordered.push(p[pi++]);
    if (fi < f.length) ordered.push(f[fi++]);
  }

  let n = 0;
  for (const [i, t] of ordered.entries()) {
    await db.cardTemplate.update({
      where: { id: t.id },
      // featured drives the first ordering key, so the leading run of each kind is marked rather
      // than every row, which would make the flag meaningless.
      data: { sortOrder: i, featured: i < 24 },
    });
    n++;
  }

  console.log(`ordered ${n} banners: ${p.length} photographic, ${f.length} flat, 3:1`);
  const head = await db.cardTemplate.findMany({
    where: { active: true, product: "BANNER" },
    select: { slug: true, style: true }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], take: 8,
  });
  for (const h of head) console.log(`  ${PHOTO_STYLES.includes(h.style) ? "photo" : "flat "}  ${h.slug}`);
  await db.$disconnect();
}

main();
