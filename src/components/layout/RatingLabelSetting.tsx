'use client';

import { useState } from 'react';
import SettingRow from './SettingRow';

export default function RatingLabelSetting({ initialLabel }: { initialLabel: string }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating_label: label.trim() }),
    });
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <SettingRow
        eyebrow="Daily rating"
        right={
          <button
            onClick={() => setEditing(true)}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text"
          >
            Edit
          </button>
        }
      >
        <p className="text-[15px] text-text">
          How much did you experience{' '}
          <em className="font-display not-italic text-[16px]">&ldquo;{label}&rdquo;</em>?
        </p>
      </SettingRow>
    );
  }

  return (
    <SettingRow eyebrow="Daily rating">
      <p className="text-[13px] text-text-muted mb-3 reflection-text">
        What do you want to rate each day? This will appear in your evening reflection.
      </p>
      <input
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="inner peace, confidence, joy…"
        className="w-full bg-transparent border-0 border-b border-border focus:border-[var(--color-accent)] py-1 text-[15px] text-text outline-none transition-colors"
      />
      <p className="text-[12px] text-text-muted mt-2 italic reflection-text">
        Preview: &ldquo;How much did you experience <strong className="font-display not-italic">{label}</strong> today?&rdquo;
      </p>
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => { setLabel(initialLabel); setEditing(false); }}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !label.trim()}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </SettingRow>
  );
}
