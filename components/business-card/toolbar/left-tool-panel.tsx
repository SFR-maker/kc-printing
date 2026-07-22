"use client";

import { useState } from "react";
import { Type, Square, Circle, Minus, QrCode, Palette } from "lucide-react";
import { useCardEditorStore } from "@/lib/business-card/store";
import { createTextElement, createShapeElement } from "@/lib/business-card/element-factory";
import { ImageUploadButton } from "../image-upload-button";
import { QrDialog } from "../qr-dialog";
import { Input } from "@/components/ui/input";

const TEXT_PRESETS = [
  { label: "Heading", fontSizePt: 18, fontWeight: "700" as const },
  { label: "Subheading", fontSizePt: 12, fontWeight: "600" as const },
  { label: "Body Text", fontSizePt: 9, fontWeight: "400" as const },
];

export function LeftToolPanel() {
  const [qrOpen, setQrOpen] = useState(false);
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const addElement = useCardEditorStore((s) => s.addElement);
  const setBackground = useCardEditorStore((s) => s.setBackground);
  const design = useCardEditorStore((s) => s.design);
  const elements = activeSide === "front" ? design.front.elements : design.back.elements;
  const bgColor = (activeSide === "front" ? design.front.background : design.back.background).color;

  return (
    <div className="flex w-56 shrink-0 flex-col gap-5 overflow-y-auto border-r border-kc-border bg-white p-4">
      <Section title="Text" icon={<Type className="h-3.5 w-3.5" />}>
        <div className="grid gap-2">
          {TEXT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => addElement(activeSide, createTextElement({ text: preset.label, fontSizePt: preset.fontSizePt, fontWeight: preset.fontWeight }, elements))}
              className="rounded-lg border border-kc-border px-3 py-2 text-left text-sm text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg"
              style={{ fontWeight: preset.fontWeight === "700" ? 700 : preset.fontWeight === "600" ? 600 : 400 }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Shapes" icon={<Square className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-4 gap-2">
          <ShapeButton label="Rectangle" onClick={() => addElement(activeSide, createShapeElement("rect", {}, elements))}>
            <Square className="h-4 w-4" />
          </ShapeButton>
          <ShapeButton label="Ellipse" onClick={() => addElement(activeSide, createShapeElement("ellipse", {}, elements))}>
            <Circle className="h-4 w-4" />
          </ShapeButton>
          <ShapeButton label="Divider Line" onClick={() => addElement(activeSide, createShapeElement("divider", {}, elements))}>
            <Minus className="h-4 w-4" />
          </ShapeButton>
        </div>
      </Section>

      <Section title="Image / Logo">
        <ImageUploadButton />
      </Section>

      <Section title="QR Code" icon={<QrCode className="h-3.5 w-3.5" />}>
        <button
          onClick={() => setQrOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-kc-border px-3 py-2.5 text-sm font-medium text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg"
        >
          <QrCode className="h-4 w-4" /> Add QR Code
        </button>
        <QrDialog open={qrOpen} onOpenChange={setQrOpen} />
      </Section>

      <Section title="Background" icon={<Palette className="h-3.5 w-3.5" />}>
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={bgColor}
            onChange={(e) => setBackground(activeSide, { type: "solid", color: e.target.value, gradient: null })}
            className="h-9 w-14 p-1"
          />
          <span className="text-xs text-kc-muted">{activeSide === "front" ? "Front" : "Back"} background</span>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kc-muted">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ShapeButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-11 items-center justify-center rounded-lg border border-kc-border text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg"
    >
      {children}
    </button>
  );
}
