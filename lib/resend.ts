interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  serviceName: string;
  packageName: string;
  total: number;
}

interface ProjectUpdateData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  newStatus: string;
  message?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return;
  const from = process.env.RESEND_FROM_EMAIL ?? "hello@kcprinting.com";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

export async function sendOrderConfirmation(data: OrderEmailData) {
  await sendEmail(
    data.customerEmail,
    `Order Confirmed: ${data.serviceName} - KC Printing`,
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#097C87;padding:24px;border-radius:8px 8px 0 0">
        <span style="color:#FCA47C;font-weight:900;font-size:24px">KC PRINTING</span>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #D1EAE8;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="color:#0A1628">Order Confirmed</h2>
        <p style="color:#4A7A80">Hi ${data.customerName}, your order has been received and payment was successful.</p>
        <div style="background:#F4FAFA;border-radius:6px;padding:16px;margin:16px 0">
          <div><strong>Service:</strong> ${data.serviceName}</div>
          <div><strong>Package:</strong> ${data.packageName}</div>
          <div><strong>Total:</strong> $${data.total.toFixed(2)}</div>
          <div><strong>Order ID:</strong> #${data.orderId.slice(-8)}</div>
        </div>
        <p style="color:#4A7A80">Our design team will begin work on your project shortly. You can track progress in your <a href="https://kcprinting.com/account" style="color:#097C87">account dashboard</a>.</p>
        <p style="color:#4A7A80">Questions? Call us at (816) 521-0462 or reply to this email.</p>
      </div>
    </div>`
  );
}

export async function sendProjectUpdate(data: ProjectUpdateData) {
  await sendEmail(
    data.customerEmail,
    `Project Update: ${data.newStatus.replace("_", " ")} - KC Printing`,
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#097C87;padding:24px;border-radius:8px 8px 0 0">
        <span style="color:#FCA47C;font-weight:900;font-size:24px">KC PRINTING</span>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #D1EAE8;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="color:#0A1628">Project Update</h2>
        <p style="color:#4A7A80">Hi ${data.customerName}, your project status has been updated to <strong>${data.newStatus.replace("_", " ")}</strong>.</p>
        ${data.message ? `<p style="color:#4A7A80">${data.message}</p>` : ""}
        <a href="https://kcprinting.com/account/projects" style="display:inline-block;background:#097C87;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:16px">View Project</a>
      </div>
    </div>`
  );
}

export async function sendAdminNewOrder(data: OrderEmailData) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "kansasdesigners@gmail.com";
  await sendEmail(
    adminEmail,
    `New Order: ${data.serviceName} from ${data.customerName}`,
    `<div style="font-family:sans-serif">
      <h2>New Order Received</h2>
      <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
      <p><strong>Service:</strong> ${data.serviceName}</p>
      <p><strong>Package:</strong> ${data.packageName}</p>
      <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>
      <p><a href="https://kcprinting.com/admin/orders/${data.orderId}">View Order in Admin</a></p>
    </div>`
  );
}
