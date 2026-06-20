import { Resend } from "resend";
import Mailjet from "node-mailjet";

// ─── Resend (Primary) ──────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Mailjet (Fallback) ────────────────────────────────────────
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY || "",
  process.env.MAILJET_SECRET_KEY || ""
);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

/**
 * Send an email using Resend (primary) with Mailjet as fallback.
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const from = options.from || process.env.MAILJET_SENDER_EMAIL || "noreply@odoopos.com";

  // 1. Try Resend first
  try {
    const { error } = await resend.emails.send({
      from: `Odoo POS Cafe <${from}>`,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (!error) {
      console.log(`[Email] Sent via Resend to ${options.to}`);
      return true;
    }
    console.warn("[Email] Resend failed:", error.message, "— trying Mailjet fallback");
  } catch (err: any) {
    console.warn("[Email] Resend error:", err.message, "— trying Mailjet fallback");
  }

  // 2. Fallback: Mailjet
  try {
    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: from, Name: "Odoo POS Cafe" },
          To: [{ Email: options.to }],
          Subject: options.subject,
          HTMLPart: options.html,
          TextPart: options.text || "",
        },
      ],
    });
    console.log(`[Email] Sent via Mailjet to ${options.to}`);
    return true;
  } catch (err: any) {
    console.error("[Email] Mailjet fallback also failed:", err.message);
    return false;
  }
};

// ─── Email Templates ───────────────────────────────────────────

export const orderConfirmationEmail = (order: any) => ({
  subject: `Order Confirmed — #${order.customOrderID || order._id}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 32px;">
      <div style="background: #1a1a1a; color: #F5B400; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-style: italic; text-transform: uppercase; letter-spacing: -1px;">
          ORDER CONFIRMED
        </h1>
        <p style="margin: 8px 0 0; font-size: 12px; font-family: monospace; color: #aaa; text-transform: uppercase; letter-spacing: 2px;">
          Odoo POS Cafe
        </p>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #eee;">
        <p style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #999; margin: 0 0 8px;">
          Order ID
        </p>
        <h2 style="margin: 0 0 24px; font-size: 32px; font-style: italic; color: #1a1a1a;">
          #${order.customOrderID || order._id}
        </h2>
        <hr style="border: none; border-top: 2px solid #f0f0f0; margin: 24px 0;" />
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #999; padding: 8px 0; border-bottom: 2px solid #1a1a1a;">Item</th>
              <th style="text-align: center; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #999; padding: 8px 0; border-bottom: 2px solid #1a1a1a;">Qty</th>
              <th style="text-align: right; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #999; padding: 8px 0; border-bottom: 2px solid #1a1a1a;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((item: any) => `
              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: #1a1a1a;">${item.product?.name || item.name || "Item"}</td>
                <td style="padding: 12px 0; text-align: center; font-family: monospace; color: #555;">x${item.quantity}</td>
                <td style="padding: 12px 0; text-align: right; font-family: monospace; color: #1a1a1a;">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <hr style="border: none; border-top: 2px solid #f0f0f0; margin: 16px 0;" />
        ${order.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-family: monospace; font-size: 12px; text-transform: uppercase; color: #4CAF50;">Discount</span>
            <span style="font-family: monospace; font-size: 12px; color: #4CAF50;">-₹${(order.discount || order.discountAmount || 0).toFixed(2)}</span>
          </div>
        ` : ""}
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Total Due</span>
          <span style="font-size: 28px; font-weight: 900; font-style: italic; color: #F5B400;">₹${(order.totalPrice || 0).toFixed(2)}</span>
        </div>
      </div>
      <p style="text-align: center; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #ccc; margin-top: 24px;">
        Thank you for ordering from Odoo POS Cafe
      </p>
    </div>
  `,
});

export const sessionClosingEmail = (session: any, cashierName: string, recipientEmail: string) => ({
  to: recipientEmail,
  subject: `Shift Closed — Session Summary`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 32px;">
      <div style="background: #1a1a1a; color: #F5B400; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-style: italic; text-transform: uppercase;">SHIFT SUMMARY</h1>
        <p style="margin: 8px 0 0; font-size: 12px; font-family: monospace; color: #aaa; text-transform: uppercase;">Odoo POS Cafe</p>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #eee;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #999;">Cashier</td>
            <td style="padding: 12px 0; font-weight: bold; text-align: right;">${cashierName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #999;">Start Time</td>
            <td style="padding: 12px 0; font-family: monospace; text-align: right;">${new Date(session.startTime).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #999;">End Time</td>
            <td style="padding: 12px 0; font-family: monospace; text-align: right;">${new Date(session.endTime).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #999;">Total Orders</td>
            <td style="padding: 12px 0; font-weight: bold; text-align: right;">${session.orderCount || 0}</td>
          </tr>
          <tr style="background: #fff9e6;">
            <td style="padding: 16px; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #999;">Total Revenue</td>
            <td style="padding: 16px; font-size: 24px; font-weight: 900; font-style: italic; color: #F5B400; text-align: right;">₹${(session.totalSales || 0).toFixed(2)}</td>
          </tr>
          ${session.totalDiscounts > 0 ? `
          <tr>
            <td style="padding: 12px 0; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #4CAF50;">Discounts Given</td>
            <td style="padding: 12px 0; color: #4CAF50; font-family: monospace; text-align: right;">-₹${(session.totalDiscounts || 0).toFixed(2)}</td>
          </tr>
          ` : ""}
        </table>
      </div>
      <p style="text-align: center; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #ccc; margin-top: 24px;">
        Odoo POS Cafe — Automated Shift Report
      </p>
    </div>
  `,
});
