/**
 * Stands in for the configurator until it hydrates.
 *
 * The Suspense boundary around ProductBuilder is not decoration: ProductBuilder reads the URL with
 * useSearchParams, and without a boundary that opts the whole route back into per-request rendering
 * - which is exactly what these pages were changed to stop doing.
 *
 * It mirrors the configurator's own two-column shape rather than showing a spinner, so the page
 * does not visibly rearrange when the real thing arrives. This is the first screen of the shop's
 * highest-intent page; a layout jump here reads as the site being unfinished.
 */
export function ConfiguratorSkeleton() {
  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-16 pt-6 sm:px-6 lg:px-8" aria-hidden="true">
      <div className="mb-5">
        <div className="mb-3 h-9 w-72 max-w-full animate-pulse rounded bg-kc-border" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-7 w-7 animate-pulse rounded-full bg-kc-border" />
              <div className="hidden h-4 w-20 animate-pulse rounded bg-kc-border sm:block" />
              {i < 3 && <div className="hidden h-px w-6 bg-kc-border sm:block" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        {/* The product preview */}
        <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-kc-border" />
        {/* The options column */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-kc-border" />
              <div className="h-11 w-full animate-pulse rounded bg-kc-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
