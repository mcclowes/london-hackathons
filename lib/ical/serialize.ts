import type { HackEvent } from "../types";

function escapeText(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

function toIcalDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function toIcalDay(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "");
}

/** All-day DTEND is exclusive, so an event ending on the 11th ends on the 12th. */
function nextDay(iso: string): string {
  return new Date(Date.parse(iso.slice(0, 10)) + 24 * 3600_000).toISOString();
}

/** RFC 5545 says lines over 75 octets must be folded. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let chunk = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(chunk);
      chunk = "";
      size = 0;
    }
    chunk += ch;
    size += n;
  }
  out.push(chunk);
  return out.join("\r\n ");
}

export function toIcal(events: HackEvent[], now = new Date()): string {
  const stamp = toIcalDate(now.toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//London Hackathons//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:London hackathons",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];
  for (const e of events) {
    const end = e.end ?? (e.allDay ? e.start : new Date(Date.parse(e.start) + 3 * 3600_000).toISOString());
    const description = [e.organiser && `Hosted by ${e.organiser}`, e.url, `Found via ${e.sources.join(", ")}`]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@london-hackathons`,
      `DTSTAMP:${stamp}`,
      ...(e.allDay
        ? [`DTSTART;VALUE=DATE:${toIcalDay(e.start)}`, `DTEND;VALUE=DATE:${toIcalDay(nextDay(end))}`]
        : [`DTSTART:${toIcalDate(e.start)}`, `DTEND:${toIcalDate(end)}`]),
      `SUMMARY:${escapeText(e.title)}`,
      `URL:${e.url}`,
      `DESCRIPTION:${escapeText(description)}`,
      ...(e.venue ? [`LOCATION:${escapeText(e.venue)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
