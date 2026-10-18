# London hackathons

Every upcoming hackathon in London on one page, and as one subscribable calendar.

No single source covers London hackathons well, so this merges several, then filters and de-duplicates them:

| Source | How | Notes |
| --- | --- | --- |
| Luma discover | `api.lu.ma` discover endpoint, London, searched for several build terms | Returns ~50 events per query, so we run one per term |
| Luma organiser calendars | Public iCal feeds (`api.lu.ma/ics/get`) | Edit `ORGANISER_CALENDARS` in `lib/sources/luma.ts` |
| Curated | Hand-added Luma or Partiful links, or full records | Edit `CURATED` in `lib/sources/curated.ts` |
| Meetup | Public GraphQL search (`api.meetup.com/gql-ext`), tech category, London radius | Search is loose; the hackathon check does the filtering |
| Cerebral Valley | Public events API filtered to "London, UK" | Ignores date filters, so every page is read |
| Devpost | JSON API, in-person events | Thin for London |
| MLH | JSON embedded in the season page | Mostly student events |
| Eventbrite | JSON-LD on London search pages | Noisy; relies on the filters below |
| ETHGlobal | Event list in the page's server components payload | ETHGlobal London is usually spring |
| lablab.ai | Hackathon list in the page's server components payload | Mostly online; London legs only show in descriptions |
| Devfolio | `__NEXT_DATA__` listing, then each UK-timezone event's page | Mostly India |

The footer shows, per source, how many events it kept and how many no other source found. Use that to decide what to drop.

Not included: DoraHacks (blocks scripts with a human check) and Eventbrite's organiser API (needs a token and a list of organisers).

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

To find candidates, `pnpm suggest-calendars` lists calendars hosting London events that we don't follow yet, ranked by how many look like build sessions.

## Adding a single event

For one-offs, and events that aren't on Luma, add the Luma or Partiful URL, or a full record to `CURATED` in `lib/sources/curated.ts`. Curated events skip the hackathon check. Visitors suggest events through the "Submit an event" issue form, labelled `event-submission`.

## Weekly email

Every Monday at 07:00 UTC, Vercel Cron calls `/api/roundup`. It sends a [Resend](https://resend.com) broadcast listing this week's events and the rest of the next four weeks. With nothing in that window, nothing is sent. The signup form in the footer adds people to a Resend segment; Resend handles unsubscribes.

Setup:

1. Verify a sending domain in Resend and create a segment.
2. Set `RESEND_API_KEY`, `RESEND_SEGMENT_ID`, `ROUNDUP_FROM` (e.g. `London Hackathons <roundup@yourdomain>`) and `CRON_SECRET` in Vercel.

To check the email without sending it:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" "https://<host>/api/roundup?preview" > roundup.html
```

The broadcast name carries the date, so a repeated cron run on the same day sends nothing.

## Development

```sh
pnpm install
pnpm dev
pnpm test
```

Set `VERCEL_PROJECT_PRODUCTION_URL` outside Vercel so the subscribe link points to the right host.
