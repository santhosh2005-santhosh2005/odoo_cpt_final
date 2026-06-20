import { Schema, model, Document, Types } from "mongoose";

export interface ICoupon extends Document {
  couponName: string;
  couponCode: string;
  code: string; // Backward compatibility with user's schema
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  expiryDate: Date; // Backward compatibility with user's schema
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  isActive: boolean;
  active: boolean; // Backward compatibility with user's schema
  applicableCategories?: Types.ObjectId[];
  applicableProducts?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    couponName: { type: String, required: true },
    couponCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    code: { type: String }, // Will sync with couponCode
    description: { type: String },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    minimumOrderAmount: { type: Number, required: true, default: 0 },
    maxDiscountAmount: { type: Number },
    validFrom: { type: Date, required: true, default: Date.now },
    validUntil: { type: Date, required: true },
    expiryDate: { type: Date }, // Will sync with validUntil
    usageLimit: { type: Number },
    usageLimitPerCustomer: { type: Number },
    isActive: { type: Boolean, required: true, default: true },
    active: { type: Boolean, required: true, default: true }, // Will sync with isActive
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

// Pre-save middleware to sync fields
couponSchema.pre('save', function(next) {
  if (this.couponCode) {
    this.code = this.couponCode;
  }
  if (this.validUntil) {
    this.expiryDate = this.validUntil;
  }
  if (this.isActive !== undefined) {
    this.active = this.isActive;
  }
  next();
});

export const Coupon = model<ICoupon>("Coupon", couponSchema);
