import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { jobId, subName, photoCount } = await req.json();
    if (!jobId)
      return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const supabase = getAdminClient();

    const { data: job } = await supabase
      .from("jobs")
      .select("id, job_number, property_address, address, organization_id")
      .eq("id", jobId)
      .single();

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    await pushNotification({
      organizationId: (job as any).organization_id,
      type: "sub_photo",
      title: `${subName || "Sub"} uploaded ${photoCount || ""} photo${(photoCount || 0) !== 1 ? "s" : ""} for ${(job as any).job_number}`,
      body: (job as any).property_address || (job as any).address || "",
      metadata: {
        job_id: jobId,
        job_number: (job as any).job_number,
        sub_name: subName,
        photo_count: photoCount,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Notify upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
