import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Determine folder name from request or file type
        // Default to 'general' if not specified
        const folderName = req.uploadFolder || "general";

        return {
            folder: `bt_erp/${folderName}`,
            allowed_formats: ["jpg", "png", "jpeg", "pdf", "webp"],
            resource_type: "auto",
        };
    },
});

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

/**
 * Middleware to set the upload folder dynamically
 * @param {string} folderName 
 */
export const setUploadFolder = (folderName) => {
    return (req, res, next) => {
        req.uploadFolder = folderName;
        next();
    };
};
