
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Coupon } from "../models/Coupon";
import { Promotion } from "../models/Promotion";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { connectDB } from "../config/db";

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data (optional, uncomment if needed)
    // await Coupon.deleteMany({});
    // await Promotion.deleteMany({});
    // await Category.deleteMany({});
    // await Product.deleteMany({});

    // --- Sample Categories ---
    const categories = [
      { name: "Beverages" },
      { name: "Desserts" },
      { name: "Main Course" },
    ];
    const createdCategories = await Category.insertMany(categories);
    console.log("✅ Categories created:", createdCategories.length);

    // --- Sample Products ---
    const products = [
      {
        name: "Espresso",
        description: "Rich and bold espresso",
        basePrice: 50,
        category: createdCategories[0]._id,
        imageUrl: "/placeholder.png",
        available: true,
        variants: [],
        taxRate: 0,
        unit: "pcs",
      },
      {
        name: "Cappuccino",
        description: "Creamy cappuccino",
        basePrice: 80,
        category: createdCategories[0]._id,
        imageUrl: "/placeholder.png",
        available: true,
        variants: [],
        taxRate: 0,
        unit: "pcs",
      },
      {
        name: "Chocolate Cake",
        description: "Decadent chocolate cake",
        basePrice: 120,
        category: createdCategories[1]._id,
        imageUrl: "/placeholder.png",
        available: true,
        variants: [],
        taxRate: 0,
        unit: "pcs",
      },
      {
        name: "Burger",
        description: "Juicy beef burger",
        basePrice: 150,
        category: createdCategories[2]._id,
        imageUrl: "/placeholder.png",
        available: true,
        variants: [],
        taxRate: 0,
        unit: "pcs",
      },
    ];
    const createdProducts = await Product.insertMany(products);
    console.log("✅ Products created:", createdProducts.length);

    // --- Sample Coupons ---
    const coupons = [
      {
        couponName: "Welcome Discount",
        couponCode: "WELCOME10",
        description: "Get 10% off on your first order!",
        discountType: "percentage",
        discountValue: 10,
        minimumOrderAmount: 100,
        maxDiscountAmount: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        usageLimit: 100,
        usageLimitPerCustomer: 1,
        isActive: true,
        active: true,
      },
      {
        couponName: "Fixed Savings",
        couponCode: "SAVE20",
        description: "Save ₹20 on orders above ₹150",
        discountType: "fixed",
        discountValue: 20,
        minimumOrderAmount: 150,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        usageLimit: 200,
        isActive: true,
        active: true,
      },
      {
        couponName: "Special Offer",
        couponCode: "SPECIAL50",
        description: "Flat ₹50 off on orders over ₹300",
        discountType: "fixed",
        discountValue: 50,
        minimumOrderAmount: 300,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        usageLimit: 50,
        isActive: true,
        active: true,
      },
    ];

    const createdCoupons = await Coupon.insertMany(coupons);
    console.log("✅ Coupons created:", createdCoupons.length);

    // --- Sample Promotions ---
    const promotions = [
      {
        promotionName: "Buy 2 Get 1 Free Coffee",
        name: "Buy 2 Get 1 Free Coffee",
        description: "Buy any 2 coffees, get 1 free!",
        promotionType: "buyXGetY",
        buyXGetY: {
          buyProduct: createdProducts[0]._id,
          buyQuantity: 2,
          freeProduct: createdProducts[0]._id,
          freeQuantity: 1,
        },
        isActive: true,
        active: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        promotionName: "20% Off Desserts",
        name: "20% Off Desserts",
        description: "20% discount on all dessert items",
        promotionType: "categoryDiscount",
        categoryDiscount: {
          category: createdCategories[1]._id,
          discountType: "percentage",
          discountValue: 20,
        },
        isActive: true,
        active: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      },
      {
        promotionName: "Bundle Deal: 3 for ₹100",
        name: "Bundle Deal: 3 for ₹100",
        description: "Get 3 selected items for just ₹100",
        promotionType: "bundlePrice",
        bundlePrice: {
          product: createdProducts[0]._id,
          requiredQuantity: 3,
          bundlePrice: 100,
        },
        isActive: true,
        active: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        promotionName: "Spend ₹500, Save 15%",
        name: "Spend ₹500, Save 15%",
        description: "Get 15% off when you spend ₹500 or more",
        promotionType: "orderValueDiscount",
        orderValueDiscount: {
          minimumOrderAmount: 500,
          discountType: "percentage",
          discountValue: 15,
        },
        isActive: true,
        active: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
      {
        promotionName: "Espresso Special: 10% Off",
        name: "Espresso Special: 10% Off",
        description: "10% discount on all Espresso orders",
        promotionType: "productDiscount",
        productDiscount: {
          product: createdProducts[0]._id,
          discountType: "percentage",
          discountValue: 10,
        },
        isActive: true,
        active: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdPromotions = await Promotion.insertMany(promotions);
    console.log("✅ Promotions created:", createdPromotions.length);

    console.log("\n🎉 Seed data added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
