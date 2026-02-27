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
import { requirePermission } from "../../../core/middlewares/permission.middleware.js";
import { checkSubscription } from "../../../core/middlewares/subscription.middleware.js";
const router = express.Router();


router.use(authMiddleware);
router.use(checkSubscription)


router.post("/", requirePermission("CREATE_FEATURE_DOMAIN"), createDomain);
router.get("/", requirePermission("VIEW_FEATURE_DOMAINS"), getAllDomains);
router.get("/:id", requirePermission("VIEW_FEATURE_DOMAINS"), getDomainById);
router.put("/:id", requirePermission("UPDATE_FEATURE_DOMAIN"), updateDomain);
router.delete("/:id", requirePermission("DELETE_FEATURE_DOMAIN"), deleteDomain);
router.post("/assignfeature", requirePermission("ASSIGN_FEATURE_DOMAIN"), assignFeatureToDomain);
router.post("/unassignfeature", requirePermission("UNASSIGN_FEATURE_DOMAIN"), unassignFeatureFromDomain);
router.get("/assignedfeatures/:domainId", requirePermission("GET_FEATURE_BY_DOMAIN"), getAssignedFeatureByDomain);

// Domain Dependency Management
router.post("/dependency", requirePermission("UPDATE_FEATURE_DOMAIN"), addDomainDependency);
router.delete("/dependency", requirePermission("UPDATE_FEATURE_DOMAIN"), removeDomainDependency);



export default router;
