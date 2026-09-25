import { fetchDiscoverEntries, suggestCalendars } from "../lib/sources/luma";

const MIN_EVENTS = 2;

const suggestions = suggestCalendars(await fetchDiscoverEntries()).filter(
  (s) => s.builds > 0 || s.events >= MIN_EVENTS,
);

for (const s of suggestions) {
  console.log(`${s.builds} build / ${s.events} London  ${s.name}  { name: "${s.name}", id: "${s.id}" }  luma.com/${s.slug}`);
  for (const t of s.titles.slice(0, 3)) console.log(`    ${t}`);
}
