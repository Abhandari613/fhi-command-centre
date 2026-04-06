/**
 * .ics calendar file generation for sub dispatch.
 * Produces RFC 5545-compliant VCALENDAR strings.
 */

type ICSEventInput = {
  jobNumber: string;
  address: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  organizerName?: string;
  organizerEmail?: string;
  uid?: string; // stable UID for updates — use assignment ID
};

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatDateValue(dateStr: string): string {
  // YYYY-MM-DD → YYYYMMDD (all-day event VALUE=DATE format)
  return dateStr.replace(/-/g, "");
}

export function generateJobICS(event: ICSEventInput): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const uid = event.uid || `${event.jobNumber}-${Date.now()}@fhi.app`;
  const summary = `FHI — ${event.jobNumber} @ ${event.address}`;

  // End date for all-day events is exclusive in iCal, so add 1 day
  const endDate = new Date(event.endDate);
  endDate.setDate(endDate.getDate() + 1);
  const endStr = endDate.toISOString().split("T")[0];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FHI//Sub Dispatch//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${formatDateValue(event.startDate)}`,
    `DTEND;VALUE=DATE:${formatDateValue(endStr)}`,
    `SUMMARY:${escapeICS(summary)}`,
    `LOCATION:${escapeICS(event.address)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    "STATUS:CONFIRMED",
  ];

  if (event.organizerEmail) {
    lines.push(
      `ORGANIZER;CN=${escapeICS(event.organizerName || "Frank's Home Improvement")}:mailto:${event.organizerEmail}`,
    );
  }

  lines.push("BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:Job ${event.jobNumber} starts in 1 hour`, "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}
