/** An event as a source reports it, before filtering and dedupe. */
export interface RawEvent {
  title: string;
  start: string; // ISO 8601
  end?: string;
  /** Source only gives dates, not times. */
  allDay?: boolean;
  url: string;
  source: string;
  organiser?: string;
  venue?: string;
  lat?: number;
  lng?: number;
  /** Source only lists hackathons, so skip the keyword check. */
  knownHackathon?: boolean;
  /** From a calendar we chose to follow, so hands-on workshops count too. */
  followedOrganiser?: boolean;
}

export interface HackEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  url: string;
  organiser?: string;
  venue?: string;
  sources: string[];
}

export interface SourceResult {
  name: string;
  ok: boolean;
  count: number;
  /** Events no other source found. */
  unique?: number;
  error?: string;
}

export interface Source {
  name: string;
  fetch: () => Promise<RawEvent[]>;
}
