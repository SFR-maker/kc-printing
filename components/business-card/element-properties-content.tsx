"use client";

import { useRef } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, Copy, Lock, Unlock, BringToFront, SendToBack, ChevronUp, ChevronDown } from "lucide-react";
import { useCardEditorStore } from "@/lib/business-card/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EDITOR_FONTS } from "@/lib/business-card/fonts";
import { recolorIconElement } from "@/lib/business-card/icon-to-image";
import type { CardElement, TextElement, ShapeElement, ImageElement, QrElement } from "@/lib/business-card/schema";

/** Full precise-control panel for the selected element — X/Y/size/rotation, per-type styling, and
 * layering. Shared between the desktop right panel and the mobile "More" bottom sheet, reached via
 * the quick toolbar rather than being the primary way to edit (that's ElementQuickToolbar). */
export function ElementPropertiesContent() {
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const design = useCardEditorStore((s) => s.design);
  const selectedIds = useCardEditorStore((s) => s.selectedIds);
  const updateElement = useCardEditorStore((s) => s.updateElement);
  const removeSelected = useCardEditorStore((s) => s.removeSelected);
  const duplicateSelected = useCardEditorStore((s) => s.duplicateSelected);
  const toggleLockSelected = useCardEditorStore((s) => s.toggleLockSelected);
  const reorderSelected = useCardEditorStore((s) => s.reorderSelected);

  const elements = activeSide === "front" ? design.front.elements : design.back.elements;
  const selected = elements.filter((el) => selectedIds.includes(el.id));

  if (selected.length === 0) {
    return <p className="text-center text-sm text-kc-muted">Select an element to edit its properties.</p>;
  }

  const single = selected.length === 1 ? selected[0] : null;
  const patch = (p: Partial<CardElement>) => single && updateElement(activeSide, single.id, p);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-kc-muted">
          {selected.length > 1 ? `${selected.length} selected` : titleFor(single!.type)}
        </span>
        <div className="flex items-center gap-1">
          <IconBtn label="Duplicate" onClick={duplicateSelected}><Copy className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label={single?.locked ? "Unlock" : "Lock"} onClick={toggleLockSelected}>
            {single?.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          </IconBtn>
          <IconBtn label="Delete" onClick={removeSelected}><Trash2 className="h-3.5 w-3.5 text-red-500" /></IconBtn>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <IconBtn label="Bring to front" onClick={() => reorderSelected("front")}><BringToFront className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="Forward" onClick={() => reorderSelected("forward")}><ChevronUp className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="Backward" onClick={() => reorderSelected("backward")}><ChevronDown className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="Send to back" onClick={() => reorderSelected("back")}><SendToBack className="h-3.5 w-3.5" /></IconBtn>
      </div>

      {single && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="X (in)"><Input type="number" step={0.05} value={round(single.x)} onChange={(e) => patch({ x: Number(e.target.value) })} /></Field>
            <Field label="Y (in)"><Input type="number" step={0.05} value={round(single.y)} onChange={(e) => patch({ y: Number(e.target.value) })} /></Field>
            <Field label="Width (in)"><Input type="number" step={0.05} value={round(single.width)} onChange={(e) => patch({ width: Number(e.target.value) })} /></Field>
            <Field label="Height (in)"><Input type="number" step={0.05} value={round(single.height)} onChange={(e) => patch({ height: Number(e.target.value) })} /></Field>
            <Field label="Rotation °"><Input type="number" value={round(single.rotation)} onChange={(e) => patch({ rotation: Number(e.target.value) })} /></Field>
            <Field label="Opacity"><Input type="number" min={0} max={1} step={0.1} value={single.opacity} onChange={(e) => patch({ opacity: Number(e.target.value) })} /></Field>
          </div>

          {single.type === "text" && <TextProps el={single} patch={patch} />}
          {single.type === "shape" && <ShapeProps el={single} patch={patch} />}
          {single.type === "image" && <ImageProps el={single} patch={patch} />}
          {single.type === "qr" && <QrProps el={single} patch={patch} />}
        </>
      )}
    </div>
  );
}

function TextProps({ el, patch }: { el: TextElement; patch: (p: Partial<TextElement>) => void }) {
  return (
    <div className="space-y-3 border-t border-kc-border pt-3">
      <Field label="Text">
        <textarea
          value={el.text}
          onChange={(e) => patch({ text: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-kc-border px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Font">
        <Select value={el.fontFamily} onValueChange={(v) => v && patch({ fontFamily: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EDITOR_FONTS.map((f) => <SelectItem key={f.family} value={f.family}>{f.family}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Size (pt)"><Input type="number" value={el.fontSizePt} onChange={(e) => patch({ fontSizePt: Number(e.target.value) })} /></Field>
        <Field label="Color"><Input type="color" value={el.color} onChange={(e) => patch({ color: e.target.value })} className="h-9 p-1" /></Field>
      </div>
      <div className="flex items-center gap-1">
        <ToggleBtn active={["700", "800", "900"].includes(el.fontWeight)} onClick={() => patch({ fontWeight: ["700", "800", "900"].includes(el.fontWeight) ? "400" : "700" })}><Bold className="h-3.5 w-3.5" /></ToggleBtn>
        <ToggleBtn active={el.italic} onClick={() => patch({ italic: !el.italic })}><Italic className="h-3.5 w-3.5" /></ToggleBtn>
        <ToggleBtn active={el.underline} onClick={() => patch({ underline: !el.underline })}><Underline className="h-3.5 w-3.5" /></ToggleBtn>
        <div className="mx-1 h-5 w-px bg-kc-border" />
        <ToggleBtn active={el.align === "left"} onClick={() => patch({ align: "left" })}><AlignLeft className="h-3.5 w-3.5" /></ToggleBtn>
        <ToggleBtn active={el.align === "center"} onClick={() => patch({ align: "center" })}><AlignCenter className="h-3.5 w-3.5" /></ToggleBtn>
        <ToggleBtn active={el.align === "right"} onClick={() => patch({ align: "right" })}><AlignRight className="h-3.5 w-3.5" /></ToggleBtn>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Line height"><Input type="number" step={0.1} value={el.lineHeight} onChange={(e) => patch({ lineHeight: Number(e.target.value) })} /></Field>
        <Field label="Letter spacing"><Input type="number" step={0.5} value={el.letterSpacing} onChange={(e) => patch({ letterSpacing: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Case">
        <Select value={el.textTransform} onValueChange={(v) => v && patch({ textTransform: v as TextElement["textTransform"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Normal</SelectItem>
            <SelectItem value="uppercase">UPPERCASE</SelectItem>
            <SelectItem value="lowercase">lowercase</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function ShapeProps({ el, patch }: { el: ShapeElement; patch: (p: Partial<ShapeElement>) => void }) {
  return (
    <div className="space-y-3 border-t border-kc-border pt-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fill"><Input type="color" value={el.fill ?? "#000000"} onChange={(e) => patch({ fill: e.target.value })} className="h-9 p-1" /></Field>
        <Field label="Stroke"><Input type="color" value={el.stroke ?? "#000000"} onChange={(e) => patch({ stroke: e.target.value })} className="h-9 p-1" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Stroke width"><Input type="number" min={0} value={el.strokeWidthPx} onChange={(e) => patch({ strokeWidthPx: Number(e.target.value) })} /></Field>
        {el.shape === "rect" && <Field label="Corner radius"><Input type="number" min={0} step={0.02} value={el.cornerRadiusIn} onChange={(e) => patch({ cornerRadiusIn: Number(e.target.value) })} /></Field>}
      </div>
    </div>
  );
}

function ImageProps({ el, patch }: { el: ImageElement; patch: (p: Partial<ImageElement>) => void }) {
  // Guards against native color-input drag firing onChange faster than the async re-rasterize
  // resolves — without it, an earlier drag frame could resolve after a later one and revert the
  // icon to a color the user already moved past.
  const latestRequest = useRef<string | null>(null);

  async function handleIconColorChange(color: string) {
    latestRequest.current = color;
    try {
      const result = await recolorIconElement(el, color);
      if (result && latestRequest.current === color) patch(result);
    } catch (err) {
      console.error("Failed to recolor icon", err);
    }
  }

  return (
    <div className="space-y-3 border-t border-kc-border pt-3">
      {el.iconName && (
        <Field label="Icon color">
          <Input
            type="color"
            value={el.iconColor ?? "#0A6E63"}
            onChange={(e) => handleIconColorChange(e.target.value)}
            className="h-9 p-1"
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Border width"><Input type="number" min={0} value={el.borderWidthPx} onChange={(e) => patch({ borderWidthPx: Number(e.target.value) })} /></Field>
        <Field label="Border color"><Input type="color" value={el.borderColor} onChange={(e) => patch({ borderColor: e.target.value })} className="h-9 p-1" /></Field>
      </div>
      <Field label="Corner radius (in)"><Input type="number" min={0} step={0.02} value={el.cornerRadiusIn} onChange={(e) => patch({ cornerRadiusIn: Number(e.target.value) })} /></Field>
    </div>
  );
}

function QrProps({ el, patch }: { el: QrElement; patch: (p: Partial<QrElement>) => void }) {
  return (
    <div className="space-y-3 border-t border-kc-border pt-3">
      <Field label="Encoded value"><Input value={el.value} onChange={(e) => patch({ value: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Foreground"><Input type="color" value={el.foreground} onChange={(e) => patch({ foreground: e.target.value })} className="h-9 p-1" /></Field>
        <Field label="Background"><Input type="color" value={el.background} onChange={(e) => patch({ background: e.target.value })} className="h-9 p-1" /></Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-kc-muted">{label}</Label>
      {children}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} onClick={onClick} className="h-7 w-7">
      {children}
    </Button>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md ${active ? "bg-kc-teal/10 text-kc-teal" : "text-kc-dark hover:bg-kc-bg"}`}
    >
      {children}
    </button>
  );
}

function titleFor(type: CardElement["type"]): string {
  return type === "text" ? "Text" : type === "image" ? "Image" : type === "shape" ? "Shape" : "QR Code";
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
