import { Request, Response, NextFunction } from "express";
import { validateApiKey } from "../controllers/apiKey.controller";

export interface ApiKeyRequest extends Request {
  apiKey?: { id: string; name: string; scopes: string[] };
}

// Middleware: validates X-API-Key header
export const apiKeyMiddleware = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) => {
  const rawKey = req.headers["x-api-key"] as string;

  if (!rawKey) {
    return res.status(401).json({
      success: false,
      message: "API key required. Pass it as X-API-Key header.",
    });
  }

  const result = await validateApiKey(rawKey);

  if (!result) {
    return res.status(401).json({
      success: false,
      message: "Invalid, revoked, or expired API key.",
    });
  }

  req.apiKey = result; // Attach key metadata to request
  next();
};
