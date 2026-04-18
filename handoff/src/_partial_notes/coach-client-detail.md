# Client Detail Page — rendering notes

The existing `src/app/(coach)/dashboard/clients/[id]/page.tsx` is ~300 lines of mixed server data-fetching + JSX. **Do not replace the data-fetching logic.** Only replace the JSX rendering.

## Class migration (anywhere in existing code)

Search-and-replace these Tailwind classes across the coach folder:

| Old | New |
|---|---|
| `bg-navy-*` → | `bg-text` (for dark) or specific value |
| `bg-lavender-*` → | `bg-surface` or `bg-accent-light` |
| `text-gold` → | `text-accent` |
| `bg-white` → | `bg-bg` |
| `border-gray-*` → | `border-border` |
| `text-gray-500` → | `text-text-muted` |
| `text-gray-700` → | `text-text-secondary` |
| `rounded-xl shadow-*` → | `rounded-[12px] border border-border` (no shadow) |
| `font-sans` → | `font-body` |
| any serif heading font → | `font-display` |

## New client detail page structure

Replace the JSX body with this layout, passing the props you already fetch:

```tsx
import MutedMono from '@/components/ui/MutedMono';
import Eyebrow from '@/components/ui/Eyebrow';
import Button from '@/components/ui/Button';

// inside your render:
return (
  <div className="max-w-[940px] mx-auto px-12 pt-8 pb-20">
    <Link href="/dashboard" className="text-[13px] text-text-secondary hover:text-text block mb-3.5">
      ← Clients
    </Link>

    {/* Header */}
    <div className="flex gap-5 items-start mb-5">
      <div className="w-16 h-16 rounded-full bg-accent-light text-accent flex items-center justify-center text-[18px] flex-shrink-0">
        {client.initials}
      </div>
      <div className="flex-1">
        <MutedMono>
          <span className="text-accent">{STATUS_LABEL[client.status]}</span>
          {' · '}{client.streak > 0 ? `${client.streak}-day streak` : 'No current streak'}
        </MutedMono>
        <h1 className="font-display text-[30px] mt-1">{client.name}</h1>
        <div className="flex flex-wrap gap-3.5 mt-2">
          <ChipMeta label="Location" value={`${client.location} · ${client.timezone}`} />
          <ChipMeta label="With you" value={`${tenure} · since ${formatStart(client.startDate)}`} />
          <ChipMeta label="Plan" value={`${client.plan} · $${client.rate}/${client.rateUnit}`} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5 items-end">
        <Button variant="filled" size="sm">Message</Button>
        <button className="text-[12px] text-text-muted">Schedule session</button>
      </div>
    </div>

    {/* Stats row */}
    <div className="grid grid-cols-4 gap-3.5 mb-6">
      <StatCard label="7-day wins" value={`${client.commitmentsDone7}/${client.commitmentsTotal7}`} />
      <StatCard label="Current streak" value={client.streak > 0 ? `${client.streak}d` : '—'} />
      <StatCard label="Avg quality · 14d" value={avgQuality.toFixed(1)} />
      <StatCard label="Sessions held" value={client.sessionsHeld} />
    </div>

    {/* Tabs: About (default) · Journal · Wins · Messages */}
    {/* … render active panel. See AboutPanel below for structure. */}
  </div>
);

function ChipMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <MutedMono>{label}</MutedMono>
      <div className="text-[13px] text-text">{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border rounded-[12px] p-4">
      <MutedMono className="block mb-2">{label}</MutedMono>
      <p className="font-display text-[26px]">{value}</p>
    </div>
  );
}
```

## About panel (two-column)

```tsx
<div className="grid grid-cols-2 gap-6">
  {/* Left: Goals + Notes */}
  <div className="flex flex-col gap-5">
    <Section title="Goals">
      <ul className="list-none p-0 m-0">
        {client.goals.map((g, i) => (
          <li key={i} className="py-2.5 border-b border-border last:border-b-0 flex gap-2.5 items-start">
            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
            <span className="text-[14px] text-text leading-[1.5]">{g}</span>
          </li>
        ))}
      </ul>
    </Section>
    <Section title="Private notes">
      <p className="reflection-text text-[14px] text-text leading-[1.6]">{client.notes}</p>
      <button className="text-[11px] text-text-muted hover:text-text mt-2">Edit notes</button>
    </Section>
  </div>
  {/* Right: Contact + Coaching + Billing */}
  <div className="flex flex-col gap-5">
    <Section title="Contact">
      <DataRow label="Email" value={client.email} />
      <DataRow label="Phone" value={client.phone} />
      <DataRow label="Location" value={client.location} />
      <DataRow label="Timezone" value={client.timezone} last />
    </Section>
    <Section title="Coaching relationship">
      <DataRow label="Started" value={formatStart(client.startDate)} />
      <DataRow label="Tenure" value={tenure} />
      <DataRow label="Sessions held" value={client.sessionsHeld} />
      <DataRow label="Next session" value={client.nextSession} last />
    </Section>
    <Section title="Billing">
      <DataRow label="Plan" value={client.plan} />
      <DataRow label="Rate" value={`$${client.rate}/${client.rateUnit}`} />
      <DataRow label="Status" value={client.billingStatus}
        valueClass={client.billingStatus === 'Payment due' ? 'text-destructive' : 'text-text'} last />
    </Section>
  </div>
</div>
```

```tsx
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-[12px] p-4 bg-bg">
      <MutedMono className="block mb-2.5">{title}</MutedMono>
      {children}
    </div>
  );
}

function DataRow({ label, value, last, valueClass = 'text-text' }: {
  label: string; value: string | number; last?: boolean; valueClass?: string;
}) {
  return (
    <div className={`flex items-baseline gap-3 py-2 ${last ? '' : 'border-b border-border'}`}>
      <MutedMono className="w-[100px] flex-shrink-0">{label}</MutedMono>
      <span className={`text-[13px] ${valueClass} text-right flex-1`}>{value}</span>
    </div>
  );
}
```

## Schema additions

Your existing client table likely doesn't have all these fields. Add (nullable to start):

```sql
ALTER TABLE clients ADD COLUMN phone TEXT;
ALTER TABLE clients ADD COLUMN location TEXT;
ALTER TABLE clients ADD COLUMN timezone TEXT;
ALTER TABLE clients ADD COLUMN start_date DATE;
ALTER TABLE clients ADD COLUMN plan TEXT;
ALTER TABLE clients ADD COLUMN rate INT;
ALTER TABLE clients ADD COLUMN rate_unit TEXT;
ALTER TABLE clients ADD COLUMN billing_status TEXT;
ALTER TABLE clients ADD COLUMN goals JSONB;
ALTER TABLE clients ADD COLUMN notes TEXT;
```

Until those columns exist, gate the About panel with `{client.startDate ? <AboutPanel /> : <AboutEmpty />}`.
