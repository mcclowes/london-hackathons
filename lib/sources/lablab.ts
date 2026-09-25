import { fetchText } from "../http";
import { decodeFlight, flightObjects } from "../nextData";
import type { RawEvent, Source } from "../types";

export interface LablabEvent {
  name: string;
  slug: string;
  type: string;
  eventType: "ONLINE" | "HYBRID" | "ONSITE" | string;
  startAt: string;
  endAt: string;
  description?: string | null;
}

function isLablabEvent(o: Record<string, unknown>): o is Record<string, unknown> & LablabEvent {
  return typeof o.slug === "string" && typeof o.startAt === "string" && typeof o.eventType === "string";
}

export function parseLablabPage(html: string): LablabEvent[] {
  const bySlug = new Map<string, LablabEvent>();
  for (const o of flightObjects(decodeFlight(html), "id")) {
    if (isLablabEvent(o) && o.type === "HACKATHON") bySlug.set(o.slug, o);
  }
  if (bySlug.size === 0) throw new Error("lablab page structure changed");
  return [...bySlug.values()];
}

/**
 * Venues load client-side and the JSON-LD only lists the online side, so an in-person
 * leg in London is only visible in the description ("Join the hack in London, ...").
 * Events with a London leg are sometimes still typed ONLINE, so the mention wins.
 */
function venueName(e: LablabEvent): string {
  if (/\bLondon\b/.test(e.description ?? "")) return "London";
  return e.eventType === "ONLINE" ? "Online" : `${e.eventType.toLowerCase()}, venue unknown`;
}

export function fromLablab(e: LablabEvent): RawEvent {
  return {
    title: e.name,
    start: e.startAt,
    end: e.endAt,
    url: `https://lablab.ai/ai-hackathons/${e.slug}`,
    source: "lablab.ai",
    organiser: "lablab.ai",
    venue: venueName(e),
    knownHackathon: true,
  };
}

export const lablab: Source = {
  name: "lablab.ai",
  fetch: async () => parseLablabPage(await fetchText("https://lablab.ai/ai-hackathons")).map(fromLablab),
};
