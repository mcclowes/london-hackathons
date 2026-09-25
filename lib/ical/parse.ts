export type VEvent = Record<string, string>;

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

/** DTSTART values: 20261010T073000Z, 20261010T073000 (floating), or 20251205 (all-day). */
export function icalDateToIso(v: string): string {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return new Date(v).toISOString();
  const [, y, mo, d, h = "00", mi = "00", s = "00"] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString();
}

function valueSeparatorIndex(line: string): number {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ":" && !quoted) return i;
  }
  return -1;
}

/**
 * Minimal RFC 5545 reader. Unfolds lines and returns VEVENT properties keyed by name;
 * parameters are keyed as NAME;PARAM (e.g. "ORGANIZER;CN").
 */
export function parseIcal(text: string): VEvent[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events: VEvent[] = [];
  let current: VEvent | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT" && current) {
      events.push(current);
      current = null;
    } else if (current) {
      const colon = valueSeparatorIndex(line);
      if (colon < 0) continue;
      const [rawName, ...params] = line.slice(0, colon).split(";");
      const name = rawName.toUpperCase();
      current[name] = unescapeText(line.slice(colon + 1));
      for (const param of params) {
        const eq = param.indexOf("=");
        if (eq < 0) continue;
        current[`${name};${param.slice(0, eq).toUpperCase()}`] = param.slice(eq + 1).replace(/^"|"$/g, "");
      }
    }
  }
  return events;
}
