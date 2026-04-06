"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

/**
 * TRACK 7: Reply to an email thread from the job detail page.
 */
export async function replyToThread(
  gmailThreadId: string,
  body: string,
  jobId?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };
  if (!body.trim()) return { success: false, error: "Message body is empty" };

  // Get OAuth tokens for Gmail
  const { data: tokens } = await (supabase.from as any)("gcal_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!tokens) {
    return {
      success: false,
      error: "Gmail not connected — go to Settings to connect",
    };
  }

  // Send via Gmail API
  try {
    const { sendGmailMessage } = await import("@/lib/services/gmail");
    await sendGmailMessage(tokens as any, {
      to: "",
      subject: "",
      threadId: gmailThreadId,
      body,
    });

    // Update the email thread's last_message_date
    await (supabase.from as any)("email_threads")
      .update({
        last_message_date: new Date().toISOString(),
      })
      .eq("gmail_thread_id", gmailThreadId);

    if (jobId) {
      await logJobEvent(jobId, "email_reply_sent", {
        gmailThreadId,
        bodyPreview: body.slice(0, 100),
      });
    }

    revalidatePath("/inbox");
    if (jobId) revalidatePath(`/ops/jobs/${jobId}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
