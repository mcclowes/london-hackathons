"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { FILTERS, type FeedEvent, type Filter, matches } from "@/lib/feed";
import styles from "./page.module.scss";
import { Tags } from "./tags";

interface Props {
  events: FeedEvent[];
  intro: ReactNode;
  featured?: { id: string; node: ReactNode };
}

export function Feed({ events, intro, featured }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const idle = filter === "all" && !query.trim();
  const showFeatured = idle && featured;
  const shown = events.filter((e) => matches(e, filter, query) && !(showFeatured && e.id === featured.id));

  return (
    <>
      <section className={styles.hero}>
        {intro}
        <div className={styles.searchPanel}>
          <label className={styles.label} htmlFor="search">
            Quick search
          </label>
          <div className={styles.search}>
            <span className={styles.prompt} aria-hidden>
              $
            </span>
            <input
              id="search"
              ref={search}
              type="search"
              placeholder="title, venue, organiser…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            <kbd className={styles.kbd}>⌘K</kbd>
          </div>
          <div className={styles.filters} role="group" aria-label="Filter events">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={styles.filter}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {showFeatured && featured.node}

      <section id="feed" className={styles.upcoming}>
        <header className={styles.upcomingHead}>
          <h2>
            Upcoming <span>— {shown.length} events</span>
          </h2>
          <p>Sorted by date</p>
        </header>

        {shown.length === 0 ? (
          <p className={styles.empty}>// No matches. Try another filter.</p>
        ) : (
          <ol className={styles.list}>
            {shown.map((e) => (
              <li key={e.id} className={styles.row}>
                <div className={styles.rowDate}>
                  <span className={styles.rowDay}>{e.date}</span>
                  <span className={styles.rowSub}>
                    {e.weekday} · {e.weekend ? "weekend" : "weekday"}
                  </span>
                </div>
                <div className={styles.rowBody}>
                  <a className={styles.rowTitle} href={e.url} target="_blank" rel="noreferrer">
                    {e.title}
                  </a>
                  <p className={styles.rowMeta}>{[e.venue, e.organiser].filter(Boolean).join(" · ") || "Venue TBC"}</p>
                </div>
                <Tags event={e} />
                <div className={styles.rowTime}>{e.time}</div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
