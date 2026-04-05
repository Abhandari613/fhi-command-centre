import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchThread } from "@/lib/services/gmail";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/gmail/threads/[threadId]
 * Returns a single thread with all messages and attachment metadata.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;

    const supabase = getAdminClient();

    const { data: tokenRow } = await supabase
      .from("gcal_tokens")
      .select("access_token, refresh_token")
      .limit(1)
      .single();

    if (!tokenRow?.access_token || !tokenRow?.refresh_token) {
      return NextResponse.json(
        { error: "Google not connected" },
        { status: 401 },
      );
    }

    const thread = await fetchThread(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
      },
      threadId,
    );

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(thread);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Thread fetch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
