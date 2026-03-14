import { NextResponse } from "next/server";
import { AIAgent } from "@/lib/clients/fhi/services/ai-agent";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }
    const orgId = profile.organization_id;

    const formData = await req.formData();
    const audioFile = formData.get("file") as Blob | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    const agent = new AIAgent();
    const transcriptText = await agent.transcribeAudio(buffer);
    const extractedData = await agent.parseWorkOrderDraft(transcriptText);

    // Insert into drafts
    const { data: insertData, error: insertError } = await (
      supabase.from as any
    )("work_order_drafts")
      .insert({
        organization_id: orgId,
        source: "voice",
        raw_content: transcriptText,
        extracted_data: extractedData,
        status: "needs_review",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase Insert Error", insertError);
      return NextResponse.json(
        { error: "Failed to save draft" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      draft: insertData,
    });
  } catch (error: any) {
    console.error("Voice WO Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
