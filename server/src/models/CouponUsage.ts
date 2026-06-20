import { Schema, model, Document, Types } from "mongoose";

export interface ICouponUsage extends Document {
  couponId: Types.ObjectId;
  orderId: Types.ObjectId;
  userId?: Types.ObjectId;
  discountAmount: number;
  createdAt: Date;
}

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    discountAmount: { type: Number, required: true }
  },
  { timestamps: true }
);

export const CouponUsage = model<ICouponUsage>("CouponUsage", couponUsageSchema);
