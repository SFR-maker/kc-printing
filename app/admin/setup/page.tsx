import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Check, CircleDashed, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TestEmailButton } from "@/components/admin/TestEmailButton";
import { runSetupChecks, summarise, type Check as SetupCheck } from "@/lib/setup/checks";
import { cn } from "@/lib/utils";

export const metadata = { title: "Setup" };

// Environment and database are read on every load; a cached answer would tell you about a
// configuration that may have changed five minutes ago.
export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  const groups = await runSetupChecks();
  const { blocked, warn, ok } = summarise(groups);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-kc-dark">Setup</h1>
        <p className="text-sm text-kc-muted">
          Read live from the running site every time you open this page, so it cannot go stale.
        </p>
      </div>

      <div
        className={cn(
          "rounded-lg border px-5 py-4",
          blocked > 0 ? "border-red-300 bg-red-50" : warn > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"
        )}
      >
        <p className={cn("text-lg font-black", blocked > 0 ? "text-red-800" : warn > 0 ? "text-amber-900" : "text-emerald-800")}>
          {blocked > 0
            ? `${blocked} thing${blocked === 1 ? "" : "s"} still blocking launch`
            : warn > 0
              ? "Nothing is blocking launch"
              : "Everything is configured"}
        </p>
        <p className={cn("mt-0.5 text-sm", blocked > 0 ? "text-red-800/80" : warn > 0 ? "text-amber-900/80" : "text-emerald-800/80")}>
          {ok} done · {warn} worth doing{blocked > 0 ? ` · ${blocked} blocking` : ""}
        </p>
      </div>

      {groups.map((group) => (
        <Card key={group.heading} className="border-kc-border">
          <CardContent className="p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-kc-muted">{group.heading}</h2>
            <ul className="divide-y divide-kc-border">
              {group.checks.map((check) => (
                <li key={check.id} className="py-3 first:pt-0 last:pb-0">
                  <Row check={check} />
                  {check.id === "resend-verify" && (
                    <div className="mt-3 pl-7">
                      <TestEmailButton />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <p className="text-xs leading-relaxed text-kc-muted">
        Environment variables are changed in Vercel, not here — and a change only takes effect on the
        next deployment. This page never displays a key or a secret, only whether one is present and
        the right shape.
      </p>
    </div>
  );
}

function Row({ check }: { check: SetupCheck }) {
  const icon =
    check.state === "ok" ? <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
      : check.state === "blocked" ? <XCircle className="h-4 w-4 text-red-600" strokeWidth={2} />
        : check.state === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={2} />
          : <CircleDashed className="h-4 w-4 text-kc-muted" strokeWidth={2} />;

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-kc-dark">{check.label}</p>
        <p className="text-[13px] leading-relaxed text-kc-muted">{check.detail}</p>
        {check.action && (
          <p className="mt-1 text-[13px]">
            {check.href ? (
              <Link
                href={check.href}
                target={check.href.startsWith("http") ? "_blank" : undefined}
                rel={check.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1 font-semibold text-kc-magenta-deep hover:text-kc-dark"
              >
                {check.action}
                <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            ) : (
              <span className="font-semibold text-kc-dark">{check.action}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
