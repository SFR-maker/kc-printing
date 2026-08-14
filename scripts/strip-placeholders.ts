import { db } from "../lib/prisma";

/**
 * Removes visible placeholder text from live templates.
 *
 * A template audit found 125 elements reading literally "LOGO" and one rendering "Photo goes here",
 * all on templates a customer can open and order. A placeholder is a note to the designer who built
 * the template, not something a print shop shows a buyer - it reads as unfinished work, and on the
 * worst example it rendered as an empty circle with illegible micro-text inside.
 *
 * "LOGO" elements are deleted rather than reworded: the slot exists so the customer can drop their
 * own mark in, and an empty space invites that where the word "LOGO" just looks like a mistake. The
 * single "Photo goes here" template is deactivated instead, because with its one instruction
 * removed it is an empty outlined box and there is nothing left to sell.
 *
 *   npx tsx --env-file=.env.local scripts/strip-placeholders.ts [--dry]
 */

interface Side { elements?: { id?: string; text?: string }[] }

async function main() {
  const dry = process.argv.includes("--dry");
  const rows = await db.cardTemplate.findMany({ where: { active: true }, select: { id: true, slug: true, front: true, back: true } });

  let stripped = 0, touched = 0, deactivated = 0;

  for (const r of rows) {
    let changed = false;
    const clean = (side: unknown): unknown => {
      const s = side as Side;
      if (!s?.elements) return side;
      const before = s.elements.length;
      const elements = s.elements.filter((e) => (e.text ?? "").trim().toUpperCase() !== "LOGO");
      if (elements.length !== before) { changed = true; stripped += before - elements.length; }
      return { ...s, elements };
    };

    const front = clean(r.front);
    const back = clean(r.back);

    const hasPhotoNote = JSON.stringify([r.front, r.back]).match(/photo goes here/i);
    if (hasPhotoNote) {
      if (!dry) await db.cardTemplate.update({ where: { id: r.id }, data: { active: false } });
      deactivated++;
      console.log(`  deactivated ${r.slug} (nothing left once the instruction is removed)`);
      continue;
    }

    if (changed) {
      touched++;
      if (!dry) {
        await db.cardTemplate.update({
          where: { id: r.id },
          data: { front: front as object, back: back as object },
        });
      }
    }
  }

  console.log(`${dry ? "[dry] " : ""}removed ${stripped} "LOGO" elements across ${touched} templates, deactivated ${deactivated}`);
  await db.$disconnect();
}

main();
