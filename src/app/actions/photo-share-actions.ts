"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * TRACK 5: Share progress photos with the client/coordinator.
 */
export async function sharePhotosWithClient(
  jobId: string,
  photoIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get job with coordinator contact
  const { data: job } = await supabase
    .from("jobs")
    .select("*, clients(name, email)")
    .eq("id", jobId)
    .single();

  if (!job) return { success: false, error: "Job not found" };

  // Get coordinator contact email
  let recipientEmail = "";
  let recipientName = "";

  if ((job as any).coordinator_contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("email, name")
      .eq("id", (job as any).coordinator_contact_id)
      .single();
    recipientEmail = contact?.email || "";
    recipientName = contact?.name || "";
  }

  // Fallback to client email
  if (!recipientEmail) {
    recipientEmail = (job as any).clients?.email || "";
    recipientName = (job as any).clients?.name || "";
  }

  if (!recipientEmail) {
    return { success: false, error: "No coordinator email found" };
  }

  // Get photo URLs
  const { data: photos } = await (supabase.from as any)("job_photos")
    .select("id, url, type, caption")
    .in("id", photoIds);

  if (!photos?.length) return { success: false, error: "No photos found" };

  // Build portal link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalLink = `${appUrl}/portal/${jobId}`;

  // Build email with photo thumbnails
  const photoGrid = photos
    .map(
      (p: any) => `
    <div style="display:inline-block;margin:4px;">
      <img src="${p.url}" alt="${p.caption || "Progress photo"}"
           style="width:150px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #333;" />
    </div>
  `,
    )
    .join("");

  const html = `
    <div style="font-family:system-ui;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
      <div style="border-bottom:2px solid #ff6b00;padding-bottom:16px;margin-bottom:24px;">
        <h2 style="margin:0;color:#ff6b00;">Progress Update</h2>
        <p style="margin:4px 0 0;opacity:0.6;">${job.property_address || job.title}</p>
      </div>
      <p>Hi ${recipientName || "there"},</p>
      <p>Here's a progress update with ${photos.length} new photo${photos.length > 1 ? "s" : ""} from the job site:</p>
      <div style="margin:16px 0;">
        ${photoGrid}
      </div>
      <a href="${portalLink}" style="display:inline-block;background:#ff6b00;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
        View Full Gallery
      </a>
      <p style="margin-top:24px;opacity:0.6;font-size:13px;">— Frank's Home Improvement</p>
    </div>
  `;

  try {
    const { data: sendResult } = await resend.emails.send({
      from: "FHI Updates <updates@fhi.ca>",
      to: recipientEmail,
      subject: `Progress Photos — ${job.property_address || job.title}`,
      html,
    });

    // Log the share
    await (supabase.from as any)("photo_share_log").insert({
      job_id: jobId,
      photo_ids: photoIds,
      shared_with_email: recipientEmail,
      portal_link: portalLink,
      resend_message_id: sendResult?.id || null,
    } as any);

    await logJobEvent(jobId, "photos_shared", {
      photoCount: photos.length,
      to: recipientEmail,
    });

    revalidatePath(`/ops/jobs/${jobId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
