import express from "express";
import {
    registerTenantStaff,
    listTenantStaff,
    updateTenantStaff,
    deleteTenantStaff,
    loginTenantStaff,
} from "./tenantstaff.controller.js";
import { authMiddleware } from "../../../../core/middlewares/auth.middleware.js";

import { upload, setUploadFolder } from "../../../../core/middlewares/multer.middleware.js";

const router = express.Router();

// Public login for tenant staff
router.post("/login", loginTenantStaff);

// Protected routes
router.use(authMiddleware);

router.post("/register", setUploadFolder("staff_profiles"), upload.single("profileImage"), registerTenantStaff);
router.get("/", listTenantStaff);
router.patch("/:id", setUploadFolder("staff_profiles"), upload.single("profileImage"), updateTenantStaff);
router.delete("/:id", deleteTenantStaff);

export default router;
