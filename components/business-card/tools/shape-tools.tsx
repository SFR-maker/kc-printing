"use client";

import { useState } from "react";
import { Square, Circle, Minus } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCardEditorStore } from "@/lib/business-card/store";
import { createShapeElement, createImageElement } from "@/lib/business-card/element-factory";
import { ICON_CATEGORIES, getIconComponent } from "@/lib/business-card/icon-library";
import { iconToPngDataUri } from "@/lib/business-card/icon-to-image";

export function ShapeTools({ onInserted }: { onInserted?: () => void }) {
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const addElement = useCardEditorStore((s) => s.addElement);
  const elements = useCardEditorStore((s) => (s.activeSide === "front" ? s.design.front.elements : s.design.back.elements));
  const [insertingIcon, setInsertingIcon] = useState<string | null>(null);

  async function insertIcon(name: string) {
    setInsertingIcon(name);
    try {
      const color = "#0A6E63";
      const result = await iconToPngDataUri(name, color, 512);
      if (!result) return;
      const el = createImageElement(
        { src: result.dataUri, naturalWidthPx: result.width, naturalHeightPx: result.height, width: 0.7, height: 0.7, iconName: name, iconColor: color },
        elements
      );
      addElement(activeSide, el);
      onInserted?.();
    } finally {
      setInsertingIcon(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-kc-muted">Basic Shapes</div>
        <div className="grid grid-cols-4 gap-2">
          <ShapeButton label="Rectangle" onClick={() => { addElement(activeSide, createShapeElement("rect", {}, elements)); onInserted?.(); }}>
            <Square className="h-4 w-4" />
          </ShapeButton>
          <ShapeButton label="Ellipse" onClick={() => { addElement(activeSide, createShapeElement("ellipse", {}, elements)); onInserted?.(); }}>
            <Circle className="h-4 w-4" />
          </ShapeButton>
          <ShapeButton label="Divider Line" onClick={() => { addElement(activeSide, createShapeElement("divider", {}, elements)); onInserted?.(); }}>
            <Minus className="h-4 w-4" />
          </ShapeButton>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-kc-muted">Icon Library</div>
        <Accordion className="space-y-1.5">
          {ICON_CATEGORIES.map((cat) => (
            <AccordionItem key={cat.key} value={cat.key} className="rounded-lg border border-kc-border px-2">
              <AccordionTrigger className="py-2.5 text-sm font-medium text-kc-dark hover:no-underline">{cat.label}</AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="grid grid-cols-5 gap-1.5">
                  {cat.icons.map((name) => {
                    const Icon = getIconComponent(name);
                    if (!Icon) return null;
                    return (
                      <button
                        key={name}
                        title={name}
                        aria-label={name}
                        onClick={() => insertIcon(name)}
                        disabled={insertingIcon === name}
                        className="flex h-11 items-center justify-center rounded-md border border-kc-border text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg active:scale-95 transition-transform disabled:opacity-40"
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
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
      className="flex h-11 items-center justify-center rounded-lg border border-kc-border text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg active:scale-95 transition-transform"
    >
      {children}
    </button>
  );
}
