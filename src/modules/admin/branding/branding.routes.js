import { Router } from "express";
import multer from "multer";
import { uploadBranding, } from "./branding.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadBranding
);

export default router;
