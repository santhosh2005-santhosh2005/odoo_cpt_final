import { Router } from "express";
import { openSession, closeSession, getActiveSession, getSessions, getSessionSummary, updateSession, deleteSession } from "../controllers/session.controller";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authMiddleware, getSessions);
router.post("/open", authMiddleware, openSession);
router.post("/close/:id", authMiddleware, closeSession);
router.get("/active", authMiddleware, getActiveSession);
router.get("/summary/:id", authMiddleware, getSessionSummary);
router.patch("/:id", authMiddleware, updateSession);
router.delete("/:id", authMiddleware, deleteSession);

export default router;
