'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

type Integration = {
  google_calendar_email: string | null;
  cal_com_reschedule_url: string | null;
  last_synced_at: string | null;
  has_google: boolean;
};

export default function IntegrationSettings({ flash }: { flash?: string | null }) {
  const [data, setData] = useState<Integration | null>(null);
  const [calUrl, setCalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/coach/integration');
      if (res.ok) {
        const d: Integration = await res.json();
        setData(d);
        setCalUrl(d.cal_com_reschedule_url ?? '');
      }
    })();
  }, []);

  const flashText =
    flash === 'connected' ? 'Google Calendar connected.' :
    flash === 'error' ? 'Google Calendar connection failed. Try again.' :
    flash === 'no_refresh_token' ? 'No refresh token received — disconnect on Google side and retry.' :
    flash === 'unauthorized' ? 'Please log in as the coach before connecting.' :
    null;

  const saveCalUrl = async () => {
    setSaving(true);
    setSavedMsg('');
    const res = await fetch('/api/coach/integration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cal_com_reschedule_url: calUrl }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 2000);
    } else {
      setSavedMsg('Failed to save');
    }
  };

  const disconnectGoogle = async () => {
    if (!confirm('Disconnect Google Calendar? Upcoming meetings will stop syncing.')) return;
    const res = await fetch('/api/coach/integration', { method: 'DELETE' });
    if (res.ok) {
      const r = await fetch('/api/coach/integration');
      if (r.ok) setData(await r.json());
    }
  };

  return (
    <>
      <Card>
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Google Calendar</h2>
        {flashText && <p className="text-xs text-text-muted mb-3">{flashText}</p>}
        {data?.has_google ? (
          <div className="space-y-2">
            <p className="text-sm text-text">
              Connected as <span className="font-medium">{data.google_calendar_email ?? 'unknown'}</span>
            </p>
            {data.last_synced_at && (
              <p className="text-xs text-text-muted">
                Last synced: {new Date(data.last_synced_at).toLocaleString()}
              </p>
            )}
            <div className="pt-1">
              <Button variant="text" size="sm" onClick={disconnectGoogle}>Disconnect</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-text-muted">Connect your calendar to sync upcoming coaching sessions into the app.</p>
            <a href="/api/google/oauth/start">
              <Button size="sm">Connect Google Calendar</Button>
            </a>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Cal.com reschedule link</h2>
        <p className="text-xs text-text-muted mb-3">
          One link shared with all clients. Clients use this to reschedule their upcoming meeting.
        </p>
        <div className="space-y-3">
          <Input
            label="Link"
            type="url"
            value={calUrl}
            onChange={e => setCalUrl(e.target.value)}
            placeholder="https://cal.com/your-handle/coaching"
          />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveCalUrl} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {savedMsg && <span className="text-xs text-text-muted">{savedMsg}</span>}
          </div>
        </div>
      </Card>
    </>
  );
}
