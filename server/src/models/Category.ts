import { Schema, model, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  active: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

export const Category = model<ICategory>("Category", categorySchema);
