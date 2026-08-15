"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Group, Transformer } from "react-konva";
import type Konva from "konva";
import { useCardEditorStore } from "@/lib/business-card/store";
import { ElementNode } from "./element-node";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { computeSnap, computeGridSnap, type Guide } from "@/lib/business-card/snapping";
import type { TextElement } from "@/lib/business-card/schema";

export const PX_PER_IN = 200;
const GRID_SIZE_IN = 0.25;

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  /** ids of every element being moved together (the dragged one plus any co-selected siblings) */
  ids: string[];
  /** each id's position (inches) at the start of the gesture */
  origin: Map<string, { x: number; y: number }>;
}

export function CardCanvas() {
  const design = useCardEditorStore((s) => s.design);
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const selectedIds = useCardEditorStore((s) => s.selectedIds);
  const zoom = useCardEditorStore((s) => s.zoom);
  const showGuides = useCardEditorStore((s) => s.showGuides);
  const showGrid = useCardEditorStore((s) => s.showGrid);
  const setSelected = useCardEditorStore((s) => s.setSelected);
  const updateElement = useCardEditorStore((s) => s.updateElement);
  const updateElements = useCardEditorStore((s) => s.updateElements);

  const side = activeSide === "front" ? design.front : design.back;
  const widthPx = side.physicalWidthIn * PX_PER_IN;
  const heightPx = side.physicalHeightIn * PX_PER_IN;

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);

  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingRect, setEditingRect] = useState<{ x: number; y: number; width: number; height: number; fontSizePx: number; el: TextElement } | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useKeyboardShortcuts(editingTextId === null);

  const registerRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  // Canvas text renders with whatever font is available at draw time — if a custom @font-face
  // hasn't finished downloading yet, Konva silently falls back and never redraws once it lands.
  // Force a redraw whenever the browser's font set finishes loading (both the initial batch and
  // any fonts that load later, e.g. the first time a newly picked font is actually used).
  useEffect(() => {
    const redraw = () => stageRef.current?.getLayers().forEach((l) => l.batchDraw());
    document.fonts.ready.then(redraw).catch(() => {});
    document.fonts.addEventListener("loadingdone", redraw);
    return () => document.fonts.removeEventListener("loadingdone", redraw);
  }, []);

  const setZoom = useCardEditorStore((s) => s.setZoom);
  const fitRequest = useCardEditorStore((s) => s.fitRequest);

  // Auto-fit the card to whatever space is actually available (critical on mobile, where a fixed
  // 100% zoom is wider than the whole screen) and re-fit on resize/orientation change. This means a
  // manual zoom can get reset by a resize (e.g. rotating a phone) — an acceptable tradeoff since
  // re-fitting is usually exactly what you want right after an orientation change anyway.
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const fit = () => {
      // Read the parent's actual padding rather than assuming a fixed value, since it differs
      // between mobile and desktop (and clientWidth/clientHeight already include padding).
      const style = window.getComputedStyle(parent);
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const availW = parent.clientWidth - paddingX;
      const availH = parent.clientHeight - paddingY;
      if (availW <= 0 || availH <= 0) return;
      /**
       * Fill the space available rather than stopping at 1:1.
       *
       * The cap used to be 1, so a business card sat at 700 x 400 no matter how much room the
       * screen had - a small card marooned in a large grey area, which made fine positioning
       * needlessly fiddly. PX_PER_IN is 200, so 2.5x is 500 px/in on screen and still comfortably
       * sharp; the artwork itself is vector and rescales cleanly.
       */
      const fitZoom = Math.min(availW / widthPx, availH / heightPx, 2.5);
      // Whatever fits, however small. A floor above the fit does not keep the design readable, it
      // just pushes the edges off screen: a 4 x 12ft banner needs 0.013 on a phone and a 0.03 floor
      // rendered it 864px wide in a 374px column.
      setZoom(Math.max(0.005, fitZoom));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widthPx, heightPx, fitRequest]);

  /**
   * Pinch to zoom.
   *
   * The only zoom controls were buttons behind a kebab menu, which is not how anyone zooms on a
   * phone - and on a banner, where the fitted view is around 1%, being unable to zoom in meant being
   * unable to edit at all. Two-finger pinch changes the zoom by the same ratio the fingers move, so
   * it behaves the same whether the canvas is at 1% or 200%.
   */
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;

    let startDistance = 0;
    let startZoom = 1;

    const distance = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      startDistance = distance(e.touches);
      startZoom = useCardEditorStore.getState().zoom;
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !startDistance) return;
      // Prevent the browser's own page zoom taking the gesture instead.
      e.preventDefault();
      setZoom(startZoom * (distance(e.touches) / startDistance));
    };
    const onEnd = () => { startDistance = 0; };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [setZoom]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = selectedIds.map((id) => nodeRefs.current.get(id)).filter((n): n is Konva.Group => Boolean(n));
    const editable = nodes.filter((n) => {
      const el = side.elements.find((e) => e.id === n.id());
      return el && !el.locked;
    });
    transformer.nodes(editable);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, side.elements]);

  /**
   * Deadline until which Konva's own click must not change the selection.
   *
   * A pointer gesture fires `pointerup` before `click`. The double-tap handler below runs on
   * `pointerup`, works out which text the customer aimed at, and selects it — and then Konva's
   * `click` arrived a few milliseconds later and selected whatever was under the cursor *after* the
   * quick toolbar had appeared and pushed the canvas down 26px, overwriting the right answer with
   * the line above it. Whatever the double-tap handler concluded is the conclusion of the whole
   * gesture; the trailing click is the same gesture, not a new instruction.
   */
  const selectionSettledUntil = useRef(0);

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      if (Date.now() < selectionSettledUntil.current) return;
      if (additive) {
        const s = useCardEditorStore.getState();
        setSelected(s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id]);
      } else {
        setSelected([id]);
      }
    },
    [setSelected]
  );

  // Dragging one element moves every co-selected sibling by the same delta, and snaps against the
  // canvas (edges/center) and other elements (edges/centers), or the grid when it's toggled on.
  // All of this happens by moving Konva nodes directly rather than through React state, so it stays
  // smooth at 60fps and doesn't fight Konva's own native drag handling of the grabbed node — the
  // store is only touched once, on drag end, which is also the single point that becomes undoable.
  const handleElementDragStart = useCallback(
    (id: string) => {
      const current = useCardEditorStore.getState().selectedIds;
      const ids = current.includes(id) ? current : [id];
      if (!current.includes(id)) setSelected([id]);
      const origin = new Map<string, { x: number; y: number }>();
      for (const elId of ids) {
        const el = side.elements.find((e) => e.id === elId);
        if (el) origin.set(elId, { x: el.x, y: el.y });
      }
      dragStateRef.current = { ids, origin };
    },
    [side.elements, setSelected]
  );

  const handleElementDragMove = useCallback(
    (id: string, xPx: number, yPx: number) => {
      const drag = dragStateRef.current;
      const primaryOrigin = drag?.origin.get(id);
      const primaryEl = side.elements.find((e) => e.id === id);
      if (!drag || !primaryOrigin || !primaryEl) return;

      let dx = xPx / PX_PER_IN - primaryOrigin.x;
      let dy = yPx / PX_PER_IN - primaryOrigin.y;

      const movingBox = { x: primaryOrigin.x + dx, y: primaryOrigin.y + dy, width: primaryEl.width, height: primaryEl.height };

      if (showGrid) {
        const gridSnap = computeGridSnap(movingBox, GRID_SIZE_IN);
        dx += gridSnap.dx;
        dy += gridSnap.dy;
        setGuides([]);
      } else {
        const otherBoxes = side.elements
          .filter((e) => !drag.ids.includes(e.id) && e.visible)
          .map((e) => ({ x: e.x, y: e.y, width: e.width, height: e.height }));
        const snap = computeSnap(movingBox, side.physicalWidthIn, side.physicalHeightIn, otherBoxes);
        dx += snap.dx;
        dy += snap.dy;
        setGuides(snap.guides);
      }

      for (const elId of drag.ids) {
        const o = drag.origin.get(elId);
        const node = nodeRefs.current.get(elId);
        if (o && node) node.position({ x: (o.x + dx) * PX_PER_IN, y: (o.y + dy) * PX_PER_IN });
      }
      transformerRef.current?.forceUpdate();
      stageRef.current?.batchDraw();
    },
    [side.elements, side.physicalWidthIn, side.physicalHeightIn, showGrid]
  );

  const handleElementDragEnd = useCallback(() => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const patches = drag.ids
      .map((elId) => {
        const node = nodeRefs.current.get(elId);
        if (!node) return null;
        return { id: elId, patch: { x: node.x() / PX_PER_IN, y: node.y() / PX_PER_IN } };
      })
      .filter((p): p is { id: string; patch: { x: number; y: number } } => p !== null);
    updateElements(activeSide, patches);
    dragStateRef.current = null;
    setGuides([]);
  }, [activeSide, updateElements]);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== e.target.getStage()) return;
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition();
      if (!pos) return;
      marqueeStart.current = pos;
      setMarquee({ x: pos.x, y: pos.y, width: 0, height: 0 });
      if (!e.evt.shiftKey) setSelected([]);
    },
    [setSelected]
  );

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!marqueeStart.current) return;
    const stage = e.target.getStage();
    const pos = stage?.getRelativePointerPosition();
    if (!pos) return;
    const start = marqueeStart.current;
    setMarquee({
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      width: Math.abs(pos.x - start.x),
      height: Math.abs(pos.y - start.y),
    });
  }, []);

  const handleStageMouseUp = useCallback(() => {
    if (!marquee || (marquee.width < 3 && marquee.height < 3)) {
      marqueeStart.current = null;
      setMarquee(null);
      return;
    }
    const hits: string[] = [];
    for (const el of side.elements) {
      if (!el.visible) continue;
      const node = nodeRefs.current.get(el.id);
      if (!node) continue;
      const box = node.getClientRect({ relativeTo: node.getStage() ?? undefined });
      const intersects = box.x < marquee.x + marquee.width && box.x + box.width > marquee.x && box.y < marquee.y + marquee.height && box.y + box.height > marquee.y;
      if (intersects) hits.push(el.id);
    }
    setSelected(hits);
    marqueeStart.current = null;
    setMarquee(null);
  }, [marquee, side.elements, setSelected]);

  const startEditText = useCallback(
    (id: string) => {
      const el = side.elements.find((e) => e.id === id);
      if (!el || el.type !== "text") return;
      const node = nodeRefs.current.get(id);
      const stage = stageRef.current;
      if (!node || !stage) return;
      const box = node.getClientRect({ relativeTo: stage });
      /*
       * Editing the text also selects it.
       *
       * Double-clicking a name on a template could leave the *shape* behind it selected - the first
       * click of the pair lands on whatever Konva hit-tested, which for text is the glyphs only - so
       * the properties panel answered "Fill / Stroke / Corner radius" to "I want to change this
       * word". Whatever we are about to let them type into is what the panel should be describing.
       */
      setSelected([id]);
      setEditingTextId(id);
      setEditingValue(el.text);
      setEditingRect({
        x: box.x * zoom,
        y: box.y * zoom,
        width: Math.max(el.width * PX_PER_IN, box.width) * zoom,
        height: Math.max(el.height * PX_PER_IN, box.height) * zoom,
        fontSizePx: (el.fontSizePt / 72) * PX_PER_IN * zoom,
        el,
      });
    },
    [side.elements, zoom, setSelected]
  );

  /** The "Edit text" button in the quick toolbar, which has no way to reach startEditText directly. */
  const editTextRequest = useCardEditorStore((s) => s.editTextRequest);
  useEffect(() => {
    if (editTextRequest) startEditText(editTextRequest.id);
    // startEditText is intentionally not a dependency: it changes on every element edit, and
    // re-running then would reopen the editor after it had been closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTextRequest]);

  /**
   * Double-tap to edit text, detected here rather than left to Konva.
   *
   * Konva's own `dbltap` never arrives on a phone once an element is selected. Transformer anchors
   * are drawn at a fixed *screen* size so they stay grabbable, so Konva scales them up as you zoom
   * out - and on a business card fitted to a phone at 52%, a 0.3in heading is 31px tall while the
   * anchors around it are 31px too. The handles blanket the element, the first tap of the pair lands
   * on the Transformer instead of the text, and Konva only raises a double-click when both taps end
   * on the *same* shape. So the gesture was silently impossible: there was no way to reword text on
   * a phone at all.
   *
   * Detecting it ourselves also lets us ignore the Transformer when deciding what was tapped, and
   * hit-test the elements directly instead.
   */
  const lastTapRef = useRef<{ t: number; x: number; y: number; left: number; top: number } | null>(null);

  const handleContainerPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      const container = containerRef.current;
      if (!stage || !container) return;

      const now = Date.now();
      const prev = lastTapRef.current;
      // Where the canvas was at the instant of this tap, kept with the tap it belongs to. Which
      // canvas a tap was aimed at is part of what the tap *was*, and it cannot be recovered later.
      const rectNow = container.getBoundingClientRect();
      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY, left: rectNow.left, top: rectNow.top };

      /*
       * Compared in screen coordinates, not canvas coordinates.
       *
       * The finger holds still between the two taps; the canvas does not. Selecting an element on
       * the first tap reveals the quick toolbar, which shifts the canvas by about 112px, so the two
       * taps land 112 canvas-pixels apart while the hand never moved - and a distance check measured
       * on the canvas throws the gesture away. Screen space is where the gesture actually happens.
       *
       * The same slop a browser allows itself: close in both time and place, so a quick tap on two
       * neighbouring elements is still two taps.
       */
      if (prev == null) return;
      const isDouble = now - prev.t < 400 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 24;
      if (!isDouble) return;
      lastTapRef.current = null;

      /*
       * Resolved against the *first* tap: its position, on the canvas as it stood at that moment.
       *
       * The canvas moves between the two taps. Selecting anything reveals the quick toolbar, which
       * on desktop is in the flow above the canvas and pushes it down, and on mobile shifts it by
       * about 112px. Reading the pointer against where the canvas ended up therefore answered a
       * question nobody asked - what is under the cursor *now* - and since the card slid down, that
       * was consistently the line above the one the customer had aimed at: double-clicking the
       * website line opened the phone line, double-clicking the job title opened the name, and
       * double-clicking a line with a gap above it found no text at all and left the background
       * shape selected, showing Fill and Corner radius in answer to "change this wording".
       *
       * The first tap is the one the customer aimed with, taken against the layout they were
       * looking at when they aimed. That pair is self-consistent no matter what moves afterwards.
       */
      const x = (prev.x - prev.left) / zoom;
      const y = (prev.y - prev.top) / zoom;

      /* Topmost text element under the pointer, Transformer excluded. */
      const hit = [...side.elements]
        .filter((el) => el.type === "text" && el.visible && !el.locked)
        .sort((a, b) => b.zIndex - a.zIndex)
        .find((el) => {
          const node = nodeRefs.current.get(el.id);
          if (!node) return false;
          const box = node.getClientRect({ relativeTo: stage });
          return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
        });

      /*
       * A finger that missed still meant the selected element: at a fitted zoom a small element's box
       * is a few pixels tall, and the canvas may have shifted under the hand between the two taps, so
       * requiring a direct hit would fail the gesture most of the time.
       */
      const id = hit?.id ?? (selectedIds.length === 1 ? selectedIds[0] : null);
      if (!id) return;
      // Long enough to outlast the `click` this same gesture is about to raise, short enough that
      // the customer's next, separate click is never ignored.
      selectionSettledUntil.current = Date.now() + 350;
      startEditText(id);
    },
    [side.elements, selectedIds, startEditText, zoom]
  );

  /**
   * Saves the edited text and refits the box to it.
   *
   * Only `text` was written before, so the element kept whatever height it had when the design was
   * built: replacing a short line with a long one left the text overflowing its box, and replacing a
   * long one with a short one left a gap that pushed everything else out of alignment. The textarea
   * is laid out with the same font, size and line height as the element, so its own content height
   * is the measurement to use - taken in screen pixels and divided back out through the zoom.
   */
  /**
   * Puts the cursor in the editor as soon as it opens.
   *
   * autoFocus on a freshly mounted element does not reliably raise the on-screen keyboard on iOS, so
   * the box appeared and nothing could be typed into it. Focusing explicitly, and selecting what is
   * there, also means the first keystroke replaces the placeholder rather than appending to it.
   */
  useEffect(() => {
    if (!editingRect) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.select();
  }, [editingRect]);

  const commitTextEdit = useCallback(() => {
    if (editingTextId) {
      const patch: { text: string; height?: number } = { text: editingValue };
      /*
       * Measured with the box collapsed first.
       *
       * scrollHeight never reports less than the element's own height, and the editor carries a 44px
       * floor so it stays tappable - so a one-line heading measured 44px instead of its true 31px
       * and every commit grew the element by a third, whether or not the text had changed. Zeroing
       * the height first makes scrollHeight report the content and nothing else.
       */
      const editor = editorRef.current;
      let measured: number | undefined;
      if (editor) {
        const restore = editor.style.height;
        editor.style.height = "0px";
        measured = editor.scrollHeight;
        editor.style.height = restore;
      }
      if (measured && zoom > 0) {
        /*
         * Scaled back down before it is used.
         *
         * The editor renders at no less than 16px so it stays legible at banner zoom, so on a small
         * element its measured height is larger than the text will actually be. Dividing by that
         * enlargement recovers the true height; without it, editing a 5px caption on a banner grew
         * the box threefold.
         */
        const rendered = Math.max(16, editingRect?.fontSizePx ?? 16);
        const enlargement = rendered / (editingRect?.fontSizePx || rendered);
        const heightIn = measured / enlargement / zoom / PX_PER_IN;
        // One line's worth is the floor, so an emptied box stays selectable rather than collapsing.
        const minIn = (editingRect?.fontSizePx ?? 0) / zoom / PX_PER_IN || 0.1;
        patch.height = Math.max(heightIn, minIn);
      }
      updateElement(activeSide, editingTextId, patch as never);
    }
    setEditingTextId(null);
    setEditingRect(null);
  }, [editingTextId, editingValue, updateElement, activeSide, zoom, editingRect]);

  const bleedIn = side.bleedIn;
  const safeInset = side.bleedIn + side.safeZoneInsetIn;
  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const lines: { points: number[] }[] = [];
    for (let x = 0; x <= side.physicalWidthIn; x += 0.25) lines.push({ points: [x * PX_PER_IN, 0, x * PX_PER_IN, heightPx] });
    for (let y = 0; y <= side.physicalHeightIn; y += 0.25) lines.push({ points: [0, y * PX_PER_IN, widthPx, y * PX_PER_IN] });
    return lines;
  }, [showGrid, side.physicalWidthIn, side.physicalHeightIn, widthPx, heightPx]);

  return (
    <div ref={containerRef} onPointerUp={handleContainerPointerUp} className="relative inline-block bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f9fafb_0%_50%)] bg-[length:16px_16px] shadow-lg" style={{ width: widthPx * zoom, height: heightPx * zoom }}>
      <Stage
        ref={stageRef}
        width={widthPx * zoom}
        height={heightPx * zoom}
        scaleX={zoom}
        scaleY={zoom}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer listening={false}>
          {side.background.type === "gradient" && side.background.gradient ? (
            <Rect
              width={widthPx}
              height={heightPx}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: widthPx, y: 0 }}
              fillLinearGradientColorStops={[0, side.background.gradient.from, 1, side.background.gradient.to]}
            />
          ) : (
            <Rect width={widthPx} height={heightPx} fill={side.background.color} />
          )}
          {gridLines.map((l, i) => (
            <Line key={i} points={l.points} stroke="#00000010" strokeWidth={1} />
          ))}
        </Layer>

        <Layer>
          {[...side.elements]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => (
              <Group key={el.id} visible={el.id !== editingTextId}>
                <ElementNode
                  el={el}
                  pxPerIn={PX_PER_IN}
                  isSelected={selectedIds.includes(el.id)}
                  onSelect={handleSelect}
                  onChange={(id, patch) => updateElement(activeSide, id, patch)}
                  onDragStart={handleElementDragStart}
                  onDragMove={handleElementDragMove}
                  onDragEnd={handleElementDragEnd}
                  onDblClickText={startEditText}
                  registerRef={registerRef}
                />
              </Group>
            ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
            anchorSize={16}
            anchorCornerRadius={8}
            anchorStrokeWidth={2}
            rotateAnchorOffset={28}
            borderStrokeWidth={2}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
          />
        </Layer>

        {showGuides && (
          <Layer listening={false}>
            <Rect x={bleedIn * PX_PER_IN} y={bleedIn * PX_PER_IN} width={widthPx - bleedIn * PX_PER_IN * 2} height={heightPx - bleedIn * PX_PER_IN * 2} stroke="#F97316" strokeWidth={1} dash={[6, 4]} />
            <Rect x={safeInset * PX_PER_IN} y={safeInset * PX_PER_IN} width={widthPx - safeInset * PX_PER_IN * 2} height={heightPx - safeInset * PX_PER_IN * 2} stroke="#0EA5E9" strokeWidth={1} dash={[3, 3]} />
          </Layer>
        )}

        {marquee && (
          <Layer listening={false}>
            <Rect x={marquee.x} y={marquee.y} width={marquee.width} height={marquee.height} fill="#0A6E6320" stroke="#0A6E63" strokeWidth={1} />
          </Layer>
        )}

        {guides.length > 0 && (
          <Layer listening={false}>
            {guides.map((g, i) =>
              g.orientation === "v" ? (
                <Line key={i} points={[g.pos * PX_PER_IN, 0, g.pos * PX_PER_IN, heightPx]} stroke="#EC4899" strokeWidth={1} dash={[4, 4]} />
              ) : (
                <Line key={i} points={[0, g.pos * PX_PER_IN, widthPx, g.pos * PX_PER_IN]} stroke="#EC4899" strokeWidth={1} dash={[4, 4]} />
              )
            )}
          </Layer>
        )}
      </Stage>

      {editingRect && (
        <textarea
          ref={editorRef}
          data-canvas-text-editor
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={commitTextEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitTextEdit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setEditingTextId(null);
              setEditingRect(null);
            }
          }}
          style={{
            position: "absolute",
            left: editingRect.x,
            top: editingRect.y,
            // Grown to suit the enlarged type, so the text is not clipped by a box sized for 5px.
            width: Math.max(editingRect.width, 180),
            height: Math.max(editingRect.height, 44),
            /*
             * Never smaller than 16px.
             *
             * The editor matched the canvas exactly, which is right at 100% and useless on a banner:
             * fitted at around 8%, a 24pt heading computes to roughly 5px, far too small to read
             * while typing. Under 16px also makes iOS zoom the whole page the moment the field takes
             * focus, which throws the canvas off screen. Legibility while editing beats matching the
             * rendered size; the canvas shows the true size again the moment it is committed.
             */
            fontSize: Math.max(16, editingRect.fontSizePx),
            fontFamily: editingRect.el.fontFamily,
            color: editingRect.el.color,
            textAlign: editingRect.el.align,
            lineHeight: editingRect.el.lineHeight,
            border: "1px solid #0A6E63",
            outline: "none",
            resize: "none",
            padding: 0,
            background: "rgba(255,255,255,0.92)",
          }}
        />
      )}
    </div>
  );
}
