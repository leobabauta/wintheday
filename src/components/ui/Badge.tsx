interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'active';
  className?: string;
}

// ZHD badges — hairline ring pills, mono-caps labels. No filled blocks.
const variants = {
  default: 'border-border text-text-muted',
  success: 'border-[var(--color-success)] text-[var(--color-success)]',
  warning: 'border-[var(--color-warning)] text-[var(--color-warning)]',
  active:  'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full border font-mono text-[10px] uppercase tracking-[0.12em] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
