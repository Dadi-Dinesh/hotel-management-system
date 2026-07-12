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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * Upload buffer to Cloudinary
 * Returns an object with secure_url and public_id
 */
const uploadToCloudinary = (fileBuffer, folder = "nookambika-menu") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 800, height: 600, crop: "fill", quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Delete an image from Cloudinary by public ID or URL
 */
const deleteFromCloudinary = async (identifier) => {
  try {
    if (!identifier) return;
    
    let publicId = identifier;
    // If it's a URL, extract the public_id
    if (identifier.startsWith("http://") || identifier.startsWith("https://")) {
      const parts = identifier.split("/");
      const folderAndFile = parts.slice(-2).join("/");
      publicId = folderAndFile.replace(/\.[^/.]+$/, "");
    }
    
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };
