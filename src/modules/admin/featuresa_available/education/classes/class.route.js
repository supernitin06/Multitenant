import { Router } from "express";
import { listClasses, getClassDetails, createClass, updateClass, deleteClass } from "./class.controller.js";
import { requireTenantPermission } from "../../../../../core/middlewares/permission.middleware.js";
import { checkDomainInPlan } from "../../../../../core/middlewares/fetures.middleware.js";

/**
 * Mounted at /api/v1/tenant/:tenantName/classes
 * (authMiddleware + checkSubscription are applied by the tenant router)
 */
const router = Router();

// The plan must include the CLASSES feature domain
router.use(checkDomainInPlan("CLASSES"));

router.get("/", requireTenantPermission("READ_CLASS"), listClasses);
router.get("/:id", requireTenantPermission("READ_CLASS"), getClassDetails);
router.post("/", requireTenantPermission("CREATE_CLASS"), createClass);
router.put("/:id", requireTenantPermission("UPDATE_CLASS"), updateClass);
router.delete("/:id", requireTenantPermission("DELETE_CLASS"), deleteClass);

export default router;
