"use client";

import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from "lucide-react";
import { useCardEditorStore, type AlignMode } from "@/lib/business-card/store";

const ALIGN_BUTTONS: { mode: AlignMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: "left", label: "Align left", icon: AlignStartVertical },
  { mode: "centerH", label: "Align center horizontally", icon: AlignCenterVertical },
  { mode: "right", label: "Align right", icon: AlignEndVertical },
  { mode: "top", label: "Align top", icon: AlignStartHorizontal },
  { mode: "centerV", label: "Align center vertically", icon: AlignCenterHorizontal },
  { mode: "bottom", label: "Align bottom", icon: AlignEndHorizontal },
];

/** Align (1+ elements) and distribute (3+ elements) controls — shared between the quick toolbar
 * popover and the full properties panel so the behavior and labels stay identical everywhere. */
export function AlignTools({ compact = false }: { compact?: boolean }) {
  const selectedIds = useCardEditorStore((s) => s.selectedIds);
  const alignSelected = useCardEditorStore((s) => s.alignSelected);
  const distributeSelected = useCardEditorStore((s) => s.distributeSelected);

  const btnSize = compact ? "h-8 w-8" : "h-9 w-9";
  const iconSize = compact ? "h-4 w-4" : "h-4 w-4";

  return (
    <div className="space-y-2">
      <div>
        <div className="mb-1.5 text-[11px] font-medium text-kc-muted">
          {selectedIds.length > 1 ? "Align to selection" : "Align to card"}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {ALIGN_BUTTONS.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => alignSelected(mode)}
              className={`flex ${btnSize} items-center justify-center rounded-md border border-kc-border text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg`}
            >
              <Icon className={iconSize} />
            </button>
          ))}
        </div>
      </div>

      {selectedIds.length >= 3 && (
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-kc-muted">Distribute</div>
          <div className="grid grid-cols-6 gap-1">
            <button
              type="button"
              title="Distribute horizontally"
              aria-label="Distribute horizontally"
              onClick={() => distributeSelected("horizontal")}
              className={`flex ${btnSize} items-center justify-center rounded-md border border-kc-border text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg`}
            >
              <AlignHorizontalDistributeCenter className={iconSize} />
            </button>
            <button
              type="button"
              title="Distribute vertically"
              aria-label="Distribute vertically"
              onClick={() => distributeSelected("vertical")}
              className={`flex ${btnSize} items-center justify-center rounded-md border border-kc-border text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg`}
            >
              <AlignVerticalDistributeCenter className={iconSize} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
