# Win the Day

Coaching app for daily commitments, journaling, and client-coach communication.

## Deployment

- Hosted on **Vercel** — auto-deploys on push to `main` (GitHub App integration). Manual override: `vercel --prod --yes`.
- Live at **https://www.wintheday.work/**
- Supabase project ref: `tkhwiukylohjfnocjqyy`
- Vercel Hobby plan — cron jobs limited to once daily

## Tech Stack

- Next.js (App Router) with TypeScript
- PostgreSQL via Supabase
- Tailwind CSS v4 (uses `@theme` NOT `@theme inline` — inline breaks dark mode)
- JWT auth with bcrypt
- Resend for transactional emails (reminders, password reset)

## Key Directories

- `src/app/(coach)/` — Coach-only routes (dashboard, client management, inbox, settings)
- `src/app/(client)/` — Client-only routes (today, journal, messages, settings)
- `src/app/api/` — API routes
- `src/components/` — UI components
- `src/lib/` — Database, auth, and utility helpers
- `supabase/migrations/` — Database migrations (push with `supabase db push --linked`)

## Important Architecture Notes

- **Timezone handling**: Client-side date computation is critical. The Today page uses `TodayClient.tsx` to determine the local date in the browser and fetches wins/journal via API with that date. Do NOT compute dates server-side for user-facing features — Vercel runs in UTC which causes off-by-one errors for US timezones. Client timezone is auto-detected from browser and stored in `user_settings.timezone`.
- **Dark mode**: Uses CSS custom properties overridden by `.dark-mode` class in `globals.css`. Must use `@theme` (not `@theme inline`) so Tailwind generates `var()` references that respond to runtime changes.
- **Journal entries**: Content stored as JSON with keys: `well`, `challenge`, `learn`, `tomorrow`. Rating stored separately in `journal_entries.rating` (half-star, 0.5-5). Rating label (called "Daily Quality") is per-user in `user_settings.rating_label`.
- **Migrations**: Schema changes need both `supabase-schema.sql` update AND a migration file in `supabase/migrations/`. Push with `supabase db push --linked`.
- **Email**: Uses Resend (`RESEND_API_KEY` env var). Daily reminder cron at 4 AM UTC. Password reset emails use short-lived JWT tokens (15 min).
- **Auth**: Coach can set client passwords directly from the client info editor. Password reset flow available on login page for both roles.

## Environment Variables (Vercel)

- `DATABASE_URL` — Supabase connection string
- `JWT_SECRET` — Random string for JWT signing
- `RESEND_API_KEY` — From resend.com
- `CRON_SECRET` — Random string to authenticate cron requests
- `REMINDER_FROM_EMAIL` — Optional, defaults to Resend dev sender
