import { Router } from "express";
import {
  createModule,
  listModules,
  toggleTenantModule,
  getTenantModules,

  getCommonModules,
  makeModuleCommon,
  deleteAllModules,

  archiveModule,
  restoreModule,



} from "./module.controller.js";

import { authMiddleware } from "../../core/middlewares/auth.middleware.js";

const router = Router();

// 👑 MODULE CATALOG
router.post("/", authMiddleware, createModule);
router.get("/", authMiddleware, listModules);
router.get("/common", authMiddleware, getCommonModules);
// router.get("/:moduleId", authMiddleware, getModuleDetails);
// router.put("/:moduleId", authMiddleware, updateModule);
// router.delete("/:moduleId", authMiddleware, deleteModule);
router.post("/:moduleId/archive", authMiddleware, archiveModule);
router.post("/:moduleId/restore", authMiddleware, restoreModule);
router.post("/:moduleId/make-common", authMiddleware, makeModuleCommon);
router.delete("/delete-all", authMiddleware, deleteAllModules);
// 👑 TENANT MODULE CONTROL
router.patch(
  "/tenants/:tenantId/modules/:moduleId",
  authMiddleware,
  toggleTenantModule
);

router.get(
  "/tenants/:tenantId/modules",
  authMiddleware,
  getTenantModules
);

export default router;
