"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STAGES: { value: ProjectStatus; label: string; help: string }[] = [
  { value: "PENDING", label: "Not started", help: "Brief received, nobody has picked it up yet." },
  { value: "IN_PROGRESS", label: "Designing", help: "Being worked on right now." },
  { value: "REVIEW", label: "With the customer", help: "Sent over, waiting on their feedback." },
  { value: "REVISION", label: "Changes requested", help: "They asked for edits. See the requests below." },
  { value: "COMPLETE", label: "Finished", help: "Approved and delivered." },
];

interface Revision {
  id: string;
  message: string;
  status: string;
  createdAt: string;
  author: string;
}

export function AdminProjectActions({
  projectId, currentStatus, notes, revisions,
}: {
  projectId: string;
  currentStatus: ProjectStatus;
  notes: string | null;
  revisions: Revision[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ProjectStatus>(currentStatus);
  const [note, setNote] = useState(notes ?? "");

  async function save(section: string, payload: Record<string, unknown>) {
    setBusy(section);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "That didn't save.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const open = revisions.filter((r) => r.status !== "RESOLVED");

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <Card className="border-kc-border">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-bold text-kc-dark">Where is the design?</h2>
          <div className="grid gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  status === s.value ? "border-kc-teal bg-kc-teal/5" : "border-kc-border hover:border-kc-teal/40"
                )}
              >
                <span className="block text-sm font-semibold text-kc-dark">{s.label}</span>
                <span className="block text-xs leading-snug text-kc-muted">{s.help}</span>
              </button>
            ))}
          </div>
          <Button
            onClick={() => save("status", { status })}
            disabled={busy !== null || status === currentStatus}
            className="bg-kc-teal text-white hover:bg-kc-teal/90"
          >
            {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update stage"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-kc-border">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-bold text-kc-dark">
            Change requests {open.length > 0 && <span className="text-kc-magenta-deep">({open.length} open)</span>}
          </h2>
          {revisions.length === 0 ? (
            <p className="text-sm text-kc-muted">None. The customer has not asked for any edits.</p>
          ) : (
            <ul className="space-y-2">
              {revisions.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "rounded-lg border p-3",
                    r.status === "RESOLVED" ? "border-kc-border bg-kc-bg" : "border-amber-200 bg-amber-50"
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm text-kc-dark">{r.message}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-kc-muted">
                      {r.author} · {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    {r.status === "RESOLVED" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} /> Done
                      </span>
                    ) : (
                      <button
                        onClick={() => save(r.id, { resolveRevisionId: r.id })}
                        disabled={busy !== null}
                        className="rounded-md border border-kc-border bg-white px-2.5 py-1 text-xs font-semibold text-kc-dark transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-40"
                      >
                        {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark done"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-kc-border">
        <CardContent className="space-y-3 p-5">
          <Label className="text-xs text-kc-muted">Internal notes on this design job</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="border-kc-border" />
          <Button
            onClick={() => save("notes", { notes: note })}
            disabled={busy !== null || note === (notes ?? "")}
            variant="outline"
            className="border-kc-border"
          >
            {busy === "notes" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save notes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
