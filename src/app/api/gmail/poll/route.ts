import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRecentEmails } from "@/lib/services/gmail";
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

export async function POST() {
  try {
    const supabase = getAdminClient();

    // Get stored Google tokens (use first org for now — single-tenant)
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

    // Determine the org — get from user profile if needed
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

    // Fetch recent unread emails
    const emails = await fetchRecentEmails(tokens, 15);

    if (!emails.length) {
      return NextResponse.json({ processed: 0, message: "No new emails" });
    }

    // Check which ones we already processed
    const gmailIds = emails.map((e) => e.id);
    const { data: alreadyProcessed } = await supabase
      .from("email_scan_log")
      .select("gmail_message_id")
      .in("gmail_message_id", gmailIds);

    const processedSet = new Set(
      (alreadyProcessed || []).map(
        (r: { gmail_message_id: string }) => r.gmail_message_id,
      ),
    );
    const newEmails = emails.filter((e) => !processedSet.has(e.id));

    if (!newEmails.length) {
      return NextResponse.json({
        processed: 0,
        message: "All emails already processed",
      });
    }

    const results: Array<{
      emailId: string;
      from?: string;
      subject?: string;
      classification?: string;
      jobId?: string | null;
      error?: string;
    }> = [];

    for (const email of newEmails) {
      try {
        // Classify with AI
        const classifyRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/classify-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from: email.from,
              subject: email.subject,
              body: email.body,
            }),
          },
        );

        const classification = await classifyRes.json();

        let jobId: string | null = null;

        // Handle based on classification
        if (
          classification.classification === "new_work" ||
          classification.classification === "quote_request"
        ) {
          // Auto-create a job
          const urgency =
            classification.urgency === "rush" ||
            RUSH_KEYWORDS.some((kw) =>
              `${email.subject} ${email.body}`.toLowerCase().includes(kw),
            )
              ? "rush"
              : "standard";

          const isQuoteRequest =
            classification.classification === "quote_request";

          const { data: job, error: jobError } = await supabase
            .from("jobs")
            .insert({
              organization_id: organizationId,
              title: email.subject || "Untitled Job",
              description:
                classification.summary || email.body?.substring(0, 500),
              status: "incoming",
              urgency,
              property_address: classification.property_address,
              address: classification.property_address,
              source_email_subject: email.subject,
              source_email_body: email.body?.substring(0, 5000),
            })
            .select("id, job_number")
            .single();

          if (!jobError && job) {
            jobId = job.id;

            // Notify Frank
            await pushNotification({
              organizationId,
              type: "new_job",
              title: isQuoteRequest
                ? `Quote request from ${classification.client_name || email.from}`
                : `New work from ${classification.client_name || email.from}`,
              body: classification.summary,
              metadata: {
                job_id: job.id,
                job_number: (job as Record<string, unknown>).job_number,
                from: email.from,
                classification: classification.classification,
                urgency,
              },
            });
          }
        } else if (classification.classification === "job_update") {
          // Try to find existing job by address or hint
          if (
            classification.existing_job_hint ||
            classification.property_address
          ) {
            const searchTerm =
              classification.property_address ||
              classification.existing_job_hint;
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
                body: classification.summary,
                metadata: {
                  job_id: existingJobs[0].id,
                  job_number: (existingJobs[0] as Record<string, unknown>)
                    .job_number,
                  from: email.from,
                },
              });
            }
          }
        }
        // irrelevant — skip, just log

        // Log to email_scan_log
        await supabase.from("email_scan_log").insert({
          organization_id: organizationId,
          gmail_message_id: email.id,
          from_address: email.from,
          subject: email.subject,
          classification: classification.classification,
          job_id: jobId,
        });

        results.push({
          emailId: email.id,
          from: email.from,
          subject: email.subject,
          classification: classification.classification,
          jobId,
        });
      } catch (emailErr: unknown) {
        const message =
          emailErr instanceof Error ? emailErr.message : "Unknown error";
        console.error(`Failed to process email ${email.id}:`, emailErr);
        results.push({
          emailId: email.id,
          error: message,
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Gmail poll error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
