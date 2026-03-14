"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type PhotoMatch = {
  photoId: string;
  taskId: string;
  confidence: number;
  reasoning: string;
};

export async function getAIPhotoMatches(jobId: string): Promise<PhotoMatch[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/ai/match-photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const data = await res.json();
    return data.matches || [];
  } catch {
    return [];
  }
}

export async function applyPhotoMatch(photoId: string, taskId: string) {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("task_photo_links")
    .insert({ photo_id: photoId, task_id: taskId });

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/jobs");
  return { success: true };
}

export async function applyAllPhotoMatches(
  matches: { photoId: string; taskId: string }[],
) {
  const supabase = await createClient();

  const rows = matches.map((m) => ({ photo_id: m.photoId, task_id: m.taskId }));

  const { error } = await (supabase as any)
    .from("task_photo_links")
    .insert(rows);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/jobs");
  return { success: true };
}
