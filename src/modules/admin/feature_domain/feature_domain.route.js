import express from "express";
import {
    createDomain,
    getAllDomains,
    getDomainById,
    updateDomain,
    deleteDomain,
    assignFeatureToDomain,
    getAssignedFeatureByDomain,
    addDomainDependency,
    removeDomainDependency,
    unassignFeatureFromDomain
} from "./feature_domain.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../../core/middlewares/permission.middleware.js";
import { checkSubscription } from "../../../core/middlewares/subscription.middleware.js";
const router = express.Router();


router.use(authMiddleware);
router.use(checkSubscription)


router.post("/", requirePlatformPermission("CREATE_FEATURE_DOMAIN"), createDomain);
router.get("/", requirePlatformPermission("VIEW_FEATURE_DOMAINS"), getAllDomains);
router.get("/:id", requirePlatformPermission("VIEW_FEATURE_DOMAINS"), getDomainById);
router.put("/:id", requirePlatformPermission("UPDATE_FEATURE_DOMAIN"), updateDomain);
router.delete("/:id", requirePlatformPermission("DELETE_FEATURE_DOMAIN"), deleteDomain);
router.post("/assignfeature", requirePlatformPermission("ASSIGN_FEATURE_DOMAIN"), assignFeatureToDomain);
router.post("/unassignfeature", requirePlatformPermission("UNASSIGN_FEATURE_DOMAIN"), unassignFeatureFromDomain);
router.get("/assignedfeatures/:domainId", requirePlatformPermission("GET_FEATURE_BY_DOMAIN"), getAssignedFeatureByDomain);

// Domain Dependency Management
router.post("/dependency", requirePlatformPermission("UPDATE_FEATURE_DOMAIN"), addDomainDependency);
router.delete("/dependency", requirePlatformPermission("UPDATE_FEATURE_DOMAIN"), removeDomainDependency);



export default router;
