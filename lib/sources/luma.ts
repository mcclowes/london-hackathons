import { isBuildSession } from "../classify";
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
  // Found with `pnpm suggest-calendars`
  { name: "Campaign Lab", id: "cal-nSOU1p5gKxEUGs7" },
  { name: "Softr", id: "cal-jvRrCBfKE0G06XV" },
  { name: "Big Screen Hack", id: "cal-CmEzzbTg6hcWrrt" },
  { name: "AI Builders", id: "cal-cIL2FvDfGyDzLLI" },
  { name: "Atlas Learn", id: "cal-nglxnzDvpgNhd9D" },
  { name: "HYPE", id: "cal-ERMF7WUm4YMa57L" },
  { name: "BuildHer Labs", id: "cal-zt9SNu4JHqvbtpG" },
  { name: "Iterate", id: "cal-FWSGvYUdYxl6gUE" },
  { name: "tokens&", id: "cal-EVJ0XV6EJegxAT7" },
  { name: "House London!", id: "cal-T7EDRIJfOdmE0mq" },
  { name: "Typelevel", id: "cal-8oggABt5UxYo9Ey" },
  { name: "HackWimbledon", id: "cal-iWGY38gCxnEJhIi" },
  { name: "NVIDIA", id: "cal-MJ28KU4lOJNFNHk" },
  { name: "Stripe Startups", id: "cal-DLxwYFBQH1LAo0O" },
  { name: "AssemblyAI", id: "cal-R9IQUb53FUrolUF" },
  { name: "ClickHouse", id: "cal-gmMOid1Rsqc3Hih" },
  { name: "London AI Hub", id: "cal-CJ9PBT5AyF0qRIH" },
  { name: "Bits in Bio London", id: "cal-87tjYz5YptaAcPU" },
];

export interface DiscoverEntry {
  event: {
    api_id?: string;
    name: string;
    start_at: string;
    end_at?: string;
    url: string;
    location_type?: string;
    coordinate?: { latitude: number; longitude: number } | null;
    geo_address_info?: { short_address?: string; address?: string; city?: string } | null;
  };
  calendar?: { api_id?: string; name?: string; slug?: string | null } | null;
  hosts?: { name?: string }[];
}

interface DiscoverPage {
  entries: DiscoverEntry[];
}

/**
 * Discover returns about 50 London events per query and ignores its category filter,
 * so searching several build terms is what widens the net.
 */
const DISCOVER_QUERIES = ["", "hackathon", "hack", "buildathon", "build", "builders", "workshop", "demo", "jam"];

const FOLLOWED_IDS = new Set(ORGANISER_CALENDARS.map((c) => c.id));

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
    ...(calendar?.api_id && FOLLOWED_IDS.has(calendar.api_id) && { followedOrganiser: true }),
  };
}

type DiscoverSearch = (query: string) => Promise<DiscoverEntry[]>;

const searchLondon: DiscoverSearch = async (query) => {
  const params = new URLSearchParams({ discover_place_api_id: LONDON_PLACE_ID, pagination_limit: "50" });
  if (query) params.set("query", query);
  const page = await fetchJson<DiscoverPage>(`https://api.lu.ma/discover/get-paginated-events?${params}`);
  return page.entries;
};

export async function fetchDiscoverEntries(
  queries = DISCOVER_QUERIES,
  search = searchLondon,
): Promise<DiscoverEntry[]> {
  const pages = await Promise.all(queries.map(search));
  const byId = new Map<string, DiscoverEntry>();
  for (const entry of pages.flat()) byId.set(entry.event.api_id ?? entry.event.url, entry);
  return [...byId.values()];
}

export const lumaDiscover: Source = {
  name: "Luma discover",
  fetch: async () => (await fetchDiscoverEntries()).map(fromDiscoverEntry),
};

export interface CalendarSuggestion {
  id: string;
  name: string;
  slug?: string | null;
  events: number;
  builds: number;
  titles: string[];
}

/** Calendars hosting London events that we don't follow yet, most build-heavy first. */
export function suggestCalendars(entries: DiscoverEntry[], followed = FOLLOWED_IDS): CalendarSuggestion[] {
  const byCalendar = new Map<string, CalendarSuggestion>();
  for (const { event, calendar } of entries) {
    if (!calendar?.api_id || !calendar.slug || followed.has(calendar.api_id)) continue;
    const s = byCalendar.get(calendar.api_id) ?? {
      id: calendar.api_id,
      name: calendar.name ?? calendar.api_id,
      slug: calendar.slug,
      events: 0,
      builds: 0,
      titles: [],
    };
    s.events++;
    if (isBuildSession(event.name)) s.builds++;
    s.titles.push(event.name);
    byCalendar.set(s.id, s);
  }
  return [...byCalendar.values()].sort((a, b) => b.builds - a.builds || b.events - a.events);
}

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
