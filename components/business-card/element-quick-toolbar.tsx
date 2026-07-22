"use client";

import { useState } from "react";
import { Bold, Italic, Copy, Trash2, MoreHorizontal, Lock, Unlock } from "lucide-react";
import { useCardEditorStore } from "@/lib/business-card/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EDITOR_FONTS } from "@/lib/business-card/fonts";
import type { CardElement, TextElement } from "@/lib/business-card/schema";

interface ElementQuickToolbarProps {
  onOpenDetails: () => void;
  variant?: "desktop" | "mobile";
}

/**
 * Compact, always-in-view controls for the currently selected element — the primary way to make
 * edits (font/size/bold/color/delete for text; color/delete for shapes; delete for images/QR).
 * The full RightPropertiesPanel / mobile sheet remains available via "More" for precise numeric
 * control, but most edits shouldn't require opening it at all.
 */
export function ElementQuickToolbar({ onOpenDetails, variant = "desktop" }: ElementQuickToolbarProps) {
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const design = useCardEditorStore((s) => s.design);
  const selectedIds = useCardEditorStore((s) => s.selectedIds);
  const updateElement = useCardEditorStore((s) => s.updateElement);
  const removeSelected = useCardEditorStore((s) => s.removeSelected);
  const duplicateSelected = useCardEditorStore((s) => s.duplicateSelected);
  const toggleLockSelected = useCardEditorStore((s) => s.toggleLockSelected);

  const elements = activeSide === "front" ? design.front.elements : design.back.elements;
  const selected = elements.filter((el) => selectedIds.includes(el.id));
  const single = selected.length === 1 ? selected[0] : null;

  if (selected.length === 0) return null;

  const patch = (p: Partial<CardElement>) => single && updateElement(activeSide, single.id, p);
  const isMobile = variant === "mobile";

  return (
    <div
      className={
        isMobile
          ? "flex items-center gap-1 overflow-x-auto border-t border-kc-border bg-white px-2 py-2"
          : "flex flex-wrap items-center gap-2 border-b border-kc-border bg-white px-4 py-2"
      }
    >
      {single?.type === "text" ? (
        <TextQuickControls el={single} patch={patch} compact={isMobile} />
      ) : (
        <span className="shrink-0 text-xs font-medium text-kc-muted">
          {selected.length > 1 ? `${selected.length} selected` : titleFor(single!.type)}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <IconBtn label="Duplicate" onClick={duplicateSelected}><Copy className="h-4 w-4" /></IconBtn>
        <IconBtn label={single?.locked ? "Unlock" : "Lock"} onClick={toggleLockSelected}>
          {single?.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </IconBtn>
        {isMobile && <IconBtn label="More options" onClick={onOpenDetails}><MoreHorizontal className="h-4 w-4" /></IconBtn>}
        <IconBtn label="Delete" onClick={removeSelected}><Trash2 className="h-4 w-4 text-red-500" /></IconBtn>
      </div>
    </div>
  );
}

function TextQuickControls({ el, patch, compact }: { el: TextElement; patch: (p: Partial<TextElement>) => void; compact: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Select value={el.fontFamily} onValueChange={(v) => v && patch({ fontFamily: v })}>
        <SelectTrigger className={compact ? "h-9 w-28 text-xs" : "h-9 w-36 text-xs"}><SelectValue /></SelectTrigger>
        <SelectContent>
          {EDITOR_FONTS.map((f) => <SelectItem key={f.family} value={f.family}>{f.family}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={el.fontSizePt}
        onChange={(e) => patch({ fontSizePt: Number(e.target.value) })}
        className="h-9 w-14 text-xs"
      />
      <ToggleBtn active={["700", "800", "900"].includes(el.fontWeight)} onClick={() => patch({ fontWeight: ["700", "800", "900"].includes(el.fontWeight) ? "400" : "700" })}>
        <Bold className="h-4 w-4" />
      </ToggleBtn>
      <ToggleBtn active={el.italic} onClick={() => patch({ italic: !el.italic })}>
        <Italic className="h-4 w-4" />
      </ToggleBtn>
      <input type="color" value={el.color} onChange={(e) => patch({ color: e.target.value })} className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-kc-border p-1" title="Text color" />
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        setPressed(true);
        onClick();
        setTimeout(() => setPressed(false), 150);
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${pressed ? "bg-kc-teal/20" : "hover:bg-kc-bg"}`}
    >
      {children}
    </button>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-md border ${active ? "border-kc-teal bg-kc-teal/10 text-kc-teal" : "border-kc-border text-kc-dark hover:bg-kc-bg"}`}
    >
      {children}
    </button>
  );
}

function titleFor(type: CardElement["type"]): string {
  return type === "text" ? "Text" : type === "image" ? "Image" : type === "shape" ? "Shape" : "QR Code";
}
