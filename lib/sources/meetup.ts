import { postJson } from "../http";
import type { RawEvent, Source } from "../types";

const ENDPOINT = "https://api.meetup.com/gql-ext";
const TECH_CATEGORY_ID = "546";
const SEARCHES = ["hackathon", "hack day", "game jam", "buildathon"];
const PAGES_PER_SEARCH = 2;

const QUERY = `query ($query: String!, $after: String) {
  eventSearch(first: 100, after: $after, filter: {
    query: $query, lat: 51.5074, lon: -0.1278, radius: 20, topicCategoryId: "${TECH_CATEGORY_ID}"
  }) {
    pageInfo { hasNextPage endCursor }
    edges { node { title dateTime endTime eventUrl eventType group { name } venues { name lat lon city } } }
  }
}`;

export interface MeetupEvent {
  title: string;
  dateTime: string;
  endTime?: string | null;
  eventUrl: string;
  eventType?: string;
  group?: { name?: string } | null;
  venues?: { name?: string; lat?: number; lon?: number; city?: string }[] | null;
}

interface SearchResponse {
  data?: {
    eventSearch: {
      pageInfo: { hasNextPage: boolean; endCursor?: string | null };
      edges: { node: MeetupEvent }[];
    };
  };
  errors?: { message: string }[];
}

type Search = (query: string, after?: string) => Promise<SearchResponse>;

const search: Search = (query, after) => postJson(ENDPOINT, { query: QUERY, variables: { query, after } });

/** The search is already scoped to London, so an in-person event with a hidden venue is still in London. */
function venueName(e: MeetupEvent): string {
  if (e.eventType === "ONLINE") return "Online";
  const venue = e.venues?.[0];
  return [venue?.name, venue?.city].filter(Boolean).join(", ") || "London";
}

export function fromMeetup(e: MeetupEvent): RawEvent {
  const venue = e.eventType === "ONLINE" ? undefined : e.venues?.[0];
  return {
    title: e.title,
    start: new Date(e.dateTime).toISOString(),
    end: e.endTime ? new Date(e.endTime).toISOString() : undefined,
    url: e.eventUrl,
    source: "Meetup",
    organiser: e.group?.name,
    venue: venueName(e),
    lat: venue?.lat,
    lng: venue?.lon,
  };
}

/** Meetup's search is semantic and loose, so this casts wide and leaves the hackathon check to aggregation. */
export async function fetchMeetup(searches = SEARCHES, run = search): Promise<RawEvent[]> {
  const byUrl = new Map<string, MeetupEvent>();
  await Promise.all(
    searches.map(async (query) => {
      let after: string | undefined;
      for (let page = 0; page < PAGES_PER_SEARCH; page++) {
        const res = await run(query, after);
        if (!res.data) throw new Error(res.errors?.[0]?.message ?? "Meetup search failed");
        for (const { node } of res.data.eventSearch.edges) byUrl.set(node.eventUrl, node);
        const { hasNextPage, endCursor } = res.data.eventSearch.pageInfo;
        if (!hasNextPage || !endCursor) break;
        after = endCursor;
      }
    }),
  );
  return [...byUrl.values()].map(fromMeetup);
}

export const meetup: Source = { name: "Meetup", fetch: () => fetchMeetup() };
