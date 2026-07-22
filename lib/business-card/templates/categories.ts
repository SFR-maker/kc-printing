export interface CategoryContent {
  key: string;
  label: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  palette: [string, string, string]; // primary, secondary, ink/neutral
  headingFont: string;
  bodyFont: string;
}

export const CATEGORIES: CategoryContent[] = [
  { key: "real-estate", label: "Real Estate", name: "Dana Whitfield", title: "Realtor", company: "Whitfield & Co. Realty", phone: "(816) 555-0142", email: "dana@whitfieldrealty.com", website: "whitfieldrealty.com", address: "412 Main St, Kansas City, MO", palette: ["#123C69", "#C9A24B", "#111111"], headingFont: "Playfair Display", bodyFont: "Inter" },
  { key: "construction", label: "Construction", name: "Marcus Reilly", title: "General Contractor", company: "Reilly Construction Co.", phone: "(816) 555-0198", email: "marcus@reillybuilds.com", website: "reillybuilds.com", address: "88 Industrial Pkwy, KCMO", palette: ["#D9531E", "#1B1B1B", "#F4F1EC"], headingFont: "Oswald", bodyFont: "Inter" },
  { key: "roofing", label: "Roofing", name: "Tom Baxter", title: "Owner", company: "Baxter Roofing & Exteriors", phone: "(913) 555-0110", email: "tom@baxterroofing.com", website: "baxterroofing.com", address: "205 Shingle Rd, Overland Park, KS", palette: ["#2B2D42", "#EF233C", "#F5F5F5"], headingFont: "Oswald", bodyFont: "Roboto" },
  { key: "plumbing", label: "Plumbing", name: "Carla Nguyen", title: "Master Plumber", company: "Nguyen Plumbing & Drain", phone: "(816) 555-0176", email: "carla@nguyenplumbing.com", website: "nguyenplumbing.com", address: "77 Pipeline Ave, KCMO", palette: ["#0B6E4F", "#0A3D62", "#FFFFFF"], headingFont: "Montserrat", bodyFont: "Inter" },
  { key: "electrical", label: "Electrical", name: "Devon Marsh", title: "Licensed Electrician", company: "Marsh Electric", phone: "(816) 555-0133", email: "devon@marshelectric.com", website: "marshelectric.com", address: "19 Volt St, KCMO", palette: ["#F2B705", "#1C1C1C", "#FFFFFF"], headingFont: "Space Grotesk", bodyFont: "Inter" },
  { key: "landscaping", label: "Landscaping", name: "Renee Ford", title: "Owner", company: "Ford Landscape Design", phone: "(913) 555-0184", email: "renee@fordlandscape.com", website: "fordlandscape.com", address: "500 Garden Way, Overland Park, KS", palette: ["#2D6A4F", "#95D5B2", "#1B1B1B"], headingFont: "Merriweather", bodyFont: "Inter" },
  { key: "cleaning", label: "Cleaning Services", name: "Priya Shah", title: "Founder", company: "Shah Sparkle Cleaning Co.", phone: "(816) 555-0121", email: "priya@sparklecleanco.com", website: "sparklecleanco.com", address: "33 Fresh Ln, KCMO", palette: ["#3DA5D9", "#EAF6FF", "#0B2545"], headingFont: "Poppins", bodyFont: "Inter" },
  { key: "automotive", label: "Automotive", name: "Ray Delgado", title: "Shop Owner", company: "Delgado Auto Repair", phone: "(816) 555-0155", email: "ray@delgadoauto.com", website: "delgadoauto.com", address: "1200 Torque Rd, KCMO", palette: ["#1B1B1B", "#E63946", "#F1FAEE"], headingFont: "Oswald", bodyFont: "Roboto" },
  { key: "restaurant", label: "Restaurants & Catering", name: "Sofia Ricci", title: "Chef & Owner", company: "Ricci Table Catering", phone: "(816) 555-0167", email: "sofia@riccitable.com", website: "riccitable.com", address: "64 Basil St, KCMO", palette: ["#7A1E1E", "#F2E8CF", "#1B1B1B"], headingFont: "Playfair Display", bodyFont: "Lora" },
  { key: "beauty-salon", label: "Beauty & Salon", name: "Amara Belle", title: "Stylist & Owner", company: "Belle Studio Salon", phone: "(913) 555-0143", email: "amara@bellestudio.com", website: "bellestudio.com", address: "9 Blush Ave, Overland Park, KS", palette: ["#D4A5A5", "#3E2C2C", "#FFF7F5"], headingFont: "Playfair Display", bodyFont: "Poppins" },
  { key: "healthcare", label: "Healthcare", name: "Dr. Alan Okafor", title: "Family Physician", company: "Okafor Family Health", phone: "(816) 555-0109", email: "aokafor@okaforhealth.com", website: "okaforhealth.com", address: "455 Wellness Blvd, KCMO", palette: ["#0B7285", "#E7F5F8", "#12232E"], headingFont: "Merriweather", bodyFont: "Inter" },
  { key: "dental", label: "Dental", name: "Dr. Lisa Chen", title: "Dentist, DDS", company: "Chen Family Dental", phone: "(913) 555-0128", email: "info@chenfamilydental.com", website: "chenfamilydental.com", address: "3200 Smile Way, Overland Park, KS", palette: ["#2C7A7B", "#EAFBFB", "#173F3F"], headingFont: "Montserrat", bodyFont: "Inter" },
  { key: "legal", label: "Legal", name: "James Whitfield", title: "Managing Partner", company: "Whitfield Law Group", phone: "(816) 555-0175", email: "james@whitfieldlaw.com", website: "whitfieldlaw.com", address: "700 Courthouse Sq, KCMO", palette: ["#111827", "#B08D57", "#F5F4F0"], headingFont: "Playfair Display", bodyFont: "Inter" },
  { key: "accounting", label: "Accounting & Finance", name: "Nora Patel", title: "CPA", company: "Patel Accounting Group", phone: "(816) 555-0161", email: "nora@patelcpa.com", website: "patelcpa.com", address: "88 Ledger Ln, KCMO", palette: ["#0A3D62", "#60A3D9", "#F5F7FA"], headingFont: "Roboto", bodyFont: "Inter" },
  { key: "insurance", label: "Insurance", name: "Greg Hoffman", title: "Insurance Agent", company: "Hoffman Insurance Partners", phone: "(913) 555-0139", email: "greg@hoffmanins.com", website: "hoffmanins.com", address: "14 Assurance Dr, Overland Park, KS", palette: ["#1D3557", "#457B9D", "#F1FAEE"], headingFont: "Montserrat", bodyFont: "Inter" },
  { key: "technology", label: "Technology", name: "Zoe Kim", title: "Founder & CEO", company: "Kimwave Technologies", phone: "(816) 555-0117", email: "zoe@kimwave.io", website: "kimwave.io", address: "100 Innovation Dr, KCMO", palette: ["#5B21B6", "#111827", "#F5F3FF"], headingFont: "Space Grotesk", bodyFont: "Inter" },
  { key: "creative-agency", label: "Creative Agency", name: "Theo Marsh", title: "Creative Director", company: "Marsh & Co. Studio", phone: "(816) 555-0104", email: "theo@marshstudio.co", website: "marshstudio.co", address: "21 Palette St, KCMO", palette: ["#FF6B35", "#004E89", "#FFF8F0"], headingFont: "Poppins", bodyFont: "Space Grotesk" },
  { key: "photography", label: "Photography", name: "Isla Moreno", title: "Photographer", company: "Isla Moreno Photography", phone: "(913) 555-0192", email: "isla@islamoreno.com", website: "islamoreno.com", address: "5 Aperture Ave, Overland Park, KS", palette: ["#1B1B1B", "#D8CAB8", "#FFFFFF"], headingFont: "DM Serif Display", bodyFont: "Inter" },
  { key: "consulting", label: "Consulting", name: "Ben Carver", title: "Principal Consultant", company: "Carver Strategy Partners", phone: "(816) 555-0186", email: "ben@carverstrategy.com", website: "carverstrategy.com", address: "900 Advisory Way, KCMO", palette: ["#0F172A", "#94A3B8", "#F8FAFC"], headingFont: "Raleway", bodyFont: "Inter" },
  { key: "general-corporate", label: "General Corporate", name: "Alicia Nguyen", title: "Director of Operations", company: "Bloom Corporate Group", phone: "(816) 555-0150", email: "alicia@bloomcorp.com", website: "bloomcorp.com", address: "300 Enterprise Blvd, KCMO", palette: ["#0A6E63", "#F2B705", "#111111"], headingFont: "Inter", bodyFont: "Inter" },
];

export const STYLE_TAGS = ["minimal", "modern", "luxury", "bold", "corporate", "elegant", "geometric", "friendly", "industrial", "creative"] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];
