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
      const fitZoom = Math.min(availW / widthPx, availH / heightPx, 1);
      // Floor is intentionally low, not the ~25% that's plenty for a business card — a 33x81in
      // roll-up banner can genuinely need single-digit zoom to fit on screen at all, and flooring
      // it higher just makes most of the design scroll out of view instead of shrinking to fit.
      setZoom(Math.max(0.03, fitZoom));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widthPx, heightPx]);

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

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
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
    [side.elements, zoom]
  );

  const commitTextEdit = useCallback(() => {
    if (editingTextId) updateElement(activeSide, editingTextId, { text: editingValue } as never);
    setEditingTextId(null);
    setEditingRect(null);
  }, [editingTextId, editingValue, updateElement, activeSide]);

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
    <div ref={containerRef} className="relative inline-block bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f9fafb_0%_50%)] bg-[length:16px_16px] shadow-lg" style={{ width: widthPx * zoom, height: heightPx * zoom }}>
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
            width: editingRect.width,
            height: editingRect.height,
            fontSize: editingRect.fontSizePx,
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
