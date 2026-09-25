import { fetchText } from "../http";
import { fromLdEvent, parseLdEvents } from "../jsonld";
import type { Source } from "../types";

const SEARCHES = ["hackathon", "hack-day", "game-jam"];
const PAGES_PER_SEARCH = 2;

export const eventbrite: Source = {
  name: "Eventbrite",
  async fetch() {
    const urls = SEARCHES.flatMap((q) =>
      Array.from(
        { length: PAGES_PER_SEARCH },
        (_, i) => `https://www.eventbrite.co.uk/d/united-kingdom--london/${q}/?page=${i + 1}`,
      ),
    );
    const pages = await Promise.all(urls.map(fetchText));
    return pages.flatMap(parseLdEvents).map((e) => fromLdEvent(e, "Eventbrite"));
  },
};
