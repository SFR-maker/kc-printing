import type { Parcel } from "./parcel";
import { areaSqFt } from "@/lib/pricing/banners";

/**
 * Weight and carton size for a banner order.
 *
 * Banners ship rolled in a tube, not flat in a box, so none of the business-card parcel logic
 * applies: the weight comes from the material's areal density and the carton is a cylinder whose
 * length is the banner's short edge.
 *
 * Vinyl is sold by ounces per square yard, which is what the "13 oz." and "8 oz." in the material
 * names mean. A square yard is nine square feet, so 13 oz vinyl is 1.444 oz per square foot. A
 * 4 x 8 ft banner is 32 sq ft, hence about 46 oz of vinyl - just under three pounds, which matches
 * what a banner that size actually weighs in the hand.
 */

const OZ_PER_SQ_YARD_TO_SQ_FT = 1 / 9;

/** Areal density in oz per square foot, parsed from the material name. */
export function materialOzPerSqFt(material: string): number {
  const m = material.match(/(\d+)\s*oz/i);
  // 13 oz scrim is the common case and the sensible default for anything unrecognised.
  const ozPerSqYard = m ? Number(m[1]) : 13;
  return ozPerSqYard * OZ_PER_SQ_YARD_TO_SQ_FT;
}

/** Hems and grommets add real weight: a folded, welded edge plus a brass ring every two feet. */
const HEM_OZ_PER_FT = 0.35;
const GROMMET_OZ = 0.12;
/** Cardboard tube, end caps and tape. */
const TUBE_BASE_OZ = 8;
const TUBE_OZ_PER_INCH = 0.55;

/** Perimeter in feet, for hem and grommet weight. */
function perimeterFt(sizeLabel: string): number {
  const m = sizeLabel.match(/([\d.]+)\s*ft\s*x\s*([\d.]+)\s*ft/i);
  if (!m) return 0;
  return 2 * (Number(m[1]) + Number(m[2]));
}

function shortEdgeFt(sizeLabel: string): number {
  const m = sizeLabel.match(/([\d.]+)\s*ft\s*x\s*([\d.]+)\s*ft/i);
  if (!m) return 2;
  return Math.min(Number(m[1]), Number(m[2]));
}

/**
 * The parcel a banner order ships as.
 *
 * Several banners roll into one tube rather than shipping separately, which is why the tube
 * diameter grows with quantity while its length does not - the length is fixed by the short edge of
 * a single banner.
 */
export function bannerParcel(sizeLabel: string, material: string, quantity: number): Parcel {
  const area = areaSqFt(sizeLabel);
  const perimeter = perimeterFt(sizeLabel);

  const vinylOz = area * materialOzPerSqFt(material) * quantity;
  const hemOz = perimeter * HEM_OZ_PER_FT * quantity;
  // Grommets sit at the corners and every two feet around the edge.
  const grommets = Math.max(4, Math.ceil(perimeter / 2)) * quantity;
  const grommetOz = grommets * GROMMET_OZ;

  // Rolled thickness: vinyl is about 0.013 in thick, and a roll's cross-sectional area is the
  // material area seen edge-on. Diameter follows from that plus a 2 in core.
  const VINYL_THICKNESS_IN = 0.013;
  const rolledLengthIn = (area / shortEdgeFt(sizeLabel)) * 12 * quantity;
  const rollCrossSectionIn2 = rolledLengthIn * VINYL_THICKNESS_IN;
  const coreRadiusIn = 1;
  const radiusIn = Math.sqrt(rollCrossSectionIn2 / Math.PI + coreRadiusIn ** 2);
  const diameterIn = Math.max(3, Math.ceil(radiusIn * 2) + 1);

  const tubeLengthIn = Math.ceil(shortEdgeFt(sizeLabel) * 12) + 2;
  const tubeOz = TUBE_BASE_OZ + tubeLengthIn * TUBE_OZ_PER_INCH;

  return {
    lengthIn: tubeLengthIn,
    widthIn: diameterIn,
    heightIn: diameterIn,
    weightOz: Math.round((vinylOz + hemOz + grommetOz + tubeOz) * 10) / 10,
  };
}
