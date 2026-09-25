import { describe, expect, it } from "vitest";
import { fromLumaVEvent } from "../sources/luma";
import { icalDateToIso, parseIcal } from "./parse";
import { toIcal } from "./serialize";

const LUMA_FEED = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART:20261010T073000Z",
  "DTEND:20261010T193000Z",
  'ORGANIZER;CN="{Tech: Europe}":MAILTO:calendar-invite@lu.ma',
  "UID:evt-ArH3YK5Lq1wVJ2m@events.lu.ma",
  "SUMMARY:{Tech: Europe} London AI Hack",
  "DESCRIPTION:Get up-to-date information at: https://luma.com/london-hackathon\\n\\nAd",
  " dress:\\nCheck event page",
  "LOCATION:https://luma.com/event/evt-ArH3YK5Lq1wVJ2m",
  "GEO:51.52;-0.09",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcal", () => {
  it("unfolds lines and reads quoted parameters", () => {
    const [v] = parseIcal(LUMA_FEED);
    expect(v.SUMMARY).toBe("{Tech: Europe} London AI Hack");
    expect(v["ORGANIZER;CN"]).toBe("{Tech: Europe}");
    expect(v.DESCRIPTION).toContain("Address:\nCheck event page");
  });

  it("handles timed and all-day dates", () => {
    expect(icalDateToIso("20261010T073000Z")).toBe("2026-10-10T07:30:00.000Z");
    expect(icalDateToIso("20251205")).toBe("2025-12-05T00:00:00.000Z");
  });
});

describe("fromLumaVEvent", () => {
  it("extracts the public event URL, organiser and geo", () => {
    const e = fromLumaVEvent(parseIcal(LUMA_FEED)[0], "{Tech: Europe}");
    expect(e).toMatchObject({
      url: "https://luma.com/london-hackathon",
      organiser: "{Tech: Europe}",
      lat: 51.52,
      lng: -0.09,
      venue: undefined,
      allDay: false,
    });
  });
});

describe("toIcal", () => {
  const ics = toIcal(
    [
      {
        id: "abc",
        title: "Hack; with, escapes and a very long title that will need folding across several lines",
        start: "2026-10-10T07:30:00.000Z",
        allDay: false,
        url: "https://luma.com/x",
        sources: ["Luma"],
      },
      { id: "def", title: "Day hack", start: "2026-10-10T00:00:00.000Z", end: "2026-10-11T00:00:00.000Z", allDay: true, url: "https://x.dev", sources: ["Devpost"] },
    ],
    new Date("2026-09-25T00:00:00Z"),
  );

  it("escapes, folds and round-trips through the parser", () => {
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    const [timed, allDay] = parseIcal(ics);
    expect(timed.SUMMARY).toBe(
      "Hack; with, escapes and a very long title that will need folding across several lines",
    );
    expect(timed.DTEND).toBe("20261010T103000Z");
    expect(allDay.DTSTART).toBe("20261010");
    expect(allDay.DTEND).toBe("20261012");
  });
});
