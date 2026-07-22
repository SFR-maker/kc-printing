"use client";

import { useEffect, useState } from "react";

/** SSR-safe media query hook. Returns false on the server and first client render, then updates after mount. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // matchMedia isn't available during SSR, so the real value can only be read post-mount.
    const mql = window.matchMedia(query);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export const MOBILE_BREAKPOINT = "(max-width: 767px)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT);
}
