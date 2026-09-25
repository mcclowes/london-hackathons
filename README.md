# London hackathons

Every upcoming hackathon in London on one page, and as one subscribable calendar.

No single source covers London hackathons well, so this merges several, then filters and de-duplicates them:

| Source | How | Notes |
| --- | --- | --- |
| Luma discover | `api.lu.ma` discover endpoint, London + tech category | Where most London builder events live |
| Luma organiser calendars | Public iCal feeds (`api.lu.ma/ics/get`) | Edit `ORGANISER_CALENDARS` in `lib/sources/luma.ts` |
| Curated | Hand-added Luma links or full records | Edit `CURATED` in `lib/sources/curated.ts` |
| Devpost | JSON API, in-person events | Thin for London |
| MLH | JSON embedded in the season page | Mostly student events |
| Eventbrite | JSON-LD on London search pages | Noisy; relies on the filters below |

Filters (`lib/aggregate.ts`):

- **London:** within 30km of central London by coordinates, or "London" in the venue when there are none.
- **Hackathon:** Devpost and MLH are trusted. Everything else must look like a hackathon by title (`lib/classify.ts`). Followed organiser calendars get a wider net: hands-on workshops, lock-ins, builder cohorts and demo nights count too.
- **Dedupe:** by canonical URL, or by normalised title on the same day. The most detailed record wins, and every source is credited.

The page, `/calendar.ics` and `/events.json` are statically rendered and revalidated every six hours. A failing source is reported in the footer and doesn't take the others down.

## Adding an organiser

Find their Luma calendar ID:

```sh
curl -s "https://api.lu.ma/url?url=<luma-slug>" | jq -r .data.calendar.api_id
```

Add it to `ORGANISER_CALENDARS`. Non-London events in their feed are filtered out.

## Adding a single event

For one-offs, and events that aren't on Luma, add the Luma URL or a full record to `CURATED` in `lib/sources/curated.ts`. Curated events skip the hackathon check. Visitors suggest events through the "Submit an event" issue form, labelled `event-submission`.

## Development

```sh
pnpm install
pnpm dev
pnpm test
```

Set `VERCEL_PROJECT_PRODUCTION_URL` outside Vercel so the subscribe link points to the right host.
