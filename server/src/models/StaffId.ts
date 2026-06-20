import { Schema, model, Document } from "mongoose";

export interface IStaffId extends Document {
  id: string; // The unique generated ID
  role: "cashier" | "waiter"; // The role this ID is for
  isUsed: boolean; // Whether the ID has been used for registration
  createdAt: Date;
}

const staffIdSchema = new Schema<IStaffId>(
  {
    id: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["cashier", "waiter"],
      required: true,
    },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const StaffId = model<IStaffId>("StaffId", staffIdSchema);
