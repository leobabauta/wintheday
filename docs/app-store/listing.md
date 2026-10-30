# App Store Connect — listing text (draft)

Drafted 2026-10-29. Paste into **App Store Connect → Win the Day Coaching →
iOS App → version 1.2**. Character counts are under Apple's limits.

## App Information

| Field | Value |
| --- | --- |
| Name (30) | Win the Day Coaching *(already set)* |
| Subtitle (30) | `Daily practice with your coach` (30) |
| Primary category | **Health & Fitness** — closest fit for habit + reflection apps. Alternative: Lifestyle |
| Secondary category | Productivity |
| Privacy Policy URL | `https://www.wintheday.work/privacy` |
| Support URL | `https://www.wintheday.work/privacy` for now (has the contact email) — or a zenhabits.net contact page if you prefer |
| Copyright | `2026 Leo Babauta` |

## Version 1.2

**Promotional Text (170)**

```
A quiet daily companion for your coaching: keep your commitments, reflect each evening, and stay in touch with your coach between sessions.
```

**Description (4000)**

```
Win the Day is the companion app for clients of Leo Babauta's coaching. It keeps the work of coaching alive between sessions — not with streaks and badges, but with a simple daily rhythm.

EACH MORNING
See the commitments and practices you've chosen with your coach, and check them off as you go.

EACH EVENING
Write a short reflection: what went well, what was challenging, what you noticed, and what you'll do tomorrow. Rate the quality of your day so you and your coach can see the shape of your weeks.

BETWEEN SESSIONS
Message your coach directly — type, dictate with your voice, or send a photo. Your coach reads your reflections and can respond, encourage, or ask a question.

BEFORE EACH SESSION
Fill out a short pre-session form so you arrive knowing what you want to work on. Afterward, read your coach's notes from the session.

GENTLE NUDGES
Optional morning and evening reminders, at the times you choose.

PRIVATE BY DESIGN
Only you and your coach see what you write. No ads, no tracking, no selling your data. You can delete your account and everything in it at any time from the app.

Win the Day is for existing coaching clients. Your coach creates your account and sends you your login.
```

**Keywords (100)**

```
coaching,habits,reflection,journal,commitments,accountability,mindfulness,practice,daily,coach
```
(94 characters — Apple already indexes words in the name and subtitle, so "win", "day" and "coaching" aren't repeated.)

**What's New** — not shown for a first release.

## Screenshots

`docs/app-store/screenshots/` — 1320×2868, the 6.9" iPhone size (Apple scales it
down for smaller iPhones). Upload in this order:

1. `01-today.png` — today's commitments and practices
2. `02-journal.png` — an evening reflection with the Daily Quality rating
3. `03-messages.png` — conversation with the coach
4. `04-session.png` — pre-session form and the coach's session notes

Regenerate with fresh dates (they're relative to the seed date) by rerunning
`node scripts/seed-review-account.mjs` and recapturing.

**iPad:** build 5 targets iPhone *and* iPad (`TARGETED_DEVICE_FAMILY = "1,2"`),
so App Store Connect also requires 13" iPad screenshots. Those are in
`screenshots/ipad/` (2064×2752, same four pages, desktop top-nav layout). If you'd
rather not offer an iPad version, switch the project to iPhone-only and upload a
new build — then these aren't needed.

## App Review Information

- **Sign-in required:** yes
- **User name / password:** in `.env.review` (gitignored) —
  `REVIEW_EMAIL` / `REVIEW_PASSWORD`. Created by `scripts/seed-review-account.mjs`.
- **Contact:** your name, phone, and email.

**Notes (4000)**

```
Win the Day is a private companion app for the clients of a one-on-one coaching practice (Leo Babauta). Clients use it daily to track the commitments they set with their coach, write evening reflections, fill out a form before each coaching session, and message their coach.

DEMO ACCOUNT
The provided login is a client account with two weeks of sample data. Suggested path: Today (check off a commitment) → Journal (past reflections) → Messages (send a message, try the microphone or camera buttons) → Sessions (pre-session form and coach's notes) → Me (settings).

ACCOUNTS
There is no public sign-up. The coach creates each client's account and gives them their login; this is why the app opens to a sign-in screen.

ACCOUNT DELETION
Me → Delete account (at the bottom). The client confirms with their password, and the account and all its data are permanently deleted.

NATIVE FEATURES
- Push notifications: replies from the coach, coach reactions to reflections, and optional morning/evening reminders at times the client chooses.
- Microphone: voice dictation in messages (transcribed to text).
- Camera / photo library: photos attached to messages.

PAYMENTS
None in the app. Coaching is a one-on-one service arranged and paid for directly between coach and client outside the app; the sessions themselves happen outside the app (guideline 3.1.3(e)).

DISTRIBUTION
We intend to request Unlisted App Distribution, since the app is only useful to existing clients of this coaching practice.
```

## Age rating questionnaire

All "None" / "No", except:
- **Messaging and chat:** Yes — private messages between a client and their coach only (no contact with strangers).
- **Unrestricted web access:** No — the app only loads its own site.

Expected result: 4+ (or 9+/12+ depending on how Apple weighs messaging — either is fine).
