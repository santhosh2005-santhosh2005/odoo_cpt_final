import { Schema, model, Document, Types } from "mongoose";

export interface ISession extends Document {
  cashier: Types.ObjectId;
  user?: Types.ObjectId; // Backward compatibility
  startTime: Date;
  endTime?: Date;
  startingBalance: number;
  endingBalance?: number;
  totalSales: number;
  status: "open" | "closed";
}

const sessionSchema = new Schema<ISession>(
  {
    cashier: { type: Schema.Types.ObjectId, ref: "User", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" }, // Backward compatibility
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    startingBalance: { type: Number, required: true, default: 0 },
    endingBalance: { type: Number },
    totalSales: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

export const Session = model<ISession>("Session", sessionSchema);
