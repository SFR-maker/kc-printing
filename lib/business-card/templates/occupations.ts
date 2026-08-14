/**
 * Occupation and plain-language terms mapped onto template categories.
 *
 * Category slugs are the shop's filing system, not the words customers use. Someone types the job
 * they do - "plumber", "hairdresser", "realtor", "sparky" - and the gallery searched titles and
 * tags literally, so "plumber" did not match the `plumbing` category and "hairdresser" matched
 * nothing at all. Every miss looks to the customer like the shop has no cards for their trade.
 *
 * Terms are deliberately generous: British and American spellings, the job title as well as the
 * trade, informal names, and the adjacent thing people search for when they cannot name the
 * category ("haircut", "wedding photographer", "food truck"). A false positive costs a customer one
 * irrelevant card in a grid; a false negative costs the sale.
 *
 * Pure data with no imports, so the API, the client filter and the seeder all share one source.
 */

export const OCCUPATION_TERMS: Record<string, string[]> = {
  "real-estate": ["realtor", "real estate agent", "estate agent", "broker", "property", "letting", "landlord", "homes", "housing", "realty", "mortgage", "open house"],
  automotive: ["mechanic", "auto repair", "car repair", "garage", "body shop", "detailing", "tyre", "tire", "motor", "vehicle", "autobody", "car wash", "mot"],
  construction: ["builder", "contractor", "construction", "general contractor", "groundworks", "renovation", "remodeling", "remodelling", "civil", "site work", "concrete", "carpenter", "joiner"],
  roofing: ["roofer", "roofing", "roof repair", "shingles", "gutters", "guttering", "flat roof", "slater", "tiler roof"],
  plumbing: ["plumber", "plumbing", "drainage", "drains", "boiler", "heating engineer", "gas fitter", "pipework", "leak", "bathroom fitter"],
  electrical: ["electrician", "electrical", "sparky", "wiring", "rewire", "lighting", "ev charger", "switchboard", "consumer unit"],
  landscaping: ["landscaper", "landscaping", "gardener", "gardening", "lawn care", "lawn mowing", "groundskeeping", "tree surgeon", "arborist", "turf", "hardscaping"],
  cleaning: ["cleaner", "cleaning", "housekeeping", "janitorial", "maid", "domestic cleaning", "commercial cleaning", "carpet cleaning", "window cleaner", "pressure washing"],
  restaurant: ["restaurant", "chef", "cook", "catering", "caterer", "food", "diner", "bistro", "takeaway", "food truck", "kitchen", "menu", "eatery"],
  beauty: ["beauty", "beautician", "esthetician", "aesthetician", "makeup artist", "nails", "manicure", "pedicure", "lashes", "brows", "waxing", "facials", "skincare"],
  "beauty-salon": ["salon", "hairdresser", "hair stylist", "hairstylist", "hair salon", "haircut", "colourist", "colorist", "blow dry", "extensions"],
  barber: ["barber", "barbershop", "barber shop", "mens grooming", "haircut", "beard", "shave", "fade", "clippers"],
  medical: ["doctor", "gp", "physician", "clinic", "medical", "surgery", "practice", "nurse", "healthcare", "health"],
  healthcare: ["healthcare", "health care", "nurse", "carer", "care home", "home care", "physio", "physiotherapy", "chiropractor", "therapist", "wellness"],
  dental: ["dentist", "dental", "orthodontist", "hygienist", "teeth", "braces", "implants", "oral"],
  veterinary: ["vet", "veterinary", "veterinarian", "animal hospital", "pet clinic", "pet health"],
  "professional-services": ["consultant", "professional", "business services", "advisor", "adviser", "agency", "b2b", "corporate"],
  consulting: ["consultant", "consulting", "strategy", "management consultant", "advisory", "coach", "business coach"],
  legal: ["lawyer", "solicitor", "attorney", "law firm", "legal", "barrister", "paralegal", "notary", "conveyancing"],
  accounting: ["accountant", "accounting", "bookkeeper", "bookkeeping", "tax", "cpa", "payroll", "audit", "finance"],
  "financial-services": ["financial adviser", "financial advisor", "finance", "mortgage broker", "wealth", "investment", "banking", "loans", "pensions"],
  insurance: ["insurance", "insurance broker", "underwriter", "claims", "cover", "policy", "risk"],
  technology: ["it", "it support", "software", "developer", "web design", "web developer", "tech", "computer repair", "managed services", "cyber", "saas"],
  "design-marketing": ["designer", "graphic design", "branding", "marketing", "advertising", "creative", "social media", "seo", "copywriter"],
  "marketing-agency": ["marketing agency", "digital agency", "ad agency", "advertising agency", "growth", "ppc", "media buying"],
  "creative-agency": ["creative agency", "studio", "brand studio", "art direction", "creative director"],
  photography: ["photographer", "photography", "photo studio", "wedding photographer", "portrait", "headshots", "videographer", "film maker"],
  architecture: ["architect", "architecture", "architectural", "drafting", "planning", "surveyor", "structural"],
  "interior-design": ["interior designer", "interior design", "home staging", "decor", "styling", "furnishings", "curtains", "blinds"],
  painting: ["painter", "decorator", "painting and decorating", "painter decorator", "wallpapering", "spray painting", "house painter"],
  handyman: ["handyman", "handyperson", "odd jobs", "repairs", "maintenance", "fixer", "diy", "assembly"],
  hvac: ["hvac", "heating", "air conditioning", "aircon", "ac repair", "ventilation", "furnace", "heat pump", "refrigeration"],
  "pest-control": ["pest control", "exterminator", "pest", "rodent", "wasp", "termite", "bed bugs", "fumigation"],
  "pool-service": ["pool", "pool service", "pool cleaning", "hot tub", "spa maintenance", "swimming pool"],
  solar: ["solar", "solar panels", "photovoltaic", "pv", "renewable", "green energy", "battery storage"],
  moving: ["mover", "movers", "removals", "moving company", "man and van", "relocation", "packing", "storage"],
  trucking: ["trucking", "haulage", "freight", "logistics", "lorry", "hgv", "courier", "delivery", "transport"],
  transportation: ["transport", "taxi", "private hire", "chauffeur", "limo", "minibus", "shuttle", "driver"],
  security: ["security", "security guard", "cctv", "alarms", "locksmith", "door supervisor", "surveillance", "access control"],
  fitness: ["personal trainer", "pt", "gym", "fitness", "coach", "bootcamp", "crossfit", "yoga", "pilates", "strength"],
  "sports-fitness": ["sports", "sports club", "athletics", "team", "coaching", "league", "tournament"],
  "spa-massage": ["massage", "masseuse", "massage therapist", "spa", "reflexology", "sports massage", "holistic", "reiki", "wellbeing"],
  tattoo: ["tattoo", "tattoo artist", "tattooist", "piercing", "piercer", "body art", "ink"],
  florist: ["florist", "flowers", "floristry", "bouquets", "wedding flowers", "floral design"],
  "floral-greenery": ["floral", "greenery", "plants", "botanical", "nursery plants", "houseplants"],
  "bakery-cafe": ["baker", "bakery", "cafe", "coffee shop", "barista", "patisserie", "cakes", "cake maker", "coffee", "brunch"],
  childcare: ["childcare", "nursery", "child minder", "childminder", "nanny", "babysitter", "daycare", "creche", "preschool", "early years"],
  "education-childcare": ["education", "school", "teacher", "nursery", "daycare", "learning", "training", "academy"],
  tutoring: ["tutor", "tutoring", "private tutor", "lessons", "exam prep", "maths tutor", "music teacher", "driving instructor"],
  publishing: ["publisher", "publishing", "editor", "author", "writer", "print", "magazine", "bookshop"],
  wedding: ["wedding", "bridal", "bride", "wedding planner", "celebrant", "registrar", "engagement"],
  events: ["events", "event", "party", "celebration", "conference", "festival", "birthday", "anniversary"],
  "event-planning": ["event planner", "event planning", "wedding planner", "party planner", "event management", "coordinator"],
  church: ["church", "ministry", "pastor", "parish", "chapel", "congregation", "faith", "religious", "worship"],
  "non-profit": ["nonprofit", "non profit", "charity", "ngo", "foundation", "community", "volunteer", "fundraising", "trust"],
  nonprofit: ["nonprofit", "non profit", "charity", "ngo", "foundation", "community", "volunteer", "fundraising"],
  "pets-animals": ["pet", "pets", "dog walker", "dog walking", "groomer", "pet grooming", "kennels", "cattery", "dog trainer", "animal"],
  retail: ["retail", "shop", "store", "boutique", "shopkeeper", "merchandise", "ecommerce", "market stall"],
  "law-politics": ["politics", "campaign", "council", "public safety", "police", "fire", "government", "civic"],
  "entertainment-arts": ["musician", "band", "dj", "artist", "performer", "actor", "theatre", "entertainment", "gallery", "arts"],
  "travel-tourism": ["travel", "travel agent", "tourism", "tour guide", "holidays", "hotel", "bnb", "airbnb", "hospitality"],
  holidays: ["holiday", "christmas", "seasonal", "festive", "new year", "thanksgiving", "easter"],
  "appointment-cards": ["appointment", "booking", "reminder", "schedule", "next visit"],
  "general-business": ["general", "small business", "business", "startup", "sole trader", "freelancer", "self employed"],
  "general-corporate": ["corporate", "company", "enterprise", "executive", "office"],
  "general-loyalty": ["loyalty", "loyalty card", "stamp card", "rewards", "punch card", "points"],
  "general-minimalist": ["minimalist", "minimal", "simple", "clean", "plain", "understated"],
  "general-modern": ["modern", "contemporary", "sleek", "current"],
  "general-elegant": ["elegant", "luxury", "premium", "upscale", "classy", "sophisticated", "high end"],
  "general-vintage": ["vintage", "retro", "classic", "antique", "old school", "heritage"],
  "general-colorful": ["colorful", "colourful", "bright", "vibrant", "rainbow", "bold colour"],
  "general-geometric": ["geometric", "shapes", "abstract", "angular", "pattern geometric"],
  "general-patterns": ["pattern", "patterns", "textured", "repeating", "motif"],
  "general-nature": ["nature", "landscape", "outdoors", "scenic", "mountains", "forest", "natural"],
  "general-patriotic": ["patriotic", "flag", "stars and stripes", "national", "veteran", "military"],
  "general-funny": ["funny", "fun", "playful", "humour", "humor", "quirky", "cheeky"],
  "general-thank-you": ["thank you", "thanks", "gratitude", "appreciation"],
  "general-rsvp": ["rsvp", "invitation", "invite", "reply card", "save the date"],
  "general-solid": ["solid", "solid colour", "solid color", "block colour", "plain colour"],
  "general-credit-card": ["credit card", "metal card", "black card", "membership card", "vip"],
  "general-popular": ["popular", "best seller", "bestseller", "top", "most popular"],
};

/** Normalises for comparison: lowercase, collapse whitespace and punctuation. */
export function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Category slugs whose occupation terms match the query.
 *
 * Substring in both directions on purpose: "plumb" should reach "plumber", and typing the full
 * "emergency plumber" should still reach the "plumber" term.
 */
export function categoriesForQuery(query: string): string[] {
  const q = normalise(query);
  if (q.length < 2) return [];
  const tokens = q.split(" ").filter((w) => w.length >= 3);
  const hits: string[] = [];
  for (const [slug, terms] of Object.entries(OCCUPATION_TERMS)) {
    const nSlug = normalise(slug);
    const match =
      nSlug.includes(q) ||
      tokens.some((t) => nSlug.includes(t)) ||
      terms.some((t) => {
        const n = normalise(t);
        return n.includes(q) || q.includes(n) || tokens.some((tok) => n.includes(tok));
      });
    if (match) hits.push(slug);
  }
  return hits;
}

/**
 * Splits a query into meaningful words.
 *
 * Customers type phrases, and the matcher only ever compared the whole string. "spring sale"
 * returned nothing while "sale" returned 26, and "flower shop" returned ten generic retail cards
 * while "florist" found the right ones. Both are the phrasing a customer reaches for first.
 *
 * Very short words are dropped so "a"/"of" do not match everything.
 */
export function queryTokens(query: string): string[] {
  return normalise(query).split(" ").filter((w) => w.length >= 3);
}

/**
 * True when `haystack` matches the query, whole-phrase first and then by word.
 *
 * Whole-phrase is tried first so an exact match still ranks as a match; falling back to any single
 * word is what makes a phrase behave like a search rather than an exact lookup.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const h = normalise(haystack);
  const q = normalise(query);
  // Three, not two: "of" is a substring of "roof", so a two-character query matched roofing and
  // most of the catalogue with it.
  if (q.length < 3) return false;
  if (h.includes(q)) return true;
  const tokens = queryTokens(query);
  return tokens.length > 0 && tokens.some((t) => h.includes(t));
}

/** Every search term for a category, for baking into a template's tags at seed time. */
export function termsForCategory(slug: string): string[] {
  return OCCUPATION_TERMS[slug] ?? [];
}
