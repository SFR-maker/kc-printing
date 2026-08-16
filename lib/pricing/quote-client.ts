/**
 * Fetches a quote from the price endpoints, and remembers what it already asked.
 *
 * The pickers re-quote on every option change - the rigid-sign one watches seven fields - so
 * configuring a sign end to end fires a request per click, and every step backwards re-asks a
 * question that was answered a moment ago. A customer comparing two quantities toggles between the
 * same two URLs repeatedly.
 *
 * The request is a GET so the CDN can answer it (see quote-response on the server side), and this
 * module-scope map means a spec already quoted in this session costs nothing at all - not even a
 * conditional request. It is safe to keep for the life of the page: the tables are compiled into
 * the deployment, so within one page view a given spec cannot change price.
 */

const cache = new Map<string, unknown>();

/**
 * The shape every price endpoint returns.
 *
 * Deliberately loose on `total`: the routes return a number, but each picker already coerces with
 * Number() because a malformed response should show "could not price" rather than NaN.
 */
export interface QuoteJson {
  valid?: boolean;
  total?: number;
  error?: string;
  base?: number;
  finishing?: number;
}

/**
 * Builds a stable URL for a spec.
 *
 * Keys are sorted so `{a,b}` and `{b,a}` produce one cache entry rather than two, on the client and
 * in the CDN alike. Undefined values are dropped so an optional field left unset does not become
 * the literal string "undefined".
 */
export function quoteUrl(endpoint: string, spec: object): string {
  const params = new URLSearchParams();
  const fields = spec as Record<string, unknown>;
  for (const key of Object.keys(fields).sort()) {
    const value = fields[key];
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  return `${endpoint}?${params.toString()}`;
}

/** The quote for a spec, from memory when it has been asked before. */
export async function fetchQuote<T>(endpoint: string, spec: object): Promise<T> {
  const url = quoteUrl(endpoint, spec);
  const hit = cache.get(url);
  if (hit !== undefined) return hit as T;

  const res = await fetch(url);
  const json = await res.json();
  // Only successful quotes are remembered. A 400 is usually a half-finished configuration, and
  // caching "that combination isn't available" against a spec the customer is still building would
  // keep showing the error after they finished it.
  if (res.ok) cache.set(url, json);
  return json as T;
}
