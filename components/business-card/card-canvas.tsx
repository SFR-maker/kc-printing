"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Group, Transformer } from "react-konva";
import type Konva from "konva";
import { useCardEditorStore } from "@/lib/business-card/store";
import { ElementNode } from "./element-node";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import type { TextElement } from "@/lib/business-card/schema";

export const PX_PER_IN = 200;

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
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

  const side = activeSide === "front" ? design.front : design.back;
  const widthPx = side.physicalWidthIn * PX_PER_IN;
  const heightPx = side.physicalHeightIn * PX_PER_IN;

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

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
                  onDblClickText={startEditText}
                  registerRef={registerRef}
                />
              </Group>
            ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
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
