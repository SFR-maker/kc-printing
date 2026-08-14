import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const SEL_NO_THUMB = { id:true, slug:true, title:true, description:true, industry:true, style:true, tags:true, orientation:true, palette:true } as const;

async function timeIt(label: string, fn: () => Promise<any>, runs = 5) {
  await fn(); // warm
  const ts: number[] = [];
  let sample: any;
  for (let i=0;i<runs;i++){ const t=process.hrtime.bigint(); sample=await fn(); ts.push(Number(process.hrtime.bigint()-t)/1e6); }
  ts.sort((a,b)=>a-b);
  const n = Array.isArray(sample) ? sample.length : 1;
  const bytes = Buffer.byteLength(JSON.stringify(sample));
  console.log(`${label.padEnd(48)} rows=${String(n).padStart(5)} median=${ts[Math.floor(runs/2)].toFixed(1)}ms min=${ts[0].toFixed(1)} max=${ts[runs-1].toFixed(1)} json=${(bytes/1024).toFixed(1)}KB`);
}

async function main() {
  const products = ["BUSINESS_CARD","POSTCARD","BANNER","RIGID_SIGN","WINDOW_DECAL"] as const;
  console.log("=== Gallery query AS SHIPPED (no thumbnails) ===");
  for (const p of products) {
    await timeIt(`gallery ${p}`, () => db.cardTemplate.findMany({
      where: { active: true, product: p as any }, select: SEL_NO_THUMB as any,
      orderBy: [{featured:"desc"},{sortOrder:"asc"},{createdAt:"asc"}] }));
  }
  console.log("\n=== SAME query WITH thumbnails (the old design, for comparison) ===");
  for (const p of products) {
    await timeIt(`gallery+thumbs ${p}`, () => db.cardTemplate.findMany({
      where: { active: true, product: p as any },
      select: { ...SEL_NO_THUMB, thumbnailFront: true, thumbnailBack: true } as any,
      orderBy: [{featured:"desc"},{sortOrder:"asc"},{createdAt:"asc"}] }), 3);
  }
  console.log("\n=== SELECT * (worst case) ===");
  await timeIt("findMany all cols BUSINESS_CARD", () => db.cardTemplate.findMany({ where:{active:true, product:"BUSINESS_CARD" as any} }), 3);

  console.log("\n=== Single thumbnail fetch (the per-image route) ===");
  const dataUri = await db.cardTemplate.findFirst({ where: { thumbnailFront: { startsWith: "data:" }, active: true }, select: { slug: true } });
  const filePath = await db.cardTemplate.findFirst({ where: { thumbnailFront: { startsWith: "/" }, active: true }, select: { slug: true, thumbnailFront: true } });
  console.log("data-uri sample slug:", dataUri?.slug);
  console.log("file-path sample slug:", filePath?.slug, "->", filePath?.thumbnailFront);
  if (dataUri) await timeIt("thumbnail row (data-uri)", () => db.cardTemplate.findUnique({ where:{slug:dataUri.slug}, select:{thumbnailFront:true,thumbnailBack:true} }), 7);
  if (filePath) await timeIt("thumbnail row (file-path)", () => db.cardTemplate.findUnique({ where:{slug:filePath.slug}, select:{thumbnailFront:true,thumbnailBack:true} }), 7);

  console.log("\n=== EXPLAIN ANALYZE gallery BUSINESS_CARD ===");
  const ex = await db.$queryRawUnsafe<any[]>(`EXPLAIN (ANALYZE, BUFFERS) SELECT id,slug,title,description,industry,style,tags,orientation,palette FROM "CardTemplate" WHERE active=true AND product='BUSINESS_CARD' ORDER BY featured DESC, "sortOrder" ASC, "createdAt" ASC`);
  ex.forEach(r => console.log("  " + Object.values(r)[0]));
  console.log("\n=== EXPLAIN ANALYZE WITH thumbnails ===");
  const ex2 = await db.$queryRawUnsafe<any[]>(`EXPLAIN (ANALYZE, BUFFERS) SELECT id,slug,title,"thumbnailFront","thumbnailBack" FROM "CardTemplate" WHERE active=true AND product='BUSINESS_CARD' ORDER BY featured DESC, "sortOrder" ASC, "createdAt" ASC`);
  ex2.forEach(r => console.log("  " + Object.values(r)[0]));

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
