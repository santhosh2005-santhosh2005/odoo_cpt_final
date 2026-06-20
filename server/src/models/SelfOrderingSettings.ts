
import { Schema, model, Document } from "mongoose";

export interface ISelfOrderingSettings extends Document {
  enabled: boolean;
  orderingMode: "online" | "qr-menu";
  backgroundColor: string;
  backgroundImage: string;
}

const selfOrderingSettingsSchema = new Schema<ISelfOrderingSettings>(
  {
    enabled: { type: Boolean, default: true },
    orderingMode: { type: String, enum: ["online", "qr-menu"], default: "online" },
    backgroundColor: { type: String, default: "#1a1a1a" },
    backgroundImage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const SelfOrderingSettings = model<ISelfOrderingSettings>("SelfOrderingSettings", selfOrderingSettingsSchema);
