'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';

interface DayStats {
  date: string;
  total: number;
  completed: number;
}

interface Client {
  id: number;
  name: string;
  email: string;
  sign_on_date: string;
  closing_date: string | null;
  coaching_day: string;
  coaching_time: string;
  coaching_frequency: string;
  commitmentCount: number;
  winHistory: DayStats[];
  unreadMessages: number;
  todayWinsCompleted: number;
  hasJournalToday: boolean;
}

interface Props {
  clients: Client[];
}

function StarIcon({ ratio }: { ratio: number }) {
  if (ratio === 0) return <span className="text-lavender-dark text-xs">○</span>;
  if (ratio < 1) return <span className="text-warning text-xs">◐</span>;
  return <span className="text-success text-xs">●</span>;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

export default function ClientTable({ clients }: Props) {
  if (clients.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-navy/50 mb-4">No clients yet</p>
        <Link href="/dashboard/clients/new" className="text-navy font-medium hover:underline">
          + Add your first client
        </Link>
      </Card>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lavender-dark/20">
                <th className="text-left py-3 px-2 text-xs font-semibold text-navy/50 uppercase tracking-wider">Client</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-navy/50 uppercase tracking-wider">Wins</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-navy/50 uppercase tracking-wider">Last 14 Days</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-navy/50 uppercase tracking-wider">Coaching</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-navy/50 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b border-lavender-dark/10 hover:bg-lavender-light/30 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/clients/${client.id}`} className="font-medium text-navy hover:underline">
                        {client.name}
                      </Link>
                      {client.unreadMessages > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold">
                          {client.unreadMessages}
                        </span>
                      )}
                    </div>
                    {(client.todayWinsCompleted > 0 || client.hasJournalToday) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {client.todayWinsCompleted > 0 && (
                          <span className="text-[10px] text-success font-medium">{client.todayWinsCompleted} win{client.todayWinsCompleted !== 1 ? 's' : ''} today</span>
                        )}
                        {client.hasJournalToday && (
                          <span className="text-[10px] text-navy/40 font-medium">journaled today</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-navy/60">{client.commitmentCount} items</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-0.5 items-center">
                      {client.winHistory.map((day, i) => (
                        <div key={i} className="flex flex-col items-center" title={`${formatShortDate(day.date)}: ${day.completed}/${day.total}`}>
                          <StarIcon ratio={day.total > 0 ? day.completed / day.total : 0} />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-navy/60 text-xs">
                    {client.coaching_day} {client.coaching_time}
                    <br />
                    <span className="text-navy/40">{client.coaching_frequency}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="text-xs text-navy/50 hover:text-navy"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {clients.map(client => (
          <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
            <Card className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-navy">{client.name}</span>
                {client.unreadMessages > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold">
                    {client.unreadMessages}
                  </span>
                )}
              </div>
              <div className="flex gap-0.5 items-center mb-2">
                {client.winHistory.map((day, i) => (
                  <StarIcon key={i} ratio={day.total > 0 ? day.completed / day.total : 0} />
                ))}
              </div>
              <div className="text-xs text-navy/50">
                {client.commitmentCount} wins · {client.coaching_day} {client.coaching_time}
              </div>
              {(client.todayWinsCompleted > 0 || client.hasJournalToday) && (
                <div className="flex items-center gap-2 mt-1">
                  {client.todayWinsCompleted > 0 && (
                    <span className="text-[10px] text-success font-medium">{client.todayWinsCompleted} win{client.todayWinsCompleted !== 1 ? 's' : ''} today</span>
                  )}
                  {client.hasJournalToday && (
                    <span className="text-[10px] text-navy/40 font-medium">journaled today</span>
                  )}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
