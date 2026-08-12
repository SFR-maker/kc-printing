"use client";

import { OptionGroup, type Option } from "@/components/builder/OptionGroup";
import {
  POSTCARD_PAPERS, POSTCARD_SIZES,
  availableColors, availableQuantities, isComboAvailable,
} from "@/lib/pricing/postcards";

export interface PostcardSpec {
  size: string;
  paper: string;
  color: string;
  quantity: number;
}

export const DEFAULT_POSTCARD_SPEC: PostcardSpec = {
  size: '4" x 6" (Standard)',
  paper: "14 pt. Gloss",
  color: "Full Color Front, No Back",
  // 0 means not chosen: quantity is a required choice, not a default run length.
  quantity: 0,
};

/** Plainer wording than the supplier's, matching what business cards call the same three choices. */
const SIDES_LABEL: Record<string, string> = {
  "Full Color Front, No Back": "Front only",
  "Full Color Front, Grayscale Back": "Front + grey back",
  "Full Color Both Sides": "Both sides",
};

const SIDES_NOTE: Record<string, string> = {
  "Full Color Front, No Back": "Nothing on the reverse",
  "Full Color Front, Grayscale Back": "Full colour front, greyscale back",
  "Full Color Both Sides": "Full colour both faces",
};

/**
 * Size, paper, print sides and quantity for a postcard.
 *
 * The supplier's catalogue is ragged - a grayscale back exists on only three of the twelve stocks,
 * and heavier stocks start at higher quantities - so every control is filtered by what is actually
 * printable rather than showing a tidy grid the order would fail on after payment. Changing a
 * selection that invalidates the others snaps them to something available instead of leaving the
 * form in a state that cannot be priced.
 *
 * The running total is not here. It lives in the order summary, which stays on screen while these
 * are being changed - see OrderSummaryPanel.
 */
export function PostcardPrintSpec({
  spec,
  onChange,
}: {
  spec: PostcardSpec;
  onChange: (next: PostcardSpec) => void;
}) {
  const colors = availableColors(spec.size, spec.paper);
  const quantities = availableQuantities(spec.size, spec.paper, spec.color);

  /**
   * Applies a change and repairs anything it invalidates.
   *
   * Switching from gloss to Trifecta removes the grayscale-back option and raises the minimum
   * quantity; without repair the form would sit on a combination the supplier will not print.
   */
  function set<K extends keyof PostcardSpec>(key: K, value: PostcardSpec[K]) {
    const next = { ...spec, [key]: value };

    if (key === "size" || key === "paper") {
      const ok = availableColors(next.size, next.paper);
      if (ok.length && !ok.includes(next.color)) next.color = ok[0];
    }
    const qtys = availableQuantities(next.size, next.paper, next.color);
    // 0 is "not chosen" and must survive repair, or changing the paper would silently pick a run
    // length for the customer - the same rule business cards, rigid signs and decals all follow.
    if (next.quantity !== 0 && qtys.length && !qtys.includes(next.quantity)) {
      // Nearest available rather than the minimum, so a customer who wanted 1,000 does not silently
      // drop to 25 because they changed the paper.
      next.quantity = qtys.reduce((a, b) => (Math.abs(b - next.quantity) < Math.abs(a - next.quantity) ? b : a), qtys[0]);
    }
    onChange(next);
  }

  const sizeOptions: Option[] = POSTCARD_SIZES.map((s) => ({ value: s.id, label: s.label }));

  const paperOptions: Option[] = POSTCARD_PAPERS
    .filter((p) => isComboAvailable(spec.size, p.label, availableColors(spec.size, p.label)[0] ?? ""))
    .map((p) => ({ value: p.id, label: p.label }));

  const sidesOptions: Option[] = colors.map((c) => ({
    value: c,
    label: SIDES_LABEL[c] ?? c,
    sublabel: SIDES_NOTE[c],
  }));

  const quantityOptions: Option[] = quantities.map((q) => ({
    value: String(q),
    label: `${q.toLocaleString("en-US")} postcards`,
  }));

  return (
    <div className="space-y-5">
      <OptionGroup
        label="Size"
        options={sizeOptions}
        value={spec.size}
        onChange={(v) => set("size", v)}
        columns={2}
      />

      <OptionGroup
        label="Sides"
        options={sidesOptions}
        value={spec.color}
        onChange={(v) => set("color", v)}
        columns={3}
        hint={colors.length === 1 ? "This stock only prints one way." : undefined}
      />

      <OptionGroup
        label="Paper stock"
        options={paperOptions}
        value={spec.paper}
        onChange={(v) => set("paper", v)}
      />

      <OptionGroup
        label="Quantity"
        options={quantityOptions}
        value={spec.quantity ? String(spec.quantity) : ""}
        onChange={(v) => set("quantity", Number(v))}
        hint={quantities.length === 0 ? "Choose a size and paper combination that is available." : undefined}
      />
    </div>
  );
}

/** Postcards print a back on two of the three options, exactly as business cards do. */
export function postcardNeedsBack(color: string): boolean {
  return /Grayscale Back|Both Sides/i.test(color);
}

/** Names the second upload so the right kind of file gets supplied. */
export function postcardBackLabel(color: string): string {
  return /Grayscale/i.test(color) ? "Back (grayscale)" : "Back (full colour)";
}
