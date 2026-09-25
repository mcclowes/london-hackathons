/** Pages Router sites embed their props as one JSON blob. */
export function parseNextData<T>(html: string): T {
  const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
  if (!json) throw new Error("no __NEXT_DATA__ on page");
  return JSON.parse(json) as T;
}

/** App Router sites stream React Server Components as escaped strings in `self.__next_f.push` calls. */
export function decodeFlight(html: string): string {
  const chunks = html.matchAll(/self\.__next_f\.push\(\[1,"(.*?)"\]\)<\/script>/gs);
  return [...chunks].map(([, s]) => JSON.parse(`"${s}"`) as string).join("");
}

/** Values sit mid-stream, so read from an opening bracket to its match. */
export function sliceJson(text: string, start: number): string {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "[" || ch === "{") depth++;
    else if ((ch === "]" || ch === "}") && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("unterminated JSON in flight stream");
}

/** Every object in the stream that starts with `{"<firstKey>":`, including nested ones. */
export function flightObjects(flight: string, firstKey: string): Record<string, unknown>[] {
  const marker = `{"${firstKey}":`;
  const objects: Record<string, unknown>[] = [];
  for (let at = flight.indexOf(marker); at >= 0; at = flight.indexOf(marker, at + 1)) {
    try {
      objects.push(JSON.parse(sliceJson(flight, at)));
    } catch {
      // A marker inside a string, or an object cut off by a text chunk.
    }
  }
  return objects;
}
