/**
 * The message is the template.
 *
 * For a business card the industry is the useful axis, because the card always says the same thing
 * (who you are) and only looks different. For the other products the opposite is true: a banner
 * always looks broadly the same and the MESSAGE is what the customer is shopping for. Nobody
 * searches for "a teal banner", they search for "grand opening banner".
 *
 * So banners, signs and decals are filed by occasion or job, and postcards by offer type.
 */

export interface Message {
  key: string;
  /** Category the template is filed under, matching the gallery's industry filter. */
  group: string;
  headline: string;
  sub: string;
  /** Extra search terms customers use for this message. */
  terms: string[];
}

const m = (key: string, group: string, headline: string, sub: string, terms: string[] = []): Message =>
  ({ key, group, headline, sub, terms });

export const BANNER_MESSAGES: Message[] = [
  m("grand-opening", "business", "GRAND OPENING", "Saturday 10am - 4pm", ["opening", "new store", "launch"]),
  m("now-open", "business", "NOW OPEN", "Come in and say hello", ["open", "trading"]),
  m("opening-soon", "business", "OPENING SOON", "Watch this space", ["coming soon"]),
  m("coming-soon", "business", "COMING SOON", "Something new is on the way", ["soon"]),
  m("now-hiring", "business", "NOW HIRING", "Apply inside today", ["jobs", "recruiting", "vacancies", "help wanted"]),
  m("help-wanted", "business", "HELP WANTED", "Full and part time", ["jobs", "staff"]),
  m("sale", "business", "SALE", "Up to 50% off", ["discount", "clearance", "offers"]),
  m("clearance", "business", "CLEARANCE", "Everything must go", ["closing down", "final"]),
  m("closing-down", "business", "CLOSING DOWN", "Final reductions", ["last days"]),
  m("under-new-management", "business", "UNDER NEW MANAGEMENT", "Same place, fresh start", ["new owner"]),
  m("new-location", "business", "WE HAVE MOVED", "Find us at our new home", ["relocated", "new address"]),
  m("free-estimates", "business", "FREE ESTIMATES", "Call today", ["quote", "free quote"]),

  m("open-house", "real-estate", "OPEN HOUSE", "Sunday 1pm - 4pm", ["viewing", "realtor"]),
  m("for-sale", "real-estate", "FOR SALE", "Enquire today", ["property", "house"]),
  m("sold", "real-estate", "SOLD", "Another one moved", ["under offer"]),
  m("new-listing", "real-estate", "NEW LISTING", "Just on the market", ["just listed"]),
  m("for-lease", "real-estate", "FOR LEASE", "Commercial space available", ["to let", "rental"]),
  m("land-for-sale", "real-estate", "LAND FOR SALE", "Development opportunity", ["plot", "acreage"]),

  m("birthday", "events", "HAPPY BIRTHDAY", "Come celebrate with us", ["party", "celebration"]),
  m("graduation", "events", "CONGRATULATIONS GRAD", "Class of 2026", ["graduate", "school"]),
  m("wedding", "events", "JUST MARRIED", "Celebrate with us", ["bride", "reception"]),
  m("baby-shower", "events", "BABY SHOWER", "Join us to celebrate", ["new baby"]),
  m("anniversary", "events", "HAPPY ANNIVERSARY", "Here is to many more", ["years together"]),
  m("retirement", "events", "HAPPY RETIREMENT", "Thank you for everything", ["farewell", "leaving"]),
  m("reunion", "events", "FAMILY REUNION", "All welcome", ["get together"]),
  m("welcome-home", "events", "WELCOME HOME", "We missed you", ["homecoming"]),

  m("5k-run", "community", "5K FUN RUN", "Register at the tent", ["race", "marathon", "charity run"]),
  m("charity-drive", "community", "CHARITY DRIVE", "Every donation helps", ["fundraiser", "collection"]),
  m("food-drive", "community", "FOOD DRIVE", "Donations welcome here", ["pantry", "collection"]),
  m("blood-drive", "community", "BLOOD DRIVE", "Give an hour, save a life", ["donate blood"]),
  m("fundraiser", "community", "FUNDRAISER", "Support our cause", ["charity", "donate"]),
  m("festival", "community", "SUMMER FESTIVAL", "Live music and food", ["fair", "carnival"]),
  m("church-service", "community", "ALL WELCOME", "Sundays at 10am", ["worship", "service"]),
  m("school-event", "community", "SCHOOL FAIR", "Saturday from noon", ["pta", "fete"]),

  m("entrance", "directional", "ENTRANCE", "This way in", ["entry", "in"]),
  m("exit", "directional", "EXIT", "This way out", ["out", "way out"]),
  m("parking", "directional", "PARKING", "Follow the arrows", ["car park", "lot"]),
  m("registration", "directional", "REGISTRATION", "Sign in here", ["check in", "sign up"]),
  m("check-in", "directional", "CHECK IN", "Please have ID ready", ["reception"]),
  m("this-way", "directional", "THIS WAY", "Keep going", ["arrow", "follow"]),
  m("event-here", "directional", "EVENT HERE", "You have arrived", ["venue"]),
  m("restrooms", "directional", "RESTROOMS", "Down the hall", ["toilets", "wc"]),
];

export const POSTCARD_MESSAGES: Message[] = [
  m("service-sale", "business", "SPRING SERVICE SALE", "Save 20% through May", ["discount", "seasonal"]),
  m("new-customer", "business", "NEW CUSTOMER OFFER", "20% off your first visit", ["introductory", "welcome"]),
  m("grand-opening", "business", "WE ARE OPEN", "Come and see us this week", ["opening", "launch"]),
  m("we-moved", "business", "WE HAVE MOVED", "Find us at our new address", ["relocated"]),
  m("thank-you", "business", "THANK YOU", "We appreciate your business", ["gratitude", "loyalty"]),
  m("referral", "business", "REFER A FRIEND", "Both of you save 15%", ["recommend"]),
  m("appointment-reminder", "appointment-cards", "TIME FOR YOUR CHECK UP", "Book your next visit", ["reminder", "due"]),
  m("seasonal-tune-up", "business", "BOOK YOUR TUNE UP", "Before the season starts", ["maintenance", "service"]),
  m("holiday-offer", "holidays", "HOLIDAY SPECIAL", "Gift cards available now", ["christmas", "seasonal"]),
  m("free-quote", "business", "FREE QUOTE", "No obligation, no pressure", ["estimate"]),
  m("open-house-pc", "real-estate", "OPEN HOUSE", "Sunday 1pm - 4pm", ["viewing"]),
  m("just-sold", "real-estate", "JUST SOLD ON YOUR STREET", "Curious what yours is worth?", ["valuation", "market"]),
  m("home-valuation", "real-estate", "WHAT IS YOUR HOME WORTH?", "Free valuation this month", ["appraisal"]),
  m("menu-offer", "restaurant", "TWO FOR ONE TUESDAYS", "All month long", ["deal", "dining"]),
  m("new-menu", "restaurant", "OUR NEW MENU", "Now serving from 5pm", ["dinner"]),
  m("grand-reopening", "business", "WE ARE BACK", "Newly refurbished", ["reopening"]),
  m("class-signup", "fitness", "FIRST CLASS FREE", "Start this week", ["gym", "trial"]),
  m("spring-clean", "cleaning", "SPRING CLEAN SPECIAL", "Deep clean from $99", ["deep clean"]),
];

export const SIGN_MESSAGES: Message[] = [
  m("roof-repair", "roofing", "ROOF REPAIR", "Free Estimates", ["roofer", "leaks"]),
  m("plumbing", "plumbing", "PLUMBING", "24 Hour Callout", ["plumber", "emergency"]),
  m("electrical", "electrical", "ELECTRICIAN", "Fully Certified", ["sparky", "rewire"]),
  m("lawn-care", "landscaping", "LAWN CARE", "Weekly Service", ["mowing", "gardener"]),
  m("tree-service", "landscaping", "TREE SERVICE", "Free Estimates", ["arborist", "removal"]),
  m("house-cleaning", "cleaning", "HOUSE CLEANING", "Insured and Bonded", ["cleaner", "maid"]),
  m("painting", "painting", "PAINTING", "Interior and Exterior", ["decorator", "painter"]),
  m("remodeling", "construction", "REMODELING", "Kitchens and Baths", ["builder", "renovation"]),
  m("hvac", "hvac", "HEATING AND AIR", "Same Day Service", ["hvac", "aircon"]),
  m("pest-control", "pest-control", "PEST CONTROL", "Same Day Service", ["exterminator"]),
  m("auto-repair", "automotive", "AUTO REPAIR", "While You Wait", ["mechanic", "garage"]),
  m("for-sale-sign", "real-estate", "FOR SALE", "By Appointment", ["property"]),
  m("open-house-sign", "real-estate", "OPEN HOUSE", "Sunday 1 - 4", ["viewing"]),
  m("garage-sale", "events", "GARAGE SALE", "Saturday 8am", ["yard sale", "car boot"]),
  m("now-hiring-sign", "business", "NOW HIRING", "Apply Inside", ["jobs", "staff"]),
  m("vote", "law-politics", "VOTE", "November 3rd", ["election", "campaign"]),
  m("private-property", "security", "PRIVATE PROPERTY", "No Trespassing", ["keep out"]),
  m("beware-dog", "pets-animals", "BEWARE OF DOG", "Please Keep Gate Shut", ["dog", "warning"]),
  m("wet-paint", "painting", "WET PAINT", "Please Do Not Touch", ["caution"]),
  m("snow-removal", "landscaping", "SNOW REMOVAL", "Book Now", ["plowing", "gritting"]),
];

export const DECAL_MESSAGES: Message[] = [
  m("diner-hours", "restaurant", "KANSAS CITY DINER", "Open Mon - Sat  ·  7am - 3pm", ["cafe", "hours"]),
  m("cafe-open", "bakery-cafe", "THE CORNER CAFE", "Coffee from 6am daily", ["coffee", "bakery"]),
  m("salon-hours", "beauty-salon", "STUDIO HAIR", "Tue - Sat  ·  9am - 6pm", ["salon", "hairdresser"]),
  m("barber-hours", "barber", "MAIN ST BARBERS", "Walk-ins Welcome", ["barber", "haircut"]),
  m("shop-open", "retail", "OPEN", "Mon - Sat  ·  9am - 5:30pm", ["opening hours", "trading"]),
  m("push-pull", "retail", "PUSH", "Thank you", ["door", "entrance"]),
  m("clinic-hours", "medical", "FAMILY CLINIC", "Appointments  ·  (816) 555-0100", ["doctor", "surgery"]),
  m("dental-hours", "dental", "SMILE DENTAL", "New Patients Welcome", ["dentist"]),
  m("gym-hours", "fitness", "IRON WORKS GYM", "Open 5am - 10pm Daily", ["gym", "fitness"]),
  m("vet-hours", "veterinary", "CITY VETS", "Emergencies  ·  (816) 555-0100", ["vet", "animal"]),
  m("bar-hours", "restaurant", "THE TAP ROOM", "Open Until Late", ["bar", "pub"]),
  m("wifi-here", "retail", "FREE WIFI", "Ask at the counter", ["wifi", "internet"]),
  m("delivery-here", "retail", "DELIVERIES", "Please use side door", ["deliveries", "goods in"]),
  m("card-accepted", "retail", "CARD PAYMENTS WELCOME", "No minimum spend", ["contactless", "payments"]),
  m("closed-holiday", "retail", "CLOSED FOR THE HOLIDAY", "Back on the 2nd", ["closed", "holiday"]),
  m("book-online", "beauty", "BOOK ONLINE", "yourbusiness.com", ["booking", "appointments"]),
];

export const MESSAGES_BY_PRODUCT: Record<string, Message[]> = {
  banner: BANNER_MESSAGES,
  postcard: POSTCARD_MESSAGES,
  "rigid-sign": SIGN_MESSAGES,
  "window-decal": DECAL_MESSAGES,
};
