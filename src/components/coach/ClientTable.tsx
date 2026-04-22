import Link from 'next/link';
import MutedMono from '@/components/ui/MutedMono';
import Avatar from '@/components/ui/Avatar';

interface Client {
  id: string;
  name: string;
  avatarUrl?: string | null;
  status: 'on-track' | 'steady' | 'struggling';
  streak: number;
  commitmentsDone7: number;
  commitmentsTotal7: number;
  lastEntry: string;
  lastActive: string;
  rating14: number[];
  unreadMessages: number;
  hasUnopenedForm: boolean;
  endingSoon?: boolean;
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

const GRID_COLS = 'grid-cols-[1fr_110px_80px_130px_90px_100px_24px]';

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
      <div className={`grid ${GRID_COLS} gap-4 px-5 py-3 bg-surface border-b border-border`}>
        <MutedMono>Client</MutedMono>
        <MutedMono>7-day wins</MutedMono>
        <MutedMono>Streak</MutedMono>
        <MutedMono>14-day quality</MutedMono>
        <MutedMono>Last entry</MutedMono>
        <MutedMono>Last active</MutedMono>
        <div />
      </div>
      {clients.map(c => (
        <Link
          key={c.id}
          href={`/dashboard/clients/${c.id}`}
          className={`grid ${GRID_COLS} gap-4 px-5 py-4 items-center border-b border-border last:border-b-0 transition-colors ${
            c.endingSoon ? 'bg-accent-light hover:bg-accent-light/70' : 'hover:bg-surface'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <Avatar name={c.name} avatarUrl={c.avatarUrl} size={36} textSize={12} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[15px] text-text">{c.name}</div>
                {c.hasUnopenedForm && (
                  <span
                    title="New pre-coaching form"
                    className="inline-block w-[8px] h-[8px] rounded-full bg-accent flex-shrink-0"
                  />
                )}
                {c.unreadMessages > 0 && (
                  <span
                    title={`${c.unreadMessages} unread message${c.unreadMessages === 1 ? '' : 's'}`}
                    className="inline-block w-[8px] h-[8px] rounded-full bg-destructive flex-shrink-0"
                  />
                )}
              </div>
              <MutedMono className={`mt-0.5 block ${STATUS_COLOR[c.status]}`}>
                {STATUS_LABEL[c.status]}
                {c.unreadMessages > 0 && <span className="text-text-muted"> · new message</span>}
                {c.hasUnopenedForm && <span className="text-text-muted"> · pre-coaching form</span>}
                {c.endingSoon && <span className="text-accent"> · ending soon</span>}
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
          <MutedMono>{c.lastActive}</MutedMono>
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-text-muted">
            <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
