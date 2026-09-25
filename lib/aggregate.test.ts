import { describe, expect, it } from "vitest";
import { aggregate, dedupe } from "./aggregate";
import type { RawEvent } from "./types";

const NOW = new Date("2026-09-25T12:00:00Z");

const base: RawEvent = {
  title: "Real-Time Video Agents Hack - LDN",
  start: "2026-10-17T09:00:00Z",
  url: "https://luma.com/video-hack",
  source: "Luma",
  lat: 51.52,
  lng: -0.09,
};

describe("dedupe", () => {
  it("merges the same event seen through different sources", () => {
    const events = dedupe([
      { ...base, source: "Luma" },
      { ...base, source: "{Tech: Europe} calendar", organiser: "{Tech: Europe}" },
      { ...base, title: "Real Time Video Agents Hack", url: "https://eventbrite.com/e/1", start: "2026-10-17T00:00:00Z", allDay: true, source: "Eventbrite" },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      url: "https://luma.com/video-hack",
      organiser: "{Tech: Europe}",
      allDay: false,
      sources: ["Luma", "{Tech: Europe} calendar", "Eventbrite"],
    });
  });

  it("keeps distinct events apart", () => {
    expect(dedupe([base, { ...base, url: "https://luma.com/other", start: "2026-10-18T09:00:00Z" }])).toHaveLength(2);
  });
});

describe("aggregate", () => {
  it("filters to upcoming London hackathons and reports source health", async () => {
    const result = await aggregate(
      [
        {
          name: "good",
          fetch: async () => [
            base,
            { ...base, title: "Networking breakfast", url: "https://luma.com/b" },
            { ...base, url: "https://luma.com/berlin", lat: 52.5, lng: 13.4 },
            { ...base, url: "https://luma.com/past", start: "2026-09-01T09:00:00Z" },
            { ...base, title: "Some MLH event", url: "https://mlh.dev", knownHackathon: true, start: "2026-10-01T09:00:00Z" },
          ],
        },
        { name: "broken", fetch: async () => { throw new Error("503 from x"); } },
      ],
      NOW,
    );
    expect(result.events.map((e) => e.title)).toEqual(["Some MLH event", "Real-Time Video Agents Hack - LDN"]);
    expect(result.sources).toEqual([
      { name: "good", ok: true, count: 2 },
      { name: "broken", ok: false, count: 0, error: "503 from x" },
    ]);
  });
});
