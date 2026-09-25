import { describe, expect, it } from "vitest";
import { fetchDevfolio, type DevfolioHackathon } from "./devfolio";

const hack = (slug: string, overrides: Partial<DevfolioHackathon> = {}): DevfolioHackathon => ({
  name: slug,
  slug,
  starts_at: "2026-10-10T09:00:00+00:00",
  ends_at: "2026-10-11T17:00:00+00:00",
  is_online: false,
  timezone: "Europe/London",
  ...overrides,
});

const nextData = (props: unknown) =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: props } })}</script>`;

describe("fetchDevfolio", () => {
  it("fetches only in-person UK-timezone events, once each, and reads their location", async () => {
    const listing = nextData({
      dehydratedState: {
        queries: [
          {
            state: {
              data: {
                open_hackathons: [hack("london-hack"), hack("india-hack", { timezone: "Asia/Kolkata" }), hack("uk-online", { is_online: true })],
                upcoming_hackathons: [hack("london-hack")],
                past_hackathons: [hack("old-hack")],
              },
            },
          },
        ],
      },
    });
    const fetched: string[] = [];
    const events = await fetchDevfolio(async (url) => {
      fetched.push(url);
      if (url === "https://devfolio.co/hackathons") return listing;
      return nextData({ hackathon: hack("london-hack", { location: "Imperial College, London, UK" }) });
    });
    expect(fetched).toEqual(["https://devfolio.co/hackathons", "https://london-hack.devfolio.co/"]);
    expect(events).toEqual([
      expect.objectContaining({
        url: "https://london-hack.devfolio.co/",
        venue: "Imperial College, London, UK",
        knownHackathon: true,
        source: "Devfolio",
      }),
    ]);
  });
});
