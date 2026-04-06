"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type ReceiptCaptureResult = {
  success: boolean;
  receiptId?: string;
  error?: string;
};

/**
 * Quick-capture a receipt: upload image, create pending record, fire OCR in background.
 * Designed for the FAB flow — zero friction, instant return.
 */
export async function quickCaptureReceipt(input: {
  fileBase64: string;
  fileName: string;
}): Promise<ReceiptCaptureResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id)
      return { success: false, error: "No organization" };

    const orgId = profile.organization_id;

    // 1. Compress and upload to storage
    const base64Data = input.fileBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const filePath = `${orgId}/${user.id}/${Date.now()}_${input.fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: "Upload failed: " + uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(filePath);

    // 2. Create pending receipt record
    const { data: receipt, error: insertError } = await supabase
      .from("receipts")
      .insert({
        organization_id: orgId,
        merchant: "Processing...",
        date: new Date().toISOString(),
        total: 0,
        status: "processing",
        uploaded_by: user.id,
        image_url: publicUrl,
        sync_status: "synced",
      } as any)
      .select("id")
      .single();

    if (insertError || !receipt) {
      return {
        success: false,
        error: "Failed to create receipt: " + insertError?.message,
      };
    }

    // 3. Fire OCR in background (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/receipts/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiptId: receipt.id,
        imageBase64: base64Data,
        orgId,
      }),
    }).catch((err) => console.error("OCR trigger failed:", err));

    revalidatePath("/ops/receipts");
    return { success: true, receiptId: receipt.id };
  } catch (error: any) {
    console.error("Quick capture error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all receipts needing review (pending_review, needs_review, auto_matched).
 */
export async function getReceiptReviewQueue() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return [];

  const { data } = await supabase
    .from("receipts")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .in("status", [
      "pending_review",
      "needs_review",
      "auto_matched",
      "processing",
    ])
    .order("created_at", { ascending: false });

  return data || [];
}

/**
 * Confirm an auto-matched receipt (swipe right).
 * AUTOMATION 8: Learns from confirmations to auto-categorize future receipts.
 */
export async function confirmReceiptMatch(
  receiptId: string,
  jobId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get receipt details before updating
  const { data: receipt } = await (supabase.from as any)("receipts")
    .select("merchant, category_id, organization_id")
    .eq("id", receiptId)
    .single();

  const { error } = await supabase
    .from("receipts")
    .update({
      status: "matched",
      job_id: jobId,
    } as any)
    .eq("id", receiptId);

  if (error) return { success: false, error: error.message };

  // AUTOMATION 8: Learn from this confirmation
  if (receipt?.merchant && (receipt as any).category_id && receipt.organization_id) {
    try {
      const merchant = (receipt as any).merchant as string;
      const categoryId = (receipt as any).category_id as string;
      const orgId = receipt.organization_id;

      // Normalize merchant name (strip store numbers, etc.)
      const normalizedMerchant = merchant
        .replace(/#\d+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (normalizedMerchant.length > 2) {
        // Check how many times this vendor→category pair has been confirmed
        const { count: confirmCount } = await supabase
          .from("receipts")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "matched")
          .ilike("merchant", `%${normalizedMerchant}%`);

        // Auto-create categorization rule after 3+ confirmations
        if (confirmCount && confirmCount >= 3) {
          // Check if rule already exists
          const { data: existingRule } = await (supabase.from as any)("finance_rules")
            .select("id")
            .eq("organization_id", orgId)
            .eq("match_type", "CONTAINS")
            .ilike("param_pattern", normalizedMerchant)
            .limit(1)
            .maybeSingle();

          if (!existingRule) {
            const { createCategorizationRule } = await import(
              "@/app/actions/finance"
            );
            await createCategorizationRule(normalizedMerchant, categoryId);
          }
        }
      }
    } catch (learnErr) {
      // Learning is non-blocking
      console.error("Receipt learning failed:", learnErr);
    }
  }

  revalidatePath("/ops/receipts");
  revalidatePath("/ops/receipts/review");
  return { success: true };
}

/**
 * Reassign a receipt to a different job.
 */
export async function reassignReceipt(
  receiptId: string,
  jobId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("receipts")
    .update({
      status: "matched",
      job_id: jobId,
      auto_match_job_id: null,
    } as any)
    .eq("id", receiptId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/receipts");
  revalidatePath("/ops/receipts/review");
  return { success: true };
}

/**
 * Confirm all auto-matched receipts in batch.
 */
export async function confirmAllAutoMatched(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, count: 0, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id)
    return { success: false, count: 0, error: "No org" };

  // Get all auto_matched receipts
  const { data: receipts } = await (supabase.from as any)("receipts")
    .select("id, auto_match_job_id")
    .eq("organization_id", profile.organization_id)
    .eq("status", "auto_matched");

  if (!receipts?.length) return { success: true, count: 0 };

  let confirmed = 0;
  for (const r of receipts) {
    if ((r as any).auto_match_job_id) {
      const { error } = await supabase
        .from("receipts")
        .update({
          status: "matched",
          job_id: (r as any).auto_match_job_id,
        } as any)
        .eq("id", r.id);
      if (!error) confirmed++;
    }
  }

  revalidatePath("/ops/receipts");
  return { success: true, count: confirmed };
}

/**
 * Check if receipt nudge should be shown.
 */
export async function getReceiptNudge(): Promise<{
  show: boolean;
  type?: string;
  count?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { show: false };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { show: false };

  // Check pending review count
  const { count: pendingCount } = await supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .in("status", ["pending_review", "needs_review", "auto_matched"]);

  if (pendingCount && pendingCount >= 5) {
    return { show: true, type: "pending_review", count: pendingCount };
  }

  // Check if no receipts in last 3 days but has active jobs
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { count: recentReceipts } = await supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .gte("created_at", threeDaysAgo.toISOString());

  if (!recentReceipts || recentReceipts === 0) {
    const { count: activeJobs } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .in("status", ["scheduled", "in_progress"]);

    if (activeJobs && activeJobs > 0) {
      return { show: true, type: "no_receipts" };
    }
  }

  return { show: false };
}
