import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { subName, subEmail, jobNumber, address, magicLink } =
      await req.json();

    if (!subEmail || !magicLink) {
      return NextResponse.json(
        { error: "subEmail and magicLink are required" },
        { status: 400 },
      );
    }

    const { error } = await resend.emails.send({
      from: "Frank's Home Improvement <onboarding@resend.dev>",
      to: subEmail,
      subject: `Job Assignment: ${jobNumber} — ${address}`,
      html: `
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
            <p style="margin: 0; font-size: 16px; color: #1a1a1a;">${address}</p>
          </div>

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
      `,
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
