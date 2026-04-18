'use client';

import { useState } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  readonly?: boolean;
  size?: number;
}

function Star({ fill, size }: { fill: 'full' | 'half' | 'empty'; size: number }) {
  const goldColor = '#F0A500';
  const emptyColor = '#D4CFE0';

  if (fill === 'full') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={goldColor} stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }

  if (fill === 'half') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" stroke="none">
        <defs>
          <clipPath id="halfLeft">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
          <clipPath id="halfRight">
            <rect x="12" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={goldColor} clipPath="url(#halfLeft)" />
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={emptyColor} clipPath="url(#halfRight)" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={emptyColor} stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function StarRating({ value, onChange, label, readonly = false, size = 24 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  const handleClick = (starIndex: number, isLeftHalf: boolean) => {
    if (readonly) return;
    const newValue = isLeftHalf ? starIndex + 0.5 : starIndex + 1;
    // Toggle off if clicking same value
    onChange(newValue === value ? 0 : newValue);
  };

  const handleMouseMove = (e: React.MouseEvent, starIndex: number) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    setHover(isLeftHalf ? starIndex + 0.5 : starIndex + 1);
  };

  return (
    <div>
      {label && <label className="text-sm font-semibold text-text-secondary block mb-2">{label}</label>}
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
        {[0, 1, 2, 3, 4].map(i => {
          const starValue = i + 1;
          let fill: 'full' | 'half' | 'empty' = 'empty';
          if (display >= starValue) fill = 'full';
          else if (display >= i + 0.5) fill = 'half';

          return (
            <button
              key={i}
              type="button"
              disabled={readonly}
              className={`${readonly ? '' : 'cursor-pointer hover:scale-110'} transition-transform p-0 border-0 bg-transparent`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                handleClick(i, x < rect.width / 2);
              }}
              onMouseMove={(e) => handleMouseMove(e, i)}
            >
              <Star fill={fill} size={size} />
            </button>
          );
        })}
        {value > 0 && (
          <span className="text-xs text-text-muted ml-1">{value}</span>
        )}
      </div>
    </div>
  );
}
