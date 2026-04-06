import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET handler for Vercel cron (Sunday 6 PM)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runAutoPlan();
}

// POST handler for manual triggers
export async function POST() {
  return runAutoPlan();
}

async function runAutoPlan() {
  try {
    const supabase = getAdminClient();

    // Get all organizations with unscheduled jobs
    const { data: unscheduledJobs } = await supabase
      .from("jobs")
      .select(
        "id, job_number, property_address, title, urgency, organization_id, unit_id, created_at",
      )
      .in("status", ["incoming", "approved"])
      .is("start_date", null)
      .order("created_at", { ascending: true });

    if (!unscheduledJobs?.length) {
      return NextResponse.json({
        success: true,
        message: "No unscheduled jobs",
        scheduled: 0,
      });
    }

    // Group by org
    const jobsByOrg: Record<string, typeof unscheduledJobs> = {};
    for (const job of unscheduledJobs) {
      const orgId = job.organization_id;
      if (!jobsByOrg[orgId]) jobsByOrg[orgId] = [];
      jobsByOrg[orgId].push(job);
    }

    let totalScheduled = 0;

    for (const [orgId, jobs] of Object.entries(jobsByOrg)) {
      // Get existing scheduled jobs for the upcoming week
      const monday = new Date();
      monday.setDate(monday.getDate() + 1); // Tomorrow (Monday, since cron runs Sunday)
      const friday = new Date(monday);
      friday.setDate(friday.getDate() + 4);

      const { data: existingScheduled } = await supabase
        .from("jobs")
        .select("id, start_date, end_date")
        .eq("organization_id", orgId)
        .in("status", ["scheduled", "in_progress"])
        .gte("start_date", monday.toISOString().split("T")[0])
        .lte("start_date", friday.toISOString().split("T")[0]);

      // Build occupied dates
      const occupiedDates = new Set<string>();
      for (const sj of existingScheduled || []) {
        if (sj.start_date) {
          const start = new Date(sj.start_date);
          const end = sj.end_date ? new Date(sj.end_date) : start;
          const current = new Date(start);
          while (current <= end) {
            occupiedDates.add(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      }

      // Sort jobs by urgency then creation date
      const urgencyOrder: Record<string, number> = {
        rush: 0,
        standard: 1,
      };
      const sortedJobs = [...jobs].sort((a, b) => {
        const aUrg = urgencyOrder[(a as any).urgency || "standard"] ?? 1;
        const bUrg = urgencyOrder[(b as any).urgency || "standard"] ?? 1;
        if (aUrg !== bUrg) return aUrg - bUrg;
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      // Assign jobs to available dates
      const scheduledThisWeek: Array<{ job: any; date: string }> = [];
      const current = new Date(monday);

      for (const job of sortedJobs) {
        // Find next available weekday
        while (current <= friday) {
          const dateStr = current.toISOString().split("T")[0];
          const dayOfWeek = current.getDay();

          if (
            dayOfWeek !== 0 &&
            dayOfWeek !== 6 &&
            !occupiedDates.has(dateStr)
          ) {
            // Schedule this job on this date
            await supabase
              .from("jobs")
              .update({
                start_date: dateStr,
                end_date: dateStr,
                status: "scheduled",
              } as any)
              .eq("id", job.id);

            occupiedDates.add(dateStr);
            scheduledThisWeek.push({ job, date: dateStr });
            totalScheduled++;

            // Move to next day
            current.setDate(current.getDate() + 1);
            break;
          }
          current.setDate(current.getDate() + 1);
        }
      }

      if (scheduledThisWeek.length > 0) {
        await pushNotification({
          organizationId: orgId,
          type: "weekly_plan_ready",
          title: `Your week is planned — ${scheduledThisWeek.length} job${scheduledThisWeek.length > 1 ? "s" : ""} scheduled`,
          body: `Review your calendar for ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${friday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          metadata: {
            jobs_scheduled: scheduledThisWeek.map((s) => ({
              job_id: s.job.id,
              job_number: (s.job as any).job_number,
              date: s.date,
            })),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      scheduled: totalScheduled,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Auto-plan error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
