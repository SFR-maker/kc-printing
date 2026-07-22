import QRCode from "qrcode";
import type { QrPayloadTypeSchema } from "./schema";
import { z } from "zod";

export type QrPayloadType = z.infer<typeof QrPayloadTypeSchema>;

export interface VCardInput {
  name: string;
  org?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface GeoInput {
  lat: number;
  lng: number;
  label?: string;
}

/** Builds the raw string encoded into the QR code for each supported payload type. */
export function buildQrValue(
  type: QrPayloadType,
  input: string | VCardInput | GeoInput
): { value: string; error: string | null } {
  switch (type) {
    case "url": {
      const raw = String(input).trim();
      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        new URL(url);
        return { value: url, error: null };
      } catch {
        return { value: raw, error: "Enter a valid website URL." };
      }
    }
    case "phone": {
      const raw = String(input).trim();
      const digits = raw.replace(/[^\d+]/g, "");
      if (digits.replace(/\+/g, "").length < 7) return { value: `tel:${digits}`, error: "Enter a valid phone number." };
      return { value: `tel:${digits}`, error: null };
    }
    case "email": {
      const raw = String(input).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return { value: `mailto:${raw}`, error: "Enter a valid email address." };
      return { value: `mailto:${raw}`, error: null };
    }
    case "sms": {
      const raw = String(input).trim();
      const digits = raw.replace(/[^\d+]/g, "");
      if (digits.replace(/\+/g, "").length < 7) return { value: `sms:${digits}`, error: "Enter a valid phone number." };
      return { value: `sms:${digits}`, error: null };
    }
    case "text": {
      const raw = String(input);
      if (!raw.trim()) return { value: raw, error: "Enter the text to encode." };
      return { value: raw, error: null };
    }
    case "vcard": {
      const v = input as VCardInput;
      if (!v.name?.trim()) return { value: "", error: "A name is required for a contact QR code." };
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${v.name}`,
        `FN:${v.name}`,
        v.org ? `ORG:${v.org}` : null,
        v.title ? `TITLE:${v.title}` : null,
        v.phone ? `TEL;TYPE=WORK,VOICE:${v.phone}` : null,
        v.email ? `EMAIL:${v.email}` : null,
        v.website ? `URL:${v.website}` : null,
        "END:VCARD",
      ].filter(Boolean);
      return { value: lines.join("\n"), error: null };
    }
    case "geo": {
      const g = input as GeoInput;
      if (!Number.isFinite(g.lat) || !Number.isFinite(g.lng)) return { value: "", error: "Enter a valid latitude and longitude." };
      const q = g.label ? `${g.lat},${g.lng}(${encodeURIComponent(g.label)})` : `${g.lat},${g.lng}`;
      return { value: `geo:${q}`, error: null };
    }
    default:
      return { value: "", error: "Unsupported QR type." };
  }
}

export interface QrModuleMatrix {
  size: number;
  modules: boolean[][];
}

/** Returns the raw QR module bitmap so callers can render it as vector rects (Konva/SVG) instead of a raster image. */
export function buildQrModuleMatrix(value: string, errorCorrection: "L" | "M" | "Q" | "H" = "M"): QrModuleMatrix {
  const qr = QRCode.create(value, { errorCorrectionLevel: errorCorrection });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const modules: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    const rowData: boolean[] = [];
    for (let col = 0; col < size; col++) {
      rowData.push(Boolean(data[row * size + col]));
    }
    modules.push(rowData);
  }
  return { size, modules };
}

export const QUIET_ZONE_MODULES = 4;
