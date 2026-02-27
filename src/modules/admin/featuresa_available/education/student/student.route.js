import { Router } from "express";
import {
    createStudent,
    listStudents,
    getStudentDetails,
    updateStudent,
    deleteStudent
} from "./student.controller.js";
import { checkDomainInPlan } from "../../../../../core/middlewares/fetures.middleware.js";
import { requirePermission } from "../../../../../core/middlewares/permission.middleware.js";
import { checkSubscription } from "../../../../../core/middlewares/subscription.middleware.js";

import { upload, setUploadFolder } from "../../../../../core/middlewares/multer.middleware.js";

const router = Router();

// Routes are already protected by tenantRouter middleware (authMiddleware and checkSubscription)
router.use(checkDomainInPlan("ACADEMIC"))
router.use(checkSubscription)

router.post("/create", requirePermission("CREATE_STUDENT"), setUploadFolder("student_profiles"), upload.single("profileImage"), createStudent);
router.get("/list", requirePermission("READ_STUDENT"), listStudents);
router.get("/details/:id", requirePermission("READ_STUDENT"), getStudentDetails);
router.put("/update/:id", requirePermission("UPDATE_STUDENT"), setUploadFolder("student_profiles"), upload.single("profileImage"), updateStudent);
router.delete("/delete/:id", requirePermission("DELETE_STUDENT"), deleteStudent);

export default router;