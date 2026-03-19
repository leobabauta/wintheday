'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Daily Rating</h3>
            <p className="text-sm text-navy mt-1">How much did you experience <strong>{label}</strong>?</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Daily Rating</h3>
      <p className="text-xs text-navy/40 mb-2">What do you want to rate each day? This will appear in your reflection.</p>
      <Input
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="e.g., inner peace, confidence, joy"
      />
      <p className="text-xs text-navy/30 mt-1 mb-3">Preview: &quot;How much did you experience <strong>{label}</strong> today?&quot;</p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => { setLabel(initialLabel); setEditing(false); }}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !label.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}
