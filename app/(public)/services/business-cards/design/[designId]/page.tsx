import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { blankCardDesign, CardSideSchema, type CardDesign } from "@/lib/business-card/schema";
import { CardEditor } from "@/components/business-card/card-editor";

export const metadata: Metadata = {
  title: "Business Card Editor",
  robots: { index: false, follow: false },
};

export default async function BusinessCardEditorPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId: rawId } = await params;
  // auth() can throw if Clerk's middleware isn't detected (a pre-existing app-wide issue,
  // also seen on /account/* pages) — fail closed to "signed out" rather than 500ing this page,
  // since that's the safe default and this route must work for anonymous visitors regardless.
  let clerkId: string | null = null;
  try {
    clerkId = (await auth()).userId;
  } catch {
    clerkId = null;
  }
  const isSignedIn = Boolean(clerkId);

  let initialDesign: CardDesign;
  let savedDesignId: string | null = null;
  let templatePalette: string[] | null = null;

  if (rawId === "new") {
    initialDesign = blankCardDesign();
  } else if (rawId.startsWith("t-")) {
    const slug = rawId.slice(2);
    const template = await db.cardTemplate.findUnique({ where: { slug } });
    if (!template || !template.active) notFound();
    initialDesign = {
      schemaVersion: 1,
      title: template.title,
      templateId: template.id,
      front: CardSideSchema.parse(template.front),
      back: CardSideSchema.parse(template.back),
    };
    templatePalette = template.palette;
  } else {
    const design = await db.cardDesign.findUnique({ where: { id: rawId } });
    if (!design) notFound();

    if (design.userId) {
      if (!clerkId) redirect(`/sign-in?redirect_url=/services/business-cards/design/${rawId}`);
      const user = await db.user.findUnique({ where: { clerkId } });
      if (!user || user.id !== design.userId) notFound();
    }

    initialDesign = {
      schemaVersion: 1,
      title: design.title,
      templateId: design.templateId,
      front: CardSideSchema.parse(design.front),
      back: CardSideSchema.parse(design.back),
    };
    savedDesignId = design.id;
  }

  return <CardEditor initialDesign={initialDesign} designId={savedDesignId} isSignedIn={isSignedIn} templatePalette={templatePalette} />;
}
