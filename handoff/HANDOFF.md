# Win the Day — ZHD Visual Redesign Handoff

This folder contains **drop-in source files** for the existing `leobabauta/wintheday` Next.js codebase. Copy the files in `src/` to their matching paths in your repo, delete the files listed in *Files to remove*, and restart `npm run dev`.

Open `preview.html` in a browser to see the full set of screens (mobile + desktop coach workspace) rendered standalone. That's the visual target.

---

## What changes

**Visual direction:** Quiet, editorial, warm. Out go the navy + lavender + gold with card shadows and confetti. In come warm paper (`#FCFBF9`), clay accent (`#B5705A`), Fraunces display serif + Jost body + JetBrains Mono labels. Hairline borders, no elevation, generous vertical rhythm.

**Default choices that are now shipped:**
- Accent: **Clay**
- Typography: Fraunces (display) + Jost (UI) + JetBrains Mono (labels)
- Density: compact
- Wins: warm tint on completed commitments (not checkbox-heavy)
- Onboarding: guided 4-step
- Today: "Rhythm" layout (commitments → practice → reflection prompt)
- Journal: timeline layout

Nothing about the backend, auth, routing, or API changes. This is purely the UI layer.

---

## Apply order

1. **Fonts + tokens** — replace `src/app/globals.css` and `src/app/layout.tsx`.
2. **Shared primitives** — replace `src/components/ui/Card.tsx` and `src/components/ui/Button.tsx`. Add `src/components/ui/MutedMono.tsx` and `src/components/ui/Eyebrow.tsx`.
3. **Client shell + nav** — replace `src/components/layout/ClientShell.tsx` and `src/components/layout/ClientNav.tsx`.
4. **Client screens** — replace `src/components/wins/DailyWins.tsx`, `src/components/journal/JournalView.tsx`, `src/components/messages/MessageThread.tsx`, `src/components/wins/WelcomeFlow.tsx`.
5. **Coach shell + screens** — replace `src/app/(coach)/layout.tsx`, `src/components/coach/ClientTable.tsx`, `src/components/coach/InboxView.tsx`, and the client-detail page at `src/app/(coach)/dashboard/clients/[id]/page.tsx`.
6. **Settings additions** — add `src/components/layout/NudgeSettings.tsx` and wire it into the settings page (instructions below).

Files removed from the project:
- `src/components/ui/TrophyIcon.tsx` (no trophies in the new direction)
- `src/components/layout/DarkModeSetting.tsx` (dark mode toggle removed; the new palette is single-mode; you can add a dark variant later if wanted)
- `canvas-confetti` dependency (`npm uninstall canvas-confetti @types/canvas-confetti`)

---

## Files in this handoff

```
handoff/
├── HANDOFF.md                     ← this file
├── preview.html                   ← open in browser to see the full design
└── src/
    ├── app/
    │   ├── globals.css
    │   └── layout.tsx
    ├── components/
    │   ├── ui/
    │   │   ├── Card.tsx
    │   │   ├── Button.tsx
    │   │   ├── MutedMono.tsx
    │   │   └── Eyebrow.tsx
    │   ├── layout/
    │   │   ├── ClientShell.tsx
    │   │   ├── ClientNav.tsx
    │   │   └── NudgeSettings.tsx
    │   ├── wins/
    │   │   ├── DailyWins.tsx
    │   │   └── WelcomeFlow.tsx
    │   ├── journal/
    │   │   └── JournalView.tsx
    │   ├── messages/
    │   │   └── MessageThread.tsx
    │   └── coach/
    │       ├── ClientTable.tsx
    │       └── InboxView.tsx
    └── _partial_notes/
        └── coach-client-detail.md   ← instructions for the large page file
```

---

## Design tokens (now in `globals.css`)

| Token | Value |
|---|---|
| `--color-bg` | `#FCFBF9` warm paper |
| `--color-surface` | `#F5F1EB` |
| `--color-text` | `#1A1714` |
| `--color-text-secondary` | `#5A4F45` |
| `--color-text-muted` | `#998A7A` |
| `--color-border` | `#E8E0D4` |
| `--color-accent` | `#B5705A` Clay |
| `--color-accent-light` | `#F0DDD3` |
| `--color-destructive` | `#A44A3A` |
| `--font-display` | Fraunces |
| `--font-body` | Jost |
| `--font-mono` | JetBrains Mono |

Tailwind v4 `@theme` block exposes these as utilities (`bg-bg`, `text-accent`, `font-display`, etc.).

---

## Hand-rolling the remaining screens

For two files that are too large to fully regenerate here without risking drift, I've given you skeletons + explicit instructions:

### `src/app/(coach)/dashboard/clients/[id]/page.tsx`

This was 11.5 KB of mixed server data-fetching + JSX. **Keep the server-side data fetching exactly as it was.** Only replace the JSX. See `src/_partial_notes/coach-client-detail.md` for the new render structure with:

- Header: avatar · status pill · Fraunces name · chips for location/tenure/plan
- Stats row (4 cards): 7-day wins, streak, avg quality 14d, sessions held
- Tabs: About (default), Journal, Wins, Messages
- About panel: two-column layout (Goals + Notes on left; Contact + Coaching relationship + Billing on right)

### `src/components/coach/ClientInfoEditor.tsx`

Untouched structurally — just replace navy/lavender Tailwind classes with the new tokens and swap font utilities. See the note at the top of `coach-client-detail.md` for the class mapping.

---

## Dependency changes

```bash
npm uninstall canvas-confetti @types/canvas-confetti
```

The Fraunces + Jost + JetBrains Mono fonts are loaded via `next/font/google` in the new `layout.tsx`. No manual install.

---

## After copying

1. `npm run dev`
2. Visit `/today` — you should see warm paper, a Fraunces italic heading, and the new commitments list.
3. Visit `/dashboard` (coach) — dense client table with sparkbars.
4. Visit a client detail page — About tab is default; verify profile data renders.

If anything renders with the old navy/lavender palette, you've got a stale Tailwind class somewhere. Search for `bg-navy`, `bg-lavender`, `text-gold` and remove — the new theme doesn't define those.

---

## What to preserve

- All API routes, middleware, auth, db queries, schemas — zero changes
- Data shape: commitments, wins, journal entries, messages unchanged
- Route structure: `/today`, `/journal`, `/messages`, `/settings`, `/welcome`, `/dashboard/...`
- Settings page (`src/app/(client)/settings/page.tsx`) — add a `<NudgeSettings />` section to it; the other sub-settings (name, email, password, rating label, reflection time) can stay but should be wrapped in the new `<Card>` and use the new typography. Quick styling pass.

---

## Visual QA checklist

- [ ] Page bg is warm cream, not white or purple
- [ ] Headings are Fraunces (serif), body is Jost (sans)
- [ ] Muted meta text is uppercase JetBrains Mono with letter-spacing
- [ ] Accent color is clay orange, not navy
- [ ] No card drop shadows — hairline borders only
- [ ] Completed commitments have warm tint, no heavy checkmark
- [ ] Reflection text renders in Fraunces italic 300
- [ ] Message bubbles: client = clay, coach = bordered surface
- [ ] Coach dashboard table has sparkbars (14-day quality)
- [ ] Client detail: About tab is default

---

Questions while implementing? The full interactive reference is at `preview.html`.
