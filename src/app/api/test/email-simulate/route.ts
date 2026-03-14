import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AIAgent } from "@/lib/clients/fhi/services/ai-agent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { from, subject, text, attachments } = body;

    if (!text && !subject) {
      return NextResponse.json(
        { error: "Subject or text content required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Missing Supabase admin keys" },
        { status: 500 },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Resolve organization — use sender email or fallback
    const senderEmail = typeof from === "object" ? from.address : from || "";

    let orgId: string | null = null;

    if (senderEmail) {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("organization_id")
        .eq("email", senderEmail)
        .single();
      orgId = profile?.organization_id ?? null;
    }

    if (!orgId) {
      const { data: fallbackOrg } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .limit(1)
        .single();
      orgId = fallbackOrg?.id ?? null;
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    // Parse with AI agent (same as real webhook)
    const emailContent = [subject, text].filter(Boolean).join("\n\n");
    const agent = new AIAgent();
    const extractedData = await agent.parseWorkOrderDraft(emailContent);

    // Insert draft
    const { data: draft, error: insertError } = await supabaseAdmin
      .from("work_order_drafts")
      .insert({
        organization_id: orgId,
        source: "email",
        raw_content: emailContent,
        extracted_data: extractedData,
        status: "needs_review",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save draft: " + insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      draft,
      extractedData,
      simulation: true,
    });
  } catch (error: any) {
    console.error("Email simulation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
