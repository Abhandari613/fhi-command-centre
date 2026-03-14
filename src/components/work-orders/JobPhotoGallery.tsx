"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Trash2,
  Plus,
  X,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { uploadJobPhoto, deleteJobPhoto } from "@/app/actions/photo-actions";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import Image from "next/image";

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  type: string; // 'before' | 'after' | 'other'
};

interface JobPhotoGalleryProps {
  jobId: string;
  photos: Photo[];
  type: "before" | "after" | "other";
  title?: string;
  readOnly?: boolean;
}

export function JobPhotoGallery({
  jobId,
  photos,
  type,
  title,
  readOnly = false,
}: JobPhotoGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter photos by type if passed (though parent should ideally pass pre-filtered)
  // Actually, let's rely on parent passing the correct list, or filter here.
  // To be safe and flexible, let's filter here if the list is mixed, but assume parent might pass all.
  const displayPhotos = photos.filter(
    (p) =>
      p.type === type ||
      (!p.type && type === "other") ||
      p.type === "before" ||
      p.type === "after",
  ); // Explicitly allow all known types to bypass overlap check if types are loose

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;

        const result = await uploadJobPhoto({
          jobId,
          photoType: type,
          fileBase64: base64,
          fileName: file.name,
        });

        if (!result.success)
          throw new Error(
            typeof result.error === "object"
              ? (result.error as any)?.message
              : String(result.error || "Upload failed"),
          );

        toast.success("Photo uploaded");
      };
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (photoId: string) => {
    if (readOnly) return;
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      const result = await deleteJobPhoto(photoId, jobId);
      if (!result.success)
        throw new Error(
          (result as any).error
            ? String((result as any).error?.message || (result as any).error)
            : "Delete failed",
        );
      toast.success("Photo deleted");
      if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete photo");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          {title || (type === "before" ? "Before Photos" : "After Photos")}
          <span className="text-xs font-normal opacity-50 bg-white/10 px-2 py-1 rounded-full">
            {displayPhotos.length}
          </span>
        </h3>
        {!readOnly && (
          <>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Photo
            </button>
          </>
        )}
      </div>

      {displayPhotos.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-xl p-8 text-center bg-white/5">
          <ImageIcon className="w-10 h-10 mx-auto text-white/20 mb-3" />
          <p className="text-white/40 text-sm">No photos yet</p>
          {!readOnly && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 text-primary-400 text-sm hover:underline"
            >
              Upload one now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnimatePresence>
            {displayPhotos.map((photo) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border border-white/10 hover:border-primary/50 transition-colors"
                onClick={() => setSelectedPhoto(photo)}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || "Job photo"}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                {!readOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white"
              >
                <X className="w-8 h-8" />
              </button>
              <div className="relative w-full h-full">
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Full size"}
                  fill
                  className="object-contain"
                />
              </div>
              {selectedPhoto.caption && (
                <div className="absolute bottom-4 left-0 right-0 text-center bg-black/50 p-2 text-white text-sm backdrop-blur-sm mx-auto max-w-md rounded-full">
                  {selectedPhoto.caption}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
