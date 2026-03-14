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
    const { jobId } = await req.json();
    if (!jobId)
      return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const supabase = getAdminClient();

    // Get job details
    const { data: job } = await supabase
      .from("jobs")
      .select(
        "id, job_number, property_address, address, organization_id, due_date",
      )
      .eq("id", jobId)
      .single();

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Get tasks to understand what trades are needed
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("description")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    const taskDescriptions = (tasks || [])
      .map((t: any) => t.description)
      .join(", ");

    // Get available subs for this org
    const { data: subs } = await supabase
      .from("subcontractors")
      .select("id, name, email, specialty, status")
      .eq("organization_id", (job as any).organization_id)
      .eq("status", "active");

    if (!subs?.length) {
      return NextResponse.json({
        suggestions: [],
        message: "No active subcontractors found",
      });
    }

    // Check which subs are already assigned to jobs on the same date
    const { data: existingAssignments } = await supabase
      .from("job_assignments")
      .select("subcontractor_id, job:jobs!inner(due_date)")
      .eq("job.due_date", (job as any).due_date);

    const busySubIds = new Set(
      (existingAssignments || []).map((a: any) => a.subcontractor_id),
    );

    // Score each sub based on specialty match and availability
    const suggestions = (subs as any[])
      .map((sub) => {
        const isBusy = busySubIds.has(sub.id);
        const specialtyMatch = sub.specialty
          ? taskDescriptions.toLowerCase().includes(sub.specialty.toLowerCase())
          : false;

        return {
          id: sub.id,
          name: sub.name,
          email: sub.email,
          specialty: sub.specialty,
          available: !isBusy,
          specialtyMatch,
          score: (specialtyMatch ? 2 : 0) + (!isBusy ? 1 : 0),
        };
      })
      .sort((a, b) => b.score - a.score);

    // Auto-dispatch the best available sub if there's a clear match
    const bestMatch = suggestions.find((s) => s.available && s.specialtyMatch);

    if (bestMatch) {
      // Create assignment
      const { data: token } = await supabase
        .from("sub_portal_tokens")
        .insert({
          subcontractor_id: bestMatch.id,
          job_id: jobId,
          token: crypto.randomUUID(),
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("token")
        .single();

      await supabase.from("job_assignments").insert({
        job_id: jobId,
        subcontractor_id: bestMatch.id,
        organization_id: (job as any).organization_id,
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const magicLink = `${appUrl}/s/${(token as any)?.token}`;

      // Send dispatch email
      if (process.env.RESEND_API_KEY && bestMatch.email) {
        try {
          await fetch(`${appUrl}/api/sub-portal/dispatch-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subName: bestMatch.name,
              subEmail: bestMatch.email,
              jobNumber: (job as any).job_number,
              address: (job as any).property_address || (job as any).address,
              magicLink,
            }),
          });
        } catch (e) {
          console.error("Auto-dispatch email failed:", e);
        }
      }

      // Notify Frank
      await pushNotification({
        organizationId: (job as any).organization_id,
        type: "schedule_suggestion",
        title: `Auto-dispatched ${bestMatch.name} to ${(job as any).job_number}`,
        body: `${bestMatch.name} (${bestMatch.specialty}) assigned and notified.`,
        metadata: {
          job_id: jobId,
          job_number: (job as any).job_number,
          sub_id: bestMatch.id,
          sub_name: bestMatch.name,
        },
      });
    }

    return NextResponse.json({
      suggestions,
      autoDispatched: bestMatch
        ? { subId: bestMatch.id, subName: bestMatch.name }
        : null,
    });
  } catch (err: any) {
    console.error("Auto-dispatch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
