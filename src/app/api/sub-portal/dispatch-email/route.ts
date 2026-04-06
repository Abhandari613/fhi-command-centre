import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isSilentMode } from "@/lib/services/silent-mode";
import { logShadowOutbound } from "@/lib/services/shadow-log";
import { generateJobICS } from "@/lib/services/ics";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const {
      subName,
      subEmail,
      jobNumber,
      address,
      magicLink,
      organizationId,
      startDate,
      endDate,
      taskSummary,
      assignmentId,
    } = await req.json();

    if (!subEmail || !magicLink) {
      return NextResponse.json(
        { error: "subEmail and magicLink are required" },
        { status: 400 },
      );
    }

    // Build .ics attachment if we have dates
    const attachments: { filename: string; content: Buffer }[] = [];
    if (startDate) {
      const icsContent = generateJobICS({
        jobNumber: jobNumber || "JOB",
        address: address || "TBD",
        description: [
          taskSummary || "",
          magicLink ? `\nPortal: ${magicLink}` : "",
        ].filter(Boolean).join("\n"),
        startDate,
        endDate: endDate || startDate,
        uid: assignmentId ? `assignment-${assignmentId}@fhi.app` : undefined,
      });
      attachments.push({
        filename: `FHI-${jobNumber || "job"}.ics`,
        content: Buffer.from(icsContent, "utf-8"),
      });
    }

    const scheduleLine = startDate
      ? `<p style="margin: 0 0 8px; font-size: 14px; color: #666;">Scheduled</p>
         <p style="margin: 0; font-size: 16px; color: #1a1a1a;">${new Date(startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${endDate && endDate !== startDate ? ` — ${new Date(endDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}` : ""}</p>`
      : "";

    const calendarNote = startDate
      ? `<p style="font-size: 14px; color: #666; margin-top: 12px;">
           📅 A calendar invite is attached — open it to add this job to your calendar.
         </p>`
      : "";

    const emailSubject = `Job Assignment: ${jobNumber} — ${address}`;
    const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">
            Frank's Home Improvement
          </h1>
          <hr style="border: none; border-top: 2px solid #f97316; margin: 16px 0;" />

          <p style="font-size: 16px; color: #333;">Hi ${subName || "there"},</p>

          <p style="font-size: 16px; color: #333;">
            You've been assigned to a new job:
          </p>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Job Number</p>
            <p style="margin: 0 0 16px; font-size: 18px; font-weight: bold; color: #1a1a1a;">${jobNumber}</p>
            <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Location</p>
            <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">${address}</p>
            ${scheduleLine}
          </div>

          ${calendarNote}

          <p style="font-size: 16px; color: #333;">
            Click the button below to view your tasks and upload completion photos:
          </p>

          <a href="${magicLink}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
            View Job &amp; Upload Photos
          </a>

          <p style="font-size: 13px; color: #999; margin-top: 32px;">
            This link is unique to you. Do not share it with others.
          </p>
        </div>
      `;

    // Silent mode: skip sending but log what would have been sent
    if (organizationId && (await isSilentMode(organizationId))) {
      console.log(`[SILENT MODE] Suppressed dispatch email to ${subEmail} for ${jobNumber}`);
      await logShadowOutbound({
        organizationId,
        sourceRoute: "sub-portal/dispatch-email",
        emailType: "dispatch",
        to: subEmail,
        subject: emailSubject,
        bodyHtml: emailHtml,
        attachmentsMeta: attachments.map((a) => ({ filename: a.filename, mimeType: "text/calendar", sizeBytes: a.content.length })),
        relatedJobNumber: jobNumber,
        metadata: { subName, address, startDate, endDate, assignmentId },
      });
      return NextResponse.json({ success: true, silentMode: true });
    }

    const { error } = await resend.emails.send({
      from: "Frank's Home Improvement <onboarding@resend.dev>",
      to: subEmail,
      subject: emailSubject,
      attachments,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend dispatch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Dispatch email error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
