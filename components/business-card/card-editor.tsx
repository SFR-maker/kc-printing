"use client";

import "@/app/(public)/services/business-cards/design/editor-fonts.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useCardEditorStore } from "@/lib/business-card/store";
import type { CardDesign } from "@/lib/business-card/schema";
import { validateDesign } from "@/lib/business-card/validate";
import { PRODUCT_ROUTE_SEGMENT, PRODUCT_DB_VALUE, type DesignProduct } from "@/lib/business-card/print-spec";
import { getAnonymousToken, saveDesignLocally, loadDesignLocally } from "@/lib/business-card/local-autosave";
import { useIsMobile } from "./use-media-query";
import { CardCanvas } from "./card-canvas";
import { LogoDropZone } from "@/components/business-card/logo-drop-zone";
import { LeftToolPanel } from "./toolbar/left-tool-panel";
import { RightPropertiesPanel } from "./toolbar/right-properties-panel";
import { TopCommandBar } from "./toolbar/top-command-bar";
import { ProofScreen } from "./proof-screen";
import { ElementQuickToolbar } from "./element-quick-toolbar";
import { MobileTopBar } from "./mobile/mobile-top-bar";
import { MobileAddBar } from "./mobile/mobile-add-bar";
import { MobilePropertiesSheet } from "./mobile/mobile-properties-sheet";

const LOCAL_KEY = "draft";
const AUTOSAVE_DEBOUNCE_MS = 1500;

interface CardEditorProps {
  initialDesign: CardDesign;
  designId: string | null;
  isSignedIn: boolean;
  templatePalette?: string[] | null;
  product?: DesignProduct;
}

export function CardEditor({ initialDesign, designId: initialDesignId, isSignedIn, templatePalette = null, product = "business-card" }: CardEditorProps) {
  const router = useRouter();
  const routeSegment = PRODUCT_ROUTE_SEGMENT[product];
  const isMobile = useIsMobile();
  const loadDesign = useCardEditorStore((s) => s.loadDesign);
  const design = useCardEditorStore((s) => s.design);
  const dirty = useCardEditorStore((s) => s.dirty);
  const designId = useCardEditorStore((s) => s.designId);
  const markSaved = useCardEditorStore((s) => s.markSaved);
  const selectedIds = useCardEditorStore((s) => s.selectedIds);
  const clearSelection = useCardEditorStore((s) => s.clearSelection);

  const [showProof, setShowProof] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [propertiesSheetOpen, setPropertiesSheetOpen] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadDesign(initialDesign, initialDesignId, templatePalette, product);
    if (!initialDesignId) {
      // localStorage isn't available during SSR, so this can only be read post-mount.
      const local = loadDesignLocally(LOCAL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (local) setResumeAvailable(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      saveDesignLocally(LOCAL_KEY, design);
      // persist() already handles anonymous saves via anonymousToken (see app/api/card-designs
      // POST) — gating this on isSignedIn meant anonymous users' designs never got a real
      // server-side id, so designId stayed null and the "order this design" handoff silently
      // broke (empty designId in the URL, no prefill, no "using your design" banner).
      await persist(design, designId, product, (newId) => {
        if (!designId && newId) router.replace(`/services/${routeSegment}/design/${newId}`);
      }, false);
      markSaved();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, dirty]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    saveDesignLocally(LOCAL_KEY, design);
    await persist(design, designId, product, (newId) => {
      if (!designId && newId) router.replace(`/services/${routeSegment}/design/${newId}`);
    }, true);
    markSaved();
    setSaving(false);
  }, [design, designId, router, markSaved, product, routeSegment]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/card-designs/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front: design.front, back: design.back, format: "pdf" }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${design.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Non-fatal — user can retry from the toolbar.
    } finally {
      setExporting(false);
    }
  }, [design]);

  function resumeDraft() {
    const local = loadDesignLocally(LOCAL_KEY);
    if (local) loadDesign(local, initialDesignId);
    setResumeAvailable(false);
  }

  const warnings = validateDesign(design.front, design.back);
  const errorCount = warnings.filter((w) => w.severity === "error").length;

  if (showProof) {
    return (
      <ProofScreen
        design={design}
        onBack={() => setShowProof(false)}
        confirming={confirming}
        onConfirm={async () => {
          setConfirming(true);
          await handleSave();
          const params = new URLSearchParams({ designId: designId ?? "", package: "gold" });
          router.push(`/services/${routeSegment}/order?${params.toString()}`);
        }}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      {resumeAvailable && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs sm:text-sm text-amber-800">
          <span>You have an unsaved draft from a previous session.</span>
          <div className="flex shrink-0 gap-2">
            <button onClick={resumeDraft} className="rounded-md bg-amber-800 px-3 py-1 text-xs font-semibold text-white">Resume</button>
            <button onClick={() => setResumeAvailable(false)} className="rounded-md border border-amber-300 px-3 py-1 text-xs font-semibold">Dismiss</button>
          </div>
        </div>
      )}

      {isMobile ? (
        <MobileTopBar onSave={handleSave} saving={saving} onExport={handleExport} exporting={exporting} onContinue={() => setShowProof(true)} />
      ) : (
        <TopCommandBar onSave={handleSave} saving={saving} onExport={handleExport} exporting={exporting} onContinue={() => setShowProof(true)} isSignedIn={isSignedIn} />
      )}

      {errorCount > 0 && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {errorCount} issue{errorCount > 1 ? "s" : ""} need attention before you can order.
        </div>
      )}

      {selectedIds.length > 0 && (
        <ElementQuickToolbar variant={isMobile ? "mobile" : "desktop"} onOpenDetails={() => setPropertiesSheetOpen(true)} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {!isMobile && <LeftToolPanel />}
        <LogoDropZone>
          <div
            className="flex flex-1 items-center justify-center overflow-auto bg-kc-bg p-2 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) clearSelection();
            }}
          >
            <CardCanvas />
          </div>
        </LogoDropZone>
        {!isMobile && <RightPropertiesPanel />}
      </div>

      {isMobile && selectedIds.length === 0 && <MobileAddBar />}
      {isMobile && <MobilePropertiesSheet open={propertiesSheetOpen} onClose={() => setPropertiesSheetOpen(false)} />}
    </div>
  );
}

async function persist(
  design: CardDesign,
  designId: string | null,
  product: DesignProduct,
  onNewId: (id: string) => void,
  throwOnError: boolean
) {
  try {
    const anonymousToken = getAnonymousToken();
    if (designId) {
      // The token identifies an anonymous author on write as well as on read; without it every
      // autosave answered 401 and the work never left the browser.
      await fetch(`/api/card-designs/${designId}?anonymousToken=${encodeURIComponent(anonymousToken)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: design.title, front: design.front, back: design.back }),
      });
    } else {
      const res = await fetch("/api/card-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: design.title,
          templateId: design.templateId,
          product: PRODUCT_DB_VALUE[product],
          front: design.front,
          back: design.back,
          anonymousToken,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) onNewId(data.id);
      } else if (throwOnError) {
        throw new Error("save failed");
      }
    }
  } catch (e) {
    if (throwOnError) throw e;
  }
}
