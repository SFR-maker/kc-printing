"use client";

import { useState } from "react";
import { Undo2, Redo2, Save, Download, ArrowRight, MoreVertical, Eye, EyeOff, Grid3x3, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useCardEditorStore } from "@/lib/business-card/store";

interface MobileTopBarProps {
  onSave: () => void;
  saving: boolean;
  onExport: () => void;
  exporting: boolean;
  onContinue?: () => void;
}

export function MobileTopBar({ onSave, saving, onExport, exporting, onContinue }: MobileTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div className="relative border-b border-kc-border bg-white">
      <div className="flex items-center justify-between gap-1 px-2 py-2">
        <div className="flex items-center gap-1">
          <button aria-label="Undo" onClick={undo} disabled={!canUndo} className="flex h-9 w-9 items-center justify-center rounded-md disabled:opacity-30">
            <Undo2 className="h-4 w-4" />
          </button>
          <button aria-label="Redo" onClick={redo} disabled={!canRedo} className="flex h-9 w-9 items-center justify-center rounded-md disabled:opacity-30">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-kc-border bg-kc-bg p-0.5">
          <button onClick={() => setActiveSide("front")} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${activeSide === "front" ? "bg-white text-kc-teal shadow-sm" : "text-kc-muted"}`}>
            Front
          </button>
          <button onClick={() => setActiveSide("back")} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${activeSide === "back" ? "bg-white text-kc-teal shadow-sm" : "text-kc-muted"}`}>
            Back
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button aria-label="More options" onClick={() => setMenuOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-md">
            <MoreVertical className="h-4 w-4" />
          </button>
          {onContinue ? (
            <button onClick={onContinue} className="flex h-9 items-center gap-1 rounded-md bg-kc-coral px-3 text-xs font-semibold text-white">
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button aria-label="Save" onClick={onSave} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-md">
              <Save className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="absolute right-2 top-12 z-40 w-56 rounded-xl border border-kc-border bg-white p-2 shadow-xl">
          <MenuRow label="Save Design" icon={<Save className="h-4 w-4" />} onClick={() => { onSave(); setMenuOpen(false); }} disabled={saving} />
          <MenuRow label={exporting ? "Exporting..." : "Export PDF"} icon={<Download className="h-4 w-4" />} onClick={() => { onExport(); setMenuOpen(false); }} disabled={exporting} />
          <div className="my-1.5 h-px bg-kc-border" />
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs text-kc-muted">Zoom {Math.round(zoom * 100)}%</span>
            <div className="flex items-center gap-1">
              <button aria-label="Zoom out" onClick={() => setZoom(zoom - 0.15)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-kc-bg"><ZoomOut className="h-3.5 w-3.5" /></button>
              <button aria-label="Zoom in" onClick={() => setZoom(zoom + 0.15)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-kc-bg"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button aria-label="Fit to screen" onClick={() => setZoom(1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-kc-bg"><Maximize2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <MenuRow label={showGuides ? "Hide Guides" : "Show Guides"} icon={showGuides ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} onClick={toggleGuides} />
          <MenuRow label={showGrid ? "Hide Grid" : "Show Grid"} icon={<Grid3x3 className="h-4 w-4" />} onClick={toggleGrid} />
        </div>
      )}
    </div>
  );
}

function MenuRow({ label, icon, onClick, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-kc-dark hover:bg-kc-bg disabled:opacity-50">
      {icon} {label}
    </button>
  );
}
