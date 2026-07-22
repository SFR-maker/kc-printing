"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCardEditorStore } from "@/lib/business-card/store";
import { createTextElement } from "@/lib/business-card/element-factory";
import { EMOJI_CATEGORIES } from "@/lib/business-card/emoji-library";

export function ElementsTools({ onInserted }: { onInserted?: () => void }) {
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const addElement = useCardEditorStore((s) => s.addElement);
  const elements = useCardEditorStore((s) => (s.activeSide === "front" ? s.design.front.elements : s.design.back.elements));

  function insertEmoji(char: string) {
    addElement(activeSide, createTextElement({ text: char, fontSizePt: 28, width: 0.5, height: 0.4, align: "center" }, elements));
    onInserted?.();
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-kc-muted">Emoji</div>
      <Accordion className="space-y-1.5">
        {EMOJI_CATEGORIES.map((cat) => (
          <AccordionItem key={cat.key} value={cat.key} className="rounded-lg border border-kc-border px-2">
            <AccordionTrigger className="py-2.5 text-sm font-medium text-kc-dark hover:no-underline">{cat.label}</AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="grid grid-cols-5 gap-1.5">
                {cat.emoji.map((char) => (
                  <button
                    key={char}
                    onClick={() => insertEmoji(char)}
                    className="flex h-11 items-center justify-center rounded-md border border-kc-border text-xl hover:border-kc-teal/40 hover:bg-kc-bg active:scale-95 transition-transform"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
