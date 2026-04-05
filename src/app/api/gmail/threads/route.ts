import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRecentThreads } from "@/lib/services/gmail";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/gmail/threads?limit=25&after=2024/01/01
 * Returns recent email threads (inbox + sent) with all messages and attachment metadata.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const after = searchParams.get("after") || undefined;

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

    const threads = await fetchRecentThreads(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
      },
      limit,
      after,
    );

    return NextResponse.json({ threads, count: threads.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Threads fetch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
