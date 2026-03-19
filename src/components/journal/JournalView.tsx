'use client';

import { useState, useRef, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';

interface JournalEntry {
  id: number;
  date: string;
  content: string;
  rating: number | null;
  updated_at: string;
}

interface WinRecord {
  title: string;
  type: string;
  completed: number;
}

const PROMPTS = [
  { key: 'well', label: 'What went well today?' },
  { key: 'challenge', label: 'What was challenging?' },
  { key: 'learn', label: 'What did you learn or notice?' },
  { key: 'tomorrow', label: 'What will you focus on tomorrow?' },
];

function parseContent(content: string): Record<string, string> {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {
    if (content.trim()) return { well: content };
  }
  return {};
}

function formatContent(answers: Record<string, string>): string {
  return JSON.stringify(answers);
}

function displayAnswers(content: string): { label: string; text: string }[] {
  const answers = parseContent(content);
  return PROMPTS
    .filter(p => answers[p.key]?.trim())
    .map(p => ({ label: p.label, text: answers[p.key] }));
}

function formatDateHeader(dateStr: string, todayStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  let ago = '';
  if (dateStr === todayStr) {
    ago = 'TODAY';
  } else {
    const today = new Date(todayStr + 'T12:00:00');
    const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) ago = '1 DAY AGO';
    else if (diffDays < 7) ago = `${diffDays} DAYS AGO`;
    else if (diffDays < 14) ago = '1 WEEK AGO';
    else if (diffDays < 30) ago = `${Math.floor(diffDays / 7)} WEEKS AGO`;
    else if (diffDays < 60) ago = '1 MONTH AGO';
    else ago = `${Math.floor(diffDays / 30)} MONTHS AGO`;
  }

  return { day, month, ago };
}

interface Props {
  entries: JournalEntry[];
  today: string;
  winsMap?: Record<string, WinRecord[]>;
  ratingLabel?: string;
}

export default function JournalView({ entries, today, winsMap = {}, ratingLabel = 'inner peace' }: Props) {
  const [entryList, setEntryList] = useState(entries);
  const [editing, setEditing] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const save = useCallback(async (date: string, data: Record<string, string>) => {
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content: formatContent(data) }),
      });
      setSaved(true);
    } catch { /* retry */ }
  }, []);

  const handleChange = (key: string, value: string) => {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(editing!, updated), 2000);
  };

  const handleBlur = () => {
    if (!saved && editing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      save(editing, answers);
    }
  };

  const startNew = () => {
    setEditing(today);
    const existing = entryList.find(e => e.date === today);
    setAnswers(existing ? parseContent(existing.content) : {});
    setExpandedId(null);
  };

  const startEdit = (entry: JournalEntry) => {
    setEditing(entry.date);
    setAnswers(parseContent(entry.content));
    setExpandedId(null);
  };

  const handleDone = () => {
    if (!saved && editing) save(editing, answers);
    const date = editing!;
    const content = formatContent(answers);
    setEntryList(prev => {
      const exists = prev.find(e => e.date === date);
      if (exists) {
        return prev.map(e => e.date === date ? { ...e, content } : e);
      }
      return [{ id: Date.now(), date, content, rating: null, updated_at: new Date().toISOString() }, ...prev];
    });
    setEditing(null);
  };

  // Editor view
  if (editing) {
    const { day, month } = formatDateHeader(editing, today);
    return (
      <div>
        <div className="flex items-end gap-3 mb-6">
          <div>
            <span className="text-3xl font-extrabold text-navy leading-none">{day}</span>
            <span className="text-xs text-navy/40 uppercase ml-1">{month}</span>
          </div>
        </div>

        <Card className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider">Reflection</h2>
            <span className={`text-[10px] ${saved ? 'text-success' : 'text-warning'}`}>
              {saved ? 'Saved' : 'Saving...'}
            </span>
          </div>

          <div className="space-y-4">
            {PROMPTS.map(prompt => (
              <div key={prompt.key}>
                <label className="text-sm font-semibold text-navy/70 block mb-1.5">
                  {prompt.label}
                </label>
                <textarea
                  value={answers[prompt.key] || ''}
                  onChange={e => handleChange(prompt.key, e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Write your thoughts..."
                  className="w-full h-20 bg-lavender-light/30 rounded-xl p-3 text-sm text-navy outline-none resize-none focus:ring-1 focus:ring-navy/20 transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button onClick={handleDone} size="sm">Done</Button>
          </div>
        </Card>
      </div>
    );
  }

  // List view
  const visibleEntries = entryList.filter(e => e.content.trim());

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy mb-6">Your Entries</h1>

      {visibleEntries.length === 0 ? (
        <Card className="text-center py-10">
          <div className="text-4xl mb-3 opacity-30">📝</div>
          <p className="text-sm text-navy/40 mb-1">No journal entries yet.</p>
          <p className="text-xs text-navy/30">Start your first reflection below.</p>
        </Card>
      ) : (
        <div className="space-y-5 mb-20">
          {visibleEntries.map(entry => {
            const { day, month, ago } = formatDateHeader(entry.date, today);
            const items = displayAnswers(entry.content);
            const isExpanded = expandedId === entry.id;
            const preview = items[0]?.text || '';
            const dayWins = winsMap[entry.date] || [];

            return (
              <div key={entry.id}>
                {/* Date header */}
                <div className="flex items-end gap-3 mb-2">
                  <div>
                    <span className="text-2xl font-extrabold text-navy leading-none">{day}</span>
                    <span className="text-[10px] text-navy/40 uppercase ml-1">{month}</span>
                  </div>
                  <span className="text-[10px] text-navy/30 uppercase ml-auto">{ago}</span>
                </div>

                {/* Entry card */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full text-left cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') setExpandedId(isExpanded ? null : entry.id); }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-lavender-light/60 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-navy/30">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy/50 mb-1">Reflection</p>
                        {!isExpanded ? (
                          <p className="text-sm text-navy/70 truncate">{preview}</p>
                        ) : (
                          <div className="space-y-3 mt-2">
                            {/* Wins for this day */}
                            {dayWins.length > 0 && (
                              <div className="border-b border-lavender-dark/10 pb-3 mb-1">
                                <p className="text-xs font-semibold text-navy/40 mb-2">Wins</p>
                                <div className="space-y-1.5">
                                  {dayWins.map((w, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                        w.completed === 1
                                          ? 'bg-gold'
                                          : 'border border-lavender-dark'
                                      }`}>
                                        {w.completed === 1 && (
                                          <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="none">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                          </svg>
                                        )}
                                      </div>
                                      <span className={`text-xs ${w.completed === 1 ? 'text-navy/40 line-through' : 'text-navy/60'}`}>
                                        {w.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {entry.rating != null && entry.rating > 0 && (
                              <div className="mb-2">
                                <StarRating value={Number(entry.rating)} onChange={() => {}} label={ratingLabel} readonly size={18} />
                              </div>
                            )}
                            {items.map((item, i) => (
                              <div key={i}>
                                <p className="text-xs font-semibold text-navy/50">{item.label}</p>
                                <p className="text-sm text-navy/80 whitespace-pre-wrap mt-0.5">{item.text}</p>
                              </div>
                            ))}
                            <div
                              onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
                              className="inline-block text-xs text-navy/40 hover:text-navy font-medium mt-2 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); startEdit(entry); } }}
                            >
                              Edit
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Centered add button */}
      <div className="fixed bottom-20 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <button
          onClick={startNew}
          className="w-12 h-12 rounded-full bg-navy shadow-lg shadow-navy/30 flex items-center justify-center text-white text-2xl font-light hover:scale-105 transition-transform pointer-events-auto"
        >
          +
        </button>
      </div>
    </div>
  );
}
