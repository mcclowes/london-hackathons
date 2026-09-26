import type { HackEvent } from "./types";

const TZ = "Europe/London";

function part(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(iso));
}

/** "OCT 07" */
export function dateLabel(iso: string): string {
  return `${part(iso, { month: "short" }).slice(0, 3)} ${part(iso, { day: "2-digit" })}`.toUpperCase();
}

export function weekday(iso: string): string {
  return part(iso, { weekday: "short" });
}

function sameDay(a: string, b: string): boolean {
  const day = (iso: string) => part(iso, { dateStyle: "short" });
  return day(a) === day(b);
}

export function timeRange(e: HackEvent): string {
  const multiDay = e.end && !sameDay(e.start, e.end);
  const until = e.end && multiDay ? `until ${part(e.end, { weekday: "short", day: "numeric", month: "short" })}` : "";
  if (e.allDay) return until || "All day";
  const time = (iso: string) => part(iso, { hour: "2-digit", minute: "2-digit" });
  if (!e.end) return time(e.start);
  return multiDay ? `${time(e.start)}, ${until}` : `${time(e.start)}–${time(e.end)}`;
}

/** Calendar days from `now` to `iso` in London; negative once the day has passed. */
function daysAway(iso: string, now: Date): number {
  const day = (d: Date) => Date.parse(d.toLocaleDateString("en-CA", { timeZone: TZ }));
  return Math.round((day(new Date(iso)) - day(now)) / 86_400_000);
}

export type Soon = "today" | "tomorrow" | "this week";

/** Events already under way count as today. */
export function soon(iso: string, now = new Date()): Soon | undefined {
  const days = daysAway(iso, now);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return "this week";
}

export function isThisWeek(iso: string, now = new Date()): boolean {
  return soon(iso, now) !== undefined;
}

/** Coarse on purpose: the page is only rebuilt every six hours. */
export function daysUntil(iso: string, now = new Date()): string {
  const days = daysAway(iso, now);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

const utcStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");
const londonDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const compact = (date: string) => date.replaceAll("-", "");

export function googleCalendarUrl(e: HackEvent): string {
  let dates: string;
  if (e.allDay) {
    const last = londonDate(e.end ?? e.start);
    const after = new Date(Date.parse(last) + 86_400_000).toISOString().slice(0, 10);
    dates = `${compact(londonDate(e.start))}/${compact(after)}`;
  } else {
    const end = e.end ?? new Date(Date.parse(e.start) + 3 * 3600_000).toISOString();
    dates = `${utcStamp(e.start)}/${utcStamp(end)}`;
  }
  const params = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, details: e.url });
  if (e.venue) params.set("location", e.venue);
  return `https://calendar.google.com/calendar/render?${params}`;
}
