import { Schema, model, Document, Types } from "mongoose";

export interface IPayment extends Document {
  orderId: Types.ObjectId;
  amount: number;
  paymentMethod: "cash" | "card" | "upi";
  transactionRef?: string;
  paymentStatus: "pending" | "paid" | "failed";
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cash", "card", "upi"], required: true },
    transactionRef: { type: String },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Payment = model<IPayment>("Payment", paymentSchema);
