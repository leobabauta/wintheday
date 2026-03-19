# Win the Day

Coaching app for daily commitments, journaling, and client-coach communication.

## Deployment

- Hosted on **Vercel** (auto-deploys on push to main)
- Live at **https://www.wintheday.work/**
- Supabase project ref: `tkhwiukylohjfnocjqyy`

## Tech Stack

- Next.js (App Router) with TypeScript
- PostgreSQL via Supabase
- Tailwind CSS v4 (uses `@theme` NOT `@theme inline` — inline breaks dark mode)
- JWT auth with bcrypt

## Key Directories

- `src/app/(coach)/` — Coach-only routes (dashboard, client management, inbox)
- `src/app/(client)/` — Client-only routes (today, journal, messages, settings)
- `src/app/api/` — API routes
- `src/components/` — UI components
- `src/lib/` — Database, auth, and utility helpers
- `supabase/migrations/` — Database migrations (push with `supabase db push --linked`)

## Important Architecture Notes

- **Timezone handling**: Client-side date computation is critical. The Today page uses `TodayClient.tsx` to determine the local date in the browser and fetches wins/journal via API with that date. Do NOT compute dates server-side for user-facing features — Vercel runs in UTC which causes off-by-one errors for US timezones.
- **Dark mode**: Uses CSS custom properties overridden by `.dark-mode` class in `globals.css`. Must use `@theme` (not `@theme inline`) so Tailwind generates `var()` references that respond to runtime changes.
- **Journal entries**: Content stored as JSON with keys: `well`, `challenge`, `learn`, `tomorrow`. Rating stored separately in `journal_entries.rating` (half-star, 0.5-5). Rating label is per-user in `user_settings.rating_label`.
- **Migrations**: Schema changes need both `supabase-schema.sql` update AND a migration file in `supabase/migrations/`. Push with `supabase db push --linked`.
