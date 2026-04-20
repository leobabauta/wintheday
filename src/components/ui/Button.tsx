interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
}

// ZHD buttons: thin, pill-shaped, mono-caps tracked labels.
// - filled:  accent pill (primary actions — rare)
// - outline: hairline border pill (default — most actions)
// - text:    underline-on-hover mono link (inline controls like Edit/Cancel)
const variants = {
  filled:
    'bg-[var(--color-accent)] text-bg border border-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] hover:border-[var(--color-accent-dark)]',
  outline:
    'bg-transparent text-text border border-border hover:border-text-muted hover:text-text',
  text:
    'bg-transparent border-0 text-text-muted hover:text-text px-0 tracking-[0.22em]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-[10px]',
  md: 'px-5 py-2 text-[11px]',
  lg: 'px-6 py-2.5 text-[11px]',
};

export default function Button({
  variant = 'outline',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-mono uppercase tracking-[0.18em] rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
