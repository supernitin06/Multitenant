
import { Router } from "express";
import {
  getTenantSettings,
  upsertTenantSetting,
} from "./settings.controller.js";
import { authMiddleware } from "../../../../core/middlewares/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, getTenantSettings);
router.put("/", authMiddleware, upsertTenantSetting);

export default router;
