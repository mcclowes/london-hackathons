import { describe, expect, it } from "vitest";
import { buildRoundup, sections } from "./roundup";
import type { HackEvent } from "./types";

const now = new Date("2026-10-05T07:00:00Z"); // Monday
const event = (title: string, start: string, extra: Partial<HackEvent> = {}): HackEvent => ({
  id: title,
  title,
  start,
  allDay: false,
  url: `https://lu.ma/${title.length}`,
  sources: ["luma"],
  ...extra,
});

const soon = event("AI agents hack", "2026-10-10T08:00:00Z", { end: "2026-10-10T20:00:00Z", venue: "Foundry", organiser: "Encode" });
const later = event("Climate <build> night", "2026-10-20T17:00:00Z");
const far = event("Winter hack", "2026-11-20T09:00:00Z");

describe("sections", () => {
  it("splits the next week from the rest of the month and drops the far future", () => {
    expect(sections([soon, later, far], now)).toEqual([
      { heading: "This week", events: [soon] },
      { heading: "Later this month", events: [later] },
    ]);
  });
});

describe("buildRoundup", () => {
  it("returns null when nothing is coming up", () => {
    expect(buildRoundup([far], now, "https://x.test")).toBeNull();
  });

  it("names a lone event in the subject", () => {
    const r = buildRoundup([soon, later], now, "https://x.test")!;
    expect(r.subject).toBe("London hackathons: AI agents hack this week");
    expect(r.name).toBe("Weekly roundup 2026-10-05");
    expect(r.count).toBe(2);
  });

  it("says when the week is quiet", () => {
    expect(buildRoundup([later], now, "https://x.test")!.subject).toBe(
      "London hackathons: quiet week, 1 event coming up",
    );
  });

  it("formats in London time, escapes titles and links unsubscribe", () => {
    const r = buildRoundup([soon, later], now, "https://x.test")!;
    expect(r.html).toContain("Sat 10 Oct · 09:00–21:00 · Foundry");
    expect(r.html).toContain("Climate &#60;build&#62; night");
    expect(r.html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(r.text).toContain("Climate <build> night");
  });
});
