import { Schema, model, Document, Types } from "mongoose";

export interface IPromotionUsage extends Document {
  promotionId: Types.ObjectId;
  orderId: Types.ObjectId;
  userId?: Types.ObjectId;
  discountAmount: number;
  createdAt: Date;
}

const promotionUsageSchema = new Schema<IPromotionUsage>(
  {
    promotionId: { type: Schema.Types.ObjectId, ref: "Promotion", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    discountAmount: { type: Number, required: true }
  },
  { timestamps: true }
);

export const PromotionUsage = model<IPromotionUsage>("PromotionUsage", promotionUsageSchema);
