"use client";

import { Fragment } from "react";
import { Group, Text, Rect, Ellipse, Line, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { CardElement } from "@/lib/business-card/schema";
import { useHtmlImage } from "./use-html-image";
import { QrKonvaNodes } from "./qr-konva-nodes";

interface ElementNodeProps {
  el: CardElement;
  pxPerIn: number;
  isSelected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (id: string, patch: Partial<CardElement>) => void;
  onDblClickText: (id: string) => void;
  registerRef: (id: string, node: Konva.Group | null) => void;
}

export function ElementNode({ el, pxPerIn, isSelected, onSelect, onChange, onDblClickText, registerRef }: ElementNodeProps) {
  const widthPx = el.width * pxPerIn;
  const heightPx = el.height * pxPerIn;

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange(el.id, { x: e.target.x() / pxPerIn, y: e.target.y() / pxPerIn });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target as Konva.Group;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange(el.id, {
      x: node.x() / pxPerIn,
      y: node.y() / pxPerIn,
      width: Math.max(0.1, el.width * scaleX),
      height: Math.max(0.1, el.height * scaleY),
      rotation: node.rotation(),
    });
  };

  return (
    <Group
      ref={(node) => registerRef(el.id, node)}
      id={el.id}
      x={el.x * pxPerIn}
      y={el.y * pxPerIn}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable={!el.locked}
      listening={el.visible}
      onClick={(e) => onSelect(el.id, e.evt.shiftKey)}
      onTap={() => onSelect(el.id, false)}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      onDblClick={() => el.type === "text" && onDblClickText(el.id)}
    >
      <ElementContent el={el} widthPx={widthPx} heightPx={heightPx} pxPerIn={pxPerIn} />
      {isSelected && el.locked && (
        <Rect width={widthPx} height={heightPx} stroke="#94A3B8" strokeWidth={1} dash={[4, 4]} listening={false} />
      )}
    </Group>
  );
}

function ElementContent({ el, widthPx, heightPx, pxPerIn }: { el: CardElement; widthPx: number; heightPx: number; pxPerIn: number }) {
  if (el.type === "text") {
    const fontSizePx = (el.fontSizePt / 72) * pxPerIn;
    const text = el.textTransform === "uppercase" ? el.text.toUpperCase() : el.textTransform === "lowercase" ? el.text.toLowerCase() : el.text;
    return (
      <Fragment>
        {el.backgroundColor && <Rect width={widthPx} height={heightPx} fill={el.backgroundColor} />}
        <Text
          text={text || " "}
          width={widthPx}
          height={heightPx}
          fontSize={fontSizePx}
          fontFamily={el.fontFamily}
          fontStyle={`${el.italic ? "italic" : "normal"} ${["700", "800", "900"].includes(el.fontWeight) ? "bold" : ""}`.trim()}
          textDecoration={el.underline ? "underline" : ""}
          fill={el.color}
          align={el.align}
          lineHeight={el.lineHeight}
          letterSpacing={(el.letterSpacing / 72) * pxPerIn}
        />
      </Fragment>
    );
  }

  if (el.type === "shape") {
    const fill = el.gradient ? undefined : (el.fill ?? undefined);
    const gradientProps = el.gradient
      ? {
          fillLinearGradientStartPoint: { x: 0, y: 0 },
          fillLinearGradientEndPoint: { x: widthPx, y: 0 },
          fillLinearGradientColorStops: [0, el.gradient.from, 1, el.gradient.to],
        }
      : {};
    if (el.shape === "ellipse") {
      return (
        <Ellipse
          x={widthPx / 2}
          y={heightPx / 2}
          radiusX={widthPx / 2}
          radiusY={heightPx / 2}
          fill={fill}
          stroke={el.stroke ?? undefined}
          strokeWidth={el.strokeWidthPx}
          {...gradientProps}
        />
      );
    }
    if (el.shape === "line" || el.shape === "divider") {
      return <Line points={[0, heightPx / 2, widthPx, heightPx / 2]} stroke={el.stroke ?? el.fill ?? "#000000"} strokeWidth={Math.max(el.strokeWidthPx, 1)} />;
    }
    return (
      <Rect
        width={widthPx}
        height={heightPx}
        cornerRadius={el.cornerRadiusIn * pxPerIn}
        fill={fill}
        stroke={el.stroke ?? undefined}
        strokeWidth={el.strokeWidthPx}
        {...gradientProps}
      />
    );
  }

  if (el.type === "image") {
    return <ImageContent widthPx={widthPx} heightPx={heightPx} el={el} />;
  }

  if (el.type === "qr") {
    return <QrKonvaNodes el={el} />;
  }

  return null;
}

function ImageContent({ widthPx, heightPx, el }: { widthPx: number; heightPx: number; el: Extract<CardElement, { type: "image" }> }) {
  const [image, status] = useHtmlImage(el.src);
  if (status !== "loaded" || !image) {
    return <Rect width={widthPx} height={heightPx} fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={1} dash={[6, 6]} />;
  }
  const crop = el.crop
    ? {
        x: el.crop.x * el.naturalWidthPx,
        y: el.crop.y * el.naturalHeightPx,
        width: el.crop.width * el.naturalWidthPx,
        height: el.crop.height * el.naturalHeightPx,
      }
    : undefined;
  return (
    <KonvaImage
      image={image}
      width={widthPx}
      height={heightPx}
      crop={crop}
      cornerRadius={el.cornerRadiusIn * 300 /* rough on-screen approximation; export uses exact inch radius */}
      stroke={el.borderWidthPx > 0 ? el.borderColor : undefined}
      strokeWidth={el.borderWidthPx}
    />
  );
}
