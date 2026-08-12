/**
 * What a banner is actually *for*.
 *
 * The banner library was generated the same way the business card library is: one layout per
 * industry, so a plumber got a plumbing banner and a florist got a florist banner. That is the wrong
 * axis. Nobody buys "a roofing banner" - they buy a GRAND OPENING banner, or a 5K, or an OPEN HOUSE,
 * and the trade behind it is a line of contact details at the bottom.
 *
 * Organised by occasion, the same catalogue answers the question people arrive with. The industry
 * axis is kept for business cards, where it genuinely is the thing being expressed.
 */

export type OccasionGroup = "Business" | "Events" | "Community" | "Directional" | "Real Estate";

export interface BannerOccasion {
  key: string;
  group: OccasionGroup;
  /** What the customer is looking for, and what the template is titled. */
  label: string;
  /** The dominant line. Kept short - this is read from across a car park. */
  headline: string;
  /** The supporting line, or empty where the headline says everything. */
  subline: string;
  /** The bottom bar: what to do next. */
  cta: string;
  /** [dominant, accent, ink] - chosen for the mood of the occasion, not for a trade. */
  palette: [string, string, string];
}

export const BANNER_OCCASIONS: BannerOccasion[] = [
  // ── Business ──────────────────────────────────────────────────────────────
  { key: "grand-opening", group: "Business", label: "Grand Opening", headline: "GRAND OPENING", subline: "Come and see us", cta: "", palette: ["#C4006B", "#FBC800", "#FFFFFF"] },
  { key: "opening-soon", group: "Business", label: "Opening Soon", headline: "OPENING SOON", subline: "Something new is coming here", cta: "", palette: ["#0F172A", "#FBC800", "#FFFFFF"] },
  { key: "now-open", group: "Business", label: "Now Open", headline: "NOW OPEN", subline: "Walk-ins welcome", cta: "", palette: ["#10B981", "#0B3B2E", "#FFFFFF"] },
  { key: "coming-soon", group: "Business", label: "Coming Soon", headline: "COMING SOON", subline: "Watch this space", cta: "", palette: ["#1D3557", "#E6007E", "#FFFFFF"] },
  { key: "new-location", group: "Business", label: "New Location", headline: "WE'VE MOVED", subline: "Find us at our new home", cta: "", palette: ["#0099D8", "#0B2545", "#FFFFFF"] },
  { key: "store-hours", group: "Business", label: "Store Hours", headline: "STORE HOURS", subline: "Mon–Fri 9–6 · Sat 10–4 · Sun closed", cta: "", palette: ["#121110", "#FBC800", "#FFFFFF"] },
  { key: "sale", group: "Business", label: "Sale", headline: "SALE", subline: "Up to 50% off everything", cta: "", palette: ["#DC2626", "#111827", "#FFFFFF"] },
  { key: "clearance", group: "Business", label: "Clearance", headline: "CLEARANCE", subline: "Everything must go", cta: "", palette: ["#F2900C", "#1B1B1B", "#FFFFFF"] },
  { key: "now-hiring", group: "Business", label: "Now Hiring", headline: "NOW HIRING", subline: "Good people, good pay", cta: "Apply inside", palette: ["#0A6E63", "#FBC800", "#FFFFFF"] },
  { key: "help-wanted", group: "Business", label: "Help Wanted", headline: "HELP WANTED", subline: "Full and part time", cta: "Ask at the counter", palette: ["#1F4E79", "#E8641B", "#FFFFFF"] },
  { key: "under-new-management", group: "Business", label: "Under New Management", headline: "UNDER NEW MANAGEMENT", subline: "Same place, fresh start", cta: "", palette: ["#4A3F35", "#D6C7A1", "#FFFFFF"] },

  // ── Events ────────────────────────────────────────────────────────────────
  { key: "birthday", group: "Events", label: "Birthday", headline: "HAPPY BIRTHDAY", subline: "", cta: "", palette: ["#E6007E", "#FBC800", "#FFFFFF"] },
  { key: "graduation", group: "Events", label: "Graduation", headline: "CONGRATULATIONS", subline: "Class of 2026", cta: "", palette: ["#123C69", "#C9A24B", "#FFFFFF"] },
  { key: "wedding", group: "Events", label: "Wedding", headline: "CELEBRATE", subline: "Together at last", cta: "", palette: ["#7C6A5A", "#F3EDE4", "#2A241F"] },
  { key: "baby-shower", group: "Events", label: "Baby Shower", headline: "BABY SHOWER", subline: "Come and celebrate", cta: "", palette: ["#60A3D9", "#FDE68A", "#FFFFFF"] },
  { key: "bridal-shower", group: "Events", label: "Bridal Shower", headline: "BRIDAL SHOWER", subline: "Join us", cta: "", palette: ["#D4A5A5", "#3E2C2C", "#FFFFFF"] },
  { key: "anniversary", group: "Events", label: "Anniversary", headline: "HAPPY ANNIVERSARY", subline: "", cta: "", palette: ["#7A1E1E", "#F2E8CF", "#FFFFFF"] },
  { key: "retirement", group: "Events", label: "Retirement", headline: "HAPPY RETIREMENT", subline: "Enjoy every minute", cta: "", palette: ["#0B6E4F", "#FBC800", "#FFFFFF"] },
  { key: "family-reunion", group: "Events", label: "Family Reunion", headline: "FAMILY REUNION", subline: "All welcome", cta: "", palette: ["#8C5A2B", "#F5E6D0", "#FFFFFF"] },
  { key: "school-event", group: "Events", label: "School Event", headline: "SCHOOL EVENT", subline: "Everyone welcome", cta: "", palette: ["#1E3A8A", "#FBC800", "#FFFFFF"] },
  { key: "sports-event", group: "Events", label: "Sports Event", headline: "GAME DAY", subline: "Come and support the team", cta: "", palette: ["#111111", "#22D3EE", "#FFFFFF"] },
  { key: "fundraiser", group: "Events", label: "Fundraiser", headline: "FUNDRAISER", subline: "Every donation counts", cta: "", palette: ["#166534", "#FDE047", "#FFFFFF"] },

  // ── Community ─────────────────────────────────────────────────────────────
  { key: "5k-run", group: "Community", label: "5K Run", headline: "5K RUN", subline: "Race day — all abilities", cta: "Register on the day", palette: ["#F2900C", "#111827", "#FFFFFF"] },
  { key: "charity-drive", group: "Community", label: "Charity Drive", headline: "CHARITY DRIVE", subline: "Give what you can", cta: "", palette: ["#4C1D95", "#E9D5FF", "#FFFFFF"] },
  { key: "food-drive", group: "Community", label: "Food Drive", headline: "FOOD DRIVE", subline: "Donations welcome here", cta: "", palette: ["#14532D", "#84CC16", "#FFFFFF"] },
  { key: "blood-drive", group: "Community", label: "Blood Drive", headline: "BLOOD DRIVE", subline: "Give blood, save a life", cta: "Walk-ins welcome", palette: ["#B91C1C", "#111111", "#FFFFFF"] },
  { key: "community-event", group: "Community", label: "Community Event", headline: "COMMUNITY DAY", subline: "Everyone welcome", cta: "", palette: ["#0369A1", "#7DD3FC", "#FFFFFF"] },
  { key: "festival", group: "Community", label: "Festival", headline: "FESTIVAL", subline: "Food · Music · Family", cta: "", palette: ["#DB2777", "#FBC800", "#FFFFFF"] },
  { key: "church-event", group: "Community", label: "Church Event", headline: "ALL ARE WELCOME", subline: "Join us this Sunday", cta: "", palette: ["#4A3F35", "#D6C7A1", "#FFFFFF"] },

  // ── Directional ───────────────────────────────────────────────────────────
  { key: "entrance", group: "Directional", label: "Entrance", headline: "ENTRANCE", subline: "", cta: "", palette: ["#10B981", "#0B3B2E", "#FFFFFF"] },
  { key: "exit", group: "Directional", label: "Exit", headline: "EXIT", subline: "", cta: "", palette: ["#DC2626", "#111111", "#FFFFFF"] },
  { key: "parking", group: "Directional", label: "Parking", headline: "PARKING", subline: "", cta: "", palette: ["#1D3557", "#FBC800", "#FFFFFF"] },
  { key: "registration", group: "Directional", label: "Registration", headline: "REGISTRATION", subline: "Sign in here", cta: "", palette: ["#0099D8", "#0B2545", "#FFFFFF"] },
  { key: "check-in", group: "Directional", label: "Check In", headline: "CHECK IN", subline: "Please have your details ready", cta: "", palette: ["#0A6E63", "#FBC800", "#FFFFFF"] },
  { key: "this-way", group: "Directional", label: "This Way", headline: "THIS WAY", subline: "", cta: "", palette: ["#F2900C", "#111111", "#FFFFFF"] },
  { key: "event-here", group: "Directional", label: "Event Here", headline: "EVENT HERE", subline: "", cta: "", palette: ["#4C1D95", "#FBC800", "#FFFFFF"] },

  // ── Real Estate ───────────────────────────────────────────────────────────
  { key: "open-house", group: "Real Estate", label: "Open House", headline: "OPEN HOUSE", subline: "Saturday & Sunday, 12–4", cta: "", palette: ["#123C69", "#C9A24B", "#FFFFFF"] },
  { key: "for-sale", group: "Real Estate", label: "For Sale", headline: "FOR SALE", subline: "", cta: "Call for a viewing", palette: ["#0B2545", "#E6007E", "#FFFFFF"] },
  { key: "new-listing", group: "Real Estate", label: "New Listing", headline: "NEW LISTING", subline: "Just on the market", cta: "", palette: ["#0F766E", "#FBBF24", "#FFFFFF"] },
  { key: "sold", group: "Real Estate", label: "Sold", headline: "SOLD", subline: "Another one moved", cta: "", palette: ["#B91C1C", "#111111", "#FFFFFF"] },
  { key: "leasing", group: "Real Estate", label: "Leasing", headline: "NOW LEASING", subline: "Units available", cta: "Call for details", palette: ["#1F4E79", "#E8641B", "#FFFFFF"] },
  { key: "commercial-property", group: "Real Estate", label: "Commercial Property", headline: "COMMERCIAL SPACE", subline: "Available now", cta: "", palette: ["#18181B", "#A1A1AA", "#FFFFFF"] },
  { key: "new-development", group: "Real Estate", label: "New Development", headline: "NEW DEVELOPMENT", subline: "Coming to this site", cta: "", palette: ["#3F3A36", "#C8B6A6", "#FFFFFF"] },
];

/** Groups, in the order the gallery should offer them. */
export const OCCASION_GROUPS: OccasionGroup[] = [
  "Business", "Events", "Community", "Directional", "Real Estate",
];
