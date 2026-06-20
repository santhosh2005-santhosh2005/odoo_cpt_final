import { Schema, model, Document, Types } from "mongoose";
import crypto from "crypto";

export interface ITable extends Document {
  number: string;
  seats: number;
  status: "free" | "occupied";
  active: boolean;
  floor: Types.ObjectId;
  assignedStaff?: Types.ObjectId;
  assignedWaiter?: Types.ObjectId; // Backward compatibility
  appointmentResourceId?: string;
  lastBookedAt?: Date;
  selfOrderToken: string;
}

const tableSchema = new Schema<ITable>(
  {
    number: { type: String, required: true },
    seats: { type: Number, required: true, default: 2 },
    status: { type: String, enum: ["free", "occupied"], default: "free" },
    active: { type: Boolean, default: true },
    floor: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
    assignedStaff: { type: Schema.Types.ObjectId, ref: "User", required: false },
    assignedWaiter: { type: Schema.Types.ObjectId, ref: "User", required: false },
    appointmentResourceId: { type: String },
    lastBookedAt: { type: Date },
    selfOrderToken: { type: String, unique: true },
  },
  { timestamps: true }
);

// Generate unique self-order token before saving
tableSchema.pre("save", function (next) {
  if (!this.selfOrderToken) {
    this.selfOrderToken = crypto.randomBytes(16).toString("hex");
  }
  next();
});

// Also generate token when using findOneAndUpdate
tableSchema.pre("findOneAndUpdate", async function (next) {
  const update: any = this.getUpdate();
  if (!update.selfOrderToken) {
    // Try to get current token from the document
    const docToUpdate = await this.model.findOne(this.getQuery());
    if (docToUpdate && !docToUpdate.selfOrderToken) {
      this.setUpdate({ ...update, selfOrderToken: crypto.randomBytes(16).toString("hex") });
    }
  }
  next();
});

export const Table = model<ITable>("Table", tableSchema);
