import { Router } from "express";
import {
    createStudent,
    listStudents,
    getStudentDetails,
    updateStudent,
    deleteStudent
} from "./student.controller.js";
import { checkDomainInPlan } from "../../../../../core/middlewares/fetures.middleware.js";
import { requireTenantPermission } from "../../../../../core/middlewares/permission.middleware.js";
import { checkSubscription } from "../../../../../core/middlewares/subscription.middleware.js";

import { upload, setUploadFolder } from "../../../../../core/middlewares/multer.middleware.js";

const router = Router();

// Routes are already protected by tenantRouter middleware (authMiddleware and checkSubscription)
router.use(checkDomainInPlan("ACADEMIC"))
router.use(checkSubscription)

router.post("/create", requireTenantPermission("CREATE_STUDENT"), setUploadFolder("student_profiles"), upload.single("profileImage"), createStudent);
router.get("/list", requireTenantPermission("READ_STUDENT"), listStudents);
router.get("/details/:id", requireTenantPermission("READ_STUDENT"), getStudentDetails);
router.put("/update/:id", requireTenantPermission("UPDATE_STUDENT"), setUploadFolder("student_profiles"), upload.single("profileImage"), updateStudent);
router.delete("/delete/:id", requireTenantPermission("DELETE_STUDENT"), deleteStudent);

export default router;