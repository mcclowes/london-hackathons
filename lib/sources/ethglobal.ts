import { fetchText } from "../http";
import { decodeFlight } from "../nextData";
import type { RawEvent, Source } from "../types";

export interface EthGlobalEvent {
  name: string;
  slug: string;
  type: string;
  medium?: string;
  status?: string;
  startTime: string;
  endTime?: string | null;
  website?: string | null;
  city?: { name?: string; country?: { name?: string } } | null;
}

/** The events page streams every ETHGlobal event, past and future, as one `"events":[...]` array. */
export function parseEthGlobalPage(html: string): EthGlobalEvent[] {
  const flight = decodeFlight(html);
  const at = flight.indexOf('"events":[');
  if (at < 0) throw new Error("ETHGlobal page structure changed");
  return JSON.parse(sliceJsonArray(flight, at + '"events":'.length));
}

/** The array sits mid-stream, so read up to its matching bracket. */
function sliceJsonArray(text: string, start: number): string {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "[" || ch === "{") depth++;
    else if ((ch === "]" || ch === "}") && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("ETHGlobal events array is unterminated");
}

export function fromEthGlobal(e: EthGlobalEvent): RawEvent {
  const place = [e.city?.name, e.city?.country?.name].filter(Boolean).join(", ");
  return {
    title: e.name,
    start: e.startTime,
    end: e.endTime ?? undefined,
    url: e.type === "hackathon" || !e.website ? `https://ethglobal.com/events/${e.slug}` : e.website.split("?")[0],
    source: "ETHGlobal",
    organiser: "ETHGlobal",
    venue: e.medium === "virtual" ? "Online" : place || undefined,
    ...(e.type === "hackathon" && { knownHackathon: true }),
  };
}

export const ethGlobal: Source = {
  name: "ETHGlobal",
  async fetch() {
    const events = parseEthGlobalPage(await fetchText("https://ethglobal.com/events"));
    return events.filter((e) => e.status !== "cancelled").map(fromEthGlobal);
  },
};
