import { Request, Response } from "express";
import { Coupon } from "../models/Coupon";
import { CouponUsage } from "../models/CouponUsage";

// Create Coupon
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const {
      couponName,
      couponCode,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      usageLimitPerCustomer,
      isActive,
      applicableCategories,
      applicableProducts
    } = req.body;
    
    // Check if code already exists
    const existing = await Coupon.findOne({ couponCode: couponCode.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Coupon code must be unique." });
    }

    const coupon = await Coupon.create({
      couponName,
      couponCode: couponCode.toUpperCase().trim(),
      description,
      discountType,
      discountValue,
      minimumOrderAmount: minimumOrderAmount || 0,
      maxDiscountAmount,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      usageLimit,
      usageLimitPerCustomer,
      isActive: isActive !== undefined ? isActive : true,
      applicableCategories,
      applicableProducts
    });

    return res.status(201).json({ success: true, data: coupon });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Coupons
export const getCoupons = async (req: Request, res: Response) => {
  try {
    const coupons = await Coupon.find()
      .populate("applicableCategories")
      .populate("applicableProducts")
      .sort({ createdAt: -1 });
    
    // Add usage count for each coupon
    const couponsWithStats = await Promise.all(coupons.map(async (coupon) => {
      const usageCount = await CouponUsage.countDocuments({ couponId: coupon._id });
      return { ...coupon.toObject(), usageCount };
    }));

    return res.status(200).json({ success: true, data: couponsWithStats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Coupon by ID
export const getCouponById = async (req: Request, res: Response) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate("applicableCategories")
      .populate("applicableProducts");
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    
    const usageCount = await CouponUsage.countDocuments({ couponId: coupon._id });
    
    return res.status(200).json({ 
      success: true, 
      data: { ...coupon.toObject(), usageCount } 
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update Coupon
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const {
      couponName,
      couponCode,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      usageLimitPerCustomer,
      isActive,
      applicableCategories,
      applicableProducts
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    if (couponCode) {
      const normalizedCode = couponCode.toUpperCase().trim();
      if (normalizedCode !== coupon.couponCode) {
        const existing = await Coupon.findOne({ couponCode: normalizedCode });
        if (existing) {
          return res.status(400).json({ success: false, message: "Coupon code must be unique." });
        }
        coupon.couponCode = normalizedCode;
      }
    }

    if (couponName !== undefined) coupon.couponName = couponName;
    if (description !== undefined) coupon.description = description;
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (minimumOrderAmount !== undefined) coupon.minimumOrderAmount = minimumOrderAmount;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
    if (validFrom) coupon.validFrom = new Date(validFrom);
    if (validUntil) coupon.validUntil = new Date(validUntil);
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (usageLimitPerCustomer !== undefined) coupon.usageLimitPerCustomer = usageLimitPerCustomer;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (applicableCategories !== undefined) coupon.applicableCategories = applicableCategories;
    if (applicableProducts !== undefined) coupon.applicableProducts = applicableProducts;

    await coupon.save();
    return res.status(200).json({ success: true, data: coupon });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Coupon
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    return res.status(200).json({ success: true, message: "Coupon deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Validate Coupon
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { couponCode, orderAmount, userId, productIds, categoryIds } = req.body;
    if (!couponCode) {
      return res.status(400).json({ success: false, status: "invalid", message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase().trim() });
    if (!coupon) {
      return res.status(200).json({ success: false, status: "invalid", message: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return res.status(200).json({ success: false, status: "inactive", message: "Coupon is inactive" });
    }

    const now = new Date();
    if (now < new Date(coupon.validFrom)) {
      return res.status(200).json({ success: false, status: "not_started", message: "Coupon is not yet valid" });
    }
    if (now > new Date(coupon.validUntil)) {
      return res.status(200).json({ success: false, status: "expired", message: "Coupon has expired" });
    }

    if (orderAmount < coupon.minimumOrderAmount) {
      return res.status(200).json({
        success: false,
        status: "minimum amount not reached",
        message: `Minimum order amount of ₹${coupon.minimumOrderAmount} not met.`,
        minimumOrderAmount: coupon.minimumOrderAmount,
      });
    }

    // Check usage limit
    if (coupon.usageLimit) {
      const usageCount = await CouponUsage.countDocuments({ couponId: coupon._id });
      if (usageCount >= coupon.usageLimit) {
        return res.status(200).json({ success: false, status: "limit_reached", message: "Coupon usage limit reached" });
      }
    }

    // Check per customer limit
    if (coupon.usageLimitPerCustomer && userId) {
      const customerUsageCount = await CouponUsage.countDocuments({ couponId: coupon._id, userId });
      if (customerUsageCount >= coupon.usageLimitPerCustomer) {
        return res.status(200).json({ success: false, status: "customer_limit_reached", message: "You've reached the maximum usage limit for this coupon" });
      }
    }

    // Check product/category restrictions
    if (coupon.applicableProducts && coupon.applicableProducts.length > 0 && productIds) {
      const hasApplicableProduct = productIds.some((pid: string) => 
        coupon.applicableProducts?.some((cid) => cid.toString() === pid)
      );
      if (!hasApplicableProduct) {
        return res.status(200).json({ success: false, status: "product_not_eligible", message: "Coupon not applicable to any product in cart" });
      }
    }
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0 && categoryIds) {
      const hasApplicableCategory = categoryIds.some((cid: string) => 
        coupon.applicableCategories?.some((ccid) => ccid.toString() === cid)
      );
      if (!hasApplicableCategory) {
        return res.status(200).json({ success: false, status: "category_not_eligible", message: "Coupon not applicable to any category in cart" });
      }
    }

    return res.status(200).json({
      success: true,
      status: "valid",
      message: "Coupon validated successfully",
      data: coupon,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Coupon Analytics
export const getCouponAnalytics = async (req: Request, res: Response) => {
  try {
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({ isActive: true });
    const totalUsage = await CouponUsage.countDocuments();
    const discountGiven = await CouponUsage.aggregate([
      { $group: { _id: null, total: { $sum: "$discountAmount" } } }
    ]);
    const revenueImpact = discountGiven[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        couponUsageCount: totalUsage,
        couponRevenueImpact: revenueImpact
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

