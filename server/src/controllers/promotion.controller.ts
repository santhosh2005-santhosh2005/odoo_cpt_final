import { Request, Response } from "express";
import { Promotion } from "../models/Promotion";
import { PromotionUsage } from "../models/PromotionUsage";

// Create Promotion
export const createPromotion = async (req: Request, res: Response) => {
  try {
    const {
      promotionName,
      description,
      promotionType,
      isActive,
      validFrom,
      validUntil,
      buyXGetY,
      bundlePrice,
      orderValueDiscount,
      categoryDiscount,
      productDiscount
    } = req.body;

    const promotionData: any = {
      promotionName,
      description,
      promotionType,
      isActive: isActive !== undefined ? isActive : true,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
    };

    // Only add the relevant type-specific field
    if (promotionType === "buyXGetY" && buyXGetY) promotionData.buyXGetY = buyXGetY;
    if (promotionType === "bundlePrice" && bundlePrice) promotionData.bundlePrice = bundlePrice;
    if (promotionType === "orderValueDiscount" && orderValueDiscount) promotionData.orderValueDiscount = orderValueDiscount;
    if (promotionType === "categoryDiscount" && categoryDiscount) promotionData.categoryDiscount = categoryDiscount;
    if (promotionType === "productDiscount" && productDiscount) promotionData.productDiscount = productDiscount;

    const promotion = await Promotion.create(promotionData);

    return res.status(201).json({ success: true, data: promotion });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Promotions
export const getPromotions = async (req: Request, res: Response) => {
  try {
    const promotions = await Promotion.find()
      .populate("buyXGetY.buyProduct")
      .populate("buyXGetY.freeProduct")
      .populate("bundlePrice.product")
      .populate("categoryDiscount.category")
      .populate("productDiscount.product")
      .sort({ createdAt: -1 });
    
    // Add usage count for each promotion
    const promotionsWithStats = await Promise.all(promotions.map(async (promotion) => {
      const usageCount = await PromotionUsage.countDocuments({ promotionId: promotion._id });
      return { ...promotion.toObject(), usageCount };
    }));

    return res.status(200).json({ success: true, data: promotionsWithStats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Promotion by ID
export const getPromotionById = async (req: Request, res: Response) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate("buyXGetY.buyProduct")
      .populate("buyXGetY.freeProduct")
      .populate("bundlePrice.product")
      .populate("categoryDiscount.category")
      .populate("productDiscount.product");
    if (!promotion) {
      return res.status(404).json({ success: false, message: "Promotion not found" });
    }
    
    const usageCount = await PromotionUsage.countDocuments({ promotionId: promotion._id });
    
    return res.status(200).json({ 
      success: true, 
      data: { ...promotion.toObject(), usageCount } 
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update Promotion
export const updatePromotion = async (req: Request, res: Response) => {
  try {
    const {
      promotionName,
      description,
      promotionType,
      isActive,
      validFrom,
      validUntil,
      buyXGetY,
      bundlePrice,
      orderValueDiscount,
      categoryDiscount,
      productDiscount
    } = req.body;

    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: "Promotion not found" });
    }

    if (promotionName !== undefined) promotion.promotionName = promotionName;
    if (description !== undefined) promotion.description = description;
    if (promotionType) promotion.promotionType = promotionType;
    if (isActive !== undefined) promotion.isActive = isActive;
    if (validFrom) promotion.validFrom = new Date(validFrom);
    if (validUntil) promotion.validUntil = new Date(validUntil);
    
    // Only update the relevant type-specific field based on promotion type
    if (promotionType === "buyXGetY" && buyXGetY !== undefined) {
      promotion.buyXGetY = buyXGetY;
      promotion.bundlePrice = undefined;
      promotion.orderValueDiscount = undefined;
      promotion.categoryDiscount = undefined;
      promotion.productDiscount = undefined;
    } else if (promotionType === "bundlePrice" && bundlePrice !== undefined) {
      promotion.bundlePrice = bundlePrice;
      promotion.buyXGetY = undefined;
      promotion.orderValueDiscount = undefined;
      promotion.categoryDiscount = undefined;
      promotion.productDiscount = undefined;
    } else if (promotionType === "orderValueDiscount" && orderValueDiscount !== undefined) {
      promotion.orderValueDiscount = orderValueDiscount;
      promotion.buyXGetY = undefined;
      promotion.bundlePrice = undefined;
      promotion.categoryDiscount = undefined;
      promotion.productDiscount = undefined;
    } else if (promotionType === "categoryDiscount" && categoryDiscount !== undefined) {
      promotion.categoryDiscount = categoryDiscount;
      promotion.buyXGetY = undefined;
      promotion.bundlePrice = undefined;
      promotion.orderValueDiscount = undefined;
      promotion.productDiscount = undefined;
    } else if (promotionType === "productDiscount" && productDiscount !== undefined) {
      promotion.productDiscount = productDiscount;
      promotion.buyXGetY = undefined;
      promotion.bundlePrice = undefined;
      promotion.orderValueDiscount = undefined;
      promotion.categoryDiscount = undefined;
    }

    await promotion.save();
    return res.status(200).json({ success: true, data: promotion });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Promotion
export const deletePromotion = async (req: Request, res: Response) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: "Promotion not found" });
    }
    return res.status(200).json({ success: true, message: "Promotion deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Promotion Analytics
export const getPromotionAnalytics = async (req: Request, res: Response) => {
  try {
    const activePromotions = await Promotion.countDocuments({ isActive: true });
    const totalUsage = await PromotionUsage.countDocuments();
    const discountGiven = await PromotionUsage.aggregate([
      { $group: { _id: null, total: { $sum: "$discountAmount" } } }
    ]);
    const revenueGenerated = discountGiven[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        activePromotions,
        promotionUsageCount: totalUsage,
        promotionDiscountGiven: revenueGenerated
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

