import fs from "node:fs";
import path from "node:path";
import { db } from "./lib/prisma";
async function main() {
  const rows = await db.cardTemplate.findMany({ where: { active: true }, select: { slug: true, front: true } });
  let missing = 0; const eg: string[] = [];
  for (const r of rows) {
    const f = r.front as { elements?: { src?: string }[] };
    for (const e of f.elements ?? []) {
      if (!e.src?.startsWith("/images/")) continue;
      if (!fs.existsSync(path.join(process.cwd(), "public", e.src))) { missing++; if (eg.length < 3) eg.push(`${r.slug} -> ${e.src}`); }
    }
  }
  console.log("active templates:", rows.length, "| missing art refs:", missing);
  eg.forEach((x) => console.log("   ", x));
  await db.$disconnect();
}
main();
