"use client";

import "@/app/(public)/services/business-cards/design/editor-fonts.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, UserRoundX } from "lucide-react";
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
import { MobileZoomPill } from "./mobile/mobile-zoom-pill";
import { baselineFromDesign, findPlaceholderDetails, placeholderLabel, type TemplateBaseline } from "./placeholder-details";
import { deriveSaveStatus } from "./save-status";

const LOCAL_KEY = "draft";
const AUTOSAVE_DEBOUNCE_MS = 1500;

/** Where a template's original wording is parked so it survives the t-{slug} → design-id remount. */
function baselineKey(templateId: string): string {
  return `kc-template-baseline-${templateId}`;
}

function truncate(text: string, max = 24): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

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
  const setSelected = useCardEditorStore((s) => s.setSelected);
  const setActiveSide = useCardEditorStore((s) => s.setActiveSide);
  const requestEditText = useCardEditorStore((s) => s.requestEditText);

  const [showProof, setShowProof] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  /** Surfaced on the proof screen when the save that must precede checkout fails. */
  const [saveError, setSaveError] = useState<string | null>(null);
  /** True when the last attempt to save to the server did not succeed — see save-status.ts. */
  const [saveFailed, setSaveFailed] = useState(false);
  /**
   * Whether the server has ever had this design.
   *
   * Arriving from a template there is no saved design behind the editor, and a pristine template is
   * not dirty — so reading cleanliness as savedness greeted every customer with "All changes saved
   * as guest" over work that existed nowhere but their browser. An id in the URL means a real saved
   * design was opened; anything else has to earn the claim by actually saving.
   */
  const [savedOnce, setSavedOnce] = useState(initialDesignId != null);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [propertiesSheetOpen, setPropertiesSheetOpen] = useState(false);
  const [templateBaseline, setTemplateBaseline] = useState<TemplateBaseline | null>(null);
  const [placeholderPromptDismissed, setPlaceholderPromptDismissed] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadDesign(initialDesign, initialDesignId, templatePalette, product);
    if (!initialDesignId) {
      // localStorage isn't available during SSR, so this can only be read post-mount.
      const local = loadDesignLocally(LOCAL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (local) setResumeAvailable(true);
    }
    // sessionStorage is unavailable during SSR too, so the baseline can only be resolved post-mount.
    setTemplateBaseline(rememberTemplateBaseline(initialDesign, initialDesignId));
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
      const saved = await persist(design, designId, product, (newId) => {
        if (!designId && newId) router.replace(`/services/${routeSegment}/design/${newId}`);
      });
      // Only a save that actually happened clears the flag. markSaved() used to run either way, so
      // a dropped connection produced a design the editor described as saved and the server had
      // never heard of.
      setSaveFailed(!saved);
      if (saved) {
        setSavedOnce(true);
        markSaved();
      }
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

  /**
   * Saves, and returns the id the design actually ended up with.
   *
   * It used to return nothing, and the caller read the `designId` prop instead. Arriving from a
   * template that prop is null - the template is not a saved design - so "Approve and order" sent
   * the customer to `/order?designId=&proof=approved`. The order page got an empty id, found no
   * artwork, and the design they had just approved was silently dropped on the way to checkout.
   */
  const handleSave = useCallback(async (): Promise<string | null> => {
    setSaving(true);
    saveDesignLocally(LOCAL_KEY, design);
    let effectiveId = designId ?? null;
    const saved = await persist(design, designId, product, (newId) => {
      if (newId) effectiveId = newId;
      if (!designId && newId) router.replace(`/services/${routeSegment}/design/${newId}`);
    });
    setSaveFailed(!saved);
    // The design is only clean once the server has it. Marking it saved regardless was what let the
    // indicator say "Saved" over work that existed nowhere but this browser.
    if (saved) {
      setSavedOnce(true);
      markSaved();
    }
    setSaving(false);
    return saved ? effectiveId : null;
  }, [design, designId, router, markSaved, product, routeSegment]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/card-designs/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // designId lets the server tell a bought design from an unbought one. Without it every
        // export is treated as unpurchased and comes back watermarked, including a paid customer's.
        body: JSON.stringify({ front: design.front, back: design.back, format: "pdf", designId }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      /*
       * Honour the filename the server chose.
       *
       * A watermarked export is named "-proof" precisely so it cannot be mistaken for the final
       * artwork. Overwriting that with the design title handed the customer a file that looked
       * like the real thing and was not.
       */
      const serverName = res.headers.get("content-disposition")?.match(/filename="?([^\";]+)"?/)?.[1];
      a.download = serverName ?? `${design.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Non-fatal — user can retry from the toolbar.
    } finally {
      setExporting(false);
    }
  }, [design, designId]);

  function resumeDraft() {
    const local = loadDesignLocally(LOCAL_KEY);
    if (local) loadDesign(local, initialDesignId);
    setResumeAvailable(false);
  }

  const warnings = validateDesign(design.front, design.back);
  const errorCount = warnings.filter((w) => w.severity === "error").length;

  const saveStatus = deriveSaveStatus({ saving, saveFailed, dirty, savedOnce });

  const placeholders = useMemo(
    () => findPlaceholderDetails(design, templateBaseline),
    [design, templateBaseline]
  );
  const firstPlaceholder = placeholders[0];

  /** Takes the customer straight to the offending words, on the right side, ready to type over. */
  function fixPlaceholder(side: "front" | "back", elementId: string) {
    setActiveSide(side);
    setSelected([elementId]);
    requestEditText(elementId);
  }

  if (showProof) {
    return (
      <>
      {saveError && (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {saveError}
        </div>
      )}
      <ProofScreen
        design={design}
        templateBaseline={templateBaseline}
        onBack={() => setShowProof(false)}
        confirming={confirming}
        onConfirm={async () => {
          setConfirming(true);
          setSaveError(null);
          const savedId = await handleSave();
          if (!savedId) {
            // Better to stay put and say so than to send someone to checkout with no artwork.
            setConfirming(false);
            setSaveError("We could not save your design. Please check your connection and try again.");
            return;
          }
          // `proof=approved` is only ever set here, after the review checkbox has been ticked, so
          // the order records a real consent rather than assuming one from the design's presence.
          const params = new URLSearchParams({ designId: savedId, proof: "approved" });
          router.push(`/services/${routeSegment}/order?${params.toString()}`);
        }}
      />
      </>
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
        <TopCommandBar onSave={handleSave} saving={saving} saveStatus={saveStatus} onExport={handleExport} exporting={exporting} onContinue={() => setShowProof(true)} isSignedIn={isSignedIn} />
      )}

      {/*
        Templates arrive filled in with a made-up florist's name, phone and email, because an empty
        card is impossible to judge in the gallery. Nothing used to say so, and a tester reached the
        proof with a stranger's phone number on her card. Said plainly, once, with a button that puts
        the cursor in the offending words - and it clears itself as soon as they are replaced.
      */}
      {firstPlaceholder && !placeholderPromptDismissed && (
        <div
          data-testid="placeholder-prompt"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:text-sm"
        >
          <span className="flex items-center gap-2">
            <UserRoundX className="h-4 w-4 shrink-0" />
            <span>
              <strong className="font-semibold">This template came filled in with a made-up business.</strong>{" "}
              {placeholders.length === 1
                ? `One sample detail is still on your card — the ${placeholderLabel(firstPlaceholder.kind)}.`
                : `${placeholders.length} sample details are still on your card, starting with the ${placeholderLabel(firstPlaceholder.kind)}.`}{" "}
              Replace them with your own name, phone number and email before you order.
            </span>
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => fixPlaceholder(firstPlaceholder.side, firstPlaceholder.elementId)}
              className="rounded-md bg-amber-800 px-3 py-1 text-xs font-semibold text-white"
            >
              Change &ldquo;{truncate(firstPlaceholder.text)}&rdquo;
            </button>
            <button
              onClick={() => setPlaceholderPromptDismissed(true)}
              className="rounded-md border border-amber-300 px-3 py-1 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {errorCount > 0 && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {errorCount} issue{errorCount > 1 ? "s" : ""} need attention before you can order.
        </div>
      )}

      {!isMobile && selectedIds.length > 0 && (
        <ElementQuickToolbar variant="desktop" onOpenDetails={() => setPropertiesSheetOpen(true)} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {!isMobile && <LeftToolPanel />}
        <LogoDropZone>
          {/* Sits over the canvas so the zoom control is visible while editing, not in a menu. */}
          {isMobile && <MobileZoomPill />}
          <div
            className="flex flex-1 items-center justify-center overflow-auto bg-kc-bg p-2 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) clearSelection();
            }}
          >
            <CardCanvas />
          </div>
          {/*
            Over the canvas on mobile, not above it in the flow.
            
            In the flow it changed the size of the canvas area the moment anything was selected, so
            the design re-fitted and jumped about 112px under the user's finger - which made
            double-tapping to edit text nearly impossible, because the second tap landed wherever the
            artwork had moved to. Overlaying keeps the canvas box constant for the whole gesture.
          */}
          {isMobile && selectedIds.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 z-30">
              <ElementQuickToolbar variant="mobile" onOpenDetails={() => setPropertiesSheetOpen(true)} />
            </div>
          )}
        </LogoDropZone>
        {!isMobile && <RightPropertiesPanel />}
      </div>

      {isMobile && <MobileAddBar />}
      {isMobile && <MobilePropertiesSheet open={propertiesSheetOpen} onClose={() => setPropertiesSheetOpen(false)} />}
    </div>
  );
}

/**
 * Saves to the server, and says whether it worked.
 *
 * It used to swallow every failure and tell the caller nothing, so both callers marked the design
 * clean on the way past — a dropped connection or a 500 left the customer looking at an editor that
 * claimed their work was saved. Returning the outcome is what makes an honest indicator possible.
 */
async function persist(
  design: CardDesign,
  designId: string | null,
  product: DesignProduct,
  onNewId: (id: string) => void
): Promise<boolean> {
  try {
    const anonymousToken = getAnonymousToken();
    if (designId) {
      // The token identifies an anonymous author on write as well as on read; without it every
      // autosave answered 401 and the work never left the browser.
      const res = await fetch(`/api/card-designs/${designId}?anonymousToken=${encodeURIComponent(anonymousToken)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: design.title, front: design.front, back: design.back }),
      });
      return res.ok;
    }
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
    if (!res.ok) return false;
    const data = await res.json();
    if (data.id) onNewId(data.id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads — or, on the first visit from a template, records — what the template originally said.
 *
 * Kept in sessionStorage because the first autosave rewrites the URL from `/design/t-{slug}` to
 * `/design/{id}`, which remounts this editor with the saved design as its starting point. Without
 * somewhere to park it, the only record of the template's own wording would be gone by the time the
 * customer reached the proof.
 */
function rememberTemplateBaseline(design: CardDesign, designId: string | null): TemplateBaseline | null {
  const templateId = design.templateId;
  if (!templateId || typeof window === "undefined") return null;
  try {
    const key = baselineKey(templateId);
    if (!designId) {
      const baseline = baselineFromDesign(design);
      window.sessionStorage.setItem(key, JSON.stringify(baseline));
      return baseline;
    }
    const stored = window.sessionStorage.getItem(key);
    return stored ? (JSON.parse(stored) as TemplateBaseline) : null;
  } catch {
    return null;
  }
}
