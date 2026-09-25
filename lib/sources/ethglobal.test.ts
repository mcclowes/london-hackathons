import { describe, expect, it } from "vitest";
import { fromEthGlobal, parseEthGlobalPage, type EthGlobalEvent } from "./ethglobal";

const london: EthGlobalEvent = {
  name: "ETHGlobal London",
  slug: "london2027",
  type: "hackathon",
  medium: "physical",
  status: "future",
  startTime: "2027-03-12T09:00:00.000Z",
  endTime: "2027-03-14T17:00:00.000Z",
  website: null,
  city: { name: "London", country: { name: "United Kingdom" } },
};

/** Mimics the RSC stream: escaped JSON split across push calls, with brackets inside strings. */
function page(events: EthGlobalEvent[]): string {
  const flight = `5:["$","div",null,{}]\n6:["$","$L27",null,{"events":${JSON.stringify(events)},"tabs":["[x]"]}]\n`;
  const half = Math.floor(flight.length / 2);
  return [flight.slice(0, half), flight.slice(half)]
    .map((part) => `<script>self.__next_f.push([1,${JSON.stringify(part)}])</script>`)
    .join("");
}

describe("ETHGlobal", () => {
  it("reads the events array out of the flight stream", () => {
    const tricky = { ...london, name: 'Hack "the" [planet] }{' };
    expect(parseEthGlobalPage(page([london, tricky])).map((e) => e.name)).toEqual([london.name, tricky.name]);
  });

  it("fails loudly when the page shape changes", () => {
    expect(() => parseEthGlobalPage("<html></html>")).toThrow(/structure changed/);
  });

  it("trusts hackathons and links to their ETHGlobal page", () => {
    expect(fromEthGlobal(london)).toMatchObject({
      url: "https://ethglobal.com/events/london2027",
      venue: "London, United Kingdom",
      knownHackathon: true,
    });
  });

  it("links other formats to their own site and marks virtual events online", () => {
    const meetup = fromEthGlobal({ ...london, type: "meetup", medium: "virtual", website: "https://luma.com/x?utm_source=ethglobal" });
    expect(meetup).toMatchObject({ url: "https://luma.com/x", venue: "Online" });
    expect(meetup.knownHackathon).toBeUndefined();
  });
});
