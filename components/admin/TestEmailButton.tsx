"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Sends a real email through the live path and reports what happened. */
export function TestEmailButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/setup/test-email", { method: "POST" });
      const body = await res.json().catch(() => null);
      setResult(
        res.ok
          ? { ok: true, text: `Sent to ${body.to}. Check your inbox — and your spam folder, which is where a new sending domain usually lands first.` }
          : { ok: false, text: body?.error ?? "It did not send." }
      );
    } catch {
      setResult({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={send} disabled={busy} variant="outline" className="border-kc-border">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1.5 h-4 w-4" strokeWidth={1.75} /> Send myself a test email</>}
      </Button>
      {result && (
        <p className={cn("text-sm", result.ok ? "text-emerald-700" : "text-red-700")}>{result.text}</p>
      )}
    </div>
  );
}
