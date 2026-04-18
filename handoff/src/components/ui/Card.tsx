interface CardProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean; // tint background with accent-light
  muted?: boolean;  // use surface bg instead of bg-bg
}

export default function Card({ children, className = '', accent, muted }: CardProps) {
  const bg = accent
    ? 'bg-accent-light border-accent-light'
    : muted
    ? 'bg-surface border-border'
    : 'bg-bg border-border';
  return (
    <div className={`${bg} border rounded-[12px] p-4 ${className}`}>
      {children}
    </div>
  );
}
