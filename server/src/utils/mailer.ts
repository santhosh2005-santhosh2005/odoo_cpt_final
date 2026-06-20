import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER = { name: 'Odoo POS Cafe', email: 'testodoo843@gmail.com' };

const getBrevoHeaders = () => ({
  'api-key': process.env.BREVO_API_KEY || '',
  'Content-Type': 'application/json',
});

// ─── Existing OTP Email (unchanged) ──────────────────────────────────────────
export const sendOtpEmail = async (to: string, otp: string): Promise<boolean> => {
  try {
    await axios.post(
      BREVO_API_URL,
      {
        sender: SENDER,
        to: [{ email: to }],
        subject: 'Your Password Reset OTP — Odoo POS Cafe',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #0A0A0A; border-radius: 8px; overflow: hidden;">
            <div style="padding: 32px 40px; border-bottom: 6px solid #F5B400;">
              <h1 style="margin: 0; font-size: 26px; font-style: italic; font-weight: 900; color: #ffffff; text-transform: uppercase;">
                ODOO POS <span style="color: #F5B400;">CAFE</span>
              </h1>
              <p style="font-family: monospace; font-size: 10px; color: #888; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 3px;">Password Recovery Protocol</p>
            </div>
            <div style="padding: 40px; background: #ffffff; color: #0A0A0A;">
              <h2 style="font-size: 28px; font-weight: 900; font-style: italic; margin: 0 0 20px; text-transform: uppercase;">Your OTP is Ready</h2>
              <div style="background: #0A0A0A; padding: 24px; text-align: center; margin: 24px 0; border: 4px solid #F5B400;">
                <p style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin: 0 0 10px;">One-Time Password</p>
                <span style="font-size: 44px; font-weight: 900; color: #F5B400; letter-spacing: 10px; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #555;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
              <p style="font-size: 12px; color: #999; margin-top: 16px;">If you did not request this, you can safely ignore this email.</p>
            </div>
            <div style="background: #0A0A0A; padding: 18px 40px;">
              <p style="font-family: monospace; font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 2px; margin: 0;">© Odoo POS Cafe — Automated Security Notification</p>
            </div>
          </div>
        `,
      },
      { headers: getBrevoHeaders() }
    );

    console.log(`[Mailer] OTP email sent to ${to} via Brevo ✅`);
    return true;
  } catch (err: any) {
    console.error('[Mailer] Brevo error:', err?.response?.data || err?.message);
    return false;
  }
};

// ─── Promotion HTML Block Builder ─────────────────────────────────────────────
const buildPromotionBlock = (promotions: any[]): string => {
  if (!promotions || promotions.length === 0) {
    return `<p style="font-size: 13px; color: #777; font-style: italic;">Stay tuned — exciting offers are coming your way soon!</p>`;
  }

  const items = promotions
    .filter((p: any) => p.isActive)
    .slice(0, 3) // max 3 in email
    .map((p: any) => {
      const typeLabel = (() => {
        switch (p.promotionType) {
          case 'buyXGetY': return '🎁 Buy X Get Y Free';
          case 'bundlePrice': return '📦 Bundle Deal';
          case 'orderValueDiscount': return '💰 Order Discount';
          case 'categoryDiscount': return '🏷️ Category Offer';
          case 'productDiscount': return '⚡ Product Offer';
          default: return '🎉 Special Offer';
        }
      })();

      return `
        <div style="border-left: 4px solid #F5B400; padding: 12px 16px; margin-bottom: 12px; background: #fffbea;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #888; font-family: monospace; letter-spacing: 2px;">${typeLabel}</p>
          <p style="margin: 0 0 4px; font-size: 16px; font-weight: 900; color: #0A0A0A;">${p.promotionName}</p>
          ${p.description ? `<p style="margin: 0; font-size: 12px; color: #555;">${p.description}</p>` : ''}
          ${p.validUntil ? `<p style="margin: 6px 0 0; font-size: 10px; color: #999; font-family: monospace;">Valid until: ${new Date(p.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>` : ''}
        </div>
      `;
    })
    .join('');

  return items || `<p style="font-size: 13px; color: #777; font-style: italic;">Check back soon for exciting offers!</p>`;
};

// ─── Welcome Email (New Customer) ─────────────────────────────────────────────
export const sendWelcomeEmail = async (
  to: string,
  phone: string,
  promotions: any[]
): Promise<boolean> => {
  try {
    await axios.post(
      BREVO_API_URL,
      {
        sender: SENDER,
        to: [{ email: to }],
        subject: '☕ Welcome to Odoo POS Cafe — Your Table is Ready!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 620px; margin: auto; background: #0A0A0A; overflow: hidden;">
            <!-- Header -->
            <div style="padding: 36px 44px 28px; border-bottom: 6px solid #F5B400;">
              <h1 style="margin: 0; font-size: 30px; font-style: italic; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: -1px;">
                ODOO POS <span style="color: #F5B400;">CAFE</span>
              </h1>
              <p style="font-family: monospace; font-size: 9px; color: #555; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 4px;">Self-Order System</p>
            </div>

            <!-- Welcome Banner -->
            <div style="background: #F5B400; padding: 32px 44px;">
              <p style="font-family: monospace; font-size: 10px; color: #0A0A0A; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px;">New_Customer_Protocol: Activated</p>
              <h2 style="margin: 0; font-size: 36px; font-weight: 900; font-style: italic; color: #0A0A0A; text-transform: uppercase; line-height: 1;">
                Welcome to<br/>the Cafe!
              </h2>
              <p style="margin: 16px 0 0; font-size: 14px; color: #0A0A0A; font-weight: 600;">
                We're thrilled to have you here. Your self-order session is now active.
              </p>
            </div>

            <!-- Body -->
            <div style="padding: 40px 44px; background: #ffffff;">
              <p style="font-size: 14px; color: #333; margin: 0 0 8px;">Hi there 👋,</p>
              <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 28px;">
                You've been registered as a new guest at <strong>Odoo POS Cafe</strong>. 
                Your phone <strong>${phone}</strong> and this email are now linked to your guest profile. 
                Every visit earns you exclusive deals — so keep coming back! ☕
              </p>

              <!-- Divider -->
              <div style="border-top: 3px solid #0A0A0A; margin: 28px 0;"></div>

              <!-- Promotions -->
              <p style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin: 0 0 16px;">Active_Promotions_For_You</p>
              <h3 style="font-size: 20px; font-weight: 900; font-style: italic; text-transform: uppercase; margin: 0 0 16px; color: #0A0A0A;">Today's Special Offers</h3>
              ${buildPromotionBlock(promotions)}

              <!-- Divider -->
              <div style="border-top: 2px solid #eee; margin: 28px 0;"></div>

              <div style="background: #0A0A0A; padding: 20px; text-align: center;">
                <p style="font-family: monospace; font-size: 10px; color: #F5B400; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px;">Quick_Tip</p>
                <p style="font-size: 13px; color: #ccc; margin: 0;">Use your mobile number <strong style="color: #F5B400;">${phone}</strong> to get recognized instantly on your next visit.</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #0A0A0A; padding: 20px 44px; border-top: 2px solid #222;">
              <p style="font-family: monospace; font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 2px; margin: 0;">© Odoo POS Cafe — Automated Guest Welcome Notification</p>
            </div>
          </div>
        `,
      },
      { headers: getBrevoHeaders() }
    );

    console.log(`[Mailer] Welcome email sent to ${to} via Brevo ✅`);
    return true;
  } catch (err: any) {
    console.error('[Mailer] Welcome email error:', err?.response?.data || err?.message);
    return false;
  }
};

// ─── Welcome Back Email (Returning Customer) ──────────────────────────────────
export const sendWelcomeBackEmail = async (
  to: string,
  phone: string,
  visitCount: number,
  promotions: any[]
): Promise<boolean> => {
  try {
    const visitLabel = visitCount === 2 ? '2nd' : visitCount === 3 ? '3rd' : `${visitCount}th`;

    await axios.post(
      BREVO_API_URL,
      {
        sender: SENDER,
        to: [{ email: to }],
        subject: `☕ Welcome Back! Your ${visitLabel} Visit at Odoo POS Cafe`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 620px; margin: auto; background: #0A0A0A; overflow: hidden;">
            <!-- Header -->
            <div style="padding: 36px 44px 28px; border-bottom: 6px solid #F5B400;">
              <h1 style="margin: 0; font-size: 30px; font-style: italic; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: -1px;">
                ODOO POS <span style="color: #F5B400;">CAFE</span>
              </h1>
              <p style="font-family: monospace; font-size: 9px; color: #555; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 4px;">Self-Order System</p>
            </div>

            <!-- Welcome Back Banner -->
            <div style="background: #0A0A0A; padding: 36px 44px; border-bottom: 4px solid #F5B400;">
              <p style="font-family: monospace; font-size: 10px; color: #F5B400; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px;">Returning_Customer_Detected ✓</p>
              <h2 style="margin: 0; font-size: 38px; font-weight: 900; font-style: italic; color: #ffffff; text-transform: uppercase; line-height: 1;">
                Welcome<br/><span style="color: #F5B400;">Back!</span>
              </h2>
              <div style="margin-top: 20px; display: inline-block; background: #F5B400; padding: 8px 20px;">
                <p style="margin: 0; font-family: monospace; font-size: 11px; color: #0A0A0A; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">Visit #${visitCount} 🏆</p>
              </div>
            </div>

            <!-- Body -->
            <div style="padding: 40px 44px; background: #ffffff;">
              <p style="font-size: 14px; color: #333; margin: 0 0 8px;">Great to see you again! 👋</p>
              <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 28px;">
                This is your <strong>${visitLabel} visit</strong> — and we love your loyalty! 
                As a returning guest, you're automatically eligible for our best active promotions.
                Enjoy your session and don't forget to try something new today. ☕
              </p>

              <!-- Visit Stats -->
              <div style="background: #f9f9f9; border: 3px solid #0A0A0A; padding: 20px; margin-bottom: 28px; display: flex; gap: 20px;">
                <div style="text-align: center; flex: 1; border-right: 2px solid #eee; padding-right: 20px;">
                  <p style="font-family: monospace; font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Total_Visits</p>
                  <p style="font-size: 32px; font-weight: 900; font-style: italic; color: #0A0A0A; margin: 0;">${visitCount}</p>
                </div>
                <div style="text-align: center; flex: 1; padding-left: 20px;">
                  <p style="font-family: monospace; font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Status</p>
                  <p style="font-size: 14px; font-weight: 900; color: #F5B400; margin: 0; padding-top: 8px;">${visitCount >= 5 ? '🥇 VIP GUEST' : visitCount >= 3 ? '⭐ LOYAL GUEST' : '✅ REGULAR GUEST'}</p>
                </div>
              </div>

              <!-- Divider -->
              <div style="border-top: 3px solid #0A0A0A; margin: 28px 0;"></div>

              <!-- Promotions -->
              <p style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin: 0 0 16px;">Active_Promotions_Just_For_You</p>
              <h3 style="font-size: 20px; font-weight: 900; font-style: italic; text-transform: uppercase; margin: 0 0 16px; color: #0A0A0A;">Today's Special Offers</h3>
              ${buildPromotionBlock(promotions)}
            </div>

            <!-- Footer -->
            <div style="background: #0A0A0A; padding: 20px 44px; border-top: 2px solid #222;">
              <p style="font-family: monospace; font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 2px; margin: 0;">© Odoo POS Cafe — Automated Loyalty Notification • Phone: ${phone}</p>
            </div>
          </div>
        `,
      },
      { headers: getBrevoHeaders() }
    );

    console.log(`[Mailer] Welcome-back email sent to ${to} (visit #${visitCount}) via Brevo ✅`);
    return true;
  } catch (err: any) {
    console.error('[Mailer] Welcome-back email error:', err?.response?.data || err?.message);
    return false;
  }
};
