import { Router } from "express";
import {
    createTeacher,
    listTeachers,
    getTeacherDetails,
    updateTeacher,
    deleteTeacher,
} from "./teachers.controller.js";
import { requirePermission } from "../../../../../core/middlewares/permission.middleware.js";
import { checkDomainInPlan } from "../../../../../core/middlewares/fetures.middleware.js";

import { upload, setUploadFolder } from "../../../../../core/middlewares/multer.middleware.js";

const router = Router();

// 💡 Routes are already protected by tenantRouter middleware (authMiddleware and checkSubscription)
// This domain name should match the one assigned in the subscription plan
router.use(checkDomainInPlan("ACADEMIC"));

router.post("/", requirePermission("CREATE_TEACHER"), setUploadFolder("teacher_profiles"), upload.single("profileImage"), createTeacher);
router.get("/", requirePermission("READ_TEACHER"), listTeachers);
router.get("/:id", requirePermission("READ_TEACHER"), getTeacherDetails);
router.put("/:id", requirePermission("UPDATE_TEACHER"), setUploadFolder("teacher_profiles"), upload.single("profileImage"), updateTeacher);
router.delete("/:id", requirePermission("DELETE_TEACHER"), deleteTeacher);

export default router;
