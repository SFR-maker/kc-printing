import { describe, it, expect, beforeEach } from "vitest";
import { useCardEditorStore } from "@/lib/business-card/store";
import { blankCardDesign } from "@/lib/business-card/schema";
import type { TextElement } from "@/lib/business-card/schema";

function makeText(id: string): TextElement {
  return {
    id, type: "text", x: 0.3, y: 0.3, width: 1, height: 0.3, rotation: 0, zIndex: 0, opacity: 1,
    locked: false, visible: true, text: "Hello", fontFamily: "Inter", fontSizePt: 12, fontWeight: "400",
    italic: false, underline: false, textTransform: "none", align: "left", lineHeight: 1.2, letterSpacing: 0,
    color: "#111111", backgroundColor: null,
  };
}

beforeEach(() => {
  useCardEditorStore.setState({
    design: blankCardDesign(), activeSide: "front", selectedIds: [], clipboard: [],
    past: [], future: [], zoom: 1, showGuides: true, showGrid: false, dirty: false, designId: null,
  });
});

describe("card editor store", () => {
  it("adds an element and selects it", () => {
    const { addElement } = useCardEditorStore.getState();
    addElement("front", makeText("t1"));
    const state = useCardEditorStore.getState();
    expect(state.design.front.elements).toHaveLength(1);
    expect(state.selectedIds).toEqual(["t1"]);
    expect(state.dirty).toBe(true);
  });

  it("undoes an add and redoes it back", () => {
    const { addElement, undo, redo } = useCardEditorStore.getState();
    addElement("front", makeText("t1"));
    expect(useCardEditorStore.getState().design.front.elements).toHaveLength(1);

    undo();
    expect(useCardEditorStore.getState().design.front.elements).toHaveLength(0);
    expect(useCardEditorStore.getState().canRedo()).toBe(true);

    redo();
    expect(useCardEditorStore.getState().design.front.elements).toHaveLength(1);
  });

  it("clears redo history on a new action after undo", () => {
    const { addElement, undo } = useCardEditorStore.getState();
    addElement("front", makeText("t1"));
    undo();
    addElement("front", makeText("t2"));
    expect(useCardEditorStore.getState().canRedo()).toBe(false);
  });

  it("updates an element's properties", () => {
    const { addElement, updateElement } = useCardEditorStore.getState();
    addElement("front", makeText("t1"));
    updateElement("front", "t1", { text: "Updated" } as never);
    const el = useCardEditorStore.getState().design.front.elements[0] as TextElement;
    expect(el.text).toBe("Updated");
  });

  it("removes selected elements", () => {
    const { addElement, setSelected, removeSelected } = useCardEditorStore.getState();
    addElement("front", makeText("t1"), false);
    addElement("front", makeText("t2"), false);
    setSelected(["t1"]);
    removeSelected();
    const state = useCardEditorStore.getState();
    expect(state.design.front.elements.map((e) => e.id)).toEqual(["t2"]);
    expect(state.selectedIds).toEqual([]);
  });

  it("duplicates selected elements with a new id and offset position", () => {
    const { addElement, setSelected, duplicateSelected } = useCardEditorStore.getState();
    addElement("front", makeText("t1"), false);
    setSelected(["t1"]);
    duplicateSelected();
    const elements = useCardEditorStore.getState().design.front.elements;
    expect(elements).toHaveLength(2);
    expect(elements[1].id).not.toBe("t1");
    expect(elements[1].x).toBeGreaterThan(elements[0].x);
  });

  it("copies and pastes selected elements", () => {
    const { addElement, setSelected, copySelected, pasteClipboard } = useCardEditorStore.getState();
    addElement("front", makeText("t1"), false);
    setSelected(["t1"]);
    copySelected();
    pasteClipboard();
    expect(useCardEditorStore.getState().design.front.elements).toHaveLength(2);
  });

  it("reorders z-index to front and back", () => {
    const { addElement, setSelected, reorderSelected } = useCardEditorStore.getState();
    addElement("front", makeText("t1"), false);
    addElement("front", { ...makeText("t2"), zIndex: 5 }, false);
    setSelected(["t1"]);
    reorderSelected("front");
    const t1 = useCardEditorStore.getState().design.front.elements.find((e) => e.id === "t1")!;
    expect(t1.zIndex).toBeGreaterThan(5);
  });

  it("caps history at MAX_HISTORY entries", () => {
    const { addElement } = useCardEditorStore.getState();
    for (let i = 0; i < 80; i++) addElement("front", makeText(`t${i}`), false);
    expect(useCardEditorStore.getState().past.length).toBeLessThanOrEqual(60);
  });
});
