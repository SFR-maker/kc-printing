/**
 * The concepts an AI generation offers, and the art direction behind each one.
 *
 * A single generation used to return one design: an abstract gradient, the same one whatever the
 * business was, with Poppins over Inter regardless. "Luxury real estate agent specialising in modern
 * homes in Dallas" and "mobile dog grooming" produced the same soft blur in different colours, and
 * the customer's own description of their business - the most specific thing they gave us - reached
 * the model as a passing clause and reached the typography not at all.
 *
 * Four concepts, each a different answer to the same brief rather than a recolour of one answer:
 * they differ in what the imagery *is*, how the type is set, and how much of the piece the image
 * occupies. Picking between four real alternatives is a design decision; picking between four
 * colourways is not.
 */

export interface AiConcept {
  id: string;
  name: string;
  /** One line under the thumbnail, so the customer knows what they are choosing between. */
  blurb: string;
  headingFont: string;
  bodyFont: string;
  /**
   * The art direction, appended to the business description.
   *
   * Written as instructions to a photographer or illustrator rather than as adjectives: "shot on a
   * long lens at golden hour" produces a different image than "premium", which produces a gradient.
   */
  direction: string;
}

export const AI_CONCEPTS: AiConcept[] = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    blurb: "Restrained, lots of space, one clear idea",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    direction:
      "Minimal and architectural. A single simple subject or a clean geometric field, mostly empty "
      + "space, flat even light, muted and desaturated. Composed so the left two thirds stay quiet "
      + "enough to hold text.",
  },
  {
    id: "luxury-premium",
    name: "Luxury / Premium",
    blurb: "Deep tones, restrained detail, expensive-looking",
    headingFont: "Playfair Display",
    bodyFont: "Cormorant Garamond",
    direction:
      "Understated luxury. Deep saturated darks, a single warm highlight, rich material texture - "
      + "stone, brushed metal, dark timber, heavy paper. Dramatic low-key lighting with soft "
      + "falloff. Nothing shiny or gaudy; expensive rather than flashy.",
  },
  {
    id: "photography-led",
    name: "Photography Focused",
    blurb: "A real photograph of the work, edge to edge",
    headingFont: "Montserrat",
    bodyFont: "Inter",
    direction:
      "A real, believable photograph of this trade at work - the actual subject matter of the "
      + "business, not a metaphor for it. Natural daylight, shallow depth of field, documentary "
      + "rather than staged. Photorealistic; not an illustration, not a 3D render.",
  },
  {
    id: "bold-contemporary",
    name: "Bold Contemporary",
    blurb: "High contrast, strong colour, hard to miss",
    headingFont: "Anton",
    bodyFont: "Work Sans",
    direction:
      "Bold and graphic. Strong flat colour blocking, high contrast, confident diagonal or "
      + "asymmetric composition. Poster-like and modern. No gradients, no soft blur.",
  },
];

export function conceptById(id: string): AiConcept | undefined {
  return AI_CONCEPTS.find((c) => c.id === id);
}

/**
 * The prompt for one concept.
 *
 * The business description goes first and is quoted, because it is the only part of the brief that
 * is specific to this customer - everything after it is house art direction. Models weight the
 * opening of a prompt heavily, and burying the description behind boilerplate is what made every
 * result generic.
 *
 * The negative instructions at the end are not optional. Text is the giveaway on a generated image:
 * anything that looks like lettering comes back as garbled pseudo-type, and this artwork has real
 * type composited over it afterwards.
 */
export function buildConceptPrompt(
  concept: AiConcept,
  description: string,
  shape: string,
  ratio: string,
): string {
  return [
    `Background artwork for a print piece advertising this business: "${description}".`,
    concept.direction,
    `The image must relate directly to that business and the place it operates in.`,
    // The type is composited on afterwards, so the image has to leave somewhere for it to go.
    `Leave a calm, uncluttered area for text to be placed over the lower portion.`,
    `Full bleed, edge to edge, ${shape} orientation, ${ratio} aspect ratio.`,
    `No text, no letters, no numerals, no logos, no watermark, no border, no frame, no mockup of a `
      + `card or sign - the artwork itself, filling the whole frame.`,
  ].join(" ");
}
