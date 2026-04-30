import { Router } from "express";
const router = Router();

import { conversationController } from "../controllers/aiController";

router.post("/ask", conversationController);

export default router;