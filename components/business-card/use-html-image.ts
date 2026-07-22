"use client";

import { useEffect, useState } from "react";

/**
 * Minimal image loader for Konva.Image — avoids pulling in the `use-image` package for one hook.
 * Status is derived from comparing the requested `src` to which src last loaded/failed (rather
 * than tracked as its own state field) so no setState call happens synchronously in the effect
 * body — only inside the async onload/onerror callbacks — and it self-heals when `src` changes.
 */
export function useHtmlImage(src: string | undefined): [HTMLImageElement | undefined, "loading" | "loaded" | "failed"] {
  const [loaded, setLoaded] = useState<{ src: string; image: HTMLImageElement } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoaded({ src, image: img });
    img.onerror = () => setFailedSrc(src);
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (!src || failedSrc === src) return [undefined, "failed"];
  if (loaded?.src === src) return [loaded.image, "loaded"];
  return [undefined, "loading"];
}
