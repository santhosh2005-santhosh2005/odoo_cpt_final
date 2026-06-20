import { Schema, model, Document } from "mongoose";
import crypto from "crypto";

export interface IApiKey extends Document {
  name: string;           // Label e.g. "Odoo Integration Key"
  key: string;            // The actual secret key e.g. "pk_live_abc123..."
  prefix: string;         // First 8 chars shown in UI
  isActive: boolean;
  scopes: string[];       // e.g. ["orders:read", "products:read"]
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdBy: string;      // Admin user ID
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    scopes: {
      type: [String],
      default: ["orders:read", "products:read", "analytics:read"],
      enum: [
        "orders:read", "orders:write",
        "products:read", "products:write",
        "analytics:read",
        "coupons:read", "coupons:write",
        "customers:read",
      ],
    },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    createdBy: { type: String, required: true },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Static helper to generate a new API key
apiKeySchema.statics.generateKey = (): string => {
  return "pk_live_" + crypto.randomBytes(24).toString("hex");
};

export const ApiKey = model<IApiKey>("ApiKey", apiKeySchema);
