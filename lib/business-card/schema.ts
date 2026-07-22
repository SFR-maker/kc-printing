import { z } from "zod";
import { PRINT_SPEC } from "./print-spec";

export const SCHEMA_VERSION = 1 as const;

const GradientSchema = z.object({
  from: z.string(),
  to: z.string(),
  angle: z.number().default(90),
});

const BaseElementSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  zIndex: z.number().int().default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  name: z.string().optional(),
  accessibilityLabel: z.string().optional(),
});

export const TextElementSchema = BaseElementSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontFamily: z.string().default("Inter"),
  fontSizePt: z.number().positive().default(14),
  fontWeight: z.enum(["400", "500", "600", "700", "800", "900"]).default("400"),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
  textTransform: z.enum(["none", "uppercase", "lowercase"]).default("none"),
  align: z.enum(["left", "center", "right"]).default("left"),
  lineHeight: z.number().positive().default(1.2),
  letterSpacing: z.number().default(0),
  color: z.string().default("#111111"),
  backgroundColor: z.string().nullable().default(null),
});

export const ImageElementSchema = BaseElementSchema.extend({
  type: z.literal("image"),
  src: z.string().min(1),
  originalSrc: z.string().optional(),
  naturalWidthPx: z.number().positive(),
  naturalHeightPx: z.number().positive(),
  crop: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0).max(1), height: z.number().min(0).max(1) })
    .nullable()
    .default(null),
  borderWidthPx: z.number().min(0).default(0),
  borderColor: z.string().default("#000000"),
  cornerRadiusIn: z.number().min(0).default(0),
  // Present only when this image was inserted from the icon library — lets the editor re-rasterize
  // the icon at a new color in place instead of the color being permanently baked into the PNG.
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

export const ShapeKindSchema = z.enum(["rect", "ellipse", "line", "divider"]);

export const ShapeElementSchema = BaseElementSchema.extend({
  type: z.literal("shape"),
  shape: ShapeKindSchema,
  fill: z.string().nullable().default("#0A6E63"),
  stroke: z.string().nullable().default(null),
  strokeWidthPx: z.number().min(0).default(0),
  cornerRadiusIn: z.number().min(0).default(0),
  gradient: GradientSchema.nullable().default(null),
});

export const QrPayloadTypeSchema = z.enum(["url", "phone", "email", "sms", "vcard", "geo", "text"]);

export const QrElementSchema = BaseElementSchema.extend({
  type: z.literal("qr"),
  payloadType: QrPayloadTypeSchema,
  value: z.string(),
  foreground: z.string().default("#111111"),
  background: z.string().default("#FFFFFF"),
  errorCorrection: z.enum(["L", "M", "Q", "H"]).default("M"),
});

export const CardElementSchema = z.discriminatedUnion("type", [
  TextElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
  QrElementSchema,
]);

export const CardSideSchema = z.object({
  physicalWidthIn: z.number().positive().default(PRINT_SPEC.trimWidthIn + PRINT_SPEC.bleedIn * 2),
  physicalHeightIn: z.number().positive().default(PRINT_SPEC.trimHeightIn + PRINT_SPEC.bleedIn * 2),
  bleedIn: z.number().min(0).default(PRINT_SPEC.bleedIn),
  safeZoneInsetIn: z.number().min(0).default(PRINT_SPEC.safeZoneInsetIn),
  background: z.object({
    type: z.enum(["solid", "gradient"]).default("solid"),
    color: z.string().default("#FFFFFF"),
    gradient: GradientSchema.nullable().default(null),
  }),
  elements: z.array(CardElementSchema).default([]),
});

export const CardTemplateSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  industry: z.string(),
  style: z.string(),
  tags: z.array(z.string()).default([]),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  palette: z.array(z.string()).default([]),
  fontFamilies: z.array(z.string()).default([]),
  thumbnailFront: z.string().nullable().default(null),
  thumbnailBack: z.string().nullable().default(null),
  front: CardSideSchema,
  back: CardSideSchema,
});

export const CardDesignSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().default("Untitled Design"),
  templateId: z.string().nullable().default(null),
  front: CardSideSchema,
  back: CardSideSchema,
});

export type CardElement = z.infer<typeof CardElementSchema>;
export type TextElement = z.infer<typeof TextElementSchema>;
export type ImageElement = z.infer<typeof ImageElementSchema>;
export type ShapeElement = z.infer<typeof ShapeElementSchema>;
export type QrElement = z.infer<typeof QrElementSchema>;
export type CardSide = z.infer<typeof CardSideSchema>;
export type CardTemplate = z.infer<typeof CardTemplateSchema>;
export type CardDesign = z.infer<typeof CardDesignSchema>;

export function validateCardTemplate(data: unknown) {
  return CardTemplateSchema.safeParse(data);
}

export function validateCardDesign(data: unknown) {
  return CardDesignSchema.safeParse(data);
}

export function emptyCardSide(): CardSide {
  return CardSideSchema.parse({
    background: { type: "solid", color: "#FFFFFF", gradient: null },
    elements: [],
  });
}

export function blankCardDesign(title = "Untitled Design"): CardDesign {
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    templateId: null,
    front: emptyCardSide(),
    back: emptyCardSide(),
  };
}
