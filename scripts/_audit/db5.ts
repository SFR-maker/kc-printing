import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "node:fs"; import path from "node:path";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main(){
  console.log("=== POST-MIGRATION storage ===");
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT pg_size_pretty(pg_total_relation_size('"CardTemplate"')) AS total_relation,
           pg_size_pretty(pg_relation_size('"CardTemplate"')) AS heap,
           pg_size_pretty(pg_indexes_size('"CardTemplate"')) AS idx,
           (SELECT pg_size_pretty(pg_relation_size(reltoastrelid)) FROM pg_class WHERE relname='CardTemplate') AS toast,
           (SELECT pg_size_pretty(SUM(COALESCE(octet_length("thumbnailFront"),0)+COALESCE(octet_length("thumbnailBack"),0))::bigint) FROM "CardTemplate") AS thumb_logical,
           (SELECT pg_size_pretty(SUM(octet_length("front"::text)+octet_length("back"::text))::bigint) FROM "CardTemplate") AS json_logical`));
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT relname, n_live_tup, n_dead_tup, last_autovacuum FROM pg_stat_user_tables WHERE relname='CardTemplate'`));
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT c.relname, pg_size_pretty(pg_relation_size(c.oid)) sz, s.n_live_tup, s.n_dead_tup
    FROM pg_class c JOIN pg_stat_all_tables s ON s.relid=c.oid WHERE c.relname LIKE 'pg_toast_16901%'`));

  // do front/back JSON reference card-art / product-art?
  console.log("\n=== image paths referenced inside front/back JSON ===");
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT
      COUNT(*) FILTER (WHERE "front"::text LIKE '%/images/card-art/%' OR "back"::text LIKE '%/images/card-art/%')::int AS card_art,
      COUNT(*) FILTER (WHERE "front"::text LIKE '%/images/card-beds/%' OR "back"::text LIKE '%/images/card-beds/%')::int AS card_beds,
      COUNT(*) FILTER (WHERE "front"::text LIKE '%/images/product-art/%' OR "back"::text LIKE '%/images/product-art/%')::int AS product_art,
      COUNT(*) FILTER (WHERE "front"::text LIKE '%/images/templates/%' OR "back"::text LIKE '%/images/templates/%')::int AS templates_dir,
      COUNT(*)::int AS total FROM "CardTemplate"`));

  // extract every /images/ path from JSON
  const rows = await db.$queryRawUnsafe<any[]>(`
    SELECT DISTINCT m[1] AS p FROM "CardTemplate",
    LATERAL regexp_matches("front"::text || "back"::text, '(/images/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp|svg))','g') m`);
  console.log("distinct /images/ paths inside template JSON:", rows.length);
  let miss=0; const missS: string[]=[];
  const refs = new Set<string>();
  for (const r of rows) {
    const f = path.join(process.cwd(),"public",r.p.replace(/^\//,""));
    refs.add(path.normalize(f).toLowerCase());
    if(!fs.existsSync(f)){ miss++; if(missS.length<10) missS.push(r.p); }
  }
  console.log("MISSING on disk:", miss);
  missS.forEach(s=>console.log("   "+s));
  fs.writeFileSync("scripts/_audit/json-refs.json", JSON.stringify([...refs]));
  await db.$disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
