import type { OrderStatus } from "@prisma/client";

/**
 * Order status vocabulary, with no database import.
 *
 * Kept apart from `events.ts` deliberately: that module imports the Prisma client, and client
 * components need these labels. Importing them from there pulled `pg` into the browser bundle and
 * failed the build on `Can't resolve 'dns'`.
 */

/** Plain-English label for a status, used in timeline messages and the admin UI. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Awaiting payment",
  PAID: "Paid",
  IN_PROGRESS: "In production",
  REVIEW: "Awaiting customer review",
  REVISION: "In revision",
  COMPLETE: "Complete",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/**
 * What each status means for the shop, shown next to the picker.
 *
 * Written for whoever is running the shop rather than for a developer: the point of the status is
 * to tell them what they should be doing next, not to describe a database value.
 */
export const STATUS_HELP: Record<OrderStatus, string> = {
  DRAFT: "Started but never paid for. Nothing to do.",
  PENDING: "Checkout was opened but payment has not landed. No work should start.",
  PAID: "Money received. This is your queue - move it to In production when you start.",
  IN_PROGRESS: "Being designed or printed right now.",
  REVIEW: "Sent to the customer, waiting on their approval.",
  REVISION: "Customer asked for changes.",
  COMPLETE: "Delivered and finished.",
  CANCELLED: "Called off. Refund separately in Stripe if money was taken.",
  REFUNDED: "Money returned to the customer.",
};

/** Statuses in the order work actually moves through, for pickers and filters. */
export const STATUS_FLOW: OrderStatus[] = [
  "DRAFT", "PENDING", "PAID", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETE", "CANCELLED", "REFUNDED",
];

/** Statuses that represent money the shop has actually taken. */
export const PAID_STATUSES: OrderStatus[] = ["PAID", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETE"];

/** Statuses that still need someone to do something. */
export const OPEN_STATUSES: OrderStatus[] = ["PAID", "IN_PROGRESS", "REVIEW", "REVISION"];
