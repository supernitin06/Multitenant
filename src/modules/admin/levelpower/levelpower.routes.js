import { Router } from "express";
import {
    createLevelPower,
    getLevelPowers,
    updateLevelPower,
    deleteLevelPower
} from "./levelpower.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { checkSuperAdmin } from "../../../core/middlewares/superadmin.middleware.js";

const router = Router();

router.use(authMiddleware, checkSuperAdmin);

router.post("/", createLevelPower);
router.get("/", getLevelPowers);
router.put("/:id", updateLevelPower);
router.delete("/:id", deleteLevelPower);

export default router;
