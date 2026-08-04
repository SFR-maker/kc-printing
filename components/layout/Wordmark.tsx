import { cn } from "@/lib/utils";

/**
 * The 611 Printing mark.
 *
 * Built from the design system already on the page rather than invented alongside it: the ink tile
 * is `kc-ink`, the corners are square to match the 2px `.edge` trim used throughout, and the strip
 * under the numerals is the same four-colour CMYK registration bar that opens most sections
 * (`.reg-bar`). A print shop's mark should look like it came off a press, and the registration bar
 * is the one motif on this site that unambiguously says printing.
 *
 * Drawn as SVG with the numerals as paths-free text at a fixed viewBox, so it stays crisp at any
 * size and needs no webfont to render correctly in a favicon or an email client.
 */
export function Wordmark({
  className,
  showText = true,
}: {
  className?: string;
  /** Hide the wordmark to leave just the tile, for tight spaces like a mobile bar. */
  showText?: boolean;
}) {
  return (
    <span className={cn("flex shrink-0 items-center gap-2.5", className)}>
      <LogoTile className="h-8 w-8" />
      {showText && <span className="display-tight text-[17px] text-kc-dark">611 Printing</span>}
    </span>
  );
}

/** The square mark on its own — favicon, app icon, avatar. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("edge", className)}
      role="img"
      aria-label="611 Printing"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" fill="#121110" />
      {/* Numerals sit slightly high to leave room for the registration bar, the way a trim mark
          sits inside a bleed. */}
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="19"
        fontWeight="800"
        letterSpacing="-0.9"
      >
        611
      </text>
      {/* The same CMYK registration bar the site uses to open a section. */}
      <rect x="0" y="31" width="10" height="3.5" fill="#0099d8" />
      <rect x="10" y="31" width="10" height="3.5" fill="#e6007e" />
      <rect x="20" y="31" width="10" height="3.5" fill="#fbc800" />
      <rect x="30" y="31" width="10" height="3.5" fill="#6B6461" />
    </svg>
  );
}
