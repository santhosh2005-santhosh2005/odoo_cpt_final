import express from "express";
import { downloadReceipt, emailReceipt } from "../controllers/receipt.controller";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/download/:id", authMiddleware, downloadReceipt);
router.post("/email", authMiddleware, emailReceipt);

export default router;
