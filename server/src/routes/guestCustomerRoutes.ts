import express from "express";
import {
  identifyGuestCustomer,
  getGuestCustomers,
  getGuestCustomerStats,
} from "../controllers/guestCustomer.controller";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// ── Public route — self-order kiosk calls this (no auth needed) ──
router.post("/identify", identifyGuestCustomer);

// ── Admin-protected routes ──
router.use(authMiddleware);
router.use(adminMiddleware);
router.get("/", getGuestCustomers);
router.get("/stats", getGuestCustomerStats);

export default router;
