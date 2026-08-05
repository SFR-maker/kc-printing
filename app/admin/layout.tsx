import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ensureUser, isAdminRole } from "@/lib/auth/ensure-user";
import { AdminNav, AdminNavMobile } from "@/components/admin/AdminNav";
import { LogoTile } from "@/components/layout/Wordmark";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // ensureUser creates the row on first sign-in, so a fresh Clerk account whose email matches
  // ADMIN_EMAIL lands here as SUPER_ADMIN without anyone touching the database by hand.
  const user = await ensureUser();
  if (!user) redirect("/sign-in");
  if (!isAdminRole(user.role)) redirect("/account");

  return (
    <div className="flex min-h-screen bg-kc-bg">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-kc-dark lg:flex">
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <LogoTile className="h-7 w-7" variant="inverse" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest text-white">611 Admin</span>
          </Link>
        </div>

        <AdminNav />

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2">
            <UserButton />
            <div className="min-w-0">
              <p className="truncate text-xs text-white/70">{user.name ?? user.email}</p>
              <p className="text-[10.7px] uppercase tracking-wide text-white/35">
                {user.role === "SUPER_ADMIN" ? "Owner" : "Admin"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-kc-border bg-white px-4 sm:px-6">
          <span className="text-sm font-bold text-kc-dark">611 Printing Admin</span>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-kc-magenta-deep hover:text-kc-dark"
            >
              View the live site <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
            </Link>
            <span className="lg:hidden"><UserButton /></span>
          </div>
        </header>

        <AdminNavMobile />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
