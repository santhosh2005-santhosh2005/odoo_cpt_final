import { Schema, model, Document, Types } from "mongoose";
import { IProduct } from "./Product";
import { ITable } from "./Table";
import { IUser } from "./User";

export interface IOrderItem {
  product: IProduct["_id"];
  variant?: string;
  quantity: number;
  size: string;
  price: number;
  discount?: number;
  taxRate?: number;
  itemStatus: "pending" | "preparing" | "unavailable" | "completed";
}

export interface IOrder extends Document {
  customOrderID: string;
  orderNumber: string;
  tableId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  products?: IOrderItem[];
  items: IOrderItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  totalAmount?: number;
  totalPrice: number;
  discountPercent?: number;
  taxRate?: number;
  status: "draft" | "pending" | "preparing" | "ready" | "served" | "cancelled" | "completed" | "paid";
  paymentMethod: "cash" | "card" | "online" | "upi" | "digital";
  isCustomerOrder?: boolean;
  waiterConfirmed?: boolean;
  table?: Types.ObjectId | ITable;
  sessionId?: Types.ObjectId;
  responsibleStaff?: Types.ObjectId;
  cashierId?: Types.ObjectId;
  couponId?: Types.ObjectId;
  promotionId?: Types.ObjectId;
  totalDiscount?: number;
  totalTax?: number;
  priorityScore: number;
  priorityLevel: "high" | "medium" | "low";
  isPriorityBoosted?: boolean;
  estimatedTime?: number;
  confirmedTime?: number;
  timeConfirmedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  discountAmount?: number;
  couponCode?: string;
  appliedPromotions?: string[];
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  variant: { type: String },
  quantity: { type: Number, required: true },
  size: { type: String, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  itemStatus: {
    type: String,
    enum: ["pending", "preparing", "unavailable", "completed"],
    default: "pending",
  },
});

const orderSchema = new Schema<IOrder>(
  {
    customOrderID: { type: String, unique: true },
    orderNumber: { type: String, unique: true, sparse: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    employeeId: { type: Schema.Types.ObjectId, ref: "User" },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    discountPercent: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, required: false },
    appliedPromotions: { type: [String], default: [] },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: false },
    promotionId: { type: Schema.Types.ObjectId, ref: "Promotion", required: false },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "pending", "preparing", "ready", "served", "cancelled", "completed", "paid"],
      default: "draft",
    },
    isCustomerOrder: { type: Boolean, default: false },
    waiterConfirmed: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "online", "upi", "digital"],
      default: "cash",
    },
    table: { type: Schema.Types.ObjectId, ref: "Table", required: false },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: false },
    responsibleStaff: { type: Schema.Types.ObjectId, ref: "User", required: false },
    cashierId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    // ── SMART PRIORITY FIELDS ────────────────────────────────────────────────
    priorityScore: { type: Number, default: 0 },
    priorityLevel: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "low",
    },
    isPriorityBoosted: { type: Boolean, default: false },
    // ── WAIT-TIME ESTIMATION FIELDS ──────────────────────────────────────────
    estimatedTime: { type: Number, default: 0 },
    confirmedTime: { type: Number, default: 0 },
    timeConfirmedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate customOrderID and orderNumber
orderSchema.pre("save", async function (next) {
  const doc = this as any;
  if (!doc.customOrderID) {
    const now = new Date();
    const year = now.getFullYear();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const datePrefix = `ORD-${year}-${day}-${month}`;

    // Find last order of the same day
    const lastOrder = await (this.constructor as any).findOne({
      customOrderID: { $regex: `^${datePrefix}` },
    }).sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastOrder && lastOrder.customOrderID) {
      const parts = lastOrder.customOrderID.split("-");
      const lastNumber = parseInt(parts[4]);
      nextNumber = lastNumber + 1;
    }
    doc.customOrderID = `${datePrefix}-${nextNumber}`;
  }
  
  // Generate simple orderNumber like ORD1001, ORD1002, etc.
  if (!doc.orderNumber) {
    const lastOrderByNumber = await (this.constructor as any).findOne().sort({ orderNumber: -1 });
    let nextOrderNum = 1001;
    if (lastOrderByNumber && lastOrderByNumber.orderNumber) {
      const numPart = parseInt(lastOrderByNumber.orderNumber.replace("ORD", ""));
      nextOrderNum = numPart + 1;
    }
    doc.orderNumber = `ORD${nextOrderNum}`;
  }

  // Map products from items for compatibility
  if (!doc.products && doc.items && doc.items.length > 0) {
    doc.products = doc.items.map((item: IOrderItem) => item.product);
  }

  // Map tax, discount from taxRate, discountAmount for compatibility
  if (typeof doc.tax === "undefined" && typeof doc.totalTax !== "undefined") {
    doc.tax = doc.totalTax;
  }
  if (typeof doc.discount === "undefined" && typeof doc.totalDiscount !== "undefined") {
    doc.discount = doc.totalDiscount;
  }
  if (typeof doc.totalAmount === "undefined" && typeof doc.totalPrice !== "undefined") {
    doc.totalAmount = doc.totalPrice;
  }

  next();
});

export const Order = model<IOrder>("Order", orderSchema);
