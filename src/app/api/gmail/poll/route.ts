import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRecentThreads, sendGmailMessage } from "@/lib/services/gmail";
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

    // Fetch recent threads (inbox + sent) — limit to last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = `${thirtyDaysAgo.getFullYear()}/${String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0")}/${String(thirtyDaysAgo.getDate()).padStart(2, "0")}`;
    const threads = await fetchRecentThreads(tokens, 100, afterDate);

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

            // AUTOMATION 1: Create draft for confidence scoring + potential auto-creation
            const { data: draft } = await supabase
              .from("work_order_drafts")
              .insert({
                organization_id: organizationId,
                client_name: classResult.client_name || null,
                property_address_or_unit: classResult.property_address || null,
                trade_type: classResult.trade_type || null,
                description: classResult.summary || latestMsg.body?.substring(0, 500),
                raw_content: latestMsg.body?.substring(0, 5000),
                source: latestMsg.from,
                status: "pending",
              } as any)
              .select("id")
              .single();

            if (draft) {
              try {
                const { autoCreateJobFromDraft } = await import("@/app/actions/auto-job-actions");
                const autoResult = await autoCreateJobFromDraft(draft.id, organizationId);

                if (autoResult.action === "auto_created" && autoResult.jobId) {
                  jobId = autoResult.jobId;
                } else {
                  // Confidence too low for auto-create — create job normally
                  const { data: job } = await supabase
                    .from("jobs")
                    .insert({
                      organization_id: organizationId,
                      title: thread.subject || "Untitled Job",
                      description: classResult.summary || latestMsg.body?.substring(0, 500),
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
                    await supabase
                      .from("work_order_drafts")
                      .update({ converted_job_id: job.id, status: "converted" } as any)
                      .eq("id", draft.id);

                    await pushNotification({
                      organizationId,
                      type: "new_job",
                      title: classification === "quote_request"
                        ? `Quote request from ${classResult.client_name || latestMsg.from}`
                        : `New work from ${classResult.client_name || latestMsg.from}`,
                      body: `${classResult.summary || ""}${autoResult.confidence > 0 ? ` (confidence: ${autoResult.confidence}%)` : ""}`,
                      metadata: {
                        job_id: job.id,
                        job_number: (job as Record<string, unknown>).job_number,
                        from: latestMsg.from,
                        classification,
                        urgency,
                        confidence: autoResult.confidence,
                      },
                    });
                  }
                }
              } catch (autoErr) {
                console.error("Auto-create failed, falling back:", autoErr);
                const { data: job } = await supabase
                  .from("jobs")
                  .insert({
                    organization_id: organizationId,
                    title: thread.subject || "Untitled Job",
                    description: classResult.summary || latestMsg.body?.substring(0, 500),
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
                    title: `New work from ${classResult.client_name || latestMsg.from}`,
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
              }
            }
          } else if (classification === "payment_ready") {
            // Cheque ready for pickup — fetch outstanding invoices and notify Frank

            // 1. Get all unpaid invoices
            const { data: unpaidInvoices } = await supabase
              .from("job_invoices")
              .select("invoice_number, total, status, sent_at, job_id")
              .eq("organization_id", organizationId)
              .in("status", ["sent", "overdue"])
              .order("sent_at", { ascending: true });

            // 2. Get job details for those invoices
            const unpaidJobIds = (unpaidInvoices || []).map((inv: any) => inv.job_id).filter(Boolean);
            let jobMap: Record<string, { job_number: string; title: string; property_address: string | null }> = {};
            if (unpaidJobIds.length > 0) {
              const { data: jobs } = await supabase
                .from("jobs")
                .select("id, job_number, title, property_address")
                .in("id", unpaidJobIds);
              for (const j of (jobs || []) as any[]) {
                jobMap[j.id] = { job_number: j.job_number, title: j.title, property_address: j.property_address };
              }
            }

            // 3. Build the outstanding invoices list
            const invoiceLines = (unpaidInvoices || []).map((inv: any) => {
              const job = jobMap[inv.job_id];
              const sentDate = inv.sent_at ? new Date(inv.sent_at).toLocaleDateString("en-CA") : "—";
              const daysOut = inv.sent_at ? Math.floor((Date.now() - new Date(inv.sent_at).getTime()) / 86400000) : 0;
              return {
                invoiceNumber: inv.invoice_number || "—",
                total: Number(inv.total).toFixed(2),
                jobNumber: job?.job_number || "—",
                title: job?.title || "—",
                property: job?.property_address || "—",
                sentDate,
                daysOut,
                status: inv.status,
              };
            });

            const totalOutstanding = (unpaidInvoices || []).reduce((sum: number, inv: any) => sum + Number(inv.total), 0);

            // 4. Send Frank an email to himself with the outstanding list
            const frankEmail = tokenRow.email || ownEmail;
            if (frankEmail && invoiceLines.length > 0) {
              const tableRows = invoiceLines.map((l) =>
                `<tr>
                  <td style="padding:6px 12px;border-bottom:1px solid #eee;">${l.invoiceNumber}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #eee;">$${l.total}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #eee;">${l.jobNumber}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #eee;">${l.property}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #eee;">${l.sentDate}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #eee;">${l.daysOut}d</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #eee;color:${l.status === "overdue" ? "#dc2626" : "#f59e0b"};">${l.status}</td>
                </tr>`
              ).join("");

              const emailBody = `
                <div style="font-family:sans-serif;max-width:700px;margin:0 auto;">
                  <h2 style="color:#ff6b00;margin-bottom:4px;">Cheque Ready for Pickup</h2>
                  <p style="color:#666;margin-top:0;">${classResult.summary || `${classResult.client_name || latestMsg.from} says a cheque is ready for you.`}</p>

                  <h3 style="margin-top:24px;margin-bottom:8px;">Your Outstanding Invoices (${invoiceLines.length})</h3>
                  <p style="color:#666;margin-top:0;">Cross-compare these with the cheque stub when you pick up.</p>

                  <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                      <tr style="background:#f8f8f8;">
                        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Invoice #</th>
                        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Amount</th>
                        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Job</th>
                        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Property</th>
                        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Sent</th>
                        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Age</th>
                        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">Status</th>
                      </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                    <tfoot>
                      <tr style="font-weight:bold;background:#f8f8f8;">
                        <td style="padding:8px 12px;">Total</td>
                        <td style="padding:8px 12px;">$${totalOutstanding.toFixed(2)}</td>
                        <td colspan="5"></td>
                      </tr>
                    </tfoot>
                  </table>

                  <p style="color:#999;font-size:12px;margin-top:24px;">Sent automatically by FHI Command Centre</p>
                </div>
              `;

              await sendGmailMessage(tokens, {
                to: frankEmail,
                subject: `Cheque ready — ${invoiceLines.length} outstanding invoices ($${totalOutstanding.toFixed(2)})`,
                body: emailBody,
              });
            }

            // 5. Also push in-app notification
            const notifBody = invoiceLines.length > 0
              ? `${classResult.summary || "Cheque ready for pickup"} — You have ${invoiceLines.length} outstanding invoices totalling $${totalOutstanding.toFixed(2)}`
              : classResult.summary || `${classResult.client_name || latestMsg.from} says a cheque is ready`;

            await pushNotification({
              organizationId,
              type: "payment_ready",
              title: `Cheque ready for pickup`,
              body: notifBody,
              metadata: {
                from: latestMsg.from,
                classification,
                payment_amount: classResult.payment_amount || null,
                outstanding_count: invoiceLines.length,
                outstanding_total: totalOutstanding,
                outstanding_invoices: invoiceLines.slice(0, 20), // cap metadata size
              },
            });
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

        // Skip storing irrelevant emails — only save work-related threads
        if (isNew && classification === "irrelevant") {
          results.push({
            threadId: thread.id,
            subject: thread.subject,
            status: "new",
            classification: "irrelevant",
            jobId: null,
          });
          continue;
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
