import cloudinary from "../config/cloudinary.js";
import fs from "fs";

/**
 * Upload a local file to Cloudinary
 * @param {string} localFilePath 
 * @param {string} folder 
 * @returns {Promise<object|null>}
 */
export const uploadOnCloudinary = async (localFilePath, folder = "general") => {
    try {
        if (!localFilePath) return null;

        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: `bt_erp/${folder}`,
        });

        // File has been uploaded successfully
        // console.log("File is uploaded on cloudinary", response.url);

        // Remove the locally saved temporary file
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;
    } catch (error) {
        // Remove the locally saved temporary file as the upload operation failed
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId 
 * @returns {Promise<object|null>}
 */
export const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId);
        return response;
    } catch (error) {
        return null;
    }
};
