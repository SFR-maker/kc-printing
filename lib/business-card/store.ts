import { create } from "zustand";
import type { CardDesign, CardElement, CardSide } from "./schema";
import { blankCardDesign } from "./schema";

export type SideKey = "front" | "back";

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
  showGuides: boolean;
  showGrid: boolean;
  dirty: boolean;
  designId: string | null;

  loadDesign: (design: CardDesign, designId?: string | null) => void;
  setActiveSide: (side: SideKey) => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;

  addElement: (side: SideKey, element: CardElement, select?: boolean) => void;
  updateElement: (side: SideKey, id: string, patch: Partial<CardElement>) => void;
  updateElements: (side: SideKey, patches: { id: string; patch: Partial<CardElement> }[]) => void;
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
  toggleGuides: () => void;
  toggleGrid: () => void;
  resetToTemplate: (front: CardSide, back: CardSide) => void;
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
  showGuides: true,
  showGrid: false,
  dirty: false,
  designId: null,

  loadDesign: (design, designId = null) =>
    set({ design, designId, past: [], future: [], selectedIds: [], dirty: false, activeSide: "front" }),

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
    const currentSide = sideOf(s.design, side);
    const nextElements = currentSide.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as CardElement) : el));
    set({ design: { ...s.design, [side]: { ...currentSide, elements: nextElements } }, dirty: true });
  },

  updateElements: (side, patches) => {
    const s = get();
    const currentSide = sideOf(s.design, side);
    const byId = new Map(patches.map((p) => [p.id, p.patch]));
    const nextElements = currentSide.elements.map((el) => (byId.has(el.id) ? ({ ...el, ...byId.get(el.id) } as CardElement) : el));
    set({ design: { ...s.design, [side]: { ...currentSide, elements: nextElements } }, dirty: true });
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

  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.25, zoom)) }),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  resetToTemplate: (front, back) => {
    const s = get();
    const history = snapshot(s.design);
    set({
      design: { ...s.design, front: structuredClone(front), back: structuredClone(back) },
      past: [...s.past, history].slice(-MAX_HISTORY),
      future: [],
      selectedIds: [],
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false }),
}));
