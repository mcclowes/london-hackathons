const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export const REVALIDATE_SECONDS = 6 * 60 * 60;

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "en-GB" },
    signal: AbortSignal.timeout(15_000),
    next: { revalidate: REVALIDATE_SECONDS },
  } as RequestInit);
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.text();
}

export async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T;
}
