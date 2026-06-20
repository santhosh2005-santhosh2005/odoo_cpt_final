import { Router } from "express";
import { createApiKey, getApiKeys, revokeApiKey, deleteApiKey } from "../controllers/apiKey.controller";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";

const router = Router();

// All API key management routes require admin JWT auth
router.get("/", authMiddleware, adminMiddleware, getApiKeys);
router.post("/", authMiddleware, adminMiddleware, createApiKey);
router.patch("/:id/revoke", authMiddleware, adminMiddleware, revokeApiKey);
router.delete("/:id", authMiddleware, adminMiddleware, deleteApiKey);

export default router;
