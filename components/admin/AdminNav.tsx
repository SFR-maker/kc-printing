"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes, ClipboardCheck, FolderKanban, Globe, Image, LayoutDashboard, Package, ScrollText,
  Search, Settings2, Sparkles, Star, Tag, Upload, Users, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Grouped rather than one flat list of sixteen links.
 *
 * The old nav put "Orders" and "SEO" side by side at equal weight, which is fine for a developer who
 * knows the codebase and useless for whoever is actually running the shop day to day. Daily work
 * comes first, everything else is filed behind a heading.
 */
const GROUPS: { heading: string; items: { href: string; label: string; icon: typeof Package }[] }[] = [
  {
    heading: "Every day",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders", icon: Package },
      { href: "/admin/projects", label: "Design jobs", icon: FolderKanban },
      { href: "/admin/uploads", label: "Customer files", icon: Upload },
    ],
  },
  {
    heading: "Money",
    items: [
      { href: "/admin/pricing", label: "Pricing", icon: Settings2 },
      { href: "/admin/coupons", label: "Coupons", icon: Tag },
      { href: "/admin/products", label: "Products", icon: Boxes },
    ],
  },
  {
    heading: "The website",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: Globe },
      { href: "/admin/portfolio", label: "Portfolio", icon: Image },
      { href: "/admin/testimonials", label: "Testimonials", icon: Star },
      { href: "/admin/seo", label: "SEO", icon: Search },
      { href: "/admin/site-settings", label: "Site settings", icon: Wrench },
      { href: "/admin/setup", label: "Setup checklist", icon: ClipboardCheck },
    ],
  },
  {
    heading: "Records",
    items: [
      { href: "/admin/users", label: "Customers", icon: Users },
      { href: "/admin/audit-log", label: "Change log", icon: ScrollText },
      { href: "/admin/ai-generations", label: "AI usage", icon: Sparkles },
    ],
  },
];

/** Flattened for the mobile strip, where grouping headings would cost more room than they earn. */
export const ADMIN_LINKS = GROUPS.flatMap((g) => g.items);

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto p-2">
      {GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">{group.heading}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              // Exact match for the dashboard, prefix match elsewhere, so an order detail page still
              // highlights Orders.
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    active ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Horizontal nav for screens too narrow for the sidebar, which otherwise had no navigation at all. */
export function AdminNavMobile() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-kc-border bg-white px-3 py-2 lg:hidden">
      {ADMIN_LINKS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "border-kc-teal bg-kc-teal text-white" : "border-kc-border text-kc-muted"
            )}
          >
            <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
