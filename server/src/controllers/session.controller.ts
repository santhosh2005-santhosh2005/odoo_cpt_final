import { Request, Response } from "express";
import { Session } from "../models/Session";
import { Order } from "../models/Order";
import mongoose from "mongoose";

export const getSessions = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user.id;
    const userRole = (req as any).user.role;
    let query = {};
    if (userRole !== "admin") {
      query = { $or: [{ cashier: user }, { user }] };
    }
    const sessions = await Session.find(query)
      .populate("cashier", "name")
      .populate("user", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const openSession = async (req: Request, res: Response) => {
  try {
    const { startingBalance } = req.body;
    const userId = (req as any).user.id;

    // 1. Check if there is ANY active session in the system (Session locking)
    const activeSession = await Session.findOne({ status: "open" }).populate("cashier", "name");
    if (activeSession) {
      const cashierName = (activeSession.cashier as any)?.name || "another cashier";
      return res.status(400).json({ 
        success: false, 
        message: `Session lock active: POS session is already open by Cashier ${cashierName}. Please close it before starting a new one.` 
      });
    }

    // 2. Create new session
    const session = new Session({
      cashier: userId,
      user: userId, // Backward compatibility
      startingBalance: startingBalance || 0,
      status: "open",
      startTime: new Date(),
      totalSales: 0
    });

    await session.save();
    return res.status(201).json({ success: true, session });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Close an active POS session
 */
export const closeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { endingBalance } = req.body;

    const session = await Session.findById(id);
    if (!session || session.status === "closed") {
      return res.status(400).json({ success: false, message: "Invalid or already closed session" });
    }

    // 1. Calculate summary metrics for the session
    const orders = await Order.find({ sessionId: session._id });
    
    const totalSales = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const orderCount = orders.length;

    // 2. Payment Method Breakdown
    const paymentBreakdown = orders.reduce((acc: any, order) => {
      const method = order.paymentMethod || "other";
      acc[method] = (acc[method] || 0) + (order.totalPrice || 0);
      return acc;
    }, {});

    // 3. Calculate total discounts given
    const totalDiscounts = orders.reduce((sum, order) => {
      const disc = order.discount || order.discountAmount || order.totalDiscount || 0;
      return sum + disc;
    }, 0);

    // 4. Update session
    session.status = "closed";
    session.endTime = new Date();
    session.endingBalance = endingBalance;
    session.totalSales = totalSales;
    session.orderCount = orderCount;
    session.totalDiscounts = totalDiscounts;
    session.paymentBreakdown = paymentBreakdown;

    await session.save();

    return res.status(200).json({ 
      success: true, 
      session,
      summary: {
        totalSales,
        orderCount,
        paymentBreakdown,
        totalDiscounts
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get the currently active session for the user
 */
export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user.id;
    // Check both cashier and user for backward compatibility
    const session = await Session.findOne({
      $or: [{ cashier: user, status: "open" }, { user, status: "open" }]
    });
    return res.status(200).json({ success: true, session });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get session summary without closing it
 */
export const getSessionSummary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orders = await Order.find({ sessionId: id });
    
    const totalSales = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const orderCount = orders.length;
    const paymentBreakdown = orders.reduce((acc: any, order) => {
      const method = order.paymentMethod || "other";
      acc[method] = (acc[method] || 0) + (order.totalPrice || 0);
      return acc;
    }, {});
    const totalDiscounts = orders.reduce((sum, order) => {
      const disc = order.discount || order.discountAmount || order.totalDiscount || 0;
      return sum + disc;
    }, 0);

    res.json({
      success: true,
      summary: {
        totalSales,
        orderCount,
        paymentBreakdown,
        totalDiscounts
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a POS session (Admin only)
 */
export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cashier, startTime, endTime, startingBalance, endingBalance, totalSales, status } = req.body;
    
    const userRole = (req as any).user.role;
    if (userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized. Admin privileges required." });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (cashier) session.cashier = cashier;
    if (startTime) session.startTime = new Date(startTime);
    if (endTime) session.endTime = new Date(endTime);
    if (typeof startingBalance === "number") session.startingBalance = startingBalance;
    if (typeof endingBalance === "number") session.endingBalance = endingBalance;
    if (typeof totalSales === "number") session.totalSales = totalSales;
    if (status) session.status = status;

    await session.save();
    return res.status(200).json({ success: true, session });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a POS session (Admin only)
 */
export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userRole = (req as any).user.role;
    if (userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized. Admin privileges required." });
    }

    const session = await Session.findByIdAndDelete(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({ success: true, message: "Session deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
