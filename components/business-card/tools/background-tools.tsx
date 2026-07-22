"use client";

import { useState } from "react";
import { useCardEditorStore } from "@/lib/business-card/store";
import { createBackgroundImageElement } from "@/lib/business-card/element-factory";
import { SOLID_PRESETS, GRADIENT_PRESETS, PATTERNS } from "@/lib/business-card/pattern-library";
import { patternToPngDataUri } from "@/lib/business-card/pattern-to-image";
import { VARIANT_PALETTES } from "@/lib/business-card/recolor";
import { Input } from "@/components/ui/input";

export function BackgroundTools({ onInserted }: { onInserted?: () => void }) {
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const design = useCardEditorStore((s) => s.design);
  const setBackground = useCardEditorStore((s) => s.setBackground);
  const addElement = useCardEditorStore((s) => s.addElement);
  const activePalette = useCardEditorStore((s) => s.activePalette);
  const applyColorVariant = useCardEditorStore((s) => s.applyColorVariant);
  const elements = activeSide === "front" ? design.front.elements : design.back.elements;
  const bgColor = (activeSide === "front" ? design.front.background : design.back.background).color;
  const [insertingPattern, setInsertingPattern] = useState<string | null>(null);

  async function applyPattern(patternKey: string) {
    const pattern = PATTERNS.find((p) => p.key === patternKey);
    if (!pattern) return;
    setInsertingPattern(patternKey);
    try {
      const result = await patternToPngDataUri(pattern, bgColor === "#FFFFFF" ? "#FFFFFF" : bgColor, "#0A6E63");
      if (!result) return;
      const el = createBackgroundImageElement({ src: result.dataUri, naturalWidthPx: result.width, naturalHeightPx: result.height }, elements);
      addElement(activeSide, el, false);
      onInserted?.();
    } finally {
      setInsertingPattern(null);
    }
  }

  return (
    <div className="space-y-4">
      {activePalette && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-kc-muted">Color Variants</div>
          <div className="grid grid-cols-4 gap-2">
            {VARIANT_PALETTES.map((palette, i) => (
              <button
                key={i}
                title="Apply this color variant"
                onClick={() => applyColorVariant(palette)}
                className="flex h-9 overflow-hidden rounded-md border border-kc-border transition-transform active:scale-95"
              >
                {palette.map((c, j) => <span key={j} className="flex-1" style={{ backgroundColor: c }} />)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-kc-muted">Swaps this template&apos;s color scheme in one click.</p>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-kc-muted">
          <span>Solid Color</span>
          <Input type="color" value={bgColor} onChange={(e) => setBackground(activeSide, { type: "solid", color: e.target.value, gradient: null })} className="h-6 w-10 p-0.5" />
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {SOLID_PRESETS.map((p) => (
            <button
              key={p.value}
              title={p.label}
              aria-label={p.label}
              onClick={() => setBackground(activeSide, { type: "solid", color: p.value, gradient: null })}
              className="h-8 rounded-md border border-kc-border transition-transform active:scale-95"
              style={{ backgroundColor: p.value }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-kc-muted">Gradients</div>
        <div className="grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button
              key={g.label}
              title={g.label}
              onClick={() => setBackground(activeSide, { type: "gradient", color: g.from, gradient: { from: g.from, to: g.to, angle: g.angle } })}
              className="h-10 rounded-md border border-kc-border transition-transform active:scale-95"
              style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-kc-muted">Patterns</div>
        <div className="grid grid-cols-3 gap-2">
          {PATTERNS.map((p) => (
            <button
              key={p.key}
              title={p.label}
              disabled={insertingPattern === p.key}
              onClick={() => applyPattern(p.key)}
              className="flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-kc-border bg-kc-bg text-[10px] font-medium text-kc-muted hover:border-kc-teal/40 disabled:opacity-40"
            >
              <PatternPreview patternKey={p.key} />
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-kc-muted">Patterns are added as a locked background layer, sent behind everything else.</p>
      </div>
    </div>
  );
}

function PatternPreview({ patternKey }: { patternKey: string }) {
  const dotStyle = { backgroundImage: "radial-gradient(#0A6E63 1px, transparent 1px)", backgroundSize: "6px 6px" };
  const stripeStyle = { backgroundImage: "repeating-linear-gradient(35deg, #0A6E63 0 2px, transparent 2px 6px)" };
  const gridStyle = { backgroundImage: "linear-gradient(#0A6E63 1px, transparent 1px), linear-gradient(90deg, #0A6E63 1px, transparent 1px)", backgroundSize: "6px 6px" };
  const styles: Record<string, React.CSSProperties> = {
    dots: dotStyle,
    "diagonal-stripes": stripeStyle,
    grid: gridStyle,
    waves: stripeStyle,
    confetti: dotStyle,
    chevron: stripeStyle,
  };
  return <div className="h-5 w-8 rounded-sm border border-kc-border/50 opacity-60" style={styles[patternKey] ?? dotStyle} />;
}
