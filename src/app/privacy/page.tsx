import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Win the Day',
};

const CONTACT = 'contact@zenhabits.net';
const UPDATED = 'October 29, 2026';

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[22px] leading-[1.2] mt-10 mb-3">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-[1.7] text-text-secondary mb-4">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-[15px] leading-[1.7] text-text-secondary mb-2">{children}</li>;
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <main className="mx-auto max-w-[640px] px-6 py-14">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted">Win the Day</p>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-[-0.01em] mt-2">Privacy Policy</h1>
        <p className="font-mono text-[11px] text-text-muted mt-3 mb-8">Last updated {UPDATED}</p>

        <P>
          Win the Day is a coaching app run by Leo Babauta for his coaching clients. You use it to keep
          daily commitments, write reflections, and talk with your coach. This page explains what the
          app stores, who can see it, and how to delete it.
        </P>
        <P>
          The short version: your data exists to support your coaching. Only you and your coach see it.
          We don&apos;t run ads, use analytics or tracking tools, or sell or share your data for marketing.
        </P>

        <H>What we collect</H>
        <ul className="list-disc pl-5 mb-4">
          <Li><strong>Account details:</strong> your name, email address and password (stored only as a
            one-way hash), plus an optional profile photo.</Li>
          <Li><strong>What you write and track:</strong> your daily commitments and wins, reflections and
            daily ratings, pre-session forms, and the messages you exchange with your coach.</Li>
          <Li><strong>Photos you send</strong> in messages.</Li>
          <Li><strong>Voice recordings</strong> you choose to dictate into a message. The audio is sent
            to a transcription service to turn it into text, and isn&apos;t stored. Only the text you send is kept.</Li>
          <Li><strong>Coaching details your coach records:</strong> session times, coaching dates and
            schedule, session notes, and payment terms.</Li>
          <Li><strong>Settings and technical data:</strong> your time zone, reminder and appearance
            preferences, when you were last active in the app, and, if you allow notifications, a push
            notification token for your device.</Li>
        </ul>

        <H>How it&apos;s used</H>
        <P>
          Everything above is used only to run the app and your coaching. That includes showing you your
          own history, letting your coach follow along and respond, scheduling sessions, and sending the
          reminders and notifications you&apos;ve set up (by email and push).
        </P>

        <H>Who can see it</H>
        <P>
          You and your coach. Your coach can see your commitments, wins, reflections, ratings, messages and
          pre-session forms, because that&apos;s what the coaching is built on. Nobody else using the app
          can see your data.
        </P>
        <P>We rely on a few service providers to run the app. They process data only on our behalf:</P>
        <ul className="list-disc pl-5 mb-4">
          <Li><strong>Vercel</strong> hosts the app.</Li>
          <Li><strong>Supabase</strong> stores the database and message photos.</Li>
          <Li><strong>Resend</strong> sends email reminders and notifications.</Li>
          <Li><strong>Apple</strong> and <strong>Google (Firebase)</strong> deliver push notifications.</Li>
          <Li><strong>OpenAI</strong> transcribes voice dictation into text.</Li>
          <Li><strong>Google Calendar</strong> is used by your coach to schedule sessions, so session times
            and your email address may appear in your coach&apos;s calendar.</Li>
        </ul>
        <P>We don&apos;t share your data with anyone else, except where the law requires it.</P>

        <H>How long we keep it</H>
        <P>
          We keep your data for as long as you have an account. If you delete your account, it&apos;s removed
          right away and can&apos;t be recovered. That includes your wins, reflections, messages, photos and
          session history.
        </P>

        <H>Deleting your account</H>
        <P>
          In the app, go to <strong>Me</strong> (settings), choose <strong>Delete account</strong>, and confirm
          with your password. You can also email{' '}
          <a href={`mailto:${CONTACT}`} className="text-[var(--color-accent)] underline">{CONTACT}</a> and
          we&apos;ll delete it for you. You can ask us at any time for a copy of your data, or for corrections.
        </P>

        <H>Security</H>
        <P>
          Data is encrypted in transit (HTTPS), passwords are stored as hashes, and access to the database
          is limited to the app itself.
        </P>

        <H>Children</H>
        <P>Win the Day is for adults in a coaching relationship. It isn&apos;t meant for anyone under 16.</P>

        <H>Changes</H>
        <P>
          If this policy changes in a way that matters, we&apos;ll update the date above and let you know
          in the app or by email.
        </P>

        <H>Contact</H>
        <P>
          Questions about your privacy:{' '}
          <a href={`mailto:${CONTACT}`} className="text-[var(--color-accent)] underline">{CONTACT}</a>.
        </P>
      </main>
    </div>
  );
}
