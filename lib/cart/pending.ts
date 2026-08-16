/**
 * What a customer can pick back up.
 *
 * Two different things end up here, and the difference matters to the person reading the cart:
 *
 *   a saved configuration - options chosen, never submitted. Resuming means reopening the product
 *                           page with the draft restored.
 *   an unpaid order       - submitted and priced, then payment abandoned. It exists in the database
 *                           as a DRAFT order, and resuming means going back to Stripe.
 *
 * The second is the expensive one to lose. Someone who has uploaded artwork, approved a proof and
 * reached the payment screen has done all the work; if their card is declined or they close the tab
 * to find a different card, the previous behaviour was that everything vanished and they began
 * again from an empty configurator. Most people do not begin again.
 *
 * Storage is localStorage, not sessionStorage. That is the whole point: sessionStorage is cleared
 * when the tab closes, which is precisely the moment a customer goes away to find their wallet.
 */

const PENDING_KEY = "kc-pending-orders";
export const DRAFT_PREFIX = "kc-order-draft-";

/** An order that exists in the database but has not been paid for. */
export interface PendingOrder {
  orderId: string;
  /** Product slug, e.g. "business-cards" - used for the label and the link back. */
  service: string;
  total: number;
  savedAt: number;
}

/** A configuration in progress that was never submitted. */
export interface SavedDraft {
  service: string;
  savedAt: number;
}

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

function readPending(): PendingOrder[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((o) => o && typeof o.orderId === "string") : [];
  } catch {
    // A corrupt or unreadable value must not take the header down with it.
    return [];
  }
}

function writePending(orders: PendingOrder[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(orders.slice(0, 20)));
  } catch {
    // Storage can be full or blocked in a locked-down private window. Losing the reminder is
    // acceptable; throwing in the middle of a successful checkout is not.
  }
}

/** Records an order the moment it is created, before the customer is sent to Stripe. */
export function rememberPendingOrder(order: Omit<PendingOrder, "savedAt">): void {
  const rest = readPending().filter((o) => o.orderId !== order.orderId);
  writePending([{ ...order, savedAt: Date.now() }, ...rest]);
  notify();
}

/** Drops an order once it is paid for, or once the server says it is no longer outstanding. */
export function forgetPendingOrder(orderId: string): void {
  writePending(readPending().filter((o) => o.orderId !== orderId));
  notify();
}

export function listPendingOrders(): PendingOrder[] {
  return readPending();
}

/** Every product with a configuration saved but not submitted. */
export function listSavedDrafts(): SavedDraft[] {
  if (!canUseStorage()) return [];
  const out: SavedDraft[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;
      const service = key.slice(DRAFT_PREFIX.length);
      // A draft is only worth offering if it has something in it beyond the defaults.
      const raw = window.localStorage.getItem(key);
      if (!raw || raw.length < 40) continue;
      out.push({ service, savedAt: 0 });
    }
  } catch {
    return [];
  }
  return out;
}

export function clearSavedDraft(service: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + service);
  } catch {
    /* nothing useful to do */
  }
  notify();
}

/**
 * Lets the header update the moment something changes in the same tab.
 *
 * The browser's own `storage` event only fires in *other* tabs, so without this the badge would
 * stay stale in the tab that did the work - which is the tab the customer is looking at.
 */
const EVENT = "kc-cart-changed";

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function onCartChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** "business-cards" -> "Business Cards". Products are the only thing stored, so this is enough. */
export function serviceLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
