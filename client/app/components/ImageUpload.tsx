"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

interface ImageUploadProps {
  value?: string | null; // Existing image URL (if editing)
  onChange: (file: File | null, remove: boolean) => void;
  uploadProgress?: number | null; // Progress from axios (0 to 100)
  saving?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  uploadProgress,
  saving,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Allowed formats: JPG, JPEG, PNG, WEBP
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file format. Only JPG, JPEG, PNG, and WEBP are allowed.");
      return false;
    }

    // Maximum size: 10MB
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File is too large. Maximum size allowed is 10MB.");
      return false;
    }

    return true;
  };

  const handleFileChange = (file: File) => {
    if (validateFile(file)) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      onChange(file, false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onChange(null, true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <label
        className="block text-sm font-bold uppercase tracking-wider mb-2"
        style={{ color: "var(--color-brown-900)" }}
      >
        Food Image
      </label>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative w-full rounded-xl transition-all border-2 border-dashed flex flex-col items-center justify-center p-6 ${
          dragActive
            ? "border-[var(--color-orange-500)] bg-[var(--color-cream-100)]"
            : "border-[var(--color-brown-800)] hover:border-[var(--color-orange-500)] hover:bg-[var(--color-cream-100)]"
        }`}
        style={{
          background: previewUrl ? "var(--color-surface)" : "var(--color-cream-50)",
          minHeight: "160px",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={onFileInputChange}
          disabled={saving}
        />

        {previewUrl ? (
          <div className="w-full flex flex-col items-center gap-4">
            {/* Image Preview */}
            <div
              className="w-32 h-32 relative rounded-lg overflow-hidden border-2"
              style={{ borderColor: "var(--color-brown-900)" }}
            >
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-white bg-black/60 hover:bg-black transition-colors"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onButtonClick}
                disabled={saving}
                className="btn-secondary font-bold text-xs uppercase tracking-wider"
                style={{ padding: "0.375rem 0.75rem" }}
              >
                Replace Image
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="btn-secondary font-bold text-xs uppercase tracking-wider"
                style={{
                  padding: "0.375rem 0.75rem",
                  color: "var(--color-danger)",
                  borderColor: "var(--color-danger)",
                }}
              >
                Remove Image
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center cursor-pointer w-full h-full py-4"
            onClick={onButtonClick}
          >
            <Upload
              size={32}
              className="mb-2 text-[var(--color-brown-800)]"
            />
            <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--color-brown-900)" }}>
              Drag & Drop Image
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              or click to browse files
            </p>
            <p className="text-[10px] mt-2 font-semibold uppercase opacity-60" style={{ color: "var(--color-brown-800)" }}>
              JPG, JPEG, PNG, WEBP (Max 10MB)
            </p>
          </div>
        )}

        {/* Progress & Saving Indicators */}
        {saving && uploadProgress !== null && uploadProgress !== undefined && uploadProgress > 0 && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center p-4 rounded-xl text-white">
            <ImageIcon className="animate-bounce mb-2" size={24} />
            <p className="text-sm font-bold uppercase tracking-wider">
              {uploadProgress === 100 ? "Processing Image..." : `Uploading: ${uploadProgress}%`}
            </p>
            <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden mt-2 border border-white/20">
              <div
                className="h-full bg-[var(--color-orange-500)] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
