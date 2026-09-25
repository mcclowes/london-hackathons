import { fetchText } from "../http";
import type { RawEvent, Source } from "../types";

interface MlhEvent {
  name: string;
  startsAt: string;
  endsAt?: string;
  url: string;
  websiteUrl?: string;
  location?: string;
  formatType?: string;
  venueAddress?: { city?: string; country?: string };
}

/** MLH seasons run July to June and are named after the year they end. */
export function currentSeason(now = new Date()): number {
  return now.getUTCFullYear() + (now.getUTCMonth() >= 6 ? 1 : 0);
}

/** The events page is an Inertia app that embeds its props as JSON. */
export function parseMlhPage(html: string): MlhEvent[] {
  const json = html.match(/data-page="app" type="application\/json">(.*?)<\/script>/s)?.[1];
  if (!json) throw new Error("MLH page structure changed");
  return JSON.parse(json).props.upcomingEvents ?? [];
}

export function fromMlh(e: MlhEvent): RawEvent {
  return {
    title: e.name,
    start: e.startsAt,
    end: e.endsAt,
    url: e.websiteUrl || `https://www.mlh.com${e.url}`,
    source: "MLH",
    organiser: "MLH member event",
    venue: e.formatType === "digital" ? "Online" : e.location,
    knownHackathon: true,
  };
}

export const mlh: Source = {
  name: "MLH",
  async fetch() {
    const html = await fetchText(`https://www.mlh.com/seasons/${currentSeason()}/events`);
    return parseMlhPage(html).map(fromMlh);
  },
};
