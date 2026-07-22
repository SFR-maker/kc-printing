"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useCardEditorStore } from "@/lib/business-card/store";
import type { CardDesign } from "@/lib/business-card/schema";
import { validateDesign } from "@/lib/business-card/validate";
import { getAnonymousToken, saveDesignLocally, loadDesignLocally } from "@/lib/business-card/local-autosave";
import { CardCanvas } from "./card-canvas";
import { LeftToolPanel } from "./toolbar/left-tool-panel";
import { RightPropertiesPanel } from "./toolbar/right-properties-panel";
import { TopCommandBar } from "./toolbar/top-command-bar";
import { ProofScreen } from "./proof-screen";

const LOCAL_KEY = "draft";
const AUTOSAVE_DEBOUNCE_MS = 1500;

interface CardEditorProps {
  initialDesign: CardDesign;
  designId: string | null;
  isSignedIn: boolean;
}

export function CardEditor({ initialDesign, designId: initialDesignId, isSignedIn }: CardEditorProps) {
  const router = useRouter();
  const loadDesign = useCardEditorStore((s) => s.loadDesign);
  const design = useCardEditorStore((s) => s.design);
  const dirty = useCardEditorStore((s) => s.dirty);
  const designId = useCardEditorStore((s) => s.designId);
  const markSaved = useCardEditorStore((s) => s.markSaved);

  const [showProof, setShowProof] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadDesign(initialDesign, initialDesignId);
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
      if (isSignedIn) {
        await persist(design, designId, () => {}, router, false);
      }
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
    if (isSignedIn) {
      await persist(design, designId, (newId) => {
        if (!designId && newId) router.replace(`/services/business-cards/design/${newId}`);
      }, router, true);
    }
    markSaved();
    setSaving(false);
  }, [design, designId, isSignedIn, router, markSaved]);

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
          router.push(`/services/business-cards/order?${params.toString()}`);
        }}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {resumeAvailable && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>You have an unsaved draft from a previous session.</span>
          <div className="flex gap-2">
            <button onClick={resumeDraft} className="rounded-md bg-amber-800 px-3 py-1 text-xs font-semibold text-white">Resume Draft</button>
            <button onClick={() => setResumeAvailable(false)} className="rounded-md border border-amber-300 px-3 py-1 text-xs font-semibold">Dismiss</button>
          </div>
        </div>
      )}

      <TopCommandBar onSave={handleSave} saving={saving} onExport={handleExport} exporting={exporting} onContinue={() => setShowProof(true)} />

      {errorCount > 0 && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" /> {errorCount} issue{errorCount > 1 ? "s" : ""} need attention before you can order — check the Review screen.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <LeftToolPanel />
        <div className="flex flex-1 items-center justify-center overflow-auto bg-kc-bg p-8">
          <CardCanvas />
        </div>
        <RightPropertiesPanel />
      </div>
    </div>
  );
}

async function persist(
  design: CardDesign,
  designId: string | null,
  onNewId: (id: string) => void,
  _router: ReturnType<typeof useRouter>,
  throwOnError: boolean
) {
  try {
    const anonymousToken = getAnonymousToken();
    if (designId) {
      await fetch(`/api/card-designs/${designId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: design.title, front: design.front, back: design.back }),
      });
    } else {
      const res = await fetch("/api/card-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: design.title, templateId: design.templateId, front: design.front, back: design.back, anonymousToken }),
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
