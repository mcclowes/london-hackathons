import type { HackEvent } from "./types";

const TZ = "Europe/London";

function part(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(iso));
}

export function monthKey(iso: string): string {
  return part(iso, { month: "long", year: "numeric" });
}

export function dayNumber(iso: string): string {
  return part(iso, { day: "numeric" });
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

export function groupByMonth(events: HackEvent[]): [string, HackEvent[]][] {
  const groups = new Map<string, HackEvent[]>();
  for (const e of events) {
    const key = monthKey(e.start);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups];
}

export function isThisWeek(iso: string, now = new Date()): boolean {
  const diff = Date.parse(iso) - now.getTime();
  return diff < 7 * 24 * 3600_000;
}
