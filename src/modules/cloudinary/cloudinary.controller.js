import { ApiResponse } from "../../core/utils/ApiResponse.js";
import { asyncHandler } from "../../core/utils/asyncHandler.js"; // I should check if this exists
import { ApiError } from "../../core/utils/ApiError.js";

const uploadSingle = (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No file uploaded");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {
            url: req.file.path,
            public_id: req.file.filename,
            name: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        }, "File uploaded successfully"));
};

const uploadMultiple = (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "No files uploaded");
    }

    const uploadedFiles = req.files.map(file => ({
        url: file.path,
        public_id: file.filename,
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, uploadedFiles, "Files uploaded successfully"));
};

export {
    uploadSingle,
    uploadMultiple
};
