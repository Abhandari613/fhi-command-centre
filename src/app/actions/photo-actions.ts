"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const uploadPhotoSchema = z.object({
    jobId: z.string().uuid(),
    photoType: z.enum(['before', 'after', 'other']),
    fileBase64: z.string().min(1, "Image data is required"),
    fileName: z.string().min(1)
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;

import { withActionValidation } from '@/lib/core/actions/wrapper';
import { createActionError, ActionResult } from '@/lib/core/actions/types';

/**
 * @intent Uploads a photo to Supabase storage and creates a DB record linked to a job.
 * @generated AI-assisted
 */
export async function uploadJobPhoto(input: unknown): Promise<ActionResult<void>> {
    return withActionValidation(uploadPhotoSchema, input, async (validatedData) => {
        try {
            const { jobId, photoType, fileBase64, fileName } = validatedData;
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return { success: false, error: createActionError('UNAUTHORIZED', 'Unauthorized access', 401) };
            }

            const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            // 1. Upload to Storage
            const filePath = `${jobId}/${photoType}/${Date.now()}_${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from('job_photos')
                .upload(filePath, buffer, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) {
                console.error("Storage Error:", uploadError);
                return { success: false, error: createActionError('UPLOAD_FAILED', 'Failed to upload image', 500) };
            }

            const { data: { publicUrl } } = supabase.storage
                .from('job_photos')
                .getPublicUrl(filePath);

            // 2. Save to DB
            const { error: dbError } = await supabase
                .from('job_photos')
                .insert({
                    job_id: jobId,
                    url: publicUrl,
                    type: photoType,
                    uploaded_by: user.id,
                    caption: fileName
                });

            if (dbError) {
                console.error("DB Error:", dbError);
                return { success: false, error: createActionError('DB_INSERT_FAILED', 'Failed to save photo record', 500) };
            }

            revalidatePath(`/ops/jobs/${jobId}`);
            revalidatePath(`/ops/quotes/${jobId}`);

            return { success: true };

        } catch (error) {
            console.error("Upload Job Photo Error:", error);
            return { success: false, error: createActionError('PROCESSING_FAILED', 'Unexpected error occurred', 500) };
        }
    });
}

export async function deleteJobPhoto(photoId: string, jobId: string) {
    const supabase = await createClient();

    // 1. Get photo to find storage path (if we want to clean up storage too)
    // For now, just deleting the record is enough for the UI, but cleaning storage is better.
    // skipping storage cleanup for speed, can add later.

    const { error } = await supabase
        .from('job_photos')
        .delete()
        .eq('id', photoId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/ops/jobs/${jobId}`);
    revalidatePath(`/ops/quotes/${jobId}`);

    return { success: true };
}
