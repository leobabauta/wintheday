# App Store Connect — App Privacy answers (draft)

Drafted 2026-10-29 from what the code actually stores. Enter these under
**App Store Connect → Win the Day Coaching → App Privacy**.

- **Privacy Policy URL:** `https://www.wintheday.work/privacy`
- **Account deletion:** in-app at Me → Delete account (client role). Coach
  accounts can't self-delete (it would orphan clients) — reviewers only see a
  client account, so this doesn't come up.

## Step 1 — "Do you or your third-party partners collect data from this app?"

**Yes.**

## Step 2 — Data types

Answers for every type declared below are the same:

| Question | Answer |
| --- | --- |
| Purpose | **App Functionality** only (not analytics, ads, personalization, or "other") |
| Linked to the user's identity? | **Yes** — everything hangs off the account |
| Used for tracking? | **No** |

| Category → type | Declare? | What it is in the app |
| --- | --- | --- |
| Contact Info → **Name** | ✅ | `users.name` |
| Contact Info → **Email Address** | ✅ | `users.email` — login, reminders, notifications |
| User Content → **Emails or Text Messages** | ✅ | Coach ↔ client chat (`messages`) |
| User Content → **Photos or Videos** | ✅ | Photos attached to messages (Supabase storage); profile photo |
| User Content → **Audio Data** | ✅ (see note 1) | Voice dictation sent to OpenAI Whisper |
| User Content → **Other User Content** | ✅ | Wins/commitments, reflections + daily rating, pre-session forms |
| Identifiers → **User ID** | ✅ | Account id |
| Usage Data → **Product Interaction** | ✅ (see note 2) | `last_active_at`, reflection snooze/skip, notification send history |
| Identifiers → Device ID | ❌ (see note 3) | |
| Location (Precise / Coarse) | ❌ | Only the time zone is stored, which Apple doesn't count as location |
| Health & Fitness | ❌ (see note 4) | |
| Financial Info / Purchases | ❌ (see note 5) | |
| Diagnostics (crash, performance) | ❌ | No crash reporting or analytics SDKs |
| Contacts, Browsing/Search History, Sensitive Info, Other Data | ❌ | |

The result on the App Store listing will read: **"Data Linked to You"** — Contact
Info, User Content, Identifiers, Usage Data. **"Data Used to Track You"** — none.

## Judgment calls (your decision)

1. **Audio Data.** The app doesn't store recordings — they go to OpenAI, are
   transcribed, and only the text is kept. Apple lets you skip data that's
   processed only in real time, but OpenAI's API keeps inputs for up to 30
   days for abuse monitoring, so declaring it is the safer answer. Under-declaring
   is what gets apps flagged; over-declaring costs nothing.
2. **Product Interaction.** Last-active time is shown to the coach on the
   dashboard. It's minor, but it is usage data tied to the account, so it's declared.
3. **Device ID.** Push tokens (APNs/FCM) aren't the advertising identifier or a
   vendor device ID, and Apple doesn't treat them as Device ID. Skipped.
4. **Health & Fitness.** The daily rating is a self-assessed "quality of day",
   not health data. Reflections can mention anything, but the app doesn't ask
   for health info. Skipped.
5. **Financial Info.** `client_info.payment_amount` / `payment_frequency` are
   typed in by the coach, not collected from the client through the app, and
   no payments happen in the app. Skipped. If you'd rather be conservative,
   declare Financial Info → Other Financial Info, App Functionality, linked.

## Third parties that receive data (for your own reference)

Not entered in App Store Connect, but listed in the privacy policy:
Vercel (hosting), Supabase (database + photo storage), Resend (email), Apple
APNs + Google FCM (push), OpenAI (voice transcription), Google Calendar (coach's
session scheduling).
