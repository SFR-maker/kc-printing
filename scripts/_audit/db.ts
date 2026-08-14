import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

function ms(t: bigint) { return Number(t) / 1e6; }

async function main() {
  // 1. Counts by product, active
  const byProduct = await db.$queryRawUnsafe<any[]>(`
    SELECT product, active, COUNT(*)::int AS n FROM "CardTemplate" GROUP BY product, active ORDER BY product, active`);
  console.log("=== CardTemplate counts (product, active) ===");
  console.table(byProduct);

  // 2. Missing thumbnails
  const missing = await db.$queryRawUnsafe<any[]>(`
    SELECT product,
      COUNT(*) FILTER (WHERE "thumbnailFront" IS NULL)::int AS front_null,
      COUNT(*) FILTER (WHERE "thumbnailBack" IS NULL)::int AS back_null,
      COUNT(*) FILTER (WHERE "thumbnailFront" IS NULL AND "thumbnailBack" IS NULL)::int AS both_null,
      COUNT(*)::int AS total
    FROM "CardTemplate" WHERE active = true GROUP BY product ORDER BY product`);
  console.log("=== Missing thumbnails (active only) ===");
  console.table(missing);

  // 3. Byte sizes
  const sizes = await db.$queryRawUnsafe<any[]>(`
    SELECT product,
      COUNT(*)::int AS n,
      pg_size_pretty(SUM(COALESCE(octet_length("thumbnailFront"),0))::bigint) AS front_total,
      pg_size_pretty(SUM(COALESCE(octet_length("thumbnailBack"),0))::bigint) AS back_total,
      SUM(COALESCE(octet_length("thumbnailFront"),0) + COALESCE(octet_length("thumbnailBack"),0))::bigint AS thumb_bytes,
      SUM(COALESCE(octet_length("front"::text),0) + COALESCE(octet_length("back"::text),0))::bigint AS json_bytes,
      ROUND(AVG(COALESCE(octet_length("thumbnailFront"),0)))::int AS avg_front,
      MAX(COALESCE(octet_length("thumbnailFront"),0))::int AS max_front
    FROM "CardTemplate" GROUP BY product ORDER BY product`);
  console.log("=== Payload sizes per product ===");
  console.table(sizes);

  const tot = await db.$queryRawUnsafe<any[]>(`
    SELECT
      pg_size_pretty(pg_total_relation_size('"CardTemplate"')) AS total_relation,
      pg_size_pretty(pg_table_size('"CardTemplate"')) AS table_size,
      pg_size_pretty(pg_indexes_size('"CardTemplate"')) AS index_size,
      (SELECT pg_size_pretty(SUM(COALESCE(octet_length("thumbnailFront"),0)+COALESCE(octet_length("thumbnailBack"),0))::bigint) FROM "CardTemplate") AS thumb_logical,
      (SELECT pg_size_pretty(SUM(COALESCE(octet_length("front"::text),0)+COALESCE(octet_length("back"::text),0))::bigint) FROM "CardTemplate") AS json_logical,
      (SELECT COUNT(*)::int FROM "CardTemplate") AS rows`);
  console.log("=== Table storage ===");
  console.table(tot);

  // 4. TOAST
  const toast = await db.$queryRawUnsafe<any[]>(`
    SELECT c.relname AS main, pg_size_pretty(pg_relation_size(c.oid)) AS heap,
           t.relname AS toast_rel, pg_size_pretty(pg_relation_size(t.oid)) AS toast_size
    FROM pg_class c LEFT JOIN pg_class t ON c.reltoastrelid = t.oid
    WHERE c.relname = 'CardTemplate'`);
  console.log("=== TOAST ===");
  console.table(toast);

  // 5. thumbnail data-uri mime breakdown
  const mime = await db.$queryRawUnsafe<any[]>(`
    SELECT substring("thumbnailFront" from 1 for 22) AS prefix, COUNT(*)::int AS n
    FROM "CardTemplate" WHERE "thumbnailFront" IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 10`);
  console.log("=== thumbnailFront data-URI prefixes ===");
  console.table(mime);

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
