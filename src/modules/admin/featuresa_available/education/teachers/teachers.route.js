import { Router } from "express";
import {
    createTeacher,
    listTeachers,
    getTeacherDetails,
    updateTeacher,
    deleteTeacher,
} from "./teachers.controller.js";
import { requireTenantPermission } from "../../../../../core/middlewares/permission.middleware.js";
import { checkDomainInPlan } from "../../../../../core/middlewares/fetures.middleware.js";

import { upload, setUploadFolder } from "../../../../../core/middlewares/multer.middleware.js";

const router = Router();

// 💡 Routes are already protected by tenantRouter middleware (authMiddleware and checkSubscription)
// This domain name should match the one assigned in the subscription plan
router.use(checkDomainInPlan("ACADEMIC"));

router.post("/", requireTenantPermission("CREATE_TEACHER"), setUploadFolder("teacher_profiles"), upload.single("profileImage"), createTeacher);
router.get("/", requireTenantPermission("READ_TEACHER"), listTeachers);
router.get("/:id", requireTenantPermission("READ_TEACHER"), getTeacherDetails);
router.put("/:id", requireTenantPermission("UPDATE_TEACHER"), setUploadFolder("teacher_profiles"), upload.single("profileImage"), updateTeacher);
router.delete("/:id", requireTenantPermission("DELETE_TEACHER"), deleteTeacher);

export default router;
