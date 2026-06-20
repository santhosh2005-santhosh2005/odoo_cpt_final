import { Router } from "express";
import { 
  getItemAnalytics, 
  getWaiterAnalytics, 
  getDashboardAnalytics, 
  getCashierAnalytics,
  getPeakHoursAnalytics,
  getBestItemsAnalytics,
  getSalesTrendsAnalytics,
  getOrderTimeAnalytics,
  getOverviewAnalytics,
  getTimeBasedItemAnalytics,
  getTopCategoriesAnalytics,
  getTopOrdersAnalytics,
  getTopProductsAnalytics,
  getEmployeesList,
  getSessionsList,
  getProductsList
} from "../controllers/analytics.controller";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";

const router = Router();

// 🎯 Insight Generator Endpoints
// Authenticated routes to ensure only authorized users access analytics

router.get("/overview", authMiddleware, adminMiddleware, getOverviewAnalytics);
router.get("/sales-trends", authMiddleware, adminMiddleware, getSalesTrendsAnalytics);
router.get("/staff", authMiddleware, adminMiddleware, getWaiterAnalytics);
router.get("/items", authMiddleware, adminMiddleware, getItemAnalytics);
router.get("/time", authMiddleware, adminMiddleware, getPeakHoursAnalytics);
router.get("/time-based-items", authMiddleware, adminMiddleware, getTimeBasedItemAnalytics);

router.get("/dashboard", authMiddleware, adminMiddleware, getDashboardAnalytics);
router.get("/cashiers", authMiddleware, adminMiddleware, getCashierAnalytics);
router.get("/peak-hours", authMiddleware, adminMiddleware, getPeakHoursAnalytics);
router.get("/best-items", authMiddleware, adminMiddleware, getBestItemsAnalytics);
router.get("/waiter-performance", authMiddleware, adminMiddleware, getWaiterAnalytics); 
router.get("/order-time", authMiddleware, adminMiddleware, getOrderTimeAnalytics);

// New endpoints for reports
router.get("/top-categories", authMiddleware, adminMiddleware, getTopCategoriesAnalytics);
router.get("/top-orders", authMiddleware, adminMiddleware, getTopOrdersAnalytics);
router.get("/top-products", authMiddleware, adminMiddleware, getTopProductsAnalytics);
router.get("/employees", authMiddleware, adminMiddleware, getEmployeesList);
router.get("/sessions", authMiddleware, adminMiddleware, getSessionsList);
router.get("/products-list", authMiddleware, adminMiddleware, getProductsList);

export default router;
