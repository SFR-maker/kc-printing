import * as icons from "lucide-react";

export interface IconCategoryDef {
  key: string;
  label: string;
  icons: string[];
}

/** Curated lucide-react icon names, verified against the installed package. No brand/logo icons —
 * lucide-react ships none (avoids trademark issues on customer-designed cards); social/communication
 * categories use generic icons (Share2, MessageCircle, AtSign) instead of platform logos. */
export const ICON_CATEGORIES: IconCategoryDef[] = [
  { key: "business", label: "Business", icons: ["Briefcase", "Building", "Building2", "Store", "Factory", "Handshake", "TrendingUp", "BarChart3", "PieChart", "Target", "Award", "Trophy", "Medal", "Crown"] },
  { key: "communication", label: "Communication", icons: ["Phone", "Mail", "MessageCircle", "MessageSquare", "Send", "AtSign", "Share2", "Rss", "Megaphone", "Bell", "Globe", "Wifi"] },
  { key: "money", label: "Money & Finance", icons: ["DollarSign", "CreditCard", "Wallet", "Coins", "PiggyBank", "Receipt", "ShoppingCart", "ShoppingBag", "Tag", "Percent", "Gem", "Diamond"] },
  { key: "food", label: "Food & Drink", icons: ["Coffee", "Utensils", "UtensilsCrossed", "Pizza", "IceCream", "Cake", "Wine", "Beer", "Cherry", "Apple", "Fish", "ChefHat"] },
  { key: "nature", label: "Nature", icons: ["Leaf", "TreePine", "Trees", "Flower", "Flower2", "Sprout", "Sun", "Moon", "Cloud", "Snowflake", "Droplet", "Mountain", "Waves", "Recycle"] },
  { key: "animals", label: "Animals", icons: ["Cat", "Dog", "Rabbit", "Bird", "Fish", "PawPrint", "Bug", "Squirrel", "Turtle"] },
  { key: "travel", label: "Travel", icons: ["Plane", "Car", "Truck", "Ship", "Train", "Bike", "MapPin", "MapPinned", "Compass", "Luggage", "Tent", "Umbrella", "Palmtree", "Anchor"] },
  { key: "technology", label: "Technology", icons: ["Laptop", "Smartphone", "Monitor", "Cpu", "Database", "Server", "Bluetooth", "Battery", "Rocket", "Bot", "Code", "Terminal", "Camera", "Video"] },
  { key: "health", label: "Health & Fitness", icons: ["Stethoscope", "HeartPulse", "Pill", "Syringe", "Dumbbell", "Activity", "Heart", "Cross"] },
  { key: "home-trade", label: "Home & Trade", icons: ["Wrench", "Hammer", "Ruler", "PaintBucket", "Paintbrush", "Scissors", "Key", "Lock", "Shield", "ShieldCheck", "Home", "Lightbulb"] },
  { key: "arrows", label: "Arrows & Symbols", icons: ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "ArrowUpRight", "ChevronRight", "Check", "CheckCircle2", "X", "Plus", "Minus", "Star", "Sparkles", "Flag", "Bookmark"] },
  { key: "misc", label: "Misc & Holidays", icons: ["Book", "GraduationCap", "School", "Calendar", "Clock", "Gift", "PartyPopper", "Candy", "Ghost", "Music", "Music2", "Headphones", "Palette", "Puzzle"] },
];

export function isValidIconName(name: string): name is keyof typeof icons {
  return name in icons;
}

export function getIconComponent(name: string) {
  if (!isValidIconName(name)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (icons as any)[name] as React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;
}
