import { Schema, model, Document, Types } from "mongoose";

export interface IGuestCustomer extends Document {
  phone: string;
  email: string;
  name?: string;
  visitCount: number;
  firstVisit: Date;
  lastVisit: Date;
  ordersPlaced: number;
  promotionsSent: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const guestCustomerSchema = new Schema<IGuestCustomer>(
  {
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, trim: true },
    visitCount: { type: Number, default: 1 },
    firstVisit: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
    ordersPlaced: { type: Number, default: 0 },
    promotionsSent: [{ type: Schema.Types.ObjectId, ref: "Promotion" }],
  },
  { timestamps: true }
);

// Compound index on phone + email for fast upsert lookups
guestCustomerSchema.index({ phone: 1, email: 1 }, { unique: true });
guestCustomerSchema.index({ email: 1 });

export const GuestCustomer = model<IGuestCustomer>("GuestCustomer", guestCustomerSchema);
