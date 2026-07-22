/**
 * A composed, print-inspired hero visual built from real layout/typography (not a stock photo —
 * the project has no product photography available). Suggests three tangible printed pieces
 * (business card, postcard, banner swatch) with paper-edge shadows and slight rotation, instead of
 * a generic gradient blob or floating laptop mockup.
 *
 * All three layers are anchored with plain top/left/right/bottom percentages (no transform-based
 * centering) so nothing depends on the element's own rendered size — that's what caused an earlier
 * version of this component to overflow the hero section on real screens.
 */
export function PrintStack() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-md sm:h-[460px]" aria-hidden>
      {/* Banner swatch — tall strip, back-left */}
      <div className="paper-grain absolute left-[6%] top-0 h-[62%] w-[26%] -rotate-6 rounded-sm border border-black/5 bg-kc-teal shadow-[0_18px_40px_-12px_rgba(20,10,40,0.35)]">
        <div className="flex h-full flex-col justify-between p-3">
          <div className="h-1.5 w-8 rounded-full bg-white/70" />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/70">Roll-Up</div>
            <div className="text-xs font-black leading-none text-white">33&Prime;×81&Prime;</div>
          </div>
        </div>
      </div>

      {/* Postcard — wide format, back-right */}
      <div className="paper-grain absolute right-[4%] top-[8%] w-[54%] rotate-3 rounded-sm border border-black/5 bg-kc-orange-tint shadow-[0_18px_40px_-12px_rgba(20,10,40,0.28)]">
        <div className="aspect-[6/4] p-4">
          <div className="flex h-full flex-col justify-between">
            <div className="flex gap-1.5">
              <span className="ink-swatch bg-kc-coral" />
              <span className="ink-swatch bg-kc-teal" />
              <span className="ink-swatch bg-kc-yellow" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-kc-coral">Postcard · 4×6</div>
              <div className="mt-1 h-1.5 w-2/3 rounded-full bg-kc-dark/15" />
            </div>
          </div>
        </div>
      </div>

      {/* Business card — front and center, sharpest shadow */}
      <div className="crop-mark paper-grain absolute bottom-[6%] left-[14%] w-[58%] -rotate-2 rounded-sm border border-black/5 bg-white text-kc-dark shadow-[0_24px_50px_-14px_rgba(20,10,40,0.4)]">
        <div className="aspect-[7/4] p-4">
          <div className="flex h-full flex-col justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-kc-teal text-xs font-black text-white">KC</div>
            <div>
              <div className="text-sm font-bold leading-tight">Jordan Reyes</div>
              <div className="text-[11px] text-kc-muted">Reyes Landscaping</div>
              <div className="mt-1 text-[10px] text-kc-muted">(816) 555-0148</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
