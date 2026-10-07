import express from "express";
import {
    registerPlatformStaff,
    listPlatformStaff,
    updatePlatformStaff,
    deletePlatformStaff,
    loginPlatformStaff,
} from "./staff.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../../core/middlewares/permission.middleware.js";

import { upload, setUploadFolder } from "../../../core/middlewares/multer.middleware.js";

const router = express.Router();

// Public login
router.post("/login", loginPlatformStaff);

// Protected routes
router.use(authMiddleware);

router.post("/register", requirePlatformPermission("CREATE_STAFF"), setUploadFolder("admin_profiles"), upload.single("profileImage"), registerPlatformStaff);
router.get("/", requirePlatformPermission("VIEW_STAFF"), listPlatformStaff);
router.patch("/:id", requirePlatformPermission("UPDATE_STAFF"), setUploadFolder("admin_profiles"), upload.single("profileImage"), updatePlatformStaff);
router.delete("/:id", requirePlatformPermission("DELETE_STAFF"), deletePlatformStaff);


export default router;
