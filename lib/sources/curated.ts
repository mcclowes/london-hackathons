import { fetchJson } from "../http";
import type { RawEvent, Source } from "../types";
import { fromDiscoverEntry, type DiscoverEntry } from "./luma";

type ManualEvent = Omit<RawEvent, "source">;

/**
 * Events added by hand, usually from the submission form. A Luma URL is enough;
 * anything off Luma needs a full record. Past events drop out on their own.
 */
export const CURATED: (string | ManualEvent)[] = [];

export function lumaSlug(input: string): string | null {
  if (!input.includes("/")) return input;
  const m = input.match(/^https?:\/\/(?:www\.)?(?:lu\.ma|luma\.com)\/([\w.-]+)/);
  return m?.[1] ?? null;
}

type LumaLookup = (slug: string) => Promise<DiscoverEntry>;

const lookupLuma: LumaLookup = async (slug) =>
  (await fetchJson<{ data: DiscoverEntry }>(`https://api.lu.ma/url?url=${encodeURIComponent(slug)}`)).data;

export async function fetchCurated(entries = CURATED, lookup = lookupLuma): Promise<RawEvent[]> {
  const settled = await Promise.allSettled(
    entries.map(async (entry): Promise<RawEvent> => {
      if (typeof entry !== "string") return { ...entry, source: "Curated", knownHackathon: true };
      const slug = lumaSlug(entry);
      if (!slug) throw new Error(`not a Luma URL: ${entry}`);
      return { ...fromDiscoverEntry(await lookup(slug)), source: "Curated", knownHackathon: true };
    }),
  );
  const failed = settled.filter((r) => r.status === "rejected");
  if (failed.length > 0 && failed.length === entries.length) throw failed[0].reason;
  for (const r of failed) console.warn("curated entry skipped:", r.reason);
  return settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

export const curated: Source = { name: "Curated", fetch: () => fetchCurated() };
