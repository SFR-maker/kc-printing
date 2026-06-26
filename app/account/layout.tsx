import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Package, FolderOpen, FileText, Files, Settings } from "lucide-react";

const NAV = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/projects", label: "Projects", icon: FolderOpen },
  { href: "/account/files", label: "Files", icon: Files },
  { href: "/account/invoices", label: "Invoices", icon: FileText },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex min-h-screen bg-kc-bg">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-white border-r border-kc-border">
        <div className="flex h-14 items-center px-4 border-b border-kc-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-kc-teal">
              <span className="text-xs font-black text-kc-coral">KC</span>
            </div>
            <span className="text-sm font-bold text-kc-teal tracking-widest uppercase">Printing</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-kc-muted hover:bg-kc-bg hover:text-kc-dark transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-kc-border">
          <div className="flex items-center gap-2">
            <UserButton />
            <span className="text-xs text-kc-muted">My Account</span>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex h-14 items-center justify-between px-4 border-b border-kc-border bg-white">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-kc-teal">
              <span className="text-xs font-black text-kc-coral">KC</span>
            </div>
            <span className="text-sm font-bold text-kc-teal tracking-widest uppercase">Printing</span>
          </Link>
          <UserButton />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
