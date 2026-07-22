"use client";

import Link from "next/link";
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Grid3x3, Eye, EyeOff, Save, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCardEditorStore } from "@/lib/business-card/store";

interface TopCommandBarProps {
  onSave: () => void;
  saving: boolean;
  onExport: () => void;
  exporting: boolean;
  onContinue?: () => void;
}

export function TopCommandBar({ onSave, saving, onExport, exporting, onContinue }: TopCommandBarProps) {
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const setActiveSide = useCardEditorStore((s) => s.setActiveSide);
  const undo = useCardEditorStore((s) => s.undo);
  const redo = useCardEditorStore((s) => s.redo);
  const canUndo = useCardEditorStore((s) => s.past.length > 0);
  const canRedo = useCardEditorStore((s) => s.future.length > 0);
  const zoom = useCardEditorStore((s) => s.zoom);
  const setZoom = useCardEditorStore((s) => s.setZoom);
  const showGuides = useCardEditorStore((s) => s.showGuides);
  const toggleGuides = useCardEditorStore((s) => s.toggleGuides);
  const showGrid = useCardEditorStore((s) => s.showGrid);
  const toggleGrid = useCardEditorStore((s) => s.toggleGrid);
  const dirty = useCardEditorStore((s) => s.dirty);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kc-border bg-white px-4 py-2.5">
      <div className="flex items-center gap-1">
        <Link
          href="/"
          title="Back to KC Printing"
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-kc-teal text-xs font-black text-white"
        >
          KC
        </Link>
        <div className="mx-1 h-5 w-px bg-kc-border" />
        <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
        <div className="mx-1 h-5 w-px bg-kc-border" />
        <IconButton label="Zoom out" onClick={() => setZoom(zoom - 0.15)}>
          <ZoomOut className="h-4 w-4" />
        </IconButton>
        <span className="w-11 text-center text-xs text-kc-muted">{Math.round(zoom * 100)}%</span>
        <IconButton label="Zoom in" onClick={() => setZoom(zoom + 0.15)}>
          <ZoomIn className="h-4 w-4" />
        </IconButton>
        <IconButton label="Fit to screen" onClick={() => setZoom(1)}>
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

      <div className="flex items-center gap-1 rounded-lg border border-kc-border bg-kc-bg p-1">
        <button
          onClick={() => setActiveSide("front")}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${activeSide === "front" ? "bg-white text-kc-teal shadow-sm" : "text-kc-muted"}`}
        >
          Front
        </button>
        <button
          onClick={() => setActiveSide("back")}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${activeSide === "back" ? "bg-white text-kc-teal shadow-sm" : "text-kc-muted"}`}
        >
          Back
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-kc-muted">{saving ? "Saving..." : dirty ? "Unsaved changes" : "Saved"}</span>
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
