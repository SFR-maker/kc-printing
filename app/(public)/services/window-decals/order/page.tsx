import { redirect } from "next/navigation";

/**
 * /order is now the same page as the product page.
 *
 * The configurator was merged into /services/window-decals, which left this URL serving a byte-identical
 * second copy: indexable, uncanonicalised, and linked from the homepage, so the duplicate was
 * reachable in one click. Redirecting rather than deleting keeps every existing link, bookmark and
 * email working - including the ones the editor sends after a proof is approved, which carry
 * designId and proof and must survive the hop.
 */
export default async function OrderRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v) && v[0] !== undefined) qs.set(k, v[0]);
  }
  const q = qs.toString();
  redirect(`/services/window-decals${q ? `?${q}` : ""}`);
}
