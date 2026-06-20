import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let MONGO_URI = process.env.MONGO_URI;

// Clean up MONGO_URI to remove empty query params
if (MONGO_URI) {
  MONGO_URI = MONGO_URI.replace(/[\?&]([^=]+)(?=&|$)/g, "").replace(/\?$/, "");
}

if (!MONGO_URI) {
  throw new Error("❌ MONGO_URI is not defined in .env file");
}

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected successfully");
  } catch (error) {
    console.error("❌ Error disconnecting MongoDB:", error);
  }
};
