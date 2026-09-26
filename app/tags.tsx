"use client";

import { useEffect, useState } from "react";
import type { FeedEvent } from "@/lib/feed";
import { soon } from "@/lib/format";
import styles from "./page.module.scss";

export function Tags({ event }: { event: FeedEvent }) {
  // The page can be hours or days old by the time it's read, so recompute against the reader's clock.
  const [when, setWhen] = useState(event.soon);
  useEffect(() => setWhen(soon(event.start)), [event.start]);

  return (
    <ul className={styles.tags}>
      {when && <li className={when === "today" ? styles.tagToday : styles.tagSoon}>{when}</li>}
      {event.topics.map((t) => (
        <li key={t} className={t === "WEB3" ? styles.tagYellow : styles.tagOrange}>
          {t}
        </li>
      ))}
      {event.format && <li className={styles.tagMuted}>{event.format}</li>}
      {event.sources.map((s) => (
        <li key={s} className={styles.tag}>
          {s}
        </li>
      ))}
    </ul>
  );
}
