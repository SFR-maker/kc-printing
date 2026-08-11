"use client";

import { formatDollars } from "@/lib/utils";
import { OptionGroup, type Option } from "@/components/builder/OptionGroup";
import {
  BC_SIZES,
  BC_PAPERS,
  BC_COLORS,
  calculateBusinessCardPrice,
  availableQuantities,
  isComboAvailable,
  type BcPriceBreakdown,
} from "@/lib/pricing/business-cards";
import { DEFAULT_PRICING, type PricingSettings } from "@/lib/pricing/settings";

export interface BusinessCardSpec {
  sizeId: number;
  paperId: number;
  colorId: number;
  quantity: number;
  rush: boolean;
  roundCorners: boolean;
  manualProof: boolean;
}

const RUSH_MAX_QUANTITY = 2500;

// European Standard sizes (339/340) are excluded from the picker — 611 Printing only sells to a
// U.S. customer base and the extra options were just adding noise.
const DISPLAYED_BC_SIZES = BC_SIZES.filter((s) => s.id !== 339 && s.id !== 340);

const HORIZONTAL = 1;
const VERTICAL = 2;

function formatQuantity(q: number): string {
  return q.toLocaleString("en-US");
}

/**
 * Splits a supplier size label into the dimension and whatever it is called.
 *
 * The catalogue ships one row per size *and* orientation - `2" x 3.5" Horizontal U.S. Standard` and
 * `2" x 3.5" Vertical U.S. Standard` are separate ids - so a single control listed eight options
 * that were really four shapes and a rotation. Splitting them halves the list and turns orientation
 * into the one-click choice it should always have been.
 */
function parseSizeLabel(label: string): { dimension: string; note: string } {
  const m = label.match(/^(.*?)\s+(Horizontal|Vertical)\s*(.*)$/i);
  if (!m) return { dimension: label, note: "" };
  return { dimension: m[1].trim(), note: m[3].trim() };
}

/** The distinct card shapes, in catalogue order, each with the ids of its two rotations. */
function sizeFamilies() {
  const families: { dimension: string; note: string; byOrientation: Record<number, number> }[] = [];
  for (const s of DISPLAYED_BC_SIZES) {
    const { dimension, note } = parseSizeLabel(s.label);
    let family = families.find((f) => f.dimension === dimension);
    if (!family) {
      family = { dimension, note, byOrientation: {} };
      families.push(family);
    }
    family.byOrientation[s.orientation] = s.id;
  }
  return families;
}

const FAMILIES = sizeFamilies();

export function BusinessCardPrintSpec({
  spec,
  onChange,
  pricing = DEFAULT_PRICING,
}: {
  spec: BusinessCardSpec;
  onChange: (next: BusinessCardSpec) => void;
  /** Margin and flat fees from /admin/pricing, so the quote reflects what the owner has set. */
  pricing?: PricingSettings;
}) {
  const comboOk = isComboAvailable(spec.sizeId, spec.paperId, spec.colorId);
  const quantities = comboOk ? availableQuantities(spec.sizeId, spec.paperId, spec.colorId) : [];
  const price: BcPriceBreakdown = calculateBusinessCardPrice(spec, pricing);

  const current = DISPLAYED_BC_SIZES.find((s) => s.id === spec.sizeId) ?? DISPLAYED_BC_SIZES[0];
  const currentFamily = FAMILIES.find((f) => Object.values(f.byOrientation).includes(spec.sizeId)) ?? FAMILIES[0];

  function set<K extends keyof BusinessCardSpec>(key: K, value: BusinessCardSpec[K]) {
    const next = { ...spec, [key]: value };
    // If the new size/paper/colour combo doesn't offer the current quantity (or the combo itself
    // isn't sold), snap to the nearest thing that is, instead of silently showing an invalid price.
    if (key === "sizeId" || key === "paperId" || key === "colorId") {
      const nextQtys = isComboAvailable(next.sizeId, next.paperId, next.colorId)
        ? availableQuantities(next.sizeId, next.paperId, next.colorId)
        : [];
      /*
       * 0 is the picker's "not chosen yet" sentinel and has to survive this.
       *
       * Snapping to the nearest available quantity treated 0 as a real run length and answered the
       * question on the customer's behalf: picking a paper silently set the order to 50 cards, which
       * is the smallest run and almost never what someone wants. DEFAULT_BC_SPEC leaves quantity at
       * 0 precisely so nobody reaches checkout having accepted a number they never chose - the same
       * rule rigid signs and window decals already follow in their repair functions.
       */
      if (next.quantity !== 0 && nextQtys.length > 0 && !nextQtys.includes(next.quantity)) {
        next.quantity = nextQtys.reduce((closest, q) => (Math.abs(q - next.quantity) < Math.abs(closest - next.quantity) ? q : closest), nextQtys[0]);
      }
      if (!nextQtys.includes(RUSH_MAX_QUANTITY) && next.quantity > RUSH_MAX_QUANTITY) {
        next.rush = false;
      }
    }
    if (key === "quantity" && Number(value) > RUSH_MAX_QUANTITY) {
      next.rush = false;
    }
    onChange(next);
  }

  /** Keeps the chosen shape and changes only the rotation, or vice versa. */
  function setSize(dimension: string, orientation: number) {
    const family = FAMILIES.find((f) => f.dimension === dimension) ?? currentFamily;
    // Not every shape is necessarily made both ways; fall back to the one it does come in rather
    // than setting an id that does not exist.
    const id = family.byOrientation[orientation] ?? Object.values(family.byOrientation)[0];
    set("sizeId", id);
  }

  const sizeOptions: Option[] = FAMILIES.map((f) => ({
    value: f.dimension,
    label: f.dimension.replace(/"/g, "″").replace(" x ", " × "),
    sublabel: f.note || undefined,
    badge: f.note.includes("U.S. Standard") ? "Most popular" : undefined,
  }));

  const orientationOptions: Option[] = [
    { value: String(HORIZONTAL), label: "Horizontal", sublabel: "Landscape", disabled: !currentFamily.byOrientation[HORIZONTAL] },
    { value: String(VERTICAL), label: "Vertical", sublabel: "Portrait", disabled: !currentFamily.byOrientation[VERTICAL] },
  ];

  const sidesOptions: Option[] = BC_COLORS.map((c) => ({
    value: String(c.id),
    label: SIDES_LABEL[c.id] ?? c.label,
    sublabel: SIDES_NOTE[c.id],
    disabled: !isComboAvailable(spec.sizeId, spec.paperId, c.id),
    disabledReason: "Not made on this paper",
  }));

  const paperOptions: Option[] = BC_PAPERS.map((p) => ({
    value: String(p.id),
    label: p.label,
    disabled: !isComboAvailable(spec.sizeId, p.id, spec.colorId),
    disabledReason: "Not made with these sides",
  }));

  const quantityOptions: Option[] = quantities.map((q) => ({
    value: String(q),
    label: `${formatQuantity(q)} cards`,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <OptionGroup
          label="Size"
          options={sizeOptions}
          value={currentFamily.dimension}
          onChange={(v) => setSize(v, current.orientation)}
          columns={2}
        />
        <OptionGroup
          label="Orientation"
          options={orientationOptions}
          value={String(current.orientation)}
          onChange={(v) => setSize(currentFamily.dimension, Number(v))}
          columns={2}
        />
      </div>

      <OptionGroup
        label="Sides"
        options={sidesOptions}
        value={String(spec.colorId)}
        onChange={(v) => set("colorId", Number(v))}
        columns={3}
        hint={comboOk ? undefined : "This paper doesn't support that side option. Pick a different paper or sides."}
      />

      {/* Twelve papers is not "a few", so this stays a select - a twelve-card grid would be worse
          than the dropdown it replaced. See OptionGroup's maxCards. */}
      <OptionGroup
        label="Paper stock"
        options={paperOptions}
        value={String(spec.paperId)}
        onChange={(v) => set("paperId", Number(v))}
      />

      <OptionGroup
        label="Quantity"
        options={quantityOptions}
        value={spec.quantity ? String(spec.quantity) : ""}
        onChange={(v) => set("quantity", Number(v))}
        hint={quantities.length === 0 ? "Choose a paper and sides combination that is available." : undefined}
      />

      {/*
        Add-ons stay checkboxes rather than becoming cards: they are independent yes/no extras, and a
        card grid would imply picking one of them. The running total lives in the order summary, so
        only the per-add-on deltas are shown here.
      */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kc-muted">Optional add-ons</p>
        <div className="divide-y divide-kc-border overflow-hidden rounded-xl border border-kc-border">
          <AddOn
            checked={spec.rush}
            onToggle={() => set("rush", !spec.rush)}
            disabled={spec.quantity > RUSH_MAX_QUANTITY}
            title="Rush turnaround"
            note={spec.quantity > RUSH_MAX_QUANTITY ? `Only available up to ${formatQuantity(RUSH_MAX_QUANTITY)} cards.` : "Faster production."}
            delta={price.valid && spec.rush ? price.rushSurcharge : null}
          />
          <AddOn
            checked={spec.roundCorners}
            onToggle={() => set("roundCorners", !spec.roundCorners)}
            title="Round corners"
            note="A softer, more premium edge."
            delta={price.valid && spec.roundCorners ? price.roundCornersPrice : null}
          />
          <AddOn
            checked={spec.manualProof}
            onToggle={() => set("manualProof", !spec.manualProof)}
            title="Manual proof review"
            note="A person checks your file before print (24 hrs). Instant automated proofing is free and used by default."
            delta={spec.manualProof ? price.proofPrice : null}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Plainer wording than the supplier's, which says "Full Color Front, No Back".
 *
 * Exported because the order summary has to say the same thing the picker does. It was reading
 * BC_COLORS directly, so a card labelled "Front only" appeared in the summary as "Full Color Front,
 * No Back" - two names for one choice, on screen at the same time.
 */
export const SIDES_LABEL: Record<number, string> = {
  1: "Front only",
  2: "Front + grey back",
  3: "Both sides",
};

const SIDES_NOTE: Record<number, string> = {
  1: "Nothing on the reverse",
  2: "Full colour front, greyscale back",
  3: "Full colour both faces",
};

function AddOn({
  checked, onToggle, disabled, title, note, delta,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  title: string;
  note: string;
  delta: number | null;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 p-3.5 transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-kc-teal/[0.03]"
      }`}
    >
      <span className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-kc-teal"
        />
        <span>
          <span className="block text-[14.5px] font-medium text-kc-dark">{title}</span>
          <span className="block text-[12.5px] leading-snug text-kc-muted">{note}</span>
        </span>
      </span>
      {delta !== null && delta > 0 && (
        <span className="shrink-0 font-mono text-[12.5px] text-kc-muted">+{formatDollars(delta)}</span>
      )}
    </label>
  );
}
