import { describe, expect, it } from "vitest";
import { fromDevpost, parseDevpostDates } from "./devpost";
import { fetchCurated, fromPartiful, lumaSlug, partifulId, type PartifulPage } from "./curated";
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

describe("curated", () => {
  it.each([
    ["claude-hd83", "claude-hd83"],
    ["https://luma.com/claude-hd83", "claude-hd83"],
    ["https://lu.ma/claude-hd83?tk=abc", "claude-hd83"],
  ])("reads the Luma slug from %s", (input, slug) => expect(lumaSlug(input)).toBe(slug));

  it("returns null for non-Luma URLs", () => expect(lumaSlug("https://example.com/hack")).toBeNull());

  it("reads Partiful IDs", () => {
    expect(partifulId("https://partiful.com/e/pQHQrWPg1A6P31AYZMTd?c=x")).toBe("pQHQrWPg1A6P31AYZMTd");
    expect(partifulId("https://luma.com/claude-hd83")).toBeNull();
  });

  const partifulPage = (locationInfo: PartifulPage["event"]["locationInfo"], timezone = "Europe/London"): PartifulPage => ({
    event: { id: "abc", title: "Agents Hack", startDate: "2026-10-03T09:00:00.000Z", timezone, locationInfo },
    hosts: [{ name: "Hack Co" }],
  });

  it.each([
    ["structured", { type: "structured", displayName: "Datadog", displayAddressLines: ["1 Fore St", "London EC2Y 9DT"] }, "Datadog, 1 Fore St, London EC2Y 9DT"],
    ["freeform", { type: "freeform", value: "Shoreditch, London" }, "Shoreditch, London"],
    ["approximate", { type: "structured", mapsInfo: { approximateLocation: "London, UK" } }, "London, UK"],
    ["hidden", { type: "freeform", value: "" }, "London"],
  ])("maps a %s Partiful location", (_, locationInfo, venue) => {
    expect(fromPartiful(partifulPage(locationInfo))).toMatchObject({
      url: "https://partiful.com/e/abc",
      organiser: "Hack Co",
      venue,
    });
  });

  it("does not assume London for hidden venues outside the UK", () => {
    expect(fromPartiful(partifulPage(null, "America/New_York")).venue).toBeUndefined();
  });

  it("resolves Luma and Partiful links and trusts every curated event", async () => {
    const luma = async (slug: string) => ({
      event: { name: "Builder Cohort", start_at: "2026-10-01T13:00:00Z", url: slug, coordinate: null },
      calendar: { name: "Claude Startups" },
    });
    const partiful = async () => partifulPage({ type: "freeform", value: "London" });
    const events = await fetchCurated(
      [
        "https://luma.com/claude-hd83",
        "https://partiful.com/e/abc",
        { title: "Off-Luma Hack", start: "2026-10-02", allDay: true, url: "https://example.com/hack", venue: "London" },
      ],
      { luma, partiful },
    );
    expect(events).toEqual([
      expect.objectContaining({ title: "Builder Cohort", url: "https://luma.com/claude-hd83", organiser: "Claude Startups", source: "Curated", knownHackathon: true }),
      expect.objectContaining({ title: "Agents Hack", url: "https://partiful.com/e/abc", source: "Curated", knownHackathon: true }),
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
