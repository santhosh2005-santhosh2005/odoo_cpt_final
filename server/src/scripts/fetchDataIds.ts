
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product";
import Category from "../models/Category";
import { connectDB } from "../config/db";

dotenv.config();

const fetchIds = async () => {
  try {
    await connectDB();
    
    const categories = await Category.find({}).select("_id name");
    console.log("\n📂 Categories:");
    categories.forEach(cat => console.log(`  - ${cat.name}: ${cat._id}`));
    
    const products = await Product.find({}).select("_id name");
    console.log("\n📦 Products:");
    products.forEach(prod => console.log(`  - ${prod.name}: ${prod._id}`));
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fetching data:", error);
    process.exit(1);
  }
};

fetchIds();
