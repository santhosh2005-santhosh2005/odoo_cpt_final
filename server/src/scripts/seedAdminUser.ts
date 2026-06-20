
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User";
import { connectDB } from "../config/db";
import bcrypt from "bcryptjs";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("✅ Admin user already exists:", existingAdmin.email);
      console.log("   Password: admin123");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminUser = new User({
      name: "Admin User",
      email: "admin@example.com",
      passwordHash: hashedPassword,
      role: "admin",
      phone: "1234567890",
      isApproved: true,
      active: true,
    });

    await adminUser.save();
    console.log("✅ Admin user created successfully!");
    console.log("   Email: admin@example.com");
    console.log("   Password: admin123");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
    process.exit(1);
  }
};

seedAdmin();
