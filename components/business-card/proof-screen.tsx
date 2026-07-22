"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CardDesign } from "@/lib/business-card/schema";
import { renderSideToSvg } from "@/lib/business-card/render-svg";
import { validateDesign } from "@/lib/business-card/validate";

interface ProofScreenProps {
  design: CardDesign;
  onBack: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

export function ProofScreen({ design, onBack, onConfirm, confirming }: ProofScreenProps) {
  const [reviewed, setReviewed] = useState(false);
  const frontSvg = useMemo(() => renderSideToSvg(design.front, 150), [design.front]);
  const backSvg = useMemo(() => renderSideToSvg(design.back, 150), [design.back]);
  const warnings = useMemo(() => validateDesign(design.front, design.back), [design.front, design.back]);
  const errors = warnings.filter((w) => w.severity === "error");
  const softWarnings = warnings.filter((w) => w.severity === "warning");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-black text-kc-dark">Review Your Design</h2>
        <p className="text-sm text-kc-muted">Take a close look before we send this to production. Automated checks catch common issues, but they do not guarantee a perfect print — please review carefully.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PreviewCard label="Front" svg={frontSvg} />
        <PreviewCard label="Back" svg={backSvg} />
      </div>

      {(errors.length > 0 || softWarnings.length > 0) && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> {errors.length > 0 ? "Please fix these before ordering" : "Heads up"}
            </div>
            <ul className="space-y-1 text-xs text-amber-800">
              {[...errors, ...softWarnings].map((w, i) => (
                <li key={i}>• {w.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <label className="flex items-start gap-3 rounded-lg border border-kc-border bg-white p-4 text-sm text-kc-dark">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          I have reviewed the spelling, contact details, and layout on both sides of this card, including the bleed, safe zone, and low-resolution warnings above.
        </span>
      </label>

      <div className="flex items-center justify-between border-t border-kc-border pt-5">
        <Button variant="outline" onClick={onBack} className="border-kc-border">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!reviewed || errors.length > 0 || confirming}
          className="bg-kc-coral text-white hover:bg-kc-coral/90"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> {confirming ? "Continuing..." : "Confirm and Continue to Order"}
        </Button>
      </div>
    </div>
  );
}

function PreviewCard({ label, svg }: { label: string; svg: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-kc-border bg-white">
      <div className="border-b border-kc-border bg-kc-bg px-3 py-1.5 text-xs font-semibold text-kc-muted">{label}</div>
      <div className="p-3" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
