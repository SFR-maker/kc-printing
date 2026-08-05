"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDollars } from "@/lib/utils";
import {
  POSTCARD_PAPERS, POSTCARD_SIZES,
  availableColors, availableQuantities, calculatePostcardPrice, isComboAvailable,
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
  quantity: 100,
};

/**
 * Size, paper, print sides and quantity for a postcard.
 *
 * The supplier's catalogue is ragged - a grayscale back exists on only three of the twelve stocks,
 * and heavier stocks start at higher quantities - so every dropdown is filtered by what is actually
 * printable rather than showing a tidy grid the order would fail on after payment. Changing a
 * selection that invalidates the others snaps them to something available instead of leaving the
 * form in a state that cannot be priced.
 */
export function PostcardPrintSpec({
  spec,
  onChange,
}: {
  spec: PostcardSpec;
  onChange: (next: PostcardSpec) => void;
}) {
  const price = calculatePostcardPrice(spec);
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
    if (qtys.length && !qtys.includes(next.quantity)) {
      // Nearest available rather than the minimum, so a customer who wanted 1,000 does not silently
      // drop to 25 because they changed the paper.
      next.quantity = qtys.reduce((a, b) => (Math.abs(b - next.quantity) < Math.abs(a - next.quantity) ? b : a), qtys[0]);
    }
    onChange(next);
  }

  return (
    <div className="rounded-xl border-2 border-kc-coral/40 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Size</Label>
          <Select value={spec.size} onValueChange={(v) => v && set("size", v)}>
            <SelectTrigger className="border-kc-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSTCARD_SIZES.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Paper Stock</Label>
          <Select value={spec.paper} onValueChange={(v) => v && set("paper", v)}>
            <SelectTrigger className="border-kc-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSTCARD_PAPERS.filter((p) => isComboAvailable(spec.size, p.label, availableColors(spec.size, p.label)[0] ?? "")).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Printed Sides</Label>
          <Select value={spec.color} onValueChange={(v) => v && set("color", v)}>
            <SelectTrigger className="border-kc-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {colors.length === 1 && (
            <p className="mt-2 text-xs text-kc-muted">This stock only prints one way.</p>
          )}
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Quantity</Label>
          <Select value={String(spec.quantity)} onValueChange={(v) => v && set("quantity", Number(v))}>
            <SelectTrigger className="border-kc-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {quantities.map((q) => (
                <SelectItem key={q} value={String(q)}>{q.toLocaleString("en-US")} postcards</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-kc-border pt-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Print total</div>
          <div className="text-sm text-kc-muted">
            {spec.quantity.toLocaleString("en-US")} postcards, {spec.size}
          </div>
        </div>
        {price.valid ? (
          <div className="text-3xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
        ) : (
          <p className="max-w-xs text-right text-sm text-amber-600">{price.error}</p>
        )}
      </div>
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
