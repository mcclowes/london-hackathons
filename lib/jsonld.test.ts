import { describe, expect, it } from "vitest";
import { fromLdEvent, parseLdEvents } from "./jsonld";
import { decodeFlight, parseNextData } from "./nextData";

const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

describe("parseLdEvents", () => {
  it("reads item lists, graphs and bare events, and skips bad blocks", () => {
    const html = [
      ld({ itemListElement: [{ item: { name: "A", startDate: "2026-10-10", url: "a" } }] }),
      ld({ "@graph": [{ "@type": "WebSite" }, { "@type": "Event", name: "B", startDate: "2026-10-11", url: "b" }] }),
      ld({ "@type": ["Event", "Hackathon"], name: "C", startDate: "2026-10-12", url: "c" }),
      ld({ "@type": "ItemList", itemListElement: [{ "@type": "ListItem", name: "Not an event", url: "d" }] }),
      '<script type="application/ld+json">{bad</script>',
    ].join("");
    expect(parseLdEvents(html).map((e) => e.name)).toEqual(["A", "B", "C"]);
  });
});

describe("fromLdEvent", () => {
  it("maps places, coordinates and date-only events", () => {
    const e = fromLdEvent(
      {
        name: "AI Jam London",
        startDate: "2026-10-10",
        endDate: "2026-10-11",
        url: "https://www.eventbrite.com/e/ai-jam-london-tickets-1?aff=x",
        location: { name: "106 Bunhill Row", address: { addressLocality: "London" }, geo: { latitude: "51.52", longitude: "-0.09" } },
        organizer: { name: "Jam Co" },
      },
      "Eventbrite",
    );
    expect(e).toMatchObject({
      url: "https://www.eventbrite.com/e/ai-jam-london-tickets-1",
      allDay: true,
      lat: 51.52,
      lng: -0.09,
      venue: "106 Bunhill Row, London",
      organiser: "Jam Co",
      source: "Eventbrite",
    });
  });

  it("does not repeat a locality already in the place name, and marks virtual events online", () => {
    const place = { name: "London, UK", address: { addressLocality: "London" } };
    expect(fromLdEvent({ name: "x", startDate: "2026-10-10T09:00:00Z", url: "u", location: place }, "s").venue).toBe("London, UK");
    const virtual = { "@type": "VirtualLocation" };
    expect(fromLdEvent({ name: "x", startDate: "2026-10-10T09:00:00Z", url: "u", location: virtual }, "s")).toMatchObject({
      venue: "Online",
      allDay: false,
      lat: undefined,
    });
  });
});

describe("Next.js payloads", () => {
  it("reads __NEXT_DATA__", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{"a":1}}</script>`;
    expect(parseNextData<{ props: { a: number } }>(html).props.a).toBe(1);
    expect(() => parseNextData("<html>")).toThrow(/__NEXT_DATA__/);
  });

  it("joins and unescapes flight chunks", () => {
    const html = `<script>self.__next_f.push([1,"6:{\\"events\\":"])</script><script>self.__next_f.push([1,"[1]}\\n"])</script>`;
    expect(decodeFlight(html)).toBe('6:{"events":[1]}\n');
  });
});
