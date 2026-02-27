import express from "express";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import {
    listSuperAdmins,
    createSuperAdmin,
    updateSuperAdmin,
    deleteSuperAdmin,
    loginSuperAdmin
} from "./superadmin.controller.js";

const router = express.Router();

// Public route
router.post("/login", loginSuperAdmin);
router.post("/", createSuperAdmin);

// Protected routes
router.use(authMiddleware);

router.get("/", listSuperAdmins);
router.patch("/:id", updateSuperAdmin);
router.delete("/:id", deleteSuperAdmin);



export default router;
