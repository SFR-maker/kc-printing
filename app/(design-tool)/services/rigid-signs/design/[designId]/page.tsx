import type { Metadata } from "next";
import { CardEditor } from "@/components/business-card/card-editor";
import { loadEditorDesign } from "@/lib/business-card/load-editor-design";

export const metadata: Metadata = {
  title: "Rigid Sign Editor",
  robots: { index: false, follow: false },
};

/** `?w=` and `?h=` carry the finished size chosen in the order flow, so a template opens at the
 * size the customer is actually buying rather than the one it was authored at. */
function targetFrom(sp: Record<string, string | string[] | undefined>) {
  const n = (v: string | string[] | undefined) => (Array.isArray(v) ? Number(v[0]) : Number(v));
  const w = n(sp.w), h = n(sp.h);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { widthIn: w, heightIn: h } : undefined;
}

export default async function RigidSignEditorPage({ params, searchParams }: { params: Promise<{ designId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { designId: rawId } = await params;
  const { initialDesign, savedDesignId, templatePalette, isSignedIn } = await loadEditorDesign(rawId, "rigid-sign", targetFrom(await searchParams));
  return <CardEditor initialDesign={initialDesign} designId={savedDesignId} isSignedIn={isSignedIn} templatePalette={templatePalette} product="rigid-sign" />;
}
