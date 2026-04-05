import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRecentThreads } from "@/lib/services/gmail";
import { pushNotification } from "@/lib/services/notifications";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const RUSH_KEYWORDS = [
  "rush",
  "asap",
  "urgent",
  "emergency",
  "immediately",
  "right away",
];

// GET handler for Vercel cron
export async function GET(req: NextRequest) {
  // Verify cron secret in production
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return pollGmail();
}

// POST handler for manual triggers
export async function POST() {
  return pollGmail();
}

async function pollGmail() {
  try {
    const supabase = getAdminClient();

    // Get stored Google tokens (single-tenant)
    const { data: tokenRow } = await supabase
      .from("gcal_tokens")
      .select("*")
      .limit(1)
      .single();

    if (!tokenRow?.access_token || !tokenRow?.refresh_token) {
      return NextResponse.json(
        { error: "Google not connected. Please authorize Gmail first." },
        { status: 401 },
      );
    }

    // Determine the org
    let organizationId: string;
    if (tokenRow.organization_id) {
      organizationId = tokenRow.organization_id;
    } else {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", tokenRow.user_id)
        .single();
      organizationId = profile?.organization_id;
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const tokens = {
      access_token: tokenRow.access_token,
      refresh_token: tokenRow.refresh_token,
    };

    // Fetch recent threads (inbox + sent)
    const threads = await fetchRecentThreads(tokens, 100);

    if (!threads.length) {
      return NextResponse.json({ processed: 0, message: "No new threads" });
    }

    // Check which threads we already have
    const gmailThreadIds = threads.map((t) => t.id);
    const { data: existingThreads } = await supabase
      .from("email_threads")
      .select("gmail_thread_id, message_count")
      .eq("organization_id", organizationId)
      .in("gmail_thread_id", gmailThreadIds);

    const existingMap = new Map(
      (existingThreads || []).map((r) => [r.gmail_thread_id, r.message_count]),
    );

    const results: Array<{
      threadId: string;
      subject?: string;
      status: "new" | "updated" | "unchanged";
      classification?: string;
      jobId?: string | null;
    }> = [];

    for (const thread of threads) {
      const existingCount = existingMap.get(thread.id);
      const isNew = existingCount === undefined;
      const hasNewMessages =
        existingCount !== undefined &&
        thread.messages.length > existingCount;

      if (!isNew && !hasNewMessages) {
        results.push({
          threadId: thread.id,
          subject: thread.subject,
          status: "unchanged",
        });
        continue;
      }

      try {
        // Pick the best message for classification: prefer the latest inbound
        // message (not from the org's own Gmail) since outbound messages from
        // Frank would get classified as irrelevant.
        const ownEmail = tokenRow.email || "";
        const inboundMsgs = thread.messages.filter(
          (m) => !m.from.includes(ownEmail) && !m.from.includes("aguirref04"),
        );
        const latestMsg =
          inboundMsgs.length > 0
            ? inboundMsgs[inboundMsgs.length - 1]
            : thread.messages[thread.messages.length - 1];
        const hasAttachments = thread.messages.some(
          (m) => m.attachments.length > 0,
        );

        let classification: string = "irrelevant";
        let jobId: string | null = null;

        // Only classify new threads (not updates to existing ones we already classified)
        if (isNew) {
          // Classify with AI
          const classifyRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/classify-email`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                from: latestMsg.from,
                subject: thread.subject,
                body: latestMsg.body,
              }),
            },
          );

          const classResult = await classifyRes.json();
          classification = classResult.classification || "irrelevant";

          // Handle based on classification
          if (
            classification === "new_work" ||
            classification === "quote_request"
          ) {
            const urgency =
              classResult.urgency === "rush" ||
              RUSH_KEYWORDS.some((kw) =>
                `${thread.subject} ${latestMsg.body}`
                  .toLowerCase()
                  .includes(kw),
              )
                ? "rush"
                : "standard";

            const { data: job } = await supabase
              .from("jobs")
              .insert({
                organization_id: organizationId,
                title: thread.subject || "Untitled Job",
                description:
                  classResult.summary || latestMsg.body?.substring(0, 500),
                status: "incoming",
                urgency,
                property_address: classResult.property_address,
                address: classResult.property_address,
                source_email_subject: thread.subject,
                source_email_body: latestMsg.body?.substring(0, 5000),
              })
              .select("id, job_number")
              .single();

            if (job) {
              jobId = job.id;
              await pushNotification({
                organizationId,
                type: "new_job",
                title:
                  classification === "quote_request"
                    ? `Quote request from ${classResult.client_name || latestMsg.from}`
                    : `New work from ${classResult.client_name || latestMsg.from}`,
                body: classResult.summary,
                metadata: {
                  job_id: job.id,
                  job_number: (job as Record<string, unknown>).job_number,
                  from: latestMsg.from,
                  classification,
                  urgency,
                },
              });
            }
          } else if (classification === "job_update") {
            if (
              classResult.existing_job_hint ||
              classResult.property_address
            ) {
              const searchTerm =
                classResult.property_address ||
                classResult.existing_job_hint;
              const { data: existingJobs } = await supabase
                .from("jobs")
                .select("id, job_number")
                .eq("organization_id", organizationId)
                .or(
                  `property_address.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`,
                )
                .limit(1);

              if (existingJobs?.length) {
                jobId = existingJobs[0].id;
                await pushNotification({
                  organizationId,
                  type: "email_detected",
                  title: `Update for ${(existingJobs[0] as Record<string, unknown>).job_number}`,
                  body: classResult.summary,
                  metadata: {
                    job_id: existingJobs[0].id,
                    job_number: (existingJobs[0] as Record<string, unknown>)
                      .job_number,
                    from: latestMsg.from,
                  },
                });
              }
            }
          }
        }

        // Upsert the thread metadata
        await supabase.from("email_threads").upsert(
          {
            organization_id: organizationId,
            gmail_thread_id: thread.id,
            subject: thread.subject,
            snippet: thread.snippet,
            last_message_date: new Date(
              thread.lastMessageDate,
            ).toISOString(),
            participants: thread.participants,
            classification: isNew ? classification : undefined,
            job_id: jobId || undefined,
            message_count: thread.messages.length,
            has_attachments: hasAttachments,
            is_read: !isNew, // New threads start unread
          },
          { onConflict: "organization_id,gmail_thread_id" },
        );

        // Also log to email_scan_log for backwards compat
        if (isNew) {
          await supabase.from("email_scan_log").insert({
            organization_id: organizationId,
            gmail_message_id: latestMsg.id,
            from_address: latestMsg.from,
            subject: thread.subject,
            classification,
            job_id: jobId,
          });
        }

        results.push({
          threadId: thread.id,
          subject: thread.subject,
          status: isNew ? "new" : "updated",
          classification: isNew ? classification : undefined,
          jobId,
        });
      } catch (threadErr: unknown) {
        const message =
          threadErr instanceof Error ? threadErr.message : "Unknown error";
        console.error(`Failed to process thread ${thread.id}:`, threadErr);
        results.push({
          threadId: thread.id,
          subject: thread.subject,
          status: "new",
          classification: `error: ${message}`,
        });
      }
    }

    const newCount = results.filter((r) => r.status === "new").length;
    const updatedCount = results.filter((r) => r.status === "updated").length;

    return NextResponse.json({
      processed: results.length,
      new: newCount,
      updated: updatedCount,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Gmail poll error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
