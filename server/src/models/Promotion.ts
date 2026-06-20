import { Schema, model, Document, Types } from "mongoose";

export interface IPromotion extends Document {
  promotionName: string;
  name: string; // Backward compatibility with user's schema
  description?: string;
  promotionType: "buyXGetY" | "bundlePrice" | "orderValueDiscount" | "categoryDiscount" | "productDiscount" | "product" | "order";
  isActive: boolean;
  active: boolean; // Backward compatibility with user's schema
  validFrom: Date;
  validUntil: Date;
  minimumQuantity?: number;
  minimumAmount?: number;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  buyXGetY?: {
    buyProduct?: Types.ObjectId;
    buyQuantity: number;
    freeProduct?: Types.ObjectId;
    freeQuantity: number;
  };
  bundlePrice?: {
    product: Types.ObjectId;
    requiredQuantity: number;
    bundlePrice: number;
  };
  orderValueDiscount?: {
    minimumOrderAmount: number;
    discountType: "percentage" | "fixed";
    discountValue: number;
  };
  categoryDiscount?: {
    category: Types.ObjectId;
    discountType: "percentage" | "fixed";
    discountValue: number;
  };
  productDiscount?: {
    product: Types.ObjectId;
    discountType: "percentage" | "fixed";
    discountValue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const promotionSchema = new Schema<IPromotion>(
  {
    promotionName: { type: String, required: true },
    name: { type: String }, // Will sync with promotionName
    description: { type: String },
    promotionType: { 
      type: String, 
      enum: ["buyXGetY", "bundlePrice", "orderValueDiscount", "categoryDiscount", "productDiscount", "product", "order"], 
      required: true 
    },
    isActive: { type: Boolean, required: true, default: true },
    active: { type: Boolean, required: true, default: true }, // Will sync with isActive
    validFrom: { type: Date, required: true, default: Date.now },
    validUntil: { type: Date, required: true },
    minimumQuantity: { type: Number },
    minimumAmount: { type: Number },
    discountType: { type: String, enum: ["percentage", "fixed"] },
    discountValue: { type: Number },
    buyXGetY: {
      type: {
        buyProduct: { type: Schema.Types.ObjectId, ref: "Product" },
        buyQuantity: { type: Number, default: 1 },
        freeProduct: { type: Schema.Types.ObjectId, ref: "Product" },
        freeQuantity: { type: Number, default: 1 }
      },
      default: undefined
    },
    bundlePrice: {
      type: {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        requiredQuantity: { type: Number, default: 1 },
        bundlePrice: { type: Number }
      },
      default: undefined
    },
    orderValueDiscount: {
      type: {
        minimumOrderAmount: { type: Number, default: 0 },
        discountType: { type: String, enum: ["percentage", "fixed"] },
        discountValue: { type: Number }
      },
      default: undefined
    },
    categoryDiscount: {
      type: {
        category: { type: Schema.Types.ObjectId, ref: "Category" },
        discountType: { type: String, enum: ["percentage", "fixed"] },
        discountValue: { type: Number }
      },
      default: undefined
    },
    productDiscount: {
      type: {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        discountType: { type: String, enum: ["percentage", "fixed"] },
        discountValue: { type: Number }
      },
      default: undefined
    }
  },
  { timestamps: true }
);

// Pre-save middleware to sync fields
promotionSchema.pre('save', function(next) {
  if (this.promotionName) {
    this.name = this.promotionName;
  }
  if (this.isActive !== undefined) {
    this.active = this.isActive;
  }
  next();
});

export const Promotion = model<IPromotion>("Promotion", promotionSchema);
