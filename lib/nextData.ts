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
