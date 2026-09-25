import { aggregate } from "@/lib/aggregate";
import { type FeedEvent, toFeedEvent } from "@/lib/feed";
import { daysUntil, googleCalendarUrl, isThisWeek } from "@/lib/format";
import { ORGANISER_CALENDARS } from "@/lib/sources/luma";
import type { HackEvent } from "@/lib/types";
import { Feed } from "./feed";
import styles from "./page.module.scss";
import { Tags } from "./tags";

export const revalidate = 21600;

// Reading the request host would opt out of static rendering, so use Vercel's production URL.
const HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000";
const WEBCAL = `webcal://${HOST}/calendar.ics`;
const GOOGLE_SUBSCRIBE = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(WEBCAL)}`;

export default async function Home() {
  const { events, sources, generatedAt } = await aggregate();
  const now = new Date(generatedAt);
  const feed = events.map((e) => toFeedEvent(e, now));
  const next = events[0];
  const refreshed = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now);

  const ticker = [
    `${events.length} events live`,
    next && `Next: ${next.title} — ${daysUntil(next.start, now)}`,
    `${events.filter((e) => isThisWeek(e.start, now)).length} this week`,
    `${sources.filter((s) => s.ok).length}/${sources.length} sources up`,
    `Refreshed ${refreshed}`,
  ].filter(Boolean) as string[];

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <a className={styles.logo} href="/">
            <span className={styles.logoMark} aria-hidden>
              &gt;_
            </span>
            London<span className={styles.logoSep}>::</span>Hack
          </a>
          <nav className={styles.nav}>
            <a href="#feed">Feed</a>
            <a href={GOOGLE_SUBSCRIBE}>Google Cal</a>
            <a href="/calendar.ics">.ics</a>
            <a href="/events.json">JSON</a>
            <a href="#sources">Sources</a>
          </nav>
          <a className={styles.cta} href={WEBCAL}>
            Subscribe
          </a>
        </div>
      </header>

      <div className={styles.ticker} aria-label="Status">
        <div className={styles.tickerTrack}>
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 || undefined}>
              {ticker.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <main className={styles.page}>
        {events.length === 0 ? (
          <p className={styles.empty}>// Nothing found right now. Every source may be down; see below.</p>
        ) : (
          <Feed
            events={feed}
            intro={<Intro />}
            featured={next && { id: next.id, node: <Featured event={next} feed={feed[0]} now={now} /> }}
          />
        )}
      </main>

      <footer id="sources" className={styles.footer}>
        <div>
          <h3>// Sources</h3>
          <ul className={styles.health}>
            {sources.map((s) => (
              <li key={s.name} data-ok={s.ok}>
                <span>{s.name}</span>
                <span>{s.ok ? `${s.count} kept` : `failed: ${s.error}`}</span>
              </li>
            ))}
          </ul>
          <p className={styles.small}>Refreshed {refreshed}. Rebuilt every six hours.</p>
        </div>
        <div>
          <h3>// Organisers followed</h3>
          <p className={styles.small}>{ORGANISER_CALENDARS.map((c) => c.name).join(" · ")}</p>
          <p className={styles.small}>
            Keyword-tagged listings are noisy, so anything not from a hackathon-only source must look like a
            hackathon by title and sit within 30km of central London. Followed organisers also count hands-on
            workshops and build sessions. Topic tags are guessed from titles.
          </p>
        </div>
      </footer>
    </>
  );
}

function Intro() {
  return (
    <div className={styles.intro}>
      <p className={styles.kicker}>// Hackathon discovery — London</p>
      <h1 className={styles.title}>
        Hack the city,
        <br />
        run the board.
      </h1>
      <p className={styles.lede}>
        Every London hackathon in one feed, merged from Luma, Devpost, MLH and Eventbrite. Subscribe once and
        they land in your calendar.
      </p>
    </div>
  );
}

function Featured({ event, feed, now }: { event: HackEvent; feed: FeedEvent; now: Date }) {
  return (
    <article className={styles.featured}>
      <div className={styles.featuredMain}>
        <p className={styles.featuredLabel}>
          <span aria-hidden /> Next up
        </p>
        <p className={styles.featuredDate}>{feed.date}</p>
        <p className={styles.featuredTime}>
          {feed.weekday} · {feed.time}
        </p>
        <h2 className={styles.featuredTitle}>{event.title}</h2>
        {event.organiser && <p className={styles.featuredOrganiser}>{event.organiser}</p>}
        <Tags event={feed} />
      </div>

      <div className={styles.poster} aria-hidden>
        <span>{feed.date.slice(4)}</span>
      </div>

      <div className={styles.featuredSide}>
        <dl className={styles.details}>
          <div>
            <dt>Venue</dt>
            <dd>{event.venue ?? "TBC"}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>{feed.format === "virtual" ? "Virtual" : feed.format === "in-person" ? "In-person" : "Unknown"}</dd>
          </div>
          <div>
            <dt>Starts</dt>
            <dd className={styles.highlight}>{daysUntil(event.start, now)}</dd>
          </div>
        </dl>
        <div className={styles.featuredActions}>
          <a className={styles.register} href={event.url} target="_blank" rel="noreferrer">
            Register →
          </a>
          <a className={styles.ghost} href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
            + Cal
          </a>
        </div>
      </div>
    </article>
  );
}
