import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAttachment } from "@/lib/services/gmail";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/gmail/attachment?messageId=xxx&attachmentId=yyy
 * Fetches an attachment on-demand from Gmail and streams it back.
 * Photos/files are never stored — always fetched live.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");
    const attachmentId = searchParams.get("attachmentId");
    const mimeType = searchParams.get("mimeType") || "application/octet-stream";
    const filename = searchParams.get("filename") || "attachment";

    if (!messageId || !attachmentId) {
      return NextResponse.json(
        { error: "messageId and attachmentId are required" },
        { status: 400 },
      );
    }

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

    const result = await fetchAttachment(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
      },
      messageId,
      attachmentId,
    );

    if (!result) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Convert base64url to Buffer
    const buffer = Buffer.from(result.data, "base64url");

    const isImage = mimeType.startsWith("image/");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": isImage
          ? "inline"
          : `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Attachment fetch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
