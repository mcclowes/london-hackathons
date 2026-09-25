import { fetchText } from "../http";
import { parseNextData } from "../nextData";
import type { RawEvent, Source } from "../types";

export interface DevfolioHackathon {
  name: string;
  slug: string;
  starts_at: string;
  ends_at?: string | null;
  is_online: boolean;
  timezone?: string | null;
  location?: string | null;
}

type Listing = Record<string, DevfolioHackathon[] | unknown>;

interface ListingPage {
  props: { pageProps: { dehydratedState: { queries: { state: { data: Listing } }[] } } };
}

interface EventPage {
  props: { pageProps: { hackathon: DevfolioHackathon } };
}

const LISTS = ["open_hackathons", "upcoming_hackathons", "featured_hackathons"];

/** The listing has no location, only a timezone, so it narrows the list to events worth a page fetch. */
export function ukCandidates(page: ListingPage): DevfolioHackathon[] {
  const data = page.props.pageProps.dehydratedState.queries[0]?.state.data ?? {};
  const bySlug = new Map<string, DevfolioHackathon>();
  for (const key of LISTS) {
    for (const h of (data[key] as DevfolioHackathon[] | undefined) ?? []) {
      if (!h.is_online && h.timezone === "Europe/London") bySlug.set(h.slug, h);
    }
  }
  return [...bySlug.values()];
}

export function fromDevfolio(h: DevfolioHackathon): RawEvent {
  return {
    title: h.name,
    start: h.starts_at,
    end: h.ends_at ?? undefined,
    url: `https://${h.slug}.devfolio.co/`,
    source: "Devfolio",
    venue: h.is_online ? "Online" : (h.location ?? undefined),
    knownHackathon: true,
  };
}

type GetPage = (url: string) => Promise<string>;

export async function fetchDevfolio(get: GetPage = fetchText): Promise<RawEvent[]> {
  const candidates = ukCandidates(parseNextData<ListingPage>(await get("https://devfolio.co/hackathons")));
  const pages = await Promise.all(
    candidates.map(async (h) => parseNextData<EventPage>(await get(`https://${h.slug}.devfolio.co/`)).props.pageProps.hackathon),
  );
  return pages.map(fromDevfolio);
}

export const devfolio: Source = { name: "Devfolio", fetch: () => fetchDevfolio() };
