import { aggregate } from "@/lib/aggregate";
import { dayNumber, groupByMonth, isThisWeek, timeRange, weekday } from "@/lib/format";
import { ORGANISER_CALENDARS } from "@/lib/sources/luma";
import styles from "./page.module.scss";

export const revalidate = 21600;

// Reading the request host would opt out of static rendering, so use Vercel's production URL.
const HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000";

export default async function Home() {
  const { events, sources, generatedAt } = await aggregate();
  const now = new Date(generatedAt);

  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <p className={styles.kicker}>
          <span className={styles.dot} aria-hidden /> {events.length} upcoming
        </p>
        <h1 className={styles.title}>
          London <em>hackathons</em>
        </h1>
        <p className={styles.lede}>
          Merged from Luma, organiser calendars, Devpost, MLH and Eventbrite, then filtered and
          de-duplicated. Subscribe once and they turn up in your calendar.
        </p>
        <div className={styles.actions}>
          <a className={styles.primary} href={`webcal://${HOST}/calendar.ics`}>
            Subscribe to calendar
          </a>
          <a
            className={styles.secondary}
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(`webcal://${HOST}/calendar.ics`)}`}
          >
            Google Calendar
          </a>
          <a className={styles.secondary} href="/calendar.ics">
            .ics
          </a>
          <a className={styles.secondary} href="/events.json">
            JSON
          </a>
        </div>
      </header>

      {events.length === 0 ? (
        <p className={styles.empty}>Nothing found right now. Every source may be down; see below.</p>
      ) : (
        groupByMonth(events).map(([month, monthEvents]) => (
          <section key={month} className={styles.month}>
            <h2 className={styles.monthName}>{month}</h2>
            <ol className={styles.list}>
              {monthEvents.map((e) => (
                <li key={e.id} className={styles.row}>
                  <div className={styles.date}>
                    <span className={styles.day}>{dayNumber(e.start)}</span>
                    <span className={styles.weekday}>{weekday(e.start)}</span>
                  </div>
                  <div className={styles.body}>
                    <a className={styles.eventTitle} href={e.url} target="_blank" rel="noreferrer">
                      {e.title}
                    </a>
                    <p className={styles.meta}>
                      <span className={styles.time}>{timeRange(e)}</span>
                      {e.organiser && <span>{e.organiser}</span>}
                      {e.venue && <span>{e.venue}</span>}
                    </p>
                  </div>
                  <div className={styles.tags}>
                    {isThisWeek(e.start, now) && <span className={styles.soon}>This week</span>}
                    {e.sources.map((s) => (
                      <span key={s} className={styles.chip}>
                        {s}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      <footer className={styles.footer}>
        <div>
          <h3>Sources</h3>
          <ul className={styles.health}>
            {sources.map((s) => (
              <li key={s.name} data-ok={s.ok}>
                <span>{s.name}</span>
                <span>{s.ok ? `${s.count} kept` : `failed: ${s.error}`}</span>
              </li>
            ))}
          </ul>
          <p className={styles.small}>
            Refreshed{" "}
            {new Intl.DateTimeFormat("en-GB", {
              timeZone: "Europe/London",
              dateStyle: "medium",
              timeStyle: "short",
            }).format(now)}
            . Rebuilt every six hours.
          </p>
        </div>
        <div>
          <h3>Organisers followed</h3>
          <p className={styles.small}>
            {ORGANISER_CALENDARS.map((c, i) => (
              <span key={c.id}>
                {i > 0 && " · "}
                {c.name}
              </span>
            ))}
          </p>
          <p className={styles.small}>
            Keyword-tagged listings are noisy, so anything not from a hackathon-only source must
            look like a hackathon by title and sit within 30km of central London.
          </p>
        </div>
      </footer>
    </main>
  );
}
