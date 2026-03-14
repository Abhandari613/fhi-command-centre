import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

export async function POST(req: NextRequest) {
  try {
    const { jobNumber, propertyAddress, items, total } = (await req.json()) as {
      jobNumber: string;
      propertyAddress: string;
      items: LineItem[];
      total: number;
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Frank's Home Improvement", 14, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Quality Painting & Repairs", 14, 32);

    // Quote info (right-aligned)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Quote", pageWidth - 14, 20, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(jobNumber || "", pageWidth - 14, 27, { align: "right" });
    doc.text(date, pageWidth - 14, 33, { align: "right" });

    // Divider
    doc.setDrawColor(200);
    doc.line(14, 38, pageWidth - 14, 38);

    // Property
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Property:", 14, 47);
    doc.setFont("helvetica", "normal");
    doc.text(propertyAddress || "N/A", 42, 47);

    // Table header
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

    // Table rows
    doc.setTextColor(51);
    doc.setFont("helvetica", "normal");
    y += 10;

    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price;
      doc.text(item.description, 16, y);
      doc.text(String(item.quantity), 120, y, { align: "center" });
      doc.text(`$${item.unit_price.toFixed(2)}`, 150, y, { align: "right" });
      doc.text(`$${lineTotal.toFixed(2)}`, pageWidth - 16, y, { align: "right" });

      // Row divider
      doc.setDrawColor(230);
      doc.line(14, y + 3, pageWidth - 14, y + 3);
      y += 9;

      // Page break if needed
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    // Total
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Total: $${total.toFixed(2)}`, pageWidth - 16, y, { align: "right" });

    // Footer
    y += 20;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text("aguirref04@gmail.com", pageWidth / 2, y, { align: "center" });
    doc.text(
      "Thank you for choosing Frank's Home Improvement",
      pageWidth / 2,
      y + 6,
      { align: "center" }
    );

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quote-${jobNumber || "FHI"}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
