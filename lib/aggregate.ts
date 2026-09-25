import { isBuildSession, isHackathon } from "./classify";
import { isInLondon } from "./london";
import { cerebralValley } from "./sources/cerebralValley";
import { curated } from "./sources/curated";
import { devpost } from "./sources/devpost";
import { eventbrite } from "./sources/eventbrite";
import { lumaCalendars, lumaDiscover } from "./sources/luma";
import { meetup } from "./sources/meetup";
import { mlh } from "./sources/mlh";
import type { HackEvent, RawEvent, Source, SourceResult } from "./types";

export const SOURCES: Source[] = [lumaDiscover, lumaCalendars, curated, devpost, mlh, eventbrite, meetup, cerebralValley];

export interface Aggregation {
  events: HackEvent[];
  sources: SourceResult[];
  generatedAt: string;
}

function londonDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(london|ldn|uk|2\d{3})\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function canonicalUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase();
}

function stableId(e: RawEvent): string {
  let hash = 0;
  for (const ch of canonicalUrl(e.url) + londonDay(e.start)) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return (hash >>> 0).toString(36);
}

export function isRelevant(e: RawEvent, now: Date): boolean {
  const finishes = Date.parse(e.end ?? e.start);
  return (
    finishes >= now.getTime() &&
    isInLondon(e) &&
    (e.knownHackathon === true ||
      isHackathon(e.title) ||
      (e.followedOrganiser === true && isBuildSession(e.title)))
  );
}

/** Timed, located records beat date-only ones when two sources describe one event. */
function richness(e: RawEvent): number {
  return (e.allDay ? 0 : 2) + (e.lat != null ? 1 : 0) + (e.organiser ? 1 : 0);
}

export function dedupe(events: RawEvent[]): HackEvent[] {
  const groups: RawEvent[][] = [];
  const byKey = new Map<string, RawEvent[]>();

  for (const e of events) {
    const keys = [canonicalUrl(e.url), `${normaliseTitle(e.title)}@${londonDay(e.start)}`];
    const group = keys.map((k) => byKey.get(k)).find(Boolean);
    const target = group ?? [];
    if (!group) groups.push(target);
    target.push(e);
    for (const k of keys) byKey.set(k, target);
  }

  return groups.map((group) => {
    const best = [...group].sort((a, b) => richness(b) - richness(a))[0];
    return {
      id: stableId(best),
      title: best.title,
      start: best.start,
      end: best.end,
      allDay: best.allDay ?? false,
      url: best.url,
      organiser: best.organiser ?? group.find((e) => e.organiser)?.organiser,
      venue: best.venue ?? group.find((e) => e.venue)?.venue,
      sources: [...new Set(group.map((e) => e.source))],
    };
  });
}

export async function aggregate(sources = SOURCES, now = new Date()): Promise<Aggregation> {
  const settled = await Promise.allSettled(sources.map((s) => s.fetch()));

  const results: SourceResult[] = [];
  const relevant: RawEvent[] = [];
  settled.forEach((r, i) => {
    const name = sources[i].name;
    if (r.status === "rejected") {
      results.push({ name, ok: false, count: 0, error: String(r.reason?.message ?? r.reason) });
      return;
    }
    const kept = r.value.filter((e) => isRelevant(e, now));
    relevant.push(...kept);
    results.push({ name, ok: true, count: kept.length });
  });

  const events = dedupe(relevant).sort((a, b) => a.start.localeCompare(b.start));
  return { events, sources: results, generatedAt: now.toISOString() };
}
