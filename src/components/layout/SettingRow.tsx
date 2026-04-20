'use client';

// Shared ZHD setting row — replaces the old <Card>-wrapped pattern.
// Uses a hairline bottom border + eyebrow label + content.
// No rounded boxes; no backgrounds. Just type + hairlines.

interface Props {
  eyebrow?: string;
  right?: React.ReactNode;     // e.g. "Edit" link, save indicator
  children: React.ReactNode;
  className?: string;
}

export default function SettingRow({ eyebrow, right, children, className = '' }: Props) {
  return (
    <div className={`py-5 border-t border-border ${className}`}>
      {(eyebrow || right) && (
        <div className="flex items-baseline justify-between mb-2">
          {eyebrow ? (
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted">
              {eyebrow}
            </p>
          ) : <span />}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
