import { Router } from "express";
import { uploadSingle, uploadMultiple } from "./cloudinary.controller.js";
import { upload, setUploadFolder } from "../../core/middlewares/multer.middleware.js";
import { authMiddleware } from "../../core/middlewares/auth.middleware.js";

const router = Router();

// Generic upload routes
router.post(
    "/upload",
    authMiddleware,
    setUploadFolder("general"),
    upload.single("file"),
    uploadSingle
);

router.post(
    "/upload-multiple",
    authMiddleware,
    setUploadFolder("general"),
    upload.array("files", 5),
    uploadMultiple
);

export default router;
