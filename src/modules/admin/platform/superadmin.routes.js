import express from "express";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { checkSuperAdmin } from "../../../core/middlewares/superadmin.middleware.js";
import { buildSession } from "../../auth/session.js";
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

// Protected routes
router.use(authMiddleware);

// Current platform session (super admin or platform staff) incl. permissions
router.get("/me", async (req, res) => {
    res.json({ success: true, user: await buildSession(req.user) });
});

// Only an existing Super Admin can manage Super Admins
router.use(checkSuperAdmin);

router.post("/", createSuperAdmin);
router.get("/", listSuperAdmins);
router.patch("/:id", updateSuperAdmin);
router.delete("/:id", deleteSuperAdmin);



export default router;
