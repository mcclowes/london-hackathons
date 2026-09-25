import { describe, expect, it } from "vitest";
import { fromDevpost, parseDevpostDates } from "./devpost";
import { fetchCurated, lumaSlug } from "./curated";
import { fromEventbrite, parseEventbritePage } from "./eventbrite";
import { fetchDiscoverEntries, fromDiscoverEntry, ORGANISER_CALENDARS, suggestCalendars } from "./luma";
import { currentSeason, fromMlh, parseMlhPage } from "./mlh";

describe("parseDevpostDates", () => {
  it.each([
    ["Sep 25, 2026", "2026-09-25", "2026-09-25"],
    ["Sep 25 - 28, 2026", "2026-09-25", "2026-09-28"],
    ["Sep 22 - Oct 15, 2026", "2026-09-22", "2026-10-15"],
    ["Dec 28, 2026 - Jan 02, 2027", "2026-12-28", "2027-01-02"],
  ])("%s", (text, start, end) => {
    const d = parseDevpostDates(text);
    expect(d?.start.slice(0, 10)).toBe(start);
    expect(d?.end.slice(0, 10)).toBe(end);
  });

  it("returns null for unknown formats, and fromDevpost skips them", () => {
    expect(parseDevpostDates("Ongoing")).toBeNull();
    expect(
      fromDevpost({ title: "x", url: "u", submission_period_dates: "TBC", displayed_location: { location: "London" } }),
    ).toBeNull();
  });
});

describe("MLH", () => {
  it("names seasons after the year they end", () => {
    expect(currentSeason(new Date("2026-09-25"))).toBe(2027);
    expect(currentSeason(new Date("2027-03-01"))).toBe(2027);
  });

  it("reads embedded Inertia props", () => {
    const props = {
      props: {
        upcomingEvents: [
          { name: "IKU Hack", startsAt: "2026-10-17T13:00:00Z", url: "/events/iku/prizes", websiteUrl: "https://iku.dev", location: "London, London", formatType: "physical" },
        ],
      },
    };
    const html = `<script data-page="app" type="application/json">${JSON.stringify(props)}</script>`;
    const [e] = parseMlhPage(html).map(fromMlh);
    expect(e).toMatchObject({ title: "IKU Hack", url: "https://iku.dev", venue: "London, London", knownHackathon: true });
  });

  it("fails loudly when the page shape changes", () => {
    expect(() => parseMlhPage("<html></html>")).toThrow(/structure changed/);
  });
});

describe("Eventbrite", () => {
  it("reads JSON-LD item lists", () => {
    const ld = {
      itemListElement: [
        {
          item: {
            name: "AI Jam London",
            startDate: "2026-10-10",
            endDate: "2026-10-11",
            url: "https://www.eventbrite.com/e/ai-jam-london-tickets-1?aff=x",
            location: { name: "106 Bunhill Row", address: { addressLocality: "London" }, geo: { latitude: "51.52", longitude: "-0.09" } },
          },
        },
      ],
    };
    const html = `<script type="application/ld+json">${JSON.stringify(ld)}</script><script type="application/ld+json">{bad</script>`;
    const [e] = parseEventbritePage(html).map(fromEventbrite);
    expect(e).toMatchObject({
      url: "https://www.eventbrite.com/e/ai-jam-london-tickets-1",
      allDay: true,
      lat: 51.52,
      venue: "106 Bunhill Row, London",
    });
  });
});

describe("curated", () => {
  it.each([
    ["claude-hd83", "claude-hd83"],
    ["https://luma.com/claude-hd83", "claude-hd83"],
    ["https://lu.ma/claude-hd83?tk=abc", "claude-hd83"],
  ])("reads the Luma slug from %s", (input, slug) => expect(lumaSlug(input)).toBe(slug));

  it("returns null for non-Luma URLs", () => expect(lumaSlug("https://example.com/hack")).toBeNull());

  it("fetches Luma entries and trusts every curated event", async () => {
    const lookup = async (slug: string) => ({
      event: { name: "Builder Cohort", start_at: "2026-10-01T13:00:00Z", url: slug, coordinate: null },
      calendar: { name: "Claude Startups" },
    });
    const events = await fetchCurated(
      ["https://luma.com/claude-hd83", { title: "Off-Luma Hack", start: "2026-10-02", allDay: true, url: "https://example.com/hack", venue: "London" }],
      lookup,
    );
    expect(events).toEqual([
      expect.objectContaining({ title: "Builder Cohort", url: "https://luma.com/claude-hd83", organiser: "Claude Startups", source: "Curated", knownHackathon: true }),
      expect.objectContaining({ title: "Off-Luma Hack", source: "Curated", knownHackathon: true }),
    ]);
  });
});

describe("Luma discover", () => {
  const entry = (id: string, calendar: { api_id: string; name: string }, name = "London Hackathon") => ({
    event: { api_id: id, name, start_at: "2026-10-01T09:00:00Z", url: id, coordinate: null },
    calendar,
  });

  it("marks events from followed calendars", () => {
    const followed = fromDiscoverEntry(entry("a", { api_id: ORGANISER_CALENDARS[0].id, name: "x" }));
    const other = fromDiscoverEntry(entry("b", { api_id: "cal-other", name: "Other" }));
    expect(followed.followedOrganiser).toBe(true);
    expect(other.followedOrganiser).toBeUndefined();
  });

  it("runs every query and drops repeats", async () => {
    const seen: string[] = [];
    const entries = await fetchDiscoverEntries(["", "hackathon"], async (query) => {
      seen.push(query);
      return [entry("a", { api_id: "cal-1", name: "One" }), entry(query || "base", { api_id: "cal-1", name: "One" })];
    });
    expect(seen).toEqual(["", "hackathon"]);
    expect(entries.map((e) => e.event.api_id)).toEqual(["a", "base", "hackathon"]);
  });
});

describe("suggestCalendars", () => {
  it("ranks unfollowed calendars by build sessions, then London events", () => {
    const e = (cal: string, name: string) => ({
      event: { api_id: `${cal}-${name}`, name, start_at: "2026-10-01T09:00:00Z", url: "x", coordinate: null },
      calendar: { api_id: cal, name: cal, slug: cal },
    });
    const ranked = suggestCalendars(
      [
        e("cal-busy", "Dinner"),
        e("cal-busy", "Breakfast"),
        e("cal-busy", "Drinks"),
        e("cal-hacks", "Agents Hackathon"),
        e("cal-hacks", "Networking"),
        { ...e("cal-personal", "Hackathon"), calendar: { api_id: "cal-personal", name: "Personal", slug: null } },
        e(ORGANISER_CALENDARS[0].id, "Hackathon"),
      ],
      new Set([ORGANISER_CALENDARS[0].id]),
    );
    expect(ranked.map((c) => [c.id, c.builds, c.events])).toEqual([
      ["cal-hacks", 1, 2],
      ["cal-busy", 0, 3],
    ]);
    expect(ranked[0].titles).toEqual(["Agents Hackathon", "Networking"]);
  });
});
