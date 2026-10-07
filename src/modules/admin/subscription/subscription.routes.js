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
import { requirePlatformPermission } from "../../../core/middlewares/permission.middleware.js";
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

router.get("/all-domains", requirePlatformPermission("VIEW_SUBSCRIPTION_DOMAINS"), getAllDomainsInSubscription);
router.post("/assign-domain", requirePlatformPermission("ASSIGN_SUBSCRIPTION_TO_DOMAIN"), assignDomainToSubscription);
router.post("/remove-domain", requirePlatformPermission("REMOVE_SUBSCRIPTION_FROM_DOMAIN"), removeDomainFromSubscription);




router.post("/", requirePlatformPermission("CREATE_SUBSCRIPTION"), createSubscription);
router.post("/assign/:tenantId", requirePlatformPermission("ASSIGN_SUBSCRIPTION"), assignSubscriptionToTenant);
router.get("/:subscriptionId", requirePlatformPermission("VIEW_SUBSCRIPTIONS"), getSubscriptionDetails);
router.put("/:subscriptionId", requirePlatformPermission("UPDATE_SUBSCRIPTION"), updateSubscription);
router.delete("/:subscriptionId", requirePlatformPermission("DELETE_SUBSCRIPTION"), deleteSubscription);

// 🚀 Setup Default Plans
router.post("/setup-defaults", requirePlatformPermission("SETUP_DEFAULT_PLANS"), setupDefaultSubscriptions);

export default router;