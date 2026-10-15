# Commands

## Development

- Dev server: `pnpm run dev` #monitor #browser #safe #long-running
- Serve built site: `pnpm run start` - requires a successful production build #safe #long-running

## Checks

- Test: `pnpm run test` - runs isolated Vitest tests #quick #safe
- Typecheck: `pnpm run typecheck` #quick #safe
- Build: `pnpm run build` - statically renders the site and fetches public event sources #quick #safe #slow

## Discovery

- Suggest organizer calendars: `pnpm run suggest-calendars` - fetches public Luma discovery and prints ranked candidates #safe #slow
