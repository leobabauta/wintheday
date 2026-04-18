'use client';

import { useState } from 'react';
import MutedMono from '@/components/ui/MutedMono';
import Eyebrow from '@/components/ui/Eyebrow';

export interface NudgeState {
  enabled: boolean;
  morning: { on: boolean; time: string; days: string[] };
  evening: { on: boolean; time: string; days: string[] };
  tone: 'soft' | 'plain';
  quietMode: boolean;
}

export const DEFAULT_NUDGES: NudgeState = {
  enabled: true,
  morning: { on: true,  time: '07:00', days: ['mon','tue','wed','thu','fri'] },
  evening: { on: true,  time: '21:00', days: ['mon','tue','wed','thu','fri','sat','sun'] },
  tone: 'soft',
  quietMode: false,
};

const DAYS = [
  { k: 'mon', l: 'M' }, { k: 'tue', l: 'T' }, { k: 'wed', l: 'W' },
  { k: 'thu', l: 'T' }, { k: 'fri', l: 'F' }, { k: 'sat', l: 'S' }, { k: 'sun', l: 'S' },
];

function fmt(t: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function NudgeSettings({
  nudges, onChange,
}: { nudges: NudgeState; onChange: (n: NudgeState) => void }) {
  const updateSlot = (k: 'morning' | 'evening', patch: Partial<NudgeState['morning']>) =>
    onChange({ ...nudges, [k]: { ...nudges[k], ...patch } });

  return (
    <div>
      <Eyebrow>Daily nudges</Eyebrow>

      <div className="flex items-center gap-3 py-3">
        <div className="flex-1">
          <div className="text-[14px]">Remind me</div>
          <MutedMono>Gentle pings to show up</MutedMono>
        </div>
        <Toggle on={nudges.enabled} onChange={v => onChange({ ...nudges, enabled: v })} />
      </div>

      {nudges.enabled && <>
        <Slot label="Morning" hint="Set intentions" value={nudges.morning}
          onChange={p => updateSlot('morning', p)} />
        <Slot label="Evening" hint="Reflect" value={nudges.evening}
          onChange={p => updateSlot('evening', p)} />

        <div className="border-t border-border pt-4 mt-3">
          <MutedMono>Tone</MutedMono>
          <div className="flex gap-2 mt-2 mb-4">
            {[
              { v: 'soft', l: 'Soft', hint: 'A kind sentence' },
              { v: 'plain', l: 'Plain', hint: 'Just the nudge' },
            ].map(t => (
              <button key={t.v}
                onClick={() => onChange({ ...nudges, tone: t.v as 'soft' | 'plain' })}
                className={`flex-1 p-3 rounded-[10px] text-left border ${nudges.tone === t.v ? 'border-accent bg-accent-light' : 'border-border'}`}>
                <div className={`text-[13px] ${nudges.tone === t.v ? 'text-accent' : 'text-text'}`}>{t.l}</div>
                <MutedMono className="mt-0.5 block">{t.hint}</MutedMono>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 py-3 border-t border-border">
          <div className="flex-1">
            <div className="text-[14px]">Quiet mode</div>
            <MutedMono>Skip when you&apos;ve already checked in</MutedMono>
          </div>
          <Toggle on={nudges.quietMode} onChange={v => onChange({ ...nudges, quietMode: v })} />
        </div>
      </>}
    </div>
  );
}

function Slot({ label, hint, value, onChange }: {
  label: string; hint: string;
  value: NudgeState['morning'];
  onChange: (p: Partial<NudgeState['morning']>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[14px]">{label}</div>
          <MutedMono>{hint}</MutedMono>
        </div>
        <button onClick={() => setOpen(!open)} disabled={!value.on}
          className={`px-3 py-1.5 border border-border rounded-full text-[13px] tabular-nums disabled:opacity-40 ${value.on ? 'text-text' : 'text-text-muted'}`}>
          {fmt(value.time)}
        </button>
        <Toggle on={value.on} onChange={v => onChange({ on: v })} />
      </div>
      {open && value.on && (
        <div className="pt-3">
          <input type="time" value={value.time}
            onChange={e => onChange({ time: e.target.value })}
            className="max-w-[140px] mb-3" />
          <MutedMono>On these days</MutedMono>
          <div className="flex gap-1.5 mt-2">
            {DAYS.map(d => (
              <button key={d.k}
                onClick={() => onChange({
                  days: value.days.includes(d.k) ? value.days.filter(x => x !== d.k) : [...value.days, d.k]
                })}
                className={`w-7 h-7 rounded-full text-[11px] font-mono ${value.days.includes(d.k) ? 'bg-accent text-bg' : 'border border-border text-text-muted'}`}>
                {d.l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`w-[38px] h-[22px] rounded-full relative transition-colors flex-shrink-0 ${on ? 'bg-accent' : 'bg-border'}`}>
      <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-bg shadow transition-[left] ${on ? 'left-[18px]' : 'left-[2px]'}`} />
    </button>
  );
}
