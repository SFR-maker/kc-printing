"use client";

import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * The one control every product uses to pick a print option.
 *
 * Two things it exists to fix. The first is consistency: size, paper, shape, film, sides and
 * quantity were each built per product, so a customer who learned business cards met five different
 * controls doing the same job. The second is that all of them were dropdowns - including the ones
 * with two choices, where a dropdown costs a click, a scan and a second click to answer a question
 * that fits on screen.
 *
 * So the shape of the control follows the number of choices rather than the developer's habit:
 * a handful renders as cards you click once, a long list still renders as a select. A card grid of
 * 41 quantity breaks would be worse than the dropdown it replaced, which is why this is a threshold
 * and not a blanket rule.
 */

export interface Option {
  value: string;
  label: string;
  /** Second line: the dimension, the weight, the finish - whatever makes the choice concrete. */
  sublabel?: string;
  /** Right-aligned note, for a price delta or a "most popular" flag. */
  badge?: string;
  disabled?: boolean;
  /** Why it is disabled. Shown in place of the sublabel, so a greyed card explains itself. */
  disabledReason?: string;
}

export interface OptionGroupProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  /** Sits under the control, for the caveat that would otherwise live in a tooltip nobody opens. */
  hint?: string;
  /**
   * Above this many options the control falls back to a select.
   *
   * Six is where a card grid stops being scannable at two columns on a phone. Raise it for options
   * whose cards are small (an orientation pair), never for a list that can grow unbounded.
   */
  maxCards?: number;
  /** Columns at the sm breakpoint and up. Cards are always single-column on the narrowest screens. */
  columns?: 2 | 3 | 4;
  /** Renders the group disabled as a whole, e.g. while a dependent price is loading. */
  disabled?: boolean;
}

export function OptionGroup({
  label,
  options,
  value,
  onChange,
  hint,
  maxCards = 6,
  columns = 2,
  disabled = false,
}: OptionGroupProps) {
  const selected = options.find((o) => o.value === value);

  // A long list stays a select. See maxCards.
  if (options.length > maxCards) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-kc-muted">{label}</Label>
        <Select value={value} onValueChange={(v) => v && onChange(v)} disabled={disabled}>
          <SelectTrigger aria-label={label} className="h-11 border-kc-border bg-white">
            <SelectValue placeholder={`Choose ${label.toLowerCase()}`}>
              {selected ? selected.label : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
                {o.sublabel ? `${o.label} — ${o.sublabel}` : o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hint && <p className="text-xs leading-snug text-kc-muted">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/*
        A real radiogroup rather than a div of buttons. Screen readers announce "2 of 4" and arrow
        keys move between choices, which a set of independent buttons does not give you - and a
        visual selection control that only works with a mouse is not a selection control.
      */}
      <div
        role="radiogroup"
        aria-label={label}
        aria-disabled={disabled || undefined}
        className="space-y-2"
      >
        {/*
          A div, not a <label>. A label has to point at a form control, and a radiogroup is not one -
          the group is already named for assistive tech by its aria-label, and a dangling <label>
          would announce nothing while claiming to.
        */}
        <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">{label}</div>

        <div
          className={cn(
            "grid grid-cols-1 gap-2",
            columns === 2 && "sm:grid-cols-2",
            columns === 3 && "sm:grid-cols-3",
            columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {options.map((o) => {
            const isSelected = o.value === value;
            const isDisabled = disabled || !!o.disabled;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                // Only the selected card is in the tab order; arrow keys move within the group.
                // This is the roving-tabindex pattern a radiogroup is expected to implement.
                tabIndex={isSelected ? 0 : -1}
                disabled={isDisabled}
                onClick={() => !isDisabled && onChange(o.value)}
                data-option-value={o.value}
                onKeyDown={(e) => handleArrowKeys(e, options, value, onChange)}
                className={cn(
                  "group relative flex flex-col items-start gap-0.5 rounded-xl border-2 px-3.5 py-3 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kc-teal focus-visible:ring-offset-1",
                  isSelected
                    // Teal carries selection everywhere on the site. Coral is reserved for the one
                    // button that takes money, so a selected option never competes with the CTA.
                    ? "border-kc-teal bg-kc-teal/[0.06] shadow-[0_1px_0_0_rgba(0,153,216,0.25)]"
                    : "border-kc-border bg-white hover:border-kc-teal/45 hover:bg-kc-teal/[0.02]",
                  isDisabled && "cursor-not-allowed opacity-45 hover:border-kc-border hover:bg-white",
                  !isDisabled && "hover:-translate-y-px",
                )}
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "text-[15px] font-semibold leading-snug",
                      isSelected ? "text-kc-dark" : "text-kc-dark/85",
                    )}
                  >
                    {o.label}
                  </span>
                  {o.badge && !isSelected && (
                    <span className="shrink-0 font-mono text-[12.5px] text-kc-muted">{o.badge}</span>
                  )}
                </span>

                {(o.disabled && o.disabledReason ? o.disabledReason : o.sublabel) && (
                  <span className="text-[13px] leading-snug text-kc-muted">
                    {o.disabled && o.disabledReason ? o.disabledReason : o.sublabel}
                  </span>
                )}

                {/* The tick replaces the badge rather than crowding in beside it. */}
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-kc-teal text-white"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {hint && <p className="text-xs leading-snug text-kc-muted">{hint}</p>}
    </div>
  );
}

/**
 * Arrow-key movement within the group, skipping anything unavailable.
 *
 * Wraps at both ends, which is what a radiogroup is expected to do, and selects on move rather than
 * on a second keypress - the behaviour native radios have.
 *
 * Focus has to be moved by hand as well as the value changed. Under a roving tabindex the card that
 * was focused becomes tabIndex -1 the moment selection moves off it, so without this the browser
 * drops focus to the body and the next arrow press goes nowhere.
 */
function handleArrowKeys(
  e: React.KeyboardEvent<HTMLButtonElement>,
  options: Option[],
  value: string,
  onChange: (v: string) => void,
) {
  const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
  const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
  if (!forward && !back) return;

  const usable = options.filter((o) => !o.disabled);
  if (usable.length < 2) return;
  e.preventDefault();

  const at = usable.findIndex((o) => o.value === value);
  const next = forward
    ? usable[(at + 1 + usable.length) % usable.length]
    : usable[(at - 1 + usable.length) % usable.length];

  onChange(next.value);

  const group = e.currentTarget.closest('[role="radiogroup"]');
  const target = group?.querySelector<HTMLButtonElement>(`[data-option-value="${CSS.escape(next.value)}"]`);
  target?.focus();
}
