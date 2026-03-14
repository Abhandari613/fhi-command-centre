import { z } from "zod";

export const uploadReceiptSchema = z.object({
  fileBase64: z.string().min(1, "Image data is required"),
  imageUrl: z.string().optional(), // Path in storage
});

export type UploadReceiptInput = z.infer<typeof uploadReceiptSchema>;
