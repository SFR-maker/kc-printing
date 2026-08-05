import { cn } from "@/lib/utils";

/**
 * The 611 Printing mark.
 *
 * Built from the design system already on the page rather than invented alongside it: the tile has
 * square corners matching the 2px `.edge` trim used throughout, and the strip under the numerals is
 * the same four-colour CMYK registration bar that opens most sections (`.reg-bar`). A print shop's
 * mark should look like it came off a press, and that bar is the one motif here that says printing
 * without needing a caption.
 *
 * The numerals live in the tile and the word beside it is just "Printing" - the lockup reads
 * "611 Printing" as a whole, so repeating the number in the text would say it twice.
 */
export function Wordmark({
  className,
  variant = "default",
  showText = true,
}: {
  className?: string;
  /** "inverse" for the ink footer, where a dark tile would disappear into the background. */
  variant?: "default" | "inverse";
  /** Hide the word to leave just the tile, for tight spaces like a mobile bar. */
  showText?: boolean;
}) {
  const inverse = variant === "inverse";
  return (
    <span className={cn("flex shrink-0 items-center gap-2.5", className)}>
      {/* Decorative here: the accessible name comes from the sr-only span below, so a screen
          reader announces "611 Printing" once rather than the number twice. */}
      <LogoTile className="h-10 w-10" variant={variant} aria-hidden />
      {showText && (
        <>
          <span className="sr-only">611 Printing</span>
          <span
            aria-hidden
            className={cn("display-tight text-[21.4px]", inverse ? "text-white" : "text-kc-dark")}
          >
            Printing
          </span>
        </>
      )}
    </span>
  );
}

/** The square mark on its own — favicon, app icon, avatar. */
export function LogoTile({
  className,
  variant = "default",
  ...rest
}: {
  className?: string;
  variant?: "default" | "inverse";
} & React.SVGProps<SVGSVGElement>) {
  const inverse = variant === "inverse";
  const bg = inverse ? "#FFFFFF" : "#121110";
  const fg = inverse ? "#121110" : "#FFFFFF";
  // The K of CMYK has to flip too: pure black vanishes on the ink tile, white vanishes on the
  // inverse one, so each variant uses the readable end of the neutral.
  const k = inverse ? "#121110" : "#6B6461";

  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("edge", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...(rest["aria-hidden"] ? {} : { role: "img", "aria-label": "611 Printing" })}
      {...rest}
    >
      <rect width="40" height="40" fill={bg} />
      {/* Numerals sit high to leave room for the registration bar, the way artwork sits inside a
          trim line. */}
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fill={fg}
        fontFamily="Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="19"
        fontWeight="800"
        letterSpacing="-0.9"
      >
        611
      </text>
      <rect x="0" y="31" width="10" height="3.5" fill="#0099d8" />
      <rect x="10" y="31" width="10" height="3.5" fill="#e6007e" />
      <rect x="20" y="31" width="10" height="3.5" fill="#fbc800" />
      <rect x="30" y="31" width="10" height="3.5" fill={k} />
    </svg>
  );
}
