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

  it("undoes a move/property change made via updateElement", () => {
    const { addElement, updateElement, undo } = useCardEditorStore.getState();
    addElement("front", makeText("t1"), false);
    updateElement("front", "t1", { x: 2 } as never);
    expect(useCardEditorStore.getState().design.front.elements[0].x).toBe(2);
    undo();
    expect(useCardEditorStore.getState().design.front.elements[0].x).toBe(0.3);
  });

  it("undoes a batched updateElements change as a single step", () => {
    const { addElement, updateElements, undo } = useCardEditorStore.getState();
    addElement("front", makeText("t1"), false);
    addElement("front", makeText("t2"), false);
    updateElements("front", [{ id: "t1", patch: { x: 1 } }, { id: "t2", patch: { x: 1.5 } }]);
    undo();
    const elements = useCardEditorStore.getState().design.front.elements;
    expect(elements.find((e) => e.id === "t1")!.x).toBe(0.3);
    expect(elements.find((e) => e.id === "t2")!.x).toBe(0.3);
  });

  describe("alignSelected", () => {
    it("aligns a single element to the card edges/center", () => {
      const { addElement, setSelected, alignSelected } = useCardEditorStore.getState();
      addElement("front", { ...makeText("t1"), x: 0.5, y: 0.5, width: 1, height: 0.3 }, false);
      setSelected(["t1"]);

      alignSelected("left");
      expect(useCardEditorStore.getState().design.front.elements[0].x).toBe(0);

      alignSelected("centerH");
      const side = useCardEditorStore.getState().design.front;
      expect(useCardEditorStore.getState().design.front.elements[0].x).toBeCloseTo((side.physicalWidthIn - 1) / 2, 5);

      alignSelected("top");
      expect(useCardEditorStore.getState().design.front.elements[0].y).toBe(0);
    });

    it("aligns multiple elements to their combined selection bounding box", () => {
      const { addElement, setSelected, alignSelected } = useCardEditorStore.getState();
      addElement("front", { ...makeText("t1"), x: 0.2, y: 0.2, width: 0.5, height: 0.2 }, false);
      addElement("front", { ...makeText("t2"), x: 1.5, y: 1.0, width: 0.5, height: 0.2 }, false);
      setSelected(["t1", "t2"]);

      alignSelected("left");
      const elements = useCardEditorStore.getState().design.front.elements;
      expect(elements.find((e) => e.id === "t1")!.x).toBe(0.2);
      expect(elements.find((e) => e.id === "t2")!.x).toBe(0.2);
    });

    it("does not move locked elements", () => {
      const { addElement, setSelected, alignSelected } = useCardEditorStore.getState();
      addElement("front", { ...makeText("t1"), x: 0.5, locked: true }, false);
      setSelected(["t1"]);
      alignSelected("left");
      expect(useCardEditorStore.getState().design.front.elements[0].x).toBe(0.5);
    });
  });

  describe("distributeSelected", () => {
    it("evenly spaces 3+ elements horizontally, keeping the outer two fixed", () => {
      const { addElement, setSelected, distributeSelected } = useCardEditorStore.getState();
      addElement("front", { ...makeText("t1"), x: 0, width: 0.2 }, false);
      addElement("front", { ...makeText("t2"), x: 0.5, width: 0.2 }, false);
      addElement("front", { ...makeText("t3"), x: 2, width: 0.2 }, false);
      setSelected(["t1", "t2", "t3"]);

      distributeSelected("horizontal");
      const elements = useCardEditorStore.getState().design.front.elements;
      const t1 = elements.find((e) => e.id === "t1")!;
      const t2 = elements.find((e) => e.id === "t2")!;
      const t3 = elements.find((e) => e.id === "t3")!;
      expect(t1.x).toBe(0);
      expect(t3.x).toBe(2);
      // gap between t1-t2 should equal gap between t2-t3
      const gap1 = t2.x - (t1.x + t1.width);
      const gap2 = t3.x - (t2.x + t2.width);
      expect(gap1).toBeCloseTo(gap2, 5);
    });

    it("does nothing with fewer than 3 elements selected", () => {
      const { addElement, setSelected, distributeSelected } = useCardEditorStore.getState();
      addElement("front", { ...makeText("t1"), x: 0 }, false);
      addElement("front", { ...makeText("t2"), x: 1 }, false);
      setSelected(["t1", "t2"]);
      distributeSelected("horizontal");
      const elements = useCardEditorStore.getState().design.front.elements;
      expect(elements.find((e) => e.id === "t2")!.x).toBe(1);
    });
  });
});
