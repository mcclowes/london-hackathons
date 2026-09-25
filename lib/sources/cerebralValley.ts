import { fetchJson } from "../http";
import type { RawEvent, Source } from "../types";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export interface CvEvent {
  name: string;
  url: string;
  /** UTC, but without a zone: "2026-10-10 08:00:00". */
  startDateTime: string;
  endDateTime?: string | null;
  venue?: string | null;
}

interface CvPage {
  events: CvEvent[];
  totalCount: number;
}

type FetchPage = (offset: number) => Promise<CvPage>;

const fetchPage: FetchPage = (offset) =>
  fetchJson(
    `https://api.cerebralvalley.ai/v1/public/event/pull?approved=true&location=${encodeURIComponent("London, UK")}&limit=${PAGE_SIZE}&offset=${offset}`,
  );

/** Events CV files under "London, UK" whose venue says otherwise. */
const ELSEWHERE =
  /\b(leeds|manchester|birmingham|bristol|cambridge|oxford|edinburgh|glasgow|brighton|nottingham|amsterdam|hamerkanaal)\b/i;

function utc(dateTime: string): string {
  return new Date(`${dateTime.replace(" ", "T")}Z`).toISOString();
}

/** Already filtered to London, and venues are usually a bare building name, so assume London unless told otherwise. */
function venueName(venue: string | null | undefined): string | undefined {
  if (!venue?.trim()) return "London";
  return ELSEWHERE.test(venue) ? venue.trim() : `${venue.trim()}, London`;
}

/** CV's HACKATHON type also covers courses and conferences, so titles still have to pass the hackathon check. */
export function fromCerebralValley(e: CvEvent): RawEvent {
  return {
    title: e.name,
    start: utc(e.startDateTime),
    end: e.endDateTime ? utc(e.endDateTime) : undefined,
    url: e.url,
    source: "Cerebral Valley",
    venue: venueName(e.venue),
  };
}

/** The API ignores date filters and returns oldest first, so read every page. */
export async function fetchCerebralValley(get = fetchPage): Promise<RawEvent[]> {
  const first = await get(0);
  const pages = Math.min(Math.ceil(first.totalCount / PAGE_SIZE), MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => get((i + 1) * PAGE_SIZE)));
  return [first, ...rest].flatMap((p) => p.events).map(fromCerebralValley);
}

export const cerebralValley: Source = { name: "Cerebral Valley", fetch: () => fetchCerebralValley() };
