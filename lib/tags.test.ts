import { describe, expect, it } from "vitest";
import { format, isWeekend, topics } from "./tags";

describe("topics", () => {
  it.each([
    ["Stripe x Briefcase: AI FinTech London Hackathon", ["AI"]],
    ["Real-Time Video Agents Hack - LDN", ["AI"]],
    ["Solana Hacker House - London", ["WEB3"]],
    ["House London #2 | Data Hackathon", ["DATA"]],
    ["Global Game Jam 2027", ["GAMES"]],
    ["Onchain AI agents hack", ["AI", "WEB3"]],
    ["NHS Hack Day", []],
  ])("%s → %j", (title, expected) => expect(topics(title)).toEqual(expected));

  it("doesn't match words that merely contain a keyword", () => {
    expect(topics("Mainframe hack at Basecamp")).toEqual([]);
  });
});

describe("format", () => {
  it("is virtual for online venues", () => expect(format("Online")).toBe("virtual"));
  it("is in-person for a physical venue", () => expect(format("106 Bunhill Row, London")).toBe("in-person"));
  it("is unknown without a venue", () => expect(format(undefined)).toBeUndefined());
});

describe("isWeekend", () => {
  it("uses London time", () => {
    // 23:30 UTC Friday is 00:30 Saturday in BST.
    expect(isWeekend("2026-10-23T23:30:00Z")).toBe(true);
    expect(isWeekend("2026-10-23T12:00:00Z")).toBe(false);
  });
});
