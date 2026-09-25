export type Topic = "AI" | "WEB3" | "GAMES" | "DATA";
export type Format = "in-person" | "virtual";

const TOPICS: [Topic, RegExp][] = [
  ["AI", /\b(ai|genai|agents?|agentic|llms?|gpt|ml|machine learning|claude|openai|gemini|mcp)\b/i],
  ["WEB3", /\b(web3|crypto|blockchain|onchain|on-chain|defi|solana|ethereum|eth|bitcoin|btc|zk|base|polkadot|near|sui)\b/i],
  ["GAMES", /\bgames?\b|\bgame[\s-]?jam\b/i],
  ["DATA", /\bdata(thon)?\b/i],
];

const VIRTUAL = /\b(online|virtual|remote|zoom|discord|digital)\b/i;

export function topics(title: string): Topic[] {
  return TOPICS.filter(([, re]) => re.test(title)).map(([t]) => t);
}

export function format(venue?: string): Format | undefined {
  if (!venue) return undefined;
  return VIRTUAL.test(venue) ? "virtual" : "in-person";
}

export function isWeekend(iso: string): boolean {
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short" }).format(
    new Date(iso),
  );
  return day === "Sat" || day === "Sun";
}
