import { Router } from "express";
import {
  createPromotion,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
  getPromotionAnalytics,
} from "../controllers/promotion.controller";

const router = Router();

router.post("/", createPromotion);
router.get("/", getPromotions);
router.get("/analytics", getPromotionAnalytics);
router.get("/:id", getPromotionById);
router.put("/:id", updatePromotion);
router.delete("/:id", deletePromotion);

export default router;
