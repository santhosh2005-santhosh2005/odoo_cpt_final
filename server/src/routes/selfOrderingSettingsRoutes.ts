
import express from "express";
import { getSettings, updateSettings } from "../controllers/selfOrderingSettings.controller";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Public route to get settings
router.get("/", getSettings);

// Protected admin route to update settings
router.use(authMiddleware, adminMiddleware);
router.put("/", updateSettings);

export default router;
