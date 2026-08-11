import { create } from "zustand";
import type { CardDesign, CardElement, CardSide } from "./schema";
import { blankCardDesign } from "./schema";
import { recolorSide } from "./recolor";
import type { DesignProduct } from "./print-spec";

export type SideKey = "front" | "back";
export type AlignMode = "left" | "centerH" | "right" | "top" | "centerV" | "bottom";
export type DistributeAxis = "horizontal" | "vertical";

interface HistoryEntry {
  front: CardSide;
  back: CardSide;
}

const MAX_HISTORY = 60;

interface EditorState {
  design: CardDesign;
  activeSide: SideKey;
  selectedIds: string[];
  clipboard: CardElement[];
  past: HistoryEntry[];
  future: HistoryEntry[];
  zoom: number;
  /** Incremented by requestFit; the canvas re-fits when it changes. */
  fitRequest: number;
  /**
   * Set by requestEditText; the canvas opens the text editor for this element when it changes.
   *
   * Carries a counter as well as the id so that asking to edit the same element twice in a row is
   * still two distinct requests.
   */
  editTextRequest: { id: string; n: number } | null;
  showGuides: boolean;
  showGrid: boolean;
  dirty: boolean;
  designId: string | null;
  /** Which product this editing session is for — set once when the editor mounts and read by
   * anything that needs to call a product-scoped API (the template switcher, mainly), so it
   * doesn't have to be threaded as a prop through every intermediate panel/sheet component. */
  product: DesignProduct;
  /** The 3-color palette the current template was authored with, if any — tracked separately from
   * the design content so color-variant swatches know which exact hex values to remap from, and is
   * updated to the new palette after each swap so repeated variant clicks keep working correctly. */
  activePalette: string[] | null;

  loadDesign: (design: CardDesign, designId?: string | null, palette?: string[] | null, product?: DesignProduct) => void;
  applyColorVariant: (newPalette: string[]) => void;
  setActiveSide: (side: SideKey) => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;

  addElement: (side: SideKey, element: CardElement, select?: boolean) => void;
  updateElement: (side: SideKey, id: string, patch: Partial<CardElement>) => void;
  updateElements: (side: SideKey, patches: { id: string; patch: Partial<CardElement> }[]) => void;
  alignSelected: (mode: AlignMode) => void;
  distributeSelected: (axis: DistributeAxis) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  reorderSelected: (direction: "front" | "back" | "forward" | "backward") => void;
  setBackground: (side: SideKey, background: CardSide["background"]) => void;
  toggleLockSelected: () => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setZoom: (zoom: number) => void;
  /** Asks the canvas to re-fit. Only it knows the space available, so this cannot be a zoom value. */
  requestFit: () => void;
  requestEditText: (id: string) => void;
  toggleGuides: () => void;
  toggleGrid: () => void;
  resetToTemplate: (front: CardSide, back: CardSide, palette?: string[] | null) => void;
  /**
   * Empties the back face, keeping its geometry.
   *
   * Undoable like any other edit, which is what makes it safe to offer: a customer who removes the
   * back and changes their mind gets it back with Ctrl+Z rather than having to rebuild it. The side
   * itself is never deleted - the schema always has two faces, and a back that exists but is empty
   * is exactly what "front only" means at print time.
   */
  clearBack: () => void;
  markSaved: () => void;
}

function snapshot(design: CardDesign): HistoryEntry {
  return { front: structuredClone(design.front), back: structuredClone(design.back) };
}

function sideOf(design: CardDesign, side: SideKey): CardSide {
  return side === "front" ? design.front : design.back;
}

export const useCardEditorStore = create<EditorState>((set, get) => ({
  design: blankCardDesign(),
  activeSide: "front",
  selectedIds: [],
  clipboard: [],
  past: [],
  future: [],
  zoom: 1,
  fitRequest: 0,
  editTextRequest: null,
  showGuides: true,
  showGrid: false,
  dirty: false,
  designId: null,
  product: "business-card",
  activePalette: null,

  loadDesign: (design, designId = null, palette = null, product = "business-card") =>
    set({ design, designId, product, activePalette: palette, past: [], future: [], selectedIds: [], dirty: false, activeSide: "front" }),

  applyColorVariant: (newPalette) => {
    const s = get();
    const from = s.activePalette;
    if (!from) return;
    const history = snapshot(s.design);
    set({
      design: { ...s.design, front: recolorSide(s.design.front, from, newPalette), back: recolorSide(s.design.back, from, newPalette) },
      activePalette: newPalette,
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  setActiveSide: (side) => set({ activeSide: side, selectedIds: [] }),
  setSelected: (ids) => set({ selectedIds: ids }),
  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),

  addElement: (side, element, select = true) => {
    const s = get();
    const history = snapshot(s.design);
    const currentSide = sideOf(s.design, side);
    const nextSide: CardSide = { ...currentSide, elements: [...currentSide.elements, element] };
    set({
      design: { ...s.design, [side]: nextSide },
      selectedIds: select ? [element.id] : s.selectedIds,
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  updateElement: (side, id, patch) => {
    const s = get();
    const history = snapshot(s.design);
    const currentSide = sideOf(s.design, side);
    const nextElements = currentSide.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as CardElement) : el));
    set({
      design: { ...s.design, [side]: { ...currentSide, elements: nextElements } },
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  updateElements: (side, patches) => {
    const s = get();
    if (patches.length === 0) return;
    const history = snapshot(s.design);
    const currentSide = sideOf(s.design, side);
    const byId = new Map(patches.map((p) => [p.id, p.patch]));
    const nextElements = currentSide.elements.map((el) => (byId.has(el.id) ? ({ ...el, ...byId.get(el.id) } as CardElement) : el));
    set({
      design: { ...s.design, [side]: { ...currentSide, elements: nextElements } },
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  alignSelected: (mode) => {
    const s = get();
    if (s.selectedIds.length === 0) return;
    const currentSide = sideOf(s.design, s.activeSide);
    const selected = currentSide.elements.filter((el) => s.selectedIds.includes(el.id) && !el.locked);
    if (selected.length === 0) return;

    // One element: align to the card. Two or more: align to the selection's own bounding box —
    // the standard behavior in design tools, since "align to card" would just stack everything
    // in one spot.
    const bounds =
      selected.length === 1
        ? { left: 0, top: 0, right: currentSide.physicalWidthIn, bottom: currentSide.physicalHeightIn }
        : selected.reduce(
            (acc, el) => ({
              left: Math.min(acc.left, el.x),
              top: Math.min(acc.top, el.y),
              right: Math.max(acc.right, el.x + el.width),
              bottom: Math.max(acc.bottom, el.y + el.height),
            }),
            { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
          );

    const patches = selected.map((el) => {
      let x = el.x;
      let y = el.y;
      switch (mode) {
        case "left": x = bounds.left; break;
        case "centerH": x = bounds.left + (bounds.right - bounds.left - el.width) / 2; break;
        case "right": x = bounds.right - el.width; break;
        case "top": y = bounds.top; break;
        case "centerV": y = bounds.top + (bounds.bottom - bounds.top - el.height) / 2; break;
        case "bottom": y = bounds.bottom - el.height; break;
      }
      return { id: el.id, patch: { x, y } };
    });

    get().updateElements(s.activeSide, patches);
  },

  distributeSelected: (axis) => {
    const s = get();
    const currentSide = sideOf(s.design, s.activeSide);
    const selected = currentSide.elements.filter((el) => s.selectedIds.includes(el.id) && !el.locked);
    if (selected.length < 3) return;

    if (axis === "horizontal") {
      const sorted = [...selected].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpan = last.x + last.width - first.x;
      const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const gap = (totalSpan - totalWidth) / (sorted.length - 1);
      let cursor = first.x;
      const patches = sorted.map((el) => {
        const patch = { id: el.id, patch: { x: cursor } };
        cursor += el.width + gap;
        return patch;
      });
      get().updateElements(s.activeSide, patches);
    } else {
      const sorted = [...selected].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpan = last.y + last.height - first.y;
      const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const gap = (totalSpan - totalHeight) / (sorted.length - 1);
      let cursor = first.y;
      const patches = sorted.map((el) => {
        const patch = { id: el.id, patch: { y: cursor } };
        cursor += el.height + gap;
        return patch;
      });
      get().updateElements(s.activeSide, patches);
    }
  },

  removeSelected: () => {
    const s = get();
    if (s.selectedIds.length === 0) return;
    const history = snapshot(s.design);
    const currentSide = sideOf(s.design, s.activeSide);
    const nextSide: CardSide = { ...currentSide, elements: currentSide.elements.filter((el) => !s.selectedIds.includes(el.id)) };
    set({
      design: { ...s.design, [s.activeSide]: nextSide },
      selectedIds: [],
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  duplicateSelected: () => {
    const s = get();
    if (s.selectedIds.length === 0) return;
    const history = snapshot(s.design);
    const currentSide = sideOf(s.design, s.activeSide);
    const toDup = currentSide.elements.filter((el) => s.selectedIds.includes(el.id));
    const clones = toDup.map((el) => ({ ...el, id: `${el.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, x: el.x + 0.12, y: el.y + 0.12 }));
    const nextSide: CardSide = { ...currentSide, elements: [...currentSide.elements, ...clones] };
    set({
      design: { ...s.design, [s.activeSide]: nextSide },
      selectedIds: clones.map((c) => c.id),
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  copySelected: () => {
    const s = get();
    const currentSide = sideOf(s.design, s.activeSide);
    const toCopy = currentSide.elements.filter((el) => s.selectedIds.includes(el.id));
    if (toCopy.length > 0) set({ clipboard: structuredClone(toCopy) });
  },

  pasteClipboard: () => {
    const s = get();
    if (s.clipboard.length === 0) return;
    const history = snapshot(s.design);
    const currentSide = sideOf(s.design, s.activeSide);
    const pasted = s.clipboard.map((el) => ({ ...el, id: `${el.id}-paste-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, x: el.x + 0.15, y: el.y + 0.15 }));
    const nextSide: CardSide = { ...currentSide, elements: [...currentSide.elements, ...pasted] };
    set({
      design: { ...s.design, [s.activeSide]: nextSide },
      selectedIds: pasted.map((p) => p.id),
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  reorderSelected: (direction) => {
    const s = get();
    if (s.selectedIds.length === 0) return;
    const history = snapshot(s.design);
    const currentSide = sideOf(s.design, s.activeSide);
    const maxZ = Math.max(0, ...currentSide.elements.map((e) => e.zIndex));
    const minZ = Math.min(0, ...currentSide.elements.map((e) => e.zIndex));
    const nextElements = currentSide.elements.map((el) => {
      if (!s.selectedIds.includes(el.id)) return el;
      if (direction === "front") return { ...el, zIndex: maxZ + 1 };
      if (direction === "back") return { ...el, zIndex: minZ - 1 };
      if (direction === "forward") return { ...el, zIndex: el.zIndex + 1 };
      return { ...el, zIndex: el.zIndex - 1 };
    });
    set({
      design: { ...s.design, [s.activeSide]: { ...currentSide, elements: nextElements } },
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  setBackground: (side, background) => {
    const s = get();
    const history = snapshot(s.design);
    const currentSide = sideOf(s.design, side);
    set({
      design: { ...s.design, [side]: { ...currentSide, background } },
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  toggleLockSelected: () => {
    const s = get();
    if (s.selectedIds.length === 0) return;
    const currentSide = sideOf(s.design, s.activeSide);
    const anyUnlocked = currentSide.elements.some((el) => s.selectedIds.includes(el.id) && !el.locked);
    const nextElements = currentSide.elements.map((el) => (s.selectedIds.includes(el.id) ? { ...el, locked: anyUnlocked } : el));
    set({ design: { ...s.design, [s.activeSide]: { ...currentSide, elements: nextElements } }, dirty: true });
  },

  undo: () => {
    const s = get();
    if (s.past.length === 0) return;
    const previous = s.past[s.past.length - 1];
    const currentSnapshot = snapshot(s.design);
    set({
      design: { ...s.design, front: previous.front, back: previous.back },
      past: s.past.slice(0, -1),
      future: [currentSnapshot, ...s.future].slice(0, MAX_HISTORY),
      selectedIds: [],
      dirty: true,
    });
  },

  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const next = s.future[0];
    const currentSnapshot = snapshot(s.design);
    set({
      design: { ...s.design, front: next.front, back: next.back },
      past: [...s.past, currentSnapshot].slice(-MAX_HISTORY),
      future: s.future.slice(1),
      selectedIds: [],
      dirty: true,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  // Floor matches card-canvas.tsx's auto-fit floor (not a higher "always readable" value) — a
  // 33x81in roll-up banner genuinely needs single-digit zoom to fit on screen, and this is the
  // one place that clamp is actually enforced (auto-fit calls this same action).
  /**
   * Clamped wide enough for the largest thing sold.
   *
   * The floor was 0.03, which is bigger than a banner needs: a 4 x 12ft banner is 28,800px at
   * PX_PER_IN, and fitting that on a 374px phone takes 0.013. The floor overrode the fit, so the
   * canvas rendered 864px wide on a 374px screen and was simply cut off - and because the same
   * clamp applies to the buttons, zooming out could not recover it either. 0.005 covers a 6 x 20ft
   * banner with room to spare.
   */
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.005, zoom)) }),
  requestFit: () => set((s) => ({ fitRequest: s.fitRequest + 1 })),
  requestEditText: (id) => set((s) => ({ editTextRequest: { id, n: (s.editTextRequest?.n ?? 0) + 1 } })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  clearBack: () => {
    const s = get();
    const history = snapshot(s.design);
    set({
      design: {
        ...s.design,
        back: { ...s.design.back, elements: [], background: { type: "solid", color: "#FFFFFF", gradient: null } },
      },
      // Leaving the customer looking at a face they just emptied reads as though the tool broke.
      activeSide: "front",
      selectedIds: [],
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },

  resetToTemplate: (front, back, palette = null) => {
    const s = get();
    const history = snapshot(s.design);
    set({
      design: { ...s.design, front: structuredClone(front), back: structuredClone(back) },
      activePalette: palette,
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      selectedIds: [],
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false }),
}));
