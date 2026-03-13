'use client';

import { useState, useRef, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface JournalEntry {
  id: number;
  date: string;
  content: string;
  updated_at: string;
}

interface Props {
  todayEntry: JournalEntry | null;
  pastEntries: JournalEntry[];
  date: string;
}

const PROMPTS = [
  { key: 'well', label: 'What went well today?' },
  { key: 'challenge', label: 'What was challenging?' },
  { key: 'learn', label: 'What did you learn or notice?' },
  { key: 'tomorrow', label: 'What will you focus on tomorrow?' },
];

function parseContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {
    // Legacy plain text — put in first prompt
    if (content.trim()) result.well = content;
  }
  return result;
}

function formatContent(answers: Record<string, string>): string {
  return JSON.stringify(answers);
}

function displayContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return PROMPTS
        .filter(p => parsed[p.key]?.trim())
        .map(p => `${p.label}\n${parsed[p.key]}`)
        .join('\n\n');
    }
  } catch {
    // plain text fallback
  }
  return content;
}

export default function JournalEditor({ todayEntry, pastEntries, date }: Props) {
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(
    todayEntry ? parseContent(todayEntry.content) : {}
  );
  const [saved, setSaved] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const hasTodayEntry = todayEntry && todayEntry.content.trim();

  const save = useCallback(async (data: Record<string, string>) => {
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content: formatContent(data) }),
      });
      setSaved(true);
    } catch { /* retry */ }
  }, [date]);

  const handleChange = (key: string, value: string) => {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(updated), 2000);
  };

  const handleBlur = () => {
    if (!saved) {
      if (timerRef.current) clearTimeout(timerRef.current);
      save(answers);
    }
  };

  const handleDone = () => {
    if (!saved) save(answers);
    setEditing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const allEntries = [
    ...(hasTodayEntry ? [todayEntry!] : []),
    ...pastEntries,
  ];

  return (
    <div>
      {/* Editing mode */}
      {editing ? (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider">
              Today&apos;s Reflection
            </h2>
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
            <Button onClick={handleDone} size="sm" variant="ghost">
              Done
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mb-4">
          <Button onClick={() => setEditing(true)} className="w-full">
            {hasTodayEntry ? 'Edit Today\u2019s Reflection' : 'Add a Reflection'}
          </Button>
        </div>
      )}

      {/* Past entries */}
      {allEntries.length === 0 && !editing ? (
        <Card>
          <p className="text-sm text-navy/40 text-center py-6">
            No journal entries yet. Start your first reflection above.
          </p>
        </Card>
      ) : (
        <Card>
          <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider mb-4">
            Journal Entries
          </h2>
          <div className="space-y-2">
            {allEntries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between py-2 border-b border-lavender-dark/20">
                  <span className="text-sm font-semibold text-navy">{formatDate(entry.date)}</span>
                  <span className="text-xs text-navy/40">
                    {expandedEntry === entry.id ? '▲' : '▼'}
                  </span>
                </div>
                {expandedEntry === entry.id && (
                  <p className="text-sm text-navy/70 py-3 whitespace-pre-wrap">
                    {displayContent(entry.content)}
                  </p>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
