# Win the Day

Coaching app for daily commitments, journaling, and client-coach communication.

## Deployment

- Hosted on **Vercel**
- Live at **https://www.wintheday.work/**

## Tech Stack

- Next.js (App Router) with TypeScript
- PostgreSQL via Supabase
- Tailwind CSS v4
- JWT auth with bcrypt

## Key Directories

- `src/app/(coach)/` — Coach-only routes (dashboard, client management)
- `src/app/(client)/` — Client-only routes (today, journal, messages)
- `src/app/api/` — API routes
- `src/components/` — UI components
- `src/lib/` — Database, auth, and utility helpers
