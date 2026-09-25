import { fetchText } from "../http";
import type { RawEvent, Source } from "../types";

interface LdEvent {
  name: string;
  startDate: string;
  endDate?: string;
  url: string;
  location?: {
    name?: string;
    address?: { addressLocality?: string; streetAddress?: string };
    geo?: { latitude?: string; longitude?: string };
  };
}

const SEARCHES = ["hackathon", "hack-day", "game-jam"];
const PAGES_PER_SEARCH = 2;

/** Search pages embed an ItemList of schema.org Events as JSON-LD. */
export function parseEventbritePage(html: string): LdEvent[] {
  const blocks = html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
  return [...blocks].flatMap(([, json]) => {
    try {
      const data = JSON.parse(json);
      return (data.itemListElement ?? []).map((i: { item: LdEvent }) => i.item);
    } catch {
      return [];
    }
  });
}

export function fromEventbrite(e: LdEvent): RawEvent {
  const lat = Number(e.location?.geo?.latitude);
  const lng = Number(e.location?.geo?.longitude);
  const address = e.location?.address;
  return {
    title: e.name,
    start: new Date(e.startDate).toISOString(),
    end: e.endDate ? new Date(e.endDate).toISOString() : undefined,
    allDay: !e.startDate.includes("T"),
    url: e.url.split("?")[0],
    source: "Eventbrite",
    venue: [e.location?.name, address?.addressLocality].filter(Boolean).join(", ") || undefined,
    lat: Number.isFinite(lat) && e.location?.geo ? lat : undefined,
    lng: Number.isFinite(lng) && e.location?.geo ? lng : undefined,
  };
}

export const eventbrite: Source = {
  name: "Eventbrite",
  async fetch() {
    const urls = SEARCHES.flatMap((q) =>
      Array.from(
        { length: PAGES_PER_SEARCH },
        (_, i) => `https://www.eventbrite.co.uk/d/united-kingdom--london/${q}/?page=${i + 1}`,
      ),
    );
    const pages = await Promise.all(urls.map(fetchText));
    return pages.flatMap(parseEventbritePage).map(fromEventbrite);
  },
};
