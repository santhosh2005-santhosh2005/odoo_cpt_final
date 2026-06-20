import { Request, Response } from "express";
import { GuestCustomer } from "../models/GuestCustomer";
import { Promotion } from "../models/Promotion";
import { sendWelcomeEmail, sendWelcomeBackEmail } from "../utils/mailer";

// ─── POST /api/guest-customers/identify ──────────────────────────────────────
// Public endpoint — no auth needed. Upserts a guest customer by phone+email.
// Returns immediately; Brevo email fires asynchronously in the background.
export const identifyGuestCustomer = async (req: Request, res: Response) => {
  try {
    const { phone, email, name } = req.body;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: "Phone number and email are required.",
      });
    }

    // Normalize
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10); // last 10 digits
    const normalizedEmail = email.trim().toLowerCase();

    // Fetch active promotions to include in email
    const activePromotions = await Promotion.find({ isActive: true })
      .select("promotionName description promotionType validUntil isActive")
      .limit(5)
      .sort({ createdAt: -1 });

    // Check if customer exists (both phone and email must match for repeated customer)
    const existingCustomer = await GuestCustomer.findOne({
      phone: normalizedPhone,
      email: normalizedEmail,
    });

    if (existingCustomer) {
      // Returning customer — update visit info
      existingCustomer.visitCount += 1;
      existingCustomer.lastVisit = new Date();
      if (name && !existingCustomer.name) existingCustomer.name = name;
      // Keep normalized fields
      existingCustomer.email = normalizedEmail;
      existingCustomer.phone = normalizedPhone;

      await existingCustomer.save();

      // Fire welcome-back email asynchronously (don't block response)
      sendWelcomeBackEmail(
        normalizedEmail,
        normalizedPhone,
        existingCustomer.visitCount,
        activePromotions
      ).catch((err) =>
        console.error("[GuestCustomer] Welcome-back email failed:", err)
      );

      return res.status(200).json({
        success: true,
        isNewCustomer: false,
        data: {
          _id: existingCustomer._id,
          phone: existingCustomer.phone,
          email: existingCustomer.email,
          visitCount: existingCustomer.visitCount,
          name: existingCustomer.name,
        },
        message: `Welcome back! This is visit #${existingCustomer.visitCount}.`,
      });
    } else {
      // New customer — create record
      const newCustomer = await GuestCustomer.create({
        phone: normalizedPhone,
        email: normalizedEmail,
        name: name || undefined,
        visitCount: 1,
        firstVisit: new Date(),
        lastVisit: new Date(),
        ordersPlaced: 0,
        promotionsSent: activePromotions.map((p: any) => p._id),
      });

      // Fire welcome email asynchronously (don't block response)
      sendWelcomeEmail(normalizedEmail, normalizedPhone, activePromotions).catch(
        (err) => console.error("[GuestCustomer] Welcome email failed:", err)
      );

      return res.status(201).json({
        success: true,
        isNewCustomer: true,
        data: {
          _id: newCustomer._id,
          phone: newCustomer.phone,
          email: newCustomer.email,
          visitCount: 1,
          name: newCustomer.name,
        },
        message: "Welcome! Your guest profile has been created.",
      });
    }
  } catch (err: any) {
    // Handle duplicate key edge case (race condition)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A profile with this phone and email already exists.",
      });
    }
    console.error("[GuestCustomer] identify error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/guest-customers ─────────────────────────────────────────────────
// Admin-only: list all guest customers with pagination
export const getGuestCustomers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      GuestCustomer.find()
        .sort({ lastVisit: -1 })
        .skip(skip)
        .limit(limit)
        .select("-promotionsSent"),
      GuestCustomer.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      data: customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/guest-customers/stats ──────────────────────────────────────────
// Admin-only: aggregate stats
export const getGuestCustomerStats = async (req: Request, res: Response) => {
  try {
    const [total, returning, newThisWeek] = await Promise.all([
      GuestCustomer.countDocuments(),
      GuestCustomer.countDocuments({ visitCount: { $gt: 1 } }),
      GuestCustomer.countDocuments({
        firstVisit: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { total, returning, newThisWeek, newCustomers: total - returning },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
