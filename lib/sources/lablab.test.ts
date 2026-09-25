import { describe, expect, it } from "vitest";
import { fromLablab, parseLablabPage, type LablabEvent } from "./lablab";

const event = (overrides: Partial<LablabEvent> = {}): LablabEvent => ({
  name: "The monday.com AI app hackathon",
  slug: "monday-hackathon",
  type: "HACKATHON",
  eventType: "HYBRID",
  startAt: "2026-10-10T09:00:00.000Z",
  endAt: "2026-10-12T17:00:00.000Z",
  description: "🌐 Join the hack in London, Tel Aviv and virtual on lablab.ai",
  ...overrides,
});

function page(objects: unknown[]): string {
  const flight = `8:["$","div",null,{"items":${JSON.stringify(objects)}}]\n`;
  return `<script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`;
}

describe("lablab", () => {
  it("reads hackathons out of the flight stream, once each", () => {
    const withId = (e: LablabEvent) => ({ id: e.slug, ...e, tech: { id: "t1", name: "GPT" } });
    const html = page([
      withId(event()),
      withId(event()),
      withId(event({ slug: "course", type: "COURSE" })),
    ]);
    expect(parseLablabPage(html).map((e) => e.slug)).toEqual(["monday-hackathon"]);
  });

  it("fails loudly when the page shape changes", () => {
    expect(() => parseLablabPage(page([{ id: "x" }]))).toThrow(/structure changed/);
  });

  it("places hybrid events in London only when the description says so", () => {
    expect(fromLablab(event())).toMatchObject({
      venue: "London",
      url: "https://lablab.ai/ai-hackathons/monday-hackathon",
      knownHackathon: true,
    });
    expect(fromLablab(event({ description: "Hack in Amsterdam" })).venue).toBe("hybrid, venue unknown");
    expect(fromLablab(event({ eventType: "ONLINE", description: "Build from anywhere" })).venue).toBe("Online");
    expect(fromLablab(event({ eventType: "ONLINE", description: "Workshops at Google Cloud Space in London" })).venue).toBe("London");
  });
});
