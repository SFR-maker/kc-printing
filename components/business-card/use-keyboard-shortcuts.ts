"use client";

import { useEffect } from "react";
import { useCardEditorStore } from "@/lib/business-card/store";

const MOVE_STEP_IN = 0.02;
const MOVE_STEP_SHIFT_IN = 0.1;

/** Wires the required editor keyboard shortcuts to the store. Disabled while an HTML input/textarea (including inline text editing) has focus. */
export function useKeyboardShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      const store = useCardEditorStore.getState();
      const meta = e.metaKey || e.ctrlKey;

      if ((e.key === "Delete" || e.key === "Backspace") && store.selectedIds.length > 0) {
        e.preventDefault();
        store.removeSelected();
        return;
      }

      if (meta && e.key.toLowerCase() === "c") {
        e.preventDefault();
        store.copySelected();
        return;
      }
      if (meta && e.key.toLowerCase() === "v") {
        e.preventDefault();
        store.pasteClipboard();
        return;
      }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        store.duplicateSelected();
        return;
      }
      if (meta && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        store.undo();
        return;
      }
      if (meta && ((e.shiftKey && e.key.toLowerCase() === "z") || e.key.toLowerCase() === "y")) {
        e.preventDefault();
        store.redo();
        return;
      }
      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const side = store.activeSide === "front" ? store.design.front : store.design.back;
        store.setSelected(side.elements.filter((el) => !el.locked).map((el) => el.id));
        return;
      }
      if (e.key === "Escape") {
        store.clearSelection();
        return;
      }

      if (e.key.startsWith("Arrow") && store.selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? MOVE_STEP_SHIFT_IN : MOVE_STEP_IN;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const side = store.activeSide === "front" ? store.design.front : store.design.back;
        const patches = side.elements
          .filter((el) => store.selectedIds.includes(el.id) && !el.locked)
          .map((el) => ({ id: el.id, patch: { x: el.x + dx, y: el.y + dy } }));
        store.updateElements(store.activeSide, patches);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
