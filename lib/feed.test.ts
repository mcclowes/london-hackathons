import { describe, expect, it } from "vitest";
import { matches, toFeedEvent } from "./feed";
import { googleCalendarUrl } from "./format";
import type { HackEvent } from "./types";

const event: HackEvent = {
  id: "a",
  title: "Onchain AI agents hack",
  start: "2026-10-24T08:00:00Z",
  end: "2026-10-24T20:00:00Z",
  allDay: false,
  url: "https://lu.ma/x",
  venue: "Foundry, Hackney Wick",
  organiser: "Encode",
  sources: ["luma"],
};
const feed = toFeedEvent(event, new Date("2026-10-01T00:00:00Z"));

describe("toFeedEvent", () => {
  it("formats in London time", () => {
    expect(feed).toMatchObject({ date: "OCT 24", weekday: "Sat", time: "09:00–21:00", weekend: true });
    expect(feed).toMatchObject({ topics: ["AI", "WEB3"], format: "in-person" });
    expect(feed.soon).toBeUndefined();
  });
});

describe("soon", () => {
  it.each([
    ["2026-10-24T07:00:00Z", "today"],
    ["2026-10-23T22:00:00Z", "today"], // started last night, still running
    ["2026-10-24T23:30:00Z", "tomorrow"], // 00:30 BST on the 25th
    ["2026-10-30T12:00:00Z", "this week"],
    ["2026-10-31T12:00:00Z", undefined],
  ])("%s is %s", (start, expected) => {
    expect(toFeedEvent({ ...event, start }, new Date("2026-10-24T06:00:00Z")).soon).toBe(expected);
  });
});

describe("matches", () => {
  it.each([
    ["all", "", true],
    ["web3", "", true],
    ["virtual", "", false],
    ["weekday", "", false],
    ["all", "hackney", true],
    ["all", "encode", true],
    ["ai", "python", false],
  ] as const)("%s + %j → %s", (filter, query, expected) => expect(matches(feed, filter, query)).toBe(expected));
});

describe("googleCalendarUrl", () => {
  it("uses UTC stamps for timed events", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20261024T080000Z/20261024T200000Z");
    expect(url.searchParams.get("location")).toBe("Foundry, Hackney Wick");
  });

  it("uses an exclusive end date for all-day events", () => {
    const url = new URL(googleCalendarUrl({ ...event, allDay: true, start: "2026-10-24T00:00:00+01:00", end: "2026-10-25T00:00:00+01:00" }));
    expect(url.searchParams.get("dates")).toBe("20261024/20261026");
  });
});
