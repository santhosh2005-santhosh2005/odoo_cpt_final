import { Schema, model, Document, Types } from "mongoose";

export interface IKitchenTracking extends Document {
  orderId: Types.ObjectId;
  receivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  currentStage: "to-cook" | "preparing" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const kitchenTrackingSchema = new Schema<IKitchenTracking>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    receivedAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    currentStage: { type: String, enum: ["to-cook", "preparing", "completed"], default: "to-cook" },
  },
  { timestamps: true }
);

export const KitchenTracking = model<IKitchenTracking>("KitchenTracking", kitchenTrackingSchema);
