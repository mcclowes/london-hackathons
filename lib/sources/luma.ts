import { fetchJson, fetchText } from "../http";
import { icalDateToIso, parseIcal, type VEvent } from "../ical/parse";
import type { RawEvent, Source } from "../types";

const LONDON_PLACE_ID = "discplace-QCcNk3HXowOR97j";

/** Organiser calendars worth following. Slugs resolve via luma.com/<slug>. */
export const ORGANISER_CALENDARS = [
  { name: "{Tech: Europe}", id: "cal-qyEpCltsspbMoJR" },
  { name: "Unicorn Mafia", id: "cal-yoMaeA020efY3U1" },
  { name: "Encode Club", id: "cal-8LJYo5N7QObN2DI" },
  { name: "The Hack Collective", id: "cal-Qk1P4msjA8eRxCs" },
  { name: "AI Tinkerers", id: "cal-UCNcNUQEeTHdcnt" },
  { name: "Google DeepMind", id: "cal-7Q5A70Bz5Idxopu" },
  { name: "Solana Hacker Houses", id: "cal-dLrjJu0Dqay3WBe" },
  { name: "Claude Startups", id: "cal-lRtuNbDBacd0u5K" },
  { name: "Claude Community", id: "cal-TOpA5LAFfuDeFpu" },
  { name: "LangChain", id: "cal-mvNH1VHlaFtSMFx" },
  { name: "Intercom", id: "cal-scIJjQDKflgPtvr" },
  { name: "Raycast", id: "cal-KwZeQ0HC9LFQ3Fk" },
  { name: "Linear", id: "cal-yQRC7YwpEmCUqGF" },
  { name: "PostHog", id: "cal-qJCKF7ct5XX3pwB" },
  { name: "Cloudflare", id: "cal-BM6bfUtS2kt0waC" },
  { name: "Together AI", id: "cal-Icg56OoJNDuOt3e" },
  { name: "Cerebras", id: "cal-aXdtH9ebHo9YaLg" },
  { name: "fal", id: "cal-u3vVIuSFJd7RqNB" },
  { name: "Convex", id: "cal-cMVr4fliuzUTew9" },
];

interface DiscoverEntry {
  event: {
    name: string;
    start_at: string;
    end_at?: string;
    url: string;
    location_type?: string;
    coordinate?: { latitude: number; longitude: number } | null;
    geo_address_info?: { short_address?: string; address?: string; city?: string } | null;
  };
  calendar?: { name?: string } | null;
  hosts?: { name?: string }[];
}

interface DiscoverPage {
  entries: DiscoverEntry[];
  has_more?: boolean;
  next_cursor?: string;
}

const MAX_DISCOVER_PAGES = 5;

export function fromDiscoverEntry({ event, calendar, hosts }: DiscoverEntry): RawEvent {
  const geo = event.geo_address_info;
  const calendarName = calendar?.name && calendar.name !== "Personal" ? calendar.name : undefined;
  return {
    title: event.name,
    start: event.start_at,
    end: event.end_at,
    url: `https://luma.com/${event.url}`,
    source: "Luma",
    organiser: calendarName ?? hosts?.[0]?.name,
    venue: geo?.short_address ?? geo?.address ?? geo?.city,
    lat: event.coordinate?.latitude,
    lng: event.coordinate?.longitude,
  };
}

export const lumaDiscover: Source = {
  name: "Luma discover",
  async fetch() {
    const events: RawEvent[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_DISCOVER_PAGES; page++) {
      const params = new URLSearchParams({
        discover_place_api_id: LONDON_PLACE_ID,
        discover_category_api_id: "cat-tech",
        pagination_limit: "50",
      });
      if (cursor) params.set("pagination_cursor", cursor);
      const data = await fetchJson<DiscoverPage>(
        `https://api.lu.ma/discover/get-paginated-events?${params}`,
      );
      events.push(...data.entries.map(fromDiscoverEntry));
      if (!data.has_more || !data.next_cursor) break;
      cursor = data.next_cursor;
    }
    return events;
  },
};

function lumaEventUrl(v: VEvent): string {
  const fromDescription = v.DESCRIPTION?.match(/https:\/\/luma\.com\/[\w-]+/)?.[0];
  if (fromDescription && !fromDescription.endsWith("/event")) return fromDescription;
  if (v.LOCATION?.startsWith("https://luma.com/")) return v.LOCATION;
  return v.URL ?? "https://luma.com";
}

export function fromLumaVEvent(v: VEvent, calendarName: string): RawEvent {
  const [lat, lng] = (v.GEO ?? "").split(";").map(Number);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && v.GEO != null;
  const location = v.LOCATION?.startsWith("http") ? undefined : v.LOCATION;
  const organiser = v["ORGANIZER;CN"]?.trim() || calendarName;
  return {
    title: v.SUMMARY ?? "Untitled",
    start: icalDateToIso(v.DTSTART),
    end: v.DTEND ? icalDateToIso(v.DTEND) : undefined,
    allDay: /^\d{8}$/.test(v.DTSTART),
    url: lumaEventUrl(v),
    source: calendarName,
    organiser,
    venue: location,
    lat: hasGeo ? lat : undefined,
    lng: hasGeo ? lng : undefined,
    followedOrganiser: true,
  };
}

export const lumaCalendars: Source = {
  name: "Luma organiser calendars",
  async fetch() {
    const results = await Promise.allSettled(
      ORGANISER_CALENDARS.map(async (cal) => {
        const ics = await fetchText(`https://api.lu.ma/ics/get?entity=calendar&id=${cal.id}`);
        return parseIcal(ics)
          .filter((v) => v.DTSTART)
          .map((v) => fromLumaVEvent(v, cal.name));
      }),
    );
    const ok = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    if (ok.length === 0 && results.every((r) => r.status === "rejected")) {
      throw new Error("every calendar feed failed");
    }
    return ok;
  },
};
