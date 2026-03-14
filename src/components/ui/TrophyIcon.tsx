interface TrophyIconProps {
  size?: number;
  className?: string;
}

export default function TrophyIcon({ size = 48, className = '' }: TrophyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      {/* Cup body */}
      <path
        d="M14 8h20v4c0 8-4.5 14-10 14S14 20 14 12V8z"
        fill="#F0A500"
      />
      {/* Left handle */}
      <path
        d="M14 12H10c-1.1 0-2 .9-2 2v2c0 3.3 2.7 6 6 6"
        stroke="#F0A500"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M34 12h4c1.1 0 2 .9 2 2v2c0 3.3-2.7 6-6 6"
        stroke="#F0A500"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Stem */}
      <rect x="22" y="26" width="4" height="6" rx="1" fill="#D4900A" />
      {/* Base */}
      <rect x="16" y="32" width="16" height="4" rx="2" fill="#D4900A" />
      {/* Star on cup */}
      <path
        d="M24 13l1.5 3 3.5.5-2.5 2.5.6 3.5L24 20.8l-3.1 1.7.6-3.5L19 16.5l3.5-.5L24 13z"
        fill="white"
        opacity="0.9"
      />
    </svg>
  );
}
