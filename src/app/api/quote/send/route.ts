import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { jsPDF } from "jspdf";

const resend = new Resend(process.env.RESEND_API_KEY);

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

function generatePdfBuffer(
  jobNumber: string,
  propertyAddress: string,
  items: LineItem[],
  total: number,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Frank's Home Improvement", 14, 25);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Quality Painting & Repairs", 14, 32);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Quote", pageWidth - 14, 20, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(jobNumber, pageWidth - 14, 27, { align: "right" });
  doc.text(date, pageWidth - 14, 33, { align: "right" });

  doc.setDrawColor(200);
  doc.line(14, 38, pageWidth - 14, 38);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Property:", 14, 47);
  doc.setFont("helvetica", "normal");
  doc.text(propertyAddress || "N/A", 42, 47);

  let y = 58;
  doc.setFillColor(26, 26, 46);
  doc.rect(14, y - 5, pageWidth - 28, 8, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", 16, y);
  doc.text("Qty", 120, y, { align: "center" });
  doc.text("Rate", 150, y, { align: "right" });
  doc.text("Total", pageWidth - 16, y, { align: "right" });

  doc.setTextColor(51);
  doc.setFont("helvetica", "normal");
  y += 10;

  for (const item of items) {
    const lineTotal = item.quantity * item.unit_price;
    doc.text(item.description, 16, y);
    doc.text(String(item.quantity), 120, y, { align: "center" });
    doc.text(`$${item.unit_price.toFixed(2)}`, 150, y, { align: "right" });
    doc.text(`$${lineTotal.toFixed(2)}`, pageWidth - 16, y, { align: "right" });
    doc.setDrawColor(230);
    doc.line(14, y + 3, pageWidth - 14, y + 3);
    y += 9;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Total: $${total.toFixed(2)}`, pageWidth - 16, y, {
    align: "right",
  });

  y += 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  doc.text("aguirref04@gmail.com", pageWidth / 2, y, { align: "center" });
  doc.text(
    "Thank you for choosing Frank's Home Improvement",
    pageWidth / 2,
    y + 6,
    {
      align: "center",
    },
  );

  return Buffer.from(doc.output("arraybuffer"));
}

export async function POST(req: NextRequest) {
  try {
    const { jobNumber, propertyAddress, items, total } = (await req.json()) as {
      jobNumber: string;
      propertyAddress: string;
      items: LineItem[];
      total: number;
    };

    const pdfBuffer = generatePdfBuffer(
      jobNumber,
      propertyAddress,
      items,
      total,
    );

    // If Resend is not configured, fall back gracefully
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        fallback: true,
        error: "RESEND_API_KEY not set. Use mailto fallback.",
      });
    }

    const { data, error } = await resend.emails.send({
      from: "Frank's Home Improvement <onboarding@resend.dev>",
      to: ["coady@allprofessionaltrades.com"],
      cc: ["neilh@allprofessionaltrades.com"],
      subject: `Quote ${jobNumber} - ${propertyAddress || "Job"}`,
      text: `Hi Coady,\n\nPlease find the quote for ${jobNumber} attached.\n\nProperty: ${propertyAddress || "N/A"}\nTotal: $${total.toFixed(2)}\n\nThanks,\nFrank`,
      attachments: [
        {
          filename: `Quote-${jobNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (err: any) {
    console.error("Email send error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
