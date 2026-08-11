"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Sparkles, ArrowRight, ArrowLeft, Check, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDollars } from "@/lib/utils";
import { calculatePrice } from "@/lib/pricing";
import { FREE_TEST_SHIPPING, transitLabel } from "@/lib/shipping/rates";
import { DEFAULT_PRICING, type PricingSettings } from "@/lib/pricing/settings";
import { calculateBusinessCardPrice, BC_SIZES, BC_PAPERS, BC_COLORS } from "@/lib/pricing/business-cards";
import { BusinessCardPrintSpec, SIDES_LABEL, type BusinessCardSpec } from "@/components/builder/BusinessCardPrintSpec";
import { BannerPrintSpec, DEFAULT_BANNER_SPEC, type BannerSpec } from "@/components/builder/BannerPrintSpec";
import {
  PostcardPrintSpec, DEFAULT_POSTCARD_SPEC, postcardBackLabel, postcardNeedsBack, type PostcardSpec,
} from "@/components/builder/PostcardPrintSpec";
import { RigidSignPrintSpec, type RigidSignPriceState } from "@/components/builder/RigidSignPrintSpec";
import { WindowDecalPrintSpec, type WindowDecalPriceState } from "@/components/builder/WindowDecalPrintSpec";
import { OrderSummaryPanel, type SummaryLine } from "@/components/builder/OrderSummaryPanel";
import { ArtworkSummary, type ArtworkSource } from "@/components/builder/ArtworkSummary";
import type { BannerPriceState } from "@/components/builder/BannerPrintSpec";

import { CardSideSchema } from "@/lib/business-card/schema";
import { renderSideToSvg } from "@/lib/business-card/render-svg";
import {
  defaultRigidSpec, rigidNeedsBack, rigidBackLabel, sizeById,
  materialLabel as rigidMaterialLabel, shapeLabel as rigidShapeLabel,
  type RigidMaterialId, type RigidSignSpec,
} from "@/lib/pricing/rigid-signs";
import {
  defaultWindowDecalSpec, windowNeedsBack, sizeById as windowSizeById,
  materialLabel as windowMaterialLabel, shapeLabel as windowShapeLabel,
  type WindowMaterialId, type WindowDecalSpec,
} from "@/lib/pricing/window-decals";
import { calculatePostcardPrice } from "@/lib/pricing/postcards";

import { parseTrimSize, printSpec, type PrintSpec } from "@/lib/print/spec";
import { BUSINESS_CARD_BLEED, PRINT_SPEC } from "@/lib/business-card/print-spec";
import { BrandFileUpload, type BrandFile } from "@/components/builder/BrandFileUpload";
import { ArtworkStep, EMPTY_ARTWORK, artworkComplete, normaliseArtwork, type ArtworkState } from "@/components/builder/ArtworkStep";
import { backArtworkLabel, needsBackArtwork } from "@/lib/business-card/print-spec";
import { AI_PALETTES, AI_PALETTE_AUTO_ID } from "@/lib/business-card/templates/ai-palettes";
import { getAnonymousToken } from "@/lib/business-card/local-autosave";
import type { ServiceDef } from "@/lib/service-data";

const bcSpecSchema = z.object({
  sizeId: z.number(),
  paperId: z.number(),
  colorId: z.number(),
  quantity: z.number(),
  rush: z.boolean(),
  roundCorners: z.boolean(),
  manualProof: z.boolean(),
});

// Cheapest real combo (100 lb. Matte Cover, 250 cards, single-sided) so the order flow opens on
// its lowest-friction, lowest-price starting point rather than nudging toward a bigger order.
// paperId 1 is 14 pt. Gloss - the house default, and what most people picture as a business card.
// quantity 0 means not chosen: it is a required choice rather than a default run length, so nobody
// reaches checkout having silently accepted 250 cards.
const DEFAULT_BC_SPEC: BusinessCardSpec = { sizeId: 101, paperId: 1, colorId: 1, quantity: 0, rush: false, roundCorners: false, manualProof: false };

const schema = z.object({
  selectedOption: z.record(z.string(), z.string()).optional(),
  // Required for postcards/banners (checked in goNext, since it's optional here so business cards
  // — where "design it yourself" is a valid, free choice — aren't forced to pick a package).
  selectedPackage: z.string().optional(),
  selectedAddOns: z.array(z.string()),
  notes: z.string().optional(),
  // Required only on the design path - see the superRefine below. Someone uploading finished
  // artwork has no brief to write, and Stripe collects their name and address at checkout.
  businessName: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  colorPaletteId: z.string().optional(),
  brandColorsNotes: z.string().optional(),
  brandFiles: z.array(z.object({ url: z.string(), name: z.string() })),
  quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  bcSpec: bcSpecSchema.optional(),
  bannerSpec: z
    .object({ size: z.string(), material: z.string(), quantity: z.number(), grommets: z.string() })
    .optional(),
  postcardSpec: z
    .object({ size: z.string(), paper: z.string(), color: z.string(), quantity: z.number() })
    .optional(),
  /** Rigid signs use the supplier's numeric ids: their size and shape labels are not unique. */
  rigidSpec: z
    .object({
      material: z.string(),
      sizeId: z.number(),
      shapeId: z.number(),
      thickness: z.string(),
      type: z.string(),
      color: z.string(),
      quantity: z.number(),
    })
    .optional(),
  /** Window signage, likewise by supplier id: a 24" x 6" rectangle and rounded rectangle share a label. */
  windowSpec: z
    .object({
      material: z.string(),
      sizeId: z.number(),
      shapeId: z.number(),
      quantity: z.number(),
    })
    .optional(),
  // Collected at Review regardless of sign-in state, since the client has no reliable way to know
  // auth status before submitting: guests need it so there's somewhere to send confirmation and
  // print files (the API only actually requires it when the request turns out to be unauthenticated).
  guestEmail: z.string().min(1, "Email is required").email("Enter a valid email"),
  acceptedTerms: z.boolean(),
  // Business cards only. `inspection` is the API's measurement payload, kept loose here because it
  // is produced and validated server-side by lib/business-card/inspect-artwork.
  // Not `.default()`: that makes the field optional on the schema's input type but required on its
  // output, and react-hook-form's resolver typing rejects the mismatch. It is supplied through
  // defaultValues instead, including for drafts saved before this field existed.
  artwork: z.object({
    path: z.enum(["UPLOAD", "DESIGN_SERVICE", "STUDIO"]).nullable(),
    front: z.any(),
    back: z.any(),
  }),
}).superRefine((v, ctx) => {
  // Enforced here rather than on the field so it can depend on the chosen route. Without this the
  // upload path could never submit: businessName is only collected on the Details step, which that
  // path skips, so the form failed validation against a field the customer was never shown.
  if (v.artwork?.path !== "UPLOAD" && !v.businessName?.trim()) {
    ctx.addIssue({ code: "custom", path: ["businessName"], message: "Business name is required" });
  }
  if (!v.acceptedTerms) {
    ctx.addIssue({ code: "custom", path: ["acceptedTerms"], message: "Please accept the Terms of Sale" });
  }
});

type FormValues = z.infer<typeof schema>;

type StepKey = "package" | "options" | "specs" | "design" | "details" | "payment";

interface ProductBuilderProps {
  service: ServiceDef;
  defaultPackage?: string;
  cardDesignId?: string;
  /** Set by the Design Studio's proof screen once the review checkbox has been ticked. */
  proofApproved?: boolean;
  /**
   * Present only when the page was opened with a valid test link. Turns the order into a free
   * end-to-end run of the upload -> proof -> checkout path against live Stripe. Sent back to
   * /api/orders, which re-validates it before zeroing anything.
   */
  testCode?: string;
  /** Margin, flat fees and shipping tiers as configured in /admin/pricing. */
  pricing?: PricingSettings;
}

function draftKey(serviceSlug: string): string {
  return `kc-order-draft-${serviceSlug}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function ProductBuilder({ service, defaultPackage, cardDesignId, proofApproved = false, testCode, pricing = DEFAULT_PRICING }: ProductBuilderProps) {
  const isBusinessCards = service.slug === "business-cards";
  const isBanners = service.slug === "banners";
  const isPostcards = service.slug === "postcards";
  const isRigidSigns = service.slug === "rigid-signs";
  const isWindowDecals = service.slug === "window-decals";
  /**
   * Products that carry real print specs and an artwork step, rather than only a design package.
   * Everything else still runs the old package-first flow until it has priced options of its own.
   */
  const hasPrintSpec = isBusinessCards || isBanners || isPostcards || isRigidSigns || isWindowDecals;

  const [step, setStep] = useState(0);
  /** Rigid signs are quoted by /api/price/rigid-signs; the picker reports the result up here. */
  const [rigidPrice, setRigidPrice] = useState<RigidSignPriceState>({ valid: false, total: 0, loading: true });
  /** Window signage is quoted the same way, by /api/price/window-decals. */
  const [windowPrice, setWindowPrice] = useState<WindowDecalPriceState>({ valid: false, total: 0, loading: true });
  /** Banners moved server-side too: their table is 110 sizes and 1.1MB, far too much to bundle. */
  const [bannerPriceState, setBannerPriceState] = useState<BannerPriceState>({ valid: false, total: 0, finishing: 0, loading: true });
  /**
   * Set only by "Upload a file instead".
   *
   * Deliberately not derived from artwork.path: the order draft is restored from sessionStorage, so
   * a path of UPLOAD left over from an earlier visit made the studio design look absent and the
   * step demanded a file the customer had already designed.
   */
  const [uploadInstead, setUploadInstead] = useState(false);
  /**
   * The studio design's two faces, rendered to SVG for display.
   *
   * Drawn from the stored design rather than from CardDesign.thumbnailFront/Back: those columns
   * exist but nothing ever writes them, so every one of the designs on file has null thumbnails and
   * a preview built on them would show nothing. Rendering the same JSON the press will print is
   * also the only version guaranteed to match.
   */
  const [designPreview, setDesignPreview] = useState<{ title: string; front: string | null; back: string | null; fromAi: boolean } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [artworkError, setArtworkError] = useState<string | null>(null);
  // Local rather than form.setError: this is set from goNext, outside a validation pass, and
  // RHF drops errors that its resolver did not produce on the next render.
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [designMetaLoaded, setDesignMetaLoaded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(!cardDesignId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: (() => {
      if (typeof window !== "undefined") {
        const saved = window.sessionStorage.getItem(draftKey(service.slug));
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            return {
              selectedAddOns: [], brandFiles: [], quantity: 1, businessName: "", acceptedTerms: false,
              bcSpec: DEFAULT_BC_SPEC, colorPaletteId: AI_PALETTE_AUTO_ID,
              ...parsed,
              // A draft saved before artwork gained a back would have no `front` at all.
              artwork: normaliseArtwork(parsed.artwork),
            };
          } catch {
            // fall through to plain defaults below
          }
        }
      }
      return {
        // service page "Select X" links build ?package=gold (lowercase); package names are
        // stored capitalized ("Gold"), so a case-insensitive match is required here or the
        // param silently fails to pre-select anything.
        selectedPackage: service.packages.find((p) => p.name.toLowerCase() === defaultPackage?.toLowerCase())?.name ?? "",
        selectedAddOns: [],
        brandFiles: [],
        quantity: 1,
        businessName: "",
        acceptedTerms: false,
        bcSpec: DEFAULT_BC_SPEC,
        colorPaletteId: AI_PALETTE_AUTO_ID,
        artwork: EMPTY_ARTWORK,
      };
    })(),
  });

  const { watch, setValue, register, handleSubmit, trigger, formState: { errors } } = form;
  const values = watch();

  /**
   * Steps are driven by which route the customer took, not by a fixed index.
   *
   * Someone uploading finished artwork has nothing to tell us about their brand and no design
   * package to pick, so they go straight from print specs to payment. Someone asking us to design
   * it keeps the full path. Rendering off a key rather than a number means adding or removing a
   * step can't silently shift what another step renders.
   */
  const artwork: ArtworkState = values.artwork ?? EMPTY_ARTWORK;
  /**
   * True when this order is carrying a design built in the Design Studio.
   *
   * That design is the artwork - it is already print-ready at the chosen size - so it satisfies the
   * artwork requirement on its own. Previously only an uploaded file or a booked design service
   * counted, so arriving from the studio showed an uploader and then refused to advance, which made
   * a studio design impossible to order at all.
   *
   * "Upload a file instead" clears it back to the normal uploader, so the escape hatch still exists.
   */
  const studioDesign = Boolean(cardDesignId) && !uploadInstead;

  /**
   * The artwork summary shows for an upload only once there is a file *and* an approved proof.
   *
   * Mid-upload the customer still needs the uploader and the proof editor, and swapping them for a
   * summary would strand them with an unapproved file and no way to approve it.
   */
  const uploadedArtworkSource: ArtworkSource | null =
    values.artwork?.path === "UPLOAD" && values.artwork.front.fileUrl && values.artwork.front.approved
      ? "UPLOAD"
      : null;

  const stepKeys: StepKey[] = !hasPrintSpec
    ? ["package", "options", "details", "payment"]
    : // Someone who built their own design in the studio is in exactly the position of someone who
      // uploaded a finished file: there is nothing for a designer to do and no brand brief to take.
      // They were being routed through Design Service and asked to buy a package to have artwork
      // made that they had already made themselves.
      artwork.path === "UPLOAD" || studioDesign
      ? ["specs", "payment"]
      : ["specs", "design", "details", "payment"];
  const currentStep = stepKeys[Math.min(step, stepKeys.length - 1)];
  const stepLabels: Record<StepKey, string> = {
    package: "Package",
    options: "Options",
    specs: "Print Specs",
    design: "Design Service",
    details: "Details",
    payment: "Payment",
  };
  const STEP_FIELDS: Record<StepKey, (keyof FormValues)[]> = {
    package: ["selectedPackage"],
    options: ["quantity"],
    specs: [],
    design: [],
    details: ["businessName"],
    payment: [],
  };

  // Add-ons that only make sense when our designers are doing the work. On the upload path the
  // customer has supplied finished artwork, so a design rush, an extra layout concept, or us adding
  // a QR code to a design we aren't making have nothing to attach to. Print turnaround is a separate
  // control in the print specs, which is why "Rush Delivery" is hidden here rather than merged.
  const DESIGN_ONLY_ADDONS = new Set(["Rush Delivery", "QR Code", "Extra Concept"]);
  const availableAddOns =
    isBusinessCards && artwork.path === "UPLOAD"
      ? service.addOns.filter((a) => !DESIGN_ONLY_ADDONS.has(a.name))
      : service.addOns;

  // Save the in-progress order to sessionStorage so a sign-in redirect (or an accidental reload)
  // doesn't throw away everything the customer just filled in.
  useEffect(() => {
    const sub = form.watch((v) => {
      window.sessionStorage.setItem(draftKey(service.slug), JSON.stringify(v));
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.slug]);

  // If this order started from a design built with "Create with AI", that flow already collected
  // business name/contact/colors — pull them in here instead of making the customer retype
  // everything on the Details step.
  useEffect(() => {
    if (!cardDesignId) return;
    const token = getAnonymousToken();
    fetch(`/api/card-designs/${cardDesignId}?anonymousToken=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data: { design?: { title?: string; meta?: Record<string, string> | null; front?: unknown; back?: unknown } } | null) => {
        const d = data?.design;
        // A design is only readable by its owner or by the browser that made it. If that check
        // fails - signed in on a different device, storage cleared - the preview must say so rather
        // than sit on "Loading your design" forever.
        if (!d) {
          setDesignPreview({ title: "", front: null, back: null, fromAi: false });
          return;
        }
        if (d) {
          const front = CardSideSchema.safeParse(d.front);
          const back = CardSideSchema.safeParse(d.back);
          setDesignPreview({
            // `meta` is only written by the AI generator (it stores the structured business inputs
            // the generator was given), so its presence is what distinguishes an AI design from one
            // built by hand in the editor. Nothing else on the record records which route made it.
            fromAi: Boolean(d.meta),
            title: d.title ?? "Your design",
            front: front.success ? renderSideToSvg(front.data, 150) : null,
            back: back.success ? renderSideToSvg(back.data, 150) : null,
          });

          /*
           * An empty back means the customer asked for front only, so the order says so.
           *
           * "Remove back" in the editor clears the face; without this the order still carried
           * whatever sides option was set before, so someone who explicitly removed the back was
           * quoted - and charged - for printing two of them.
           *
           * Only applied while the sides option is still untouched at its default. Once the
           * customer has chosen sides themselves, their choice wins over this inference.
           */
          const backEmpty = back.success && back.data.elements.length === 0;
          if (backEmpty && isBusinessCards && form.getValues("bcSpec")?.colorId === DEFAULT_BC_SPEC.colorId) {
            setValue("bcSpec", { ...(form.getValues("bcSpec") ?? DEFAULT_BC_SPEC), colorId: 1 });
          }
        }
        const meta = d?.meta;
        if (!meta) return;
        if (meta.businessName && !form.getValues("businessName")) setValue("businessName", meta.businessName);
        if (meta.phone) setValue("phone", meta.phone);
        if (meta.email) setValue("email", meta.email);
        if (meta.website) setValue("website", meta.website);
        if (meta.linkedin) setValue("linkedin", meta.linkedin);
        if (meta.colorPaletteId) setValue("colorPaletteId", meta.colorPaletteId);
        setDesignMetaLoaded(true);
        setDetailsExpanded(false);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDesignId]);

  const selectedPkg = service.packages.find((p) => p.name === values.selectedPackage);
  const selectedAddOnPrices = (values.selectedAddOns ?? []).map((name) => {
    const ao = service.addOns.find((a) => a.name === name);
    return ao?.price ?? 0;
  });

  const bcPrice = isBusinessCards && values.bcSpec ? calculateBusinessCardPrice(values.bcSpec, pricing) : null;
  const bannerPrice = isBanners
    ? (bannerPriceState.loading
        ? null
        : { valid: bannerPriceState.valid, total: bannerPriceState.total, error: bannerPriceState.error })
    : null;

  const postcardPrice = isPostcards && values.postcardSpec ? calculatePostcardPrice(values.postcardSpec) : null;
  /**
   * Rigid signs are quoted by the server, so their price arrives asynchronously rather than being
   * computed here. The five price tables are about two megabytes and are deliberately not bundled -
   * see lib/pricing/rigid-signs - so there is nothing local to calculate from.
   */
  const printPrice = isBanners ? bannerPrice
    : isPostcards ? postcardPrice
    : isRigidSigns ? (rigidPrice.loading ? null : { valid: rigidPrice.valid, total: rigidPrice.total, error: rigidPrice.error })
    : isWindowDecals ? (windowPrice.loading ? null : { valid: windowPrice.valid, total: windowPrice.total, error: windowPrice.error })
    : bcPrice;

  const rawPrice = hasPrintSpec
    ? (printPrice?.valid
        ? (() => {
            const total = round2(printPrice.total + (selectedPkg?.price ?? 0) + selectedAddOnPrices.reduce((s, p) => s + p, 0));
            return { subtotal: total, discount: 0, total };
          })()
        : null)
    : selectedPkg
      ? calculatePrice({
          // Postcard/banner packages are a flat one-time design fee (see the package feature
          // lists in lib/service-data.ts — revisions, file formats, delivery time, never a
          // per-copy cost), not a per-unit print price like business cards' bcSpec. Quantity
          // here is scope/print-run metadata for the order, not a price multiplier — passing it
          // through previously made a Gold postcard order at qty 1000 come out to $69,000.
          packagePrice: selectedPkg.price,
          addOnPrices: selectedAddOnPrices,
        })
      : null;

  const backNeeded = isBusinessCards
    ? needsBackArtwork(values.bcSpec?.colorId ?? 1)
    : isPostcards
      ? postcardNeedsBack((values.postcardSpec ?? DEFAULT_POSTCARD_SPEC).color)
      : isRigidSigns
        ? rigidNeedsBack((values.rigidSpec ?? defaultRigidSpec()).color)
        // Window signage prints on the face only - it is applied to glass, so there is no back.
        : isWindowDecals
          ? windowNeedsBack()
          : false;

  /** Geometry the artwork step and proof are measured against. */
  const artworkSpec: PrintSpec = (() => {
    if (isBanners) {
      const trim = parseTrimSize(values.bannerSpec?.size ?? DEFAULT_BANNER_SPEC.size)
        ?? { widthIn: 72, heightIn: 36 };
      return printSpec("banners", trim.widthIn, trim.heightIn);
    }
    if (isPostcards) {
      const trim = parseTrimSize(values.postcardSpec?.size ?? DEFAULT_POSTCARD_SPEC.size)
        ?? { widthIn: 6, heightIn: 4 };
      return printSpec("postcards", trim.widthIn, trim.heightIn);
    }
    if (isRigidSigns) {
      // Boards state their real trim, which runs a little under the nominal size - a 6" x 24" board
      // prints 23.875" x 5.875" - so the document is built from that rather than from the label.
      const spec = (values.rigidSpec ?? defaultRigidSpec()) as RigidSignSpec;
      const size = sizeById(spec.material as RigidMaterialId, spec.sizeId);
      return printSpec("rigid-signs", size?.trimWidthIn ?? 24, size?.trimHeightIn ?? 18);
    }
    if (isWindowDecals) {
      // Same as the boards: the film trims a touch under the nominal size, so the document is laid
      // out to the real trim rather than to the label.
      const spec = (values.windowSpec ?? defaultWindowDecalSpec()) as WindowDecalSpec;
      const size = windowSizeById(spec.material as WindowMaterialId, spec.sizeId);
      return printSpec("window-decals", size?.trimWidthIn ?? 24, size?.trimHeightIn ?? 18);
    }
    return printSpec(
      "business-cards",
      PRINT_SPEC.trimWidthIn,
      PRINT_SPEC.trimHeightIn,
      values.bcSpec?.roundCorners ? BUSINESS_CARD_BLEED.rounded : BUSINESS_CARD_BLEED.square
    );
  })();

  const cheapestShipping = testCode
    ? 0
    : Math.min(...pricing.shippingTiers.map((t) => t.price));

  // The server is the authority on this; zeroing here only keeps the summary honest about what the
  // customer will actually be asked for at checkout.
  const price = testCode && rawPrice ? { ...rawPrice, discount: rawPrice.subtotal, total: 0 } : rawPrice;

  const selectedPaletteLabel = values.colorPaletteId && values.colorPaletteId !== AI_PALETTE_AUTO_ID
    ? AI_PALETTES.find((p) => p.id === values.colorPaletteId)?.label
    : undefined;

  const aiCopyDescription =
    service.slug === "business-cards" ? "Writes a tagline, service list, and contact line ready to paste onto your card." :
    service.slug === "postcards" ? "Writes a headline, subheadline, short body copy, and call-to-action for your postcard." :
    service.slug === "banners" ? "Writes 3 attention-grabbing headline options sized for a banner." :
    "Turns your notes into a short creative-direction summary for your designer.";

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: service.slug === "business-cards" ? "card_copy" :
                service.slug === "postcards" ? "postcard_copy" :
                service.slug === "banners" ? "banner_headline" : "brief_summary",
          payload: {
            businessName: values.businessName,
            service: service.name,
            brandColors: selectedPaletteLabel ?? values.brandColorsNotes,
            notes: values.notes,
          },
        }),
      });
      if (res.status === 401) {
        setAiResult("Sign in to use the AI copy generator. Your other details on this page are saved.");
        return;
      }
      if (res.status === 429) {
        setAiResult("You've hit the hourly limit for AI generations. Try again in a bit, or describe what you'd like in the notes field above.");
        return;
      }
      const data = await res.json() as { text?: string; error?: string };
      setAiResult(data.text || "That didn't go through on our end. Try again in a moment, or describe what you'd like in the notes field above.");
    } catch {
      setAiResult("Couldn't reach the AI service. Check your connection and try again, or describe what you'd like in the notes field above.");
    } finally {
      setAiLoading(false);
    }
  };

  /**
   * Free is the self-serve tier: no designer is booked, so the artwork has to come from the
   * customer - an uploaded file or a design they built in the studio. Without either there is
   * literally nothing to print, and the order would reach production empty.
   */
  const emptySelfServeOrder =
    isBusinessCards
    && !values.selectedPackage
    && values.artwork?.path !== "UPLOAD"
    && !cardDesignId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    const typed = data as FormValues;

    /**
     * A studio order describes itself honestly at submit time.
     *
     * The form's artwork state can still say UPLOAD - it is restored from a draft, and the studio
     * handoff does not touch it - which made the order claim an uploaded file it never had. The
     * proof approval comes from the studio's own review screen, which gates on the same checkbox
     * the upload path uses.
     */
    if (studioDesign) {
      typed.artwork = {
        ...EMPTY_ARTWORK,
        path: "STUDIO",
        front: { ...EMPTY_ARTWORK.front, approved: proofApproved },
      };
    }

    if (emptySelfServeOrder) {
      setSubmitError(
        "There is no artwork on this order. Upload a print-ready file, design one in the studio, "
        + "or pick a design package and we will make it for you."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: service.slug, cardDesignId, testCode, ...typed }),
      });

      const result = await res.json() as { orderId?: string; error?: string };

      if (!res.ok || !result.orderId) {
        setSubmitError(result.error ?? "Something went wrong creating your order. Please try again, or contact us at (816) 521-0462.");
        return;
      }

      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId }),
      });

      if (!checkoutRes.ok) {
        setSubmitError("Your order was saved, but we couldn't start checkout. Please contact us at (816) 521-0462 to complete payment.");
        return;
      }

      const checkout = await checkoutRes.json() as { url?: string };
      if (!checkout.url) {
        setSubmitError("Your order was saved, but we couldn't start checkout. Please contact us at (816) 521-0462 to complete payment.");
        return;
      }

      window.sessionStorage.removeItem(draftKey(service.slug));
      window.location.href = checkout.url;
    } catch {
      setSubmitError("Something went wrong. Please check your connection and try again, or contact us at (816) 521-0462.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * The summary rail is shown while the customer is still configuring.
   *
   * Hidden on the review step, which already ends in its own itemised subtotal; two totals on one
   * screen invites the reader to look for the difference between them.
   */
  const showSummaryPanel = currentStep !== "payment";

  const goNext = async () => {
    // Applies to every product with real print specs, not just business cards. Banners and postcards
    // were reaching payment without this, and the package gate below then refused them silently.
    if (hasPrintSpec && currentStep === "specs") {
      if (!printPrice?.valid) return;
      // Either the artwork came from the Design Studio, our designers are doing it, or there is an
      // uploaded file with an approved proof. Without this an unapproved proof could be carried
      // straight to payment.
      if (!studioDesign && !artworkComplete(artwork, backNeeded)) {
        setArtworkError(
          artwork.path === null
            ? "Choose whether to upload your own design or have us design it."
            : !artwork.front.fileUrl
              ? "Upload your artwork to continue, or switch to having us design it."
              : backNeeded && !artwork.back.fileUrl
                ? "You picked a double-sided option, so the back needs a file too."
                : "Please approve every proof before continuing."
        );
        return;
      }
      setArtworkError(null);
    }
    // Only the package-first products require a package here. On a print-spec product the specs step
    // has no package field, so setting an error on it showed nothing at all and the button simply
    // stopped working - choosing "I have my own design" deliberately clears the package, so this
    // fired on exactly the path a customer is most likely to take.
    if (!hasPrintSpec && step === 0 && !values.selectedPackage) {
      form.setError("selectedPackage", { message: "Please select a package" });
      return;
    }
    // Checked here rather than left to the schema: businessName is required conditionally via
    // superRefine, and zod only runs refinements once the base object parses. At this point
    // guestEmail is still empty, so the refinement never fires and trigger() would wave it through.
    if (currentStep === "details" && !values.businessName?.trim()) {
      setDetailsError("Business name is required.");
      return;
    }
    setDetailsError(null);

    const fields = STEP_FIELDS[currentStep];
    const valid = fields.length === 0 || (await trigger(fields));
    if (valid) setStep((s) => s + 1);
  };

  /**
   * The spec lines shown in the order summary, per product.
   *
   * Derived from the live spec rather than assembled at submit time, so the panel is describing the
   * same configuration the price was quoted for. Each product answers in its own vocabulary - a
   * banner has a material where a card has a paper - which is why this is a switch and not a
   * generic walk over the spec object.
   */
  const summaryLines: SummaryLine[] = (() => {
    const lines: SummaryLine[] = [];
    if (isBusinessCards) {
      const bc = values.bcSpec ?? DEFAULT_BC_SPEC;
      const size = BC_SIZES.find((x) => x.id === bc.sizeId);
      if (size) {
        const [dim, orient] = splitSizeLabel(size.label);
        lines.push({ label: "Size", value: dim });
        if (orient) lines.push({ label: "Orientation", value: orient });
      }
      lines.push({ label: "Paper", value: BC_PAPERS.find((x) => x.id === bc.paperId)?.label ?? "-" });
      lines.push({ label: "Sides", value: SIDES_LABEL[bc.colorId] ?? BC_COLORS.find((x) => x.id === bc.colorId)?.label ?? "-" });
      lines.push({ label: "Quantity", value: bc.quantity ? `${bc.quantity.toLocaleString("en-US")} cards` : "Not chosen" });
      if (bc.rush) lines.push({ label: "Turnaround", value: "Rush" });
      if (bc.roundCorners) lines.push({ label: "Corners", value: "Rounded" });
    } else if (isBanners) {
      const b = values.bannerSpec ?? DEFAULT_BANNER_SPEC;
      lines.push({ label: "Size", value: b.size });
      lines.push({ label: "Material", value: b.material });
      lines.push({ label: "Grommets", value: b.grommets });
      lines.push({ label: "Quantity", value: b.quantity ? String(b.quantity) : "Not chosen" });
    } else if (isPostcards) {
      const pc = values.postcardSpec ?? DEFAULT_POSTCARD_SPEC;
      lines.push({ label: "Size", value: pc.size });
      lines.push({ label: "Paper", value: pc.paper });
      lines.push({ label: "Sides", value: pc.color });
      lines.push({ label: "Quantity", value: pc.quantity ? String(pc.quantity) : "Not chosen" });
    } else if (isRigidSigns) {
      const r = (values.rigidSpec ?? defaultRigidSpec()) as RigidSignSpec;
      const size = sizeById(r.material as RigidMaterialId, r.sizeId);
      lines.push({ label: "Material", value: rigidMaterialLabel(r.material as RigidMaterialId) });
      lines.push({ label: "Shape", value: rigidShapeLabel(r.material as RigidMaterialId, r.shapeId) });
      lines.push({ label: "Size", value: size?.label ?? "-" });
      lines.push({ label: "Quantity", value: r.quantity ? String(r.quantity) : "Not chosen" });
    } else if (isWindowDecals) {
      const w = (values.windowSpec ?? defaultWindowDecalSpec()) as WindowDecalSpec;
      const size = windowSizeById(w.material as WindowMaterialId, w.sizeId);
      lines.push({ label: "Film", value: windowMaterialLabel(w.material as WindowMaterialId) });
      lines.push({ label: "Shape", value: windowShapeLabel(w.material as WindowMaterialId, w.shapeId) });
      lines.push({ label: "Size", value: size?.label ?? "-" });
      lines.push({ label: "Quantity", value: w.quantity ? `${w.quantity.toLocaleString("en-US")} decals` : "Not chosen" });
    }
    if (selectedPkg) lines.push({ label: "Design package", value: selectedPkg.name });
    return lines;
  })();

  /** The best preview available: the studio design, then an uploaded file, then the product shot. */
  const summaryPreviewSvg = designPreview?.front ?? null;
  const summaryPreviewImage = !summaryPreviewSvg && artwork.path === "UPLOAD" ? artwork.front.fileUrl ?? null : null;

  return (
    <div className="section-pad container-tight max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-kc-dark mb-2">Order {service.name}</h1>
        {testCode && (
          // Deliberately loud. This mode reaches live Stripe and creates a real order row, so it
          // must never be mistaken for the normal flow by whoever is holding the link.
          <div className="mb-4 border-2 border-dashed border-kc-dark bg-kc-yellow/40 px-4 py-3 text-sm">
            <span className="font-black uppercase tracking-wide text-kc-dark">Test order</span>
            <span className="ml-2 text-kc-dark/80">
              Print, add-ons and shipping are all $0. This still creates a real order and a real
              Stripe session, so cancel or archive it when you&apos;re done.
            </span>
          </div>
        )}
        {cardDesignId && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-kc-coral/30 bg-kc-coral/5 px-4 py-2.5 text-sm">
            <span className="text-kc-dark">Using your custom design from the Design Studio.</span>
            <a href={`/services/${service.slug}/design/${cardDesignId}`} className="font-semibold text-kc-magenta-deep hover:underline">
              Edit design
            </a>
          </div>
        )}
        <div className="flex items-center gap-2">
          {stepKeys.map((key, i) => (
            <div key={key} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  i === step ? "bg-kc-coral text-white" :
                  i < step ? "bg-kc-coral/20 text-kc-magenta-deep cursor-pointer" :
                  "bg-kc-border text-kc-muted"
                )}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </button>
              <span className={cn("text-sm", i === step ? "font-semibold text-kc-dark" : "hidden text-kc-muted sm:block")}>{stepLabels[key]}</span>
              {i < stepKeys.length - 1 && <div className="hidden h-px w-6 bg-kc-border sm:block" />}
            </div>
          ))}
        </div>
      </div>

      {/*
        Two columns from lg up: the form on the left, the summary pinned on the right. Below lg the
        panel renders itself as a bottom sheet instead, so the grid collapses to a single column and
        nothing is squeezed.
      */}
      <div className={cn("grid grid-cols-1 gap-8", showSummaryPanel && "lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10")}>
      <form
        onSubmit={handleSubmit(onSubmit, (invalid) => {
          // A submit button that does nothing is worse than one that explains itself. Validation can
          // only fail here on a field rendered by another step, so name it rather than going quiet.
          const first = Object.values(invalid)[0] as { message?: string } | undefined;
          setSubmitError(
            first?.message
              ? `${first.message}. Please go back and check your details.`
              : "Something in the order is incomplete. Please step back through and check each section."
          );
        })}
      >
        {/* Step 0: Package (or, for business cards, real print specs priced off gotprint.com) */}
        {currentStep === "specs" && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-kc-dark">Choose Your Print Specs</h2>
              <p className="text-sm text-kc-muted">
                {isBanners
                  ? "Real print pricing: size, material and quantity all affect your price."
                  : isRigidSigns
                    ? "Real print pricing: material, shape, size, thickness and quantity all affect your price."
                    : isWindowDecals
                      ? "Real print pricing: film, shape, size and quantity all affect your price."
                      : "Real print pricing: size, paper, sides, and quantity all affect your price."}
              </p>
              {isWindowDecals ? (
                <WindowDecalPrintSpec
                  spec={(values.windowSpec ?? defaultWindowDecalSpec()) as WindowDecalSpec}
                  onPriceChange={setWindowPrice}
                  onChange={(next) => {
                    const prev = (values.windowSpec ?? defaultWindowDecalSpec()) as WindowDecalSpec;
                    setValue("windowSpec", next);
                    // Film, shape and size all decide the document, so a proof approved against the
                    // old one no longer describes what prints. Drop it rather than carry a stale
                    // approval through to the press.
                    const changedDoc = prev.material !== next.material
                      || prev.sizeId !== next.sizeId
                      || prev.shapeId !== next.shapeId;
                    if (changedDoc && artwork.path === "UPLOAD" && artwork.front.fileUrl) {
                      setValue("artwork", { ...EMPTY_ARTWORK, path: "UPLOAD" });
                    }
                  }}
                />
              ) : isRigidSigns ? (
                <RigidSignPrintSpec
                  spec={(values.rigidSpec ?? defaultRigidSpec()) as RigidSignSpec}
                  onPriceChange={setRigidPrice}
                  onChange={(next) => {
                    const prev = (values.rigidSpec ?? defaultRigidSpec()) as RigidSignSpec;
                    setValue("rigidSpec", next);
                    // Material, shape and size all decide the document, so a proof approved against
                    // the old one no longer describes what prints. Drop it rather than carry a
                    // stale approval through to the press.
                    const changedDoc = prev.material !== next.material
                      || prev.sizeId !== next.sizeId
                      || prev.shapeId !== next.shapeId;
                    if (changedDoc && artwork.path === "UPLOAD" && artwork.front.fileUrl) {
                      setValue("artwork", { ...EMPTY_ARTWORK, path: "UPLOAD" });
                    }
                  }}
                />
              ) : isPostcards ? (
                <PostcardPrintSpec
                  spec={values.postcardSpec ?? DEFAULT_POSTCARD_SPEC}
                  onChange={(next) => {
                    const prev = values.postcardSpec ?? DEFAULT_POSTCARD_SPEC;
                    setValue("postcardSpec", next);
                    // Size decides the document, so a proof approved against the old one no longer
                    // describes what prints.
                    if (prev.size !== next.size && artwork.path === "UPLOAD" && artwork.front.fileUrl) {
                      setValue("artwork", { ...EMPTY_ARTWORK, path: "UPLOAD" });
                    }
                  }}
                />
              ) : isBanners ? (
                <BannerPrintSpec
                  spec={values.bannerSpec ?? DEFAULT_BANNER_SPEC}
                  onPriceChange={setBannerPriceState}
                  onChange={(next) => {
                    const prev = values.bannerSpec ?? DEFAULT_BANNER_SPEC;
                    setValue("bannerSpec", next);
                    // Size decides the document, so a proof approved against the old one no longer
                    // describes what will print. Drop it rather than carry a stale approval.
                    if (prev.size !== next.size && artwork.path === "UPLOAD" && artwork.front.fileUrl) {
                      setValue("artwork", { ...EMPTY_ARTWORK, path: "UPLOAD" });
                    }
                  }}
                />
              ) : (
              <BusinessCardPrintSpec
                pricing={pricing}
                spec={values.bcSpec ?? DEFAULT_BC_SPEC}
                onChange={(next) => {
                  const prev = values.bcSpec ?? DEFAULT_BC_SPEC;
                  setValue("bcSpec", next);
                  // Corner finish decides the document size, so a file measured against the old
                  // finish is no longer proofed correctly. Drop the proof and make them re-upload
                  // rather than let an approved proof silently apply to a different spec.
                  if (prev.roundCorners !== next.roundCorners && artwork.path === "UPLOAD" && artwork.front.fileUrl) {
                    setValue("artwork", { ...EMPTY_ARTWORK, path: "UPLOAD" });
                  }
                }}
              />
              )}
            </div>

            <div className="space-y-4 border-t border-kc-border pt-8">
              <h2 className="text-xl font-bold text-kc-dark">Your Artwork</h2>
              {/*
                Once artwork exists this is a summary of it, not a fork.

                The section used to keep offering "upload a file" or "have us design it" even after
                the customer had chosen a template, generated an AI design or uploaded a file - so
                the page went on asking a question it already had the answer to, and there was no one
                place showing what would actually print.
              */}
              {studioDesign ? (
                <ArtworkSummary
                  source={designPreview?.fromAi ? "AI" : "STUDIO"}
                  title={designPreview?.title || "Your design"}
                  faces={[
                    {
                      label: "Front",
                      svg: designPreview?.front ?? null,
                      emptyNote: !designPreview
                        ? "Loading your design…"
                        : designPreview.title
                          ? "This side is empty"
                          : "Preview unavailable on this device — open it in the editor to check.",
                    },
                    ...(backNeeded || designPreview?.back
                      ? [{ label: "Back", svg: designPreview?.back ?? null, emptyNote: "This side is empty" }]
                      : []),
                  ]}
                  specNote="Print-ready at the size and finish above. Nothing to upload."
                  onEdit={() => { window.location.href = `/services/${service.slug}/design/${cardDesignId}`; }}
                  onReplace={() => {
                    setUploadInstead(true);
                    setValue("artwork", { ...EMPTY_ARTWORK, path: "UPLOAD" });
                  }}
                />
              ) : uploadedArtworkSource ? (
                <ArtworkSummary
                  source={uploadedArtworkSource}
                  title={artwork.front.fileName}
                  faces={[
                    { label: "Front", imageUrl: artwork.front.fileUrl },
                    ...(backNeeded
                      ? [{ label: "Back", imageUrl: artwork.back.fileUrl, emptyNote: "Not uploaded yet" }]
                      : []),
                  ]}
                  specNote={`Print-ready at ${artworkSpec.trimWidthIn}″ × ${artworkSpec.trimHeightIn}″.`}
                  editLabel="Adjust placement"
                  onEdit={() => setValue("artwork", { ...artwork, front: { ...artwork.front, approved: false } })}
                  // Replace keeps the upload route and clears the files; remove drops back to the
                  // fork so the customer can change their mind about the route entirely.
                  onReplace={() => setValue("artwork", { ...EMPTY_ARTWORK, path: "UPLOAD" })}
                  onRemove={() => { setUploadInstead(false); setValue("artwork", EMPTY_ARTWORK); }}
                  removeWarning="This removes the file you uploaded and the proof you approved. You'll choose again between uploading a file and having us design it."
                />
              ) : (
                <>
              <p className="text-sm text-kc-muted">Upload a print-ready file, or have our designers build it for you.</p>
              <ArtworkStep
                value={artwork}
                onChange={(next) => {
                  setValue("artwork", next);
                  // "Design it for me" then landing on a Free self-serve package contradicts the
                  // choice just made. Gold is the popular tier, and it stays changeable.
                  if (next.path === "DESIGN_SERVICE" && !values.selectedPackage) {
                    const gold = service.packages.find((p) => p.name.toLowerCase() === "gold")
                      ?? service.packages.find((p) => p.popular)
                      ?? service.packages[0];
                    if (gold) setValue("selectedPackage", gold.name);
                  }
                  // Switching to upload means they are not buying a design package after all.
                  if (next.path === "UPLOAD" && values.selectedPackage) {
                    setValue("selectedPackage", "");
                  }
                }}
                roundCorners={(values.bcSpec ?? DEFAULT_BC_SPEC).roundCorners}
                needsBack={backNeeded}
                backLabel={
                  isPostcards
                    ? postcardBackLabel((values.postcardSpec ?? DEFAULT_POSTCARD_SPEC).color)
                    : isRigidSigns
                      ? rigidBackLabel()
                      : backArtworkLabel((values.bcSpec ?? DEFAULT_BC_SPEC).colorId)
                }
                spec={artworkSpec}
              />
                </>
              )}
              {artworkError && (
                <p role="alert" className="text-sm text-red-600">{artworkError}</p>
              )}
            </div>
          </div>
        )}
        {currentStep === "package" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-kc-dark">Select a Package</h2>
            {/* Boxed and given visual priority: the package pick is what actually drives price for
                this product (see the `price` calc above), so the total is shown immediately below
                it rather than waiting until the add-ons list or the footer. */}
            <div className="rounded-xl border-2 border-kc-coral/30 bg-white p-5">
              <div className={`grid grid-cols-1 gap-4 ${service.packages.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>
                {service.packages.map((pkg) => (
                  <button
                    key={pkg.name}
                    type="button"
                    onClick={() => setValue("selectedPackage", pkg.name)}
                    className={cn(
                      "relative rounded-xl border-2 p-5 text-left transition-all",
                      values.selectedPackage === pkg.name
                        ? "border-kc-coral bg-kc-coral/5 shadow-md"
                        : "border-kc-border bg-white hover:border-kc-coral/40"
                    )}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-kc-coral text-white border-0 text-xs">
                        Most Popular
                      </Badge>
                    )}
                    <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">{pkg.name}</div>
                    <div className="text-3xl font-black text-kc-dark mb-3">{formatDollars(pkg.price)}</div>
                    <ul className="space-y-1.5">
                      {pkg.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-kc-muted">
                          <CheckCircle2 className="h-3.5 w-3.5 text-kc-magenta-deep shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              {errors.selectedPackage && <p className="mt-3 text-xs text-red-500">{errors.selectedPackage.message}</p>}

              {selectedPkg && price && (
                <div className="mt-5 border-t border-kc-border pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Package Total</div>
                      <div className="text-xs text-kc-muted">{selectedPkg.name}</div>
                    </div>
                    <div className="text-3xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
                  </div>
                  {selectedAddOnPrices.some((p) => p > 0) && (
                    <div className="mt-3 space-y-1 border-t border-dashed border-kc-border pt-3 text-xs text-kc-muted">
                      <div className="flex justify-between"><span>{selectedPkg.name} package</span><span>{formatDollars(selectedPkg.price)}</span></div>
                      {(values.selectedAddOns ?? []).map((name) => {
                        const ao = service.addOns.find((a) => a.name === name);
                        return ao ? <div key={name} className="flex justify-between"><span>{ao.name}</span><span>+{formatDollars(ao.price)}</span></div> : null;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add-ons: plain and low-key on purpose — optional extras, not a second set of
                decisions competing with the package choice above. */}
            {service.addOns.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-kc-muted">Optional add-ons</p>
                <div className="divide-y divide-kc-border overflow-hidden rounded-lg border border-kc-border">
                  {service.addOns.map((ao) => {
                    const isSelected = (values.selectedAddOns ?? []).includes(ao.name);
                    return (
                      <label key={ao.name} className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-kc-bg">
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const current = values.selectedAddOns ?? [];
                              setValue("selectedAddOns", isSelected ? current.filter((n) => n !== ao.name) : [...current, ao.name]);
                            }}
                            className="h-4 w-4 shrink-0 accent-kc-coral"
                          />
                          <span>
                            <span className="block text-sm text-kc-dark">{ao.name}</span>
                            <span className="block text-xs text-kc-muted">{ao.desc}</span>
                          </span>
                        </span>
                        {isSelected && <span className="shrink-0 text-xs text-kc-muted">+{formatDollars(ao.price)}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Options (or, for business cards, the optional design service upsell) */}
        {currentStep === "design" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-kc-dark">Design Service</h2>
            <p className="text-sm text-kc-muted">Have your own artwork? Skip this: you can upload your file after checkout. Want us to design it for you? Pick a package below.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setValue("selectedPackage", "")}
                className={cn(
                  "relative rounded-xl border-2 p-5 text-left transition-all",
                  !values.selectedPackage ? "border-kc-coral bg-kc-coral/5 shadow-md" : "border-kc-border bg-white hover:border-kc-coral/40"
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">Self-Serve</div>
                <div className="text-3xl font-black text-kc-dark mb-3">Free</div>
                <p className="text-xs text-kc-muted">Upload your own print-ready file, or use our free design studio.</p>
              </button>
              {service.packages.map((pkg) => (
                <button
                  key={pkg.name}
                  type="button"
                  onClick={() => setValue("selectedPackage", pkg.name)}
                  className={cn(
                    "relative rounded-xl border-2 p-5 text-left transition-all",
                    values.selectedPackage === pkg.name
                      ? "border-kc-coral bg-kc-coral/5 shadow-md"
                      : "border-kc-border bg-white hover:border-kc-coral/40"
                  )}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-kc-coral text-white border-0 text-xs">
                      Most Popular
                    </Badge>
                  )}
                  <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">{pkg.name}</div>
                  <div className="text-3xl font-black text-kc-dark mb-3">{formatDollars(pkg.price)}</div>
                  <ul className="space-y-1.5">
                    {pkg.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-kc-muted">
                        <CheckCircle2 className="h-3.5 w-3.5 text-kc-magenta-deep shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {service.addOns.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-kc-dark mb-3">Add-Ons (optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.addOns.map((ao) => {
                    const isSelected = (values.selectedAddOns ?? []).includes(ao.name);
                    return (
                      <button
                        key={ao.name}
                        type="button"
                        onClick={() => {
                          const current = values.selectedAddOns ?? [];
                          setValue(
                            "selectedAddOns",
                            isSelected ? current.filter((n) => n !== ao.name) : [...current, ao.name]
                          );
                        }}
                        className={cn(
                          "rounded-lg border-2 p-3 text-left transition-all",
                          isSelected ? "border-kc-coral bg-kc-coral/5" : "border-kc-border bg-white hover:border-kc-coral/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-kc-dark">{ao.name}</span>
                          <Badge className="bg-kc-yellow/30 text-kc-dark border-0 text-xs">+{formatDollars(ao.price)}</Badge>
                        </div>
                        <p className="text-xs text-kc-muted mt-0.5">{ao.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {currentStep === "options" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-kc-dark">Select Options</h2>
            <div className="rounded-xl border-2 border-kc-coral/30 bg-white p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {service.specs
                  .filter((s) => ["ORIENTATION", "CUSTOM"].some((t) => s.label.toUpperCase().includes(t)))
                  .map((spec) => (
                    <div key={spec.label} className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
                      <Label>{spec.label}</Label>
                      <p className="text-sm text-kc-muted">{spec.value}</p>
                    </div>
                  ))}
                {service.specs
                  .filter((s) => {
                    const up = s.label.toUpperCase();
                    if (up.includes("CUSTOM")) return false;
                    return ["PAPER", "MATERIAL", "SIZE", "TYPE", "SHAPE"].some((t) => up.includes(t));
                  })
                  .map((spec) => {
                    // Not every matching spec is actually a clean list of discrete choices — some are
                    // prose ranges ("12x12 in up to 18x10 in depending on shape, custom sizes
                    // available") that happen to contain a comma, or a single sentence with no comma
                    // at all ("Roll-Up Stand or Vinyl Banner"). Splitting those naively produced
                    // garbage dropdown options. Only render a Select when the split genuinely yields
                    // 2+ short, non-range-sounding tokens; otherwise fall back to descriptive text.
                    const commaParts = spec.value.split(",").map((v) => v.trim()).filter(Boolean);
                    const choices = commaParts.length > 1 ? commaParts : spec.value.split(/\s+or\s+/i).map((v) => v.trim()).filter(Boolean);
                    const isCleanList = choices.length > 1 && choices.every((c) => c.length <= 35 && !/\bup to\b/i.test(c));
                    if (!isCleanList) {
                      return (
                        <div key={spec.label} className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
                          <Label>{spec.label}</Label>
                          <p className="text-sm text-kc-muted">{spec.value}</p>
                        </div>
                      );
                    }
                    const article = /^[aeiou]/i.test(spec.label) ? "an" : "a";
                    return (
                      <div key={spec.label} className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
                        <Label>{spec.label}</Label>
                        <Select
                          value={values.selectedOption?.[spec.label] ?? ""}
                          onValueChange={(v) => v && setValue("selectedOption", { ...values.selectedOption, [spec.label]: v })}
                        >
                          <SelectTrigger aria-label={spec.label} className="bg-white"><SelectValue placeholder={`Choose ${article} ${spec.label.toLowerCase().replace(/s$/, "")}`} /></SelectTrigger>
                          <SelectContent>
                            {choices.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                <div className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
                  <Label htmlFor="quantity">Quantity / Scope</Label>
                  <Input id="quantity" type="number" min="1" {...register("quantity", { valueAsNumber: true })} className="bg-white" />
                  {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === "details" && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-kc-dark">Project Details</h2>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input id="businessName" placeholder="Your business name" {...register("businessName")} />
              {(errors.businessName || detailsError) && (
                <p className="text-xs text-red-500">{errors.businessName?.message ?? detailsError}</p>
              )}
            </div>

            {designMetaLoaded && !detailsExpanded ? (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-kc-coral/30 bg-kc-coral/5 p-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kc-magenta-deep" />
                  <div className="text-sm">
                    <p className="font-medium text-kc-dark">Using contact info &amp; colors from your design</p>
                    <p className="mt-0.5 text-xs text-kc-muted">
                      {[values.phone, values.email, values.website].filter(Boolean).join(" · ") || "No contact info was set."}
                      {selectedPaletteLabel ? ` · ${selectedPaletteLabel} palette` : ""}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailsExpanded(true)} className="border-kc-border shrink-0">
                  Edit
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Contact Info for Design (optional)</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="Phone" {...register("phone")} />
                    <Input placeholder="Email" {...register("email")} />
                    <Input placeholder="Website" {...register("website")} />
                    <Input placeholder="LinkedIn (optional)" {...register("linkedin")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Brand Colors (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setValue("colorPaletteId", AI_PALETTE_AUTO_ID)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors",
                        (values.colorPaletteId ?? AI_PALETTE_AUTO_ID) === AI_PALETTE_AUTO_ID
                          ? "border-kc-coral bg-kc-coral/10 text-kc-magenta-deep"
                          : "border-kc-border text-kc-muted hover:border-kc-coral/40"
                      )}
                    >
                      <Sparkles className="h-3 w-3" /> Surprise Me
                    </button>
                    {AI_PALETTES.map((p) => {
                      const active = values.colorPaletteId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          title={p.label}
                          onClick={() => setValue("colorPaletteId", p.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1.5 text-xs font-medium transition-colors",
                            active ? "border-kc-dark bg-kc-bg" : "border-kc-border hover:border-kc-dark/40"
                          )}
                        >
                          <span className="flex -space-x-1">
                            {p.colors.map((c, i) => (
                              <span key={i} className="h-3.5 w-3.5 rounded-full border border-white" style={{ backgroundColor: c }} />
                            ))}
                          </span>
                          {active && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                  <Input placeholder="Or describe custom colors, e.g. Navy blue #173B64, Gold #FFDE70" {...register("brandColorsNotes")} className="mt-1" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Project Notes</Label>
              <Textarea
                id="notes"
                placeholder="Describe your vision, style preferences, any must-have elements, or inspiration..."
                rows={4}
                {...register("notes")}
              />
            </div>

            <div className="rounded-xl border-2 border-kc-coral/20 bg-gradient-to-br from-kc-coral/5 to-kc-yellow/5 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-kc-coral/15">
                    <Sparkles className="h-4.5 w-4.5 text-kc-magenta-deep" />
                  </div>
                  <div>
                    <span className="block font-semibold text-kc-dark text-sm">AI Copy Generator</span>
                    <span className="block text-xs text-kc-muted">{aiCopyDescription}</span>
                  </div>
                </div>
                <Button type="button" onClick={generateAI} disabled={aiLoading || !values.businessName}
                  className="bg-kc-coral text-white hover:bg-kc-coral/90 disabled:bg-kc-coral/30 disabled:text-white disabled:opacity-100">
                  {aiLoading ? (
                    <span className="flex items-center gap-2">Generating…</span>
                  ) : (
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generate Ideas</span>
                  )}
                </Button>
              </div>
              {aiResult && (
                <div className="rounded-lg border border-kc-border bg-white p-4 text-sm text-kc-dark whitespace-pre-wrap shadow-sm">
                  {aiResult}
                </div>
              )}
              {!aiResult && !aiLoading && (
                <p className="text-xs text-kc-muted">
                  {values.businessName
                    ? "Uses your business name, notes, and brand colors above. Click “Generate Ideas” and copy anything useful into the notes field."
                    : "Enter your business name above, then click “Generate Ideas” to get AI-written copy for this project."}
                </p>
              )}
            </div>

            <BrandFileUpload
              value={values.brandFiles ?? []}
              onChange={(files: BrandFile[]) => setValue("brandFiles", files)}
            />
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === "payment" && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-kc-dark">Review and Pay</h2>
            <Card className="border-kc-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-kc-muted">Service</span>
                  <span className="font-medium text-kc-dark">{service.name}</span>
                </div>
                {isBusinessCards && artwork.path && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Artwork</span>
                    <span className="font-medium text-kc-dark text-right">
                      {artwork.path === "UPLOAD"
                        ? backNeeded
                          ? `${artwork.front.fileName ?? "Front"} + ${artwork.back.fileName ?? "Back"} · both proofs approved`
                          : `${artwork.front.fileName ?? "Uploaded file"} · proof approved`
                        : "Designed by 611 Printing"}
                    </span>
                  </div>
                )}
                {isBusinessCards && values.bcSpec && bcPrice?.valid && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Size</span>
                      <span className="font-medium text-kc-dark">{BC_SIZES.find((s) => s.id === values.bcSpec!.sizeId)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Paper</span>
                      <span className="font-medium text-kc-dark">{BC_PAPERS.find((p) => p.id === values.bcSpec!.paperId)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Sides</span>
                      <span className="font-medium text-kc-dark">{BC_COLORS.find((c) => c.id === values.bcSpec!.colorId)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Quantity</span>
                      <span className="font-medium text-kc-dark">{values.bcSpec.quantity.toLocaleString("en-US")} cards</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Printing</span>
                      <span className="font-medium text-kc-dark">{formatDollars(bcPrice.total)}</span>
                    </div>
                  </>
                )}
                {values.selectedPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">{isBusinessCards ? "Design Service" : "Package"}</span>
                    <span className="font-medium text-kc-dark">{values.selectedPackage} - {formatDollars(selectedPkg?.price ?? 0)}</span>
                  </div>
                )}
                {isBusinessCards && !values.selectedPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Design Service</span>
                    <span className="font-medium text-kc-dark">Self-serve (free)</span>
                  </div>
                )}
                {(values.selectedAddOns ?? []).length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Add-Ons</span>
                    <span className="font-medium text-kc-dark">{(values.selectedAddOns ?? []).join(", ")}</span>
                  </div>
                )}
                {Object.entries(values.selectedOption ?? {}).map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-kc-muted">{label}</span>
                    <span className="font-medium text-kc-dark">{val}</span>
                  </div>
                ))}
                {values.quantity > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Quantity</span>
                    <span className="font-medium text-kc-dark">{values.quantity}</span>
                  </div>
                )}
                {values.businessName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Business Name</span>
                    <span className="font-medium text-kc-dark">{values.businessName}</span>
                  </div>
                )}
                {[values.phone, values.email, values.website, values.linkedin].some(Boolean) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Contact Info</span>
                    <span className="font-medium text-kc-dark text-right">
                      {[values.phone, values.email, values.website, values.linkedin].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}
                {(selectedPaletteLabel || values.brandColorsNotes) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Brand Colors</span>
                    <span className="font-medium text-kc-dark text-right">{selectedPaletteLabel ?? values.brandColorsNotes}</span>
                  </div>
                )}
                {values.notes && (
                  <div className="text-sm">
                    <span className="text-kc-muted">Notes</span>
                    <p className="mt-1 font-medium text-kc-dark">{values.notes}</p>
                  </div>
                )}
                {values.brandFiles && values.brandFiles.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Brand Files</span>
                    <span className="font-medium text-kc-dark text-right">
                      {values.brandFiles.length} file{values.brandFiles.length === 1 ? "" : "s"} attached
                    </span>
                  </div>
                )}
                <div className="border-t border-kc-border pt-3">
                  <div className="flex justify-between font-bold">
                    {/* Not "Total": shipping and tax are added on Stripe's page, and calling this a
                        total makes the figure jump the moment they are. */}
                    <span>Subtotal</span>
                    <span className="text-kc-magenta-deep text-lg">{price ? formatDollars(price.total) : "--"}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-kc-muted">
                    {testCode
                      ? "Free test order - nothing to pay."
                      : `Shipping from ${formatDollars(cheapestShipping)} and sales tax are added at checkout, once you enter your delivery address.`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {availableAddOns.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-kc-muted">Optional add-ons</p>
                <div className="divide-y divide-kc-border overflow-hidden rounded-lg border border-kc-border">
                  {availableAddOns.map((ao) => {
                    const isSelected = (values.selectedAddOns ?? []).includes(ao.name);
                    return (
                      <label key={ao.name} className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-kc-bg">
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const current = values.selectedAddOns ?? [];
                              setValue("selectedAddOns", isSelected ? current.filter((n) => n !== ao.name) : [...current, ao.name]);
                            }}
                            className="h-4 w-4 shrink-0 accent-kc-coral"
                          />
                          <span>
                            <span className="block text-sm text-kc-dark">{ao.name}</span>
                            <span className="block text-xs text-kc-muted">{ao.desc}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-kc-muted">+{formatDollars(ao.price)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reference only. Stripe collects the delivery address on its own page and presents
                these speeds there with real delivery dates, so there is nothing to select here. */}
            <div className="rounded-lg border border-dashed border-kc-border bg-kc-bg p-4">
              <div className="mb-1 flex items-baseline gap-2">
                <Truck className="h-4 w-4 shrink-0 text-kc-muted" strokeWidth={1.75} />
                <p className="text-sm font-semibold text-kc-dark">You choose your shipping speed at checkout</p>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-kc-muted">
                The next screen collects your delivery address, then shows these speeds with real
                delivery dates.
              </p>
              <dl className="space-y-1">
                {(testCode ? [FREE_TEST_SHIPPING] : pricing.shippingTiers).map((tier) => (
                  <div key={tier.id} className="flex items-baseline justify-between gap-3 text-xs">
                    <dt className="text-kc-muted">
                      {tier.label}<span className="text-kc-muted/70"> - {transitLabel(tier)}</span>
                    </dt>
                    <dd className="shrink-0 font-mono text-kc-dark">{formatDollars(tier.price)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestEmail">Email for order confirmation *</Label>
              <Input id="guestEmail" type="email" placeholder="you@example.com" {...register("guestEmail")} />
              <p className="text-xs text-kc-muted">
                We&apos;ll send your receipt and print files here. You don&apos;t need an account to order, only to save designs or use AI generation.
              </p>
              {errors.guestEmail && <p className="text-xs text-red-500">{errors.guestEmail.message}</p>}
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={values.acceptedTerms}
                  onChange={(e) => setValue("acceptedTerms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-kc-coral"
                />
                <span className="text-sm leading-relaxed text-kc-dark">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-kc-magenta-deep hover:text-kc-dark">
                    Terms of Sale
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-kc-magenta-deep hover:text-kc-dark">
                    Privacy Policy
                  </a>
                  . I understand that once I approve a proof, the design is final.
                </span>
              </label>
              {errors.acceptedTerms && (
                <p className="mt-1.5 text-xs text-red-500">{errors.acceptedTerms.message}</p>
              )}
            </div>

            {submitError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-kc-border pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="border-kc-border"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          {price && (
            <div className="text-center">
              <div className="text-xs text-kc-muted">Estimated Total (before tax)</div>
              <div className="text-xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
            </div>
          )}

          {step < stepKeys.length - 1 ? (
            <Button
              key="next-button"
              type="button"
              onClick={goNext}
              className="bg-kc-coral hover:bg-kc-coral/90 text-white"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              <Button
                key="submit-button"
                type="submit"
                disabled={submitting || emptySelfServeOrder}
                className="bg-kc-coral hover:bg-kc-coral/90 text-white"
              >
                {submitting ? "Processing..." : "Proceed to Payment"}
                {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              {emptySelfServeOrder && (
                <p className="max-w-xs text-right text-xs text-kc-muted">
                  Add artwork or pick a design package first.
                </p>
              )}
            </div>
          )}
        </div>
      </form>

      {showSummaryPanel && (
        <OrderSummaryPanel
          productName={service.name}
          previewSvg={summaryPreviewSvg}
          previewImageUrl={summaryPreviewImage}
          fallbackImageUrl={`/images/print/${service.slug}.webp`}
          previewAlt={`${service.name} preview`}
          lines={summaryLines}
          total={price ? price.total : null}
          loading={hasPrintSpec && printPrice === null}
          unavailableReason={
            hasPrintSpec && printPrice && !printPrice.valid
              ? printPrice.error ?? "Choose an available combination to see your price."
              : null
          }
          shippingTiers={testCode ? [FREE_TEST_SHIPPING] : pricing.shippingTiers}
          ctaLabel="Continue"
          onCta={goNext}
          ctaDisabled={hasPrintSpec && !printPrice?.valid}
          footnote={
            testCode
              ? "Free test order - nothing to pay."
              : `Shipping from ${formatDollars(cheapestShipping)} and sales tax are added at checkout.`
          }
        />
      )}
      </div>
    </div>
  );
}

/** "2\" x 3.5\" Horizontal U.S. Standard" -> ["2″ × 3.5″ U.S. Standard", "Horizontal"] */
function splitSizeLabel(label: string): [string, string] {
  const m = label.match(/^(.*?)\s+(Horizontal|Vertical)\s*(.*)$/i);
  const pretty = (v: string) => v.replace(/"/g, "\u2033").replace(" x ", " \u00d7 ").trim();
  if (!m) return [pretty(label), ""];
  return [pretty(`${m[1]} ${m[3]}`.trim()), m[2]];
}
