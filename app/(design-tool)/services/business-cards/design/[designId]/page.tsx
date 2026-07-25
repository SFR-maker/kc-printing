import type { Metadata } from "next";
import { CardEditor } from "@/components/business-card/card-editor";
import { loadEditorDesign } from "@/lib/business-card/load-editor-design";

export const metadata: Metadata = {
  title: "Business Card Editor",
  robots: { index: false, follow: false },
};

export default async function BusinessCardEditorPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId: rawId } = await params;
  const { initialDesign, savedDesignId, templatePalette, isSignedIn } = await loadEditorDesign(rawId, "business-card");
  return <CardEditor initialDesign={initialDesign} designId={savedDesignId} isSignedIn={isSignedIn} templatePalette={templatePalette} product="business-card" />;
}
