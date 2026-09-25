import type { RawEvent } from "./types";

export interface LdEvent {
  "@type"?: string | string[];
  name: string;
  startDate: string;
  endDate?: string;
  url: string;
  location?: {
    "@type"?: string;
    name?: string;
    address?: string | { addressLocality?: string; streetAddress?: string };
    geo?: { latitude?: string | number; longitude?: string | number };
  };
  organizer?: { name?: string } | { name?: string }[];
}

function isEvent(node: unknown): node is LdEvent {
  if (typeof node !== "object" || node == null) return false;
  const type = (node as LdEvent)["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && t.endsWith("Event")) || "startDate" in node;
}

/** Events anywhere in a JSON-LD document: top level, in an @graph, or in an ItemList. */
function collectEvents(node: unknown): LdEvent[] {
  if (Array.isArray(node)) return node.flatMap(collectEvents);
  if (typeof node !== "object" || node == null) return [];
  if (isEvent(node)) return [node];
  const n = node as { "@graph"?: unknown; itemListElement?: { item?: unknown }[] };
  return [...collectEvents(n["@graph"]), ...collectEvents((n.itemListElement ?? []).map((i) => i.item ?? i))];
}

export function parseLdEvents(html: string): LdEvent[] {
  const blocks = html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs);
  return [...blocks].flatMap(([, json]) => {
    try {
      return collectEvents(JSON.parse(json));
    } catch {
      return [];
    }
  });
}

function coordinate(value: string | number | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function fromLdEvent(e: LdEvent, source: string): RawEvent {
  const location = e.location;
  const online = location?.["@type"] === "VirtualLocation";
  const address = typeof location?.address === "string" ? location.address : location?.address?.addressLocality;
  const place = [location?.name, address && !location?.name?.includes(address) ? address : undefined];
  const organizer = Array.isArray(e.organizer) ? e.organizer[0] : e.organizer;
  return {
    title: e.name,
    start: new Date(e.startDate).toISOString(),
    end: e.endDate ? new Date(e.endDate).toISOString() : undefined,
    allDay: !e.startDate.includes("T"),
    url: e.url.split("?")[0],
    source,
    organiser: organizer?.name,
    venue: online ? "Online" : place.filter(Boolean).join(", ") || undefined,
    lat: coordinate(location?.geo?.latitude),
    lng: coordinate(location?.geo?.longitude),
  };
}
