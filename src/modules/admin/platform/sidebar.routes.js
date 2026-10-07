import express from "express";
import {
    createSidebar,
    listSidebars,
    assignSidebarToRole,
    getRoleSidebars,
    unassignSidebarFromRole
} from "./sidebar.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../../core/middlewares/permission.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Sidebar Items CRUD
router.post("/", requirePlatformPermission("CREATE_PLATFORM_SIDEBAR"), createSidebar);
router.get("/", requirePlatformPermission("VIEW_PLATFORM_SIDEBARS"), listSidebars);

// Assignment
router.post("/assign", requirePlatformPermission("ASSIGN_PLATFORM_SIDEBAR"), assignSidebarToRole);
router.delete("/assign", requirePlatformPermission("UNASSIGN_PLATFORM_SIDEBAR"), unassignSidebarFromRole);
// Staff may read the sidebar of their own role; reading other roles needs VIEW_PLATFORM_SIDEBARS
router.get("/:roleId", (req, res, next) => {
    if (req.user.type === "PLATFORM_STAFF" && req.user.roleId === req.params.roleId) return next();
    return requirePlatformPermission("VIEW_PLATFORM_SIDEBARS")(req, res, next);
}, getRoleSidebars);

export default router;
