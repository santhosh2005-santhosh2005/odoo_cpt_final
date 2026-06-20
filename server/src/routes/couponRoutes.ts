import { Router } from "express";
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponAnalytics,
} from "../controllers/coupon.controller";

const router = Router();

router.post("/", createCoupon);
router.get("/", getCoupons);
router.post("/validate", validateCoupon);
router.get("/analytics", getCouponAnalytics);
router.get("/:id", getCouponById);
router.put("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);

export default router;
