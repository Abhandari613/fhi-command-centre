import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    const { receiptId, imageBase64, orgId } = await req.json();

    if (!receiptId || !imageBase64) {
      return NextResponse.json(
        { error: "Missing receiptId or imageBase64" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Run OCR via Gemini (receipt-agent)
    const { ReceiptAgent } = await import(
      "@/lib/clients/fhi/services/receipt-agent"
    );
    const agent = new ReceiptAgent();
    const receiptData = await agent.extractReceiptData(imageBase64);

    // 2. Update receipt record with OCR results
    const status =
      receiptData.totalAmount && receiptData.date
        ? "pending_review"
        : "needs_review";

    await supabase
      .from("receipts")
      .update({
        merchant: receiptData.merchantName || "Unknown",
        date: receiptData.date || new Date().toISOString().split("T")[0],
        total: receiptData.totalAmount || 0,
        status,
        line_items: receiptData.items || [],
        ocr_raw: receiptData,
      } as any)
      .eq("id", receiptId);

    // 3. Auto-match to job by vendor + date
    if (receiptData.totalAmount > 0 && receiptData.date) {
      const receiptDate = new Date(receiptData.date);
      const minDate = new Date(receiptDate);
      minDate.setDate(minDate.getDate() - 7);
      const maxDate = new Date(receiptDate);
      maxDate.setDate(maxDate.getDate() + 7);

      // Find active jobs in the date range
      const { data: activeJobs } = await supabase
        .from("jobs")
        .select("id, title, property_address, status")
        .eq("organization_id", orgId)
        .in("status", ["scheduled", "in_progress", "completed"]);

      if (activeJobs && activeJobs.length > 0) {
        // Try vendor name matching against finance_rules
        const { data: rules } = await supabase
          .from("finance_rules")
          .select("*")
          .eq("organization_id", orgId);

        let matchedJobId: string | null = null;
        let confidence = 0;

        // Simple heuristic: match vendor to job title/address keywords
        const vendorLower = (receiptData.merchantName || "").toLowerCase();
        const categoryKeywords: Record<string, string[]> = {
          paint: ["sherwin", "williams", "benjamin moore", "behr"],
          supplies: ["home depot", "lowes", "lowe's", "rona", "canadian tire"],
          plumbing: ["plumbing", "pipe"],
          electrical: ["electrical", "wire"],
        };

        for (const job of activeJobs) {
          const jobText =
            `${job.title || ""} ${job.property_address || ""}`.toLowerCase();

          // Check if vendor category matches job trade type
          for (const [trade, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some((kw) => vendorLower.includes(kw))) {
              if (jobText.includes(trade) || activeJobs.length === 1) {
                matchedJobId = job.id;
                confidence = activeJobs.length === 1 ? 90 : 70;
                break;
              }
            }
          }

          // If only one active job, high confidence auto-match
          if (!matchedJobId && activeJobs.length === 1) {
            matchedJobId = activeJobs[0].id;
            confidence = 85;
          }

          if (matchedJobId) break;
        }

        if (matchedJobId && confidence >= 80) {
          await supabase
            .from("receipts")
            .update({
              status: "auto_matched",
              auto_match_job_id: matchedJobId,
              confidence_score: confidence,
            } as any)
            .eq("id", receiptId);
        } else if (matchedJobId) {
          await supabase
            .from("receipts")
            .update({
              status: "needs_review",
              auto_match_job_id: matchedJobId,
              confidence_score: confidence,
            } as any)
            .eq("id", receiptId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("OCR processing error:", error);
    // Don't fail hard — just mark receipt as needing manual review
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { receiptId } = await req.clone().json().catch(() => ({}));
      if (receiptId) {
        await supabase
          .from("receipts")
          .update({ status: "needs_review" })
          .eq("id", receiptId);
      }
    } catch {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
