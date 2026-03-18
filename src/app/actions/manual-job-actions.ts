"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type ManualJobResult = {
  success: boolean;
  jobId?: string;
  jobNumber?: string;
  error?: string;
};

export async function createJobManual(
  formData: FormData,
): Promise<ManualJobResult> {
  const supabase = await createClient();

  const title = (formData.get("title") as string) || "";
  const description = (formData.get("description") as string) || "";
  const address = (formData.get("address") as string) || "";
  const clientId = (formData.get("client_id") as string) || "";
  const urgency = (formData.get("urgency") as string) || "standard";
  const files = formData.getAll("attachments") as File[];

  if (!title && !description && !address) {
    return {
      success: false,
      error: "Please provide at least a title, description, or address.",
    };
  }

  // Get current user's org
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { success: false, error: "No organization found." };
  }

  // Create the job — starts as "draft" since it's manual (no triage needed)
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      organization_id: profile.organization_id,
      title: title || address || "Untitled Job",
      description: description || null,
      status: "draft",
      urgency: urgency === "rush" ? "rush" : "standard",
      property_address: address || null,
      address: address || null,
      client_id: clientId || null,
    } as any)
    .select("id, job_number")
    .single();

  if (jobError || !job) {
    return {
      success: false,
      error: jobError?.message || "Failed to create job.",
    };
  }

  // Upload attachments
  if (files.length > 0) {
    for (const file of files) {
      if (!file.size) continue;
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const fileType = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
        ? "photo"
        : "pdf";
      const path = `jobs/${job.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("job-attachments")
        .upload(path, file);

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("job-attachments").getPublicUrl(path);

        await supabase.from("job_attachments").insert({
          job_id: job.id,
          file_url: publicUrl,
          file_type: fileType,
        } as any);
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/jobs/new");

  return {
    success: true,
    jobId: job.id,
    jobNumber: (job as any).job_number,
  };
}
