import { Request, Response } from "express";
import crypto from "crypto";
import { ApiKey } from "../models/ApiKey";
import { AuthRequest } from "../middleware/authMiddleware";

// ── Generate a new API Key ──────────────────────────────────────────────────
export const createApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const { name, scopes, expiresAt } = req.body;
    const adminId = req.user?.id;

    if (!name) {
      return res.status(400).json({ success: false, message: "Key name is required" });
    }

    // Generate cryptographically secure key
    const rawKey = "pk_live_" + crypto.randomBytes(24).toString("hex");
    const prefix = rawKey.substring(0, 15) + "..."; // Show only prefix in UI

    const apiKey = await ApiKey.create({
      name,
      key: rawKey,
      prefix,
      scopes: scopes || ["orders:read", "products:read", "analytics:read"],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: adminId,
    });

    // Return the full key ONCE — it will never be shown again
    return res.status(201).json({
      success: true,
      message: "API Key created. Copy it now — it won't be shown again.",
      data: {
        _id: apiKey._id,
        name: apiKey.name,
        key: rawKey, // ← Full key returned ONLY on creation
        prefix: apiKey.prefix,
        scopes: apiKey.scopes,
        isActive: apiKey.isActive,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── List all API Keys (prefix only, never full key) ─────────────────────────
export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const keys = await ApiKey.find().select("-key").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: keys });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Revoke (deactivate) an API Key ─────────────────────────────────────────
export const revokeApiKey = async (req: Request, res: Response) => {
  try {
    const key = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-key");

    if (!key) return res.status(404).json({ success: false, message: "Key not found" });

    return res.status(200).json({ success: true, message: "API Key revoked", data: key });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete an API Key permanently ──────────────────────────────────────────
export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const key = await ApiKey.findByIdAndDelete(req.params.id);
    if (!key) return res.status(404).json({ success: false, message: "Key not found" });
    return res.status(200).json({ success: true, message: "API Key deleted permanently" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Validate API Key (used by apiKeyMiddleware) ─────────────────────────────
export const validateApiKey = async (rawKey: string): Promise<IApiKeyResult | null> => {
  const apiKey = await ApiKey.findOne({ key: rawKey, isActive: true });
  if (!apiKey) return null;

  // Check expiry
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) return null;

  // Track usage
  apiKey.lastUsedAt = new Date();
  apiKey.usageCount += 1;
  await apiKey.save();

  return { id: String(apiKey._id), name: apiKey.name, scopes: apiKey.scopes };
};

interface IApiKeyResult {
  id: string;
  name: string;
  scopes: string[];
}
