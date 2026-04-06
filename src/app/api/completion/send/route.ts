import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import jsPDF from "jspdf";
import { isSilentMode } from "@/lib/services/silent-mode";

export async function POST(req: Request) {
  try {
    const { jobId, reportId, recipientEmails, organizationId } = await req.json();

    if (!jobId || !reportId || !recipientEmails?.length) {
      return NextResponse.json(
        { error: "jobId, reportId, and recipientEmails required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch job details
    const { data: job } = await supabase
      .from("jobs")
      .select("job_number, property_address, address, title")
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch confirmed tasks with linked photos
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("id, description, quantity, unit_price")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    const { data: links } = await supabase
      .from("task_photo_links")
      .select("task_id, photo_id, job_photos(url)")
      .in(
        "task_id",
        (tasks || []).map((t: any) => t.id),
      );

    // Build task-photo map
    const taskPhotoMap = new Map<string, string[]>();
    (links || []).forEach((link: any) => {
      const urls = taskPhotoMap.get(link.task_id) || [];
      if (link.job_photos?.url) urls.push(link.job_photos.url);
      taskPhotoMap.set(link.task_id, urls);
    });

    const address = job.property_address || job.address || "N/A";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const reviewLink = `${appUrl}/portal/${jobId}/review`;

    // ============================================================
    // 1. Build HTML email
    // ============================================================
    const taskRows = (tasks || [])
      .map((task: any) => {
        const photos = taskPhotoMap.get(task.id) || [];
        const photoHtml = photos
          .map(
            (url) =>
              `<img src="${url}" alt="completion" style="width:120px;height:90px;object-fit:cover;border-radius:6px;margin:4px 4px 0 0;" />`,
          )
          .join("");

        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top;">
              <strong>${task.description}</strong>
              ${task.unit_price ? `<br/><span style="color:#666;font-size:12px;">$${((task.quantity || 1) * task.unit_price).toFixed(2)}</span>` : ""}
            </td>
            <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top;">
              ${photoHtml || '<span style="color:#999;">No photo</span>'}
            </td>
          </tr>`;
      })
      .join("");

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <div style="background:#1a1a1a;color:white;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;font-size:20px;">Completion Report</h1>
          <p style="margin:4px 0 0;opacity:0.7;">${job.job_number} — ${address}</p>
        </div>

        <div style="background:white;padding:24px;border:1px solid #eee;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8f8f8;">
                <th style="padding:10px;text-align:left;border-bottom:2px solid #ddd;">Task</th>
                <th style="padding:10px;text-align:left;border-bottom:2px solid #ddd;">Completion Photo(s)</th>
              </tr>
            </thead>
            <tbody>
              ${taskRows}
            </tbody>
          </table>

          <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
            <p style="margin:0 0 12px;font-weight:bold;color:#166534;">All ${(tasks || []).length} tasks completed</p>
            <a href="${reviewLink}" style="display:inline-block;background:#ea580c;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Review & Approve
            </a>
          </div>
        </div>

        <div style="padding:16px;text-align:center;color:#999;font-size:12px;">
          Frank's Home Improvement — Completion Report
        </div>
      </div>`;

    // ============================================================
    // 2. Build PDF
    // ============================================================
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Completion Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${job.job_number} — ${address}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

    doc.setDrawColor(200);
    doc.line(14, 40, 196, 40);

    let y = 48;
    doc.setFontSize(11);
    doc.setTextColor(0);

    (tasks || []).forEach((task: any, i: number) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const photos = taskPhotoMap.get(task.id) || [];
      const status = photos.length > 0 ? "✓" : "○";
      const price =
        task.unit_price > 0
          ? ` — $${((task.quantity || 1) * task.unit_price).toFixed(2)}`
          : "";

      doc.text(`${status} ${task.description}${price}`, 14, y);
      if (photos.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`  ${photos.length} photo(s) attached`, 14, y + 5);
        doc.setFontSize(11);
        doc.setTextColor(0);
        y += 12;
      } else {
        y += 8;
      }
    });

    y += 10;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setTextColor(0, 100, 0);
    doc.text(`Total: ${(tasks || []).length} tasks completed`, 14, y);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // ============================================================
    // 3. Send email
    // ============================================================
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.log(
        "[TEST MODE] Would send completion report to:",
        recipientEmails,
      );
      return NextResponse.json({ success: true, testMode: true });
    }

    // Silent mode: skip sending but return success
    if (organizationId && (await isSilentMode(organizationId))) {
      console.log(`[SILENT MODE] Suppressed completion report for job ${job.job_number}`);
      return NextResponse.json({ success: true, silentMode: true });
    }

    const resend = new Resend(resendApiKey);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Frank's Home Improvement <onboarding@resend.dev>",
      to: recipientEmails,
      subject: `Completion Report: ${job.job_number} — ${address}`,
      html: htmlBody,
      attachments: [
        {
          filename: `completion-report-${job.job_number}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      emailId: emailData?.id,
    });
  } catch (error: any) {
    console.error("Completion send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
