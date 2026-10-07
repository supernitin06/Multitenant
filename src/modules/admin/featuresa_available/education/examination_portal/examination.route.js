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
import { requireTenantPermission } from "../../../../../core/middlewares/permission.middleware.js";
import { checkDomainInPlan } from "../../../../../core/middlewares/fetures.middleware.js";

const router = Router();

// 💡 Routes are already protected by tenantRouter middleware (authMiddleware and checkSubscription)
router.use(checkDomainInPlan("ACADEMIC"));

// Examination CRUD
router.post("/", requireTenantPermission("CREATE_EXAM"), createExamination);
router.get("/", requireTenantPermission("READ_EXAM"), listExaminations);
router.put("/:id", requireTenantPermission("UPDATE_EXAM"), updateExamination);
router.delete("/:id", requireTenantPermission("DELETE_EXAM"), deleteExamination);

// Datesheet / Schedule
router.post("/schedule", requireTenantPermission("CREATE_EXAM_SCHEDULE"), createExamSchedule);
router.get("/:examinationId/datesheet", requireTenantPermission("READ_EXAM_SCHEDULE"), getDatesheet);
router.put("/schedule/:id", requireTenantPermission("UPDATE_EXAM_SCHEDULE"), updateExamSchedule);

export default router;
