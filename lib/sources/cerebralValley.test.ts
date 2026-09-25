import { describe, expect, it } from "vitest";
import { fetchCerebralValley, fromCerebralValley, type CvEvent } from "./cerebralValley";

const event = (overrides: Partial<CvEvent> = {}): CvEvent => ({
  name: "Encode Hackathon and Conference",
  url: "https://luma.com/encode-london-2026",
  startDateTime: "2026-10-23 09:00:00",
  endDateTime: "2026-10-25 16:30:00",
  venue: "Encode Hub",
  ...overrides,
});

describe("fromCerebralValley", () => {
  it("reads zoneless times as UTC and assumes London for bare building names", () => {
    expect(fromCerebralValley(event())).toMatchObject({
      start: "2026-10-23T09:00:00.000Z",
      end: "2026-10-25T16:30:00.000Z",
      venue: "Encode Hub, London",
      source: "Cerebral Valley",
    });
    expect(fromCerebralValley(event({ venue: null, endDateTime: null }))).toMatchObject({ venue: "London", end: undefined });
  });

  it("keeps venues that name another city, so the London check drops them", () => {
    expect(fromCerebralValley(event({ venue: "Leeds Trinity University City Campus" })).venue).toBe(
      "Leeds Trinity University City Campus",
    );
  });
});

describe("fetchCerebralValley", () => {
  it("reads every page", async () => {
    const offsets: number[] = [];
    const events = await fetchCerebralValley(async (offset) => {
      offsets.push(offset);
      return { totalCount: 250, events: [event({ name: `at ${offset}` })] };
    });
    expect(offsets.sort((a, b) => a - b)).toEqual([0, 100, 200]);
    expect(events.map((e) => e.title)).toEqual(["at 0", "at 100", "at 200"]);
  });
});
