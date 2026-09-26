import { toFeedEvent } from "./feed";
import type { HackEvent } from "./types";

const DAY = 86_400_000;
/** How far ahead the email looks. The first week gets top billing; the rest is a heads-up. */
const WEEK = 7 * DAY;
const HORIZON = 28 * DAY;

export interface Roundup {
  /** Dated, so a second cron run on the same day can see the first already went out. */
  name: string;
  subject: string;
  previewText: string;
  html: string;
  text: string;
  count: number;
}

interface Section {
  heading: string;
  events: HackEvent[];
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function londonDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export function sections(events: HackEvent[], now: Date): Section[] {
  const starts = (e: HackEvent) => Date.parse(e.start) - now.getTime();
  return [
    // Already started but not finished counts as this week: it's still worth turning up to the demos.
    { heading: "This week", events: events.filter((e) => starts(e) < WEEK) },
    { heading: "Later this month", events: events.filter((e) => starts(e) >= WEEK && starts(e) < HORIZON) },
  ].filter((s) => s.events.length > 0);
}

function subject(thisWeek: HackEvent[], later: number): string {
  if (thisWeek.length === 0) return `London hackathons: quiet week, ${plural(later, "event")} coming up`;
  if (thisWeek.length === 1) return `London hackathons: ${thisWeek[0].title} this week`;
  return `London hackathons: ${plural(thisWeek.length, "event")} this week`;
}

/** "Sat 10 Oct", time, venue: sentence case, so it sits next to timeRange's "until Sun 11 Oct". */
function when(e: HackEvent, now: Date): string[] {
  const f = toFeedEvent(e, now);
  const month = f.date.slice(0, 1) + f.date.slice(1, 3).toLowerCase();
  return [`${f.weekday} ${f.date.slice(4)} ${month}`, f.time, e.venue].filter((s): s is string => Boolean(s));
}

function eventHtml(e: HackEvent, now: Date): string {
  const meta = when(e, now).map(escape);
  return `<tr><td style="padding:14px 0;border-top:1px solid #e5e5e5">
<a href="${escape(e.url)}" style="color:#0b0b0b;font-size:16px;font-weight:700;text-decoration:none">${escape(e.title)}</a>
<div style="color:#555;font-size:13px;margin-top:4px">${meta.join(" · ")}</div>
${e.organiser ? `<div style="color:#888;font-size:13px;margin-top:2px">${escape(e.organiser)}</div>` : ""}
</td></tr>`;
}

function eventText(e: HackEvent, now: Date): string {
  const meta = when(e, now).join(" · ");
  return `- ${e.title}\n  ${meta}\n  ${e.url}`;
}

/**
 * Builds the weekly email from the aggregated feed.
 * `site` is the public origin, used for the footer links.
 * Returns null when there's nothing in the next four weeks: an empty email is worse than none.
 */
export function buildRoundup(events: HackEvent[], now: Date, site: string): Roundup | null {
  const parts = sections(events, now);
  if (parts.length === 0) return null;

  const thisWeek = parts.find((s) => s.heading === "This week")?.events ?? [];
  const count = parts.reduce((n, s) => n + s.events.length, 0);
  const later = count - thisWeek.length;
  const previewText = thisWeek.length
    ? thisWeek.slice(0, 3).map((e) => e.title).join(", ")
    : `Nothing this week. ${plural(later, "event")} later this month.`;

  // Resend swaps these for a per-recipient link on broadcasts.
  const unsubscribe = "{{{RESEND_UNSUBSCRIBE_URL}}}";

  const html = `<!doctype html>
<html lang="en-GB"><body style="margin:0;background:#f4f4f4">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#0b0b0b">
<p style="margin:0 0 4px;font-size:12px;color:#888">// London hackathons, weekly</p>
<h1 style="margin:0 0 20px;font-size:22px">${escape(subject(thisWeek, later).replace(/^London hackathons: /, ""))}</h1>
${parts
  .map(
    (s) => `<h2 style="margin:24px 0 0;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#888">${s.heading}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${s.events.map((e) => eventHtml(e, now)).join("")}</table>`,
  )
  .join("\n")}
<p style="margin:32px 0 0;font-size:12px;color:#888;line-height:1.6">
<a href="${site}" style="color:#555">Full feed</a> · <a href="${site}/calendar.ics" style="color:#555">Calendar</a> · <a href="${unsubscribe}" style="color:#555">Unsubscribe</a>
</p>
</div>
</body></html>`;

  const text = [
    subject(thisWeek, later),
    ...parts.map((s) => `\n${s.heading.toUpperCase()}\n\n${s.events.map((e) => eventText(e, now)).join("\n\n")}`),
    `\nFull feed: ${site}\nUnsubscribe: ${unsubscribe}`,
  ].join("\n");

  return {
    name: `Weekly roundup ${londonDate(now)}`,
    subject: subject(thisWeek, later),
    previewText,
    html,
    text,
    count,
  };
}
