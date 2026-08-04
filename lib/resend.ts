import { APP_URL } from "@/lib/app-url";

/**
 * Transactional email.
 *
 * Four things were wrong with the previous version and are fixed here:
 *
 * 1. Customer-supplied values were interpolated straight into the HTML body. A name containing
 *    markup rendered as markup in the recipient's inbox - both an injection vector and a way to
 *    forge convincing content inside an email carrying our branding. Everything dynamic now goes
 *    through `esc()`.
 * 2. Links pointed at https://kcprinting.com, a domain the site is not served from, so every
 *    "view your order" button in every email led nowhere.
 * 3. Failures were silent. A wrong key, an unverified sender or a quota trip produced no log line,
 *    so nobody found out until a customer said they never got a receipt.
 * 4. ADMIN_EMAIL now holds a comma-separated list (see lib/auth/ensure-user.ts), which was being
 *    passed whole as a single `to` address.
 */

const BRAND = {
  ink: "#121110",
  teal: "#097C87",
  coral: "#FCA47C",
  paper: "#F4FAFA",
  line: "#D1EAE8",
  muted: "#4A7A80",
};

/** Escapes text for safe interpolation into an HTML email body. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * Shared shell so every email looks like it came from the same company.
 *
 * Inline styles and a 560px cap because that is what survives Outlook and the Gmail mobile app; a
 * stylesheet would be stripped by both.
 */
function layout(heading: string, bodyHtml: string, footerNote?: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:16px">
  <div style="background:${BRAND.teal};padding:24px;border-radius:8px 8px 0 0">
    <span style="color:${BRAND.coral};font-weight:900;font-size:22px;letter-spacing:0.5px">KC PRINTING</span>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid ${BRAND.line};border-top:none;border-radius:0 0 8px 8px">
    <h2 style="color:${BRAND.ink};margin:0 0 12px;font-size:20px">${esc(heading)}</h2>
    ${bodyHtml}
    <p style="color:${BRAND.muted};font-size:13px;line-height:1.6;margin-top:28px;border-top:1px solid ${BRAND.line};padding-top:16px">
      Questions? Reply to this email, call <a href="tel:+18165210462" style="color:${BRAND.teal}">(816) 521-0462</a>,
      or <a href="${APP_URL}/contact" style="color:${BRAND.teal}">get in touch</a>.${footerNote ? `<br>${esc(footerNote)}` : ""}
    </p>
  </div>
</div>`;
}

function detailRow(label: string, value: string): string {
  return `<div style="padding:4px 0"><strong style="color:${BRAND.ink}">${esc(label)}:</strong> <span style="color:${BRAND.muted}">${esc(value)}</span></div>`;
}

function panel(rows: string): string {
  return `<div style="background:${BRAND.paper};border-radius:6px;padding:16px;margin:16px 0">${rows}</div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.teal};color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:15px;margin-top:8px">${esc(label)}</a>`;
}

/**
 * Sends one email. Never throws: a failed receipt must not roll back a payment webhook already
 * acknowledged to Stripe, nor abort a status change an admin has already made.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set - skipped "${subject}" to ${to}`);
    return false;
  }
  const from = process.env.RESEND_FROM_EMAIL ?? "hello@kcprinting.com";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`Resend rejected "${subject}" to ${to}:`, res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Could not send "${subject}" to ${to}:`, err);
    return false;
  }
}

export interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  serviceName: string;
  packageName: string;
  total: number;
}

export async function sendOrderConfirmation(data: OrderEmailData): Promise<boolean> {
  return sendEmail(
    data.customerEmail,
    `Order confirmed: ${data.serviceName} - KC Printing`,
    layout(
      "Order confirmed",
      `<p style="color:${BRAND.muted};line-height:1.6">Hi ${esc(data.customerName)}, we have your order and your payment went through. Here is what we are making.</p>
       ${panel(
         detailRow("Product", data.serviceName) +
         detailRow("Package", data.packageName) +
         detailRow("Total paid", money(data.total)) +
         detailRow("Order number", `#${data.orderId.slice(-8)}`)
       )}
       <p style="color:${BRAND.muted};line-height:1.6">We will email you again the moment it ships, with a tracking number.</p>
       ${button(`${APP_URL}/account/orders`, "View your order")}`,
      "Keep this email - the order number is the fastest way for us to find your job."
    )
  );
}

export async function sendAdminNewOrder(data: OrderEmailData): Promise<boolean> {
  // ADMIN_EMAIL is a comma-separated list; the first entry is the shop's working inbox.
  const to = process.env.ADMIN_EMAIL?.split(",")[0]?.trim();
  if (!to) {
    console.warn("ADMIN_EMAIL not set - no new-order alert sent");
    return false;
  }
  return sendEmail(
    to,
    `New order: ${data.serviceName} - ${money(data.total)}`,
    layout(
      "New order came in",
      `${panel(
        detailRow("Product", data.serviceName) +
        detailRow("Package", data.packageName) +
        detailRow("Total", money(data.total)) +
        detailRow("Customer", `${data.customerName} <${data.customerEmail}>`) +
        detailRow("Order number", `#${data.orderId.slice(-8)}`)
      )}
      ${button(`${APP_URL}/admin/orders/${data.orderId}`, "Open in admin")}`
    )
  );
}

export interface ShippingEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  serviceName: string;
  carrier: string | null;
  trackingNumber: string;
}

/**
 * Sent the first time a tracking number is saved against an order.
 *
 * This was the biggest hole in the previous set: a customer paid and then heard nothing until a
 * parcel arrived. "Where is my order" is the most common message a print shop gets, and this is the
 * email that prevents it.
 */
export async function sendShippingConfirmation(data: ShippingEmailData): Promise<boolean> {
  const tracking = data.carrier ? `${data.carrier} - ${data.trackingNumber}` : data.trackingNumber;
  return sendEmail(
    data.customerEmail,
    `Your ${data.serviceName} order has shipped - KC Printing`,
    layout(
      "It's on its way",
      `<p style="color:${BRAND.muted};line-height:1.6">Hi ${esc(data.customerName)}, your ${esc(data.serviceName)} order left us today.</p>
       ${panel(detailRow("Tracking", tracking) + detailRow("Order number", `#${data.orderId.slice(-8)}`))}
       <p style="color:${BRAND.muted};line-height:1.6">Tracking can take a few hours to show its first scan with the carrier.</p>
       ${button(`${APP_URL}/account/orders`, "View your order")}`,
      "Transit times are the carrier's estimate and exclude the day of despatch."
    )
  );
}

export interface RefundEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  amount: number;
  full: boolean;
}

export async function sendRefundConfirmation(data: RefundEmailData): Promise<boolean> {
  return sendEmail(
    data.customerEmail,
    `Refund issued: ${money(data.amount)} - KC Printing`,
    layout(
      data.full ? "Your refund is on its way" : "A partial refund is on its way",
      `<p style="color:${BRAND.muted};line-height:1.6">Hi ${esc(data.customerName)}, we have refunded ${esc(money(data.amount))} to the card you paid with.</p>
       ${panel(detailRow("Refunded", money(data.amount)) + detailRow("Order number", `#${data.orderId.slice(-8)}`))}
       <p style="color:${BRAND.muted};line-height:1.6">Banks usually take 5 to 10 business days to show a refund on a statement. If it has not appeared after that, tell us and we will chase it with our payment provider.</p>`
    )
  );
}

export interface StatusEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  heading: string;
  message: string;
}

/**
 * Progress update for the stages a customer actually cares about.
 *
 * Deliberately not sent on every status change - an email for each internal step trains people to
 * ignore the ones that matter. Callers decide; see app/api/admin/orders/[id]/route.ts.
 */
export async function sendStatusUpdate(data: StatusEmailData): Promise<boolean> {
  return sendEmail(
    data.customerEmail,
    `${data.heading} - order #${data.orderId.slice(-8)}`,
    layout(
      data.heading,
      `<p style="color:${BRAND.muted};line-height:1.6">Hi ${esc(data.customerName)}, ${esc(data.message)}</p>
       ${button(`${APP_URL}/account/orders`, "View your order")}`
    )
  );
}
