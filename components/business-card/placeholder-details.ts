import type { CardDesign } from "@/lib/business-card/schema";

/**
 * Finds sample contact details that came with a template and were never replaced.
 *
 * Templates ship filled in with a fictional business - "Rosa Lindqvist", "(913) 555-0341",
 * "rosa@lindqvistflowers.com" - because an empty card is far harder to judge in the gallery than a
 * finished-looking one. The cost of that is a customer who edits the parts they notice and reaches
 * checkout with a stranger's phone number still on the card, which is the single most expensive
 * mistake this tool can let through: 500 cards that send every caller to someone else.
 *
 * Two signals, both deliberately conservative:
 *
 *  1. A 555 phone number. 555-01xx is the reserved fictional range (and the range every template in
 *     lib/business-card/templates/categories.ts is written with), so it is never someone's real
 *     number no matter how much else on the card has been edited.
 *  2. Text that still matches the template character for character *and* reads as a contact detail
 *     (email, phone, website). Untouched-and-a-contact-detail is what "you forgot this one" looks
 *     like; untouched prose - a tagline, a job title - is not, and is left alone.
 *
 * Names are deliberately not detected: there is no reliable way to tell "Rosa Lindqvist" from a
 * real customer's name, and a false accusation about the name on your own business card is worse
 * than silence. The editor prompt names them in words instead.
 */
export type PlaceholderKind = "phone" | "email" | "website";

export interface PlaceholderDetail {
  side: "front" | "back";
  elementId: string;
  kind: PlaceholderKind;
  /** The offending text, as it appears on the card. */
  text: string;
}

/** (913) 555-0341, 913-555-0341, 913.555.0341 — the reserved "not a real number" range. */
const FICTIONAL_PHONE = /(?:\(\s*\d{3}\s*\)|\b\d{3})[\s.\-]*555[\s.\-]*\d{4}\b/;
const ANY_PHONE = /(?:\(\s*\d{3}\s*\)|\b\d{3})[\s.\-]*\d{3}[\s.\-]*\d{4}\b/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const WEBSITE = /(?:^|[\s/])(?:https?:\/\/)?(?:www\.)?[\w-]{2,}\.(?:com|net|org|co|io|us|biz|shop|store|studio|design)\b/i;
/** Domains that announce themselves as filler wherever they turn up, edited or not. */
const EXAMPLE_DOMAIN = /\b(?:example|yourcompany|yourbusiness|yourname|yoursite|acme)\.(?:com|net|org)\b/i;

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * The template's own wording, keyed by element id.
 *
 * Kept as a plain record rather than the whole design so it survives being written to
 * sessionStorage — the editor's URL changes from `t-{slug}` to a real design id the first time it
 * autosaves, which remounts it with the *saved* design as its starting point and would otherwise
 * lose every trace of what the template originally said.
 */
export type TemplateBaseline = Record<string, string>;

export function baselineFromDesign(design: CardDesign): TemplateBaseline {
  const baseline: TemplateBaseline = {};
  for (const side of ["front", "back"] as const) {
    for (const el of design[side].elements) if (el.type === "text") baseline[el.id] = el.text;
  }
  return baseline;
}

function classify(text: string, templateText: string | undefined): PlaceholderKind | null {
  if (FICTIONAL_PHONE.test(text)) return "phone";
  if (EXAMPLE_DOMAIN.test(text)) return text.includes("@") ? "email" : "website";

  const untouched = templateText !== undefined && normalize(templateText) === normalize(text);
  if (!untouched) return null;

  // Email first: an address contains a domain, so the website test would also match it.
  if (EMAIL.test(text)) return "email";
  if (ANY_PHONE.test(text)) return "phone";
  if (WEBSITE.test(text)) return "website";
  return null;
}

/**
 * @param baseline What the template originally said, from baselineFromDesign. Omit it for a design
 * with no template behind it — there is nothing to compare against, and the 555 rule still catches
 * every template phone number on its own.
 */
export function findPlaceholderDetails(design: CardDesign, baseline?: TemplateBaseline | null): PlaceholderDetail[] {
  const found: PlaceholderDetail[] = [];
  for (const side of ["front", "back"] as const) {
    for (const el of design[side].elements) {
      if (el.type !== "text" || !el.visible) continue;
      const text = el.text.trim();
      if (!text) continue;
      const kind = classify(text, baseline?.[el.id]);
      if (kind) found.push({ side, elementId: el.id, kind, text });
    }
  }
  return found;
}

/** Plain-English name for a detail, for use mid-sentence. */
export function placeholderLabel(kind: PlaceholderKind): string {
  return kind === "phone" ? "phone number" : kind === "email" ? "email address" : "website";
}
