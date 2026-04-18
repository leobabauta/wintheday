import Link from 'next/link';
import MutedMono from '@/components/ui/MutedMono';

interface DayStats {
  date: string;
  commitmentsWon: number;
  commitmentsTotal: number;
  rating: number; // 0-5 (0 = none)
}

interface Client {
  id: string;
  name: string;
  initials: string;
  status: 'on-track' | 'steady' | 'struggling';
  streak: number;
  commitmentsDone7: number;
  commitmentsTotal7: number;
  lastEntry: string;
  rating14: number[];
  openNeeds?: 'reflection' | 'message' | 'nudge' | null;
}

interface Props {
  clients: Client[];
}

const STATUS_LABEL = {
  'on-track': 'On track',
  'steady': 'Steady',
  'struggling': 'Needs care',
};
const STATUS_COLOR = {
  'on-track': 'text-accent',
  'steady': 'text-text-secondary',
  'struggling': 'text-destructive',
};

function Bars14({ values }: { values: number[] }) {
  return (
    <div className="flex gap-[2px] items-end h-[22px]">
      {values.map((v, i) => (
        <div key={i}
          className={`w-1 rounded-[1px] ${v === 0 ? 'bg-border' : v >= 4 ? 'bg-accent' : 'bg-text-secondary/60'}`}
          style={{ height: `${Math.max(2, (v / 5) * 22)}px` }} />
      ))}
    </div>
  );
}

export default function ClientTable({ clients }: Props) {
  return (
    <div className="border border-border rounded-[14px] overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_100px_140px_110px_24px] gap-4 px-5 py-3 bg-surface border-b border-border">
        <MutedMono>Client</MutedMono>
        <MutedMono>7-day wins</MutedMono>
        <MutedMono>Streak</MutedMono>
        <MutedMono>14-day quality</MutedMono>
        <MutedMono>Last entry</MutedMono>
        <div />
      </div>
      {clients.map(c => (
        <Link
          key={c.id}
          href={`/dashboard/clients/${c.id}`}
          className="grid grid-cols-[1fr_120px_100px_140px_110px_24px] gap-4 px-5 py-4 items-center border-b border-border last:border-b-0 hover:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-full bg-accent-light text-accent flex items-center justify-center text-[12px] tracking-wider flex-shrink-0">
              {c.initials}
            </div>
            <div>
              <div className="text-[15px] text-text">{c.name}</div>
              <MutedMono className={`mt-0.5 block ${STATUS_COLOR[c.status]}`}>
                {STATUS_LABEL[c.status]}
                {c.openNeeds && <span className="text-text-muted"> · {c.openNeeds === 'reflection' ? 'new reflection' : c.openNeeds === 'message' ? 'new message' : 'gone quiet'}</span>}
              </MutedMono>
            </div>
          </div>
          <div>
            <div className="font-display text-[15px] tabular-nums">
              {c.commitmentsDone7}<span className="text-text-muted text-[13px]">/{c.commitmentsTotal7}</span>
            </div>
            <div className="w-20 h-[2px] bg-border mt-1 rounded overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${(c.commitmentsDone7 / c.commitmentsTotal7) * 100}%` }} />
            </div>
          </div>
          <div className={`font-display text-[14px] tabular-nums ${c.streak > 0 ? 'text-text' : 'text-text-muted'}`}>
            {c.streak > 0 ? `${c.streak} day${c.streak === 1 ? '' : 's'}` : '—'}
          </div>
          <Bars14 values={c.rating14} />
          <MutedMono>{c.lastEntry}</MutedMono>
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-text-muted">
            <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
