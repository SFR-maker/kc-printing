/**
 * What each product's artwork is actually FOR.
 *
 * The previous set failed because one content model - name, title, phone, email, website - was
 * reused everywhere. That is a business card's job. Each product below carries the rules its own
 * medium imposes, taken from how these are actually read:
 *
 *   Banner       1 inch of letter height per 10 feet of viewing distance, one message, 5-7 words.
 *   Postcard     Front is one image plus a headline; the offer, CTA and response live on the back.
 *   Rigid sign   3 seconds at 45mph. 5 words or fewer, ~60% negative space.
 *   Window decal Operational, not promotional: name, hours, phone. Flat colour, never photography,
 *                because glass has an unpredictable background behind it.
 *
 * Sizes are the doc size (trim + bleed on both edges) for each product's default preset.
 */

export interface TextSlot {
  id: string;
  /** Placeholder copy. Kept generic so it reads as a prompt to edit, not as fake data. */
  text: string;
  /** Fractions of the card: where the slot sits inside the chosen text region. */
  dy: number;
  /** Point size at the authored size, before refitting. */
  pt: number;
  weight: "400" | "600" | "700" | "900";
  role: "headline" | "sub" | "body" | "cta" | "contact";
  transform?: "uppercase";
  align?: "left" | "center";
}

export interface ProductModel {
  /** Doc size in inches, including bleed. */
  widthIn: number;
  heightIn: number;
  bleedIn: number;
  safeZoneInsetIn: number;
  /** Fraction of the piece the type block may occupy. Signs stay small; banners go big. */
  maxTextHeight: number;
  /** Front slots, and back slots where the product has a designed reverse. */
  front: TextSlot[];
  back?: TextSlot[];
  /** Photography suits the medium. False means flat colour only. */
  photographic: boolean;
  /** Aspect to generate beds at, when photographic. */
  bedAspect?: string;
}

/**
 * Headline sizes are derived from the medium, not from taste.
 *
 * A 2ft x 4ft banner viewed from ~30 feet needs roughly 3 inch letters, which is 216pt. The
 * business card set topped out at 15pt, which is the whole problem in one number.
 */
export const PRODUCT_MODELS: Record<string, ProductModel> = {
  banner: {
    widthIn: 24.25, heightIn: 12.25, bleedIn: 0.125, safeZoneInsetIn: 0.25,
    maxTextHeight: 0.72,
    photographic: true,
    bedAspect: "2:1 landscape banner proportions",
    front: [
      { id: "headline", text: "GRAND OPENING", dy: 0, pt: 190, weight: "900", role: "headline", transform: "uppercase", align: "center" },
      { id: "sub", text: "Saturday 10am - 4pm", dy: 0.34, pt: 62, weight: "600", role: "sub", align: "center" },
      { id: "contact", text: "yourbusiness.com  ·  (816) 555-0100", dy: 0.50, pt: 40, weight: "400", role: "contact", align: "center" },
    ],
  },

  postcard: {
    // 6.25 x 9 jumbo plus bleed: the EDDM saturation size.
    widthIn: 9.25, heightIn: 6.5, bleedIn: 0.125, safeZoneInsetIn: 0.125,
    maxTextHeight: 0.42,
    photographic: true,
    bedAspect: "3:2 landscape postcard proportions",
    front: [
      // The front's only job is to stop them and get the card turned over.
      { id: "headline", text: "SPRING SERVICE SALE", dy: 0, pt: 58, weight: "900", role: "headline", transform: "uppercase" },
      { id: "sub", text: "Save 20% through May", dy: 0.30, pt: 26, weight: "600", role: "sub" },
    ],
    back: [
      { id: "offer", text: "20% off your first service", dy: 0, pt: 34, weight: "900", role: "headline" },
      { id: "body", text: "Book online or call. Mention this card when you do. New customers only.", dy: 0.22, pt: 15, weight: "400", role: "body" },
      { id: "cta", text: "Call (816) 555-0100", dy: 0.46, pt: 22, weight: "700", role: "cta" },
      { id: "expiry", text: "Offer expires 31 May", dy: 0.62, pt: 13, weight: "400", role: "body" },
      { id: "address", text: "1200 Main St, Kansas City, MO", dy: 0.76, pt: 13, weight: "400", role: "contact" },
    ],
  },

  "rigid-sign": {
    widthIn: 24.25, heightIn: 18.25, bleedIn: 0.125, safeZoneInsetIn: 0.5,
    // ~60% negative space is the rule for drive-by legibility, so the type block stays small.
    maxTextHeight: 0.40,
    photographic: false,
    front: [
      { id: "headline", text: "ROOF REPAIR", dy: 0, pt: 165, weight: "900", role: "headline", transform: "uppercase", align: "center" },
      { id: "sub", text: "Free Estimates", dy: 0.42, pt: 62, weight: "600", role: "sub", align: "center" },
      { id: "contact", text: "(816) 555-0100", dy: 0.64, pt: 78, weight: "700", role: "contact", align: "center" },
    ],
  },

  "window-decal": {
    widthIn: 24.125, heightIn: 6.125, bleedIn: 0.125, safeZoneInsetIn: 0.5,
    maxTextHeight: 0.75,
    // Flat colour only: glass has an unpredictable background behind it, and a photograph competing
    // with a shop interior is the fastest way to make a decal unreadable.
    photographic: false,
    front: [
      { id: "headline", text: "KANSAS CITY DINER", dy: 0, pt: 96, weight: "900", role: "headline", transform: "uppercase", align: "center" },
      { id: "sub", text: "Open Mon - Sat  ·  7am - 3pm", dy: 0.40, pt: 40, weight: "600", role: "sub", align: "center" },
      { id: "contact", text: "(816) 555-0100", dy: 0.66, pt: 36, weight: "400", role: "contact", align: "center" },
    ],
  },
};
