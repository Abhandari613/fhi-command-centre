"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";
import { convertDraftToJob } from "@/app/actions/draft-review-actions";
import { pushNotification } from "@/lib/services/notifications";

const RECOGNIZED_TRADES = [
  "painting",
  "plumbing",
  "electrical",
  "general",
  "cleaning",
  "flooring",
  "drywall",
  "hvac",
  "carpentry",
  "locksmith",
];

/**
 * Compute extraction confidence score for a work order draft.
 * Returns 0-100 score based on data quality signals.
 */
export function computeConfidence(draft: {
  client_name?: string | null;
  property_address_or_unit?: string | null;
  trade_type?: string | null;
  description?: string | null;
  sender_email?: string | null;
  sender_is_known?: boolean;
  address_matches_property?: boolean;
}): number {
  let score = 0;

  // +30 if sender is a known contact
  if (draft.sender_is_known) score += 30;

  // +20 if address matches existing property
  if (draft.address_matches_property) score += 20;

  // +20 if trade type is recognized
  if (draft.trade_type) {
    const normalized = draft.trade_type.toLowerCase().trim();
    if (RECOGNIZED_TRADES.some((t) => normalized.includes(t))) {
      score += 20;
    }
  }

  // +15 if description is non-empty and > 20 characters
  if (draft.description && draft.description.trim().length > 20) {
    score += 15;
  }

  // +15 if all required fields present
  if (draft.property_address_or_unit && draft.description) {
    score += 15;
  }

  return score;
}

/**
 * Check if an email is primarily questions (contains "?" as primary content).
 */
function isPrimarilyQuestions(text: string): boolean {
  if (!text) return false;
  const sentences = text.split(/[.!?\n]+/).filter((s) => s.trim().length > 0);
  const questionCount = (text.match(/\?/g) || []).length;
  // If more than half the sentences are questions, it's primarily questions
  return sentences.length > 0 && questionCount / sentences.length > 0.5;
}

/**
 * Auto-create a job from a draft when confidence is high enough.
 * Called from the Gmail poll flow after email classification.
 */
export async function autoCreateJobFromDraft(
  draftId: string,
  organizationId: string,
): Promise<{
  success: boolean;
  jobId?: string;
  jobNumber?: string;
  action: "auto_created" | "needs_review" | "low_confidence";
  confidence: number;
  error?: string;
}> {
  const supabase = await createClient();

  // 1. Fetch the draft
  const { data: draft } = await (supabase.from as any)("work_order_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (!draft) {
    return {
      success: false,
      action: "needs_review",
      confidence: 0,
      error: "Draft not found",
    };
  }

  // 2. Safety: never auto-create if content is primarily questions
  const rawContent = (draft as any).raw_content || "";
  const description = (draft as any).description || "";
  if (isPrimarilyQuestions(rawContent) || isPrimarilyQuestions(description)) {
    await (supabase.from as any)("work_order_drafts")
      .update({
        extraction_confidence: 0,
        status: "needs_review",
      })
      .eq("id", draftId);

    return {
      success: true,
      action: "needs_review",
      confidence: 0,
    };
  }

  // 3. Check if sender is known contact
  const senderEmail =
    (draft as any).sender_email || (draft as any).source || "";
  let senderIsKnown = false;
  let senderIsTrusted = false;

  if (senderEmail) {
    const { data: senderRule } = await (supabase.from as any)(
      "email_sender_rules",
    )
      .select("id, trusted_sender")
      .eq("organization_id", organizationId)
      .ilike("email_pattern", `%${senderEmail.split("@")[1] || senderEmail}%`)
      .limit(1)
      .maybeSingle();

    if (senderRule) {
      senderIsKnown = true;
      senderIsTrusted = senderRule.trusted_sender === true;
    }

    // Also check contacts table
    if (!senderIsKnown) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .ilike("email", `%${senderEmail}%`)
        .limit(1)
        .maybeSingle();
      if (contact) senderIsKnown = true;
    }
  }

  // 4. Check if property address matches existing property
  const address = (draft as any).property_address_or_unit || "";
  let addressMatchesProperty = false;
  if (address && address.length > 5) {
    const { data: prop } = await (supabase.from as any)("properties")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("address", `%${address}%`)
      .limit(1)
      .maybeSingle();
    if (prop) addressMatchesProperty = true;
  }

  // 5. Compute confidence
  const confidence = computeConfidence({
    client_name: (draft as any).client_name,
    property_address_or_unit: (draft as any).property_address_or_unit,
    trade_type: (draft as any).trade_type,
    description: (draft as any).description,
    sender_email: senderEmail,
    sender_is_known: senderIsKnown || senderIsTrusted,
    address_matches_property: addressMatchesProperty,
  });

  // Add trusted sender bonus
  const finalConfidence = senderIsTrusted
    ? Math.min(100, confidence + 30)
    : confidence;

  // 6. Store confidence on draft
  await (supabase.from as any)("work_order_drafts")
    .update({ extraction_confidence: finalConfidence })
    .eq("id", draftId);

  // 7. Check duplicate jobs (same property, same trade, last 7 days)
  if (address) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tradeType = (draft as any).trade_type || "";

    const { data: dupes } = await supabase
      .from("jobs")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("property_address", `%${address}%`)
      .gte("created_at", sevenDaysAgo.toISOString())
      .limit(1);

    if (dupes?.length) {
      // Check if trade type is similar
      const { data: dupeTrade } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("id", dupes[0].id)
        .single();

      if (
        dupeTrade &&
        tradeType &&
        (dupeTrade as any).title?.toLowerCase().includes(tradeType.toLowerCase())
      ) {
        await (supabase.from as any)("work_order_drafts")
          .update({ status: "needs_review" })
          .eq("id", draftId);

        return {
          success: true,
          action: "needs_review",
          confidence: finalConfidence,
        };
      }
    }
  }

  // 8. Decision: auto-create or needs_review
  if (finalConfidence >= 85 && senderIsKnown) {
    // AUTO-CREATE
    const result = await convertDraftToJob(draftId, {
      client_name: (draft as any).client_name || undefined,
      property_address: (draft as any).property_address_or_unit || undefined,
      description: (draft as any).description || undefined,
      trade_type: (draft as any).trade_type || undefined,
    });

    if (result.success && result.jobId) {
      // Mark as auto-converted
      await (supabase.from as any)("work_order_drafts")
        .update({
          status: "auto_converted",
          auto_converted: true,
        })
        .eq("id", draftId);

      // Log auto-creation event
      await logJobEvent(result.jobId, "auto_created_from_email", {
        confidence: finalConfidence,
        sender: senderEmail,
        draftId,
        trusted_sender: senderIsTrusted,
      });

      // Push notification to Frank
      await pushNotification({
        organizationId,
        type: "auto_job_created",
        title: `New job auto-created from ${senderIsKnown ? "known sender" : "email"}`,
        body: `${address || "Unknown address"} — ${(draft as any).trade_type || "General"}`,
        metadata: {
          job_id: result.jobId,
          job_number: result.jobNumber,
          confidence: finalConfidence,
          sender: senderEmail,
          draft_id: draftId,
        },
      });

      // Increment sender's converted_job_count
      if (senderEmail) {
        await (supabase.from as any)("email_sender_rules")
          .update({
            converted_job_count: (supabase as any).rpc
              ? undefined
              : undefined,
          })
          .eq("organization_id", organizationId);

        // Use raw SQL increment via RPC or manual update
        const { data: rule } = await (supabase.from as any)(
          "email_sender_rules",
        )
          .select("id, converted_job_count")
          .eq("organization_id", organizationId)
          .ilike(
            "email_pattern",
            `%${senderEmail.split("@")[1] || senderEmail}%`,
          )
          .limit(1)
          .maybeSingle();

        if (rule) {
          const newCount = ((rule as any).converted_job_count || 0) + 1;
          await (supabase.from as any)("email_sender_rules")
            .update({
              converted_job_count: newCount,
              // Auto-trust after 5+ conversions
              trusted_sender: newCount >= 5 ? true : (rule as any).trusted_sender,
            })
            .eq("id", rule.id);
        }
      }

      return {
        success: true,
        jobId: result.jobId,
        jobNumber: result.jobNumber,
        action: "auto_created",
        confidence: finalConfidence,
      };
    }

    return {
      success: false,
      action: "needs_review",
      confidence: finalConfidence,
      error: result.error,
    };
  }

  // Medium confidence: needs_review
  if (finalConfidence >= 60) {
    await (supabase.from as any)("work_order_drafts")
      .update({ status: "needs_review" })
      .eq("id", draftId);

    return {
      success: true,
      action: "needs_review",
      confidence: finalConfidence,
    };
  }

  // Low confidence: needs_review with warning
  await (supabase.from as any)("work_order_drafts")
    .update({ status: "needs_review" })
    .eq("id", draftId);

  return {
    success: true,
    action: "low_confidence",
    confidence: finalConfidence,
  };
}

/**
 * Reduce sender trust score when Frank deletes an auto-created job within 24 hours.
 * Called from job deletion flow.
 */
export async function handleAutoJobDeletion(
  jobId: string,
  organizationId: string,
): Promise<void> {
  const supabase = await createClient();

  // Check if this job was auto-created
  const { data: events } = await supabase
    .from("job_events")
    .select("metadata")
    .eq("job_id", jobId)
    .eq("event_type", "auto_created_from_email")
    .limit(1);

  if (!events?.length) return;

  const metadata = (events[0] as any).metadata;
  const sender = metadata?.sender;
  if (!sender) return;

  // Check if deleted within 24 hours of creation
  const { data: job } = await supabase
    .from("jobs")
    .select("created_at")
    .eq("id", jobId)
    .single();

  if (!job) return;
  const hoursElapsed =
    (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60);
  if (hoursElapsed > 24) return;

  // Reduce trust: decrement converted_job_count
  const { data: rule } = await (supabase.from as any)("email_sender_rules")
    .select("id, converted_job_count, trusted_sender")
    .eq("organization_id", organizationId)
    .ilike("email_pattern", `%${sender.split("@")[1] || sender}%`)
    .limit(1)
    .maybeSingle();

  if (rule) {
    const newCount = Math.max(0, ((rule as any).converted_job_count || 0) - 1);
    await (supabase.from as any)("email_sender_rules")
      .update({
        converted_job_count: newCount,
        trusted_sender: newCount < 5 ? false : (rule as any).trusted_sender,
      })
      .eq("id", rule.id);
  }
}

/**
 * Toggle trusted_sender flag for an email sender rule.
 */
export async function toggleTrustedSender(
  ruleId: string,
  trusted: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await (supabase.from as any)("email_sender_rules")
    .update({ trusted_sender: trusted })
    .eq("id", ruleId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/inbox");
  revalidatePath("/ops/settings");
  return { success: true };
}
