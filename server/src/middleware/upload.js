const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const path = require("path");
const fs = require("fs");

// Use memory storage — files go straight to buffer, then to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/**
 * Upload buffer to Cloudinary
 * Returns the secure URL of the uploaded image
 */
const uploadToCloudinary = (fileBuffer, folder = "nookambika-menu") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 800, height: 600, crop: "fill", quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Delete an image from Cloudinary by URL
 */
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    // Extract public_id from the URL
    const parts = imageUrl.split("/");
    const folderAndFile = parts.slice(-2).join("/");
    const publicId = folderAndFile.replace(/\.[^/.]+$/, "");
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };
