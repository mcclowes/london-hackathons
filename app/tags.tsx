import type { FeedEvent } from "@/lib/feed";
import styles from "./page.module.scss";

export function Tags({ event }: { event: FeedEvent }) {
  return (
    <ul className={styles.tags}>
      {event.soon && <li className={styles.tagSoon}>This week</li>}
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
