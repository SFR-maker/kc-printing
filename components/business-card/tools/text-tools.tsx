"use client";

import { useCardEditorStore } from "@/lib/business-card/store";
import { createTextElement } from "@/lib/business-card/element-factory";

const TEXT_PRESETS = [
  { label: "Heading", fontSizePt: 18, fontWeight: "700" as const },
  { label: "Subheading", fontSizePt: 12, fontWeight: "600" as const },
  { label: "Body Text", fontSizePt: 9, fontWeight: "400" as const },
];

export function TextTools({ onInserted }: { onInserted?: () => void }) {
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const addElement = useCardEditorStore((s) => s.addElement);
  const elements = useCardEditorStore((s) => (s.activeSide === "front" ? s.design.front.elements : s.design.back.elements));

  function add(preset: (typeof TEXT_PRESETS)[number]) {
    addElement(activeSide, createTextElement({ text: preset.label, fontSizePt: preset.fontSizePt, fontWeight: preset.fontWeight }, elements));
    onInserted?.();
  }

  return (
    <div className="grid gap-2">
      {TEXT_PRESETS.map((preset) => (
        <button
          key={preset.label}
          onClick={() => add(preset)}
          className="rounded-lg border border-kc-border px-3 py-3 text-left text-sm text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg active:scale-[0.98] transition-transform"
          style={{ fontWeight: preset.fontWeight === "700" ? 700 : preset.fontWeight === "600" ? 600 : 400, fontSize: preset.label === "Heading" ? 16 : preset.label === "Subheading" ? 14 : 13 }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
