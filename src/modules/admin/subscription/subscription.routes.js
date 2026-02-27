import { Router } from "express";
import {
  createSubscription,
  listSubscriptions,
  updateSubscription,
  assignSubscriptionToTenant,
  setupDefaultSubscriptions,
  getSubscriptionDetails,
  deleteSubscription,
} from "./subscription.controller.js";
import { requirePermission } from "../../../core/middlewares/permission.middleware.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { checkSuperAdmin } from "../../../core/middlewares/superadmin.middleware.js";
import { assignDomainToSubscription, removeDomainFromSubscription, getAllDomainsInSubscription } from "./subscription.and.Domain.controller.js";
import { checkSubscription } from "../../../core/middlewares/subscription.middleware.js";

const router = Router();

// 🔓 Public route to compare subscriptions
// 🔓 Public routes
router.get("/", listSubscriptions);


router.use(authMiddleware);
router.use(checkSubscription);

router.get("/all-domains", requirePermission("VIEW_SUBSCRIPTION_DOMAINS"), getAllDomainsInSubscription);
router.post("/assign-domain", requirePermission("ASSIGN_SUBSCRIPTION_TO_DOMAIN"), assignDomainToSubscription);
router.post("/remove-domain", requirePermission("REMOVE_SUBSCRIPTION_FROM_DOMAIN"), removeDomainFromSubscription);




router.post("/", requirePermission("CREATE_SUBSCRIPTION_PLAN"), createSubscription);
router.post("/assign/:tenantId", requirePermission("ASSIGN_SUBSCRIPTION_PLAN"), assignSubscriptionToTenant);
router.get("/:subscriptionId", requirePermission("VIEW_SUBSCRIPTION_PLAN"), getSubscriptionDetails);
router.put("/:subscriptionId", requirePermission("UPDATE_SUBSCRIPTION_PLAN"), updateSubscription);
router.delete("/:subscriptionId", requirePermission("DELETE_SUBSCRIPTION_PLAN"), deleteSubscription);

// 🚀 Setup Default Plans
router.post("/setup-defaults", requirePermission("SETUP_DEFAULT_PLANS"), setupDefaultSubscriptions);

export default router;