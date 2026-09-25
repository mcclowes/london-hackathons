import { fetchJson } from "../http";
import type { RawEvent, Source } from "../types";

interface DevpostHackathon {
  title: string;
  url: string;
  organization_name?: string;
  submission_period_dates: string;
  displayed_location: { location: string };
}

interface DevpostPage {
  hackathons: DevpostHackathon[];
  meta: { total_count: number; per_page: number };
}

const MAX_PAGES = 20;

/**
 * Devpost only exposes a display string: "Sep 25, 2026", "Sep 25 - 28, 2026",
 * "Sep 22 - Oct 15, 2026" or "Dec 28, 2026 - Jan 02, 2027".
 */
export function parseDevpostDates(text: string): { start: string; end: string } | null {
  const m = text.match(
    /^(\w{3}) (\d{1,2})(?:, (\d{4}))?(?: - (?:(\w{3}) )?(\d{1,2}))?, (\d{4})$/,
  );
  if (!m) return null;
  const [, startMonth, startDay, startYear, endMonth, endDay, endYear] = m;
  const toIso = (mon: string, day: string, year: string) => {
    const d = new Date(`${mon} ${day}, ${year} 00:00:00 UTC`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const start = toIso(startMonth, startDay, startYear ?? endYear);
  const end = toIso(endMonth ?? startMonth, endDay ?? startDay, endYear);
  return start && end ? { start, end } : null;
}

export function fromDevpost(h: DevpostHackathon): RawEvent | null {
  const dates = parseDevpostDates(h.submission_period_dates);
  if (!dates) return null;
  return {
    title: h.title,
    ...dates,
    allDay: true,
    url: h.url,
    source: "Devpost",
    organiser: h.organization_name,
    venue: h.displayed_location.location,
    knownHackathon: true,
  };
}

export const devpost: Source = {
  name: "Devpost",
  async fetch() {
    const events: RawEvent[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await fetchJson<DevpostPage>(
        `https://devpost.com/api/hackathons?challenge_type[]=in-person&status[]=upcoming&status[]=open&page=${page}`,
      );
      events.push(...data.hackathons.map(fromDevpost).filter((e): e is RawEvent => e != null));
      if (page * data.meta.per_page >= data.meta.total_count) break;
    }
    return events;
  },
};
