import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { db } from "@/lib/prisma";
import {
  LayoutDashboard, Package, Users, Boxes, Settings2,
  FolderKanban, Upload, Sparkles, Tag, Star, Image,
  Globe, Search, Wrench, FileText, ScrollText
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/pricing", label: "Pricing", icon: Settings2 },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/uploads", label: "Uploads", icon: Upload },
  { href: "/admin/ai-generations", label: "AI Logs", icon: Sparkles },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/testimonials", label: "Testimonials", icon: Star },
  { href: "/admin/portfolio", label: "Portfolio", icon: Image },
  { href: "/admin/homepage", label: "Homepage", icon: Globe },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/admin/site-settings", label: "Site Settings", icon: Wrench },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) redirect("/account");
  }

  return (
    <div className="flex min-h-screen bg-kc-bg">
      <aside className="hidden lg:flex w-52 shrink-0 flex-col bg-kc-dark border-r border-white/10">
        <div className="flex h-14 items-center px-4 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-kc-teal">
              <span className="text-xs font-black text-kc-coral">KC</span>
            </div>
            <span className="text-xs font-bold text-white tracking-widest uppercase">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <UserButton />
            <span className="text-xs text-white/40">Admin</span>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-14 items-center justify-between px-4 sm:px-6 border-b border-kc-border bg-white">
          <span className="text-sm font-bold text-kc-dark">KC Printing Admin</span>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-kc-teal hover:underline">View Site</Link>
            <UserButton />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
