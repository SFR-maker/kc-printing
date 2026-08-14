import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main(){
  console.log("SNAPSHOT AT", new Date().toISOString());
  console.table(await db.$queryRawUnsafe<any[]>(`
    SELECT product,
      COUNT(*) FILTER (WHERE "thumbnailFront" LIKE 'data:%')::int AS data_uri,
      COUNT(*) FILTER (WHERE "thumbnailFront" LIKE '/images/%')::int AS file_path,
      COUNT(*)::int AS active_total
    FROM "CardTemplate" WHERE active=true GROUP BY product ORDER BY product`));
  // export every active file-path for on-disk orphan check
  const rows = await db.cardTemplate.findMany({ where:{ active:true }, select:{ slug:true, product:true, thumbnailFront:true, thumbnailBack:true }});
  const fs = await import("node:fs");
  fs.writeFileSync("scripts/_audit/active-thumbs.json", JSON.stringify(rows));
  console.log("active rows exported:", rows.length);
  const all = await db.cardTemplate.findMany({ select:{ slug:true, active:true, thumbnailFront:true, thumbnailBack:true }});
  fs.writeFileSync("scripts/_audit/all-thumbs.json", JSON.stringify(all));
  console.log("all rows exported:", all.length);
  await db.$disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
