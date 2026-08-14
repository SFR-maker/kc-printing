import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  console.log("=== Storage mode of thumbnailFront (ALL rows) ===");
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT product, active,
      COUNT(*) FILTER (WHERE "thumbnailFront" LIKE 'data:%')::int AS data_uri,
      COUNT(*) FILTER (WHERE "thumbnailFront" LIKE '/%')::int AS file_path,
      COUNT(*) FILTER (WHERE "thumbnailFront" IS NULL)::int AS nul,
      COUNT(*)::int AS total
    FROM "CardTemplate" GROUP BY product, active ORDER BY product, active`));

  console.log("=== ACTIVE only: storage mode + bytes ===");
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT product,
      COUNT(*) FILTER (WHERE "thumbnailFront" LIKE 'data:%')::int AS data_uri,
      COUNT(*) FILTER (WHERE "thumbnailFront" LIKE '/%')::int AS file_path,
      pg_size_pretty(SUM(COALESCE(octet_length("thumbnailFront"),0)) FILTER (WHERE "thumbnailFront" LIKE 'data:%')::bigint) AS data_uri_bytes
    FROM "CardTemplate" WHERE active=true GROUP BY product ORDER BY product`));

  console.log("=== Bloat / vacuum stats ===");
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum, last_analyze
    FROM pg_stat_user_tables WHERE relname IN ('CardTemplate')`));
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT c.relname, c.reltuples::bigint AS est_rows, pg_size_pretty(pg_relation_size(c.oid)) AS sz,
           s.n_dead_tup, s.n_live_tup
    FROM pg_class c JOIN pg_stat_all_tables s ON s.relid=c.oid
    WHERE c.relname LIKE 'pg_toast_16901%' OR c.relname='CardTemplate'`));

  console.log("=== TOAST compression check (is base64 being compressed?) ===");
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT
      COUNT(*)::int AS n,
      pg_size_pretty(SUM(octet_length("thumbnailFront"))::bigint) AS logical,
      pg_size_pretty(SUM(pg_column_size("thumbnailFront"))::bigint) AS on_disk,
      ROUND(SUM(pg_column_size("thumbnailFront"))::numeric / NULLIF(SUM(octet_length("thumbnailFront")),0), 4) AS ratio
    FROM "CardTemplate" WHERE "thumbnailFront" LIKE 'data:%'`));

  console.log("=== Full row width distribution (active) ===");
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT product,
      pg_size_pretty(AVG(pg_column_size(t.*))::bigint) AS avg_row,
      pg_size_pretty(MAX(pg_column_size(t.*))::bigint) AS max_row,
      pg_size_pretty(SUM(pg_column_size(t.*))::bigint) AS sum_rows
    FROM "CardTemplate" t WHERE active=true GROUP BY product ORDER BY product`));

  console.log("=== Other tables with base64/big columns ===");
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total, n_live_tup
    FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 12`));

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
