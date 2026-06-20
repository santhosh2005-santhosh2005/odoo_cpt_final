import { Request, Response } from "express";
import { StaffId } from "../models/StaffId";
import { AuthRequest } from "../middleware/authMiddleware";

// Generate a random 8-character alphanumeric ID
const generateRandomId = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing characters
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// Generate a new staff ID
export const generateStaffId = async (req: AuthRequest, res: Response) => {
  try {
    // Only admin can generate IDs
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { role } = req.body;
    if (!["cashier", "waiter"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    // Generate unique ID
    let id: string;
    let existing: any;
    do {
      id = generateRandomId();
      existing = await StaffId.findOne({ id });
    } while (existing);

    const newStaffId = new StaffId({
      id,
      role,
      isUsed: false,
    });

    await newStaffId.save();

    res.status(201).json({ success: true, staffId: newStaffId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error generating staff ID", error });
  }
};

// Get all staff IDs (admin only)
export const getAllStaffIds = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const staffIds = await StaffId.find().sort({ createdAt: -1 });
    res.json({ success: true, staffIds });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching staff IDs", error });
  }
};

// Delete a staff ID (admin only)
export const deleteStaffId = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const deletedId = await StaffId.findByIdAndDelete(id);

    if (!deletedId) {
      return res.status(404).json({ success: false, message: "Staff ID not found" });
    }

    res.json({ success: true, message: "Staff ID deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting staff ID", error });
  }
};
