import { Router } from "express";
import {
    createExamination,
    listExaminations,
    createExamSchedule,
    getDatesheet,
    updateExamination,
    deleteExamination,
    updateExamSchedule,
} from "./examination.controller.js";
import { requirePermission } from "../../../../../core/middlewares/permission.middleware.js";
import { checkDomainInPlan } from "../../../../../core/middlewares/fetures.middleware.js";

const router = Router();

// 💡 Routes are already protected by tenantRouter middleware (authMiddleware and checkSubscription)
router.use(checkDomainInPlan("ACADEMIC"));

// Examination CRUD
router.post("/", requirePermission("CREATE_EXAM"), createExamination);
router.get("/", requirePermission("READ_EXAM"), listExaminations);
router.put("/:id", requirePermission("UPDATE_EXAM"), updateExamination);
router.delete("/:id", requirePermission("DELETE_EXAM"), deleteExamination);

// Datesheet / Schedule
router.post("/schedule", requirePermission("CREATE_EXAM_SCHEDULE"), createExamSchedule);
router.get("/:examinationId/datesheet", requirePermission("READ_EXAM_SCHEDULE"), getDatesheet);
router.put("/schedule/:id", requirePermission("UPDATE_EXAM_SCHEDULE"), updateExamSchedule);

export default router;
