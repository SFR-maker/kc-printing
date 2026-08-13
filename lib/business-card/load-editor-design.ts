import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { CardSideSchema, blankDesignAtSize, type CardDesign } from "./schema";
import { refitSide } from "./refit";
import { defaultSizeFor, PRODUCT_ROUTE_SEGMENT, PRODUCT_DB_VALUE, type DesignProduct } from "./print-spec";

export interface EditorPageData {
  initialDesign: CardDesign;
  savedDesignId: string | null;
  templatePalette: string[] | null;
  isSignedIn: boolean;
}

/** Shared loader behind every /services/{product}/design/[designId] editor page — resolves "new",
 * a "t-{slug}" template reference, or a real saved design id, and enforces ownership for signed-in
 * designs. One implementation for all three products instead of copy-pasting this per product. */
/**
 * @param target Finished size to re-lay the design out for, when the customer has already chosen a
 * size in the order flow. Templates are authored at one geometry, so without this a vertical card
 * opens artwork built for a landscape one. See refitSide.
 */
export async function loadEditorDesign(
  rawId: string,
  product: DesignProduct,
  target?: { widthIn: number; heightIn: number }
): Promise<EditorPageData> {
  // auth() can throw if Clerk's middleware isn't detected (a pre-existing local-dev-only issue) —
  // fail closed to "signed out" rather than 500ing this page, since anonymous visitors must work.
  let clerkId: string | null = null;
  try {
    clerkId = (await auth()).userId;
  } catch {
    clerkId = null;
  }
  const isSignedIn = Boolean(clerkId);

  if (rawId === "new") {
    return { initialDesign: blankDesignAtSize(defaultSizeFor(product)), savedDesignId: null, templatePalette: null, isSignedIn };
  }

  if (rawId.startsWith("t-")) {
    const slug = rawId.slice(2);
    const template = await db.cardTemplate.findUnique({ where: { slug } });
    if (!template || !template.active || template.product !== PRODUCT_DB_VALUE[product]) notFound();
    // Only templates are refitted. A saved design is the customer's own work at a size they already
    // chose, and silently re-laying that out underneath them would be a different, worse surprise.
    const fit = (side: ReturnType<typeof CardSideSchema.parse>) =>
      target ? refitSide(side, target) : side;
    return {
      initialDesign: {
        schemaVersion: 1,
        title: template.title,
        templateId: template.id,
        front: fit(CardSideSchema.parse(template.front)),
        back: fit(CardSideSchema.parse(template.back)),
      },
      savedDesignId: null,
      templatePalette: template.palette,
      isSignedIn,
    };
  }

  const design = await db.cardDesign.findUnique({ where: { id: rawId } });
  if (!design || design.product !== PRODUCT_DB_VALUE[product]) notFound();

  if (design.userId) {
    if (!clerkId) redirect(`/sign-in?redirect_url=/services/${PRODUCT_ROUTE_SEGMENT[product]}/design/${rawId}`);
    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user || user.id !== design.userId) notFound();
  }

  return {
    initialDesign: {
      schemaVersion: 1,
      title: design.title,
      templateId: design.templateId,
      front: CardSideSchema.parse(design.front),
      back: CardSideSchema.parse(design.back),
    },
    savedDesignId: design.id,
    templatePalette: null,
    isSignedIn,
  };
}
