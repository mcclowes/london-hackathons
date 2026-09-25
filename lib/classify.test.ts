import { describe, expect, it } from "vitest";
import { isHackathon } from "./classify";
import { isInLondon } from "./london";

describe("isHackathon", () => {
  it.each([
    "Stripe x Briefcase: AI FinTech London Hackathon",
    "Real-Time Video Agents Hack - LDN",
    "Solana Hacker House - London",
    "House London #2 | Data Hackathon",
    "AI Jam London",
    "Global Game Jam 2027",
    "NHS Hack Day",
    "Buildathon: ship an agent",
  ])("accepts %s", (title) => expect(isHackathon(title)).toBe(true));

  it.each([
    "London Cybersecurity Mayfair Business Networking Lunch",
    "Growth hacking for founders",
    "UCL AI Society x NVIDIA - GTC Berlin Watch Party for Students",
    "Hackney Wick Badminton Group",
    "Biohacking breakfast",
  ])("rejects %s", (title) => expect(isHackathon(title)).toBe(false));
});

describe("isInLondon", () => {
  it("uses coordinates when present", () => {
    expect(isInLondon({ lat: 51.52, lng: -0.09 })).toBe(true);
    expect(isInLondon({ lat: 52.48, lng: 13.43, venue: "London Road" })).toBe(false);
  });

  it("falls back to venue text", () => {
    expect(isInLondon({ venue: "Imperial College London" })).toBe(true);
    expect(isInLondon({ venue: "Online" })).toBe(false);
  });
});
