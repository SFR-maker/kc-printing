"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ArrowLeft, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CardDesign } from "@/lib/business-card/schema";
import { renderSideToSvg } from "@/lib/business-card/render-svg";
import { validateDesign } from "@/lib/business-card/validate";
import { findPlaceholderDetails, placeholderLabel, type TemplateBaseline } from "./placeholder-details";

interface ProofScreenProps {
  design: CardDesign;
  onBack: () => void;
  onConfirm: () => void;
  confirming?: boolean;
  /** What the template originally said, when this session started from one. Lets the proof catch
   * sample contact details that were never replaced. */
  templateBaseline?: TemplateBaseline | null;
}

export function ProofScreen({ design, onBack, onConfirm, confirming, templateBaseline = null }: ProofScreenProps) {
  const [reviewed, setReviewed] = useState(false);
  /** Set by "These are my details" — the checks are conservative, but never final say. */
  const [placeholdersAccepted, setPlaceholdersAccepted] = useState(false);
  const frontSvg = useMemo(() => renderSideToSvg(design.front, 150), [design.front]);
  const backSvg = useMemo(() => renderSideToSvg(design.back, 150), [design.back]);
  const warnings = useMemo(() => validateDesign(design.front, design.back), [design.front, design.back]);
  const errors = warnings.filter((w) => w.severity === "error");
  const softWarnings = warnings.filter((w) => w.severity === "warning");
  const notesShown = errors.length > 0 || softWarnings.length > 0;

  const placeholders = useMemo(
    () => findPlaceholderDetails(design, templateBaseline),
    [design, templateBaseline]
  );
  const placeholdersBlocking = placeholders.length > 0 && !placeholdersAccepted;

  /*
   * Stated the way the upload path states it, in inches the customer can picture.
   *
   * The canvas is drawn at the full document size, bleed included; what arrives in the box is the
   * trimmed card, so that is the number to quote.
   */
  const trimWidthIn = round2(design.front.physicalWidthIn - design.front.bleedIn * 2);
  const trimHeightIn = round2(design.front.physicalHeightIn - design.front.bleedIn * 2);
  const safeInsetIn = round2(design.front.safeZoneInsetIn);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-black text-kc-dark">Check your card before you order</h2>
        <p className="text-sm text-kc-muted">This is exactly what gets printed. We check what we can automatically, but only you know how your name, phone number and email are meant to read — so please read them here.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PreviewCard label="Front" svg={frontSvg} />
        <PreviewCard label="Back" svg={backSvg} />
      </div>

      <p className="text-xs text-kc-muted">
        Prints at {trimWidthIn} × {trimHeightIn} in. We cut on that line, so anything you need to read
        should sit at least {safeInsetIn} in inside the edge.
      </p>

      {/*
        Sample details are called out on their own, above the print checks and in different words.
        Folded into the amber list they read as one more technicality; they are the one mistake here
        that costs the customer their phone calls, so they get their own block and hold the button.
      */}
      {placeholders.length > 0 && (
        <Card className={placeholdersAccepted ? "border-kc-border bg-white" : "border-red-300 bg-red-50"}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <UserRoundX className="h-4 w-4" /> This card still has our sample details on it
            </div>
            <p className="text-[13px] leading-snug text-red-900">
              These came with the template — they belong to a made-up business, not to you. If we
              print them, anyone who picks up your card will contact someone else.
            </p>
            <ul className="space-y-1 text-[13px] text-red-900">
              {placeholders.map((p) => (
                <li key={`${p.side}-${p.elementId}`}>
                  • <span className="font-semibold">{p.text}</span>{" "}
                  <span className="text-red-800/80">
                    ({placeholderLabel(p.kind)} on the {p.side})
                  </span>
                </li>
              ))}
            </ul>
            {!placeholdersAccepted && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button size="sm" onClick={onBack} className="bg-red-700 text-white hover:bg-red-800">
                  Go back and change them
                </Button>
                <button
                  type="button"
                  onClick={() => setPlaceholdersAccepted(true)}
                  className="text-xs font-semibold text-red-900 underline underline-offset-2"
                >
                  These really are my details — print them
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {notesShown && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> {errors.length > 0 ? "Please fix these before ordering" : "Worth a look before you order"}
            </div>
            <ul className="space-y-1 text-xs text-amber-800">
              {[...errors, ...softWarnings].map((w, i) => (
                <li key={i}>• {w.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/*
        Plain English, and it only claims what is on the screen.

        It used to ask the customer to confirm they had reviewed "the bleed, safe zone, and
        low-resolution warnings above" - three trade terms a florist has no reason to know, and a
        reference to warnings that most often were not there at all. Being asked to sign for
        something you cannot see is a good reason to refuse, and testers did.
      */}
      <label className="flex items-start gap-3 rounded-lg border border-kc-border bg-white p-4 text-sm text-kc-dark">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          {notesShown ? "I have read the notes above, and I have checked both sides of this card. " : "I have checked both sides of this card. "}
          The spelling, phone number, email and address are how I want them printed.
        </span>
      </label>

      <div className="flex items-center justify-between border-t border-kc-border pt-5">
        <Button variant="outline" onClick={onBack} className="border-kc-border">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!reviewed || errors.length > 0 || placeholdersBlocking || confirming}
          className="bg-kc-coral text-white hover:bg-kc-coral/90"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> {confirming ? "Continuing..." : "Confirm and Continue to Order"}
        </Button>
      </div>
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * One face of the card, shown whole.
 *
 * renderSideToSvg emits width and height in pixels at the requested DPI - 525 x 300 for a card at
 * 150 - which is wider than this column, so the card was being clipped by the surrounding
 * overflow-hidden and the proof showed the top-left corner blown up rather than the finished piece.
 *
 * The SVG already carries a viewBox in inches, so overriding the pixel width to fill the column and
 * letting the height follow scales the whole face down at its true proportions. Driving it from the
 * viewBox rather than a hard-coded aspect class also keeps square and custom sizes honest.
 */
function PreviewCard({ label, svg }: { label: string; svg: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-kc-border bg-white">
      <figcaption className="border-b border-kc-border bg-kc-bg px-3 py-1.5 text-xs font-semibold text-kc-muted">
        {label}
      </figcaption>
      <div className="p-3">
        <div
          className="overflow-hidden rounded-md ring-1 ring-kc-dark/10 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </figure>
  );
}
