import { describe, expect, it } from "vitest";
import { fetchMeetup, fromMeetup, type MeetupEvent } from "./meetup";

const event = (overrides: Partial<MeetupEvent> = {}): MeetupEvent => ({
  title: "Databricks UK Innovation Hackathon",
  dateTime: "2026-10-10T09:00:00+01:00",
  endTime: "2026-10-10T18:00:00+01:00",
  eventUrl: "https://www.meetup.com/data-london/events/1/",
  eventType: "PHYSICAL",
  group: { name: "Data London" },
  venues: [{ name: "Colibri Digital", lat: 51.52, lon: -0.08, city: "London" }],
  ...overrides,
});

describe("fromMeetup", () => {
  it("maps venue, coordinates and group", () => {
    expect(fromMeetup(event())).toMatchObject({
      start: "2026-10-10T08:00:00.000Z",
      end: "2026-10-10T17:00:00.000Z",
      organiser: "Data London",
      venue: "Colibri Digital, London",
      lat: 51.52,
      lng: -0.08,
      source: "Meetup",
    });
  });

  it("ignores the placeholder venue on online events", () => {
    const online = fromMeetup(event({ eventType: "ONLINE", venues: [{ name: "Online event", lat: -8.5, lon: 179.2 }] }));
    expect(online).toMatchObject({ venue: "Online", lat: undefined, lng: undefined });
  });

  it("assumes London for in-person events with a hidden venue", () => {
    expect(fromMeetup(event({ venues: [] })).venue).toBe("London");
    expect(fromMeetup(event({ venues: null })).venue).toBe("London");
  });
});

describe("fetchMeetup", () => {
  it("pages through each search and drops repeats", async () => {
    const calls: [string, string | undefined][] = [];
    const events = await fetchMeetup(["hackathon", "jam"], async (query, after) => {
      calls.push([query, after]);
      const url = `https://www.meetup.com/g/events/${query}-${after ?? "first"}/`;
      return {
        data: {
          eventSearch: {
            pageInfo: { hasNextPage: after == null, endCursor: "MTAw" },
            edges: [{ node: event() }, { node: event({ eventUrl: url }) }],
          },
        },
      };
    });
    expect(calls).toEqual([
      ["hackathon", undefined],
      ["jam", undefined],
      ["hackathon", "MTAw"],
      ["jam", "MTAw"],
    ]);
    expect(events).toHaveLength(5);
  });

  it("surfaces GraphQL errors", async () => {
    await expect(fetchMeetup(["x"], async () => ({ errors: [{ message: "nope" }] }))).rejects.toThrow("nope");
  });
});
