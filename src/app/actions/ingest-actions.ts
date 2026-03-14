"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type IngestResult = {
  success: boolean;
  jobId?: string;
  jobNumber?: string;
  error?: string;
};

const RUSH_KEYWORDS = [
  "rush",
  "asap",
  "urgent",
  "emergency",
  "immediately",
  "right away",
];

function detectUrgency(subject: string, body: string): "rush" | "standard" {
  const text = `${subject} ${body}`.toLowerCase();
  return RUSH_KEYWORDS.some((kw) => text.includes(kw)) ? "rush" : "standard";
}

function extractAddress(subject: string): string | null {
  // Match common address patterns: number + street name + optional unit/apt
  const patterns = [
    /(\d+\s+[\w\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place|cres|crescent)[\w\s,]*)/i,
    /(?:unit|apt|suite|#)\s*\w+[,\s]+\d+\s+[\w\s]+/i,
  ];
  for (const p of patterns) {
    const match = subject.match(p);
    if (match) return match[0].trim();
  }
  return null;
}

export async function createJobFromEmail(
  formData: FormData,
): Promise<IngestResult> {
  const supabase = await createClient();

  const subject = (formData.get("subject") as string) || "";
  const body = (formData.get("body") as string) || "";
  const files = formData.getAll("attachments") as File[];

  if (!subject && !body) {
    return { success: false, error: "Please enter a subject or email body." };
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

  const urgency = detectUrgency(subject, body);
  const address = extractAddress(subject);

  // Create job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      organization_id: profile.organization_id,
      title: subject || "Untitled Job",
      description: body,
      status: "incoming",
      urgency,
      property_address: address,
      source_email_subject: subject,
      source_email_body: body,
      address: address,
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

  revalidatePath("/ingest");
  revalidatePath("/dashboard");
  revalidatePath("/ops/work-orders");

  return {
    success: true,
    jobId: job.id,
    jobNumber: (job as any).job_number,
  };
}
