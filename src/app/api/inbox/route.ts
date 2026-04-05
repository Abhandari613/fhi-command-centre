import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/inbox
 * Returns email thread metadata from Supabase (fast, no Gmail API call).
 * Thread detail view fetches full content live from Gmail.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();

    // Get the org (single-tenant for now)
    const { data: tokenRow } = await supabase
      .from("gcal_tokens")
      .select("user_id, organization_id")
      .limit(1)
      .single();

    let organizationId = tokenRow?.organization_id;
    if (!organizationId && tokenRow?.user_id) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", tokenRow.user_id)
        .single();
      organizationId = profile?.organization_id;
    }

    if (!organizationId) {
      return NextResponse.json({ threads: [] });
    }

    const { data: threads, error } = await supabase
      .from("email_threads")
      .select("*")
      .eq("organization_id", organizationId)
      .order("last_message_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Inbox fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ threads: threads || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Inbox error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
