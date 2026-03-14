import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { exchangeCode } from "@/lib/services/gcal";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/ops/schedule?error=no_code", req.url)
    );
  }

  try {
    const tokens = await exchangeCode(code);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", req.url)
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.redirect(
        new URL("/ops/schedule?error=no_org", req.url)
      );
    }

    // Upsert tokens (cast to any since gcal_tokens not in generated types yet)
    const db = supabase as any;
    await db.from("gcal_tokens").upsert(
      {
        organization_id: profile.organization_id,
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
        calendar_id: "primary",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id" }
    );

    return NextResponse.redirect(
      new URL("/ops/schedule?gcal=connected", req.url)
    );
  } catch (error: any) {
    console.error("GCal OAuth error:", error);
    return NextResponse.redirect(
      new URL("/ops/schedule?error=oauth_failed", req.url)
    );
  }
}
