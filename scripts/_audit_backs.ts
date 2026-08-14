import { db } from "../lib/prisma";

async function main() {
  const rows = await db.cardTemplate.findMany({
    where: { product: "POSTCARD", active: true },
    select: { slug: true, title: true, front: true, back: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  console.log(JSON.stringify(rows, null, 1));
  await db.$disconnect();
}
main();
