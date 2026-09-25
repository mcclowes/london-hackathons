import { describe, expect, it } from "vitest";
import { fromDevpost, parseDevpostDates } from "./devpost";
import { fetchCurated, lumaSlug } from "./curated";
import { fromEventbrite, parseEventbritePage } from "./eventbrite";
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
