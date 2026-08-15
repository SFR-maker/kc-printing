"use client";

import Link from "next/link";
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Grid3x3, Eye, EyeOff, Save, Download, ArrowRight, Layers2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCardEditorStore } from "@/lib/business-card/store";
import { LogoTile } from "@/components/layout/Wordmark";
import { saveStatusLabel, type SaveStatus } from "../save-status";


/**
 * Zoom steps multiply rather than add.
 *
 * A flat 0.15 is a sensible nudge at 100% and nonsense at banner scale: from the 1.3% a 4 x 12ft
 * banner fits at, "zoom out" did nothing and "zoom in" jumped six-fold. A ratio behaves the same at
 * every scale.
 */
const ZOOM_STEP = 1.25;
interface TopCommandBarProps {
  onSave: () => void;
  saving: boolean;
  /**
   * The one state of the design, told in one place — see save-status.ts.
   *
   * Required, not optional: the bar has no way to tell a design the server has from one it does
   * not, so anything it guessed here would be a claim it could not stand behind.
   */
  saveStatus: SaveStatus;
  onExport: () => void;
  exporting: boolean;
  onContinue?: () => void;
  isSignedIn?: boolean;
}

export function TopCommandBar({ onSave, saving, saveStatus, onExport, exporting, onContinue, isSignedIn }: TopCommandBarProps) {
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const setActiveSide = useCardEditorStore((s) => s.setActiveSide);
  const undo = useCardEditorStore((s) => s.undo);
  const redo = useCardEditorStore((s) => s.redo);
  const canUndo = useCardEditorStore((s) => s.past.length > 0);
  const canRedo = useCardEditorStore((s) => s.future.length > 0);
  const zoom = useCardEditorStore((s) => s.zoom);
  const setZoom = useCardEditorStore((s) => s.setZoom);
  const requestFit = useCardEditorStore((s) => s.requestFit);
  const showGuides = useCardEditorStore((s) => s.showGuides);
  const toggleGuides = useCardEditorStore((s) => s.toggleGuides);
  const showGrid = useCardEditorStore((s) => s.showGrid);
  const toggleGrid = useCardEditorStore((s) => s.toggleGrid);
  const clearBack = useCardEditorStore((s) => s.clearBack);
  /**
   * A back with nothing on it is "front only".
   *
   * The schema always carries two faces, so there is no such thing as deleting one - what the
   * customer means by "remove the back" is that nothing should print on it. Emptiness is therefore
   * the state to read, not a flag.
   */
  const backIsEmpty = useCardEditorStore((s) => s.design.back.elements.length === 0);
  const [confirmingRemoveBack, setConfirmingRemoveBack] = useState(false);

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-kc-border bg-white px-4 py-2.5">
      <div className="flex items-center gap-1">
        <Link href="/" title="Back to 611 Printing" className="mr-1 shrink-0">
          <LogoTile className="h-8 w-8" aria-hidden />
          <span className="sr-only">Back to 611 Printing</span>
        </Link>
        <div className="mx-1 h-5 w-px bg-kc-border" />
        <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
        <div className="mx-1 h-5 w-px bg-kc-border" />
        <IconButton label="Zoom out" onClick={() => setZoom(zoom / ZOOM_STEP)}>
          <ZoomOut className="h-4 w-4" />
        </IconButton>
        <span className="w-11 text-center text-xs text-kc-muted">{Math.round(zoom * 100)}%</span>
        <IconButton label="Zoom in" onClick={() => setZoom(zoom * ZOOM_STEP)}>
          <ZoomIn className="h-4 w-4" />
        </IconButton>
        <IconButton label="Fit to screen" onClick={() => requestFit()}>
          <Maximize2 className="h-4 w-4" />
        </IconButton>
        <div className="mx-1 h-5 w-px bg-kc-border" />
        <IconButton label={showGuides ? "Hide guides" : "Show guides"} onClick={toggleGuides} active={showGuides}>
          {showGuides ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </IconButton>
        <IconButton label={showGrid ? "Hide grid" : "Show grid"} onClick={toggleGrid} active={showGrid}>
          <Grid3x3 className="h-4 w-4" />
        </IconButton>
      </div>

      {/* Which face you are editing is the single most consequential piece of state in the editor,
          and it was a pair of extra-small grey words. Sized up and given a clear selected state so
          it reads at a glance and cannot be confused with the icon buttons beside it. */}
      <div
        role="tablist"
        aria-label="Card side"
        className="flex items-center gap-1 rounded-xl border border-kc-border bg-kc-bg p-1"
      >
        {(["front", "back"] as const).map((side) => (
          <button
            key={side}
            role="tab"
            aria-selected={activeSide === side}
            onClick={() => setActiveSide(side)}
            className={`rounded-lg px-5 py-2 text-sm font-bold capitalize transition-colors ${
              activeSide === side
                ? "bg-kc-magenta-deep text-white shadow-sm"
                : "text-kc-dark/70 hover:text-kc-dark"
            }`}
          >
            {side}
            {/*
              A visual hint only, deliberately outside the accessible name.

              Folding it in gave the tab a name that changed with its contents - "Backempty", then
              "Back (empty)" - so the one control whose identity should be fixed was renaming itself.
              Screen reader users are not left short: the "Add back" button beside these tabs appears
              in exactly the same condition and says the same thing in words.
            */}
            {side === "back" && backIsEmpty && (
              <span aria-hidden="true" className="ml-1.5 text-[11px] font-medium opacity-70">
                empty
              </span>
            )}
          </button>
        ))}
      </div>

      {/*
        Starting from a two-sided template and wanting one side is common, and the only way through
        it used to be starting the design again. Removing the back is undoable like any other edit,
        so the confirmation is about making the consequence explicit rather than about safety.
      */}
      {backIsEmpty ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveSide("back")}
          className="border-kc-border text-kc-dark"
        >
          <Layers2 className="mr-1.5 h-3.5 w-3.5" /> Add back
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmingRemoveBack(true)}
          className="border-kc-border text-kc-muted hover:text-kc-dark"
        >
          <Layers2 className="mr-1.5 h-3.5 w-3.5" /> Remove back
        </Button>
      )}

      {confirmingRemoveBack && (
        <div
          role="alertdialog"
          aria-label="Remove the back of this design"
          className="absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg"
        >
          <p className="text-[13.5px] leading-snug text-amber-900">
            This clears everything on the back and sets the order to print the front only. You can
            undo it, and your price updates when you continue.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => { clearBack(); setConfirmingRemoveBack(false); }}
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              Remove the back
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmingRemoveBack(false)}
              className="border-amber-300 bg-white text-amber-900"
            >
              Keep it
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/*
          One slot, one meaning — decided in save-status.ts, not here.

          It used to read "Saved as guest" whenever a guest's design was not dirty, which covered
          three states that are not saved at all: straight after a failed request, and - worst -
          the moment a template was opened, before a single keystroke, with nothing on the server.
        */}
        <span
          data-testid="save-status"
          aria-live="polite"
          className={`text-xs ${saveStatus === "failed" ? "font-semibold text-red-600" : "text-kc-muted"}`}
        >
          {saveStatusLabel(saveStatus, isSignedIn)}
        </span>
        <Button variant="outline" size="sm" onClick={onSave} disabled={saving} className="border-kc-border">
          <Save className="mr-1.5 h-3.5 w-3.5" /> Save
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} disabled={exporting} className="border-kc-border">
          <Download className="mr-1.5 h-3.5 w-3.5" /> {exporting ? "Exporting..." : "Export"}
        </Button>
        {onContinue && (
          <Button size="sm" onClick={onContinue} className="bg-kc-coral text-white hover:bg-kc-coral/90">
            Continue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, disabled, active, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30 ${active ? "bg-kc-teal/10 text-kc-teal" : "text-kc-dark hover:bg-kc-bg"}`}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
