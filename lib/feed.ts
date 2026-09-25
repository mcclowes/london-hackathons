import { dateLabel, isThisWeek, timeRange, weekday } from "./format";
import { type Format, type Topic, format, isWeekend, topics } from "./tags";
import type { HackEvent } from "./types";

/** Everything the client feed needs, pre-formatted on the server so London time can't drift on hydration. */
export interface FeedEvent {
  id: string;
  title: string;
  url: string;
  organiser?: string;
  venue?: string;
  sources: string[];
  date: string;
  weekday: string;
  time: string;
  weekend: boolean;
  topics: Topic[];
  format?: Format;
  soon: boolean;
}

export function toFeedEvent(e: HackEvent, now: Date): FeedEvent {
  return {
    id: e.id,
    title: e.title,
    url: e.url,
    organiser: e.organiser,
    venue: e.venue,
    sources: e.sources,
    date: dateLabel(e.start),
    weekday: weekday(e.start),
    time: timeRange(e),
    weekend: isWeekend(e.start),
    topics: topics(e.title),
    format: format(e.venue),
    soon: isThisWeek(e.start, now),
  };
}

export const FILTERS = ["all", "ai", "web3", "in-person", "virtual", "weekend", "weekday"] as const;
export type Filter = (typeof FILTERS)[number];

export function matches(e: FeedEvent, filter: Filter, query: string): boolean {
  const passes =
    filter === "all" ||
    (filter === "ai" && e.topics.includes("AI")) ||
    (filter === "web3" && e.topics.includes("WEB3")) ||
    (filter === "in-person" && e.format === "in-person") ||
    (filter === "virtual" && e.format === "virtual") ||
    (filter === "weekend" && e.weekend) ||
    (filter === "weekday" && !e.weekend);
  if (!passes) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [e.title, e.venue, e.organiser, ...e.topics, ...e.sources]
    .filter(Boolean)
    .some((s) => s!.toLowerCase().includes(q));
}
