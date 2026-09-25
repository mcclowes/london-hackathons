import { fetchJson, fetchText } from "../http";
import { parseNextData } from "../nextData";
import type { RawEvent, Source } from "../types";
import { fromDiscoverEntry, type DiscoverEntry } from "./luma";

type ManualEvent = Omit<RawEvent, "source">;

/**
 * Events added by hand, usually from the submission form. A Luma or Partiful URL is
 * enough; anything else needs a full record. Past events drop out on their own.
 */
export const CURATED: (string | ManualEvent)[] = [];

export function lumaSlug(input: string): string | null {
  if (!input.includes("/")) return input;
  const m = input.match(/^https?:\/\/(?:www\.)?(?:lu\.ma|luma\.com)\/([\w.-]+)/);
  return m?.[1] ?? null;
}

export function partifulId(input: string): string | null {
  return input.match(/^https?:\/\/(?:www\.)?partiful\.com\/e\/(\w+)/)?.[1] ?? null;
}

export interface PartifulEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  timezone?: string | null;
  locationInfo?: {
    type?: string;
    value?: string;
    displayName?: string;
    displayAddressLines?: string[];
    mapsInfo?: { addressLines?: string[]; approximateLocation?: string };
  } | null;
}

export interface PartifulPage {
  event: PartifulEvent;
  hosts?: { name?: string }[] | null;
}

function partifulVenue({ locationInfo: loc, timezone }: PartifulEvent): string | undefined {
  const lines = loc?.displayAddressLines ?? loc?.mapsInfo?.addressLines ?? [];
  const venue = loc?.type === "freeform" ? loc.value : [loc?.displayName, ...lines].filter(Boolean).join(", ");
  if (venue?.trim()) return venue;
  if (loc?.mapsInfo?.approximateLocation) return loc.mapsInfo.approximateLocation;
  // Hosts often hide the address until you RSVP; a curated UK event is assumed to be in London.
  return timezone === "Europe/London" ? "London" : undefined;
}

export function fromPartiful({ event, hosts }: PartifulPage): ManualEvent {
  return {
    title: event.title,
    start: event.startDate,
    end: event.endDate ?? undefined,
    url: `https://partiful.com/e/${event.id}`,
    organiser: hosts?.[0]?.name,
    venue: partifulVenue(event),
  };
}

export interface Resolvers {
  luma: (slug: string) => Promise<DiscoverEntry>;
  partiful: (id: string) => Promise<PartifulPage>;
}

const liveResolvers: Resolvers = {
  luma: async (slug) =>
    (await fetchJson<{ data: DiscoverEntry }>(`https://api.lu.ma/url?url=${encodeURIComponent(slug)}`)).data,
  partiful: async (id) =>
    parseNextData<{ props: { pageProps: PartifulPage } }>(await fetchText(`https://partiful.com/e/${id}`)).props.pageProps,
};

async function resolve(entry: string, resolvers: Resolvers): Promise<ManualEvent> {
  const partiful = partifulId(entry);
  if (partiful) return fromPartiful(await resolvers.partiful(partiful));
  const slug = lumaSlug(entry);
  if (slug) return fromDiscoverEntry(await resolvers.luma(slug));
  throw new Error(`not a Luma or Partiful URL: ${entry}`);
}

export async function fetchCurated(entries = CURATED, resolvers = liveResolvers): Promise<RawEvent[]> {
  const settled = await Promise.allSettled(
    entries.map(async (entry): Promise<RawEvent> => {
      const event = typeof entry === "string" ? await resolve(entry, resolvers) : entry;
      return { ...event, source: "Curated", knownHackathon: true };
    }),
  );
  const failed = settled.filter((r) => r.status === "rejected");
  if (failed.length > 0 && failed.length === entries.length) throw failed[0].reason;
  for (const r of failed) console.warn("curated entry skipped:", r.reason);
  return settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

export const curated: Source = { name: "Curated", fetch: () => fetchCurated() };
